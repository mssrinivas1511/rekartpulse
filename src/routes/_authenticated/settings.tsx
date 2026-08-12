import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { usePermissions } from "@/hooks/use-permissions";
import { getMyProfile, getTeamData } from "@/lib/auth.functions";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [
    { title: "Settings — Rekart Pulse" }, { name: "description", content: "Profile, team roles and Rekart Pulse permissions." },
    { property: "og:title", content: "Settings — Rekart Pulse" }, { property: "og:description", content: "Profile, team roles and Rekart Pulse permissions." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: SettingsPage,
});
function SettingsPage() {
  const { isAdmin } = usePermissions();
  const { data: profile } = useQuery({ queryKey: ["my-profile"], queryFn: () => getMyProfile() });
  const { data: team, isLoading } = useQuery({ queryKey: ["team-data"], queryFn: () => getTeamData(), enabled: isAdmin });
  return <div className="space-y-5"><PageHeader title="Settings" description="Profile, team access and permissions" /><div className="mx-6 grid gap-4 lg:grid-cols-3"><section className="rounded-lg border bg-card p-4"><h2 className="text-sm font-semibold">My profile</h2><dl className="mt-4 space-y-3 text-sm"><div><dt className="text-xs text-muted-foreground">Name</dt><dd>{profile?.full_name ?? "Not set"}</dd></div><div><dt className="text-xs text-muted-foreground">Phone</dt><dd>{profile?.phone ?? "Not set"}</dd></div><div><dt className="text-xs text-muted-foreground">Country</dt><dd>{profile?.country ?? "Not set"}</dd></div><div><dt className="text-xs text-muted-foreground">Currency</dt><dd>{profile?.currency ?? "Not set"}</dd></div></dl></section><section className="rounded-lg border bg-card p-4 lg:col-span-2"><h2 className="text-sm font-semibold">Team & roles</h2>{!isAdmin ? <p className="mt-3 text-sm text-muted-foreground">Only administrators can view and manage team permissions.</p> : isLoading ? <p className="mt-3 text-sm text-muted-foreground">Loading team…</p> : <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-xs text-muted-foreground"><th className="py-2">Member</th><th className="py-2">Country</th><th className="py-2">Roles</th></tr></thead><tbody>{team?.members.map((m) => <tr key={m.id} className="border-b last:border-0"><td className="py-2"><p className="font-medium">{m.full_name ?? "Team member"}</p><p className="text-xs text-muted-foreground">{m.email}</p></td><td className="py-2 text-muted-foreground">{m.country}</td><td className="py-2"><div className="flex flex-wrap gap-1">{m.role_names.map((role) => <StatusBadge key={role} status={role} />)}</div></td></tr>)}</tbody></table></div>}</section></div></div>;
}