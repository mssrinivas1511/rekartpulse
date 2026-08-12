import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { getAccountManagers } from "@/lib/pulse.functions";

function ManagersError({ error }: { error: Error }) { return <div className="p-8 text-sm text-destructive">{error.message}</div>; }
export const Route = createFileRoute("/_authenticated/account-managers")({
  head: () => ({ meta: [
    { title: "Account Managers — Rekart Pulse" }, { name: "description", content: "Account manager ownership and client success performance." },
    { property: "og:title", content: "Account Managers — Rekart Pulse" }, { property: "og:description", content: "Account manager ownership and client success performance." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  loader: ({ context }) => context.queryClient.ensureQueryData({ queryKey: ["account-managers"], queryFn: () => getAccountManagers() }),
  component: ManagersPage, errorComponent: ManagersError, notFoundComponent: () => <div className="p-8">Account managers page not found.</div>,
});
function ManagersPage() {
  const { data } = useSuspenseQuery({ queryKey: ["account-managers"], queryFn: () => getAccountManagers() });
  return <div className="space-y-4"><PageHeader title="Account Managers" description={`${data.length} team members responsible for client success`} /><div className="mx-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{data.map((m) => <article key={m.id} className="rounded-lg border bg-card p-4"><div className="flex items-center gap-3">{m.avatar_url ? <img src={m.avatar_url} alt={`${m.name} profile`} className="size-10 rounded-full object-cover" /> : <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">{m.name.charAt(0)}</span>}<div><h2 className="font-semibold">{m.name}</h2><p className="text-xs text-muted-foreground">{m.email ?? m.phone ?? "Contact not set"}</p></div></div><div className="mt-4 grid grid-cols-2 gap-3 border-t pt-3 text-sm"><div><p className="text-xs text-muted-foreground">Active clients</p><p className="font-semibold">{m.active_clients}/{m.total_clients}</p></div><div><p className="text-xs text-muted-foreground">Features adopted</p><p className="font-semibold">{m.features_adopted}</p></div><div><p className="text-xs text-muted-foreground">Churned</p><p className="font-semibold">{m.churned_clients}</p></div><div><p className="text-xs text-muted-foreground">Satisfaction</p><p className="font-semibold">{m.satisfaction}/5</p></div></div></article>)}{data.length === 0 && <p className="text-sm text-muted-foreground">No account managers yet.</p>}</div></div>;
}