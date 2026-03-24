import { ReactNode, useEffect } from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarDays,
  CalendarRange,
  Settings2,
  History,
  Users,
  User,
  UserPlus,
  ChevronRight,
} from "lucide-react";
import { useChar } from "@/contexts/CharContext";
import { useChars } from "@/hooks/useTaskData";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getStoredCharId } from "@/contexts/CharContext";
import ProfileCard from "@/components/ProfileCard";
import ThemeToggle from "@/components/ThemeToggle";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/weekly", icon: CalendarDays, label: "Semanais" },
  { to: "/monthly", icon: CalendarRange, label: "Mensais" },
  { to: "/templates", icon: Settings2, label: "Templates" },
  { to: "/history", icon: History, label: "Histórico" },
  { to: "/chars", icon: Users, label: "Chars" },
  { to: "/profile", icon: User, label: "Perfil" },
];

function AppSidebar() {
  const location = useLocation();
  const { selectedChar, setSelectedChar } = useChar();
  const { data: chars } = useChars();

  useEffect(() => {
    if (!chars || chars.length === 0 || selectedChar) return;
    const storedId = getStoredCharId();
    const toSelect = storedId
      ? (chars.find((c) => c.id === storedId) ?? chars[0])
      : chars[0];
    setSelectedChar(toSelect);
  }, [chars, selectedChar, setSelectedChar]);

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-60 flex-col border-r border-border bg-sidebar">
      {/* Logo */}
      <div className="px-5 py-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl gradient-card border border-primary/20 shadow-card overflow-hidden p-1.5">
            <img
              src="/icons/pokeball.png"
              alt="PokexGames"
              className="h-full w-full object-contain drop-shadow-sm"
            />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-display font-bold text-foreground tracking-wide truncate">
              PxgTracker
            </h1>
            <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">
              Task Tracker
            </p>
          </div>
        </div>
        {chars && chars.length === 0 ? (
          <Link
            to="/chars"
            className="flex w-full items-center justify-between gap-2 rounded-md border border-input bg-muted/50 px-3 py-2 h-9 text-sm text-primary hover:bg-primary/10 hover:border-primary/20 transition-colors"
          >
            <span className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Criar primeiro char
            </span>
            <ChevronRight className="h-4 w-4 opacity-70" />
          </Link>
        ) : (
          <Select
            value={selectedChar?.id ?? ""}
            onValueChange={(id) => {
              const c = chars?.find((x) => x.id === id);
              if (c) setSelectedChar(c);
            }}
          >
            <SelectTrigger className="w-full bg-muted/50 border-border h-9 text-sm">
              <SelectValue placeholder="Selecione o char" />
            </SelectTrigger>
            <SelectContent>
              {chars?.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Divider */}
      <div className="mx-4 h-px bg-border" />

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-primary/10 text-primary border border-primary/20 glow-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground border border-transparent"
              }`}
            >
              <item.icon
                className={`h-[18px] w-[18px] transition-colors ${isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`}
              />
              {item.label}
              {isActive && <div className="ml-auto pokeball-dot" />}
            </NavLink>
          );
        })}
      </nav>

      {/* Profile */}
      <div className="px-4 pb-4 space-y-3">
        <div className="flex justify-end">
          <ThemeToggle />
        </div>
        <ProfileCard />
      </div>
    </aside>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="pl-60">
        <div className="mx-auto max-w-7xl px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
