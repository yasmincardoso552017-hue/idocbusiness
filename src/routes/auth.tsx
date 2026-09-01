import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FileSignature } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { ensureProfile } from "@/hooks/useAuth";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrar no DocFlow" },
      { name: "description", content: "Acesse sua conta DocFlow para gerenciar documentos, contratos e assinaturas." },
      { property: "og:title", content: "Entrar no DocFlow" },
      { property: "og:description", content: "Acesse sua conta DocFlow." },
    ],
  }),
  component: Auth,
});

function Auth() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/app", replace: true });
    });
  }, [navigate]);

  async function signIn() {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    if (data.user) await ensureProfile(data.user);
    navigate({ to: "/app", replace: true });
  }

  async function signUp() {
    if (password.length < 6) { toast.error("A senha precisa ter ao menos 6 caracteres"); return; }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/app`,
        data: { full_name: name, phone },
      },
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    if (data.session && data.user) {
      await ensureProfile(data.user);
      navigate({ to: "/app", replace: true });
    } else {
      toast.success("Conta criada. Confirme o e-mail para acessar.");
    }
  }

  async function google() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/app` },
    });
    if (error) toast.error(error.message);
  }

  async function reset() {
    if (!email) { toast.error("Informe o e-mail"); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Enviamos o link de redefinição por e-mail.");
  }

  return (
    <div className="flex min-h-screen flex-col bg-background px-4 py-8">
      <div className="mx-auto w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <span className="gradient-brand flex size-9 items-center justify-center rounded-xl">
            <FileSignature className="size-5 text-primary-foreground" />
          </span>
          <span className="text-lg font-extrabold tracking-tight">DocFlow</span>
        </Link>

        <div className="card-soft p-5">
          <Tabs defaultValue="in">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="in">Entrar</TabsTrigger>
              <TabsTrigger value="up">Criar conta</TabsTrigger>
            </TabsList>

            <TabsContent value="in" className="mt-4 space-y-3">
              <div>
                <Label htmlFor="e1">E-mail</Label>
                <Input id="e1" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="p1">Senha</Label>
                <Input id="p1" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button className="w-full" disabled={loading} onClick={signIn}>
                Entrar
              </Button>
              <button onClick={reset} className="w-full text-xs text-muted-foreground underline">
                Esqueci minha senha
              </button>
            </TabsContent>

            <TabsContent value="up" className="mt-4 space-y-3">
              <div>
                <Label htmlFor="n2">Nome completo</Label>
                <Input id="n2" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="t2">Telefone</Label>
                <Input id="t2" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="e2">E-mail</Label>
                <Input id="e2" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="p2">Senha</Label>
                <Input id="p2" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button className="w-full" disabled={loading} onClick={signUp}>
                Criar conta
              </Button>
            </TabsContent>
          </Tabs>

          <div className="my-4 flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" />
          </div>
          <Button variant="outline" className="w-full" onClick={google}>
            Continuar com Google
          </Button>
          <p className="mt-4 text-center text-[11px] text-muted-foreground">
            Ao continuar você aceita os <Link to="/termos" className="underline">Termos</Link> e a{" "}
            <Link to="/privacidade" className="underline">Política de Privacidade</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
