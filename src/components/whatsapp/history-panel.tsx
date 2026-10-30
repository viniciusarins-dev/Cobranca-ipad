"use client";

import { useMemo, useState } from "react";
import { SearchIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { WhatsAppCampaignMessageStatusBadge } from "@/components/status-badge";
import { WHATSAPP_CAMPAIGN_MESSAGE_STATUS_LABELS, type WhatsAppCampaignMessageStatus } from "@/lib/types";
import { formatDateTime, formatPhone } from "@/lib/utils";
import type { WhatsAppHistoryRow } from "@/app/(app)/whatsapp/page";

type StatusFilter = "todos" | WhatsAppCampaignMessageStatus;

export function HistoryPanel({ history, compact = false }: { history: WhatsAppHistoryRow[]; compact?: boolean }) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return history.filter((row) => {
      if (statusFilter !== "todos" && row.status !== statusFilter) return false;
      if (!q) return true;
      return (row.client?.name ?? "").toLowerCase().includes(q) || (row.campaign?.name ?? "").toLowerCase().includes(q);
    });
  }, [history, statusFilter, query]);

  if (history.length === 0) {
    return (
      <SpotlightCard>
        <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma mensagem de campanha enviada ainda.</p>
      </SpotlightCard>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {!compact && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="sm:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              {Object.entries(WHATSAPP_CAMPAIGN_MESSAGE_STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative sm:w-72">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente ou campanha..."
              className="pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
      )}

      <SpotlightCard className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Campanha</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data</TableHead>
              {!compact && <TableHead>Erro</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Nenhum registro encontrado.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.client?.name ?? "—"}</TableCell>
                <TableCell>{formatPhone(row.to_phone)}</TableCell>
                <TableCell className="text-muted-foreground">{row.campaign?.name ?? "—"}</TableCell>
                <TableCell>
                  <WhatsAppCampaignMessageStatusBadge status={row.status as WhatsAppCampaignMessageStatus} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDateTime(row.delivered_at ?? row.confirmed_at ?? row.attempted_at ?? row.created_at)}
                </TableCell>
                {!compact && (
                  <TableCell className="max-w-56 truncate text-xs text-destructive">{row.error_message ?? ""}</TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SpotlightCard>
    </div>
  );
}
