import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { SECTIONS, type Profile, type Role, type RolePermission, type TeamMember } from "./types";

type Db = SupabaseClient<Database>;

const profileInputSchema = z.object({
  full_name: z.string().min(1),
  phone: z.string().nullable().optional(),
  country: z.string().min(1),
  country_code: z.string().min(1),
  currency: z.string().min(1),
});

const inviteSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  full_name: z.string().min(1),
  country: z.string().optional(),
  role_ids: z.array(z.string()).default([]),
});

const avatarSchema = z.object({ avatar_url: z.string().nullable() });

async function signAvatars(db: Db, paths: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const internal = paths.filter((p) => p && !/^https?:\/\//.test(p));
  for (const p of paths) if (/^https?:\/\//.test(p)) map.set(p, p);
  if (internal.length === 0) return map;
  const { data } = await db.storage.from("avatars").createSignedUrls(internal, 3600);
  const base = process.env["SUPABASE_URL"] ?? "";
  for (const row of data ?? []) {
    if (row.path && row.signedUrl) {
      map.set(row.path, row.signedUrl.startsWith("/") && base ? `${base}${row.signedUrl}` : row.signedUrl);
    }
  }
  return map;
}

const memberRolesSchema = z.object({ user_id: z.string(), role_ids: z.array(z.string()) });
const userIdSchema = z.object({ user_id: z.string() });
const roleInputSchema = z.object({ name: z.string().min(1), description: z.string().optional() });
const roleIdSchema = z.object({ role_id: z.string() });
const rolePermissionsSchema = z.object({
  role_id: z.string(),
  permissions: z.array(
    z.object({
      section: z.enum(SECTIONS as [string, ...string[]]),
      can_view: z.boolean(),
      can_create: z.boolean(),
      can_edit: z.boolean(),
      can_delete: z.boolean(),
    }),
  ),
});

async function requireAdmin(db: Db, userId: string): Promise<void> {
  const { data, error } = await db.rpc("has_role", { _user_id: userId, _role_name: "Admin" });
  if (error) throw new Error(error.message);
  if (data !== true) throw new Error("Only Admins can manage team settings.");
}

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Profile | null> => {
    const { data } = await context.supabase
      .from("profiles")
      .select("*")
      .eq("id", context.userId)
      .maybeSingle();
    const profile = (data as unknown as Profile | null) ?? null;
    if (!profile) return null;
    if (profile.avatar_url) {
      const signed = await signAvatars(context.supabase, [profile.avatar_url]);
      return { ...profile, avatar_url: signed.get(profile.avatar_url) ?? profile.avatar_url };
    }
    return profile;
  });

export const setMyAvatar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => avatarSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ avatar_url: data.avatar_url })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => profileInputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({
        full_name: data.full_name,
        phone: data.phone || null,
        country: data.country,
        country_code: data.country_code,
        currency: data.currency,
      })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
  });

export const getTeamData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [profilesRes, rolesRes, userRolesRes, permsRes, authUsers] = await Promise.all([
      supabaseAdmin.from("profiles").select("*").order("created_at"),
      supabaseAdmin.from("roles").select("*").order("name"),
      supabaseAdmin.from("user_roles").select("*"),
      supabaseAdmin.from("role_permissions").select("*"),
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 500 }),
    ]);
    if (profilesRes.error) throw new Error(profilesRes.error.message);
    if (rolesRes.error) throw new Error(rolesRes.error.message);
    if (userRolesRes.error) throw new Error(userRolesRes.error.message);
    if (permsRes.error) throw new Error(permsRes.error.message);

    const emails = new Map((authUsers.data?.users ?? []).map((u) => [u.id, u.email ?? ""]));
    const roleNames = new Map((rolesRes.data ?? []).map((r) => [r.id as string, r.name as string]));

    const profiles = (profilesRes.data ?? []) as unknown as Profile[];
    const signedAvatars = await signAvatars(
      supabaseAdmin as unknown as Db,
      profiles.map((p) => p.avatar_url).filter((u): u is string => Boolean(u)),
    );

    const members: TeamMember[] = profiles.map((p) => {
      const roleIds = (userRolesRes.data ?? [])
        .filter((ur) => ur.user_id === p.id)
        .map((ur) => ur.role_id as string);
      return {
        ...p,
        avatar_url: p.avatar_url ? (signedAvatars.get(p.avatar_url) ?? p.avatar_url) : null,
        email: emails.get(p.id) ?? undefined,
        role_ids: roleIds,
        role_names: roleIds.map((id) => roleNames.get(id) ?? "Unknown"),
      };
    });

    return {
      members,
      roles: (rolesRes.data ?? []) as unknown as Role[],
      permissions: (permsRes.data ?? []) as unknown as RolePermission[],
    };
  });

export const inviteTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inviteSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name, country: data.country ?? "India" },
    });
    if (error) throw new Error(error.message);
    if (!created.user) throw new Error("Failed to create user");

    await supabaseAdmin.from("profiles").upsert({
      id: created.user.id,
      full_name: data.full_name,
      country: data.country ?? "India",
    });

    if (data.role_ids.length > 0) {
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .insert(data.role_ids.map((role_id) => ({ user_id: created.user.id, role_id })));
      if (roleError) throw new Error(roleError.message);
    }
  });

export const setMemberRoles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => memberRolesSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: delError } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.user_id);
    if (delError) throw new Error(delError.message);
    if (data.role_ids.length > 0) {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .insert(data.role_ids.map((role_id) => ({ user_id: data.user_id, role_id })));
      if (error) throw new Error(error.message);
    }
  });

export const removeTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => userIdSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    if (data.user_id === context.userId) throw new Error("You can't remove your own account.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);
  });

export const createRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => roleInputSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("roles")
      .insert({ name: data.name, description: data.description || null });
    if (error) throw new Error(error.message);
  });

export const deleteRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => roleIdSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: role } = await supabaseAdmin
      .from("roles")
      .select("is_system")
      .eq("id", data.role_id)
      .single();
    if (role?.is_system) throw new Error("System roles can't be deleted.");
    const { error } = await supabaseAdmin.from("roles").delete().eq("id", data.role_id);
    if (error) throw new Error(error.message);
  });

export const saveRolePermissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => rolePermissionsSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: delError } = await supabaseAdmin
      .from("role_permissions")
      .delete()
      .eq("role_id", data.role_id);
    if (delError) throw new Error(delError.message);
    if (data.permissions.length > 0) {
      const { error } = await supabaseAdmin.from("role_permissions").insert(
        data.permissions.map((p) => ({
          role_id: data.role_id,
          section: p.section,
          can_view: p.can_view,
          can_create: p.can_create,
          can_edit: p.can_edit,
          can_delete: p.can_delete,
        })),
      );
      if (error) throw new Error(error.message);
    }
  });
