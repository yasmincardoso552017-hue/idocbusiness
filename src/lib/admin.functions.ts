import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Acesso restrito ao administrador master.");
}

export type AdminUser = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  plan: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  confirmed: boolean;
  blocked: boolean;
  admin: boolean;
  companies: number;
  documents: number;
};

/** Lista todos os cadastros do SaaS com estatísticas. */
export const listPlatformUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ users: AdminUser[] }> => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const users: AdminUser[] = [];
    let page = 1;
    for (;;) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw new Error(error.message);
      const [profiles, roles, companies, docs] = await Promise.all([
        supabaseAdmin.from("profiles").select("id, full_name, phone, plan, blocked, email"),
        supabaseAdmin.from("user_roles").select("user_id, role"),
        supabaseAdmin.from("companies").select("owner_id"),
        supabaseAdmin.from("documents").select("owner_id"),
      ]);
      const pMap = new Map((profiles.data ?? []).map((p) => [p.id, p]));
      const adminIds = new Set(
        (roles.data ?? []).filter((r) => r.role === "admin").map((r) => r.user_id),
      );
      const count = (rows: { owner_id: string }[] | null, id: string) =>
        (rows ?? []).filter((r) => r.owner_id === id).length;

      for (const u of data.users) {
        const p = pMap.get(u.id);
        users.push({
          id: u.id,
          email: u.email ?? p?.email ?? null,
          full_name: p?.full_name ?? ((u.user_metadata?.["full_name"] as string) ?? null),
          phone: p?.phone ?? null,
          plan: p?.plan ?? "free",
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at ?? null,
          confirmed: Boolean(u.email_confirmed_at),
          blocked: Boolean(p?.blocked) || Boolean((u as { banned_until?: string }).banned_until),
          admin: adminIds.has(u.id),
          companies: count(companies.data as never, u.id),
          documents: count(docs.data as never, u.id),
        });
      }
      if (data.users.length < 200) break;
      page += 1;
    }
    users.sort((a, b) => b.created_at.localeCompare(a.created_at));
    return { users };
  });

/** Bloqueia ou libera o acesso de um usuário. */
export const setUserBlocked = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid(), blocked: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    if (data.userId === context.userId) throw new Error("Você não pode bloquear a própria conta.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      ban_duration: data.blocked ? "876000h" : "none",
    });
    if (error) throw new Error(error.message);
    await supabaseAdmin
      .from("profiles")
      .update({ blocked: data.blocked, blocked_at: data.blocked ? new Date().toISOString() : null })
      .eq("id", data.userId);
    return { ok: true };
  });

/** Cria um novo usuário já confirmado. */
export const createPlatformUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        email: z.string().email(),
        password: z.string().min(6),
        fullName: z.string().min(2),
        phone: z.string().optional(),
        admin: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email.toLowerCase(),
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName, phone: data.phone ?? null },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Falha ao criar usuário");
    await supabaseAdmin.from("profiles").upsert({
      id: created.user.id,
      email: data.email.toLowerCase(),
      full_name: data.fullName,
      phone: data.phone ?? null,
    });
    if (data.admin) {
      await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: created.user.id, role: "admin" }, { onConflict: "user_id,role" });
    }
    return { id: created.user.id };
  });

/** Concede ou remove o papel de administrador. */
export const setUserAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid(), admin: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.admin) {
      await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: data.userId, role: "admin" }, { onConflict: "user_id,role" });
    } else {
      if (data.userId === context.userId) throw new Error("Não remova o próprio acesso master.");
      await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId).eq("role", "admin");
    }
    return { ok: true };
  });

/** Envia e-mail de redefinição de senha para o usuário. */
export const resetUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid(), password: z.string().min(6) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: data.password,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
