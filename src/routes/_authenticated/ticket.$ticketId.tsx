import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { formatDateTime } from "@/lib/format";
import {
  createComment,
  editTicket,
  getAccountManagers,
  getTicketDetail,
  setTicketStatus,
} from "@/lib/pulse.functions";
import type { Ticket, TicketStatus } from "@/lib/types";

const STATUSES: TicketStatus[] = ["open", "in_progress", "need_info", "resolved", "rejected"];

function TicketError({ error }: { error: Error }) {
  return <div className="p-8 text-sm text-destructive">{error.message}</div>;
}

export const Route = createFileRoute("/_authenticated/ticket/$ticketId")({
  head: () => ({
    meta: [
      { title: "Ticket Details — Rekart Pulse" },
      {
        name: "description",
        content: "Client ticket details, status, comments and attachments.",
      },
      { property: "og:title", content: "Ticket Details — Rekart Pulse" },
      {
        property: "og:description",
        content: "Client ticket details, status, comments and attachments.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: async ({ params, context }) => {
    try {
      return await context.queryClient.ensureQueryData({
        queryKey: ["ticket", params.ticketId],
        queryFn: () => getTicketDetail({ data: { id: params.ticketId } }),
      });
    } catch (error) {
      if (error instanceof Error && error.message === "Ticket not found") throw notFound();
      throw error;
    }
  },
  component: TicketPage,
  errorComponent: TicketError,
  notFoundComponent: () => (
    <div className="p-8">
      <h1 className="font-semibold">Ticket not found</h1>
      <Link to="/tickets" className="mt-3 inline-block text-sm text-primary">
        Back to tickets
      </Link>
    </div>
  ),
});

function LinkedText({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s]+|www\.[^\s]+)/g);
  return (
    <p className="mt-3 whitespace-pre-wrap break-words text-sm text-muted-foreground">
      {parts.map((part, i) =>
        /^(https?:\/\/|www\.)/.test(part) ? (
          <a
            key={i}
            href={part.startsWith("http") ? part : `https://${part}`}
            target="_blank"
            rel="noreferrer noopener"
            className="font-medium text-primary underline underline-offset-2"
          >
            {part}
          </a>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </p>
  );
}

function TicketPage() {
  const { ticketId } = Route.useParams();
  const { data } = useSuspenseQuery({
    queryKey: ["ticket", ticketId],
    queryFn: () => getTicketDetail({ data: { id: ticketId } }),
  });
  const { data: managers } = useQuery({
    queryKey: ["account-managers"],
    queryFn: () => getAccountManagers(),
    staleTime: 60_000,
  });
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const t = data.ticket as Ticket;
  const [description, setDescription] = useState(t.description ?? "");

  async function save(fields: Partial<Ticket>) {
    const next = { ...t, ...fields };
    await editTicket({
      data: {
        id: t.id,
        client_id: next.client_id,
        feature_id: next.feature_id ?? null,
        title: next.title,
        description: next.description ?? null,
        ticket_type: next.ticket_type,
        priority: next.priority,
        status: next.status,
        requested_by: next.requested_by ?? null,
        assigned_to: next.assigned_to ?? null,
        assigned_name: next.assigned_name ?? null,
      },
    });
    await queryClient.invalidateQueries();
  }

  async function saveDescription() {
    setSaving(true);
    try {
      await save({ description });
      setEditing(false);
      toast.success("Description updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  async function changeAssignee(id: string) {
    const manager = (managers ?? []).find((m) => m.id === id);
    try {
      await save({ assigned_to: id || null, assigned_name: manager?.name ?? null });
      toast.success(manager ? `Assigned to ${manager.name}` : "Ticket unassigned");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  }

  async function changeStatus(status: TicketStatus) {
    try {
      await setTicketStatus({ data: { id: t.id, status } });
      await queryClient.invalidateQueries();
      toast.success("Ticket status updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  }

  async function add() {
    if (!comment.trim()) return;
    try {
      await createComment({ data: { ticket_id: t.id, content: comment.trim() } });
      setComment("");
      await queryClient.invalidateQueries();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Comment failed");
    }
  }

  return (
    <div className="space-y-5 p-6">
      <Link
        to="/tickets"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Back to tickets
      </Link>

      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{t.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t.client_name} · {t.feature_name ?? "General"} · {formatDateTime(t.created_at)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={t.priority} />
          <select
            className="h-9 rounded-md border bg-background px-3 text-sm"
            value={t.status}
            onChange={(e) => void changeStatus(e.target.value as TicketStatus)}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-lg border bg-card p-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Description</h2>
            {editing ? (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => {
                  setDescription(t.description ?? "");
                  setEditing(false);
                }}>
                  Cancel
                </Button>
                <Button size="sm" disabled={saving} onClick={() => void saveDescription()}>
                  {saving ? "Saving…" : "Save"}
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                Edit
              </Button>
            )}
          </div>
          {editing ? (
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={8}
              className="mt-3 w-full rounded-md border bg-background p-3 text-sm"
              placeholder="Describe the ticket. Links are clickable after saving."
            />
          ) : (
            <LinkedText text={t.description || "No description provided."} />
          )}
        </section>

        <section className="rounded-lg border bg-card p-4">
          <h2 className="text-sm font-semibold">Details</h2>
          <dl className="mt-3 space-y-3 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Type</dt>
              <dd>{t.ticket_type.replace("_", " ")}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Requested by</dt>
              <dd>{t.requested_by ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Assigned to</dt>
              <dd>
                <select
                  className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm"
                  value={t.assigned_to ?? ""}
                  onChange={(e) => void changeAssignee(e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {(managers ?? []).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </dd>
            </div>
          </dl>
        </section>
      </div>

      <section className="rounded-lg border bg-card p-4">
        <h2 className="text-sm font-semibold">Comments</h2>
        <div className="mt-3 space-y-3">
          {data.comments.map((c) => (
            <div key={c.id} className="border-b pb-3 last:border-0">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{c.user_name}</span>
                <span>{formatDateTime(c.created_at)}</span>
              </div>
              <p className="mt-1 text-sm">{c.content}</p>
            </div>
          ))}
          {data.comments.length === 0 && (
            <p className="text-sm text-muted-foreground">No comments yet.</p>
          )}
        </div>
        <div className="mt-4 flex gap-2">
          <input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void add();
            }}
            placeholder="Add a comment"
            className="h-9 flex-1 rounded-md border bg-background px-3 text-sm"
          />
          <Button onClick={() => void add()}>Add</Button>
        </div>
      </section>
    </div>
  );
}
