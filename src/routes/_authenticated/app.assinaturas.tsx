import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { PenLine, Copy, Download, Ban, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { AppShell, StatCard } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { fmtDateTime, statusClass, STATUS_LABEL } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/app/assinaturas")({
  component: Signatures;
});

function Signatures() {
  return null;
}
