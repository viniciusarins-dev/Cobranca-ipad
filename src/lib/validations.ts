import { z } from "zod";

export const transactionSchema = z.object({
  clientId: z.string().uuid().optional(),
  clientName: z.string().trim().min(2, "Informe o nome do cliente."),
  clientPhone: z.string().trim().min(10, "Informe um telefone/WhatsApp válido."),
  clientEmail: z.string().trim().email().optional().or(z.literal("")),
  type: z.enum(["emprestimo", "venda_iphone"]),
  description: z.string().trim().optional().or(z.literal("")),
  totalAmount: z.number({ error: "Informe o valor total." }).positive("O valor total deve ser maior que zero."),
  installmentsCount: z
    .number({ error: "Informe a quantidade de parcelas." })
    .int()
    .min(1, "Mínimo de 1 parcela.")
    .max(60, "Máximo de 60 parcelas."),
  periodicity: z.enum(["semanal", "quinzenal", "mensal"]),
  firstDueDate: z.string().min(10, "Informe a data do primeiro vencimento."),
  clientDocument: z.string().trim().optional().or(z.literal("")),
  clientCep: z.string().trim().optional().or(z.literal("")),
  clientAddress: z.string().trim().optional().or(z.literal("")),
});

export type TransactionInput = z.infer<typeof transactionSchema>;

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

export const lookupSettingsSchema = z.object({
  provider: z.enum(["generic_rest"]),
  baseUrl: z.string().trim().min(1, "Informe a URL da API de consulta."),
  method: z.enum(["GET", "POST"]),
  apiKey: z.string().trim().optional().or(z.literal("")),
  authHeader: z.string().trim().optional().or(z.literal("")),
  authScheme: z.string().trim().optional().or(z.literal("")),
  bodyTemplate: z.string().trim().optional().or(z.literal("")),
  documentField: z.string().trim().optional().or(z.literal("")),
  documentTypeField: z.string().trim().optional().or(z.literal("")),
  nameField: z.string().trim().optional().or(z.literal("")),
  cepField: z.string().trim().optional().or(z.literal("")),
  addressField: z.string().trim().optional().or(z.literal("")),
});

export type LookupSettingsInput = z.infer<typeof lookupSettingsSchema>;

export const phoneLookupSchema = z.object({
  phone: z.string().trim().min(10, "Informe um telefone válido."),
});
