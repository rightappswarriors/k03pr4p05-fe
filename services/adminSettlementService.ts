// adminSettlementsService.ts
import { gql } from 'graphql-request';
import { graphQLRequest } from './apiClient'; // adjust to your actual client import

// ─── Types ────────────────────────────────────────────────────────────────────

export type SettlementEnvironment = 'SANDBOX' | 'PRODUCTION';

export interface AdminSettlementSummary {
  totalGross: number;
  totalPlatformFees: number;
  totalSupplierNet: number;
  postedCount: number;
  pendingCount: number;
}

export interface AdminPurchaseOrderSettlement {
  id: string;
  poNumber: string;
  supplierName: string;
  grossAmount: number;
  platformFee: number;
  supplierNet: number;
  environment: SettlementEnvironment;
  settledAt: string;
  walletPostedAt: string | null;
  walletLedgerEntryId: string | null;
  postingStatus: string;
  balanceAfter: number | null;
}

export interface AdminPurchaseOrderSettlementsPage {
  total: number;
  page: number;
  pageSize: number;
  items: AdminPurchaseOrderSettlement[];
}

export interface AdminSettlementsData {
  adminSettlementSummary: AdminSettlementSummary;
  adminPurchaseOrderSettlements: AdminPurchaseOrderSettlementsPage;
}

// ─── GraphQL Query ────────────────────────────────────────────────────────────

export const ADMIN_SETTLEMENTS_QUERY = gql`
  query AdminSettlements($environment: Environment, $page: Int, $pageSize: Int) {
    adminSettlementSummary(environment: $environment) {
      totalGross
      totalPlatformFees
      totalSupplierNet
      postedCount
      pendingCount
    }
    adminPurchaseOrderSettlements(
      environment: $environment
      page: $page
      pageSize: $pageSize
    ) {
      total
      page
      pageSize
      items {
        id
        poNumber
        supplierName
        grossAmount
        platformFee
        supplierNet
        environment
        settledAt
        walletPostedAt
        walletLedgerEntryId
        postingStatus
        balanceAfter
      }
    }
  }
`;

// ─── Fetcher ──────────────────────────────────────────────────────────────────

export function getAdminSettlements(
  environment: SettlementEnvironment,
  page = 1,
  pageSize = 25,
): Promise<AdminSettlementsData> {
  return graphQLRequest<AdminSettlementsData>(ADMIN_SETTLEMENTS_QUERY, {
    environment,
    page,
    pageSize,
  });
}