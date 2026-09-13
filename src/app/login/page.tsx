import { SmartphoneIcon } from "lucide-react";

import { LoginForm } from "@/components/login-form";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SpotlightCard } from "@/components/ui/spotlight-card";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center px-4 py-10">
      <div className="mb-6 flex items-center gap-2.5">
        <span className="flex size-10 items-center justify-center rounded-xl bg-linear-to-br from-primary to-accent-cyan text-primary-foreground shadow-[0_0_20px_-4px_var(--primary)]">
          <SmartphoneIcon className="size-5" strokeWidth={2.5} />
        </span>
        <span className="text-lg font-bold tracking-tight">Cobrança iPad</span>
      </div>

      <SpotlightCard className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Entrar</CardTitle>
          <CardDescription>Acesse com a conta cadastrada pelo administrador do sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </SpotlightCard>
    </main>
  );
}
