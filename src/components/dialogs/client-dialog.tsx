import { useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient, editClient } from "@/lib/pulse.functions";
import type { Client, ClientStatus } from "@/lib/types";

const PLANS = ["Starter", "Growth", "Scale"];

type FormState = {
  name: string;
  owner_name: string;
  phone: string;
  city: string;
  plan: string;
  status: ClientStatus;
  customers_count: string;
  monthly_revenue: string;
  health_score: string;
};

function initialForm(client?: Client): FormState {
  return {
    name: client?.name ?? "",
    owner_name: client?.owner_name ?? "",
    phone: client?.phone ?? "",
    city: client?.city ?? "",
    plan: client?.plan ?? "Growth",
    status: client?.status ?? "active",
    customers_count: String(client?.customers_count ?? 0),
    monthly_revenue: String(client?.monthly_revenue ?? 0),
    health_score: String(client?.health_score ?? 50),
  };
}

export function ClientDialog({ client, trigger }: { client?: Client; trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(() => initialForm(client));
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        owner_name: form.owner_name.trim() || null,
        phone: form.phone.trim() || null,
        city: form.city.trim() || null,
        plan: form.plan,
        status: form.status,
        customers_count: parseInt(form.customers_count, 10) || 0,
        monthly_revenue: parseFloat(form.monthly_revenue) || 0,
        health_score: Math.min(100, Math.max(0, parseInt(form.health_score, 10) || 0)),
      };
      if (client) {
        await editClient({ data: { id: client.id, ...payload } });
      } else {
        await createClient({ data: payload });
      }
    },
    onSuccess: () => {
      toast.success(client ? "Client updated" : "Client added");
      queryClient.invalidateQueries();
      setOpen(false);
    },
    onError: (error) => toast.error(error.message),
  });

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setForm(initialForm(client));
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{client ? `Edit ${client.name}` : "New Client"}</DialogTitle>
          <DialogDescription>
            {client
              ? "Update the client's account details."
              : "Onboard a new dairy business to Rekart."}
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate();
          }}
        >
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="client-name">Business name</Label>
            <Input
              id="client-name"
              required
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Gokul Fresh Dairy"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="client-owner">Owner</Label>
            <Input
              id="client-owner"
              value={form.owner_name}
              onChange={(e) => set("owner_name", e.target.value)}
              placeholder="Rajesh Gokul"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="client-phone">Phone</Label>
            <Input
              id="client-phone"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="+91 98200 11223"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="client-city">City</Label>
            <Input
              id="client-city"
              value={form.city}
              onChange={(e) => set("city", e.target.value)}
              placeholder="Mumbai"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Plan</Label>
            <Select value={form.plan} onValueChange={(v) => set("plan", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLANS.map((plan) => (
                  <SelectItem key={plan} value={plan}>
                    {plan}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v as ClientStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="at_risk">At Risk</SelectItem>
                <SelectItem value="churned">Churned</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="client-customers">Customers</Label>
            <Input
              id="client-customers"
              type="number"
              min={0}
              value={form.customers_count}
              onChange={(e) => set("customers_count", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="client-mrr">Monthly revenue (₹)</Label>
            <Input
              id="client-mrr"
              type="number"
              min={0}
              value={form.monthly_revenue}
              onChange={(e) => set("monthly_revenue", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="client-health">Health score (0–100)</Label>
            <Input
              id="client-health"
              type="number"
              min={0}
              max={100}
              value={form.health_score}
              onChange={(e) => set("health_score", e.target.value)}
            />
          </div>
          <DialogFooter className="sm:col-span-2">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : client ? "Save changes" : "Add client"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
