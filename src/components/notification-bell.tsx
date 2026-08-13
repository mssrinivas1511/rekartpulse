import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getTickets } from "@/lib/pulse.functions";
import { formatDateTime } from "@/lib/format";
import { StatusBadge } from "@/components/status-badge";

const SEEN_KEY = "pulse:tickets-seen-at";

export function NotificationBell() {
  const [seenAt, setSeenAt] = useState<string>("");

  useEffect(() => {
    setSeenAt(window.localStorage.getItem(SEEN_KEY) ?? new Date(0).toISOString());
  }, []);

  const { data } = useQuery({
    queryKey: ["tickets", "all"],
    queryFn: () => getTickets({ data: {} }),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const tickets = data ?? [];
  const unseen = seenAt ? tickets.filter((t) => t.created_at > seenAt) : [];

  function markSeen() {
    const now = new Date().toISOString();
    window.localStorage.setItem(SEEN_KEY, now);
    setSeenAt(now);
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="relative rounded-md border border-border bg-card p-1.5 text-foreground transition-colors hover:bg-accent"
          aria-label={`Notifications${unseen.length > 0 ? ` (${unseen.length} new)` : ""}`}
        >
          <Bell className="size-4" />
          {unseen.length > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-4 text-destructive-foreground">
              {unseen.length > 9 ? "9+" : unseen.length}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <p className="text-sm font-semibold">Notifications</p>
          {unseen.length > 0 && (
            <button onClick={markSeen} className="text-xs text-primary hover:underline">
              Mark all read
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {(unseen.length > 0 ? unseen : tickets.slice(0, 6)).map((t) => (
            <Link
              key={t.id}
              to="/ticket/$ticketId"
              params={{ ticketId: t.id }}
              className="block border-b border-border/60 px-3 py-2.5 last:border-0 hover:bg-accent/60"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-medium text-foreground">
                  {t.created_at > seenAt ? "New ticket: " : ""}
                  {t.title}
                </p>
                <StatusBadge status={t.status} />
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {t.client_name} · {formatDateTime(t.created_at)}
              </p>
            </Link>
          ))}
          {tickets.length === 0 && (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">
              No tickets yet.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
