import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ThemeToggle from "@/components/ThemeToggle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { login, register } from "@/services/api";
import { authStore } from "@/stores/authStore";
import { getAuthErrorMessage } from "@/lib/authErrors";
import { toast } from "sonner";
import { Navigate } from "react-router-dom";
import { AlertCircle } from "lucide-react";

const loginSchema = z.object({
  // Para dev/local: aceita emails sem TLD (ex: admin@local).
  email: z
    .string()
    .min(1, "Email é obrigatório")
    .refine(
      (val) => {
        const v = val
          // Remove espaços invisíveis comuns
          .replace(/\u00A0/g, " ")
          .replace(/[\u200B-\u200D\uFEFF]/g, "")
          // Remove qualquer whitespace
          .replace(/\s/g, "")
          .trim();

        if (!v) return false;
        const parts = v.split("@");
        // Exige exatamente 1 "@", com esquerda e direita preenchidas.
        if (parts.length !== 2) return false;
        const [left, right] = parts;
        return Boolean(left && right);
      },
      { message: "Informe um email válido" },
    ),
  password: z.string().min(1, "Senha é obrigatória"),
});

const registerSchema = loginSchema.extend({
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
});

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const setSession = authStore((s) => s.setSession);
  const accessToken = authStore((s) => s.accessToken);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("login");

  function normalizeEmail(input: string) {
    // Remove whitespace invisível (ex: NBSP de copy/paste) para dev/local.
    return input
      .replace(/\u00A0/g, " ")
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .replace(/\s/g, "")
      .trim()
      .toLowerCase();
  }

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: "", password: "" },
  });

  function clearApiError() {
    setApiError(null);
  }

  async function onLoginSubmit(values: LoginForm) {
    setLoading(true);
    setApiError(null);
    try {
      const data = await login(normalizeEmail(values.email), values.password);
      setSession(data);
      toast.success("Login realizado com sucesso");
    } catch (err) {
      setApiError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function onRegisterSubmit(values: RegisterForm) {
    setLoading(true);
    setApiError(null);
    try {
      const data = await register(normalizeEmail(values.email), values.password);
      setSession(data);
      toast.success("Conta criada com sucesso");
    } catch (err) {
      setApiError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  if (accessToken) {
    return <Navigate to="/" replace />;
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
            PokexGames
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Task Tracker</p>
          <p className="text-muted-foreground mt-2">
            Entre na sua conta para gerenciar seus chars
          </p>
        </div>
        <Card className="gradient-card border-border shadow-card">
          <CardHeader>
            <CardTitle>Acesso</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs
              value={activeTab}
              onValueChange={(v) => {
                setActiveTab(v);
                clearApiError();
              }}
              className="space-y-4"
            >
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="login">Entrar</TabsTrigger>
                <TabsTrigger value="register">Cadastrar</TabsTrigger>
              </TabsList>

              {apiError && (
                <Alert variant="destructive" className="py-3">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{apiError}</AlertDescription>
                </Alert>
              )}

              <TabsContent value="login" className="space-y-4 mt-4">
                <Form {...loginForm}>
                  <form
                    onSubmit={loginForm.handleSubmit(onLoginSubmit)}
                    className="space-y-4"
                  >
                    <FormField
                      control={loginForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="seu@email.com"
                              autoComplete="email"
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                clearApiError();
                              }}
                              className={loginForm.formState.errors.email ? "border-destructive" : ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Senha</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="••••••••"
                              autoComplete="current-password"
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                clearApiError();
                              }}
                              className={loginForm.formState.errors.password ? "border-destructive" : ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={loading}
                    >
                      {loading ? "Entrando…" : "Entrar"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="register" className="space-y-4 mt-4">
                <Form {...registerForm}>
                  <form
                    onSubmit={registerForm.handleSubmit(onRegisterSubmit)}
                    className="space-y-4"
                  >
                    <FormField
                      control={registerForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="seu@email.com"
                              autoComplete="email"
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                clearApiError();
                              }}
                              className={registerForm.formState.errors.email ? "border-destructive" : ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Senha</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Mínimo 6 caracteres"
                              autoComplete="new-password"
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                clearApiError();
                              }}
                              className={registerForm.formState.errors.password ? "border-destructive" : ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={loading}
                    >
                      {loading ? "Criando conta…" : "Criar conta"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
