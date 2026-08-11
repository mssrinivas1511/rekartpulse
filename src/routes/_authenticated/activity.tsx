import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { formatDateTime } from "@/lib/format";
import { getAuditLogs } from "@/lib/pulse.functions";

export const Route = createFileRoute("/_authenticated/activity")({
  head: () => ({
    meta: [
      { title: "Activity Log — Rekart Pulse" },
      { name: "description", content: "Who did what, and when, across Rekart Pulse." },
    ],
  }),
  loader: ({ context }) =>
    context.queryClient.ensureQueryData({
      queryKey: ["audit", "all"],
      queryFn: () => getAuditLogs({ data: {} }),
    }),
  component: ActivityPage,
});

const ENTITY_FILTERS = ["all", "client", "feature", "ticket", "subscription"] as const;

function ActivityPage() {
  const [entity, setEntity] = useState<(typeof ENTITY_FILTERS)[number]>("all");
  const { data: logs } = useSuspenseQuery({
    queryKey: ["audit", entity],
    queryFn: () => getAuditLogs({ data: entity === "all" ? {} : { entity_type: entity } }),
  });

  return (
    <div className="space-y-4 p-6">
      <PageHeader title="Activity Log" description="Every change made in Rekart Pulse." />
      <div className="flex gap-1.5">
        {ENTITY_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setEntity(f)}
            className={
              entity === f
                ? "rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
                : "rounded-full border border-input px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-accent"
            }
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>
      <div className="rounded-lg border border-border bg-card">
        {logs.map((a) => (
          <div
            key={a.id}
            className="flex items-start justify-between gap-4 border-b border-border/60 px-4 py-3 last:border-0"
          >
            <div>
              <p className="text-sm font-medium text-foreground">{a.action}</p>
              <p className="mt-0.5 text-[11px] uppercase tracking-wide text-muted-foreground/70">
                {a.entity_label ?? a.entity_type}
              </p>
            </div>
            <div className="shrink-0 text-right text-xs text-muted-foreground">
              <p>{a.user_name}</p>
              <p>{formatDateTime(a.created_at)}</p>
            </div>
          </div>
        ))}
        {logs.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">No activity yet.</p>
        )}
      </div>
    </div>
  );
}
