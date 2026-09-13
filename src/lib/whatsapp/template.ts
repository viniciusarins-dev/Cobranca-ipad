import { formatCurrency, formatDate } from "@/lib/utils";
import type { Client, Installment } from "@/lib/types";

export function renderReminderMessage(
  template: string,
  client: Pick<Client, "name">,
  installment: Pick<Installment, "number" | "amount" | "due_date">,
  installmentsCount: number,
) {
  return template
    .replaceAll("{nome_cliente}", client.name)
    .replaceAll("{numero_parcela}", `${installment.number}/${installmentsCount}`)
    .replaceAll("{valor}", formatCurrency(installment.amount).replace("R$", "").trim())
    .replaceAll("{data_vencimento}", formatDate(installment.due_date));
}

/**
 * Mesmos valores de `renderReminderMessage`, mas como array ordenado
 * (nome_cliente, numero_parcela, valor, data_vencimento) — para provedores
 * baseados em template pré-aprovado (Meta Cloud API), onde cada posição
 * mapeia para uma variável {{1}} {{2}} {{3}} {{4}} do template.
 */
export function buildReminderTemplateParams(
  client: Pick<Client, "name">,
  installment: Pick<Installment, "number" | "amount" | "due_date">,
  installmentsCount: number,
): string[] {
  return [
    client.name,
    `${installment.number}/${installmentsCount}`,
    formatCurrency(installment.amount).replace("R$", "").trim(),
    formatDate(installment.due_date),
  ];
}
