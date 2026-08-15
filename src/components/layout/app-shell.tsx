import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Users,
  Puzzle,
  TicketCheck,
  UserCog,
  ScrollText,
  Settings,
  Search,
  PanelLeft,
  Plus,
  LogOut,
  Camera,
  Trash2,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { getClients } from "@/lib/pulse.functions";
import { getMyProfile, setMyAvatar } from "@/lib/auth.functions";
import { uploadAvatar } from "@/lib/avatar";
import { usePermissions } from "@/hooks/use-permissions";
import { ClientDialog } from "@/components/dialogs/client-dialog";
import { ActivityDrawer } from "@/components/activity-drawer";
import { NotificationBell } from "@/components/notification-bell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  {
    to: "/clients",
    label: "Clients",
    icon: Users,
    section: "clients",
    extraPrefixes: ["/client/"],
  },
  {
    to: "/features",
    label: "Features",
    icon: Puzzle,
    section: "features",
    extraPrefixes: ["/feature/"],
  },
  {
    to: "/tickets",
    label: "Tickets",
    icon: TicketCheck,
    section: "tickets",
    extraPrefixes: ["/ticket/"],
  },
  {
    to: "/account-managers",
    label: "Account Managers",
    icon: UserCog,
    section: "account_managers",
  },
  { to: "/activity", label: "Activity Log", icon: ScrollText, section: null },
  { to: "/settings", label: "Settings", icon: Settings, section: "settings" },
];

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/clients": "Clients",
  "/features": "Feature Adoption",
  "/tickets": "Tickets",
  "/account-managers": "Account Managers",
  "/activity": "Master Activity Log",
  "/settings": "Settings",
  "/profile": "My Profile",
};

function useProfile() {
  return useQuery({
    queryKey: ["my-profile"],
    queryFn: () => getMyProfile(),
    staleTime: 60_000,
  });
}

function SidebarBody() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const { isAdmin, can, loaded } = usePermissions();
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: () => getClients({ data: {} }),
    staleTime: 30_000,
  });

  const { data: profile } = useProfile();

  const avatarMutation = useMutation({
    mutationFn: async (file: File | null) => {
      const path = file ? await uploadAvatar(file) : null;
      await setMyAvatar({ data: { avatar_url: path } });
    },
    onSuccess: async () => {
      toast.success("Profile photo updated");
      await queryClient.invalidateQueries({ queryKey: ["my-profile"] });
    },
    onError: (error: Error) => toast.error(error.message),
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
        <span className="text-lg font-extrabold tracking-tight text-sidebar-primary-foreground">
          Rekart
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
          placeholder="Search client by name"
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
              preload="intent"
              className={cn(
                "group flex items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              )}
            >
              <item.icon className={cn("size-4", active && "text-sidebar-primary-foreground")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border px-4 py-3">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) avatarMutation.mutate(file);
            e.target.value = "";
          }}
        />
        <div className="flex items-center gap-2.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="relative shrink-0 rounded-full ring-offset-sidebar transition hover:ring-2 hover:ring-sidebar-ring"
                aria-label="Profile photo options"
              >
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="My profile"
                    className="size-8 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex size-8 items-center justify-center rounded-full bg-sidebar-accent text-xs font-bold text-sidebar-primary-foreground">
                    {(profile?.full_name ?? "T").charAt(0).toUpperCase()}
                  </span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top">
              <DropdownMenuItem onClick={() => navigate({ to: "/profile" })}>
                <UserRound className="mr-2 size-4" /> View profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => fileRef.current?.click()}>
                <Camera className="mr-2 size-4" />
                {profile?.avatar_url ? "Change photo" : "Add photo"}
              </DropdownMenuItem>
              {profile?.avatar_url && (
                <DropdownMenuItem onClick={() => avatarMutation.mutate(null)}>
                  <Trash2 className="mr-2 size-4" /> Remove photo
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => void handleSignOut()}>
                <LogOut className="mr-2 size-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Link to="/profile" className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-sidebar-primary-foreground hover:underline">
              {profile?.full_name ?? "Team member"}
            </p>
            <p className="truncate text-[10px] text-sidebar-foreground/50">
              {isAdmin ? "Admin" : (profile?.country ?? "")}
            </p>
          </Link>
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
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isNavigating = useRouterState({ select: (s) => s.status === "pending" });

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const title =
    PAGE_TITLES[pathname] ??
    (pathname.startsWith("/client/")
      ? "Client"
      : pathname.startsWith("/feature/")
        ? "Feature"
        : pathname.startsWith("/ticket/")
          ? "Ticket"
          : "Rekart Pulse");

  return (
    <div className="min-h-screen bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-60 shadow-xl transition-transform duration-200 ease-out lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <SidebarBody />
      </aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="lg:pl-60">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-card/95 px-4 py-2.5 backdrop-blur">
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="rounded-md border border-border p-1.5 text-foreground transition-colors hover:bg-accent lg:hidden"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            <PanelLeft className="size-4" />
          </button>
          <h2 className="truncate text-sm font-semibold text-foreground">{title}</h2>
          {isNavigating && (
            <span className="size-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          )}
          <div className="ml-auto flex items-center gap-2">
            {pathname !== "/activity" && <ActivityDrawer />}
            <NotificationBell />
          </div>
        </header>

        <main className="min-h-[calc(100vh-49px)]">{children}</main>
      </div>
    </div>
  );
}
