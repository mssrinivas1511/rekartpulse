import { useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { supabase } from "@/integrations/supabase/client";
import { createClient, editClient, getAccountManagers } from "@/lib/pulse.functions";
import { COUNTRIES, CURRENCIES } from "@/lib/geo";
import type { Client, ClientStatus } from "@/lib/types";
import { Field, inputCls, selectCls } from "./fields";

const PLANS = ["Starter", "Growth", "Scale"];

const CLIENT_STATUSES: { value: ClientStatus; label: string }[] = [
  { value: "trial", label: "Trial" },
  { value: "active", label: "Active" },
  { value: "paid", label: "Paid" },
  { value: "churned", label: "Churned" },
];

export function ClientDialog({ client, trigger }: { client?: Client; trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const queryClient = useQueryClient();

  const [name, setName] = useState(client?.name ?? "");
  const [ownerName, setOwnerName] = useState(client?.owner_name ?? "");
  const [phone, setPhone] = useState(client?.phone ?? "");
  const [city, setCity] = useState(client?.city ?? "");
  const [country, setCountry] = useState(client?.country ?? "India");
  const [currency, setCurrency] = useState(client?.currency ?? "INR");
  const [industry, setIndustry] = useState(client?.industry ?? "");
  const [plan, setPlan] = useState(client?.plan ?? "Growth");
  const [status, setStatus] = useState<ClientStatus>(client?.status ?? "trial");
  const [customersCount, setCustomersCount] = useState(String(client?.customers_count ?? 0));
  const [healthScore, setHealthScore] = useState(String(client?.health_score ?? 50));
  const [accountManagerId, setAccountManagerId] = useState(client?.account_manager_id ?? "");
  const [clientSince, setClientSince] = useState(client?.client_since ?? "");
  const [notes, setNotes] = useState(client?.notes ?? "");
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const { data: managers } = useQuery({
    queryKey: ["account-managers"],
    queryFn: () => getAccountManagers(),
    enabled: open,
    staleTime: 60_000,
  });

  function pickCountry(next: string) {
    setCountry(next);
    const info = COUNTRIES.find((c) => c.country === next);
    if (info) setCurrency(info.currency);
  }

  async function submit() {
    if (!name.trim()) {
      toast.error("Client name is required");
      return;
    }
    setBusy(true);
    try {
      let logoPath: string | null | undefined = undefined;
      if (logoFile) {
        const path = `${crypto.randomUUID()}-${logoFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { error: uploadError } = await supabase.storage
          .from("client-logos")
          .upload(path, logoFile);
        if (uploadError) throw new Error(uploadError.message);
        logoPath = path;
      }
      const payload = {
        name: name.trim(),
        owner_name: ownerName.trim() || null,
        phone: phone.trim() || null,
        city: city.trim() || null,
        country: country || null,
        currency,
        industry: industry.trim() || null,
        plan,
        status,
        customers_count: parseInt(customersCount, 10) || 0,
        health_score: Math.min(100, Math.max(0, parseInt(healthScore, 10) || 0)),
        account_manager_id: accountManagerId || null,
        client_since: clientSince || undefined,
        notes: notes.trim() || null,
        ...(logoPath !== undefined ? { logo_url: logoPath } : {}),
      };
      if (client) {
        await editClient({ data: { id: client.id, ...payload } });
        toast.success("Client updated");
      } else {
        await createClient({ data: payload });
        toast.success("Client created");
      }
      await queryClient.invalidateQueries();
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{client ? `Edit ${client.name}` : "New Client"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Business Name *">
              <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Owner Name">
              <input
                className={inputCls}
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Phone">
              <input
                className={inputCls}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </Field>
            <Field label="City">
              <input className={inputCls} value={city} onChange={(e) => setCity(e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Country">
              <select
                className={selectCls}
                value={country}
                onChange={(e) => pickCountry(e.target.value)}
              >
                {COUNTRIES.map((c) => (
                  <option key={c.country} value={c.country}>
                    {c.country}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Currency">
              <select
                className={selectCls}
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Plan">
              <select className={selectCls} value={plan} onChange={(e) => setPlan(e.target.value)}>
                {PLANS.map((p) => (
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
                onChange={(e) => setStatus(e.target.value as ClientStatus)}
              >
                {CLIENT_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Client Since">
              <input
                type="date"
                className={inputCls}
                value={clientSince}
                onChange={(e) => setClientSince(e.target.value)}
              />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Customers">
              <input
                type="number"
                min={0}
                className={inputCls}
                value={customersCount}
                onChange={(e) => setCustomersCount(e.target.value)}
              />
            </Field>
            <Field label="Health Score (0–100)">
              <input
                type="number"
                min={0}
                max={100}
                className={inputCls}
                value={healthScore}
                onChange={(e) => setHealthScore(e.target.value)}
              />
            </Field>
            <Field label="Industry">
              <input
                className={inputCls}
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="Dairy"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Account Manager">
              <select
                className={selectCls}
                value={accountManagerId}
                onChange={(e) => setAccountManagerId(e.target.value)}
              >
                <option value="">— None —</option>
                {(managers ?? []).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Logo">
              <input
                type="file"
                accept="image/*"
                className="h-9 w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs text-foreground file:mr-2 file:rounded file:border-0 file:bg-accent file:px-2 file:py-0.5 file:text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
              />
            </Field>
          </div>
          <Field label="Notes">
            <textarea
              className="min-h-16 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={busy}>
            {busy && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
            {client ? "Save Changes" : "Create Client"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
