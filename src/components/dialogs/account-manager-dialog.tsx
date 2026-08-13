import { useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Field, inputCls } from "@/components/dialogs/fields";
import { createAccountManager, editAccountManager } from "@/lib/pulse.functions";
import type { AccountManager } from "@/lib/types";

export function AccountManagerDialog({
  trigger,
  manager,
}: {
  trigger: ReactNode;
  manager?: AccountManager;
}) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const [name, setName] = useState(manager?.name ?? "");
  const [email, setEmail] = useState(manager?.email ?? "");
  const [phone, setPhone] = useState(manager?.phone ?? "");
  const [satisfaction, setSatisfaction] = useState(String(manager?.satisfaction ?? 4));
  const [notes, setNotes] = useState(manager?.notes ?? "");

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: name.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        satisfaction: Number(satisfaction) || 0,
        notes: notes.trim() || null,
      };
      if (manager) await editAccountManager({ data: { ...payload, id: manager.id } });
      else await createAccountManager({ data: payload });
    },
    onSuccess: async () => {
      toast.success(manager ? "Account manager updated" : "Account manager added");
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["account-managers"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function submit() {
    if (!name.trim()) {
      toast.error("Please enter a name");
      return;
    }
    mutation.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{manager ? "Edit account manager" : "Add account manager"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <Field label="Name">
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Email">
            <input className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Phone">
            <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <Field label="Client satisfaction (0-5)">
            <input
              type="number"
              min={0}
              max={5}
              step={0.1}
              className={inputCls}
              value={satisfaction}
              onChange={(e) => setSatisfaction(e.target.value)}
            />
          </Field>
          <Field label="Notes">
            <textarea
              className={`${inputCls} h-20 py-2`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={mutation.isPending}>
            {mutation.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
