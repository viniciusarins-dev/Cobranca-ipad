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
