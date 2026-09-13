"use client";

import { useMemo, useState } from "react";
import { TrashIcon } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PhoneFormDialog } from "@/components/phone-form-dialog";
import { PhoneStatusBadge } from "@/components/status-badge";
import { SellPhoneDialog } from "@/components/sell-phone-dialog";
import { PAYMENT_METHOD_LABELS, type Phone } from "@/lib/types";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { deletePhone } from "@/app/actions";

type FilterTab = "todos" | "estoque" | "vendido";

const TABS: { value: FilterTab; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "estoque", label: "Em estoque" },
  { value: "vendido", label: "Vendidos" },
];

function DeletePhoneButton({ phoneId }: { phoneId: string }) {
  const router = useRouter();

  async function handleDelete() {
    if (!confirm("Excluir este celular do estoque?")) return;
    const result = await deletePhone(phoneId);
    if (result.ok) {
      toast.success("Celular excluído.");
      router.refresh();
    } else {
      toast.error(result.error ?? "Erro ao excluir celular.");
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleDelete}>
      <TrashIcon />
      Excluir
    </Button>
  );
}

export function PhonesTable({ phones }: { phones: Phone[] }) {
  const [tab, setTab] = useState<FilterTab>("todos");

  const filtered = useMemo(
    () => phones.filter((phone) => tab === "todos" || phone.status === tab),
    [phones, tab],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={tab} onValueChange={(v) => setTab(v as FilterTab)}>
          <TabsList>
            {TABS.map((item) => (
              <TabsTrigger key={item.value} value={item.value}>
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <PhoneFormDialog />
      </div>

      <SpotlightCard className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Modelo</TableHead>
              <TableHead>Custo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Venda</TableHead>
              <TableHead>Lucro</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Nenhum celular encontrado.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((phone) => {
              const profit =
                phone.status === "vendido" && phone.sale_amount !== null
                  ? phone.sale_amount - phone.cost_amount
                  : null;

              return (
                <TableRow key={phone.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">{phone.model}</span>
                      {phone.description && (
                        <span className="text-xs text-muted-foreground">{phone.description}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{formatCurrency(phone.cost_amount)}</TableCell>
                  <TableCell>
                    <PhoneStatusBadge status={phone.status} />
                  </TableCell>
                  <TableCell>
                    {phone.status === "vendido" && phone.sale_amount !== null ? (
                      <div className="flex flex-col text-sm">
                        <span>{formatCurrency(phone.sale_amount)}</span>
                        <span className="text-xs text-muted-foreground">
                          {phone.sale_method ? `${PAYMENT_METHOD_LABELS[phone.sale_method]} · ` : ""}
                          {phone.sold_at ? formatDateTime(phone.sold_at) : ""}
                          {phone.buyer_name ? ` · ${phone.buyer_name}` : ""}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {profit !== null ? (
                      <span className={profit >= 0 ? "font-medium text-success" : "font-medium text-destructive"}>
                        {formatCurrency(profit)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      {phone.status === "estoque" ? (
                        <>
                          <PhoneFormDialog phone={phone} />
                          <SellPhoneDialog phone={phone} />
                          <DeletePhoneButton phoneId={phone.id} />
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">Vendido</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </SpotlightCard>
    </div>
  );
}
