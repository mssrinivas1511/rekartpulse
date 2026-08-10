import { cn } from "@/lib/utils";

const STYLES: Record<string, string> = {
  // clients
  active: "bg-emerald-100 text-emerald-800 border-emerald-200",
  trial: "bg-sky-100 text-sky-800 border-sky-200",
  paused: "bg-amber-100 text-amber-800 border-amber-200",
  churned: "bg-rose-100 text-rose-800 border-rose-200",
  archived: "bg-zinc-200 text-zinc-600 border-zinc-300",
  // features
  live: "bg-emerald-100 text-emerald-800 border-emerald-200",
  in_development: "bg-amber-100 text-amber-800 border-amber-200",
  planned: "bg-sky-100 text-sky-800 border-sky-200",
  deprecated: "bg-zinc-200 text-zinc-600 border-zinc-300",
  // subscriptions
  stopped: "bg-rose-100 text-rose-800 border-rose-200",
  completed: "bg-indigo-100 text-indigo-800 border-indigo-200",
  ended: "bg-orange-100 text-orange-800 border-orange-200",
  // tickets
  open: "bg-rose-100 text-rose-800 border-rose-200",
  in_progress: "bg-amber-100 text-amber-800 border-amber-200",
  resolved: "bg-emerald-100 text-emerald-800 border-emerald-200",
  rejected: "bg-zinc-200 text-zinc-600 border-zinc-300",
  // priorities
  low: "bg-zinc-100 text-zinc-700 border-zinc-200",
  medium: "bg-sky-100 text-sky-800 border-sky-200",
  high: "bg-amber-100 text-amber-800 border-amber-200",
  urgent: "bg-rose-100 text-rose-800 border-rose-200",
};

const LABELS: Record<string, string> = {
  in_development: "In Development",
  in_progress: "In Progress",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const style = STYLES[status] ?? "bg-zinc-100 text-zinc-700 border-zinc-200";
  const label = LABELS[status] ?? status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
        style,
        className,
      )}
    >
      {label}
    </span>
  );
}
