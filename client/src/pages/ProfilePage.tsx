import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { authStore } from "@/stores/authStore";
import { logout } from "@/services/api";
import ThemeToggle from "@/components/ThemeToggle";
import { User, LogOut, Mail, Palette } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

function getInitials(email: string): string {
  const local = email.split("@")[0];
  if (local.length >= 2) return local.slice(0, 2).toUpperCase();
  return email[0]?.toUpperCase() ?? "?";
}

export default function ProfilePage() {
  const user = authStore((s) => s.user);
  const clearSession = authStore((s) => s.clearSession);
  const { theme } = useTheme();

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      clearSession();
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
            <User className="h-5 w-5 text-primary" />
          </div>
          Perfil
        </h1>
        <p className="text-muted-foreground text-sm mt-1.5 pl-12">
          Informações da sua conta
        </p>
      </div>

      <Card className="relative overflow-hidden gradient-card border-border shadow-card">
        <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(circle_at_50%_50%,hsl(0_0%_100%)_1px,transparent_1px)] bg-[length:16px_16px] pointer-events-none" />
        <CardHeader className="relative">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 rounded-xl border-2 border-primary/20 bg-primary/10">
              <AvatarFallback className="rounded-xl bg-primary/15 text-primary font-display font-bold text-xl">
                {user?.email ? getInitials(user.email) : "?"}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-xl">Conta</CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                Dados da sua conta no Pokex Tracker
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="relative space-y-6">
          <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/30 border border-border">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Email
              </p>
              <p className="text-sm font-medium">{user?.email ?? "—"}</p>
            </div>
          </div>

          {user?.id && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/30 border border-border">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <span className="text-xs font-mono text-muted-foreground">ID</span>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  Identificador
                </p>
                <p className="text-xs font-mono text-foreground/80 truncate max-w-xs">
                  {user.id}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 p-4 rounded-lg bg-muted/30 border border-border">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Palette className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  Aparência
                </p>
                <p className="text-sm font-medium">
                  Tema atual: {theme === "dark" ? "Escuro" : "Claro"}
                </p>
              </div>
            </div>
            <ThemeToggle />
          </div>

          <Button
            variant="outline"
            className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sair da conta
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
