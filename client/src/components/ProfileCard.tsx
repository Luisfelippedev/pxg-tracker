import { Link } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
import { authStore } from "@/stores/authStore";
import { logout } from "@/services/api";

function getInitials(email: string): string {
  const local = email.split("@")[0];
  if (local.length >= 2) return local.slice(0, 2).toUpperCase();
  return email[0]?.toUpperCase() ?? "?";
}

export default function ProfileCard() {
  const user = authStore((s) => s.user);
  const clearSession = authStore((s) => s.clearSession);

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      clearSession();
    }
  };

  return (
    <div className="relative overflow-hidden rounded-xl border border-border gradient-card p-4 shadow-card">
      {/* Subtle pattern overlay - igual StatCard */}
      <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(circle_at_50%_50%,hsl(0_0%_100%)_1px,transparent_1px)] bg-[length:16px_16px] pointer-events-none" />

      <div className="relative space-y-3">
        {/* Status label */}
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-semibold">
            Sessão
          </span>
        </div>

        {/* User info */}
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 rounded-lg border border-border bg-primary/10 ring-2 ring-primary/10">
            <AvatarFallback className="rounded-lg bg-primary/15 text-primary font-display font-bold text-sm">
              {user?.email ? getInitials(user.email) : "?"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {user?.email ?? "Sem sessão"}
            </p>
            <Link
              to="/profile"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors mt-0.5"
            >
              <User className="h-3 w-3" />
              Ver perfil
            </Link>
          </div>
        </div>

        {/* Logout */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-full justify-start text-xs text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
          onClick={handleLogout}
        >
          <LogOut className="h-3.5 w-3.5 mr-2" />
          Sair
        </Button>
      </div>
    </div>
  );
}
