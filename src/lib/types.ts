export type ClientStatus = "active" | "at_risk" | "churned";
export type FeatureStatus = "hit" | "stable" | "declining";
export type SubscriptionStatus = "active" | "paused" | "stopped" | "completed" | "ended";
export type EventType = "general" | "churn" | "payment" | "feature" | "risk" | "issue";

export const CHURN_STATUSES: SubscriptionStatus[] = ["stopped", "completed", "ended"];

export interface Client {
  id: string;
  name: string;
  owner_name: string | null;
  phone: string | null;
  city: string | null;
  plan: string;
  status: ClientStatus;
  customers_count: number;
  monthly_revenue: number;
  health_score: number;
  onboarded_at: string;
  created_at: string;
}

export interface Feature {
  id: string;
  name: string;
  category: string;
  status: FeatureStatus;
  description: string | null;
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
  plan: string;
  status: SubscriptionStatus;
  monthly_amount: number;
  started_at: string;
  ended_at: string | null;
  end_reason: string | null;
  created_at: string;
  client_name?: string;
}

export interface ActivityEntry {
  id: string;
  client_id: string | null;
  feature_id: string | null;
  operator: string;
  event_type: EventType;
  description: string;
  created_at: string;
  client_name?: string | null;
  feature_name?: string | null;
}

export interface FeatureStat extends Feature {
  clients_enabled: number;
  avg_adoption: number;
  customers_reached: number;
}

export interface ClientWithMeta extends Client {
  features_enabled: number;
}

export interface DashboardData {
  stats: {
    active_clients: number;
    at_risk_clients: number;
    churned_clients: number;
    total_mrr: number;
    churn_rate: number;
    avg_adoption: number;
    features_live: number;
  };
  churn_by_month: { month: string; count: number }[];
  feature_stats: FeatureStat[];
  at_risk: ClientWithMeta[];
  recent_activity: ActivityEntry[];
}

export interface ClientDetail {
  client: Client;
  subscriptions: Subscription[];
  activity: ActivityEntry[];
  features: Feature[];
  client_features: ClientFeature[];
}
