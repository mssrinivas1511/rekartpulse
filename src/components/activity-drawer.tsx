import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { History } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { getAuditLogs } from "@/lib/pulse.functions";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const FILTERS = ["all", "client", "feature", "ticket", "account_manager", "role"] as const;

export function ActivityFeed({
  entityType,
  entityId,
  limit = 30,
}: {
  entityType?: string;
  entityId?: string;
  limit?: number;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["audit", entityType ?? "all", entityId ?? "none"],
    queryFn: () =>
      getAuditLogs({
        data: {
          ...(entityType && entityType !== "all" ? { entity_type: entityType } : {}),
          ...(entityId ? { entity_id: entityId } : {}),
        },
      }),
    staleTime: 10_000,
  });

  if (isLoading) {
    return <p className="px-1 py-6 text-sm text-muted-foreground">Loading activity…</p>;
  }

  const logs = (data ?? []).slice(0, limit);
  if (logs.length === 0) {
    return <p className="px-1 py-6 text-sm text-muted-foreground">No activity recorded yet.</p>;
  }

  return (
    <ol className="relative space-y-0 border-l border-border pl-4">
      {logs.map((log) => (
        <li key={log.id} className="relative py-2.5">
          <span className="absolute -left-[21px] top-4 size-2 rounded-full bg-primary" />
          <p className="text-sm font-medium leading-snug text-foreground">{log.action}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {log.entity_label ?? log.entity_type} · {log.user_name} · {formatDateTime(log.created_at)}
          </p>
        </li>
      ))}
    </ol>
  );
}

export function ActivityDrawer({ compact = false }: { compact?: boolean }) {
  const [entity, setEntity] = useState<(typeof FILTERS)[number]>("all");

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
          aria-label="Open activity log"
        >
          <History className="size-4" />
          {!compact && "Activity"}
        </button>
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Activity Log</SheetTitle>
        </SheetHeader>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setEntity(f)}
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-medium capitalize transition-colors",
                entity === f
                  ? "bg-primary text-primary-foreground"
                  : "border border-input text-muted-foreground hover:bg-accent",
              )}
            >
              {f.replace("_", " ")}
            </button>
          ))}
        </div>
        <div className="mt-4">
          <ActivityFeed entityType={entity} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
