import { useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getClients, getFeatureStats, logActivity } from "@/lib/pulse.functions";
import type { EventType } from "@/lib/types";

const OPERATORS = ["Office", "System", "Aarti Shah", "Pappu Singh"];

const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: "general", label: "General" },
  { value: "churn", label: "Churn" },
  { value: "payment", label: "Payment" },
  { value: "feature", label: "Feature" },
  { value: "risk", label: "Risk" },
  { value: "issue", label: "Issue" },
];

const NONE = "__none__";

export function ActivityDialog({
  presetClientId,
  trigger,
}: {
  presetClientId?: string;
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [operator, setOperator] = useState("Office");
  const [eventType, setEventType] = useState<EventType>("general");
  const [clientId, setClientId] = useState(presetClientId ?? NONE);
  const [featureId, setFeatureId] = useState(NONE);
  const [description, setDescription] = useState("");
  const queryClient = useQueryClient();

  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: () => getClients({ data: {} }),
    enabled: open,
  });
  const { data: featureData } = useQuery({
    queryKey: ["features"],
    queryFn: () => getFeatureStats(),
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: () =>
      logActivity({
        data: {
          client_id: clientId === NONE ? null : clientId,
          feature_id: featureId === NONE ? null : featureId,
          operator,
          event_type: eventType,
          description: description.trim(),
        },
      }),
    onSuccess: () => {
      toast.success("Activity logged");
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
          setOperator("Office");
          setEventType("general");
          setClientId(presetClientId ?? NONE);
          setFeatureId(NONE);
          setDescription("");
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log activity</DialogTitle>
          <DialogDescription>
            Add an entry to the activity log — it feeds the dashboard output.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate();
          }}
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Operator</Label>
              <Select value={operator} onValueChange={setOperator}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPERATORS.map((op) => (
                    <SelectItem key={op} value={op}>
                      {op}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={eventType} onValueChange={(v) => setEventType(v as EventType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Client</Label>
              <Select value={clientId} onValueChange={setClientId} disabled={!!presetClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {(clients ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Feature</Label>
              <Select value={featureId} onValueChange={setFeatureId}>
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {(featureData?.features ?? []).map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="activity-description">Description</Label>
            <Textarea
              id="activity-description"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder='Subscription stop scheduled from "22 Jul 2026" | Reason : cancelled'
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Log entry"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
