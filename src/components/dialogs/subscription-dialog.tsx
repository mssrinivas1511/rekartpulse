import { useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createSubscription, getClients, setSubscriptionStatus } from "@/lib/pulse.functions";
import type { Subscription, SubscriptionStatus } from "@/lib/types";

const PLANS = ["Starter", "Growth", "Scale"];

export function NewSubscriptionDialog({
  clientId,
  trigger,
}: {
  clientId?: string;
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(clientId ?? "");
  const [plan, setPlan] = useState("Growth");
  const [amount, setAmount] = useState("");
  const [startedAt, setStartedAt] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const queryClient = useQueryClient();

  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: () => getClients({ data: {} }),
    enabled: open && !clientId,
  });

  const mutation = useMutation({
    mutationFn: () =>
      createSubscription({
        data: {
          client_id: clientId ?? selectedClient,
          plan,
          monthly_amount: parseFloat(amount) || 0,
          started_at: startedAt,
        },
      }),
    onSuccess: () => {
      toast.success("Subscription recorded");
      queryClient.invalidateQueries();
      setOpen(false);
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setSelectedClient(clientId ?? "");
          setPlan("Growth");
          setAmount("");
          setStartedAt(format(new Date(), "yyyy-MM-dd"));
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record subscription</DialogTitle>
          <DialogDescription>Add a new Rekart subscription for a client.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate();
          }}
        >
          {!clientId && (
            <div className="space-y-1.5">
              <Label>Client</Label>
              <Select value={selectedClient} onValueChange={setSelectedClient} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {(clients ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Plan</Label>
              <Select value={plan} onValueChange={setPlan}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLANS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sub-amount">Monthly amount (₹)</Label>
              <Input
                id="sub-amount"
                type="number"
                min={0}
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="24100"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sub-start">Start date</Label>
            <Input
              id="sub-start"
              type="date"
              required
              value={startedAt}
              onChange={(e) => setStartedAt(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              type="submit"
              disabled={mutation.isPending || (!clientId && !selectedClient)}
            >
              {mutation.isPending ? "Saving…" : "Record subscription"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const NEXT_STATUSES: { value: SubscriptionStatus; label: string }[] = [
  { value: "active", label: "Active (Resume)" },
  { value: "paused", label: "Paused" },
  { value: "stopped", label: "Stopped" },
  { value: "completed", label: "Completed" },
  { value: "ended", label: "Ended" },
];

export function SubscriptionStatusDialog({
  subscription,
  trigger,
}: {
  subscription: Subscription;
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<SubscriptionStatus>(subscription.status);
  const [reason, setReason] = useState(subscription.end_reason ?? "");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      setSubscriptionStatus({
        data: { id: subscription.id, status, end_reason: reason.trim() || null },
      }),
    onSuccess: () => {
      toast.success("Subscription updated");
      queryClient.invalidateQueries();
      setOpen(false);
    },
    onError: (error) => toast.error(error.message),
  });

  const needsReason = status !== "active";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setStatus(subscription.status);
          setReason(subscription.end_reason ?? "");
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change subscription status</DialogTitle>
          <DialogDescription>
            {subscription.client_name ?? "Client"} — {subscription.plan} plan. Stopped, completed
            and ended subscriptions count towards churn.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label>New status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as SubscriptionStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NEXT_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {needsReason && (
            <div className="space-y-1.5">
              <Label htmlFor="sub-reason">Reason</Label>
              <Textarea
                id="sub-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="cancelled"
                rows={2}
              />
            </div>
          )}
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Update status"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
