import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { PageHeader } from "@/components/page-header";
import { PermissionGate } from "@/components/permission-gate";
import { ActivityFeed } from "@/components/activity-drawer";
import { TicketDialog } from "@/components/dialogs/ticket-dialog";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/use-permissions";
import { getTickets } from "@/lib/pulse.functions";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const FILTERS = ["all", "open", "in_progress", "need_info", "resolved", "rejected"] as const;
const CLOSED = ["resolved", "rejected"];

function TicketsError({ error }: { error: Error }) {
  return <div className="p-8 text-sm text-destructive">{error.message}</div>;
}

export const Route = createFileRoute("/_authenticated/tickets")({
  head: () => ({
    meta: [
      { title: "Tickets — Rekart Pulse" },
      { name: "description", content: "Client bugs, requests, improvements and support tickets." },
      { property: "og:title", content: "Tickets — Rekart Pulse" },
      {
        property: "og:description",
        content: "Client bugs, requests, improvements and support tickets.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) =>
    context.queryClient.ensureQueryData({
      queryKey: ["tickets", "all"],
      queryFn: () => getTickets({ data: {} }),
    }),
  component: () => (
    <PermissionGate section="tickets">
      <TicketsPage />
    </PermissionGate>
  ),
  errorComponent: TicketsError,
  notFoundComponent: () => <div className="p-8">Tickets page not found.</div>,
});

function TicketsPage() {
  const [status, setStatus] = useState<(typeof FILTERS)[number]>("all");
  const { can, isAdmin } = usePermissions();

  const { data: all } = useSuspenseQuery({
    queryKey: ["tickets", "all"],
    queryFn: () => getTickets({ data: {} }),
  });

  const data = status === "all" ? all : all.filter((t) => t.status === status);

  const byClient = useMemo(() => {
    const map = new Map<string, { name: string; open: number; closed: number }>();
    for (const t of all) {
      const key = t.client_id;
      const row = map.get(key) ?? { name: t.client_name ?? "Unknown client", open: 0, closed: 0 };
      if (CLOSED.includes(t.status)) row.closed += 1;
      else row.open += 1;
      map.set(key, row);
    }
    return [...map.values()]
      .map((r) => ({
        ...r,
        total: r.open + r.closed,
        rate: r.open + r.closed > 0 ? Math.round((r.closed / (r.open + r.closed)) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [all]);

  const totals = byClient.reduce(
    (acc, r) => ({ open: acc.open + r.open, closed: acc.closed + r.closed }),
    { open: 0, closed: 0 },
  );
  const overallRate =
    totals.open + totals.closed > 0
      ? Math.round((totals.closed / (totals.open + totals.closed)) * 100)
      : 0;

  return (
    <div className="space-y-4 pb-8">
      <PageHeader
        title="Tickets"
        description={`${all.length} client requests · ${overallRate}% resolved`}
        actions={
          (isAdmin || can("tickets", "create")) && (
            <TicketDialog
              trigger={
                <Button size="sm">
                  <Plus className="mr-1.5 size-3.5" /> New Ticket
                </Button>
              }
            />
          )
        }
      />

      <div className="mx-6 grid gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Open
          </p>
          <p className="mt-1 text-2xl font-bold text-foreground">{totals.open}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Closed
          </p>
          <p className="mt-1 text-2xl font-bold text-foreground">{totals.closed}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Resolution rate
          </p>
          <p
            className={cn(
              "mt-1 text-2xl font-bold",
              overallRate >= 70
                ? "text-emerald-600"
                : overallRate >= 40
                  ? "text-amber-600"
                  : "text-rose-600",
            )}
          >
            {overallRate}%
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Clients raising tickets
          </p>
          <p className="mt-1 text-2xl font-bold text-foreground">{byClient.length}</p>
        </div>
      </div>

      <div className="mx-6 grid gap-4 xl:grid-cols-3">
        <section className="rounded-lg border border-border bg-card p-4 xl:col-span-2">
          <h2 className="text-sm font-semibold text-foreground">Client-wise resolution rate</h2>
          <div className="mt-3 space-y-3">
            {byClient.map((row) => (
              <div key={row.name}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">{row.name}</span>
                  <span className="text-muted-foreground">
                    {row.closed} closed · {row.open} open ·{" "}
                    <span
                      className={cn(
                        "font-semibold",
                        row.rate >= 70
                          ? "text-emerald-600"
                          : row.rate >= 40
                            ? "text-amber-600"
                            : "text-rose-600",
                      )}
                    >
                      {row.rate}%
                    </span>
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      row.rate >= 70
                        ? "bg-emerald-500"
                        : row.rate >= 40
                          ? "bg-amber-500"
                          : "bg-rose-500",
                    )}
                    style={{ width: `${row.rate}%` }}
                  />
                </div>
              </div>
            ))}
            {byClient.length === 0 && (
              <p className="text-sm text-muted-foreground">No tickets raised yet.</p>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground">Ticket activity</h2>
          <div className="mt-3">
            <ActivityFeed entityType="ticket" limit={10} />
          </div>
        </section>
      </div>

      <div className="flex flex-wrap gap-1.5 px-6">
        {FILTERS.map((item) => (
          <Button
            key={item}
            type="button"
            size="sm"
            variant={status === item ? "default" : "outline"}
            onClick={() => setStatus(item)}
          >
            {item.replace("_", " ")}
          </Button>
        ))}
      </div>

      <div className="mx-6 overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-[11px] uppercase text-muted-foreground">
              <th className="px-4 py-2.5">Ticket</th>
              <th className="px-4 py-2.5">Client</th>
              <th className="px-4 py-2.5">Type</th>
              <th className="px-4 py-2.5">Assigned</th>
              <th className="px-4 py-2.5">Priority</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5">Updated</th>
            </tr>
          </thead>
          <tbody>
            {data.map((t) => (
              <tr key={t.id} className="border-b border-border/60 last:border-0 hover:bg-accent/40">
                <td className="px-4 py-2.5">
                  <Link
                    to="/ticket/$ticketId"
                    params={{ ticketId: t.id }}
                    preload="intent"
                    className="font-medium hover:underline"
                  >
                    {t.title}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{t.client_name}</td>
                <td className="px-4 py-2.5 text-muted-foreground">
                  {t.ticket_type.replace("_", " ")}
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">
                  {t.assigned_name ?? "Unassigned"}
                </td>
                <td className="px-4 py-2.5">
                  <StatusBadge status={t.priority} />
                </td>
                <td className="px-4 py-2.5">
                  <StatusBadge status={t.status} />
                </td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground">
                  {formatDateTime(t.updated_at)}
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  No tickets found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
