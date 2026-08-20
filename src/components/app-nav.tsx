"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SettingsIcon, SmartphoneIcon, UsersIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Clientes", icon: UsersIcon, exact: true },
  { href: "/settings", label: "Configurações", icon: SettingsIcon, exact: false },
] as const;

export function AppNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-linear-to-br from-primary to-accent-cyan text-primary-foreground shadow-[0_0_20px_-4px_var(--primary)]">
            <SmartphoneIcon className="size-4.5" strokeWidth={2.5} />
          </span>
          <span className="hidden text-base font-bold tracking-tight sm:inline">Cobrança iPad</span>
        </Link>

        <nav className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1">
          {NAV_ITEMS.map((item) => {
            const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors sm:px-4",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-[0_0_16px_-4px_var(--primary)]"
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
