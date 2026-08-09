import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Plus, ScrollText } from "lucide-react";
import { toast } from "sonner";
import { getClientDetail, setClientFeature } from "@/lib/pulse.functions";
import { PageHeader } from "@/components/page-header";
import {
  ClientStatusBadge,
  EventTypeBadge,
  SubscriptionStatusBadge,
} from "@/components/status-badge";
import { ClientDialog } from "@/components/dialogs/client-dialog";
import { ActivityDialog } from "@/components/dialogs/activity-dialog";
import {
  NewSubscriptionDialog,
  SubscriptionStatusDialog,
} from "@/components/dialogs/subscription-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatDateTime, formatINR, formatNumber } from "@/lib/format";

const clientDetailQuery = (id: string) =>
  queryOptions({
    queryKey: ["client", id],
    queryFn: () => getClientDetail({ data: { id } }),
  });

export const Route = createFileRoute("/clients/$clientId")({
  loader: async ({ context, params }) => {
    try {
      return await context.queryClient.ensureQueryData(clientDetailQuery(params.clientId));
    } catch {
      throw notFound();
    }
  },
  head: () => ({
    meta: [
      { title: "Client Detail — Rekart Pulse" },
      { name: "description", content: "Client profile, features, subscriptions and activity log." },
      { property: "og:title", content: "Client Detail — Rekart Pulse" },
      { property: "og:description", content: "Client profile, features, subscriptions and activity log." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ClientDetailPage,
});

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-2.5 last:border-0">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span className="text-[13px] font-medium text-foreground">{value}</span>
    </div>
  );
}

function ClientDetailPage() {
  const { clientId } = Route.useParams();
  const { data } = useSuspenseQuery(clientDetailQuery(clientId));
  const { client, subscriptions, activity, features, client_features } = data;
  const queryClient = useQueryClient();

  const featureMutation = useMutation({
    mutationFn: (input: { feature_id: string; enabled: boolean; adoption_percent: number }) =>
      setClientFeature({ data: { client_id: clientId, ...input } }),
    onSuccess: () => queryClient.invalidateQueries(),
    onError: (error) => toast.error(error.message),
  });

  const cfMap = new Map(client_features.map((cf) => [cf.feature_id, cf]));
  const shortId = client.id.replace(/-/g, "").slice(-5);

  return (
    <div className="min-h-screen">
      <PageHeader
        title={`${client.name} #${shortId}`}
        description={`${client.city ?? "—"} · ${client.plan} plan`}
        actions={
          <>
            <ClientStatusBadge status={client.status} className="px-3 py-1" />
            <ClientDialog
              client={client}
              trigger={
                <Button variant="outline" size="sm">
                  <Pencil /> Edit
                </Button>
              }
            />
            <ActivityDialog
              presetClientId={clientId}
              trigger={
                <Button size="sm">
                  <ScrollText /> Log Activity
                </Button>
              }
            />
          </>
        }
      />

      <div className="p-6">
        <Link
          to="/clients"
          className="mb-4 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="size-3.5" /> Back to clients
        </Link>

        <Tabs defaultValue="overview">
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
            <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <Card className="shadow-sm">
                <CardHeader className="pb-1">
                  <CardTitle className="border-l-2 border-primary pl-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <DetailRow label="Owner" value={client.owner_name ?? "—"} />
                  <DetailRow label="Phone" value={client.phone ?? "—"} />
                  <DetailRow label="Plan" value={client.plan} />
                  <DetailRow label="Customers" value={formatNumber(client.customers_count)} />
                  <DetailRow label="Monthly Revenue" value={formatINR(client.monthly_revenue)} />
                  <DetailRow label="Health Score" value={`${client.health_score} / 100`} />
                  <DetailRow label="Onboarded" value={formatDate(client.onboarded_at)} />
                  <DetailRow
                    label="Features Enabled"
                    value={String(client_features.filter((cf) => cf.enabled).length)}
                  />
                </CardContent>
              </Card>

              <Card className="shadow-sm xl:col-span-2">
                <CardHeader className="pb-1">
                  <CardTitle className="border-l-2 border-primary pl-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Activity Log
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="pl-6 text-[11px] uppercase tracking-wider">
                          Date Time
                        </TableHead>
                        <TableHead className="text-[11px] uppercase tracking-wider">
                          Operator
                        </TableHead>
                        <TableHead className="pr-6 text-[11px] uppercase tracking-wider">
                          Description
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activity.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={3}
                            className="py-8 text-center text-sm text-muted-foreground"
                          >
                            No activity yet — log the first entry.
                          </TableCell>
                        </TableRow>
                      )}
                      {activity.slice(0, 10).map((entry) => (
                        <TableRow
                          key={entry.id}
                          className={entry.event_type === "churn" ? "bg-highlight/40" : undefined}
                        >
                          <TableCell className="whitespace-nowrap pl-6 text-xs text-muted-foreground">
                            {formatDateTime(entry.created_at)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-xs font-medium">
                            {entry.operator}
                          </TableCell>
                          <TableCell className="pr-6 text-[13px]">
                            <span className="mr-2">
                              <EventTypeBadge type={entry.event_type} />
                            </span>
                            {entry.description}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="features">
            <Card className="shadow-sm">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-[11px] uppercase tracking-wider">Feature</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider">Category</TableHead>
                      <TableHead className="text-center text-[11px] uppercase tracking-wider">
                        Enabled
                      </TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider">
                        Customer Adoption %
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {features.map((feature) => {
                      const cf = cfMap.get(feature.id);
                      const enabled = cf?.enabled ?? false;
                      return (
                        <TableRow key={feature.id} className={enabled ? "bg-highlight/30" : undefined}>
                          <TableCell className="font-medium text-foreground">{feature.name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {feature.category}
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={enabled}
                              onCheckedChange={(checked) =>
                                featureMutation.mutate({
                                  feature_id: feature.id,
                                  enabled: checked,
                                  adoption_percent: cf?.adoption_percent ?? 0,
                                })
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              className="h-8 w-24"
                              disabled={!enabled}
                              defaultValue={cf?.adoption_percent ?? 0}
                              key={`${feature.id}-${cf?.adoption_percent ?? 0}`}
                              onBlur={(e) => {
                                const value = Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0));
                                if (value !== (cf?.adoption_percent ?? 0)) {
                                  featureMutation.mutate({
                                    feature_id: feature.id,
                                    enabled,
                                    adoption_percent: value,
                                  });
                                }
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subscriptions">
            <Card className="shadow-sm">
              <CardHeader className="flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-semibold">Subscriptions</CardTitle>
                <NewSubscriptionDialog
                  clientId={clientId}
                  trigger={
                    <Button size="sm">
                      <Plus /> Record Subscription
                    </Button>
                  }
                />
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-[11px] uppercase tracking-wider">Plan</TableHead>
                      <TableHead className="text-right text-[11px] uppercase tracking-wider">
                        Amount
                      </TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider">Started</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider">Ended</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider">Reason</TableHead>
                      <TableHead className="text-right text-[11px] uppercase tracking-wider">
                        Status
                      </TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscriptions.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="py-8 text-center text-sm text-muted-foreground"
                        >
                          No subscriptions recorded yet.
                        </TableCell>
                      </TableRow>
                    )}
                    {subscriptions.map((sub) => (
                      <TableRow key={sub.id}>
                        <TableCell className="font-medium">{sub.plan}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatINR(sub.monthly_amount)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(sub.started_at)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(sub.ended_at)}
                        </TableCell>
                        <TableCell className="max-w-48 truncate text-sm text-muted-foreground">
                          {sub.end_reason ?? "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <SubscriptionStatusBadge status={sub.status} />
                        </TableCell>
                        <TableCell className="w-28 text-right">
                          <SubscriptionStatusDialog
                            subscription={{ ...sub, client_name: client.name }}
                            trigger={
                              <Button variant="ghost" size="sm">
                                Change
                              </Button>
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity">
            <Card className="shadow-sm">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-[11px] uppercase tracking-wider">Date Time</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider">Operator</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider">Feature</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider">
                        Description
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activity.map((entry) => (
                      <TableRow
                        key={entry.id}
                        className={entry.event_type === "churn" ? "bg-highlight/40" : undefined}
                      >
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                          {formatDateTime(entry.created_at)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs font-medium">
                          {entry.operator}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {entry.feature_name ?? "—"}
                        </TableCell>
                        <TableCell className="text-[13px]">
                          <span className="mr-2">
                            <EventTypeBadge type={entry.event_type} />
                          </span>
                          {entry.description}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
