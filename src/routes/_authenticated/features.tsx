import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { FeatureDialog } from "@/components/dialogs/feature-dialog";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { usePermissions } from "@/hooks/use-permissions";
import { getFeatureStats } from "@/lib/pulse.functions";

export const Route = createFileRoute("/_authenticated/features")({
  head: () => ({
    meta: [
      { title: "Features — Rekart Pulse" },
      { name: "description", content: "Feature adoption across all Rekart clients." },
    ],
  }),
  loader: ({ context }) =>
    context.queryClient.ensureQueryData({
      queryKey: ["features"],
      queryFn: () => getFeatureStats(),
    }),
  component: FeaturesPage,
});

function FeaturesPage() {
  const { data: features } = useSuspenseQuery({
    queryKey: ["features"],
    queryFn: () => getFeatureStats(),
  });
  const { can } = usePermissions();

  return (
    <div className="space-y-4">
      <PageHeader
        title="Features"
        description={`${features.length} tracked features`}
        actions={
          can("features", "create") ? (
            <FeatureDialog
              trigger={
                <button className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-3.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
                  <Plus className="size-3.5" /> New Feature
                </button>
              }
            />
          ) : null
        }
      />

      <div className="mx-6 overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-2.5">Feature</th>
              <th className="px-4 py-2.5">Category</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5 w-56">Adoption Rate</th>
              <th className="px-4 py-2.5 text-right">Clients Using</th>
              <th className="px-4 py-2.5 text-right">Customers Reached</th>
              <th className="px-4 py-2.5 text-right">Feedback</th>
            </tr>
          </thead>
          <tbody>
            {features.map((f) => (
              <tr key={f.id} className="border-b border-border/60 last:border-0 hover:bg-accent/40">
                <td className="px-4 py-2.5">
                  <Link
                    to="/feature/$featureId"
                    params={{ featureId: f.id }}
                    className="font-medium text-foreground hover:underline"
                  >
                    {f.name}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{f.category}</td>
                <td className="px-4 py-2.5">
                  <StatusBadge status={f.status} />
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-28 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.min(100, f.adoption_rate)}%` }}
                      />
                    </div>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {f.adoption_rate}%
                    </span>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                  {f.clients_using}/{f.clients_enabled}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                  {f.customers_reached.toLocaleString("en-IN")}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                  {f.feedback_count}
                </td>
              </tr>
            ))}
            {features.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No features yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
