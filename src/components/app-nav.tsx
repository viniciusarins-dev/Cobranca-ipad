"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOutIcon, SettingsIcon, SmartphoneIcon, UsersIcon } from "lucide-react";

import { signOut } from "@/app/auth-actions";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Clientes", icon: UsersIcon, exact: true },
  { href: "/phones", label: "Celulares", icon: SmartphoneIcon, exact: false },
  { href: "/settings", label: "Configurações", icon: SettingsIcon, exact: false },
] as const;

export function AppNav({ userEmail }: { userEmail: string | null }) {
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

        <div className="flex items-center gap-2 sm:gap-3">
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

          {userEmail && (
            <form action={signOut}>
              <button
                type="submit"
                title={`Sair (${userEmail})`}
                className="flex size-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-muted-foreground transition-colors hover:text-destructive"
              >
                <LogOutIcon className="size-4" />
                <span className="sr-only">Sair</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </header>
  );
}
