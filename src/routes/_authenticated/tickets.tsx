import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { getTickets } from "@/lib/pulse.functions";
import { formatDateTime } from "@/lib/format";

const FILTERS = ["all", "open", "in_progress", "need_info", "resolved", "rejected"] as const;
function TicketsError({ error }: { error: Error }) { return <div className="p-8 text-sm text-destructive">{error.message}</div>; }

export const Route = createFileRoute("/_authenticated/tickets")({
  head: () => ({ meta: [
    { title: "Tickets — Rekart Pulse" }, { name: "description", content: "Client bugs, requests, improvements and support tickets." },
    { property: "og:title", content: "Tickets — Rekart Pulse" }, { property: "og:description", content: "Client bugs, requests, improvements and support tickets." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  loader: ({ context }) => context.queryClient.ensureQueryData({ queryKey: ["tickets", "all"], queryFn: () => getTickets({ data: {} }) }),
  component: TicketsPage, errorComponent: TicketsError, notFoundComponent: () => <div className="p-8">Tickets page not found.</div>,
});

function TicketsPage() {
  const [status, setStatus] = useState<(typeof FILTERS)[number]>("all");
  const { data } = useSuspenseQuery({ queryKey: ["tickets", status], queryFn: () => getTickets({ data: status === "all" ? {} : { status } }) });
  return <div className="space-y-4"><PageHeader title="Tickets" description={`${data.length} client requests and issues`} />
    <div className="flex flex-wrap gap-1.5 px-6">{FILTERS.map((item) => <Button key={item} type="button" size="sm" variant={status === item ? "default" : "outline"} onClick={() => setStatus(item)}>{item.replace("_", " ")}</Button>)}</div>
    <div className="mx-6 overflow-x-auto rounded-lg border bg-card"><table className="w-full text-left text-sm"><thead><tr className="border-b text-[11px] uppercase text-muted-foreground"><th className="px-4 py-2.5">Ticket</th><th className="px-4 py-2.5">Client</th><th className="px-4 py-2.5">Type</th><th className="px-4 py-2.5">Priority</th><th className="px-4 py-2.5">Status</th><th className="px-4 py-2.5">Updated</th></tr></thead><tbody>{data.map((t) => <tr key={t.id} className="border-b last:border-0 hover:bg-accent/40"><td className="px-4 py-2.5"><Link to="/ticket/$ticketId" params={{ ticketId: t.id }} className="font-medium hover:underline">{t.title}</Link></td><td className="px-4 py-2.5 text-muted-foreground">{t.client_name}</td><td className="px-4 py-2.5 text-muted-foreground">{t.ticket_type.replace("_", " ")}</td><td className="px-4 py-2.5"><StatusBadge status={t.priority} /></td><td className="px-4 py-2.5"><StatusBadge status={t.status} /></td><td className="px-4 py-2.5 text-xs text-muted-foreground">{formatDateTime(t.updated_at)}</td></tr>)}{data.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No tickets found.</td></tr>}</tbody></table></div>
  </div>;
}