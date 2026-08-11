import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { ClientDialog } from "@/components/dialogs/client-dialog";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { usePermissions } from "@/hooks/use-permissions";
import { getClients } from "@/lib/pulse.functions";

export const Route = createFileRoute("/_authenticated/clients")({
  head: () => ({
    meta: [
      { title: "Clients — Rekart Pulse" },
      { name: "description", content: "All Rekart clients, their status, health and adoption." },
    ],
  }),
  loader: ({ context }) =>
    context.queryClient.ensureQueryData({
      queryKey: ["clients"],
      queryFn: () => getClients({ data: {} }),
    }),
  component: ClientsPage,
});

function ClientsPage() {
  const { data: clients } = useSuspenseQuery({
    queryKey: ["clients"],
    queryFn: () => getClients({ data: {} }),
  });
  const { can } = usePermissions();
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const filtered = clients
    .filter((c) => (showArchived ? true : !c.archived_at))
    .filter((c) => !search.trim() || c.name.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Clients"
        description={`${filtered.length} clients`}
        actions={
          can("clients", "create") ? (
            <ClientDialog
              trigger={
                <button className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-3.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
                  <Plus className="size-3.5" /> New Client
                </button>
              }
            />
          ) : null
        }
      />

      <div className="flex items-center gap-4 px-6">
        <div className="relative w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients…"
            className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="size-3.5 rounded border-input"
          />
          Show archived
        </label>
      </div>

      <div className="mx-6 overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-2.5">Client</th>
              <th className="px-4 py-2.5">Plan</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5 text-right">Customers</th>
              <th className="px-4 py-2.5 text-right">Features Enabled</th>
              <th className="px-4 py-2.5">Account Manager</th>
              <th className="px-4 py-2.5">Health</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="border-b border-border/60 last:border-0 hover:bg-accent/40">
                <td className="px-4 py-2.5">
                  <Link
                    to="/client/$clientId"
                    params={{ clientId: c.id }}
                    className="flex items-center gap-2.5"
                  >
                    {c.logo_url ? (
                      <img src={c.logo_url} alt="" className="size-7 rounded-full object-cover" />
                    ) : (
                      <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                        {c.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                    <span>
                      <span className="block font-medium text-foreground">
                        {c.name}
                        {c.archived_at && (
                          <span className="ml-2 text-[11px] font-normal text-muted-foreground">
                            (archived)
                          </span>
                        )}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {[c.city, c.country].filter(Boolean).join(", ") || "—"}
                      </span>
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{c.plan}</td>
                <td className="px-4 py-2.5">
                  <StatusBadge status={c.status} />
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                  {c.customers_count}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                  {c.features_enabled}
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">
                  {c.account_manager_name ?? "—"}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                      <div
                        className={
                          c.health_score >= 70
                            ? "h-full bg-emerald-500"
                            : c.health_score >= 40
                              ? "h-full bg-amber-500"
                              : "h-full bg-rose-500"
                        }
                        style={{ width: `${c.health_score}%` }}
                      />
                    </div>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {c.health_score}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No clients found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
