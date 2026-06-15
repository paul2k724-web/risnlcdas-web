import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AuthProvider, useAuth } from "@/components/auth-provider";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) throw redirect({ to: "/auth" });
      return { user: data.user };
    } catch {
      throw redirect({ to: "/auth" });
    }
  },
  component: AuthenticatedLayout,
});

function TopBar() {
  const { profile, role } = useAuth();
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur">
      <div className="flex items-center gap-3">
        <SidebarTrigger />
        <span className="hidden font-display text-sm font-semibold text-foreground sm:inline">
          Centralized Delay Analysis System
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right leading-tight">
          <p className="text-sm font-medium text-foreground">{profile?.emp_name ?? "—"}</p>
          <p className="text-[11px] text-muted-foreground">
            {profile?.emp_no} · {profile?.dept ?? "—"}
          </p>
        </div>
        {role && (
          <Badge className="bg-gradient-molten text-primary-foreground border-0">
            {ROLE_LABELS[role]}
          </Badge>
        )}
      </div>
    </header>
  );
}

function AuthenticatedLayout() {
  return (
    <AuthProvider>
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-background">
          <AppSidebar />
          <div className="flex flex-1 flex-col">
            <TopBar />
            <main className="flex-1 p-4 md:p-6">
              <Outlet />
            </main>
          </div>
        </div>
      </SidebarProvider>
    </AuthProvider>
  );
}
