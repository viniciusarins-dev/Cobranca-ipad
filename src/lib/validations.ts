import { z } from "zod";

export const transactionSchema = z
  .object({
    clientId: z.string().uuid().optional(),
    clientName: z.string().trim().min(2, "Informe o nome do cliente."),
    clientPhone: z.string().trim().min(10, "Informe um telefone/WhatsApp válido."),
    clientEmail: z.string().trim().email().optional().or(z.literal("")),
    type: z.enum(["emprestimo", "venda_iphone"]),
    description: z.string().trim().optional().or(z.literal("")),
    /** Valor original do produto/empréstimo, antes do markup de 30% (aplicado no backend). */
    totalAmount: z.number({ error: "Informe o valor total." }).positive("O valor total deve ser maior que zero."),
    installmentsCount: z
      .number({ error: "Informe a quantidade de parcelas." })
      .int()
      .min(1, "Mínimo de 1 parcela.")
      .max(60, "Máximo de 60 parcelas."),
    periodicity: z.enum(["semanal", "quinzenal", "mensal"]),
    firstDueDate: z.string().min(10, "Informe a data do primeiro vencimento."),
    /** Só relevante para venda_iphone. */
    hasDownPayment: z.boolean(),
    downPaymentAmount: z.number().min(0, "A entrada não pode ser negativa."),
    downPaymentMethod: z.enum(["dinheiro", "pix", "cartao", "outro"]),
  })
  .refine((data) => data.type === "venda_iphone" || !data.hasDownPayment, {
    message: "Entrada só se aplica a venda de iPhone.",
    path: ["hasDownPayment"],
  })
  .refine((data) => !data.hasDownPayment || data.downPaymentAmount > 0, {
    message: "Informe o valor da entrada.",
    path: ["downPaymentAmount"],
  })
  .refine((data) => !data.hasDownPayment || data.downPaymentAmount < data.totalAmount, {
    message: "A entrada deve ser menor que o valor total do produto.",
    path: ["downPaymentAmount"],
  });

export type TransactionInput = z.infer<typeof transactionSchema>;

export const paymentSchema = z.object({
  installmentId: z.string().uuid(),
  amount: z.number({ error: "Informe o valor pago." }).positive("O valor pago deve ser maior que zero."),
  method: z.enum(["dinheiro", "pix", "cartao", "outro"]),
  notes: z.string().trim().optional().or(z.literal("")),
});

export type PaymentInput = z.infer<typeof paymentSchema>;

export const expenseSchema = z.object({
  description: z.string().trim().min(2, "Informe uma descrição."),
  category: z.string().trim().optional().or(z.literal("")),
  amount: z.number({ error: "Informe o valor." }).positive("O valor deve ser maior que zero."),
  method: z.enum(["dinheiro", "pix", "cartao", "outro"]),
  expenseDate: z.string().min(10, "Informe a data."),
  notes: z.string().trim().optional().or(z.literal("")),
});

export type ExpenseInput = z.infer<typeof expenseSchema>;

export const messageSettingsSchema = z.object({
  provider: z.enum(["evolution", "zapi", "twilio", "wppconnect"]),
  baseUrl: z.string().trim().optional().or(z.literal("")),
  apiKey: z.string().trim().optional().or(z.literal("")),
  instanceId: z.string().trim().optional().or(z.literal("")),
  senderNumber: z.string().trim().optional().or(z.literal("")),
  authToken: z.string().trim().optional().or(z.literal("")),
  messageTemplate: z.string().trim().min(10, "O template não pode ficar vazio."),
});

export type MessageSettingsInput = z.infer<typeof messageSettingsSchema>;
