import { useQuery } from "@tanstack/react-query";
import * as api from "@/services/api";

export function useAdminDashboard() {
  return useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: api.getAdminDashboard,
    staleTime: 30_000,
  });
}

