import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { format } from "date-fns";
import { Archive, ArchiveRestore, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ClientDialog } from "@/components/dialogs/client-dialog";
import {
  EditSubscriptionDialog,
  NewSubscriptionDialog,
  SubscriptionStatusDialog,
} from "@/components/dialogs/subscription-dialog";
import { StatusBadge } from "@/components/status-badge";
import { usePermissions } from "@/hooks/use-permissions";
import { formatDateTime } from "@/lib/format";
import {
  getClientDetail,
  setClientArchived,
  setClientFeature,
  removeSubscription,
} from "@/lib/pulse.functions";
import type { ClientDetail } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/client/$clientId")({
  head: () => ({
    meta: [{ title: "Client — Rekart Pulse" }],
  }),
  loader: async ({ params, context }) => {
    const detail = await context.queryClient.ensureQueryData({
      queryKey: ["client", params.clientId],
      queryFn: () => getClientDetail({ data: { client_id: params.clientId } }),
    });
    if (!detail) throw notFound();
    return detail;
  },
  component: ClientDetailPage,
  notFoundComponent: () => {
    const { clientId } = Route.useParams();
    return (
      <div className="p-10 text-center">
        <h1 className="text-lg font-semibold text-foreground">Client not found</h1>
        <p className="mt-1 text-sm text-muted-foreground">No client with id {clientId}.</p>
        <Link to="/clients" className="mt-4 inline-block text-sm font-medium text-primary">
          Back to clients
        </Link>
      </div>
    );
  },
});

const TABS = ["Overview", "Features", "Subscriptions", "Tickets", "Activity"] as const;

function ClientDetailPage() {
  const { clientId } = Route.useParams();
  const { data: detail } = useSuspenseQuery({
    queryKey: ["client", clientId],
    queryFn: () => getClientDetail({ data: { client_id: clientId } }),
  });
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");
  const { can } = usePermissions();
  const queryClient = useQueryClient();

  if (!detail) return null;
  const { client } = detail;
  const archived = Boolean(client.archived_at);

  async function toggleArchive() {
    try {
      await setClientArchived({ data: { id: client!.id, archived: !archived } });
      toast.success(archived ? "Client restored" : "Client archived");
      await queryClient.invalidateQueries();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    }
  }

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {client.logo_url ? (
            <img src={client.logo_url} alt="" className="size-12 rounded-xl object-cover" />
          ) : (
            <span className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-base font-bold text-primary">
              {client.name.slice(0, 2).toUpperCase()}
            </span>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-foreground">{client.name}</h1>
              <StatusBadge status={client.status} />
              {archived && <StatusBadge status="archived" />}
            </div>
            <p className="text-sm text-muted-foreground">
              {[client.city, client.country].filter(Boolean).join(", ") || "Location not set"} ·{" "}
              {client.plan} plan · Health {client.health_score}/100
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {can("clients", "edit") && (
            <>
              <ClientDialog
                client={client}
                trigger={
                  <button className="flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-xs font-medium text-foreground hover:bg-accent">
                    <Pencil className="size-3.5" /> Edit
                  </button>
                }
              />
              <ConfirmDialog
                title={archived ? "Restore client?" : "Archive client?"}
                description={
                  archived
                    ? `${client.name} will appear in active lists again.`
                    : `${client.name} will be hidden from active lists. History is kept.`
                }
                confirmLabel={archived ? "Restore" : "Archive"}
                onConfirm={toggleArchive}
                trigger={
                  <button className="flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-xs font-medium text-foreground hover:bg-accent">
                    {archived ? (
                      <ArchiveRestore className="size-3.5" />
                    ) : (
                      <Archive className="size-3.5" />
                    )}
                    {archived ? "Restore" : "Archive"}
                  </button>
                }
              />
            </>
          )}
        </div>
      </div>

      <div className="flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              tab === t
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Overview" && <OverviewTab detail={detail} />}
      {tab === "Features" && <FeaturesTab detail={detail} clientId={clientId} />}
      {tab === "Subscriptions" && <SubscriptionsTab detail={detail} clientId={clientId} />}
      {tab === "Tickets" && <TicketsTab detail={detail} />}
      {tab === "Activity" && <ActivityTab detail={detail} />}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-sm text-foreground">{value ?? "—"}</p>
    </div>
  );
}

function OverviewTab({ detail }: { detail: ClientDetail }) {
  const { client } = detail;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-lg border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Details</h2>
        <div className="grid grid-cols-2 gap-4">
          <InfoItem label="Owner" value={client.owner_name} />
          <InfoItem label="Phone" value={client.phone} />
          <InfoItem label="Industry" value={client.industry} />
          <InfoItem label="Currency" value={client.currency} />
          <InfoItem label="Customers" value={client.customers_count} />
          <InfoItem
            label="Monthly Revenue"
            value={`₹${client.monthly_revenue.toLocaleString("en-IN")}`}
          />
          <InfoItem label="Client Since" value={format(new Date(client.client_since), "d MMM yyyy")} />
          <InfoItem label="Onboarded" value={format(new Date(client.onboarded_at), "d MMM yyyy")} />
        </div>
      </div>
      <div className="rounded-lg border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Notes</h2>
        <p className="whitespace-pre-wrap text-sm text-muted-foreground">
          {client.notes || "No notes yet."}
        </p>
      </div>
    </div>
  );
}

function FeaturesTab({ detail, clientId }: { detail: ClientDetail; clientId: string }) {
  const { can } = usePermissions();
  const queryClient = useQueryClient();
  const editable = can("clients", "edit");

  const cfMap = new Map(detail.client_features.map((cf) => [cf.feature_id, cf]));

  async function save(featureId: string, enabled: boolean, adoption: number) {
    try {
      await setClientFeature({
        data: {
          client_id: clientId,
          feature_id: featureId,
          enabled,
          adoption_percent: adoption,
        },
      });
      await queryClient.invalidateQueries();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    }
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-2.5">Feature</th>
            <th className="px-4 py-2.5">Status</th>
            <th className="px-4 py-2.5">Enabled</th>
            <th className="px-4 py-2.5 w-56">Customer Adoption</th>
            <th className="px-4 py-2.5 text-right">Customers Using</th>
          </tr>
        </thead>
        <tbody>
          {detail.features.map((f) => {
            const cf = cfMap.get(f.id);
            const enabled = cf?.enabled ?? false;
            const adoption = cf?.adoption_percent ?? 0;
            const customersUsing = enabled
              ? Math.round((adoption / 100) * detail.client.customers_count)
              : 0;
            return (
              <tr key={f.id} className="border-b border-border/60 last:border-0">
                <td className="px-4 py-2.5">
                  <Link
                    to="/feature/$featureId"
                    params={{ featureId: f.id }}
                    className="font-medium text-foreground hover:underline"
                  >
                    {f.name}
                  </Link>
                  <span className="ml-2 text-xs text-muted-foreground">{f.category}</span>
                </td>
                <td className="px-4 py-2.5">
                  <StatusBadge status={f.status} />
                </td>
                <td className="px-4 py-2.5">
                  <input
                    type="checkbox"
                    checked={enabled}
                    disabled={!editable}
                    onChange={(e) => void save(f.id, e.target.checked, adoption)}
                    className="size-4 rounded border-input accent-[var(--primary)]"
                  />
                </td>
                <td className="px-4 py-2.5">
                  {enabled ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        defaultValue={adoption}
                        disabled={!editable}
                        onMouseUp={(e) => void save(f.id, true, Number(e.currentTarget.value))}
                        onTouchEnd={(e) => void save(f.id, true, Number(e.currentTarget.value))}
                        className="w-28 accent-[var(--primary)]"
                      />
                      <span className="text-xs tabular-nums text-muted-foreground">{adoption}%</span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                  {enabled ? customersUsing : "—"}
                </td>
              </tr>
            );
          })}
          {detail.features.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                No features defined yet. Add features from the Features page.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function SubscriptionsTab({ detail, clientId }: { detail: ClientDetail; clientId: string }) {
  const { can } = usePermissions();
  const queryClient = useQueryClient();

  async function remove(id: string) {
    try {
      await removeSubscription({ data: { id } });
      toast.success("Subscription deleted");
      await queryClient.invalidateQueries();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    }
  }

  return (
    <div className="space-y-3">
      {can("clients", "create") && (
        <div className="flex justify-end">
          <NewSubscriptionDialog
            clientId={clientId}
            trigger={
              <button className="flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
                <Plus className="size-3.5" /> Record Subscription
              </button>
            }
          />
        </div>
      )}
      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-2.5">Product</th>
              <th className="px-4 py-2.5">Plan</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5 text-right">Customers</th>
              <th className="px-4 py-2.5 text-right">Monthly</th>
              <th className="px-4 py-2.5">Started</th>
              <th className="px-4 py-2.5">Reason</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {detail.subscriptions.map((s) => (
              <tr key={s.id} className="border-b border-border/60 last:border-0">
                <td className="px-4 py-2.5 font-medium text-foreground">{s.product}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{s.plan}</td>
                <td className="px-4 py-2.5">
                  <StatusBadge status={s.status} />
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                  {s.customers_count}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                  ₹{s.monthly_amount.toLocaleString("en-IN")}
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">
                  {format(new Date(s.started_at), "d MMM yyyy")}
                </td>
                <td className="max-w-40 truncate px-4 py-2.5 text-xs text-muted-foreground">
                  {s.end_reason ?? "—"}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center justify-end gap-1.5">
                    {can("clients", "edit") && (
                      <>
                        <SubscriptionStatusDialog
                          subscription={s}
                          trigger={
                            <button className="rounded border border-input px-2 py-1 text-[11px] font-medium text-foreground hover:bg-accent">
                              Status
                            </button>
                          }
                        />
                        <EditSubscriptionDialog
                          subscription={s}
                          trigger={
                            <button className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
                              <Pencil className="size-3.5" />
                            </button>
                          }
                        />
                      </>
                    )}
                    {can("clients", "delete") && (
                      <ConfirmDialog
                        title="Delete subscription?"
                        description="This permanently removes the record."
                        onConfirm={() => remove(s.id)}
                        trigger={
                          <button className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-rose-600">
                            <Trash2 className="size-3.5" />
                          </button>
                        }
                      />
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {detail.subscriptions.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No subscriptions recorded.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TicketsTab({ detail }: { detail: ClientDetail }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-2.5">Ticket</th>
            <th className="px-4 py-2.5">Type</th>
            <th className="px-4 py-2.5">Priority</th>
            <th className="px-4 py-2.5">Status</th>
            <th className="px-4 py-2.5">Updated</th>
          </tr>
        </thead>
        <tbody>
          {detail.tickets.map((t) => (
            <tr key={t.id} className="border-b border-border/60 last:border-0 hover:bg-accent/40">
              <td className="px-4 py-2.5">
                <Link
                  to="/ticket/$ticketId"
                  params={{ ticketId: t.id }}
                  className="font-medium text-foreground hover:underline"
                >
                  {t.title}
                </Link>
                <span className="ml-2 text-xs text-muted-foreground">{t.feature_name ?? ""}</span>
              </td>
              <td className="px-4 py-2.5 text-muted-foreground">{t.ticket_type}</td>
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
          {detail.tickets.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                No tickets for this client.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function ActivityTab({ detail }: { detail: ClientDetail }) {
  return (
    <div className="rounded-lg border border-border bg-card">
      {detail.audit.map((a) => (
        <div
          key={a.id}
          className="flex items-start justify-between gap-4 border-b border-border/60 px-4 py-3 last:border-0"
        >
          <p className="text-sm font-medium text-foreground">{a.action}</p>
          <div className="shrink-0 text-right text-xs text-muted-foreground">
            <p>{a.user_name}</p>
            <p>{formatDateTime(a.created_at)}</p>
          </div>
        </div>
      ))}
      {detail.audit.length === 0 && (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">No activity yet.</p>
      )}
    </div>
  );
}
