import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Camera, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Field, inputCls, selectCls } from "@/components/dialogs/fields";
import { ActivityFeed } from "@/components/activity-drawer";
import { getMyProfile, setMyAvatar, updateMyProfile } from "@/lib/auth.functions";
import { uploadAvatar } from "@/lib/avatar";
import { COUNTRIES } from "@/lib/geo";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "My Profile — Rekart Pulse" },
      { name: "description", content: "Update your Rekart Pulse profile details and photo." },
      { property: "og:title", content: "My Profile — Rekart Pulse" },
      { property: "og:description", content: "Update your Rekart Pulse profile details and photo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const { data: profile } = useQuery({ queryKey: ["my-profile"], queryFn: () => getMyProfile() });

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("India");
  const [countryCode, setCountryCode] = useState("+91");
  const [currency, setCurrency] = useState("INR");

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name ?? "");
    setPhone(profile.phone ?? "");
    setCountry(profile.country);
    setCountryCode(profile.country_code);
    setCurrency(profile.currency);
  }, [profile]);

  const save = useMutation({
    mutationFn: () =>
      updateMyProfile({
        data: {
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          country,
          country_code: countryCode,
          currency,
        },
      }),
    onSuccess: async () => {
      toast.success("Profile saved");
      await queryClient.invalidateQueries({ queryKey: ["my-profile"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const avatar = useMutation({
    mutationFn: async (file: File | null) => {
      const path = file ? await uploadAvatar(file) : null;
      await setMyAvatar({ data: { avatar_url: path } });
    },
    onSuccess: async () => {
      toast.success("Photo updated");
      await queryClient.invalidateQueries({ queryKey: ["my-profile"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function onCountry(value: string) {
    setCountry(value);
    const match = COUNTRIES.find((c) => c.name === value);
    if (match) {
      setCountryCode(match.dial);
      setCurrency(match.currency);
    }
  }

  return (
    <div className="space-y-5 pb-8">
      <PageHeader title="My Profile" description="Your personal details and photo" />
      <div className="mx-6 grid gap-4 lg:grid-cols-3">
        <section className="rounded-lg border border-border bg-card p-5 lg:col-span-2">
          <div className="flex items-center gap-4">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) avatar.mutate(file);
                e.target.value = "";
              }}
            />
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="My profile"
                className="size-16 rounded-full object-cover"
              />
            ) : (
              <span className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
                {(profile?.full_name ?? "T").charAt(0).toUpperCase()}
              </span>
            )}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
                <Camera className="mr-1.5 size-3.5" />
                {profile?.avatar_url ? "Change photo" : "Add photo"}
              </Button>
              {profile?.avatar_url && (
                <Button size="sm" variant="outline" onClick={() => avatar.mutate(null)}>
                  <Trash2 className="mr-1.5 size-3.5" /> Remove
                </Button>
              )}
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Field label="Full name">
              <input
                className={inputCls}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </Field>
            <Field label="Phone">
              <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} />
            </Field>
            <Field label="Country">
              <select
                className={selectCls}
                value={country}
                onChange={(e) => onCountry(e.target.value)}
              >
                {COUNTRIES.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Currency">
              <input
                className={inputCls}
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              />
            </Field>
          </div>

          <div className="mt-4 flex justify-end">
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground">Recent activity</h2>
          <div className="mt-3">
            <ActivityFeed limit={12} />
          </div>
        </section>
      </div>
    </div>
  );
}
