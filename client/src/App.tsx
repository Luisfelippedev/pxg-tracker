import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CharProvider } from "@/contexts/CharContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import AppLayout from "@/components/AppLayout";
import DashboardPage from "@/pages/DashboardPage";
import WeeklyTasksPage from "@/pages/WeeklyTasksPage";
import MonthlyTasksPage from "@/pages/MonthlyTasksPage";
import TemplatesPage from "@/pages/TemplatesPage";
import HistoryPage from "@/pages/HistoryPage";
import CharsPage from "@/pages/CharsPage";
import ProfilePage from "@/pages/ProfilePage";
import AdminDashboardPage from "@/pages/AdminDashboardPage";
import AdminTemplatesPage from "@/pages/AdminTemplatesPage";
import DropsPage from "@/pages/DropsPage";
import AuthPage from "@/pages/AuthPage";
import NotFound from "@/pages/NotFound";
import { authStore } from "@/stores/authStore";
import { decodeJwt } from "@/lib/jwt";

const queryClient = new QueryClient();

function RequireAuth({ children }: { children: ReactNode }) {
  const token = authStore((s) => s.accessToken);
  if (!token) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: ReactNode }) {
  const token = authStore((s) => s.accessToken);
  const roleInStore = authStore((s) => s.user?.role);

  const roleFromToken = token?.trim() ? decodeJwt(token)?.role : null;
  const role = roleInStore ?? roleFromToken;

  if (!token) return <Navigate to="/auth" replace />;
  // Se a UI não conseguir descobrir a role (tokens antigos), deixamos o backend bloquear.
  if (role !== undefined && role !== null && role !== "admin") {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function RequireNonAdmin({ children }: { children: ReactNode }) {
  const token = authStore((s) => s.accessToken);
  const roleInStore = authStore((s) => s.user?.role);

  const roleFromToken = token?.trim() ? decodeJwt(token)?.role : null;
  const role = roleInStore ?? roleFromToken;

  if (!token) return <Navigate to="/auth" replace />;
  if (role === "admin") return <Navigate to="/admin/usuarios" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <CharProvider>
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<AuthPage />} />
              <Route
                path="/"
                element={
                  <RequireNonAdmin>
                    <AppLayout>
                      <DashboardPage />
                    </AppLayout>
                  </RequireNonAdmin>
                }
              />
              <Route
                path="/admin/usuarios"
                element={
                  <RequireAdmin>
                    <AppLayout>
                      <AdminDashboardPage />
                    </AppLayout>
                  </RequireAdmin>
                }
              />
              <Route
                path="/admin/templates"
                element={
                  <RequireAdmin>
                    <AppLayout>
                      <AdminTemplatesPage />
                    </AppLayout>
                  </RequireAdmin>
                }
              />
              <Route
                path="/weekly"
                element={
                  <RequireNonAdmin>
                    <AppLayout>
                      <WeeklyTasksPage />
                    </AppLayout>
                  </RequireNonAdmin>
                }
              />
              <Route
                path="/monthly"
                element={
                  <RequireNonAdmin>
                    <AppLayout>
                      <MonthlyTasksPage />
                    </AppLayout>
                  </RequireNonAdmin>
                }
              />
              <Route
                path="/drops"
                element={
                  <RequireNonAdmin>
                    <AppLayout>
                      <DropsPage />
                    </AppLayout>
                  </RequireNonAdmin>
                }
              />
              <Route
                path="/templates"
                element={
                  <RequireNonAdmin>
                    <AppLayout>
                      <TemplatesPage />
                    </AppLayout>
                  </RequireNonAdmin>
                }
              />
              <Route
                path="/history"
                element={
                  <RequireNonAdmin>
                    <AppLayout>
                      <HistoryPage />
                    </AppLayout>
                  </RequireNonAdmin>
                }
              />
              <Route
                path="/chars"
                element={
                  <RequireNonAdmin>
                    <AppLayout>
                      <CharsPage />
                    </AppLayout>
                  </RequireNonAdmin>
                }
              />
              <Route
                path="/profile"
                element={
                  <RequireAuth>
                    <AppLayout>
                      <ProfilePage />
                    </AppLayout>
                  </RequireAuth>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </CharProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
