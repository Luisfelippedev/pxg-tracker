import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CharProvider } from "@/contexts/CharContext";
import AppLayout from "@/components/AppLayout";
import DashboardPage from "@/pages/DashboardPage";
import WeeklyTasksPage from "@/pages/WeeklyTasksPage";
import MonthlyTasksPage from "@/pages/MonthlyTasksPage";
import TemplatesPage from "@/pages/TemplatesPage";
import HistoryPage from "@/pages/HistoryPage";
import CharsPage from "@/pages/CharsPage";
import ProfilePage from "@/pages/ProfilePage";
import AuthPage from "@/pages/AuthPage";
import NotFound from "@/pages/NotFound";
import { authStore } from "@/stores/authStore";

const queryClient = new QueryClient();

function RequireAuth({ children }: { children: ReactNode }) {
  const token = authStore((s) => s.accessToken);
  if (!token) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <CharProvider>
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route
              path="/"
              element={
                <RequireAuth>
                  <AppLayout>
                    <DashboardPage />
                  </AppLayout>
                </RequireAuth>
              }
            />
            <Route
              path="/weekly"
              element={
                <RequireAuth>
                  <AppLayout>
                    <WeeklyTasksPage />
                  </AppLayout>
                </RequireAuth>
              }
            />
            <Route
              path="/monthly"
              element={
                <RequireAuth>
                  <AppLayout>
                    <MonthlyTasksPage />
                  </AppLayout>
                </RequireAuth>
              }
            />
            <Route
              path="/templates"
              element={
                <RequireAuth>
                  <AppLayout>
                    <TemplatesPage />
                  </AppLayout>
                </RequireAuth>
              }
            />
            <Route
              path="/history"
              element={
                <RequireAuth>
                  <AppLayout>
                    <HistoryPage />
                  </AppLayout>
                </RequireAuth>
              }
            />
            <Route
              path="/chars"
              element={
                <RequireAuth>
                  <AppLayout>
                    <CharsPage />
                  </AppLayout>
                </RequireAuth>
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
  </QueryClientProvider>
);

export default App;
