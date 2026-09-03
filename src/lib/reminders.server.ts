import { buildPushPayload } from "@block65/webcrypto-web-push";

import { admin } from "./signing.server";

export function vapid() {
  return {
    subject: process.env["VAPID_SUBJECT"] ?? "mailto:contato@idoc.business",
    publicKey: process.env["VAPID_PUBLIC_KEY"],
    privateKey: process.env["VAPID_PRIVATE_KEY"],
  };
}

type Sub = { id: string; endpoint: string; p256dh: string; auth: string };

/** Envia uma notificação push para todos os dispositivos do usuário. */
export async function pushToUser(
  userId: string | null,
  email: string | null,
  payload: { title: string; body?: string; url?: string },
) {
  const db = await admin();
  let query = db.from("push_subscriptions").select("id, endpoint, p256dh, auth");
  query = userId ? query.eq("user_id", userId) : query.eq("email", (email ?? "").toLowerCase());
  const { data } = await query;
  const subs = (data ?? []) as Sub[];
  const keys = vapid();
  if (!keys.publicKey || !keys.privateKey) return 0;

  let sent = 0;
  for (const s of subs) {
    try {
      const req = await buildPushPayload(
        { data: payload, options: { ttl: 60 * 60 * 24 } },
        { endpoint: s.endpoint, expirationTime: null, keys: { auth: s.auth, p256dh: s.p256dh } },
        keys,
      );
      const res = await fetch(s.endpoint, {
        method: req.method,
        headers: req.headers,
        body: req.body as unknown as BodyInit,
      });
      if (res.status === 404 || res.status === 410) {
        await db.from("push_subscriptions").delete().eq("id", s.id);
      } else if (res.ok) {
        sent += 1;
      }
    } catch {
      /* ignora dispositivo com falha */
    }
  }
  return sent;
}

/** Processa lembretes vencidos: grava notificação e dispara push. */
export async function runDueReminders() {
  const db = await admin();
  const now = new Date();
  const { data } = await db
    .from("reminders")
    .select("*")
    .eq("status", "scheduled")
    .lte("due_at", now.toISOString())
    .limit(200);

  let processed = 0;
  for (const r of data ?? []) {
    let targetId = r.target_user_id as string | null;
    if (!targetId && r.target_email) {
      const { data: prof } = await db
        .from("profiles")
        .select("id")
        .ilike("email", r.target_email)
        .maybeSingle();
      targetId = prof?.id ?? null;
    }
    if (targetId) {
      await db.from("notifications").insert({
        user_id: targetId,
        title: r.title,
        body: r.body,
        type: "reminder",
      });
    }
    if (r.owner_id && r.owner_id !== targetId) {
      await db.from("notifications").insert({
        user_id: r.owner_id,
        title: `Lembrete enviado: ${r.title}`,
        body: r.target_email ?? r.body,
        type: "info",
      });
    }
    await pushToUser(targetId, r.target_email as string | null, {
      title: r.title,
      body: r.body ?? "Você tem um lembrete no IDOC BUSINESS.",
      url: "/app",
    });

    const next =
      r.repeat_every === "daily"
        ? 86400000
        : r.repeat_every === "weekly"
          ? 604800000
          : r.repeat_every === "monthly"
            ? 2592000000
            : null;
    if (next) {
      await db
        .from("reminders")
        .update({ due_at: new Date(new Date(r.due_at).getTime() + next).toISOString() })
        .eq("id", r.id);
    } else {
      await db
        .from("reminders")
        .update({ status: "sent", sent_at: now.toISOString() })
        .eq("id", r.id);
    }
    processed += 1;
  }
  return processed;
}
