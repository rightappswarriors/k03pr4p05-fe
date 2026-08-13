import { useCallback, useEffect, useRef, useState } from 'react';
import { formatGraphQLError } from '@/utils/errorFormatter';
import { graphQLRequest } from '@/services/apiClient';
import {
    ADMIN_DASHBOARD_QUERY,
    AdminDashboardData,
    DashboardFilter,
    DashboardFilterPreset,
    DashboardFilterSettings,
    resolveDateRange,
    saveDashboardFilterSettings,
    loadDashboardFilterSettings,
} from '@/services/adminDashboardService';

// ─── Hook State ───────────────────────────────────────────────────────────────

interface UseAdminDashboardState {
    data: AdminDashboardData | null;
    loading: boolean;
    /** True only on the initial settings-load before first fetch */
    initialising: boolean;
    error: string | null;
    filter: DashboardFilter;
    setPreset: (preset: DashboardFilterPreset) => void;
    setCustomRange: (startDate: Date, endDate: Date) => void;
    refetch: () => void;
}

// ─── Default filter ───────────────────────────────────────────────────────────

function buildDefaultFilter(): DashboardFilter {
    const { startDate, endDate } = resolveDateRange('today');
    return { preset: 'today', startDate, endDate };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAdminDashboard(): UseAdminDashboardState {
    const mountedRef = useRef(true);

    const [data, setData] = useState<AdminDashboardData | null>(null);
    const [loading, setLoading] = useState(false);
    const [initialising, setInitialising] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<DashboardFilter>(buildDefaultFilter);

    // ── Fetch ─────────────────────────────────────────────────────────────────

    const fetchDashboard = useCallback(
        async (activeFilter: DashboardFilter) => {
            setLoading(true);
            setError(null);

            try {
                if (__DEV__) {
                    console.log(
                        '[useAdminDashboard] fetching — preset:',
                        activeFilter.preset,
                        '| start:',
                        activeFilter.startDate.toISOString(),
                        '| end:',
                        activeFilter.endDate.toISOString(),
                    );
                }

                const result = await graphQLRequest(ADMIN_DASHBOARD_QUERY, {
                    startDate: activeFilter.startDate.toISOString(),
                    endDate: activeFilter.endDate.toISOString(),
                });

                if (!mountedRef.current) return;

                const dashboardData = result?.adminDashboard as AdminDashboardData | undefined;

                if (!dashboardData) {
                    setError('No dashboard data returned.');
                    setData(null);
                    return;
                }

                if (__DEV__) {
                    console.log(
                        '[useAdminDashboard] fetched. totalOrgs:',
                        dashboardData.stats.totalOrganizations,
                    );
                }

                setData(dashboardData);
            } catch (err: unknown) {
                if (!mountedRef.current) return;
                const message = formatGraphQLError(err);
                if (__DEV__) console.error('[useAdminDashboard] error:', message);
                setError(message);
                setData(null);
            } finally {
                if (mountedRef.current) setLoading(false);
            }
        },
        [],
    );

    // ── Load persisted settings on mount, then do first fetch ─────────────────

    useEffect(() => {
        mountedRef.current = true;

        (async () => {
            try {
                const saved = await loadDashboardFilterSettings();
                const customStart = saved.customStartDate ? new Date(saved.customStartDate) : undefined;
                const customEnd = saved.customEndDate ? new Date(saved.customEndDate) : undefined;
                const { startDate, endDate } = resolveDateRange(saved.preset, customStart, customEnd);

                const restoredFilter: DashboardFilter = {
                    preset: saved.preset,
                    startDate,
                    endDate,
                };

                if (mountedRef.current) {
                    setFilter(restoredFilter);
                    setInitialising(false);
                    fetchDashboard(restoredFilter);
                }
            } catch {
                // Couldn't load settings — fall back to default
                if (mountedRef.current) {
                    setInitialising(false);
                    fetchDashboard(filter);
                }
            }
        })();

        return () => {
            mountedRef.current = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Public setters ────────────────────────────────────────────────────────

    const setPreset = useCallback(
        (preset: DashboardFilterPreset) => {
            if (preset === 'custom') return; // custom is opened via setCustomRange
            const { startDate, endDate } = resolveDateRange(preset);
            const newFilter: DashboardFilter = { preset, startDate, endDate };
            setFilter(newFilter);

            const settings: DashboardFilterSettings = { preset };
            saveDashboardFilterSettings(settings).catch(() => { });
            fetchDashboard(newFilter);
        },
        [fetchDashboard],
    );

    const setCustomRange = useCallback(
        (startDate: Date, endDate: Date) => {
            const newFilter: DashboardFilter = { preset: 'custom', startDate, endDate };
            setFilter(newFilter);

            const settings: DashboardFilterSettings = {
                preset: 'custom',
                customStartDate: startDate.toISOString(),
                customEndDate: endDate.toISOString(),
            };
            saveDashboardFilterSettings(settings).catch(() => { });
            fetchDashboard(newFilter);
        },
        [fetchDashboard],
    );

    const refetch = useCallback(() => {
        fetchDashboard(filter);
    }, [fetchDashboard, filter]);

    return {
        data,
        loading,
        initialising,
        error,
        filter,
        setPreset,
        setCustomRange,
        refetch,
    };
}