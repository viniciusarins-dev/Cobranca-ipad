export type ContractType = "emprestimo" | "venda_iphone";

export type Periodicity = "semanal" | "quinzenal" | "mensal";

export type ContractStatus = "ativo" | "inadimplente" | "quitado" | "cancelado";

export type InstallmentStatus = "pendente" | "pago" | "atrasado";

export type WhatsAppProviderName = "evolution" | "zapi" | "twilio" | "wppconnect" | "meta";

export type WeeklyChargeStatus = "PENDENTE" | "PAGO" | "CANCELADO";

export interface Client {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Contract {
  id: string;
  client_id: string;
  type: ContractType;
  description: string | null;
  total_amount: number;
  installments_count: number;
  periodicity: Periodicity;
  first_due_date: string;
  status: ContractStatus;
  created_at: string;
  updated_at: string;
}

export interface Installment {
  id: string;
  contract_id: string;
  number: number;
  amount: number;
  due_date: string;
  status: InstallmentStatus;
  paid_at: string | null;
  reminder_sent_at: string | null;
  reminder_count: number;
  created_at: string;
  updated_at: string;
}

export interface MessageSettings {
  id: string;
  provider: WhatsAppProviderName;
  base_url: string | null;
  api_key: string | null;
  instance_id: string | null;
  sender_number: string | null;
  auth_token: string | null;
  message_template: string;
  /** Nome do template aprovado pela Meta (obrigatório apenas para provider "meta"). */
  template_name: string | null;
  /** Código de idioma do template aprovado (ex: "pt_BR"). Só usado por provider "meta". */
  template_language: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Agendamento de disparo semanal de cobrança via WhatsApp para contratos
 * com periodicity 'semanal'. O status é sincronizado automaticamente a
 * partir do status do contrato (pagamento continua sendo controlado
 * manualmente pelos toggles de parcela) e é revalidado em tempo real
 * imediatamente antes de qualquer envio.
 */
export interface WeeklyCharge {
  id: string;
  contract_id: string;
  client_id: string;
  status: WeeklyChargeStatus;
  dia_semana_disparo: number; // ISO 8601: 1=segunda ... 5=sexta
  proximo_disparo: string;
  last_dispatch_at: string | null;
  dispatch_count: number;
  created_at: string;
  updated_at: string;
}

export interface MessageLog {
  id: string;
  installment_id: string;
  client_id: string;
  status: "sent" | "failed";
  provider_response: unknown;
  sent_at: string;
}

export interface ClientWithContracts extends Client {
  contracts: Contract[];
}

export interface ContractWithClient extends Contract {
  client: Client;
}

export interface ContractWithInstallments extends ContractWithClient {
  installments: Installment[];
}

export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  emprestimo: "Empréstimo",
  venda_iphone: "Venda de iPhone",
};

export const PERIODICITY_LABELS: Record<Periodicity, string> = {
  semanal: "Semanal",
  quinzenal: "Quinzenal",
  mensal: "Mensal",
};

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  ativo: "Ativo",
  inadimplente: "Inadimplente",
  quitado: "Quitado",
  cancelado: "Cancelado",
};

export const INSTALLMENT_STATUS_LABELS: Record<InstallmentStatus, string> = {
  pendente: "Pendente",
  pago: "Pago",
  atrasado: "Atrasado",
};

export const WHATSAPP_PROVIDER_LABELS: Record<WhatsAppProviderName, string> = {
  evolution: "Evolution API",
  zapi: "Z-API",
  twilio: "Twilio",
  wppconnect: "WPPConnect",
  meta: "Meta Cloud API (oficial)",
};
