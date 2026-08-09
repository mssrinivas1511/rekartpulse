import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { getFeatureStats, setFeatureStatus } from "@/lib/pulse.functions";
import { PageHeader } from "@/components/page-header";
import { FeatureStatusBadge } from "@/components/status-badge";
import { FeatureDialog } from "@/components/dialogs/feature-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatNumber } from "@/lib/format";
import type { FeatureStatus } from "@/lib/types";

const featuresQuery = queryOptions({
  queryKey: ["features"],
  queryFn: () => getFeatureStats(),
});

export const Route = createFileRoute("/features")({
  loader: ({ context }) => context.queryClient.ensureQueryData(featuresQuery),
  head: () => ({
    meta: [
      { title: "Features — Rekart Pulse" },
      {
        name: "description",
        content:
          "Feature adoption across clients: CRM & Ticketing, WhatsApp AI Assistant, Nodes, Push Notifications and more.",
      },
      { property: "og:title", content: "Features — Rekart Pulse" },
      { property: "og:description", content: "Feature adoption and performance across Rekart clients." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FeaturesPage,
});

function FeaturesPage() {
  const { data } = useSuspenseQuery(featuresQuery);
  const queryClient = useQueryClient();

  const statusMutation = useMutation({
    mutationFn: (input: { id: string; status: FeatureStatus }) =>
      setFeatureStatus({ data: input }),
    onSuccess: () => {
      toast.success("Feature status updated");
      queryClient.invalidateQueries();
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Features"
        description="Clients who enable a feature — their customers use it. Track what's a hit and what's declining."
        actions={
          <FeatureDialog
            trigger={
              <Button size="sm">
                <Plus /> Ship Feature
              </Button>
            }
          />
        }
      />

      <div className="p-6">
        <Card className="shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-[11px] uppercase tracking-wider">Feature</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider">Status</TableHead>
                  <TableHead className="text-center text-[11px] uppercase tracking-wider">
                    Clients Enabled
                  </TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider">
                    Avg Customer Adoption
                  </TableHead>
                  <TableHead className="text-right text-[11px] uppercase tracking-wider">
                    Customers Reached
                  </TableHead>
                  <TableHead className="text-right text-[11px] uppercase tracking-wider">
                    Change Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.features.map((feature) => (
                  <TableRow key={feature.id}>
                    <TableCell>
                      <p className="font-medium text-foreground">{feature.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {feature.category}
                        {feature.description ? ` · ${feature.description}` : ""}
                      </p>
                    </TableCell>
                    <TableCell>
                      <FeatureStatusBadge status={feature.status} />
                    </TableCell>
                    <TableCell className="text-center tabular-nums">
                      {feature.clients_enabled} / {data.active_clients}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${Math.min(100, feature.avg_adoption)}%` }}
                          />
                        </div>
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {feature.avg_adoption}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(feature.customers_reached)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Select
                        value={feature.status}
                        onValueChange={(v) =>
                          statusMutation.mutate({ id: feature.id, status: v as FeatureStatus })
                        }
                      >
                        <SelectTrigger className="ml-auto h-8 w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hit">Hit</SelectItem>
                          <SelectItem value="stable">Stable</SelectItem>
                          <SelectItem value="declining">Declining</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <p className="mt-3 text-xs text-muted-foreground">
          Tip: enable or disable features per client from the{" "}
          <Link to="/clients" className="font-medium text-primary hover:underline">
            client detail page
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
