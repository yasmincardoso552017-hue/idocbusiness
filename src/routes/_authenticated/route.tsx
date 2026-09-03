import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    const { data: profile } = await supabase
      .from("profiles")
      .select("blocked")
      .eq("id", data.user.id)
      .maybeSingle();
    if (profile?.blocked) {
      await supabase.auth.signOut();
      throw redirect({ to: "/auth", search: { blocked: "1" } as never });
    }
    return { user: data.user };
  },
  component: () => <Outlet />,
});
