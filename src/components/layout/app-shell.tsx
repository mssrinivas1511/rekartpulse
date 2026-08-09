import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Users,
  Puzzle,
  RefreshCcw,
  ScrollText,
  Search,
  Menu,
  X,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getClients } from "@/lib/pulse.functions";
import { ClientDialog } from "@/components/dialogs/client-dialog";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/clients", label: "Clients", icon: Users, exact: false },
  { to: "/features", label: "Features", icon: Puzzle, exact: false },
  { to: "/subscriptions", label: "Subscriptions", icon: RefreshCcw, exact: false },
  { to: "/activity", label: "Activity Log", icon: ScrollText, exact: false },
] as const;

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: () => getClients({ data: {} }),
    staleTime: 30_000,
  });

  const results =
    search.trim().length > 0
      ? (clients ?? [])
          .filter((c) => c.name.toLowerCase().includes(search.trim().toLowerCase()))
          .slice(0, 6)
      : [];

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
                  navigate({ to: "/clients/$clientId", params: { clientId: client.id } });
                }}
              >
                <span className="font-medium">{client.name}</span>
                <span className="text-muted-foreground">{client.city}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 pb-3">
        <ClientDialog
          trigger={
            <button className="flex h-9 w-full items-center justify-center gap-1.5 rounded-md bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground transition-colors hover:bg-sidebar-primary/90">
              <Plus className="size-3.5" /> New Client
            </button>
          }
        />
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
        <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/50">
          Menu
        </p>
        {NAV.map((item) => {
          const active = item.exact
            ? pathname === item.to
            : pathname === item.to || pathname.startsWith(`${item.to}/`);
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

      <div className="border-t border-sidebar-border px-5 py-3 text-[11px] leading-relaxed text-sidebar-foreground/50">
        <p>User: Pappu Singh</p>
        <p>Version: 1.0.0</p>
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
