import { FormEvent, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ThemeToggle from "@/components/ThemeToggle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { login, register } from "@/services/api";
import { authStore } from "@/stores/authStore";
import { toast } from "sonner";
import { Navigate } from "react-router-dom";

export default function AuthPage() {
  const setSession = authStore((s) => s.setSession);
  const accessToken = authStore((s) => s.accessToken);
  const [loading, setLoading] = useState(false);

  if (accessToken) {
    return <Navigate to="/" replace />;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>, mode: "login" | "register") {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    setLoading(true);

    try {
      const data =
        mode === "login" ? await login(email, password) : await register(email, password);
      setSession(data);
      toast.success(mode === "login" ? "Login realizado com sucesso" : "Conta criada com sucesso");
    } catch {
      toast.error("Não foi possível autenticar. Confira seus dados.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md space-y-5">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl gradient-card border border-primary/20 shadow-card overflow-hidden p-2">
              <img
                src="/icons/pokeball.png"
                alt="PokexGames"
                className="h-full w-full object-contain"
              />
            </div>
          </div>
          <h1 className="text-4xl font-display font-bold text-foreground tracking-tight">
            PxgTracker
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Task Tracker</p>
          <p className="text-muted-foreground mt-2">Entre na sua conta para gerenciar seus chars</p>
        </div>
        <Card className="gradient-card border-border shadow-card">
          <CardHeader>
            <CardTitle>Acesso</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="space-y-4">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Cadastro</TabsTrigger>
              </TabsList>
              <TabsContent value="login">
                <form className="space-y-3" onSubmit={(e) => onSubmit(e, "login")}>
                  <Input name="email" type="email" placeholder="Email" required />
                  <Input name="password" type="password" placeholder="Senha" required minLength={6} />
                  <Button className="w-full" disabled={loading}>
                    Entrar
                  </Button>
                </form>
              </TabsContent>
              <TabsContent value="register">
                <form className="space-y-3" onSubmit={(e) => onSubmit(e, "register")}>
                  <Input name="email" type="email" placeholder="Email" required />
                  <Input name="password" type="password" placeholder="Senha (min 6)" required minLength={6} />
                  <Button className="w-full" disabled={loading}>
                    Criar conta
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
