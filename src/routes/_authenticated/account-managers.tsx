import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Plus, Trophy } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/page-header";
import { PermissionGate } from "@/components/permission-gate";
import { AccountManagerDialog } from "@/components/dialogs/account-manager-dialog";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/use-permissions";
import { getAccountManagers } from "@/lib/pulse.functions";

function ManagersError({ error }: { error: Error }) {
  return <div className="p-8 text-sm text-destructive">{error.message}</div>;
}

export const Route = createFileRoute("/_authenticated/account-managers")({
  head: () => ({
    meta: [
      { title: "Account Managers — Rekart Pulse" },
      {
        name: "description",
        content: "Account manager ownership and ticket resolution performance.",
      },
      { property: "og:title", content: "Account Managers — Rekart Pulse" },
      {
        property: "og:description",
        content: "Account manager ownership and ticket resolution performance.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) =>
    context.queryClient.ensureQueryData({
      queryKey: ["account-managers"],
      queryFn: () => getAccountManagers(),
    }),
  component: () => (
    <PermissionGate section="account_managers">
      <ManagersPage />
    </PermissionGate>
  ),
  errorComponent: ManagersError,
  notFoundComponent: () => <div className="p-8">Account managers page not found.</div>,
});

function ManagersPage() {
  const { can, isAdmin } = usePermissions();
  const { data } = useSuspenseQuery({
    queryKey: ["account-managers"],
    queryFn: () => getAccountManagers(),
  });

  const chartData = data.map((m) => ({
    name: m.name.split(" ")[0] ?? m.name,
    Assigned: m.tickets_assigned,
    Resolved: m.tickets_resolved,
  }));

  const champion = [...data]
    .filter((m) => m.tickets_assigned > 0)
    .sort(
      (a, b) =>
        b.ticket_resolution_rate - a.ticket_resolution_rate ||
        b.tickets_resolved - a.tickets_resolved,
    )[0];

  return (
    <div className="space-y-4 pb-8">
      <PageHeader
        title="Account Managers"
        description={`${data.length} team members responsible for client success`}
        actions={
          (isAdmin || can("account_managers", "create")) && (
            <AccountManagerDialog
              trigger={
                <Button size="sm">
                  <Plus className="mr-1.5 size-3.5" /> Add Manager
                </Button>
              }
            />
          )
        }
      />

      {champion && (
        <div className="mx-6 flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
          <Trophy className="size-5 text-primary" />
          <p className="text-sm text-foreground">
            <span className="font-semibold">{champion.name}</span> is leading client query
            resolution — {champion.tickets_resolved}/{champion.tickets_assigned} tickets resolved (
            {champion.ticket_resolution_rate}%).
          </p>
        </div>
      )}

      <div className="mx-6 grid gap-4">
        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground">Tickets assigned vs resolved</h2>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Assigned" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Resolved" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="mx-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {data.map((m) => (
          <article key={m.id} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              {m.avatar_url ? (
                <img
                  src={m.avatar_url}
                  alt={`${m.name} profile`}
                  className="size-10 rounded-full object-cover"
                />
              ) : (
                <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                  {m.name.charAt(0)}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-semibold text-foreground">{m.name}</h2>
                <p className="truncate text-xs text-muted-foreground">
                  {m.email ?? m.phone ?? "Contact not set"}
                </p>
              </div>
              {(isAdmin || can("account_managers", "edit")) && (
                <AccountManagerDialog
                  manager={m}
                  trigger={
                    <Button size="sm" variant="outline">
                      Edit
                    </Button>
                  }
                />
              )}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Active clients</p>
                <p className="font-semibold">
                  {m.active_clients}/{m.total_clients}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Features adopted</p>
                <p className="font-semibold">{m.features_adopted}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tickets resolved</p>
                <p className="font-semibold">
                  {m.tickets_resolved}/{m.tickets_assigned} ({m.ticket_resolution_rate}%)
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Satisfaction</p>
                <p className="font-semibold">{m.satisfaction}/5</p>
              </div>
            </div>
          </article>
        ))}
        {data.length === 0 && (
          <p className="text-sm text-muted-foreground">No account managers yet.</p>
        )}
      </div>
    </div>
  );
}
