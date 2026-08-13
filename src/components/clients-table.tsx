"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SearchIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ContractStatusBadge } from "@/components/status-badge";
import { CONTRACT_TYPE_LABELS, PERIODICITY_LABELS, type ContractWithClient } from "@/lib/types";
import { formatCurrency, formatPhone } from "@/lib/utils";

type FilterTab = "todos" | "ativo" | "inadimplente" | "quitado";

const TABS: { value: FilterTab; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "ativo", label: "Ativos" },
  { value: "inadimplente", label: "Inadimplentes" },
  { value: "quitado", label: "Quitados" },
];

export function ClientsTable({ contracts }: { contracts: ContractWithClient[] }) {
  const [tab, setTab] = useState<FilterTab>("todos");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return contracts.filter((contract) => {
      if (tab !== "todos" && contract.status !== tab) return false;
      if (!q) return true;
      return (
        contract.client.name.toLowerCase().includes(q) ||
        contract.client.phone.includes(q.replace(/\D/g, "")) ||
        (contract.description ?? "").toLowerCase().includes(q)
      );
    });
  }, [contracts, tab, query]);

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

        <div className="relative sm:w-72">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou telefone..."
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <SpotlightCard className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Telefone / WhatsApp</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Valor total</TableHead>
              <TableHead>Parcelas</TableHead>
              <TableHead>Periodicidade</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  Nenhum registro encontrado.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((contract) => (
              <TableRow key={contract.id} className="cursor-pointer">
                <TableCell>
                  <Link href={`/contracts/${contract.id}`} className="-mx-4 -my-3 block px-4 py-3 font-medium text-foreground">
                    {contract.client.name}
                  </Link>
                </TableCell>
                <TableCell>
                  <Link href={`/contracts/${contract.id}`} className="-mx-4 -my-3 block px-4 py-3">
                    {formatPhone(contract.client.phone)}
                  </Link>
                </TableCell>
                <TableCell>
                  <Link href={`/contracts/${contract.id}`} className="-mx-4 -my-3 block px-4 py-3">
                    {CONTRACT_TYPE_LABELS[contract.type]}
                  </Link>
                </TableCell>
                <TableCell>
                  <Link href={`/contracts/${contract.id}`} className="-mx-4 -my-3 block px-4 py-3">
                    {formatCurrency(contract.total_amount)}
                  </Link>
                </TableCell>
                <TableCell>
                  <Link href={`/contracts/${contract.id}`} className="-mx-4 -my-3 block px-4 py-3">
                    {contract.installments_count}x
                  </Link>
                </TableCell>
                <TableCell>
                  <Link href={`/contracts/${contract.id}`} className="-mx-4 -my-3 block px-4 py-3">
                    {PERIODICITY_LABELS[contract.periodicity]}
                  </Link>
                </TableCell>
                <TableCell>
                  <Link href={`/contracts/${contract.id}`} className="-mx-4 -my-3 block px-4 py-3">
                    <ContractStatusBadge status={contract.status} />
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SpotlightCard>
    </div>
  );
}
