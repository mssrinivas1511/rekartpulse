export type ClientStatus = "active" | "trial" | "paid" | "churned";
export type FeatureStatus = "planned" | "in_development" | "live" | "deprecated";
export type SubscriptionStatus = "active" | "paused" | "stopped" | "completed" | "ended";
export type TicketStatus = "open" | "in_progress" | "resolved" | "rejected" | "need_info";
export type TicketType = "bug" | "feature_request" | "improvement" | "clarification" | "support";
export type Priority = "low" | "medium" | "high" | "critical";
export type FeedbackStatus = "new" | "in_review" | "planned" | "done" | "rejected";
export type NoteType = "product_input" | "iteration" | "next_release";
export type MediaType = "image" | "gif" | "video";

export type Section =
  | "dashboard"
  | "clients"
  | "features"
  | "tickets"
  | "account_managers"
  | "settings";
export type PermAction = "view" | "create" | "edit" | "delete";

export const SECTIONS: Section[] = [
  "dashboard",
  "clients",
  "features",
  "tickets",
  "account_managers",
  "settings",
];

export const CHURN_STATUSES: SubscriptionStatus[] = ["stopped", "completed", "ended"];

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  country_code: string;
  country: string;
  currency: string;
  avatar_url: string | null;
  created_at: string;
}

export interface Role {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
}

export interface RolePermission {
  id: string;
  role_id: string;
  section: Section;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export interface TeamMember extends Profile {
  email?: string | undefined;
  role_ids: string[];
  role_names: string[];
}

export interface Client {
  id: string;
  name: string;
  owner_name: string | null;
  phone: string | null;
  city: string | null;
  logo_url: string | null;
  country: string | null;
  currency: string;
  industry: string | null;
  plan: string;
  status: ClientStatus;
  customers_count: number;
  monthly_revenue: number;
  health_score: number;
  account_manager_id: string | null;
  client_since: string;
  notes: string | null;
  archived_at: string | null;
  onboarded_at: string;
  created_at: string;
}

export interface Feature {
  id: string;
  name: string;
  category: string;
  status: FeatureStatus;
  description: string | null;
  release_version: string | null;
  release_date: string | null;
  created_at: string;
}

export interface ClientFeature {
  id: string;
  client_id: string;
  feature_id: string;
  enabled: boolean;
  adoption_percent: number;
  enabled_at: string;
}

export interface Subscription {
  id: string;
  client_id: string;
  product: string;
  plan: string;
  status: SubscriptionStatus;
  customers_count: number;
  monthly_amount: number;
  started_at: string;
  ended_at: string | null;
  end_reason: string | null;
  created_at: string;
  client_name?: string;
}

export interface FeatureMedia {
  id: string;
  feature_id: string;
  media_type: MediaType;
  url: string;
  caption: string | null;
  sort_order: number;
  created_at: string;
}

export interface FeatureFeedback {
  id: string;
  feature_id: string;
  client_id: string | null;
  feedback: string;
  priority: Priority;
  status: FeedbackStatus;
  next_action: string | null;
  created_by_name: string;
  created_at: string;
  updated_at: string;
  client_name?: string | null;
  feature_name?: string | null;
}

export interface FeatureNote {
  id: string;
  feature_id: string;
  note_type: NoteType;
  content: string;
  created_by_name: string;
  created_at: string;
}

export interface Ticket {
  id: string;
  client_id: string;
  feature_id: string | null;
  title: string;
  description: string | null;
  ticket_type: TicketType;
  priority: Priority;
  status: TicketStatus;
  requested_by: string | null;
  assigned_to: string | null;
  assigned_name: string | null;
  created_at: string;
  updated_at: string;
  client_name?: string;
  feature_name?: string | null;
}

export interface TicketComment {
  id: string;
  ticket_id: string;
  user_name: string;
  content: string;
  created_at: string;
}

export interface TicketAttachment {
  id: string;
  ticket_id: string;
  file_name: string | null;
  url: string;
  created_at: string;
}

export interface AccountManager {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  satisfaction: number;
  notes: string | null;
  created_at: string;
}

export interface AccountManagerWithStats extends AccountManager {
  total_clients: number;
  active_clients: number;
  churned_clients: number;
  features_adopted: number;
}

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface AuditLog {
  id: string;
  entity_type: string;
  entity_id: string | null;
  entity_label: string | null;
  user_name: string;
  action: string;
  before_value: Json;
  after_value: Json;
  created_at: string;
}

export interface FeatureStat extends Feature {
  eligible_clients: number;
  clients_enabled: number;
  clients_using: number;
  avg_adoption: number;
  adoption_rate: number;
  feedback_count: number;
  customers_reached: number;
}

export interface ClientWithMeta extends Client {
  features_enabled: number;
  account_manager_name?: string | null;
}

export interface DashboardData {
  stats: {
    features_live: number;
    features_planned: number;
    features_in_development: number;
    total_features: number;
    clients_using_features: number;
    total_feedback: number;
    avg_adoption_rate: number;
    active_clients: number;
    trial_clients: number;
    paid_clients: number;
    churned_clients: number;
    churn_rate: number;
    new_clients_this_month: number;
    trial_to_paid: number;
    open_tickets: number;
  };
  churn_by_month: { month: string; count: number }[];
  feature_stats: FeatureStat[];
  recent_feedback: FeatureFeedback[];
}

export interface ClientDetail {
  client: Client;
  subscriptions: Subscription[];
  features: Feature[];
  client_features: ClientFeature[];
  tickets: Ticket[];
  audit: AuditLog[];
}

export interface FeatureDetail {
  feature: FeatureStat;
  media: FeatureMedia[];
  feedback: FeatureFeedback[];
  notes: FeatureNote[];
  client_features: (ClientFeature & { client_name: string; client_status: ClientStatus })[];
  audit: AuditLog[];
}
