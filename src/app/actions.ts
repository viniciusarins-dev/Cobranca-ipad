"use server";

import { revalidatePath } from "next/cache";
import { getISODay, parseISO } from "date-fns";

import { createClient } from "@/lib/supabase/server";
import { getBusinessToday } from "@/lib/date-utils";
import { generateInstallments } from "@/lib/installments";
import { sendCollectionReminder } from "@/lib/whatsapp";
import {
  calculateFinancedAmount,
  calculateLateInterest,
  daysLate,
  roundCents,
  splitPayment,
} from "@/lib/financial-rules";
import {
  messageSettingsSchema,
  transactionSchema,
  paymentSchema,
  expenseSchema,
  iphoneSaleUpdateSchema,
  clientAddressSchema,
  type TransactionInput,
  type MessageSettingsInput,
  type PaymentInput,
  type ExpenseInput,
  type IphoneSaleUpdateInput,
  type ClientAddressInput,
} from "@/lib/validations";
import type { ContractStatus, ContractType, InstallmentStatus, WeeklyChargeStatus } from "@/lib/types";
import { onlyDigits } from "@/lib/utils";

/**
 * E-mail do usuário autenticado, só para preencher `created_by_email`
 * (rótulo de auditoria — quem registrou o quê). Usa `getSession()` em vez
 * de `getUser()` de propósito: `getSession()` lê a sessão já decodificada
 * dos cookies, sem round-trip de rede até o servidor de Auth do Supabase;
 * `getUser()` sempre revalida o token contra o Auth (uma requisição extra,
 * tipicamente mais lenta que a própria query no banco). Isso é seguro aqui
 * porque esta função NUNCA é usada para autorizar nada — quem decide se a
 * operação pode acontecer é sempre o RLS do Postgres — e o proxy.ts já
 * validou a sessão com `getUser()` uma vez no início desta mesma requisição.
 */
async function getCurrentUserEmail(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user?.email ?? null;
}

/** ISO 8601 (1=segunda ... 7=domingo), com fins de semana ajustados para o dia útil mais próximo. */
function toBusinessWeekday(date: string): number {
  const isoWeekday = getISODay(parseISO(date));
  if (isoWeekday === 6) return 5; // sábado -> sexta
  if (isoWeekday === 7) return 1; // domingo -> segunda
  return isoWeekday;
}

export interface ActionResult {
  ok: boolean;
  error?: string;
  contractId?: string;
}

export async function createTransaction(input: TransactionInput): Promise<ActionResult> {
  const parsed = transactionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;
  const supabase = await createClient();

  let clientId = data.clientId;

  if (!clientId) {
    const phoneDigits = onlyDigits(data.clientPhone);
    const { data: existing } = await supabase
      .from("clients")
      .select("id")
      .eq("phone", phoneDigits)
      .maybeSingle();

    if (existing) {
      clientId = existing.id;
    } else {
      const { data: newClient, error: clientError } = await supabase
        .from("clients")
        .insert({
          name: data.clientName,
          phone: phoneDigits,
          email: data.clientEmail || null,
        })
        .select("id")
        .single();

      if (clientError || !newClient) {
        return { ok: false, error: clientError?.message ?? "Erro ao criar cliente." };
      }
      clientId = newClient.id;
    }
  }

  const hasDownPayment = data.type === "venda_iphone" && data.hasDownPayment;
  const { totalFinanced } = calculateFinancedAmount({
    contractType: data.type,
    principalAmount: data.totalAmount,
    installmentsCount: data.installmentsCount,
    hasDownPayment,
    downPaymentAmount: data.downPaymentAmount,
  });

  const { data: contract, error: contractError } = await supabase
    .from("contracts")
    .insert({
      client_id: clientId,
      type: data.type,
      description: data.description || null,
      principal_amount: data.totalAmount,
      has_down_payment: hasDownPayment,
      down_payment_amount: hasDownPayment ? data.downPaymentAmount : 0,
      // total_amount já sai com os juros aplicados quando for empréstimo
      // (7,5%) ou exatamente o valor digitado quando for venda de iPhone
      // (sem juros automático) — é isto que é dividido em parcelas. O juros
      // nunca é recalculado por parcela.
      total_amount: totalFinanced,
      installments_count: data.installmentsCount,
      periodicity: data.periodicity,
      first_due_date: data.firstDueDate,
      status: "ativo",
    })
    .select("id")
    .single();

  if (contractError || !contract) {
    return { ok: false, error: contractError?.message ?? "Erro ao criar contrato." };
  }

  const installments = generateInstallments({
    totalAmount: totalFinanced,
    installmentsCount: data.installmentsCount,
    periodicity: data.periodicity,
    firstDueDate: data.firstDueDate,
  }).map((installment) => ({
    contract_id: contract.id,
    number: installment.number,
    amount: installment.amount,
    due_date: installment.due_date,
  }));

  const createdByEmail = hasDownPayment && data.downPaymentAmount > 0 ? await getCurrentUserEmail(supabase) : null;

  // As quatro gravações abaixo (parcelas, entrada, aparelho, disparo
  // semanal) só dependem do contrato já criado — nenhuma lê o resultado
  // das outras —, então rodam em paralelo em vez de uma esperar a
  // anterior. A ordem de checagem dos erros abaixo é a mesma prioridade
  // que o código sequencial anterior usava, então o erro reportado ao
  // usuário quando algo dá errado continua sendo o mesmo.
  const [installmentsResult, downPaymentResult, phoneResult, weeklyChargeResult] = await Promise.all([
    supabase.from("installments").insert(installments),
    hasDownPayment && data.downPaymentAmount > 0
      ? supabase.from("payments").insert({
          installment_id: null,
          contract_id: contract.id,
          client_id: clientId,
          principal_amount: roundCents(data.downPaymentAmount),
          interest_amount: 0,
          method: data.downPaymentMethod,
          notes: "Entrada",
          created_by_email: createdByEmail,
        })
      : Promise.resolve({ error: null }),
    // Venda de iPhone é uma operação individual (sem estoque): o aparelho é
    // cadastrado junto com a própria venda, já vinculado ao contrato. O
    // lucro (venda − custo) é sempre calculado sob demanda a partir daqui,
    // nunca dependente de quanto o cliente já pagou.
    data.type === "venda_iphone"
      ? supabase.from("phones").insert({
          model: data.phoneModel,
          color: data.phoneColor || null,
          battery_percent: data.phoneBatteryPercent ?? null,
          cost_amount: roundCents(data.phoneCostAmount ?? 0),
          status: "vendido",
          sale_amount: roundCents(data.totalAmount),
          sold_at: new Date().toISOString(),
          acquired_at: getBusinessToday(),
          contract_id: contract.id,
        })
      : Promise.resolve({ error: null }),
    data.periodicity === "semanal"
      ? supabase.from("weekly_charges").insert({
          contract_id: contract.id,
          client_id: clientId,
          dia_semana_disparo: toBusinessWeekday(data.firstDueDate),
          proximo_disparo: data.firstDueDate,
          status: "PENDENTE",
        })
      : Promise.resolve({ error: null }),
  ]);

  if (installmentsResult.error) {
    return { ok: false, error: installmentsResult.error.message };
  }
  if (downPaymentResult.error) {
    return { ok: false, error: downPaymentResult.error.message };
  }
  if (phoneResult.error) {
    return { ok: false, error: phoneResult.error.message };
  }
  if (weeklyChargeResult.error) {
    return { ok: false, error: weeklyChargeResult.error.message };
  }

  revalidatePath("/");
  if (data.type === "venda_iphone") {
    revalidatePath("/phones");
  }
  return { ok: true, contractId: contract.id };
}

/**
 * Mantém `weekly_charges.status` sincronizado com o status do contrato.
 * O pagamento continua sendo controlado manualmente pelos toggles de
 * parcela — isto apenas reflete esse controle no campo que a fila de
 * disparo semanal checa em tempo real antes de cada envio.
 */
async function syncWeeklyChargeStatus(
  supabase: Awaited<ReturnType<typeof createClient>>,
  contractId: string,
  contractStatus: ContractStatus,
) {
  let weeklyStatus: WeeklyChargeStatus = "PENDENTE";
  if (contractStatus === "quitado") weeklyStatus = "PAGO";
  else if (contractStatus === "cancelado") weeklyStatus = "CANCELADO";

  await supabase.from("weekly_charges").update({ status: weeklyStatus }).eq("contract_id", contractId);
}

async function recalculateContractStatus(supabase: Awaited<ReturnType<typeof createClient>>, contractId: string) {
  const { data: installments } = await supabase
    .from("installments")
    .select("status")
    .eq("contract_id", contractId);

  if (!installments || installments.length === 0) return;

  let status: ContractStatus = "ativo";
  if (installments.every((installment) => installment.status === "pago")) {
    status = "quitado";
  } else if (installments.some((installment) => installment.status === "atrasado")) {
    status = "inadimplente";
  }

  // As duas atualizações são independentes entre si (nenhuma lê o
  // resultado da outra) — rodam em paralelo em vez de uma esperar a outra.
  await Promise.all([
    supabase.from("contracts").update({ status }).eq("id", contractId),
    syncWeeklyChargeStatus(supabase, contractId, status),
  ]);
}

/**
 * Exclui um empréstimo/venda cadastrado errado. Duas situações:
 *
 * 1) Nenhum pagamento registrado ainda: exclusão real. O contrato é
 *    apagado (a foreign key `on delete cascade` já existente cuida de
 *    parcelas, weekly_charges e message_logs automaticamente — não sobra
 *    nada órfão); se for uma venda de iPhone, o registro do aparelho
 *    também é excluído (a venda nunca aconteceu de fato).
 * 2) Já existe pagamento registrado: NUNCA apaga silenciosamente o
 *    histórico financeiro. Em vez disso, o contrato é marcado como
 *    "cancelado" (status que já existe no sistema) — payments, installments
 *    e o histórico continuam intactos para auditoria, mas o contrato para
 *    de contar em qualquer indicador/pendência/Devedores do Dia.
 */
export async function deleteContract(contractId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: contract, error: contractError } = await supabase
    .from("contracts")
    .select("id")
    .eq("id", contractId)
    .maybeSingle();

  if (contractError) {
    return { ok: false, error: contractError.message };
  }
  if (!contract) {
    return { ok: false, error: "Empréstimo não encontrado (talvez já tenha sido excluído)." };
  }

  const { count: paymentsCount, error: countError } = await supabase
    .from("payments")
    .select("id", { count: "exact", head: true })
    .eq("contract_id", contractId);

  if (countError) {
    return { ok: false, error: countError.message };
  }

  if ((paymentsCount ?? 0) > 0) {
    const { error: cancelError } = await supabase
      .from("contracts")
      .update({ status: "cancelado" })
      .eq("id", contractId);
    if (cancelError) {
      return { ok: false, error: cancelError.message };
    }
    await syncWeeklyChargeStatus(supabase, contractId, "cancelado");

    revalidatePath("/");
    revalidatePath("/debtors");
    revalidatePath(`/contracts/${contractId}`);
    return { ok: true };
  }

  // Venda de iPhone é uma operação individual (sem estoque): se o contrato
  // excluído for uma venda sem nenhum pagamento, o registro do aparelho
  // não tem mais razão para existir — a venda nunca aconteceu de fato.
  const { error: phoneDeleteError } = await supabase.from("phones").delete().eq("contract_id", contractId);

  if (phoneDeleteError) {
    return { ok: false, error: phoneDeleteError.message };
  }

  const { error: deleteError } = await supabase.from("contracts").delete().eq("id", contractId);
  if (deleteError) {
    return { ok: false, error: deleteError.message };
  }

  revalidatePath("/");
  revalidatePath("/debtors");
  revalidatePath("/phones");
  return { ok: true };
}

export async function updateInstallmentStatus(
  installmentId: string,
  status: InstallmentStatus,
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: installment, error } = await supabase
    .from("installments")
    .update({ status, paid_at: status === "pago" ? new Date().toISOString() : null })
    .eq("id", installmentId)
    .select("contract_id")
    .single();

  if (error || !installment) {
    return { ok: false, error: error?.message ?? "Erro ao atualizar parcela." };
  }

  await recalculateContractStatus(supabase, installment.contract_id);

  revalidatePath(`/contracts/${installment.contract_id}`);
  revalidatePath("/");
  return { ok: true };
}

/**
 * Fluxo principal de recebimento de uma parcela: calcula o juros de atraso
 * em aberto no momento (ao vivo, via calculateLateInterest — nunca um valor
 * acumulado salvo), aplica o valor pago primeiro no juros e depois no
 * principal, e registra tudo em `payments` para o histórico (item 16),
 * suportando pagamento parcial e qualquer forma de pagamento.
 */
export async function registerPayment(input: PaymentInput): Promise<ActionResult> {
  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;
  const supabase = await createClient();

  // A checagem de idempotência (clique duplo/reenvio) e a busca da parcela
  // (já com o contrato embutido via join, numa única query em vez de duas)
  // não dependem uma da outra — disparadas em paralelo. A garantia real
  // contra duplicidade continua sendo o índice único de `idempotency_key`
  // no banco (ver o tratamento do erro 23505 mais abaixo); esta checagem
  // aqui só evita o round-trip extra de inserir e falhar no caso comum.
  type InstallmentWithContract = {
    id: string;
    contract_id: string;
    amount: number;
    paid_principal_amount: number;
    paid_interest_amount: number;
    due_date: string;
    status: InstallmentStatus;
    contract: { client_id: string; type: ContractType; principal_amount: number } | null;
  };

  const [{ data: existingPayment }, { data: installmentData, error: installmentError }] = await Promise.all([
    data.idempotencyKey
      ? supabase.from("payments").select("contract_id").eq("idempotency_key", data.idempotencyKey).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("installments")
      .select(
        "id, contract_id, amount, paid_principal_amount, paid_interest_amount, due_date, status, contract:contracts(client_id, type, principal_amount)",
      )
      .eq("id", data.installmentId)
      .single(),
  ]);
  const installment = installmentData as unknown as InstallmentWithContract | null;

  if (existingPayment) {
    return { ok: true, contractId: existingPayment.contract_id };
  }

  if (installmentError || !installment) {
    return { ok: false, error: installmentError?.message ?? "Parcela não encontrada." };
  }

  if (installment.status === "pago") {
    return { ok: false, error: "Esta parcela já está totalmente paga." };
  }

  const contract = installment.contract;
  if (!contract) {
    return { ok: false, error: "Contrato não encontrado." };
  }

  // Juros de atraso e saldo em aberto SEMPRE recalculados agora, no servidor
  // — nunca a partir de um valor mostrado na tela momentos atrás. Isso
  // fecha a causa raiz do saldo residual tipo "R$ 0,11": se o pagamento é
  // integral, o valor cobrado é exatamente o que está em aberto no instante
  // da confirmação, nunca um total pré-calculado que ficou desatualizado.
  // O juros de atraso usa o valor ORIGINALMENTE EMPRESTADO no contrato como
  // base (nunca o valor da parcela) e só existe para empréstimo — venda de
  // iPhone nunca gera juros de atraso. `paidInterestAmount` garante que
  // juros já pago nunca volte a ser cobrado (sem isso, um pagamento parcial
  // que incluísse juros "desaparecia" e era recalculado do zero na consulta
  // seguinte — a causa raiz do total R$590 em vez de R$520 num caso real).
  const interestOwed = calculateLateInterest({
    contractType: contract.type,
    originalPrincipalAmount: contract.principal_amount,
    dueDate: installment.due_date,
    status: installment.status,
    paidInterestAmount: installment.paid_interest_amount,
  });
  const principalOwed = roundCents(Math.max(installment.amount - installment.paid_principal_amount, 0));

  const amountToApply = data.payInFull ? roundCents(interestOwed + principalOwed) : roundCents(data.amount!);

  const { interestPortion, principalPortion } = splitPayment(amountToApply, interestOwed, principalOwed);

  if (interestPortion + principalPortion <= 0) {
    return { ok: false, error: "Não há saldo em aberto nesta parcela." };
  }

  const createdByEmail = await getCurrentUserEmail(supabase);

  const { error: paymentError } = await supabase.from("payments").insert({
    installment_id: installment.id,
    contract_id: installment.contract_id,
    client_id: contract.client_id,
    principal_amount: principalPortion,
    interest_amount: interestPortion,
    method: data.method,
    notes: data.notes || null,
    created_by_email: createdByEmail,
    idempotency_key: data.idempotencyKey ?? null,
  });

  if (paymentError) {
    // unique_violation: outra requisição com a mesma idempotencyKey venceu a
    // corrida (ex.: duplo clique no mesmíssimo instante) — trata como
    // sucesso, nunca como erro, e nunca duplica o pagamento.
    if (paymentError.code === "23505" && data.idempotencyKey) {
      return { ok: true, contractId: installment.contract_id };
    }
    return { ok: false, error: paymentError.message };
  }

  // Nunca deixa passar de `installment.amount` (mesmo por causa de ruído de
  // ponto flutuante): parcela quitada sempre fecha com saldo exatamente
  // zero e status "pago", nunca um resíduo de centavos.
  const newPaidPrincipal = Math.min(
    roundCents(installment.paid_principal_amount + principalPortion),
    roundCents(installment.amount),
  );
  // `principalPortion` só "vaza" para o juros (via splitPayment, que aplica
  // primeiro no principal) quando o principal já foi totalmente coberto
  // nesta mesma operação — por isso persistir o juros pago aqui nunca sobe
  // sem que o principal também tenha chegado ao total da parcela.
  const newPaidInterest = roundCents(installment.paid_interest_amount + interestPortion);
  const isFullyPaid = newPaidPrincipal >= roundCents(installment.amount);
  const isStillLate = daysLate(installment.due_date) > 0;

  const newStatus: InstallmentStatus = isFullyPaid ? "pago" : isStillLate ? "atrasado" : "parcial";

  const { error: updateError } = await supabase
    .from("installments")
    .update({
      paid_principal_amount: newPaidPrincipal,
      paid_interest_amount: newPaidInterest,
      status: newStatus,
      paid_at: isFullyPaid ? new Date().toISOString() : null,
    })
    .eq("id", installment.id);

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  await recalculateContractStatus(supabase, installment.contract_id);

  revalidatePath(`/contracts/${installment.contract_id}`);
  revalidatePath("/");
  revalidatePath("/debtors");
  if (contract.type === "venda_iphone") {
    revalidatePath("/phones");
  }
  return { ok: true, contractId: installment.contract_id };
}

export async function registerExpense(input: ExpenseInput): Promise<ActionResult> {
  const parsed = expenseSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;
  const supabase = await createClient();
  const createdByEmail = await getCurrentUserEmail(supabase);

  const { error } = await supabase.from("expenses").insert({
    description: data.description,
    category: data.category || null,
    amount: roundCents(data.amount),
    method: data.method,
    expense_date: data.expenseDate,
    notes: data.notes || null,
    created_by_email: createdByEmail,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/");
  return { ok: true };
}

/**
 * Edita uma venda de iPhone já cadastrada (item 21 do pedido): modelo, cor,
 * bateria e custo sempre podem ser corrigidos (não afetam as parcelas já
 * geradas — o custo só entra no cálculo de lucro, nunca no parcelamento).
 * O valor da venda só pode ser alterado enquanto o contrato ainda não tiver
 * nenhum pagamento registrado — nesse caso as parcelas são recalculadas do
 * zero a partir do novo valor, mantendo a mesma quantidade de parcelas,
 * periodicidade e 1º vencimento já definidos na criação.
 */
export async function updateIphoneSale(contractId: string, input: IphoneSaleUpdateInput): Promise<ActionResult> {
  const parsed = iphoneSaleUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;
  const supabase = await createClient();

  const { data: contract, error: contractError } = await supabase
    .from("contracts")
    .select("id, type, principal_amount, installments_count, periodicity, first_due_date, has_down_payment, down_payment_amount")
    .eq("id", contractId)
    .single();

  if (contractError || !contract) {
    return { ok: false, error: contractError?.message ?? "Venda não encontrada." };
  }
  if (contract.type !== "venda_iphone") {
    return { ok: false, error: "Esta operação não é uma venda de iPhone." };
  }

  const { data: phone, error: phoneError } = await supabase
    .from("phones")
    .select("id")
    .eq("contract_id", contractId)
    .maybeSingle();

  if (phoneError || !phone) {
    return { ok: false, error: phoneError?.message ?? "Celular vinculado não encontrado." };
  }

  const newSaleAmount = roundCents(data.saleAmount);
  const saleValueChanged = newSaleAmount !== roundCents(contract.principal_amount);

  if (saleValueChanged) {
    const { count: paymentsCount, error: countError } = await supabase
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("contract_id", contractId);

    if (countError) {
      return { ok: false, error: countError.message };
    }
    if ((paymentsCount ?? 0) > 0) {
      return {
        ok: false,
        error: "Não é possível alterar o valor da venda depois que algum pagamento foi registrado.",
      };
    }
    if (contract.has_down_payment && contract.down_payment_amount >= newSaleAmount) {
      return { ok: false, error: "O novo valor da venda deve ser maior que a entrada já definida." };
    }
  }

  const { error: phoneUpdateError } = await supabase
    .from("phones")
    .update({
      model: data.model,
      color: data.color || null,
      battery_percent: data.batteryPercent ?? null,
      cost_amount: roundCents(data.costAmount),
      sale_amount: newSaleAmount,
    })
    .eq("id", phone.id);

  if (phoneUpdateError) {
    return { ok: false, error: phoneUpdateError.message };
  }

  if (saleValueChanged) {
    const { totalFinanced } = calculateFinancedAmount({
      contractType: "venda_iphone",
      principalAmount: newSaleAmount,
      installmentsCount: contract.installments_count,
      hasDownPayment: contract.has_down_payment,
      downPaymentAmount: contract.down_payment_amount,
    });

    const { error: contractUpdateError } = await supabase
      .from("contracts")
      .update({ principal_amount: newSaleAmount, total_amount: totalFinanced })
      .eq("id", contractId);
    if (contractUpdateError) {
      return { ok: false, error: contractUpdateError.message };
    }

    // Sem pagamentos ainda (garantido acima): seguro apagar e regenerar
    // todas as parcelas a partir do novo valor.
    const { error: deleteInstallmentsError } = await supabase
      .from("installments")
      .delete()
      .eq("contract_id", contractId);
    if (deleteInstallmentsError) {
      return { ok: false, error: deleteInstallmentsError.message };
    }

    const newInstallments = generateInstallments({
      totalAmount: totalFinanced,
      installmentsCount: contract.installments_count,
      periodicity: contract.periodicity,
      firstDueDate: contract.first_due_date,
    }).map((installment) => ({
      contract_id: contractId,
      number: installment.number,
      amount: installment.amount,
      due_date: installment.due_date,
    }));

    const { error: installmentsError } = await supabase.from("installments").insert(newInstallments);
    if (installmentsError) {
      return { ok: false, error: installmentsError.message };
    }
  }

  revalidatePath("/phones");
  revalidatePath(`/contracts/${contractId}`);
  revalidatePath("/");
  return { ok: true, contractId };
}

export async function updateClientAddress(clientId: string, input: ClientAddressInput): Promise<ActionResult> {
  const parsed = clientAddressSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;
  const supabase = await createClient();

  const { error } = await supabase
    .from("clients")
    .update({
      street: data.street || null,
      street_number: data.streetNumber || null,
      neighborhood: data.neighborhood || null,
      city: data.city || null,
      state: data.state || null,
      zip_code: data.zipCode || null,
    })
    .eq("id", clientId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/");
  return { ok: true };
}

const DOCUMENT_MAX_SIZE_BYTES = 8 * 1024 * 1024;

/**
 * Foto/PDF do documento do cliente, enviado para um bucket de Storage
 * PRIVADO (`client-documents`, criado na migration 0006) — nunca fica
 * público; só é acessível via signed URL gerada no servidor (ver
 * `getClientDocumentSignedUrl`).
 */
export async function uploadClientDocument(clientId: string, formData: FormData): Promise<ActionResult> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Selecione um arquivo." };
  }
  if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
    return { ok: false, error: "Envie uma imagem ou PDF." };
  }
  if (file.size > DOCUMENT_MAX_SIZE_BYTES) {
    return { ok: false, error: "Arquivo muito grande (máx. 8MB)." };
  }

  const supabase = await createClient();

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("document_photo_path")
    .eq("id", clientId)
    .single();

  if (clientError || !client) {
    return { ok: false, error: clientError?.message ?? "Cliente não encontrado." };
  }

  const extension = file.name.includes(".") ? file.name.split(".").pop() : "bin";
  const path = `${clientId}/${Date.now()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("client-documents")
    .upload(path, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    return { ok: false, error: uploadError.message };
  }

  const { error: updateError } = await supabase
    .from("clients")
    .update({ document_photo_path: path })
    .eq("id", clientId);

  if (updateError) {
    // Reverte o upload para não deixar um arquivo órfão sem referência.
    await supabase.storage.from("client-documents").remove([path]);
    return { ok: false, error: updateError.message };
  }

  if (client.document_photo_path) {
    await supabase.storage.from("client-documents").remove([client.document_photo_path]);
  }

  revalidatePath("/");
  return { ok: true };
}

export async function deleteClientDocument(clientId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("document_photo_path")
    .eq("id", clientId)
    .single();

  if (clientError || !client) {
    return { ok: false, error: clientError?.message ?? "Cliente não encontrado." };
  }
  if (!client.document_photo_path) {
    return { ok: true };
  }

  await supabase.storage.from("client-documents").remove([client.document_photo_path]);

  const { error: updateError } = await supabase
    .from("clients")
    .update({ document_photo_path: null })
    .eq("id", clientId);

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  revalidatePath("/");
  return { ok: true };
}

export async function sendReminderAction(installmentId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const result = await sendCollectionReminder(supabase, installmentId);

  const { data: installment } = await supabase
    .from("installments")
    .select("contract_id")
    .eq("id", installmentId)
    .single();

  if (installment) {
    revalidatePath(`/contracts/${installment.contract_id}`);
  }

  return result.ok ? { ok: true } : { ok: false, error: result.error };
}

export async function saveMessageSettings(input: MessageSettingsInput): Promise<ActionResult> {
  const parsed = messageSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;
  const supabase = await createClient();

  await supabase.from("message_settings").update({ is_active: false }).eq("is_active", true);

  const { error } = await supabase.from("message_settings").insert({
    provider: data.provider,
    base_url: data.baseUrl || null,
    api_key: data.apiKey || null,
    instance_id: data.instanceId || null,
    sender_number: data.senderNumber || null,
    auth_token: data.authToken || null,
    message_template: data.messageTemplate,
    template_name: data.templateName || null,
    template_language: data.templateLanguage || "pt_BR",
    is_active: true,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/settings");
  return { ok: true };
}

export async function sendTestMessage(phone: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: settings, error: settingsError } = await supabase
    .from("message_settings")
    .select("*")
    .eq("is_active", true)
    .maybeSingle();

  if (settingsError || !settings) {
    return { ok: false, error: "Nenhuma configuração ativa encontrada." };
  }

  const { createWhatsAppProvider } = await import("@/lib/whatsapp/providers");
  const { formatDate } = await import("@/lib/utils");

  try {
    const provider = createWhatsAppProvider(settings);
    const result = await provider.send(phone, {
      text: "Mensagem de teste do sistema de cobrança. Se você recebeu isso, a integração está funcionando corretamente.",
      // Parâmetros de amostra — usados apenas pelo provider Meta Cloud API,
      // que precisa preencher as variáveis do template aprovado mesmo num teste.
      templateParams: ["Cliente Teste", "1/1", "0,00", formatDate(new Date())],
    });
    return result.ok ? { ok: true } : { ok: false, error: `Falha ao enviar (HTTP ${result.statusCode}).` };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Erro ao enviar mensagem de teste." };
  }
}
