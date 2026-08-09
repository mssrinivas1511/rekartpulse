import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ScrollText } from "lucide-react";
import { getActivity } from "@/lib/pulse.functions";
import { PageHeader } from "@/components/page-header";
import { EventTypeBadge } from "@/components/status-badge";
import { ActivityDialog } from "@/components/dialogs/activity-dialog";
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
import { formatDateTime } from "@/lib/format";

const activityQuery = queryOptions({
  queryKey: ["activity"],
  queryFn: () => getActivity({ data: {} }),
});

const FILTERS = [
  { value: "all", label: "All" },
  { value: "churn", label: "Churn" },
  { value: "payment", label: "Payment" },
  { value: "feature", label: "Feature" },
  { value: "risk", label: "Risk" },
  { value: "issue", label: "Issue" },
  { value: "general", label: "General" },
] as const;

export const Route = createFileRoute("/activity")({
  loader: ({ context }) => context.queryClient.ensureQueryData(activityQuery),
  head: () => ({
    meta: [
      { title: "Activity Log — Rekart Pulse" },
      {
        name: "description",
        content: "The full Rekart activity log — every churn event, payment, feature change and risk flag.",
      },
      { property: "og:title", content: "Activity Log — Rekart Pulse" },
      { property: "og:description", content: "Every event across clients and features, newest first." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ActivityPage,
});

function ActivityPage() {
  const { data: entries } = useSuspenseQuery(activityQuery);
  const [filter, setFilter] = useState<string>("all");

  const filtered =
    filter === "all" ? entries : entries.filter((e) => e.event_type === filter);

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Activity Log"
        description={`${entries.length} entries — everything you log shows up here and feeds the dashboard.`}
        actions={
          <ActivityDialog
            trigger={
              <Button size="sm">
                <ScrollText /> Log Activity
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
                  <TableHead className="text-[11px] uppercase tracking-wider">Date Time</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider">Operator</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider">Client</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider">Type</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider">Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                      No entries in this bucket yet.
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((entry) => (
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
                    <TableCell className="whitespace-nowrap text-xs">
                      {entry.client_id && entry.client_name ? (
                        <Link
                          to="/clients/$clientId"
                          params={{ clientId: entry.client_id }}
                          className="font-medium text-foreground hover:text-primary"
                        >
                          {entry.client_name}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">{entry.feature_name ?? "—"}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <EventTypeBadge type={entry.event_type} />
                    </TableCell>
                    <TableCell className="text-[13px]">{entry.description}</TableCell>
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
