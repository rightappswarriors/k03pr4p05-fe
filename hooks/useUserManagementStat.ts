import { useState, useEffect, useCallback } from "react";

import { graphQLRequest } from '@/services/apiClient';
import { gql } from "graphql-request";

// ─── Types ─────────────────────────────────────────────────────────────────────
export interface UserManagementStats {
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    verifiedUsers: number;
    unverifiedUsers: number;
    newUsersToday: number;
    newUsersThisMonth: number;
    verificationRate: number;
    activeRate: number;
}

// ─── GraphQL Query ─────────────────────────────────────────────────────────────
const USER_MANAGEMENT_STATS_QUERY = gql`
  query UserManagementStats {
    userManagementStats {
      totalUsers
      activeUsers
      inactiveUsers
      verifiedUsers
      unverifiedUsers
      newUsersToday
      newUsersThisMonth
      verificationRate
      activeRate
    }
  }
`;

// ─── Hook ──────────────────────────────────────────────────────────────────────
interface UseUserManagementStatsReturn {
    stats: UserManagementStats | null;
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
}

export function useUserManagementStats(): UseUserManagementStatsReturn {
    const [stats, setStats] = useState<UserManagementStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetch = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            if (__DEV__) {
                console.log("[useUserManagementStats] fetching stats...");
            }

            const data = await graphQLRequest(USER_MANAGEMENT_STATS_QUERY, {});
            setStats(data.userManagementStats);

            if (__DEV__) {
                console.log("[useUserManagementStats] result:", data.userManagementStats);
            }
        } catch (err: any) {
            const msg = err?.message ?? "Failed to load statistics.";
            setError(msg);

            if (__DEV__) {
                console.warn("[useUserManagementStats] error:", msg);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetch();
    }, [fetch]);

    return { stats, loading, error, refresh: fetch };
}