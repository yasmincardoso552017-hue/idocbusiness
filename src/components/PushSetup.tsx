import { useEffect, useState } from "react";
import { Bell, BellRing } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { getPushKey, savePushSubscription } from "@/lib/reminders.functions";

function b64ToUint8(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

/** Registra o service worker e habilita notificações push no dispositivo. */
export function PushSetup({ className }: { className?: string }) {
  const [state, setState] = useState<"unsupported" | "off" | "on" | "busy">("off");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }
    navigator.serviceWorker.register("/sw.js").then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setState(sub && Notification.permission === "granted" ? "on" : "off");
    });
  }, []);

  async function enable() {
    setState("busy");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") throw new Error("Permissão de notificação negada");
      const { publicKey } = await getPushKey();
      if (!publicKey) throw new Error("Notificações não configuradas");
      const reg = await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: b64ToUint8(publicKey),
        }));
      const json = sub.toJSON() as { endpoint?: string; keys?: Record<string, string> };
      await savePushSubscription({
        data: {
          endpoint: json.endpoint!,
          p256dh: json.keys!["p256dh"]!,
          auth: json.keys!["auth"]!,
          userAgent: navigator.userAgent,
        },
      });
      setState("on");
      toast.success("Notificações ativadas neste dispositivo");
    } catch (e) {
      setState("off");
      toast.error((e as Error).message);
    }
  }

  if (state === "unsupported") return null;
  return (
    <Button
      variant={state === "on" ? "secondary" : "outline"}
      className={className}
      disabled={state === "busy" || state === "on"}
      onClick={enable}
    >
      {state === "on" ? <BellRing className="mr-2 size-4" /> : <Bell className="mr-2 size-4" />}
      {state === "on" ? "Notificações ativas" : "Ativar notificações"}
    </Button>
  );
}
