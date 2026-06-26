import { gql } from "graphql-request";
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Storage Keys ─────────────────────────────────────────────────────────────

export const ADMIN_DASHBOARD_STORAGE_KEYS = {
  FILTER_PRESET: 'admin.dashboard.filterPreset',
  CUSTOM_START: 'admin.dashboard.customStartDate',
  CUSTOM_END: 'admin.dashboard.customEndDate',
} as const;

// ─── Filter Types ─────────────────────────────────────────────────────────────

export type DashboardFilterPreset =
  | '1month'
  | '3months'
  | '6months'
  | 'thisYear'
  | 'today'
  | 'custom';

export interface DashboardFilter {
  preset: DashboardFilterPreset;
  startDate: Date;
  endDate: Date;
}

export interface DashboardFilterSettings {
  preset: DashboardFilterPreset;
  /** ISO — only populated when preset === 'custom' */
  customStartDate?: string;
  /** ISO — only populated when preset === 'custom' */
  customEndDate?: string;
}

// ─── Preset → Date Range ──────────────────────────────────────────────────────

export function resolveDateRange(
  preset: DashboardFilterPreset,
  customStart?: Date,
  customEnd?: Date,
): { startDate: Date; endDate: Date } {
  const now = new Date();

  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const endOfDay   = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

  switch (preset) {
    case 'today':
      return { startDate: startOfDay(now), endDate: endOfDay(now) };

    case '1month': {
      const start = new Date(now);
      start.setMonth(start.getMonth() - 1);
      return { startDate: startOfDay(start), endDate: endOfDay(now) };
    }

    case '3months': {
      const start = new Date(now);
      start.setMonth(start.getMonth() - 3);
      return { startDate: startOfDay(start), endDate: endOfDay(now) };
    }

    case '6months': {
      const start = new Date(now);
      start.setMonth(start.getMonth() - 6);
      return { startDate: startOfDay(start), endDate: endOfDay(now) };
    }

    case 'thisYear':
      return {
        startDate: new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0),
        endDate: endOfDay(now),
      };

    case 'custom':
      return {
        startDate: customStart ? startOfDay(customStart) : startOfDay(now),
        endDate:   customEnd   ? endOfDay(customEnd)     : endOfDay(now),
      };
  }
}

// ─── Preset Labels ────────────────────────────────────────────────────────────

export const FILTER_PRESET_LABELS: Record<DashboardFilterPreset, string> = {
  today:    'Today',
  '1month': '1 Month',
  '3months':'3 Months',
  '6months':'6 Months',
  thisYear: 'This Year',
  custom:   'Custom',
};

export const FILTER_PRESETS: DashboardFilterPreset[] = [
  'today',
  '1month',
  '3months',
  '6months',
  'thisYear',
  'custom',
];

// ─── GraphQL Query ────────────────────────────────────────────────────────────

export const ADMIN_DASHBOARD_QUERY = gql`
  query AdminDashboard($startDate: String, $endDate: String) {
    adminDashboard(startDate: $startDate, endDate: $endDate) {
      stats {
        totalOrganizations
        activeOrganizations
        totalUsers
        activeUsers
        totalOutlets
        totalProducts
        totalPOSOrdersInRange
        totalEcommerceOrdersInRange
        totalPOSSalesInRange
        totalEcommerceSalesInRange
        newOrganizationsInRange
        newUsersInRange
      }
      recentOrganizations {
        id
        name
        createdAt
        roles
      }
      recentUsers {
        id
        fullname
        email
        isVerified
        isActive
        createdAt
      }
      recentPOSOrders {
        id
        orderNumber
        customerName
        status
        grandTotal
        date
      }
      recentEcommerceOrders {
        id
        transactionNumber
        paymentStatus
        status
        grandTotal
        createdAt
      }
      appliedStartDate
      appliedEndDate
    }
  }
`;

// ─── TypeScript Interfaces ────────────────────────────────────────────────────

export interface DashboardStats {
  totalOrganizations: number;
  activeOrganizations: number;
  totalUsers: number;
  activeUsers: number;
  totalOutlets: number;
  totalProducts: number;
  totalPOSOrdersInRange: number;
  totalEcommerceOrdersInRange: number;
  totalPOSSalesInRange: number;
  totalEcommerceSalesInRange: number;
  newOrganizationsInRange: number;
  newUsersInRange: number;
}

export interface RecentOrganization {
  id: number;
  name: string;
  createdAt: string;
  roles: string[];
}

export interface RecentUser {
  id: number;
  fullname: string;
  email: string;
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface RecentPOSOrder {
  id: string;
  orderNumber: string;
  customerName: string | null;
  status: string;
  grandTotal: number;
  date: string;
}

export interface RecentEcommerceOrder {
  id: number;
  transactionNumber: string;
  paymentStatus: string;
  status: string;
  grandTotal: number | null;
  createdAt: string;
}

export interface AdminDashboardData {
  stats: DashboardStats;
  recentOrganizations: RecentOrganization[];
  recentUsers: RecentUser[];
  recentPOSOrders: RecentPOSOrder[];
  recentEcommerceOrders: RecentEcommerceOrder[];
  appliedStartDate: string;
  appliedEndDate: string;
}

// ─── Persisted Settings Helpers ───────────────────────────────────────────────

export async function saveDashboardFilterSettings(
  settings: DashboardFilterSettings,
): Promise<void> {
  const entries: [string, string][] = [
    [ADMIN_DASHBOARD_STORAGE_KEYS.FILTER_PRESET, settings.preset],
  ];
  if (settings.customStartDate) {
    entries.push([ADMIN_DASHBOARD_STORAGE_KEYS.CUSTOM_START, settings.customStartDate]);
  }
  if (settings.customEndDate) {
    entries.push([ADMIN_DASHBOARD_STORAGE_KEYS.CUSTOM_END, settings.customEndDate]);
  }
  await AsyncStorage.multiSet(entries);
}

export async function loadDashboardFilterSettings(): Promise<DashboardFilterSettings> {
  const keys = Object.values(ADMIN_DASHBOARD_STORAGE_KEYS);
  const pairs = await AsyncStorage.multiGet(keys);
  const map = Object.fromEntries(pairs.map(([k, v]) => [k, v]));

  return {
    preset: (map[ADMIN_DASHBOARD_STORAGE_KEYS.FILTER_PRESET] as DashboardFilterPreset) ?? 'today',
    customStartDate: map[ADMIN_DASHBOARD_STORAGE_KEYS.CUSTOM_START] ?? undefined,
    customEndDate:   map[ADMIN_DASHBOARD_STORAGE_KEYS.CUSTOM_END]   ?? undefined,
  };
}

// ─── Utility Helpers ──────────────────────────────────────────────────────────

export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '₱0.00';
  return `₱${value.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

export function formatShortDate(date: Date): string {
  return date.toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatStatus(status: string): string {
  return status
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase());
}