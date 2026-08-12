import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { FeatureDialog } from "@/components/dialogs/feature-dialog";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/use-permissions";
import { getFeatureDetail, removeFeature } from "@/lib/pulse.functions";

function FeatureError({ error }: { error: Error }) {
  return <div className="p-8 text-sm text-destructive">{error.message}</div>;
}

export const Route = createFileRoute("/_authenticated/feature/$featureId")({
  head: () => ({ meta: [
    { title: "Feature Details — Rekart Pulse" },
    { name: "description", content: "Feature adoption, client usage, feedback and product notes." },
    { property: "og:title", content: "Feature Details — Rekart Pulse" },
    { property: "og:description", content: "Feature adoption, client usage, feedback and product notes." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  loader: async ({ params, context }) => {
    try {
      return await context.queryClient.ensureQueryData({
        queryKey: ["feature", params.featureId],
        queryFn: () => getFeatureDetail({ data: { id: params.featureId } }),
      });
    } catch (error) {
      if (error instanceof Error && error.message === "Feature not found") throw notFound();
      throw error;
    }
  },
  component: FeatureDetailPage,
  errorComponent: FeatureError,
  notFoundComponent: () => <div className="p-8"><h1 className="font-semibold">Feature not found</h1><Link to="/features" className="mt-3 inline-block text-sm text-primary">Back to features</Link></div>,
});

function FeatureDetailPage() {
  const { featureId } = Route.useParams();
  const { data } = useSuspenseQuery({ queryKey: ["feature", featureId], queryFn: () => getFeatureDetail({ data: { id: featureId } }) });
  const { can } = usePermissions();
  const queryClient = useQueryClient();
  const f = data.feature;

  async function remove() {
    try {
      await removeFeature({ data: { id: f.id } });
      toast.success("Feature deleted");
      window.location.assign("/features");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not delete feature"); }
  }

  return <div className="space-y-5 p-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><div className="flex items-center gap-2"><h1 className="text-xl font-bold">{f.name}</h1><StatusBadge status={f.status} /></div><p className="mt-1 text-sm text-muted-foreground">{f.category} · {f.release_version ?? "No release version"}</p></div>
      <div className="flex gap-2">
        {can("features", "edit") && <FeatureDialog feature={f} trigger={<Button variant="outline" size="sm"><Pencil className="size-3.5" /> Edit</Button>} />}
        {can("features", "delete") && <ConfirmDialog title="Delete feature?" description="This removes the feature and its related records." onConfirm={remove} trigger={<Button variant="outline" size="sm"><Trash2 className="size-3.5" /> Delete</Button>} />}
      </div>
    </div>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {[ ["Adoption", `${f.adoption_rate}%`], ["Clients using", `${f.clients_using}/${f.clients_enabled}`], ["Customers reached", f.customers_reached.toLocaleString("en-IN")], ["Feedback", f.feedback_count] ].map(([label,value]) => <div key={label} className="rounded-lg border bg-card p-4"><p className="text-[11px] font-semibold uppercase text-muted-foreground">{label}</p><p className="mt-1 text-xl font-bold">{value}</p></div>)}
    </div>
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-lg border bg-card p-4"><h2 className="mb-3 text-sm font-semibold">Client adoption</h2><div className="space-y-2">{data.client_features.map((cf) => <div key={cf.id} className="flex items-center justify-between border-b py-2 text-sm last:border-0"><span>{cf.client_name}</span><span className="text-muted-foreground">{cf.enabled ? `${cf.adoption_percent}%` : "Not enabled"}</span></div>)}{data.client_features.length === 0 && <p className="text-sm text-muted-foreground">No client adoption recorded.</p>}</div></section>
      <section className="rounded-lg border bg-card p-4"><h2 className="mb-3 text-sm font-semibold">Feedback</h2><div className="space-y-3">{data.feedback.map((item) => <div key={item.id} className="border-b pb-3 last:border-0"><div className="flex justify-between gap-2"><p className="text-sm">{item.feedback}</p><StatusBadge status={item.status} /></div><p className="mt-1 text-xs text-muted-foreground">{item.client_name ?? "Internal"} · {format(new Date(item.created_at), "d MMM yyyy")}</p></div>)}{data.feedback.length === 0 && <p className="text-sm text-muted-foreground">No feedback yet.</p>}</div></section>
      <section className="rounded-lg border bg-card p-4 lg:col-span-2"><h2 className="mb-3 text-sm font-semibold">Product notes</h2><div className="grid gap-3 md:grid-cols-3">{data.notes.map((note) => <div key={note.id} className="rounded-md bg-muted p-3"><StatusBadge status={note.note_type} /><p className="mt-2 text-sm">{note.content}</p><p className="mt-2 text-xs text-muted-foreground">{note.created_by_name}</p></div>)}{data.notes.length === 0 && <p className="text-sm text-muted-foreground">No notes yet.</p>}</div></section>
    </div>
  </div>;
}