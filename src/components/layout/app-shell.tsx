import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Users,
  Puzzle,
  RefreshCcw,
  TicketCheck,
  UserCog,
  ScrollText,
  Settings,
  Search,
  Menu,
  X,
  Plus,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { getClients } from "@/lib/pulse.functions";
import { getMyProfile } from "@/lib/auth.functions";
import { usePermissions } from "@/hooks/use-permissions";
import { ClientDialog } from "@/components/dialogs/client-dialog";
import type { Section } from "@/lib/types";

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  section: Section | null;
  extraPrefixes?: string[];
};

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, section: "dashboard" },
  { to: "/clients", label: "Clients", icon: Users, section: "clients", extraPrefixes: ["/client/"] },
  { to: "/features", label: "Features", icon: Puzzle, section: "features", extraPrefixes: ["/feature/"] },
  { to: "/subscriptions", label: "Subscriptions", icon: RefreshCcw, section: "clients" },
  { to: "/tickets", label: "Tickets", icon: TicketCheck, section: "tickets", extraPrefixes: ["/ticket/"] },
  { to: "/account-managers", label: "Account Managers", icon: UserCog, section: "account_managers" },
  { to: "/activity", label: "Activity Log", icon: ScrollText, section: null },
  { to: "/settings", label: "Settings", icon: Settings, section: "settings" },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const { isAdmin, can, loaded } = usePermissions();

  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: () => getClients({ data: {} }),
    staleTime: 30_000,
  });

  const { data: profile } = useQuery({
    queryKey: ["my-profile"],
    queryFn: () => getMyProfile(),
    staleTime: 60_000,
  });

  const results =
    search.trim().length > 0
      ? (clients ?? [])
          .filter((c) => c.name.toLowerCase().includes(search.trim().toLowerCase()))
          .slice(0, 6)
      : [];

  const visibleNav = NAV.filter(
    (item) => !loaded || item.section === null || isAdmin || can(item.section, "view"),
  );

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2.5 px-5 pt-5 pb-4">
        <span className="flex size-8 items-center justify-center rounded-full bg-sidebar-accent">
          <span className="size-3.5 rounded-full border-[3px] border-sidebar-primary-foreground" />
        </span>
        <span className="text-lg font-extrabold lowercase tracking-tight text-sidebar-primary-foreground">
          rekart
        </span>
        <span className="rounded bg-sidebar-primary px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-sidebar-primary-foreground">
          Pulse
        </span>
      </div>

      <div className="relative px-4 pb-3">
        <Search className="pointer-events-none absolute left-7 top-1/2 size-3.5 -translate-y-1/2 text-sidebar-foreground/50" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search Client by Name"
          className="h-9 w-full rounded-md border border-sidebar-border bg-sidebar-accent/60 pl-9 pr-3 text-xs text-sidebar-primary-foreground placeholder:text-sidebar-foreground/50 focus:outline-none focus:ring-1 focus:ring-sidebar-ring"
        />
        {results.length > 0 && (
          <div className="absolute inset-x-4 top-full z-50 overflow-hidden rounded-md border border-border bg-popover shadow-lg">
            {results.map((client) => (
              <button
                key={client.id}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-xs text-popover-foreground hover:bg-accent"
                onClick={() => {
                  setSearch("");
                  onNavigate?.();
                  navigate({ to: "/client/$clientId", params: { clientId: client.id } });
                }}
              >
                <span className="font-medium">{client.name}</span>
                <span className="text-muted-foreground">{client.city}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {(!loaded || isAdmin || can("clients", "create")) && (
        <div className="px-4 pb-3">
          <ClientDialog
            trigger={
              <button className="flex h-9 w-full items-center justify-center gap-1.5 rounded-md bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground transition-colors hover:bg-sidebar-primary/90">
                <Plus className="size-3.5" /> New Client
              </button>
            }
          />
        </div>
      )}

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
        <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/50">
          Menu
        </p>
        {visibleNav.map((item) => {
          const active =
            pathname === item.to ||
            pathname.startsWith(`${item.to}/`) ||
            (item.extraPrefixes ?? []).some((p) => pathname.startsWith(p));
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-xs font-bold text-sidebar-primary-foreground">
            {(profile?.full_name ?? "T").charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-sidebar-primary-foreground">
              {profile?.full_name ?? "Team member"}
            </p>
            <p className="truncate text-[10px] text-sidebar-foreground/50">
              {isAdmin ? "Admin" : (profile?.country ?? "")}
            </p>
          </div>
          <button
            onClick={() => void handleSignOut()}
            className="rounded-md p-1.5 text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-primary-foreground"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 lg:block">
        <SidebarContent />
      </aside>

      <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-sidebar-border bg-sidebar px-4 py-3 lg:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="text-sidebar-primary-foreground"
          aria-label="Open menu"
        >
          <Menu className="size-5" />
        </button>
        <span className="text-base font-extrabold lowercase text-sidebar-primary-foreground">
          rekart <span className="text-xs font-bold uppercase tracking-widest">pulse</span>
        </span>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-64">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-3 z-10 text-sidebar-foreground"
              aria-label="Close menu"
            >
              <X className="size-5" />
            </button>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <main className="lg:pl-60">{children}</main>
    </div>
  );
}
