import { z } from "zod";
import { format, subMonths } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import {
  CHURN_STATUSES,
  type ActivityEntry,
  type Client,
  type ClientDetail,
  type ClientFeature,
  type ClientWithMeta,
  type DashboardData,
  type Feature,
  type FeatureStat,
  type Subscription,
  type SubscriptionStatus,
} from "./types";

// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------

export const searchSchema = z.object({ search: z.string().optional() });
export const idSchema = z.object({ id: z.string() });
export const statusFilterSchema = z.object({ status: z.string().optional() });

export const clientInputSchema = z.object({
  name: z.string().min(1),
  owner_name: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  plan: z.string().min(1),
  status: z.enum(["active", "at_risk", "churned"]),
  customers_count: z.number().int().nonnegative(),
  monthly_revenue: z.number().nonnegative(),
  health_score: z.number().int().min(0).max(100),
});

export const updateClientSchema = clientInputSchema.extend({ id: z.string() });

export const featureInputSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  status: z.enum(["hit", "stable", "declining"]),
  description: z.string().nullable().optional(),
});

export const featureStatusSchema = z.object({
  id: z.string(),
  status: z.enum(["hit", "stable", "declining"]),
});

export const clientFeatureSchema = z.object({
  client_id: z.string(),
  feature_id: z.string(),
  enabled: z.boolean(),
  adoption_percent: z.number().min(0).max(100),
});

export const subscriptionInputSchema = z.object({
  client_id: z.string(),
  plan: z.string().min(1),
  monthly_amount: z.number().nonnegative(),
  started_at: z.string().min(1),
});

export const subscriptionStatusSchema = z.object({
  id: z.string(),
  status: z.enum(["active", "paused", "stopped", "completed", "ended"]),
  end_reason: z.string().nullable().optional(),
});

export const activityInputSchema = z.object({
  client_id: z.string().nullable().optional(),
  feature_id: z.string().nullable().optional(),
  operator: z.string().min(1),
  event_type: z.enum(["general", "churn", "payment", "feature", "risk", "issue"]),
  description: z.string().min(1),
});

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

async function fetchAllClients(): Promise<Client[]> {
  const { data, error } = await supabase.from("clients").select("*").order("name");
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Client[];
}

async function fetchAllFeatures(): Promise<Feature[]> {
  const { data, error } = await supabase.from("features").select("*").order("name");
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Feature[];
}

async function fetchAllClientFeatures(): Promise<ClientFeature[]> {
  const { data, error } = await supabase.from("client_features").select("*");
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as ClientFeature[];
}

async function fetchAllSubscriptions(): Promise<Subscription[]> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Subscription[];
}

async function fetchActivityEntries(limit = 300): Promise<ActivityEntry[]> {
  const { data, error } = await supabase
    .from("activity_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);

  const [clients, features] = await Promise.all([fetchAllClients(), fetchAllFeatures()]);
  const clientNames = new Map(clients.map((c) => [c.id, c.name]));
  const featureNames = new Map(features.map((f) => [f.id, f.name]));

  return ((data ?? []) as unknown as ActivityEntry[]).map((entry) => ({
    ...entry,
    client_name: entry.client_id ? (clientNames.get(entry.client_id) ?? null) : null,
    feature_name: entry.feature_id ? (featureNames.get(entry.feature_id) ?? null) : null,
  }));
}

function computeFeatureStats(
  features: Feature[],
  clientFeatures: ClientFeature[],
  clients: Client[],
): FeatureStat[] {
  const clientMap = new Map(clients.map((c) => [c.id, c]));
  return features.map((feature) => {
    const rows = clientFeatures.filter((cf) => cf.feature_id === feature.id && cf.enabled);
    const liveRows = rows.filter((cf) => clientMap.get(cf.client_id)?.status !== "churned");
    const avg_adoption =
      liveRows.length > 0
        ? Math.round(liveRows.reduce((sum, r) => sum + Number(r.adoption_percent), 0) / liveRows.length)
        : 0;
    const customers_reached = liveRows.reduce((sum, r) => {
      const client = clientMap.get(r.client_id);
      return sum + Math.round(((client?.customers_count ?? 0) * Number(r.adoption_percent)) / 100);
    }, 0);
    return { ...feature, clients_enabled: liveRows.length, avg_adoption, customers_reached };
  });
}

export async function fetchDashboard(): Promise<DashboardData> {
  const [clients, features, clientFeatures, subscriptions, activity] = await Promise.all([
    fetchAllClients(),
    fetchAllFeatures(),
    fetchAllClientFeatures(),
    fetchAllSubscriptions(),
    fetchActivityEntries(8),
  ]);

  const active = clients.filter((c) => c.status === "active").length;
  const atRisk = clients.filter((c) => c.status === "at_risk").length;
  const churned = clients.filter((c) => c.status === "churned").length;
  const totalMrr = subscriptions
    .filter((s) => s.status === "active")
    .reduce((sum, s) => sum + Number(s.monthly_amount), 0);
  const churnedSubs = subscriptions.filter((s) => CHURN_STATUSES.includes(s.status)).length;
  const churnRate =
    subscriptions.length > 0 ? Math.round((churnedSubs / subscriptions.length) * 1000) / 10 : 0;
  const enabledRows = clientFeatures.filter((cf) => cf.enabled);
  const avgAdoption =
    enabledRows.length > 0
      ? Math.round(enabledRows.reduce((sum, r) => sum + Number(r.adoption_percent), 0) / enabledRows.length)
      : 0;

  const months: { key: string; month: string; count: number }[] = [];
  for (let i = 7; i >= 0; i--) {
    const d = subMonths(new Date(), i);
    months.push({ key: format(d, "yyyy-MM"), month: format(d, "MMM"), count: 0 });
  }
  for (const s of subscriptions) {
    if (CHURN_STATUSES.includes(s.status) && s.ended_at) {
      const bucket = months.find((m) => m.key === s.ended_at!.slice(0, 7));
      if (bucket) bucket.count += 1;
    }
  }

  const featureStats = computeFeatureStats(features, clientFeatures, clients)
    .sort((a, b) => b.clients_enabled - a.clients_enabled);

  const cfCounts = new Map<string, number>();
  for (const row of clientFeatures) {
    if (row.enabled) cfCounts.set(row.client_id, (cfCounts.get(row.client_id) ?? 0) + 1);
  }
  const atRiskClients: ClientWithMeta[] = clients
    .filter((c) => c.status === "at_risk" || (c.status === "active" && c.customers_count < 200))
    .sort((a, b) => a.health_score - b.health_score)
    .slice(0, 6)
    .map((c) => ({ ...c, features_enabled: cfCounts.get(c.id) ?? 0 }));

  return {
    stats: {
      active_clients: active,
      at_risk_clients: atRisk,
      churned_clients: churned,
      total_mrr: totalMrr,
      churn_rate: churnRate,
      avg_adoption: avgAdoption,
      features_live: features.length,
    },
    churn_by_month: months.map(({ month, count }) => ({ month, count })),
    feature_stats: featureStats,
    at_risk: atRiskClients,
    recent_activity: activity,
  };
}

export async function fetchClients(search?: string): Promise<ClientWithMeta[]> {
  let query = supabase.from("clients").select("*").order("name");
  if (search) query = query.ilike("name", `%${search}%`);
  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const clientFeatures = await fetchAllClientFeatures();
  const counts = new Map<string, number>();
  for (const row of clientFeatures) {
    if (row.enabled) counts.set(row.client_id, (counts.get(row.client_id) ?? 0) + 1);
  }
  return ((data ?? []) as unknown as Client[]).map((c) => ({
    ...c,
    features_enabled: counts.get(c.id) ?? 0,
  }));
}

export async function fetchClientDetail(id: string): Promise<ClientDetail> {
  const { data: client, error } = await supabase.from("clients").select("*").eq("id", id).single();
  if (error || !client) throw new Error("Client not found");

  const [subscriptions, activity, features, clientFeatures] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("*")
      .eq("client_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("activity_log")
      .select("*")
      .eq("client_id", id)
      .order("created_at", { ascending: false }),
    fetchAllFeatures(),
    supabase.from("client_features").select("*").eq("client_id", id),
  ]);

  if (subscriptions.error) throw new Error(subscriptions.error.message);
  if (activity.error) throw new Error(activity.error.message);
  if (clientFeatures.error) throw new Error(clientFeatures.error.message);

  const featureNames = new Map(features.map((f) => [f.id, f.name]));

  return {
    client: client as unknown as Client,
    subscriptions: (subscriptions.data ?? []) as unknown as Subscription[],
    activity: ((activity.data ?? []) as unknown as ActivityEntry[]).map((entry) => ({
      ...entry,
      client_name: (client as unknown as Client).name,
      feature_name: entry.feature_id ? (featureNames.get(entry.feature_id) ?? null) : null,
    })),
    features,
    client_features: (clientFeatures.data ?? []) as unknown as ClientFeature[],
  };
}

export async function fetchFeatureStats(): Promise<{
  features: FeatureStat[];
  active_clients: number;
}> {
  const [clients, features, clientFeatures] = await Promise.all([
    fetchAllClients(),
    fetchAllFeatures(),
    fetchAllClientFeatures(),
  ]);
  return {
    features: computeFeatureStats(features, clientFeatures, clients).sort(
      (a, b) => b.clients_enabled - a.clients_enabled,
    ),
    active_clients: clients.filter((c) => c.status !== "churned").length,
  };
}

export async function fetchSubscriptions(status?: string): Promise<Subscription[]> {
  let query = supabase.from("subscriptions").select("*").order("created_at", { ascending: false });
  if (status && status !== "all") query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const clients = await fetchAllClients();
  const names = new Map(clients.map((c) => [c.id, c.name]));
  return ((data ?? []) as unknown as Subscription[]).map((s) => ({
    ...s,
    client_name: names.get(s.client_id) ?? "Unknown client",
  }));
}

export async function fetchActivity(filter?: string): Promise<ActivityEntry[]> {
  const entries = await fetchActivityEntries(300);
  if (!filter || filter === "all") return entries;
  return entries.filter((e) => e.event_type === filter);
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function insertClient(input: z.infer<typeof clientInputSchema>): Promise<Client> {
  const { data, error } = await supabase
    .from("clients")
    .insert({
      name: input.name,
      owner_name: input.owner_name || null,
      phone: input.phone || null,
      city: input.city || null,
      plan: input.plan,
      status: input.status,
      customers_count: input.customers_count,
      monthly_revenue: input.monthly_revenue,
      health_score: input.health_score,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);

  await supabase.from("activity_log").insert({
    client_id: data.id,
    operator: "Office",
    event_type: "general",
    description: `Client onboarded — ${input.name} on the ${input.plan} plan.`,
  });
  return data as unknown as Client;
}

export async function updateClient(input: z.infer<typeof updateClientSchema>): Promise<void> {
  const { id, ...fields } = input;
  const { error } = await supabase
    .from("clients")
    .update({
      name: fields.name,
      owner_name: fields.owner_name || null,
      phone: fields.phone || null,
      city: fields.city || null,
      plan: fields.plan,
      status: fields.status,
      customers_count: fields.customers_count,
      monthly_revenue: fields.monthly_revenue,
      health_score: fields.health_score,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function insertFeature(input: z.infer<typeof featureInputSchema>): Promise<void> {
  const { data, error } = await supabase
    .from("features")
    .insert({
      name: input.name,
      category: input.category,
      status: input.status,
      description: input.description || null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);

  await supabase.from("activity_log").insert({
    feature_id: data.id,
    operator: "System",
    event_type: "feature",
    description: `New feature shipped: ${input.name} — iteration release.`,
  });
}

export async function updateFeatureStatus(
  input: z.infer<typeof featureStatusSchema>,
): Promise<void> {
  const { error } = await supabase.from("features").update({ status: input.status }).eq("id", input.id);
  if (error) throw new Error(error.message);

  const { data: feature } = await supabase
    .from("features")
    .select("name")
    .eq("id", input.id)
    .single();
  await supabase.from("activity_log").insert({
    feature_id: input.id,
    operator: "System",
    event_type: input.status === "declining" ? "issue" : "feature",
    description: `Feature health moved to ${input.status.toUpperCase()} — ${feature?.name ?? "feature"}.`,
  });
}

export async function upsertClientFeature(
  input: z.infer<typeof clientFeatureSchema>,
): Promise<void> {
  const { error } = await supabase.from("client_features").upsert(
    {
      client_id: input.client_id,
      feature_id: input.feature_id,
      enabled: input.enabled,
      adoption_percent: input.adoption_percent,
    },
    { onConflict: "client_id,feature_id" },
  );
  if (error) throw new Error(error.message);

  const [{ data: client }, { data: feature }] = await Promise.all([
    supabase.from("clients").select("name").eq("id", input.client_id).single(),
    supabase.from("features").select("name").eq("id", input.feature_id).single(),
  ]);
  await supabase.from("activity_log").insert({
    client_id: input.client_id,
    feature_id: input.feature_id,
    operator: "Office",
    event_type: "feature",
    description: input.enabled
      ? `${feature?.name ?? "Feature"} enabled for ${client?.name ?? "client"} — ${input.adoption_percent}% customer adoption.`
      : `${feature?.name ?? "Feature"} disabled for ${client?.name ?? "client"}.`,
  });
}

export async function insertSubscription(
  input: z.infer<typeof subscriptionInputSchema>,
): Promise<void> {
  const { error } = await supabase.from("subscriptions").insert({
    client_id: input.client_id,
    plan: input.plan,
    monthly_amount: input.monthly_amount,
    started_at: input.started_at,
    status: "active",
  });
  if (error) throw new Error(error.message);

  const { data: client } = await supabase
    .from("clients")
    .select("name, status")
    .eq("id", input.client_id)
    .single();

  if (client?.status === "churned") {
    await supabase.from("clients").update({ status: "active" }).eq("id", input.client_id);
    await supabase.from("activity_log").insert({
      client_id: input.client_id,
      operator: "Office",
      event_type: "general",
      description: "Subscription Resumed",
    });
  } else {
    await supabase.from("activity_log").insert({
      client_id: input.client_id,
      operator: "Office",
      event_type: "payment",
      description: `New ${input.plan} subscription created for ${client?.name ?? "client"} — ₹${input.monthly_amount}/month.`,
    });
  }
}

export async function updateSubscriptionStatus(
  input: z.infer<typeof subscriptionStatusSchema>,
): Promise<void> {
  const { data: sub, error: fetchError } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("id", input.id)
    .single();
  if (fetchError || !sub) throw new Error("Subscription not found");

  const isChurn = CHURN_STATUSES.includes(input.status as SubscriptionStatus);
  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: input.status,
      end_reason: isChurn || input.status === "paused" ? input.end_reason || null : null,
      ended_at: isChurn ? format(new Date(), "yyyy-MM-dd") : null,
    })
    .eq("id", input.id);
  if (error) throw new Error(error.message);

  if (isChurn) {
    const { data: remaining } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("client_id", sub.client_id)
      .eq("status", "active");
    if ((remaining ?? []).length === 0) {
      await supabase.from("clients").update({ status: "churned" }).eq("id", sub.client_id);
    }
  } else if (input.status === "active") {
    await supabase.from("clients").update({ status: "active" }).eq("id", sub.client_id);
  }

  let description: string;
  const reason = input.end_reason?.trim();
  switch (input.status) {
    case "stopped":
      description = `Subscription stop scheduled from "${format(new Date(), "dd MMM yyyy")}"${reason ? ` | Reason : ${reason}` : ""}`;
      break;
    case "completed":
      description = reason
        ? `Subscription Completed | Reason : ${reason}`
        : "Subscription Completed because the end date have passed.";
      break;
    case "ended":
      description = `Subscription Ended${reason ? ` | Reason : ${reason}` : ""}`;
      break;
    case "paused":
      description = `Subscription Paused${reason ? ` | Reason : ${reason}` : ""}`;
      break;
    default:
      description = "Subscription Resumed";
  }

  await supabase.from("activity_log").insert({
    client_id: sub.client_id,
    operator: "Office",
    event_type: isChurn ? "churn" : "general",
    description,
  });
}

export async function insertActivity(input: z.infer<typeof activityInputSchema>): Promise<void> {
  const { error } = await supabase.from("activity_log").insert({
    client_id: input.client_id || null,
    feature_id: input.feature_id || null,
    operator: input.operator,
    event_type: input.event_type,
    description: input.description,
  });
  if (error) throw new Error(error.message);
}
