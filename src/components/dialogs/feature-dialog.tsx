import { useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
import { createFeature, editFeature } from "@/lib/pulse.functions";
import type { Feature, FeatureStatus } from "@/lib/types";
import { Field, inputCls, selectCls } from "./fields";

export const FEATURE_CATEGORIES = [
  "CRM",
  "WhatsApp",
  "Operations",
  "Customer App",
  "Delivery",
  "Payments",
  "Notifications",
  "Analytics",
  "Integrations",
  "Other",
];

export const FEATURE_STATUSES: { value: FeatureStatus; label: string }[] = [
  { value: "planned", label: "Planned" },
  { value: "in_development", label: "In Development" },
  { value: "live", label: "Live" },
  { value: "deprecated", label: "Deprecated" },
];

export function FeatureDialog({ feature, trigger }: { feature?: Feature; trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const queryClient = useQueryClient();

  const [name, setName] = useState(feature?.name ?? "");
  const [category, setCategory] = useState(feature?.category ?? "Other");
  const [status, setStatus] = useState<FeatureStatus>(feature?.status ?? "planned");
  const [description, setDescription] = useState(feature?.description ?? "");
  const [releaseVersion, setReleaseVersion] = useState(feature?.release_version ?? "");
  const [releaseDate, setReleaseDate] = useState(feature?.release_date ?? "");

  async function submit() {
    if (!name.trim()) {
      toast.error("Feature name is required");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        name: name.trim(),
        category,
        status,
        description: description.trim() || null,
        release_version: releaseVersion.trim() || null,
        release_date: releaseDate || null,
      };
      if (feature) {
        await editFeature({ data: { id: feature.id, ...payload } });
        toast.success("Feature updated");
      } else {
        await createFeature({ data: payload });
        toast.success("Feature created");
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{feature ? "Edit Feature" : "New Feature"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <Field label="Feature Name *">
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Category">
              <select className={selectCls} value={category} onChange={(e) => setCategory(e.target.value)}>
                {FEATURE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select
                className={selectCls}
                value={status}
                onChange={(e) => setStatus(e.target.value as FeatureStatus)}
              >
                {FEATURE_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Description">
            <textarea
              className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Release Version">
              <input
                className={inputCls}
                value={releaseVersion}
                onChange={(e) => setReleaseVersion(e.target.value)}
                placeholder="v2.4.0"
              />
            </Field>
            <Field label="Release Date">
              <input
                type="date"
                className={inputCls}
                value={releaseDate}
                onChange={(e) => setReleaseDate(e.target.value)}
              />
            </Field>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={busy}>
            {busy && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
            {feature ? "Save Changes" : "Create Feature"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
