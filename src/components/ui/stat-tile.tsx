import type { LucideIcon } from "lucide-react";

import { CountUp } from "@/components/ui/count-up";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { cn } from "@/lib/utils";

type StatAccent = "primary" | "cyan" | "success" | "destructive" | "warning";

const ACCENT_TEXT: Record<StatAccent, string> = {
  primary: "text-primary",
  cyan: "text-accent-cyan",
  success: "text-success",
  destructive: "text-destructive",
  warning: "text-warning",
};

/** Card de estatística (bento) com número animado — reactbits CountUp + SpotlightCard. */
export function StatTile({
  label,
  value,
  icon: Icon,
  format,
  accent = "primary",
  className,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  format?: "currency";
  accent?: StatAccent;
  className?: string;
}) {
  return (
    <SpotlightCard className={cn("flex flex-col gap-3 p-4 sm:p-5", className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
        <Icon className={cn("size-4", ACCENT_TEXT[accent])} />
      </div>
      <CountUp
        value={value}
        format={format}
        className={cn("text-2xl font-bold tracking-tight sm:text-3xl", ACCENT_TEXT[accent])}
      />
    </SpotlightCard>
  );
}
