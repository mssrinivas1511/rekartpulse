import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { getSubscriptions } from "@/lib/pulse.functions";
import { PageHeader } from "@/components/page-header";
import { SubscriptionStatusBadge } from "@/components/status-badge";
import {
  NewSubscriptionDialog,
  SubscriptionStatusDialog,
} from "@/components/dialogs/subscription-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatDate, formatINR } from "@/lib/format";
import { CHURN_STATUSES } from "@/lib/types";

const subscriptionsQuery = queryOptions({
  queryKey: ["subscriptions"],
  queryFn: () => getSubscriptions({ data: {} }),
});

const FILTERS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "stopped", label: "Stopped" },
  { value: "completed", label: "Completed" },
  { value: "ended", label: "Ended" },
] as const;

export const Route = createFileRoute("/subscriptions")({
  loader: ({ context }) => context.queryClient.ensureQueryData(subscriptionsQuery),
  head: () => ({
    meta: [
      { title: "Subscriptions & Churn — Rekart Pulse" },
      {
        name: "description",
        content: "Every client subscription — stopped, completed and ended subscriptions count as churn.",
      },
      { property: "og:title", content: "Subscriptions & Churn — Rekart Pulse" },
      { property: "og:description", content: "Track churned subscriptions and their reasons." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SubscriptionsPage,
});

function SubscriptionsPage() {
  const { data: subscriptions } = useSuspenseQuery(subscriptionsQuery);
  const [filter, setFilter] = useState<string>("all");

  const filtered =
    filter === "all" ? subscriptions : subscriptions.filter((s) => s.status === filter);

  const active = subscriptions.filter((s) => s.status === "active").length;
  const churned = subscriptions.filter((s) => CHURN_STATUSES.includes(s.status)).length;
  const churnRate =
    subscriptions.length > 0 ? Math.round((churned / subscriptions.length) * 1000) / 10 : 0;

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Subscriptions"
        description={`${active} active · ${churned} churned (stopped / completed / ended) · ${churnRate}% churn rate`}
        actions={
          <NewSubscriptionDialog
            trigger={
              <Button size="sm">
                <Plus /> Record Subscription
              </Button>
            }
          />
        }
      />

      <div className="space-y-4 p-6">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                filter === f.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-accent",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <Card className="shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-[11px] uppercase tracking-wider">Client</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider">Plan</TableHead>
                  <TableHead className="text-right text-[11px] uppercase tracking-wider">
                    Amount
                  </TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider">Started</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider">Ended</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider">Reason</TableHead>
                  <TableHead className="text-right text-[11px] uppercase tracking-wider">
                    Status
                  </TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                      No subscriptions in this bucket.
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((sub) => (
                  <TableRow
                    key={sub.id}
                    className={CHURN_STATUSES.includes(sub.status) ? "bg-highlight/40" : undefined}
                  >
                    <TableCell>
                      <Link
                        to="/clients/$clientId"
                        params={{ clientId: sub.client_id }}
                        className="font-medium text-foreground hover:text-primary"
                      >
                        {sub.client_name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">{sub.plan}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatINR(sub.monthly_amount)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(sub.started_at)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(sub.ended_at)}
                    </TableCell>
                    <TableCell className="max-w-52 truncate text-sm text-muted-foreground">
                      {sub.end_reason ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <SubscriptionStatusBadge status={sub.status} />
                    </TableCell>
                    <TableCell className="w-28 text-right">
                      <SubscriptionStatusDialog
                        subscription={sub}
                        trigger={
                          <Button variant="ghost" size="sm">
                            Change
                          </Button>
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
