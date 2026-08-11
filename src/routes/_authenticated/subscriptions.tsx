import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { format } from "date-fns";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  EditSubscriptionDialog,
  NewSubscriptionDialog,
  SubscriptionStatusDialog,
} from "@/components/dialogs/subscription-dialog";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { usePermissions } from "@/hooks/use-permissions";
import { deleteSubscription, getSubscriptions } from "@/lib/pulse.functions";

export const Route = createFileRoute("/_authenticated/subscriptions")({
  head: () => ({
    meta: [
      { title: "Subscriptions — Rekart Pulse" },
      { name: "description", content: "Every subscription, plan change and churn event." },
    ],
  }),
  loader: ({ context }) =>
    context.queryClient.ensureQueryData({
      queryKey: ["subscriptions"],
      queryFn: () => getSubscriptions(),
    }),
  component: SubscriptionsPage,
});

const STATUS_FILTERS = ["all", "active", "paused", "stopped", "completed", "ended"] as const;

function SubscriptionsPage() {
  const { data: subscriptions } = useSuspenseQuery({
    queryKey: ["subscriptions"],
    queryFn: () => getSubscriptions(),
  });
  const { can } = usePermissions();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>("all");

  const filtered = subscriptions.filter((s) => status === "all" || s.status === status);

  async function remove(id: string) {
    try {
      await deleteSubscription({ data: { id } });
      toast.success("Subscription deleted");
      await queryClient.invalidateQueries();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    }
  }

  return (
    <div className="space-y-4 p-6">
      <PageHeader title="Subscriptions" description={`${filtered.length} records`}>
        {can("subscriptions", "create") && (
          <NewSubscriptionDialog
            trigger={
              <button className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-3.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
                <Plus className="size-3.5" /> Record Subscription
              </button>
            }
          />
        )}
      </PageHeader>

      <div className="flex gap-1.5">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={
              status === s
                ? "rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
                : "rounded-full border border-input px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-accent"
            }
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-2.5">Client</th>
              <th className="px-4 py-2.5">Product</th>
              <th className="px-4 py-2.5">Plan</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5 text-right">Customers</th>
              <th className="px-4 py-2.5 text-right">Monthly</th>
              <th className="px-4 py-2.5">Started</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id} className="border-b border-border/60 last:border-0 hover:bg-accent/40">
                <td className="px-4 py-2.5">
                  <Link
                    to="/client/$clientId"
                    params={{ clientId: s.client_id }}
                    className="font-medium text-foreground hover:underline"
                  >
                    {s.client_name}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{s.product}</td>
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
                <td className="px-4 py-2.5">
                  <div className="flex items-center justify-end gap-1.5">
                    {can("subscriptions", "edit") && (
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
                    {can("subscriptions", "delete") && (
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
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No subscriptions match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
