import type { ReactNode } from "react";

import { AppNav } from "@/components/app-nav";
import { createClient } from "@/lib/supabase/server";

export default async function AppShellLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-svh flex-col md:flex-row">
      <AppNav userEmail={user?.email ?? null} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
