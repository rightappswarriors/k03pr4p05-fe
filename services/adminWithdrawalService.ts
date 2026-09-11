import { gql } from 'graphql-request';
import { graphQLRequest } from './apiClient';

export type WithdrawalEnvironment = 'SANDBOX' | 'PRODUCTION';
export type WithdrawalStatus = 'PENDING' | 'APPROVED' | 'PROCESSING' | 'COMPLETED' | 'REJECTED' | 'FAILED' | 'CANCELLED';

export interface AdminWithdrawal {
  id: number;
  reference: string;
  amount: number;
  status: WithdrawalStatus;
  environment: WithdrawalEnvironment;
  requestedAt: string;
  approvedAt?: string | null;
  rejectionReason?: string | null;
  supplierOrgId: number;
  supplierName: string;
  requestedByName?: string | null;
  approvedByName?: string | null;
  payoutMethodType: string;
  bankName?: string | null;
  accountName: string;
  maskedAccountNumber: string;
  payoutMethodVerified: boolean;
  walletBalance: number;
  walletHeldBalance: number;
}

export interface AdminWithdrawalPage {
  items: AdminWithdrawal[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminWithdrawalSummary {
  pendingCount: number;
  pendingAmount: number;
  approvedCount: number;
  processingCount: number;
  rejectedCount: number;
  completedCount: number;
  failedCount: number;
  completedAmount: number;
}

export interface AdminWithdrawalsData {
  adminWithdrawals: AdminWithdrawalPage;
  adminWithdrawalSummary: AdminWithdrawalSummary;
}

export interface AdminWithdrawalFilters {
  environment: WithdrawalEnvironment;
  status?: WithdrawalStatus;
  search?: string;
  page: number;
  pageSize: number;
}

const ADMIN_WITHDRAWALS_QUERY = gql`
  query AdminWithdrawals($environment: Environment!, $status: WithdrawalStatus, $search: String, $page: Int!, $pageSize: Int!) {
    adminWithdrawals(environment: $environment, status: $status, search: $search, page: $page, pageSize: $pageSize) {
      items {
        id reference amount status environment requestedAt approvedAt rejectionReason
        supplierOrgId supplierName requestedByName approvedByName
        payoutMethodType bankName accountName maskedAccountNumber payoutMethodVerified
        walletBalance walletHeldBalance
      }
      total page pageSize
    }
    adminWithdrawalSummary(environment: $environment) {
      pendingCount pendingAmount approvedCount processingCount rejectedCount completedCount failedCount completedAmount
    }
  }
`;

const APPROVE_WITHDRAWAL_MUTATION = gql`
  mutation ApproveWithdrawal($withdrawalId: Int!) {
    approveWithdrawal(withdrawalId: $withdrawalId) { id status approvedAt approvedById }
  }
`;

const REJECT_WITHDRAWAL_MUTATION = gql`
  mutation RejectWithdrawal($withdrawalId: Int!, $reason: String!) {
    rejectWithdrawal(withdrawalId: $withdrawalId, reason: $reason) { id status approvedAt approvedById rejectionReason }
  }
`;

const PROCESS_PAYOUT_MUTATION = gql`
  mutation ProcessWithdrawalPayout($withdrawalId: Int!) {
    processWithdrawalPayout(withdrawalId: $withdrawalId) { id status }
  }
`;

const COMPLETE_SANDBOX_PAYOUT_MUTATION = gql`
  mutation CompleteSandboxWithdrawalPayout($withdrawalId: Int!) {
    completeSandboxWithdrawalPayout(withdrawalId: $withdrawalId) { id status completedAt sandboxReference }
  }
`;

const FAIL_SANDBOX_PAYOUT_MUTATION = gql`
  mutation FailSandboxWithdrawalPayout($withdrawalId: Int!, $reason: String!) {
    failSandboxWithdrawalPayout(withdrawalId: $withdrawalId, reason: $reason) { id status rejectionReason }
  }
`;

const validWithdrawalId = (withdrawalId: number) => {
  if (!Number.isInteger(withdrawalId) || withdrawalId < 1) throw new Error('Withdrawal ID must be a positive integer.');
};

export function getAdminWithdrawals(filters: AdminWithdrawalFilters): Promise<AdminWithdrawalsData> {
  const search = filters.search?.trim() || undefined;
  return graphQLRequest<AdminWithdrawalsData>(ADMIN_WITHDRAWALS_QUERY, { ...filters, search });
}

export function approveAdminWithdrawal(withdrawalId: number): Promise<{ approveWithdrawal: Pick<AdminWithdrawal, 'id' | 'status' | 'approvedAt'> }> {
  validWithdrawalId(withdrawalId);
  return graphQLRequest(APPROVE_WITHDRAWAL_MUTATION, { withdrawalId });
}

export function rejectAdminWithdrawal(withdrawalId: number, reason: string): Promise<{ rejectWithdrawal: Pick<AdminWithdrawal, 'id' | 'status' | 'approvedAt' | 'rejectionReason'> }> {
  validWithdrawalId(withdrawalId);
  return graphQLRequest(REJECT_WITHDRAWAL_MUTATION, { withdrawalId, reason: reason.trim() });
}

export function processAdminWithdrawalPayout(withdrawalId: number): Promise<{ processWithdrawalPayout: Pick<AdminWithdrawal, 'id' | 'status'> }> {
  validWithdrawalId(withdrawalId);
  return graphQLRequest(PROCESS_PAYOUT_MUTATION, { withdrawalId });
}

export function completeSandboxAdminWithdrawalPayout(withdrawalId: number): Promise<{ completeSandboxWithdrawalPayout: Pick<AdminWithdrawal, 'id' | 'status'> }> {
  validWithdrawalId(withdrawalId);
  return graphQLRequest(COMPLETE_SANDBOX_PAYOUT_MUTATION, { withdrawalId });
}

export function failSandboxAdminWithdrawalPayout(withdrawalId: number, reason: string): Promise<{ failSandboxWithdrawalPayout: Pick<AdminWithdrawal, 'id' | 'status' | 'rejectionReason'> }> {
  validWithdrawalId(withdrawalId);
  const normalizedReason = reason.trim();
  if (normalizedReason.length < 5 || normalizedReason.length > 500) throw new Error('Failure reason must be between 5 and 500 characters.');
  return graphQLRequest(FAIL_SANDBOX_PAYOUT_MUTATION, { withdrawalId, reason: normalizedReason });
}
