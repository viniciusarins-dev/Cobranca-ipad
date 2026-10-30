"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon, ShieldOffIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime, formatPhone } from "@/lib/utils";
import { setWhatsAppConsent } from "@/app/actions";
import type { WhatsAppBlockedClientRow } from "@/app/(app)/whatsapp/page";

export function ConsentPanel({
  blockedClients,
  clients,
}: {
  blockedClients: WhatsAppBlockedClientRow[];
  clients: { id: string; name: string; phone: string }[];
}) {
  const router = useRouter();
  const [selectedClientId, setSelectedClientId] = useState("");
  const [blocking, setBlocking] = useState(false);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  const blockedIds = new Set(blockedClients.map((row) => row.client_id));
  const blockableClients = clients.filter((client) => !blockedIds.has(client.id));

  async function handleBlock() {
    if (!selectedClientId) {
      toast.error("Selecione um cliente.");
      return;
    }
    setBlocking(true);
    const result = await setWhatsAppConsent({ clientId: selectedClientId, isBlocked: true });
    setBlocking(false);
    if (result.ok) {
      toast.success("Cliente bloqueado para cobrança por WhatsApp.");
      setSelectedClientId("");
      router.refresh();
    } else {
      toast.error(result.error ?? "Erro ao bloquear.");
    }
  }

  async function handleUnblock(clientId: string) {
    setUnblockingId(clientId);
    const result = await setWhatsAppConsent({ clientId, isBlocked: false });
    setUnblockingId(null);
    if (result.ok) {
      toast.success("Cliente desbloqueado.");
      router.refresh();
    } else {
      toast.error(result.error ?? "Erro ao desbloquear.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <SpotlightCard className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <p className="mb-1.5 text-sm font-medium">Bloquear um cliente</p>
          <Select value={selectedClientId} onValueChange={setSelectedClientId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um cliente" />
            </SelectTrigger>
            <SelectContent>
              {blockableClients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name} · {formatPhone(client.phone)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Clientes bloqueados nunca entram em novas campanhas e não recebem reenvio automático.
          </p>
        </div>
        <Button type="button" variant="destructive" onClick={handleBlock} disabled={blocking || !selectedClientId}>
          {blocking ? <Loader2Icon className="animate-spin" /> : <ShieldOffIcon />}
          Bloquear
        </Button>
      </SpotlightCard>

      <SpotlightCard className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Bloqueado em</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {blockedClients.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                  Nenhum cliente bloqueado.
                </TableCell>
              </TableRow>
            )}
            {blockedClients.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.client?.name ?? "—"}</TableCell>
                <TableCell>{row.client ? formatPhone(row.client.phone) : "—"}</TableCell>
                <TableCell className="text-muted-foreground">{row.blocked_at ? formatDateTime(row.blocked_at) : "—"}</TableCell>
                <TableCell className="text-right">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleUnblock(row.client_id)}
                    disabled={unblockingId === row.client_id}
                  >
                    {unblockingId === row.client_id ? <Loader2Icon className="animate-spin" /> : "Desbloquear"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SpotlightCard>
    </div>
  );
}
