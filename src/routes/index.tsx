import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Plus, ScrollText, Users, IndianRupee, TrendingDown, Gauge } from "lucide-react";
import { getDashboard } from "@/lib/pulse.functions";
import { PageHeader } from "@/components/page-header";
import { ChurnChart } from "@/components/churn-chart";
import { ClientStatusBadge, EventTypeBadge, FeatureStatusBadge } from "@/components/status-badge";
import { ClientDialog } from "@/components/dialogs/client-dialog";
import { ActivityDialog } from "@/components/dialogs/activity-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime, formatINR, formatNumber } from "@/lib/format";

const dashboardQuery = queryOptions({
  queryKey: ["dashboard"],
  queryFn: () => getDashboard(),
});

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(dashboardQuery),
  head: () => ({
    meta: [
      { title: "Dashboard — Rekart Pulse" },
      {
        name: "description",
        content:
          "Live output from your daily updates: churn rate, feature adoption, at-risk clients and recent activity.",
      },
      { property: "og:title", content: "Dashboard — Rekart Pulse" },
      {
        property: "og:description",
        content: "Churn, feature adoption and client health for Rekart, updated daily.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <Card className="shadow-sm">
      <CardContent className="flex items-start justify-between gap-2 p-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            {label}
          </p>
          <p className="mt-1.5 text-2xl font-bold tabular-nums tracking-tight text-foreground">
            {value}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
        </div>
        <span className="flex size-9 items-center justify-center rounded-md bg-highlight text-highlight-foreground">
          <Icon className="size-4" />
        </span>
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const { data } = useSuspenseQuery(dashboardQuery);
  const { stats, churn_by_month, feature_stats, at_risk, recent_activity } = data;

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Dashboard"
        description="Real output computed from everything you log here."
        actions={
          <>
            <ActivityDialog
              trigger={
                <Button variant="outline" size="sm">
                  <ScrollText /> Log Activity
                </Button>
              }
            />
            <ClientDialog
              trigger={
                <Button size="sm">
                  <Plus /> New Client
                </Button>
              }
            />
          </>
        }
      />

      <div className="space-y-6 p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={Users}
            label="Active Clients"
            value={String(stats.active_clients)}
            sub={`${stats.at_risk_clients} at risk · ${stats.churned_clients} churned`}
          />
          <StatCard
            icon={IndianRupee}
            label="Monthly Revenue"
            value={formatINR(stats.total_mrr)}
            sub="Across active subscriptions"
          />
          <StatCard
            icon={TrendingDown}
            label="Churn Rate"
            value={`${stats.churn_rate}%`}
            sub="Stopped + completed + ended subs"
          />
          <StatCard
            icon={Gauge}
            label="Avg Feature Adoption"
            value={`${stats.avg_adoption}%`}
            sub={`${stats.features_live} features live`}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Card className="shadow-sm xl:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                Churn trend — stopped / completed / ended
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChurnChart data={churn_by_month} />
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Feature performance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {feature_stats.slice(0, 6).map((feature) => (
                <div key={feature.id} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[13px] font-medium text-foreground">
                      {feature.name}
                    </p>
                    <FeatureStatusBadge status={feature.status} />
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.min(100, feature.avg_adoption)}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {feature.clients_enabled} clients · {feature.avg_adoption}% avg customer
                    adoption · {formatNumber(feature.customers_reached)} customers reached
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                At-risk clients — low customer rate
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-[11px] uppercase tracking-wider">Client</TableHead>
                    <TableHead className="text-right text-[11px] uppercase tracking-wider">
                      Customers
                    </TableHead>
                    <TableHead className="text-right text-[11px] uppercase tracking-wider">
                      Status
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {at_risk.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="py-6 text-center text-sm text-muted-foreground">
                        No at-risk clients right now.
                      </TableCell>
                    </TableRow>
                  )}
                  {at_risk.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell>
                        <Link
                          to="/clients/$clientId"
                          params={{ clientId: client.id }}
                          className="font-medium text-foreground hover:text-primary"
                        >
                          {client.name}
                        </Link>
                        <p className="text-[11px] text-muted-foreground">{client.city}</p>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNumber(client.customers_count)}
                      </TableCell>
                      <TableCell className="text-right">
                        <ClientStatusBadge status={client.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="shadow-sm xl:col-span-2">
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold">Recent activity</CardTitle>
              <Link to="/activity" className="text-xs font-medium text-primary hover:underline">
                View all
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-[11px] uppercase tracking-wider">Date Time</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider">Operator</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider">Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recent_activity.map((entry) => (
                    <TableRow
                      key={entry.id}
                      className={entry.event_type === "churn" ? "bg-highlight/40" : undefined}
                    >
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatDateTime(entry.created_at)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs font-medium">
                        {entry.operator}
                      </TableCell>
                      <TableCell className="text-[13px]">
                        <span className="mr-2">
                          <EventTypeBadge type={entry.event_type} />
                        </span>
                        {entry.description}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
