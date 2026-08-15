import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Activity,
  AlertTriangle,
  ClipboardList,
  MessageSquare,
  Puzzle,
  TrendingDown,
  Users,
} from "lucide-react";
import { ChurnChart } from "@/components/churn-chart";
import { StatusBadge } from "@/components/status-badge";
import { getDashboard } from "@/lib/pulse.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Rekart Pulse" },
      { name: "description", content: "Feature adoption, churn and client success at a glance." },
    ],
  }),
  loader: ({ context }) =>
    context.queryClient.ensureQueryData({
      queryKey: ["dashboard"],
      queryFn: () => getDashboard(),
    }),
  component: DashboardPage,
});

function Kpi({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3.5" /> {label}
      </div>
      <p className="mt-1.5 text-2xl font-bold text-foreground">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function DashboardPage() {
  const { data } = useSuspenseQuery({
    queryKey: ["dashboard"],
    queryFn: () => getDashboard(),
  });
  const { stats, feature_stats: features, recent_feedback: feedback, churn_by_month: churn } = data;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Feature adoption and client success across Rekart.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          icon={Puzzle}
          label="Avg Feature Adoption"
          value={`${stats.avg_adoption_rate}%`}
          sub="across enabled clients"
        />
        <Kpi
          icon={Activity}
          label="Features Live"
          value={`${stats.features_live}/${stats.total_features}`}
          sub={`${stats.features_in_development} in development · ${stats.features_planned} planned`}
        />
        <Kpi
          icon={Users}
          label="Active Clients"
          value={stats.active_clients}
          sub={`${stats.trial_clients} trial · ${stats.paid_clients} paid · ${stats.churned_clients} churned`}
        />
        <Kpi
          icon={TrendingDown}
          label="Churn Rate"
          value={`${stats.churn_rate}%`}
          sub={`${stats.trial_to_paid}% trial → paid`}
        />
        <Kpi icon={ClipboardList} label="Open Tickets" value={stats.open_tickets} />
        <Kpi icon={MessageSquare} label="Feedback Received" value={stats.total_feedback} />
        <Kpi
          icon={AlertTriangle}
          label="Clients Using Features"
          value={stats.clients_using_features}
          sub="at least one feature enabled"
        />
        <Kpi
          icon={Users}
          label="New This Month"
          value={stats.new_clients_this_month}
          sub="clients onboarded"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Feature Adoption</h2>
          <div className="space-y-3">
            {features.map((f) => (
              <Link
                key={f.id}
                to="/feature/$featureId"
                params={{ featureId: f.id }}
                className="block rounded-md p-1.5 transition-colors hover:bg-accent/60"
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">{f.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {f.clients_using}/{f.clients_enabled} clients · {f.customers_reached} customers
                    · {f.avg_adoption}%
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${Math.min(100, f.avg_adoption)}%` }}
                  />
                </div>
              </Link>
            ))}
            {features.length === 0 && (
              <p className="text-sm text-muted-foreground">No features yet.</p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <ChurnChart data={churn} />
          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold text-foreground">Recent Feedback</h2>
            <div className="space-y-2.5">
              {feedback.slice(0, 5).map((fb) => (
                <div key={fb.id} className="flex items-start justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">
                      {fb.feature_name ?? "Feature"}
                    </p>
                    <p className="truncate text-muted-foreground">
                      {fb.client_name ?? "Internal"} · {format(new Date(fb.created_at), "d MMM")}
                    </p>
                  </div>
                  <StatusBadge status={fb.status} />
                </div>
              ))}
              {feedback.length === 0 && (
                <p className="text-sm text-muted-foreground">No feedback yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
