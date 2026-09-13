import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { Card } from "@/components/ui/card";
import { cn, formatCurrency } from "@/lib/utils";

const statCardVariants = cva("text-xl font-semibold tracking-tight sm:text-2xl", {
  variants: {
    tone: {
      neutral: "text-foreground",
      success: "text-success",
      destructive: "text-destructive",
      warning: "text-warning-foreground",
    },
  },
  defaultVariants: {
    tone: "neutral",
  },
});

interface StatCardProps extends VariantProps<typeof statCardVariants> {
  label: string;
  /** Ex: "Diário" | "Semanal" | "Mensal" | "Total" — sempre deixa claro o período do indicador. */
  period?: string;
  value: number;
  icon?: React.ReactNode;
  className?: string;
}

export function StatCard({ label, period, value, tone, icon, className }: StatCardProps) {
  return (
    <Card className={cn("flex flex-col gap-2 p-4", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {icon}
      </div>
      <span className={cn(statCardVariants({ tone }))}>{formatCurrency(value)}</span>
      {period && <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{period}</span>}
    </Card>
  );
}
