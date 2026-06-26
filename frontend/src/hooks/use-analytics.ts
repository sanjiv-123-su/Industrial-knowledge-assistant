import { useQuery } from "@tanstack/react-query";
import { apiFetch, type DashboardAnalyticsResponse } from "@/lib/api";

export function useAnalytics() {
  return useQuery<DashboardAnalyticsResponse>({
    queryKey: ["analytics"],
    queryFn: () => apiFetch<DashboardAnalyticsResponse>("/analytics"),
    retry: 2,
    refetchInterval: 15000, // Refresh dashboard data every 15s to keep it live
  });
}
