import AsyncStorage from "@react-native-async-storage/async-storage";
import { formatGraphQLError } from "@/utils/errorFormatter"; // const errorMessage = formatGraphqlError(error)
import { graphQLRequest } from './apiClient';
import { gql } from "graphql-request";
// ─── Storage Keys ──────────────────────────────────────────────────────────────
export const ADMIN_USERS_STORAGE_KEYS = {
  PAGE: "admin.users.page",
  PAGE_SIZE: "admin.users.pageSize",
  SORT_DIRECTION: "admin.users.sortDirection",
  VERIFIED_FILTER: "admin.users.verifiedFilter",
  ACTIVE_FILTER: "admin.users.activeFilter",
  DISPLAY_MODE: "admin.users.displayMode",
  GRID_COLUMNS: "admin.users.gridColumns",
} as const;

// ─── Types ─────────────────────────────────────────────────────────────────────
export type SortDirection = "ASC" | "DESC";
export type DisplayMode = "table" | "grid" | "card";
export type VerifiedFilter = "all" | "verified" | "unverified";
export type ActiveFilter = "all" | "active" | "banned";

export interface AdminUserOrg {
  id: number;
  name: string;
}

export interface AdminUserPosition {
  id: string;
  name: string;
}

export interface AdminUserDepartment {
  id: number;
  label: string;
}

export interface AdminUser {
  id: number;
  fullname: string;
  username: string;
  email: string;
  role: string;
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
  profilePhoto: string | null;
  contactNumber: string | null;
  country: string | null;
  city: string | null;
  org: AdminUserOrg | null;
  position: AdminUserPosition | null;
  department: AdminUserDepartment | null;
}

export interface AdminUsersResult {
  items: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
}

export interface GetUsersParams {
  search?: string;
  page?: number;
  pageSize?: number;
  sortDirection?: SortDirection;
  verified?: boolean;
  active?: boolean;
}

export interface AdminUserSettings {
  page: number;
  pageSize: number;
  sortDirection: SortDirection;
  verifiedFilter: VerifiedFilter;
  activeFilter: ActiveFilter;
  displayMode: DisplayMode;
  gridColumns: number;
}

// ─── GraphQL Fragments ─────────────────────────────────────────────────────────
const ADMIN_USER_FIELDS = gql`
  id
  fullname
  username
  email
  role
  isVerified
  isActive
  createdAt
  profilePhoto
  contactNumber
  country
  city
  org {
    id
    name
  }
  position {
    id
    name
  }
  department {
    id
    label
  }
`;

// ─── Queries ───────────────────────────────────────────────────────────────────
const GET_ADMIN_USERS = gql`
  query AdminUsers(
    $search: String
    $page: Int
    $pageSize: Int
    $sortDirection: String
    $verified: Boolean
    $active: Boolean
  ) {
    adminUsers(
      search: $search
      page: $page
      pageSize: $pageSize
      sortDirection: $sortDirection
      verified: $verified
      active: $active
    ) {
      items {
        ${ADMIN_USER_FIELDS}
      }
      total
      page
      pageSize
    }
  }
`;

// ─── Mutations ─────────────────────────────────────────────────────────────────
const VERIFY_USER = gql`
  mutation VerifyUser($userId: Int!) {
    verifyUser(userId: $userId) {
      ${ADMIN_USER_FIELDS}
    }
  }
`;

const UNVERIFY_USER = gql`
  mutation UnverifyUser($userId: Int!) {
    unverifyUser(userId: $userId) {
      ${ADMIN_USER_FIELDS}
    }
  }
`;

const BAN_USER = gql`
  mutation BanUser($userId: Int!) {
    banUser(userId: $userId) {
      ${ADMIN_USER_FIELDS}
    }
  }
`;

const UNBAN_USER = gql`
  mutation UnbanUser($userId: Int!) {
    unbanUser(userId: $userId) {
      ${ADMIN_USER_FIELDS}
    }
  }
`;

const CHANGE_USER_PASSWORD = gql`
  mutation ChangeUserPassword($userId: Int!, $password: String!) {
    changeUserPassword(userId: $userId, password: $password)
  }
`;

// ─── Service ───────────────────────────────────────────────────────────────────
class AdminUserService {
  // ─── Users ────────────────────────────────────────────────────────
  async getUsers(params: GetUsersParams = {}): Promise<AdminUsersResult> {
    if (__DEV__) {
      console.log("[AdminUserService] getUsers()", params);
    }

    const variables: Record<string, any> = {
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 30,
      sortDirection: params.sortDirection ?? "DESC",
    };

    if (params.search?.trim()) variables.search = params.search.trim();
    if (params.verified !== undefined) variables.verified = params.verified;
    if (params.active !== undefined) variables.active = params.active;

    const data = await graphQLRequest(GET_ADMIN_USERS, variables);

    if (__DEV__) {
      console.log("[AdminUserService] getUsers() result:", data?.adminUsers?.total, "users");
    }

    return data.adminUsers;
  }

  async verifyUser(userId: number): Promise<AdminUser> {
    if (__DEV__) {
      console.log("[AdminUserService] verifyUser()", userId);
    }
    const data = await graphQLRequest(VERIFY_USER, { userId });
    return data.verifyUser;
  }

  async unverifyUser(userId: number): Promise<AdminUser> {
    if (__DEV__) {
      console.log("[AdminUserService] unverifyUser()", userId);
    }
    const data = await graphQLRequest(UNVERIFY_USER, { userId });
    return data.unverifyUser;
  }

  async banUser(userId: number): Promise<AdminUser> {
    if (__DEV__) {
      console.log("[AdminUserService] banUser()", userId);
    }
    const data = await graphQLRequest(BAN_USER, { userId });
    return data.banUser;
  }

  async unbanUser(userId: number): Promise<AdminUser> {
    if (__DEV__) {
      console.log("[AdminUserService] unbanUser()", userId);
    }
    const data = await graphQLRequest(UNBAN_USER, { userId });
    return data.unbanUser;
  }

  async changePassword(userId: number, password: string): Promise<boolean> {
    if (__DEV__) {
      console.log("[AdminUserService] changePassword() userId:", userId);
    }
    const data = await graphQLRequest(CHANGE_USER_PASSWORD, { userId, password });
    return data.changeUserPassword;
  }

  // ─── Persisted Settings ───────────────────────────────────────────
  async saveSettings(settings: Partial<AdminUserSettings>): Promise<void> {
    const entries: [string, string][] = [];

    if (settings.page !== undefined)
      entries.push([ADMIN_USERS_STORAGE_KEYS.PAGE, String(settings.page)]);
    if (settings.pageSize !== undefined)
      entries.push([ADMIN_USERS_STORAGE_KEYS.PAGE_SIZE, String(settings.pageSize)]);
    if (settings.sortDirection !== undefined)
      entries.push([ADMIN_USERS_STORAGE_KEYS.SORT_DIRECTION, settings.sortDirection]);
    if (settings.verifiedFilter !== undefined)
      entries.push([ADMIN_USERS_STORAGE_KEYS.VERIFIED_FILTER, settings.verifiedFilter]);
    if (settings.activeFilter !== undefined)
      entries.push([ADMIN_USERS_STORAGE_KEYS.ACTIVE_FILTER, settings.activeFilter]);
    if (settings.displayMode !== undefined)
      entries.push([ADMIN_USERS_STORAGE_KEYS.DISPLAY_MODE, settings.displayMode]);
    if (settings.gridColumns !== undefined)
      entries.push([ADMIN_USERS_STORAGE_KEYS.GRID_COLUMNS, String(settings.gridColumns)]);

    await AsyncStorage.multiSet(entries);
  }

  async loadSettings(): Promise<AdminUserSettings> {
    const keys = Object.values(ADMIN_USERS_STORAGE_KEYS);
    const pairs = await AsyncStorage.multiGet(keys);
    const map = Object.fromEntries(pairs.map(([k, v]) => [k, v]));

    return {
      page: parseInt(map[ADMIN_USERS_STORAGE_KEYS.PAGE] ?? "1", 10) || 1,
      pageSize: parseInt(map[ADMIN_USERS_STORAGE_KEYS.PAGE_SIZE] ?? "30", 10) || 30,
      sortDirection: (map[ADMIN_USERS_STORAGE_KEYS.SORT_DIRECTION] as SortDirection) ?? "DESC",
      verifiedFilter: (map[ADMIN_USERS_STORAGE_KEYS.VERIFIED_FILTER] as VerifiedFilter) ?? "all",
      activeFilter: (map[ADMIN_USERS_STORAGE_KEYS.ACTIVE_FILTER] as ActiveFilter) ?? "all",
      displayMode: (map[ADMIN_USERS_STORAGE_KEYS.DISPLAY_MODE] as DisplayMode) ?? "table",
      gridColumns: parseInt(map[ADMIN_USERS_STORAGE_KEYS.GRID_COLUMNS] ?? "1", 10) || 1,
    };
  }
}

export const adminUserService = new AdminUserService();
export default adminUserService;

