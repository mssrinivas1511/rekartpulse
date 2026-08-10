import { z } from "zod";
import { format, subMonths, startOfMonth } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  CHURN_STATUSES,
  type AccountManager,
  type AccountManagerWithStats,
  type AuditLog,
  type Client,
  type ClientDetail,
  type ClientFeature,
  type ClientWithMeta,
  type DashboardData,
  type Feature,
  type FeatureDetail,
  type FeatureFeedback,
  type FeatureMedia,
  type FeatureNote,
  type FeatureStat,
  type Json,
  type PermAction,
  type Section,
  type Subscription,
  type Ticket,
  type TicketAttachment,
  type TicketComment,
} from "./types";

type Db = SupabaseClient<Database>;

// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------

export const searchSchema = z.object({ search: z.string().optional() });
export const idSchema = z.object({ id: z.string() });

export const clientInputSchema = z.object({
  name: z.string().min(1),
  owner_name: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  logo_url: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  currency: z.string().min(1),
  industry: z.string().nullable().optional(),
  plan: z.string().min(1),
  status: z.enum(["active", "trial", "paid", "churned"]),
  customers_count: z.number().int().nonnegative(),
  health_score: z.number().int().min(0).max(100),
  account_manager_id: z.string().nullable().optional(),
  client_since: z.string().optional(),
  notes: z.string().nullable().optional(),
});
export const updateClientSchema = clientInputSchema.extend({ id: z.string() });
export const archiveClientSchema = z.object({ id: z.string(), archived: z.boolean() });

export const featureInputSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  status: z.enum(["planned", "in_development", "live", "deprecated"]),
  description: z.string().nullable().optional(),
  release_version: z.string().nullable().optional(),
  release_date: z.string().nullable().optional(),
});
export const updateFeatureSchema = featureInputSchema.extend({ id: z.string() });

export const clientFeatureSchema = z.object({
  client_id: z.string(),
  feature_id: z.string(),
  enabled: z.boolean(),
  adoption_percent: z.number().min(0).max(100),
});

export const subscriptionInputSchema = z.object({
  client_id: z.string(),
  product: z.string().min(1),
  plan: z.string().min(1),
  customers_count: z.number().int().nonnegative(),
  monthly_amount: z.number().nonnegative(),
  started_at: z.string().min(1),
});
export const updateSubscriptionSchema = subscriptionInputSchema.extend({ id: z.string() });
export const subscriptionStatusSchema = z.object({
  id: z.string(),
  status: z.enum(["active", "paused", "stopped", "completed", "ended"]),
  end_reason: z.string().nullable().optional(),
});

export const mediaInputSchema = z.object({
  feature_id: z.string(),
  media_type: z.enum(["image", "gif", "video"]),
  url: z.string().min(1),
  caption: z.string().nullable().optional(),
});

export const feedbackInputSchema = z.object({
  feature_id: z.string(),
  client_id: z.string().nullable().optional(),
  feedback: z.string().min(1),
  priority: z.enum(["low", "medium", "high", "critical"]),
  status: z.enum(["new", "in_review", "planned", "done", "rejected"]),
  next_action: z.string().nullable().optional(),
});
export const updateFeedbackSchema = feedbackInputSchema.extend({ id: z.string() });

export const noteInputSchema = z.object({
  feature_id: z.string(),
  note_type: z.enum(["product_input", "iteration", "next_release"]),
  content: z.string().min(1),
});

export const ticketInputSchema = z.object({
  client_id: z.string(),
  feature_id: z.string().nullable().optional(),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  ticket_type: z.enum(["bug", "feature_request", "improvement", "clarification", "support"]),
  priority: z.enum(["low", "medium", "high", "critical"]),
  status: z.enum(["open", "in_progress", "resolved", "rejected", "need_info"]),
  requested_by: z.string().nullable().optional(),
  assigned_to: z.string().nullable().optional(),
  assigned_name: z.string().nullable().optional(),
});
export const updateTicketSchema = ticketInputSchema.extend({ id: z.string() });
export const ticketStatusSchema = z.object({
  id: z.string(),
  status: z.enum(["open", "in_progress", "resolved", "rejected", "need_info"]),
});
export const ticketFilterSchema = z.object({
  status: z.string().optional(),
  client_id: z.string().optional(),
});
export const commentInputSchema = z.object({ ticket_id: z.string(), content: z.string().min(1) });
export const attachmentInputSchema = z.object({
  ticket_id: z.string(),
  file_name: z.string().nullable().optional(),
  url: z.string().min(1),
});

export const accountManagerInputSchema = z.object({
  name: z.string().min(1),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  avatar_url: z.string().nullable().optional(),
  satisfaction: z.number().min(0).max(5),
  notes: z.string().nullable().optional(),
});
export const updateAccountManagerSchema = accountManagerInputSchema.extend({ id: z.string() });

export const auditFilterSchema = z.object({
  entity_type: z.string(),
  entity_id: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export async function requirePermission(
  db: Db,
  userId: string,
  section: Section,
  action: PermAction,
): Promise<void> {
  const { data, error } = await db.rpc("has_permission", {
    _user_id: userId,
    _section: section,
    _action: action,
  });
  if (error) throw new Error(error.message);
  if (data !== true) throw new Error(`You don't have ${action} permission for this section.`);
}

async function userName(db: Db, userId: string): Promise<string> {
  const { data } = await db.from("profiles").select("full_name").eq("id", userId).maybeSingle();
  return data?.full_name ?? "Team member";
}

async function audit(
  db: Db,
  userId: string,
  entry: {
    entity_type: string;
    entity_id?: string | null;
    entity_label?: string | null;
    action: string;
    before?: Json;
    after?: Json;
  },
): Promise<void> {
  const name = await userName(db, userId);
  await db.from("audit_logs").insert({
    entity_type: entry.entity_type,
    entity_id: entry.entity_id ?? null,
    entity_label: entry.entity_label ?? null,
    user_id: userId,
    user_name: name,
    action: entry.action,
    before_value: entry.before ?? null,
    after_value: entry.after ?? null,
  });
}

const EXTERNAL_URL = /^https?:\/\//;

/** Sign private storage paths (external URLs pass through untouched). */
async function signPaths(db: Db, bucket: string, paths: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const internal: string[] = [];
  for (const p of paths) {
    if (!p) continue;
    if (EXTERNAL_URL.test(p)) map.set(p, p);
    else internal.push(p);
  }
  if (internal.length === 0) return map;
  const { data, error } = await db.storage.from(bucket).createSignedUrls(internal, 3600);
  if (!error && data) {
    for (const row of data) {
      if (row.path && row.signedUrl) map.set(row.path, row.signedUrl);
    }
  }
  return map;
}

function throwIf(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

async function fetchAllClients(db: Db): Promise<Client[]> {
  const { data, error } = await db.from("clients").select("*").order("name");
  throwIf(error);
  return (data ?? []) as unknown as Client[];
}

async function fetchAllFeatures(db: Db): Promise<Feature[]> {
  const { data, error } = await db.from("features").select("*").order("name");
  throwIf(error);
  return (data ?? []) as unknown as Feature[];
}

async function fetchAllClientFeatures(db: Db): Promise<ClientFeature[]> {
  const { data, error } = await db.from("client_features").select("*");
  throwIf(error);
  return (data ?? []) as unknown as ClientFeature[];
}

async function fetchAllSubscriptions(db: Db): Promise<Subscription[]> {
  const { data, error } = await db
    .from("subscriptions")
    .select("*")
    .order("created_at", { ascending: false });
  throwIf(error);
  return (data ?? []) as unknown as Subscription[];
}

function computeFeatureStats(
  features: Feature[],
  clientFeatures: ClientFeature[],
  clients: Client[],
  feedbackCounts: Map<string, number>,
): FeatureStat[] {
  const eligibleClients = clients.filter((c) => c.status !== "churned" && !c.archived_at);
  const eligibleIds = new Set(eligibleClients.map((c) => c.id));
  const clientMap = new Map(clients.map((c) => [c.id, c]));

  return features.map((feature) => {
    const rows = clientFeatures.filter(
      (cf) => cf.feature_id === feature.id && cf.enabled && eligibleIds.has(cf.client_id),
    );
    const using = rows.filter((r) => Number(r.adoption_percent) > 0).length;
    const avg_adoption =
      rows.length > 0
        ? Math.round(rows.reduce((sum, r) => sum + Number(r.adoption_percent), 0) / rows.length)
        : 0;
    const adoption_rate =
      eligibleClients.length > 0 ? Math.round((using / eligibleClients.length) * 100) : 0;
    const customers_reached = rows.reduce((sum, r) => {
      const client = clientMap.get(r.client_id);
      return sum + Math.round(((client?.customers_count ?? 0) * Number(r.adoption_percent)) / 100);
    }, 0);
    return {
      ...feature,
      eligible_clients: eligibleClients.length,
      clients_enabled: rows.length,
      clients_using: using,
      avg_adoption,
      adoption_rate,
      feedback_count: feedbackCounts.get(feature.id) ?? 0,
      customers_reached,
    };
  });
}

export async function fetchDashboard(db: Db): Promise<DashboardData> {
  const [clients, features, clientFeatures, subscriptions, feedbackRes] = await Promise.all([
    fetchAllClients(db),
    fetchAllFeatures(db),
    fetchAllClientFeatures(db),
    fetchAllSubscriptions(db),
    db.from("feature_feedback").select("*").order("created_at", { ascending: false }).limit(100),
  ]);
  throwIf(feedbackRes.error);
  const feedback = (feedbackRes.data ?? []) as unknown as FeatureFeedback[];

  const notArchived = clients.filter((c) => !c.archived_at);
  const active = notArchived.filter((c) => c.status !== "churned");
  const trial = notArchived.filter((c) => c.status === "trial");
  const paid = notArchived.filter((c) => c.status === "paid");
  const churned = notArchived.filter((c) => c.status === "churned");
  const churnRate =
    notArchived.length > 0 ? Math.round((churned.length / notArchived.length) * 1000) / 10 : 0;
  const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const newThisMonth = notArchived.filter((c) => c.client_since >= monthStart).length;
  const trialToPaid =
    trial.length + paid.length > 0
      ? Math.round((paid.length / (trial.length + paid.length)) * 1000) / 10
      : 0;

  const feedbackCounts = new Map<string, number>();
  for (const f of feedback) feedbackCounts.set(f.feature_id, (feedbackCounts.get(f.feature_id) ?? 0) + 1);

  const featureStats = computeFeatureStats(features, clientFeatures, clients, feedbackCounts);
  const liveStats = featureStats.filter((f) => f.status === "live");
  const avgAdoptionRate =
    liveStats.length > 0
      ? Math.round(liveStats.reduce((sum, f) => sum + f.adoption_rate, 0) / liveStats.length)
      : 0;
  const clientsUsing = new Set(
    clientFeatures.filter((cf) => cf.enabled && Number(cf.adoption_percent) > 0).map((cf) => cf.client_id),
  ).size;

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

  const clientNames = new Map(clients.map((c) => [c.id, c.name]));
  const featureNames = new Map(features.map((f) => [f.id, f.name]));

  const { data: openTickets } = await db
    .from("tickets")
    .select("id", { count: "exact", head: true })
    .in("status", ["open", "in_progress", "need_info"]);

  return {
    stats: {
      features_live: liveStats.length,
      features_planned: features.filter((f) => f.status === "planned").length,
      features_in_development: features.filter((f) => f.status === "in_development").length,
      total_features: features.length,
      clients_using_features: clientsUsing,
      total_feedback: feedback.length,
      avg_adoption_rate: avgAdoptionRate,
      active_clients: active.length,
      trial_clients: trial.length,
      paid_clients: paid.length,
      churned_clients: churned.length,
      churn_rate: churnRate,
      new_clients_this_month: newThisMonth,
      trial_to_paid: trialToPaid,
      open_tickets: openTickets?.length ?? 0,
    },
    churn_by_month: months.map(({ month, count }) => ({ month, count })),
    feature_stats: featureStats.sort((a, b) => b.adoption_rate - a.adoption_rate),
    recent_feedback: feedback.slice(0, 8).map((f) => ({
      ...f,
      client_name: f.client_id ? (clientNames.get(f.client_id) ?? null) : null,
      feature_name: featureNames.get(f.feature_id) ?? null,
    })),
  };
}

export async function fetchClients(db: Db, search?: string): Promise<ClientWithMeta[]> {
  let query = db.from("clients").select("*").order("name");
  if (search) query = query.ilike("name", `%${search}%`);
  const { data, error } = await query;
  throwIf(error);

  const [clientFeatures, managers] = await Promise.all([
    fetchAllClientFeatures(db),
    db.from("account_managers").select("id, name"),
  ]);
  const counts = new Map<string, number>();
  for (const row of clientFeatures) {
    if (row.enabled) counts.set(row.client_id, (counts.get(row.client_id) ?? 0) + 1);
  }
  const managerNames = new Map((managers.data ?? []).map((m) => [m.id, m.name]));

  const clients = (data ?? []) as unknown as Client[];
  const signed = await signPaths(
    db,
    "client-logos",
    clients.map((c) => c.logo_url).filter((u): u is string => Boolean(u)),
  );
  return clients.map((c) => ({
    ...c,
    logo_url: c.logo_url ? (signed.get(c.logo_url) ?? c.logo_url) : null,
    features_enabled: counts.get(c.id) ?? 0,
    account_manager_name: c.account_manager_id ? (managerNames.get(c.account_manager_id) ?? null) : null,
  }));
}

export async function fetchClientDetail(db: Db, id: string): Promise<ClientDetail> {
  const { data: client, error } = await db.from("clients").select("*").eq("id", id).single();
  if (error || !client) throw new Error("Client not found");

  const [subsRes, features, cfRes, ticketsRes, auditRes] = await Promise.all([
    db.from("subscriptions").select("*").eq("client_id", id).order("created_at", { ascending: false }),
    fetchAllFeatures(db),
    db.from("client_features").select("*").eq("client_id", id),
    db.from("tickets").select("*").eq("client_id", id).order("created_at", { ascending: false }),
    db.from("audit_logs").select("*").eq("entity_type", "client").eq("entity_id", id).order("created_at", { ascending: false }).limit(50),
  ]);
  throwIf(subsRes.error);
  throwIf(cfRes.error);
  throwIf(ticketsRes.error);
  throwIf(auditRes.error);

  const typedClient = client as unknown as Client;
  if (typedClient.logo_url) {
    const signed = await signPaths(db, "client-logos", [typedClient.logo_url]);
    typedClient.logo_url = signed.get(typedClient.logo_url) ?? typedClient.logo_url;
  }

  const featureNames = new Map(features.map((f) => [f.id, f.name]));

  return {
    client: typedClient,
    subscriptions: (subsRes.data ?? []) as unknown as Subscription[],
    features,
    client_features: (cfRes.data ?? []) as unknown as ClientFeature[],
    tickets: ((ticketsRes.data ?? []) as unknown as Ticket[]).map((t) => ({
      ...t,
      feature_name: t.feature_id ? (featureNames.get(t.feature_id) ?? null) : null,
    })),
    audit: (auditRes.data ?? []) as unknown as AuditLog[],
  };
}

export async function fetchFeatureStats(db: Db): Promise<FeatureStat[]> {
  const [clients, features, clientFeatures, feedbackRes] = await Promise.all([
    fetchAllClients(db),
    fetchAllFeatures(db),
    fetchAllClientFeatures(db),
    db.from("feature_feedback").select("feature_id"),
  ]);
  throwIf(feedbackRes.error);
  const feedbackCounts = new Map<string, number>();
  for (const f of feedbackRes.data ?? []) {
    feedbackCounts.set(f.feature_id, (feedbackCounts.get(f.feature_id) ?? 0) + 1);
  }
  return computeFeatureStats(features, clientFeatures, clients, feedbackCounts).sort(
    (a, b) => b.adoption_rate - a.adoption_rate,
  );
}

export async function fetchFeatureDetail(db: Db, id: string): Promise<FeatureDetail> {
  const stats = await fetchFeatureStats(db);
  const feature = stats.find((f) => f.id === id);
  if (!feature) throw new Error("Feature not found");

  const [mediaRes, feedbackRes, notesRes, cfRes, clients, auditRes] = await Promise.all([
    db.from("feature_media").select("*").eq("feature_id", id).order("sort_order"),
    db.from("feature_feedback").select("*").eq("feature_id", id).order("created_at", { ascending: false }),
    db.from("feature_notes").select("*").eq("feature_id", id).order("created_at", { ascending: false }),
    db.from("client_features").select("*").eq("feature_id", id),
    fetchAllClients(db),
    db.from("audit_logs").select("*").eq("entity_type", "feature").eq("entity_id", id).order("created_at", { ascending: false }).limit(50),
  ]);
  throwIf(mediaRes.error);
  throwIf(feedbackRes.error);
  throwIf(notesRes.error);
  throwIf(cfRes.error);
  throwIf(auditRes.error);

  const media = (mediaRes.data ?? []) as unknown as FeatureMedia[];
  const signed = await signPaths(db, "feature-media", media.map((m) => m.url));
  const clientMap = new Map(clients.map((c) => [c.id, c]));

  return {
    feature,
    media: media.map((m) => ({ ...m, url: signed.get(m.url) ?? m.url })),
    feedback: ((feedbackRes.data ?? []) as unknown as FeatureFeedback[]).map((f) => ({
      ...f,
      client_name: f.client_id ? (clientMap.get(f.client_id)?.name ?? null) : null,
    })),
    notes: (notesRes.data ?? []) as unknown as FeatureNote[],
    client_features: ((cfRes.data ?? []) as unknown as ClientFeature[]).map((cf) => ({
      ...cf,
      client_name: clientMap.get(cf.client_id)?.name ?? "Unknown client",
      client_status: (clientMap.get(cf.client_id)?.status ?? "active") as Client["status"],
    })),
    audit: (auditRes.data ?? []) as unknown as AuditLog[],
  };
}

export async function fetchTickets(db: Db, filters?: { status?: string; client_id?: string }): Promise<Ticket[]> {
  let query = db.from("tickets").select("*").order("created_at", { ascending: false });
  if (filters?.status && filters.status !== "all") query = query.eq("status", filters.status);
  if (filters?.client_id) query = query.eq("client_id", filters.client_id);
  const { data, error } = await query;
  throwIf(error);

  const [clients, features] = await Promise.all([fetchAllClients(db), fetchAllFeatures(db)]);
  const clientNames = new Map(clients.map((c) => [c.id, c.name]));
  const featureNames = new Map(features.map((f) => [f.id, f.name]));

  return ((data ?? []) as unknown as Ticket[]).map((t) => ({
    ...t,
    client_name: clientNames.get(t.client_id) ?? "Unknown client",
    feature_name: t.feature_id ? (featureNames.get(t.feature_id) ?? null) : null,
  }));
}

export async function fetchTicketDetail(
  db: Db,
  id: string,
): Promise<{ ticket: Ticket; comments: TicketComment[]; attachments: TicketAttachment[] }> {
  const { data: ticket, error } = await db.from("tickets").select("*").eq("id", id).single();
  if (error || !ticket) throw new Error("Ticket not found");

  const [commentsRes, attachmentsRes, clients, features] = await Promise.all([
    db.from("ticket_comments").select("*").eq("ticket_id", id).order("created_at"),
    db.from("ticket_attachments").select("*").eq("ticket_id", id).order("created_at"),
    fetchAllClients(db),
    fetchAllFeatures(db),
  ]);
  throwIf(commentsRes.error);
  throwIf(attachmentsRes.error);

  const typed = ticket as unknown as Ticket;
  typed.client_name = clients.find((c) => c.id === typed.client_id)?.name ?? "Unknown client";
  typed.feature_name = typed.feature_id
    ? (features.find((f) => f.id === typed.feature_id)?.name ?? null)
    : null;

  const attachments = (attachmentsRes.data ?? []) as unknown as TicketAttachment[];
  const signed = await signPaths(db, "ticket-attachments", attachments.map((a) => a.url));

  return {
    ticket: typed,
    comments: (commentsRes.data ?? []) as unknown as TicketComment[],
    attachments: attachments.map((a) => ({ ...a, url: signed.get(a.url) ?? a.url })),
  };
}

export async function fetchAccountManagers(db: Db): Promise<AccountManagerWithStats[]> {
  const { data, error } = await db.from("account_managers").select("*").order("name");
  throwIf(error);
  const managers = (data ?? []) as unknown as AccountManager[];
  const [clients, clientFeatures] = await Promise.all([fetchAllClients(db), fetchAllClientFeatures(db)]);

  const signed = await signPaths(
    db,
    "client-logos",
    managers.map((m) => m.avatar_url).filter((u): u is string => Boolean(u)),
  );

  return managers.map((m) => {
    const mine = clients.filter((c) => c.account_manager_id === m.id && !c.archived_at);
    const myIds = new Set(mine.map((c) => c.id));
    return {
      ...m,
      avatar_url: m.avatar_url ? (signed.get(m.avatar_url) ?? m.avatar_url) : null,
      total_clients: mine.length,
      active_clients: mine.filter((c) => c.status !== "churned").length,
      churned_clients: mine.filter((c) => c.status === "churned").length,
      features_adopted: clientFeatures.filter((cf) => cf.enabled && myIds.has(cf.client_id)).length,
    };
  });
}

export async function fetchAuditLogs(db: Db, entityType: string, entityId?: string): Promise<AuditLog[]> {
  let query = db
    .from("audit_logs")
    .select("*")
    .eq("entity_type", entityType)
    .order("created_at", { ascending: false })
    .limit(100);
  if (entityId) query = query.eq("entity_id", entityId);
  const { data, error } = await query;
  throwIf(error);
  return (data ?? []) as unknown as AuditLog[];
}

export async function fetchPermissions(db: Db, userId: string) {
  const [{ data: isAdmin }, { data: userRoles }, { data: rolePerms }] = await Promise.all([
    db.rpc("has_role", { _user_id: userId, _role_name: "Admin" }),
    db.from("user_roles").select("role_id").eq("user_id", userId),
    db.from("role_permissions").select("*"),
  ]);
  const roleIds = new Set((userRoles ?? []).map((r) => r.role_id));
  const perms: Record<string, Record<string, boolean>> = {};
  for (const p of rolePerms ?? []) {
    if (!roleIds.has(p.role_id)) continue;
    const existing = perms[p.section] ?? { view: false, create: false, edit: false, delete: false };
    existing["view"] = existing["view"] || p.can_view;
    existing["create"] = existing["create"] || p.can_create;
    existing["edit"] = existing["edit"] || p.can_edit;
    existing["delete"] = existing["delete"] || p.can_delete;
    perms[p.section] = existing;
  }
  return { isAdmin: isAdmin === true, permissions: perms };
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function insertClient(
  db: Db,
  userId: string,
  input: z.infer<typeof clientInputSchema>,
): Promise<void> {
  await requirePermission(db, userId, "clients", "create");
  const { data, error } = await db
    .from("clients")
    .insert({
      name: input.name,
      owner_name: input.owner_name || null,
      phone: input.phone || null,
      city: input.city || null,
      logo_url: input.logo_url || null,
      country: input.country || null,
      currency: input.currency,
      industry: input.industry || null,
      plan: input.plan,
      status: input.status,
      customers_count: input.customers_count,
      health_score: input.health_score,
      account_manager_id: input.account_manager_id || null,
      ...(input.client_since ? { client_since: input.client_since } : {}),
      notes: input.notes || null,
    })
    .select("id")
    .single();
  throwIf(error);
  if (!data) throw new Error("Failed to create client");
  await audit(db, userId, {
    entity_type: "client",
    entity_id: data.id,
    entity_label: input.name,
    action: "Created",
    after: input as unknown as Json,
  });
}

export async function updateClient(
  db: Db,
  userId: string,
  input: z.infer<typeof updateClientSchema>,
): Promise<void> {
  await requirePermission(db, userId, "clients", "edit");
  const { data: before } = await db.from("clients").select("*").eq("id", input.id).single();
  const { id, ...fields } = input;
  const { error } = await db
    .from("clients")
    .update({
      name: fields.name,
      owner_name: fields.owner_name || null,
      phone: fields.phone || null,
      city: fields.city || null,
      logo_url: fields.logo_url || null,
      country: fields.country || null,
      currency: fields.currency,
      industry: fields.industry || null,
      plan: fields.plan,
      status: fields.status,
      customers_count: fields.customers_count,
      health_score: fields.health_score,
      account_manager_id: fields.account_manager_id || null,
      notes: fields.notes || null,
    })
    .eq("id", id);
  throwIf(error);
  await audit(db, userId, {
    entity_type: "client",
    entity_id: id,
    entity_label: input.name,
    action: before && before.status !== input.status ? `Status changed: ${before.status} → ${input.status}` : "Updated",
    before: before as unknown as Json,
    after: input as unknown as Json,
  });
}

export async function archiveClient(
  db: Db,
  userId: string,
  input: z.infer<typeof archiveClientSchema>,
): Promise<void> {
  await requirePermission(db, userId, "clients", "delete");
  const { data: client } = await db.from("clients").select("name").eq("id", input.id).single();
  const { error } = await db
    .from("clients")
    .update({ archived_at: input.archived ? new Date().toISOString() : null })
    .eq("id", input.id);
  throwIf(error);
  await audit(db, userId, {
    entity_type: "client",
    entity_id: input.id,
    entity_label: client?.name ?? "Client",
    action: input.archived ? "Archived" : "Restored",
  });
}

export async function insertFeature(
  db: Db,
  userId: string,
  input: z.infer<typeof featureInputSchema>,
): Promise<void> {
  await requirePermission(db, userId, "features", "create");
  const { data, error } = await db
    .from("features")
    .insert({
      name: input.name,
      category: input.category,
      status: input.status,
      description: input.description || null,
      release_version: input.release_version || null,
      release_date: input.release_date || null,
    })
    .select("id")
    .single();
  throwIf(error);
  if (!data) throw new Error("Failed to create feature");
  await audit(db, userId, {
    entity_type: "feature",
    entity_id: data.id,
    entity_label: input.name,
    action: input.status === "live" ? "Published" : "Created",
    after: input as unknown as Json,
  });
}

export async function updateFeature(
  db: Db,
  userId: string,
  input: z.infer<typeof updateFeatureSchema>,
): Promise<void> {
  await requirePermission(db, userId, "features", "edit");
  const { data: before } = await db.from("features").select("*").eq("id", input.id).single();
  const { id, ...fields } = input;
  const { error } = await db
    .from("features")
    .update({
      name: fields.name,
      category: fields.category,
      status: fields.status,
      description: fields.description || null,
      release_version: fields.release_version || null,
      release_date: fields.release_date || null,
    })
    .eq("id", id);
  throwIf(error);
  await audit(db, userId, {
    entity_type: "feature",
    entity_id: id,
    entity_label: input.name,
    action:
      before && before.status !== input.status
        ? `Status changed: ${before.status} → ${input.status}`
        : "Edited",
    before: before as unknown as Json,
    after: input as unknown as Json,
  });
}

export async function deleteFeature(db: Db, userId: string, id: string): Promise<void> {
  await requirePermission(db, userId, "features", "delete");
  const { data: feature } = await db.from("features").select("name").eq("id", id).single();
  const { error } = await db.from("features").delete().eq("id", id);
  throwIf(error);
  await audit(db, userId, {
    entity_type: "feature",
    entity_id: id,
    entity_label: feature?.name ?? "Feature",
    action: "Deleted",
  });
}

export async function upsertClientFeature(
  db: Db,
  userId: string,
  input: z.infer<typeof clientFeatureSchema>,
): Promise<void> {
  await requirePermission(db, userId, "features", "edit");
  const { data: existing } = await db
    .from("client_features")
    .select("*")
    .eq("client_id", input.client_id)
    .eq("feature_id", input.feature_id)
    .maybeSingle();
  const { error } = await db.from("client_features").upsert(
    {
      client_id: input.client_id,
      feature_id: input.feature_id,
      enabled: input.enabled,
      adoption_percent: input.adoption_percent,
    },
    { onConflict: "client_id,feature_id" },
  );
  throwIf(error);

  const [{ data: client }, { data: feature }] = await Promise.all([
    db.from("clients").select("name").eq("id", input.client_id).single(),
    db.from("features").select("name").eq("id", input.feature_id).single(),
  ]);
  await audit(db, userId, {
    entity_type: "feature",
    entity_id: input.feature_id,
    entity_label: feature?.name ?? "Feature",
    action: input.enabled
      ? `Enabled for ${client?.name ?? "client"} — ${input.adoption_percent}% adoption`
      : `Disabled for ${client?.name ?? "client"}`,
    before: existing as unknown as Json,
    after: input as unknown as Json,
  });
}

export async function insertSubscription(
  db: Db,
  userId: string,
  input: z.infer<typeof subscriptionInputSchema>,
): Promise<void> {
  await requirePermission(db, userId, "clients", "edit");
  const { data, error } = await db
    .from("subscriptions")
    .insert({
      client_id: input.client_id,
      product: input.product,
      plan: input.plan,
      customers_count: input.customers_count,
      monthly_amount: input.monthly_amount,
      started_at: input.started_at,
      status: "active",
    })
    .select("id")
    .single();
  throwIf(error);
  const { data: client } = await db.from("clients").select("name").eq("id", input.client_id).single();
  await audit(db, userId, {
    entity_type: "client",
    entity_id: input.client_id,
    entity_label: client?.name ?? "Client",
    action: `Subscription added: ${input.product} — ${input.plan} (${input.customers_count} customers)`,
    after: input as unknown as Json,
  });
}

export async function updateSubscription(
  db: Db,
  userId: string,
  input: z.infer<typeof updateSubscriptionSchema>,
): Promise<void> {
  await requirePermission(db, userId, "clients", "edit");
  const { data: before } = await db.from("subscriptions").select("*").eq("id", input.id).single();
  const { id, ...fields } = input;
  const { error } = await db
    .from("subscriptions")
    .update({
      product: fields.product,
      plan: fields.plan,
      customers_count: fields.customers_count,
      monthly_amount: fields.monthly_amount,
      started_at: fields.started_at,
    })
    .eq("id", id);
  throwIf(error);
  await audit(db, userId, {
    entity_type: "client",
    entity_id: input.client_id,
    entity_label: "Subscription",
    action: `Subscription updated: ${input.product} — ${input.plan}`,
    before: before as unknown as Json,
    after: input as unknown as Json,
  });
}

export async function deleteSubscription(db: Db, userId: string, id: string): Promise<void> {
  await requirePermission(db, userId, "clients", "delete");
  const { data: sub } = await db.from("subscriptions").select("*").eq("id", id).single();
  const { error } = await db.from("subscriptions").delete().eq("id", id);
  throwIf(error);
  await audit(db, userId, {
    entity_type: "client",
    entity_id: sub?.client_id ?? null,
    entity_label: "Subscription",
    action: `Subscription deleted: ${sub?.product ?? ""} — ${sub?.plan ?? ""}`,
    before: sub as unknown as Json,
  });
}

export async function updateSubscriptionStatus(
  db: Db,
  userId: string,
  input: z.infer<typeof subscriptionStatusSchema>,
): Promise<void> {
  await requirePermission(db, userId, "clients", "edit");
  const { data: sub, error: fetchError } = await db
    .from("subscriptions")
    .select("*")
    .eq("id", input.id)
    .single();
  if (fetchError || !sub) throw new Error("Subscription not found");

  const isChurn = CHURN_STATUSES.includes(input.status);
  const { error } = await db
    .from("subscriptions")
    .update({
      status: input.status,
      end_reason: isChurn || input.status === "paused" ? input.end_reason || null : null,
      ended_at: isChurn ? format(new Date(), "yyyy-MM-dd") : null,
    })
    .eq("id", input.id);
  throwIf(error);

  await audit(db, userId, {
    entity_type: "client",
    entity_id: sub.client_id,
    entity_label: "Subscription",
    action: `Subscription ${input.status}: ${sub.product} — ${sub.plan}${input.end_reason ? ` (${input.end_reason})` : ""}`,
    before: { status: sub.status },
    after: { status: input.status },
  });
}

export async function addMedia(
  db: Db,
  userId: string,
  input: z.infer<typeof mediaInputSchema>,
): Promise<void> {
  await requirePermission(db, userId, "features", "edit");
  const { error } = await db.from("feature_media").insert({
    feature_id: input.feature_id,
    media_type: input.media_type,
    url: input.url,
    caption: input.caption || null,
  });
  throwIf(error);
  await audit(db, userId, {
    entity_type: "feature",
    entity_id: input.feature_id,
    entity_label: "Media",
    action: `${input.media_type === "gif" ? "GIF" : input.media_type === "video" ? "Video" : "Image"} added`,
  });
}

export async function deleteMedia(db: Db, userId: string, id: string): Promise<void> {
  await requirePermission(db, userId, "features", "delete");
  const { data: media } = await db.from("feature_media").select("*").eq("id", id).single();
  const { error } = await db.from("feature_media").delete().eq("id", id);
  throwIf(error);
  if (media && !EXTERNAL_URL.test(media.url)) {
    await db.storage.from("feature-media").remove([media.url]);
  }
  await audit(db, userId, {
    entity_type: "feature",
    entity_id: media?.feature_id ?? null,
    entity_label: "Media",
    action: "Media deleted",
  });
}

export async function addFeedback(
  db: Db,
  userId: string,
  input: z.infer<typeof feedbackInputSchema>,
): Promise<void> {
  await requirePermission(db, userId, "features", "create");
  const name = await userName(db, userId);
  const { error } = await db.from("feature_feedback").insert({
    feature_id: input.feature_id,
    client_id: input.client_id || null,
    feedback: input.feedback,
    priority: input.priority,
    status: input.status,
    next_action: input.next_action || null,
    created_by: userId,
    created_by_name: name,
  });
  throwIf(error);
  await audit(db, userId, {
    entity_type: "feature",
    entity_id: input.feature_id,
    entity_label: "Feedback",
    action: "Feedback added",
    after: input as unknown as Json,
  });
}

export async function updateFeedback(
  db: Db,
  userId: string,
  input: z.infer<typeof updateFeedbackSchema>,
): Promise<void> {
  await requirePermission(db, userId, "features", "edit");
  const { data: before } = await db.from("feature_feedback").select("*").eq("id", input.id).single();
  const { id, ...fields } = input;
  const { error } = await db
    .from("feature_feedback")
    .update({
      client_id: fields.client_id || null,
      feedback: fields.feedback,
      priority: fields.priority,
      status: fields.status,
      next_action: fields.next_action || null,
    })
    .eq("id", id);
  throwIf(error);
  await audit(db, userId, {
    entity_type: "feature",
    entity_id: input.feature_id,
    entity_label: "Feedback",
    action: "Feedback updated",
    before: before as unknown as Json,
    after: input as unknown as Json,
  });
}

export async function deleteFeedback(db: Db, userId: string, id: string): Promise<void> {
  await requirePermission(db, userId, "features", "delete");
  const { data: feedback } = await db.from("feature_feedback").select("*").eq("id", id).single();
  const { error } = await db.from("feature_feedback").delete().eq("id", id);
  throwIf(error);
  await audit(db, userId, {
    entity_type: "feature",
    entity_id: feedback?.feature_id ?? null,
    entity_label: "Feedback",
    action: "Feedback deleted",
  });
}

export async function addNote(
  db: Db,
  userId: string,
  input: z.infer<typeof noteInputSchema>,
): Promise<void> {
  await requirePermission(db, userId, "features", "create");
  const name = await userName(db, userId);
  const { error } = await db.from("feature_notes").insert({
    feature_id: input.feature_id,
    note_type: input.note_type,
    content: input.content,
    created_by: userId,
    created_by_name: name,
  });
  throwIf(error);
  const label =
    input.note_type === "product_input"
      ? "Product input added"
      : input.note_type === "next_release"
        ? "Next release improvement added"
        : "Iteration note added";
  await audit(db, userId, {
    entity_type: "feature",
    entity_id: input.feature_id,
    entity_label: "Note",
    action: label,
  });
}

export async function deleteNote(db: Db, userId: string, id: string): Promise<void> {
  await requirePermission(db, userId, "features", "delete");
  const { data: note } = await db.from("feature_notes").select("*").eq("id", id).single();
  const { error } = await db.from("feature_notes").delete().eq("id", id);
  throwIf(error);
  await audit(db, userId, {
    entity_type: "feature",
    entity_id: note?.feature_id ?? null,
    entity_label: "Note",
    action: "Note deleted",
  });
}

export async function createTicket(
  db: Db,
  userId: string,
  input: z.infer<typeof ticketInputSchema>,
): Promise<void> {
  await requirePermission(db, userId, "tickets", "create");
  const { data, error } = await db
    .from("tickets")
    .insert({
      client_id: input.client_id,
      feature_id: input.feature_id || null,
      title: input.title,
      description: input.description || null,
      ticket_type: input.ticket_type,
      priority: input.priority,
      status: input.status,
      requested_by: input.requested_by || null,
      assigned_to: input.assigned_to || null,
      assigned_name: input.assigned_name || null,
      created_by: userId,
    })
    .select("id")
    .single();
  throwIf(error);
  if (!data) throw new Error("Failed to create ticket");
  await audit(db, userId, {
    entity_type: "ticket",
    entity_id: data.id,
    entity_label: input.title,
    action: "Created",
    after: input as unknown as Json,
  });
}

export async function updateTicket(
  db: Db,
  userId: string,
  input: z.infer<typeof updateTicketSchema>,
): Promise<void> {
  await requirePermission(db, userId, "tickets", "edit");
  const { data: before } = await db.from("tickets").select("*").eq("id", input.id).single();
  const { id, ...fields } = input;
  const { error } = await db
    .from("tickets")
    .update({
      client_id: fields.client_id,
      feature_id: fields.feature_id || null,
      title: fields.title,
      description: fields.description || null,
      ticket_type: fields.ticket_type,
      priority: fields.priority,
      status: fields.status,
      requested_by: fields.requested_by || null,
      assigned_to: fields.assigned_to || null,
      assigned_name: fields.assigned_name || null,
    })
    .eq("id", id);
  throwIf(error);
  await audit(db, userId, {
    entity_type: "ticket",
    entity_id: id,
    entity_label: input.title,
    action:
      before && before.status !== input.status
        ? `Status changed: ${before.status} → ${input.status}`
        : "Updated",
    before: before as unknown as Json,
    after: input as unknown as Json,
  });
}

export async function updateTicketStatus(
  db: Db,
  userId: string,
  input: z.infer<typeof ticketStatusSchema>,
): Promise<void> {
  await requirePermission(db, userId, "tickets", "edit");
  const { data: before } = await db.from("tickets").select("status, title").eq("id", input.id).single();
  const { error } = await db.from("tickets").update({ status: input.status }).eq("id", input.id);
  throwIf(error);
  await audit(db, userId, {
    entity_type: "ticket",
    entity_id: input.id,
    entity_label: before?.title ?? "Ticket",
    action:
      input.status === "resolved"
        ? "Resolved"
        : input.status === "rejected"
          ? "Rejected"
          : `Status changed: ${before?.status ?? "?"} → ${input.status}`,
    before: { status: before?.status ?? null },
    after: { status: input.status },
  });
}

export async function deleteTicket(db: Db, userId: string, id: string): Promise<void> {
  await requirePermission(db, userId, "tickets", "delete");
  const { data: ticket } = await db.from("tickets").select("title").eq("id", id).single();
  const { error } = await db.from("tickets").delete().eq("id", id);
  throwIf(error);
  await audit(db, userId, {
    entity_type: "ticket",
    entity_id: id,
    entity_label: ticket?.title ?? "Ticket",
    action: "Deleted",
  });
}

export async function addComment(
  db: Db,
  userId: string,
  input: z.infer<typeof commentInputSchema>,
): Promise<void> {
  await requirePermission(db, userId, "tickets", "create");
  const name = await userName(db, userId);
  const { error } = await db.from("ticket_comments").insert({
    ticket_id: input.ticket_id,
    user_id: userId,
    user_name: name,
    content: input.content,
  });
  throwIf(error);
  await audit(db, userId, {
    entity_type: "ticket",
    entity_id: input.ticket_id,
    entity_label: "Comment",
    action: "Comment added",
  });
}

export async function deleteComment(db: Db, userId: string, id: string): Promise<void> {
  await requirePermission(db, userId, "tickets", "delete");
  const { error } = await db.from("ticket_comments").delete().eq("id", id);
  throwIf(error);
}

export async function addAttachment(
  db: Db,
  userId: string,
  input: z.infer<typeof attachmentInputSchema>,
): Promise<void> {
  await requirePermission(db, userId, "tickets", "create");
  const { error } = await db.from("ticket_attachments").insert({
    ticket_id: input.ticket_id,
    file_name: input.file_name || null,
    url: input.url,
  });
  throwIf(error);
}

export async function deleteAttachment(db: Db, userId: string, id: string): Promise<void> {
  await requirePermission(db, userId, "tickets", "delete");
  const { data: attachment } = await db
    .from("ticket_attachments")
    .select("*")
    .eq("id", id)
    .single();
  const { error } = await db.from("ticket_attachments").delete().eq("id", id);
  throwIf(error);
  if (attachment && !EXTERNAL_URL.test(attachment.url)) {
    await db.storage.from("ticket-attachments").remove([attachment.url]);
  }
}

export async function insertAccountManager(
  db: Db,
  userId: string,
  input: z.infer<typeof accountManagerInputSchema>,
): Promise<void> {
  await requirePermission(db, userId, "account_managers", "create");
  const { data, error } = await db
    .from("account_managers")
    .insert({
      name: input.name,
      email: input.email || null,
      phone: input.phone || null,
      avatar_url: input.avatar_url || null,
      satisfaction: input.satisfaction,
      notes: input.notes || null,
    })
    .select("id")
    .single();
  throwIf(error);
  if (!data) throw new Error("Failed to create account manager");
  await audit(db, userId, {
    entity_type: "account_manager",
    entity_id: data.id,
    entity_label: input.name,
    action: "Created",
    after: input as unknown as Json,
  });
}

export async function updateAccountManager(
  db: Db,
  userId: string,
  input: z.infer<typeof updateAccountManagerSchema>,
): Promise<void> {
  await requirePermission(db, userId, "account_managers", "edit");
  const { data: before } = await db.from("account_managers").select("*").eq("id", input.id).single();
  const { id, ...fields } = input;
  const { error } = await db
    .from("account_managers")
    .update({
      name: fields.name,
      email: fields.email || null,
      phone: fields.phone || null,
      avatar_url: fields.avatar_url || null,
      satisfaction: fields.satisfaction,
      notes: fields.notes || null,
    })
    .eq("id", id);
  throwIf(error);
  await audit(db, userId, {
    entity_type: "account_manager",
    entity_id: id,
    entity_label: input.name,
    action: "Updated",
    before: before as unknown as Json,
    after: input as unknown as Json,
  });
}

export async function deleteAccountManager(db: Db, userId: string, id: string): Promise<void> {
  await requirePermission(db, userId, "account_managers", "delete");
  const { data: manager } = await db.from("account_managers").select("name").eq("id", id).single();
  const { error } = await db.from("account_managers").delete().eq("id", id);
  throwIf(error);
  await audit(db, userId, {
    entity_type: "account_manager",
    entity_id: id,
    entity_label: manager?.name ?? "Account manager",
    action: "Deleted",
  });
}
