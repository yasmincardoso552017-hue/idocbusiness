import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Chave pública para registrar dispositivos em notificações push. */
export const getPushKey = createServerFn({ method: "GET" }).handler(async () => ({
  publicKey: process.env["VAPID_PUBLIC_KEY"] ?? null,
}));

/** Registra o dispositivo atual para receber notificações push. */
export const savePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        endpoint: z.string().url(),
        p256dh: z.string().min(10),
        auth: z.string().min(5),
        userAgent: z.string().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("push_subscriptions").upsert(
      {
        user_id: context.userId,
        email: (context.claims as { email?: string })?.email?.toLowerCase() ?? null,
        endpoint: data.endpoint,
        p256dh: data.p256dh,
        auth: data.auth,
        user_agent: data.userAgent ?? null,
      },
      { onConflict: "endpoint" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Cria um lembrete agendado para um signatário ou para o próprio usuário. */
export const createReminder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        title: z.string().min(2),
        body: z.string().optional(),
        dueAt: z.string(),
        targetEmail: z.string().email().optional(),
        documentId: z.string().uuid().optional(),
        contractId: z.string().uuid().optional(),
        requestId: z.string().uuid().optional(),
        repeatEvery: z.enum(["none", "daily", "weekly", "monthly"]).default("none"),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    let targetUserId: string | null = context.userId;
    if (data.targetEmail) {
      const { data: prof } = await context.supabase
        .from("profiles")
        .select("id")
        .ilike("email", data.targetEmail)
        .maybeSingle();
      targetUserId = prof?.id ?? null;
    }
    const { data: row, error } = await context.supabase
      .from("reminders")
      .insert({
        owner_id: context.userId,
        target_user_id: targetUserId,
        target_email: data.targetEmail?.toLowerCase() ?? null,
        document_id: data.documentId ?? null,
        contract_id: data.contractId ?? null,
        request_id: data.requestId ?? null,
        title: data.title,
        body: data.body ?? null,
        due_at: new Date(data.dueAt).toISOString(),
        repeat_every: data.repeatEvery === "none" ? null : data.repeatEvery,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

/** Dispara imediatamente um lembrete (teste de notificação). */
export const sendReminderNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ reminderId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: r } = await context.supabase
      .from("reminders")
      .select("*")
      .eq("id", data.reminderId)
      .maybeSingle();
    if (!r) throw new Error("Lembrete não encontrado");
    const { pushToUser } = await import("./reminders.server");
    const sent = await pushToUser(r.target_user_id, r.target_email, {
      title: r.title,
      body: r.body ?? "Lembrete IDOC BUSINESS",
      url: "/app",
    });
    if (r.target_user_id) {
      await context.supabase
        .from("notifications")
        .insert({ user_id: r.target_user_id, title: r.title, body: r.body, type: "reminder" });
    }
    return { sent };
  });
