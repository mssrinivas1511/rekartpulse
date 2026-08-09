import { createServerFn } from "@tanstack/react-start";
import {
  activityInputSchema,
  clientFeatureSchema,
  clientInputSchema,
  featureInputSchema,
  featureStatusSchema,
  fetchActivity,
  fetchClientDetail,
  fetchClients,
  fetchDashboard,
  fetchFeatureStats,
  fetchSubscriptions,
  idSchema,
  insertActivity,
  insertClient,
  insertFeature,
  insertSubscription,
  searchSchema,
  statusFilterSchema,
  subscriptionInputSchema,
  subscriptionStatusSchema,
  updateClient,
  updateClientSchema,
  updateFeatureStatus,
  updateSubscriptionStatus,
  upsertClientFeature,
} from "./pulse.server";

// Reads
export const getDashboard = createServerFn({ method: "GET" }).handler(() => fetchDashboard());

export const getClients = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => searchSchema.parse(data ?? {}))
  .handler(({ data }) => fetchClients(data.search));

export const getClientDetail = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => idSchema.parse(data))
  .handler(({ data }) => fetchClientDetail(data.id));

export const getFeatureStats = createServerFn({ method: "GET" }).handler(() => fetchFeatureStats());

export const getSubscriptions = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => statusFilterSchema.parse(data ?? {}))
  .handler(({ data }) => fetchSubscriptions(data.status));

export const getActivity = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => statusFilterSchema.parse(data ?? {}))
  .handler(({ data }) => fetchActivity(data.status));

// Mutations
export const createClient = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => clientInputSchema.parse(data))
  .handler(({ data }) => insertClient(data));

export const editClient = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => updateClientSchema.parse(data))
  .handler(({ data }) => updateClient(data));

export const createFeature = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => featureInputSchema.parse(data))
  .handler(({ data }) => insertFeature(data));

export const setFeatureStatus = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => featureStatusSchema.parse(data))
  .handler(({ data }) => updateFeatureStatus(data));

export const setClientFeature = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => clientFeatureSchema.parse(data))
  .handler(({ data }) => upsertClientFeature(data));

export const createSubscription = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => subscriptionInputSchema.parse(data))
  .handler(({ data }) => insertSubscription(data));

export const setSubscriptionStatus = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => subscriptionStatusSchema.parse(data))
  .handler(({ data }) => updateSubscriptionStatus(data));

export const logActivity = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => activityInputSchema.parse(data))
  .handler(({ data }) => insertActivity(data));
