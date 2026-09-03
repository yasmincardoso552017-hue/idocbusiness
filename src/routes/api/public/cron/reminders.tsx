import { createFileRoute } from "@tanstack/react-router";

import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

async function handle({ request }: { request: Request }) {
  const denied = await authenticateCronRequest(request);
  if (denied) return denied;
  const { runDueReminders } = await import("@/lib/reminders.server");
  const processed = await runDueReminders();
  return Response.json({ ok: true, processed });
}

export const Route = createFileRoute("/api/public/cron/reminders")({
  server: { handlers: { GET: handle, POST: handle } },
});
