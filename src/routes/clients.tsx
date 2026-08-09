import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ChevronRight, Plus, Search } from "lucide-react";
import { getClients } from "@/lib/pulse.functions";
import { PageHeader } from "@/components/page-header";
import { ClientStatusBadge } from "@/components/status-badge";
import { ClientDialog } from "@/components/dialogs/client-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatINR, formatNumber } from "@/lib/format";

const clientsQuery = queryOptions({
  queryKey: ["clients"],
  queryFn: () => getClients({ data: {} }),
});

export const Route = createFileRoute("/clients")({
  loader: ({ context }) => context.queryClient.ensureQueryData(clientsQuery),
  head: () => ({
    meta: [
      { title: "Clients — Rekart Pulse" },
      {
        name: "description",
        content: "Every Rekart client with customer counts, revenue, health score and status.",
      },
      { property: "og:title", content: "Clients — Rekart Pulse" },
      { property: "og:description", content: "Client list with health and revenue." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ClientsPage,
});

function ClientsPage() {
  const { data: clients } = useSuspenseQuery(clientsQuery);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const filtered = clients.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      (c.city ?? "").toLowerCase().includes(q) ||
      (c.owner_name ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Clients"
        description={`${clients.length} accounts on Rekart`}
        actions={
          <ClientDialog
            trigger={
              <Button size="sm">
                <Plus /> New Client
              </Button>
            }
          />
        }
      />

      <div className="space-y-4 p-6">
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Client by Name/City/Owner"
            className="pl-9"
          />
        </div>

        <Card className="shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-[11px] uppercase tracking-wider">Client</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider">Owner</TableHead>
                  <TableHead className="text-right text-[11px] uppercase tracking-wider">
                    Customers
                  </TableHead>
                  <TableHead className="text-right text-[11px] uppercase tracking-wider">
                    Monthly Revenue
                  </TableHead>
                  <TableHead className="text-center text-[11px] uppercase tracking-wider">
                    Features
                  </TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider">Health</TableHead>
                  <TableHead className="text-right text-[11px] uppercase tracking-wider">
                    Status
                  </TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                      No clients match your search.
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((client) => (
                  <TableRow
                    key={client.id}
                    className="cursor-pointer"
                    onClick={() =>
                      navigate({ to: "/clients/$clientId", params: { clientId: client.id } })
                    }
                  >
                    <TableCell>
                      <p className="font-medium text-foreground">{client.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {client.city} · {client.plan}
                      </p>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {client.owner_name ?? "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(client.customers_count)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatINR(client.monthly_revenue)}
                    </TableCell>
                    <TableCell className="text-center tabular-nums">
                      {client.features_enabled}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                          <div
                            className={
                              client.health_score >= 60
                                ? "h-full rounded-full bg-primary"
                                : client.health_score >= 35
                                  ? "h-full rounded-full bg-chart-3"
                                  : "h-full rounded-full bg-destructive"
                            }
                            style={{ width: `${client.health_score}%` }}
                          />
                        </div>
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {client.health_score}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <ClientStatusBadge status={client.status} />
                    </TableCell>
                    <TableCell className="w-8">
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
