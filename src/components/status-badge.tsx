import { cn } from "@/lib/utils";
import type { ClientStatus, EventType, FeatureStatus, SubscriptionStatus } from "@/lib/types";

const base = "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide";

export function ClientStatusBadge({ status, className }: { status: ClientStatus; className?: string }) {
  const styles: Record<ClientStatus, string> = {
    active: "bg-highlight text-highlight-foreground",
    at_risk: "bg-warning text-warning-foreground",
    churned: "bg-destructive/10 text-destructive",
  };
  const labels: Record<ClientStatus, string> = {
    active: "Active",
    at_risk: "At Risk",
    churned: "Churned",
  };
  return <span className={cn(base, styles[status], className)}>{labels[status]}</span>;
}

export function FeatureStatusBadge({ status, className }: { status: FeatureStatus; className?: string }) {
  const styles: Record<FeatureStatus, string> = {
    hit: "bg-primary text-primary-foreground",
    stable: "bg-secondary text-secondary-foreground",
    declining: "bg-warning text-warning-foreground",
  };
  return (
    <span className={cn(base, styles[status], className)}>
      {status === "hit" && <span className="size-1.5 rounded-full bg-primary-foreground" />}
      {status}
    </span>
  );
}

export function SubscriptionStatusBadge({
  status,
  className,
}: {
  status: SubscriptionStatus;
  className?: string;
}) {
  const styles: Record<SubscriptionStatus, string> = {
    active: "bg-highlight text-highlight-foreground",
    paused: "bg-warning text-warning-foreground",
    stopped: "bg-destructive/10 text-destructive",
    completed: "bg-muted text-muted-foreground",
    ended: "bg-destructive/10 text-destructive",
  };
  return <span className={cn(base, styles[status], className)}>{status}</span>;
}

const EVENT_STYLES: Record<EventType, { dot: string; label: string }> = {
  general: { dot: "bg-muted-foreground", label: "General" },
  churn: { dot: "bg-destructive", label: "Churn" },
  payment: { dot: "bg-primary", label: "Payment" },
  feature: { dot: "bg-chart-2", label: "Feature" },
  risk: { dot: "bg-chart-3", label: "Risk" },
  issue: { dot: "bg-chart-4", label: "Issue" },
};

export function EventTypeBadge({ type, className }: { type: EventType; className?: string }) {
  const style = EVENT_STYLES[type] ?? EVENT_STYLES.general;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground", className)}>
      <span className={cn("size-1.5 rounded-full", style.dot)} />
      {style.label}
    </span>
  );
}
