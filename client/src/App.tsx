import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CharProvider } from "@/contexts/CharContext";
import AppLayout from "@/components/AppLayout";
import DashboardPage from "@/pages/DashboardPage";
import WeeklyTasksPage from "@/pages/WeeklyTasksPage";
import MonthlyTasksPage from "@/pages/MonthlyTasksPage";
import TemplatesPage from "@/pages/TemplatesPage";
import HistoryPage from "@/pages/HistoryPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <CharProvider>
        <Sonner />
        <BrowserRouter>
          <AppLayout>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/weekly" element={<WeeklyTasksPage />} />
            <Route path="/monthly" element={<MonthlyTasksPage />} />
            <Route path="/templates" element={<TemplatesPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </AppLayout>
        </BrowserRouter>
      </CharProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
