import { useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
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
import {
  createSubscription,
  editSubscription,
  getClients,
  setSubscriptionStatus,
} from "@/lib/pulse.functions";
import type { Subscription, SubscriptionStatus } from "@/lib/types";
import { Field, inputCls, selectCls } from "./fields";

const PLANS = ["Starter", "Growth", "Scale"];
export const SUBSCRIPTION_PRODUCTS = [
  "Rekart Core",
  "Customer App",
  "Delivery App",
  "WhatsApp Suite",
  "Custom",
];

function SubscriptionForm({
  clientId,
  subscription,
  onDone,
}: {
  clientId?: string | undefined;
  subscription?: Subscription;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const queryClient = useQueryClient();

  const [selectedClient, setSelectedClient] = useState(subscription?.client_id ?? clientId ?? "");
  const [product, setProduct] = useState(subscription?.product ?? "Rekart Core");
  const [plan, setPlan] = useState(subscription?.plan ?? "Growth");
  const [customers, setCustomers] = useState(String(subscription?.customers_count ?? 0));
  const [amount, setAmount] = useState(String(subscription?.monthly_amount ?? ""));
  const [startedAt, setStartedAt] = useState(
    subscription?.started_at ?? format(new Date(), "yyyy-MM-dd"),
  );

  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: () => getClients({ data: {} }),
    enabled: !clientId && !subscription,
  });

  async function submit() {
    if (!selectedClient) {
      toast.error("Select a client");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        client_id: selectedClient,
        product,
        plan,
        customers_count: parseInt(customers, 10) || 0,
        monthly_amount: parseFloat(amount) || 0,
        started_at: startedAt,
      };
      if (subscription) {
        await editSubscription({ data: { id: subscription.id, ...payload } });
        toast.success("Subscription updated");
      } else {
        await createSubscription({ data: payload });
        toast.success("Subscription recorded");
      }
      await queryClient.invalidateQueries();
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4 py-2">
      {!clientId && !subscription && (
        <Field label="Client *">
          <select
            className={selectCls}
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
          >
            <option value="">Select client</option>
            {(clients ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
      )}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Product">
          <select className={selectCls} value={product} onChange={(e) => setProduct(e.target.value)}>
            {SUBSCRIPTION_PRODUCTS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Plan">
          <select className={selectCls} value={plan} onChange={(e) => setPlan(e.target.value)}>
            {PLANS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Field label="Customers">
          <input
            type="number"
            min={0}
            className={inputCls}
            value={customers}
            onChange={(e) => setCustomers(e.target.value)}
          />
        </Field>
        <Field label="Monthly Amount">
          <input
            type="number"
            min={0}
            className={inputCls}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="24000"
          />
        </Field>
        <Field label="Start Date">
          <input
            type="date"
            className={inputCls}
            value={startedAt}
            onChange={(e) => setStartedAt(e.target.value)}
          />
        </Field>
      </div>
      <DialogFooter>
        <Button onClick={() => void submit()} disabled={busy}>
          {busy && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
          {subscription ? "Save Changes" : "Record Subscription"}
        </Button>
      </DialogFooter>
    </div>
  );
}

export function NewSubscriptionDialog({
  clientId,
  trigger,
}: {
  clientId?: string;
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Record Subscription</DialogTitle>
        </DialogHeader>
        <SubscriptionForm clientId={clientId} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

export function EditSubscriptionDialog({
  subscription,
  trigger,
}: {
  subscription: Subscription;
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Subscription</DialogTitle>
        </DialogHeader>
        <SubscriptionForm subscription={subscription} onDone={() => setOpen(false)} />
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
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<SubscriptionStatus>(subscription.status);
  const [reason, setReason] = useState(subscription.end_reason ?? "");
  const queryClient = useQueryClient();

  const needsReason = status !== "active";

  async function submit() {
    setBusy(true);
    try {
      await setSubscriptionStatus({
        data: { id: subscription.id, status, end_reason: reason.trim() || null },
      });
      toast.success("Subscription updated");
      await queryClient.invalidateQueries();
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

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
          <DialogTitle>Change Subscription Status</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          {subscription.client_name ?? "Client"} — {subscription.product} {subscription.plan}.
          Stopped, completed and ended subscriptions count towards churn.
        </p>
        <div className="grid gap-4 py-2">
          <Field label="New Status">
            <select
              className={selectCls}
              value={status}
              onChange={(e) => setStatus(e.target.value as SubscriptionStatus)}
            >
              {NEXT_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
          {needsReason && (
            <Field label="Reason">
              <textarea
                className="min-h-16 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Payment issues, low usage…"
              />
            </Field>
          )}
        </div>
        <DialogFooter>
          <Button onClick={() => void submit()} disabled={busy}>
            {busy && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
            Update Status
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
