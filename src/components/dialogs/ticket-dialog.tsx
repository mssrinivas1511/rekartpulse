import { useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, inputCls, selectCls } from "@/components/dialogs/fields";
import {
  createTicketFn,
  editTicket,
  getAccountManagers,
  getClients,
  getFeatureStats,
} from "@/lib/pulse.functions";
import type { Priority, Ticket, TicketStatus, TicketType } from "@/lib/types";

const TYPES: TicketType[] = ["bug", "feature_request", "improvement", "clarification", "support"];
const PRIORITIES: Priority[] = ["low", "medium", "high", "critical"];
const STATUSES: TicketStatus[] = ["open", "in_progress", "need_info", "resolved", "rejected"];

export function TicketDialog({
  trigger,
  ticket,
  defaultClientId,
}: {
  trigger: ReactNode;
  ticket?: Ticket;
  defaultClientId?: string;
}) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const [clientId, setClientId] = useState(ticket?.client_id ?? defaultClientId ?? "");
  const [featureId, setFeatureId] = useState(ticket?.feature_id ?? "");
  const [title, setTitle] = useState(ticket?.title ?? "");
  const [description, setDescription] = useState(ticket?.description ?? "");
  const [type, setType] = useState<TicketType>(ticket?.ticket_type ?? "support");
  const [priority, setPriority] = useState<Priority>(ticket?.priority ?? "medium");
  const [status, setStatus] = useState<TicketStatus>(ticket?.status ?? "open");
  const [requestedBy, setRequestedBy] = useState(ticket?.requested_by ?? "");
  const [assignedName, setAssignedName] = useState(ticket?.assigned_name ?? "");

  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: () => getClients({ data: {} }),
    staleTime: 60_000,
    enabled: open,
  });
  const { data: features } = useQuery({
    queryKey: ["feature-stats"],
    queryFn: () => getFeatureStats(),
    staleTime: 60_000,
    enabled: open,
  });
  const { data: managers } = useQuery({
    queryKey: ["account-managers"],
    queryFn: () => getAccountManagers(),
    staleTime: 60_000,
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        client_id: clientId,
        feature_id: featureId || null,
        title: title.trim(),
        description: description.trim() || null,
        ticket_type: type,
        priority,
        status,
        requested_by: requestedBy.trim() || null,
        assigned_name: assignedName.trim() || null,
      };
      if (ticket) await editTicket({ data: { ...payload, id: ticket.id } });
      else await createTicketFn({ data: payload });
    },
    onSuccess: async () => {
      toast.success(ticket ? "Ticket updated" : "Ticket created");
      setOpen(false);
      await queryClient.invalidateQueries();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function submit() {
    if (!clientId) {
      toast.error("Please pick a client");
      return;
    }
    if (!title.trim()) {
      toast.error("Please add a ticket title");
      return;
    }
    mutation.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{ticket ? "Edit ticket" : "New ticket"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Client">
            <select
              className={selectCls}
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            >
              <option value="">Select client…</option>
              {(clients ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Feature (optional)">
            <select
              className={selectCls}
              value={featureId}
              onChange={(e) => setFeatureId(e.target.value)}
            >
              <option value="">None</option>
              {(features ?? []).map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Title">
              <input
                className={inputCls}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Short summary of the request"
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Description">
              <textarea
                className={`${inputCls} h-24 py-2`}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What did the client report?"
              />
            </Field>
          </div>
          <Field label="Type">
            <select
              className={selectCls}
              value={type}
              onChange={(e) => setType(e.target.value as TicketType)}
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace("_", " ")}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Priority">
            <select
              className={selectCls}
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select
              className={selectCls}
              value={status}
              onChange={(e) => setStatus(e.target.value as TicketStatus)}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace("_", " ")}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Assign to account manager">
            <select
              className={selectCls}
              value={assignedName}
              onChange={(e) => setAssignedName(e.target.value)}
            >
              <option value="">Unassigned</option>
              {(managers ?? []).map((m) => (
                <option key={m.id} value={m.name}>
                  {m.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Requested by">
              <input
                className={inputCls}
                value={requestedBy}
                onChange={(e) => setRequestedBy(e.target.value)}
                placeholder="Client contact name"
              />
            </Field>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={mutation.isPending}>
            {mutation.isPending ? "Saving…" : ticket ? "Save changes" : "Create ticket"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
