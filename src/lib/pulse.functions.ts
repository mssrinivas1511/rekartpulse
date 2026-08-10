import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  accountManagerInputSchema,
  archiveClientSchema,
  archiveClient,
  attachmentInputSchema,
  auditFilterSchema,
  clientFeatureSchema,
  clientInputSchema,
  commentInputSchema,
  createTicket,
  deleteAccountManager,
  deleteAttachment,
  deleteComment,
  deleteFeature,
  deleteFeedback,
  deleteMedia,
  deleteNote,
  deleteSubscription,
  deleteTicket,
  addAttachment,
  addComment,
  addFeedback,
  addMedia,
  addNote,
  fetchAccountManagers,
  fetchAuditLogs,
  fetchClientDetail,
  fetchClients,
  fetchDashboard,
  fetchFeatureDetail,
  fetchFeatureStats,
  fetchPermissions,
  fetchTicketDetail,
  fetchTickets,
  featureInputSchema,
  feedbackInputSchema,
  idSchema,
  insertAccountManager,
  insertClient,
  insertFeature,
  insertSubscription,
  mediaInputSchema,
  noteInputSchema,
  searchSchema,
  subscriptionInputSchema,
  subscriptionStatusSchema,
  ticketFilterSchema,
  ticketInputSchema,
  ticketStatusSchema,
  updateAccountManager,
  updateAccountManagerSchema,
  updateClient,
  updateClientSchema,
  updateFeature,
  updateFeatureSchema,
  updateFeedback,
  updateFeedbackSchema,
  updateSubscription,
  updateSubscriptionSchema,
  updateSubscriptionStatus,
  updateTicket,
  updateTicketSchema,
  updateTicketStatus,
  upsertClientFeature,
} from "./pulse.server";

// Reads
export const getDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(({ context }) => fetchDashboard(context.supabase));

export const getClients = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => searchSchema.parse(data ?? {}))
  .handler(({ data, context }) => fetchClients(context.supabase, data.search));

export const getClientDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => idSchema.parse(data))
  .handler(({ data, context }) => fetchClientDetail(context.supabase, data.id));

export const getFeatureStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(({ context }) => fetchFeatureStats(context.supabase));

export const getFeatureDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => idSchema.parse(data))
  .handler(({ data, context }) => fetchFeatureDetail(context.supabase, data.id));

export const getTickets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => ticketFilterSchema.parse(data ?? {}))
  .handler(({ data, context }) => fetchTickets(context.supabase, data));

export const getTicketDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => idSchema.parse(data))
  .handler(({ data, context }) => fetchTicketDetail(context.supabase, data.id));

export const getAccountManagers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(({ context }) => fetchAccountManagers(context.supabase));

export const getAuditLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => auditFilterSchema.parse(data))
  .handler(({ data, context }) => fetchAuditLogs(context.supabase, data.entity_type, data.entity_id));

export const getMyPermissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(({ context }) => fetchPermissions(context.supabase, context.userId));

// Client mutations
export const createClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => clientInputSchema.parse(data))
  .handler(({ data, context }) => insertClient(context.supabase, context.userId, data));

export const editClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => updateClientSchema.parse(data))
  .handler(({ data, context }) => updateClient(context.supabase, context.userId, data));

export const setClientArchived = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => archiveClientSchema.parse(data))
  .handler(({ data, context }) => archiveClient(context.supabase, context.userId, data));

// Feature mutations
export const createFeature = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => featureInputSchema.parse(data))
  .handler(({ data, context }) => insertFeature(context.supabase, context.userId, data));

export const editFeature = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => updateFeatureSchema.parse(data))
  .handler(({ data, context }) => updateFeature(context.supabase, context.userId, data));

export const removeFeature = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => idSchema.parse(data))
  .handler(({ data, context }) => deleteFeature(context.supabase, context.userId, data.id));

export const setClientFeature = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => clientFeatureSchema.parse(data))
  .handler(({ data, context }) => upsertClientFeature(context.supabase, context.userId, data));

// Media / feedback / notes
export const createMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => mediaInputSchema.parse(data))
  .handler(({ data, context }) => addMedia(context.supabase, context.userId, data));

export const removeMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => idSchema.parse(data))
  .handler(({ data, context }) => deleteMedia(context.supabase, context.userId, data.id));

export const createFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => feedbackInputSchema.parse(data))
  .handler(({ data, context }) => addFeedback(context.supabase, context.userId, data));

export const editFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => updateFeedbackSchema.parse(data))
  .handler(({ data, context }) => updateFeedback(context.supabase, context.userId, data));

export const removeFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => idSchema.parse(data))
  .handler(({ data, context }) => deleteFeedback(context.supabase, context.userId, data.id));

export const createNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => noteInputSchema.parse(data))
  .handler(({ data, context }) => addNote(context.supabase, context.userId, data));

export const removeNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => idSchema.parse(data))
  .handler(({ data, context }) => deleteNote(context.supabase, context.userId, data.id));

// Subscription mutations
export const createSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => subscriptionInputSchema.parse(data))
  .handler(({ data, context }) => insertSubscription(context.supabase, context.userId, data));

export const editSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => updateSubscriptionSchema.parse(data))
  .handler(({ data, context }) => updateSubscription(context.supabase, context.userId, data));

export const removeSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => idSchema.parse(data))
  .handler(({ data, context }) => deleteSubscription(context.supabase, context.userId, data.id));

export const setSubscriptionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => subscriptionStatusSchema.parse(data))
  .handler(({ data, context }) => updateSubscriptionStatus(context.supabase, context.userId, data));

// Ticket mutations
export const createTicketFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => ticketInputSchema.parse(data))
  .handler(({ data, context }) => createTicket(context.supabase, context.userId, data));

export const editTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => updateTicketSchema.parse(data))
  .handler(({ data, context }) => updateTicket(context.supabase, context.userId, data));

export const setTicketStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => ticketStatusSchema.parse(data))
  .handler(({ data, context }) => updateTicketStatus(context.supabase, context.userId, data));

export const removeTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => idSchema.parse(data))
  .handler(({ data, context }) => deleteTicket(context.supabase, context.userId, data.id));

export const createComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => commentInputSchema.parse(data))
  .handler(({ data, context }) => addComment(context.supabase, context.userId, data));

export const removeComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => idSchema.parse(data))
  .handler(({ data, context }) => deleteComment(context.supabase, context.userId, data.id));

export const createAttachment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => attachmentInputSchema.parse(data))
  .handler(({ data, context }) => addAttachment(context.supabase, context.userId, data));

export const removeAttachment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => idSchema.parse(data))
  .handler(({ data, context }) => deleteAttachment(context.supabase, context.userId, data.id));

// Account manager mutations
export const createAccountManager = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => accountManagerInputSchema.parse(data))
  .handler(({ data, context }) => insertAccountManager(context.supabase, context.userId, data));

export const editAccountManager = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => updateAccountManagerSchema.parse(data))
  .handler(({ data, context }) => updateAccountManager(context.supabase, context.userId, data));

export const removeAccountManager = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => idSchema.parse(data))
  .handler(({ data, context }) => deleteAccountManager(context.supabase, context.userId, data.id));
