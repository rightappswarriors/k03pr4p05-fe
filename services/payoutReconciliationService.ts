import { gql } from 'graphql-request';
import { graphQLRequest } from './apiClient';

export type PayoutReconciliationEnvironment = 'SANDBOX' | 'PRODUCTION';

export interface PayoutReconciliationRow {
  withdrawalId: number;
  withdrawalReference: string;
  supplierName: string;
  amount: number;
  environment: PayoutReconciliationEnvironment;
  withdrawalStatus: string;
  attemptId: string | null;
  provider: string | null;
  providerReference: string | null;
  attemptStatus: string | null;
  attemptUpdatedAt: string | null;
  warnings: string[];
  requestedAt: string;
  approvedAt: string | null;
  completedAt: string | null;
  payoutDestinationBank: string | null;
  payoutDestinationMasked: string | null;
  payoutMethodTypeSnapshot: string | null;
  reservationStatus: string | null;
  reservationAmount: number | null;
  terminalLedgerStatus: string | null;
  terminalLedgerAmount: number | null;
  walletBalance: number;
  walletHeldBalance: number;
  legacyReviewed: boolean;
  legacyReviewedAt: string | null;
  legacyReviewedById: number | null;
}

export interface PayoutReconciliationPage {
  items: PayoutReconciliationRow[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PayoutReconciliationSummary {
  reconciliationRequired: number;
  processing: number;
  failed: number;
  succeeded: number;
  needsReview: number;
}

export interface PayoutReconciliationData {
  adminPayoutReconciliationSummary: PayoutReconciliationSummary;
  adminPayoutReconciliations: PayoutReconciliationPage;
  adminPayoutReconciliationProviders: string[];
}

const PAYOUT_RECONCILIATION_QUERY = gql`
  query AdminPayoutReconciliations($environment: Environment!, $search: String, $attemptStatus: String, $withdrawalStatus: String, $diagnostic: String, $needsReview: Boolean, $provider: String, $startDate: String, $endDate: String, $page: Int, $pageSize: Int) {
    adminPayoutReconciliationSummary(environment: $environment) {
      reconciliationRequired
      processing
      failed
      succeeded
      needsReview
    }
    adminPayoutReconciliationProviders(environment: $environment)
    adminPayoutReconciliations(environment: $environment, search: $search, attemptStatus: $attemptStatus, withdrawalStatus: $withdrawalStatus, diagnostic: $diagnostic, needsReview: $needsReview, provider: $provider, startDate: $startDate, endDate: $endDate, page: $page, pageSize: $pageSize) {
      total
      page
      pageSize
      items {
        withdrawalId
        withdrawalReference
        supplierName
        amount
        environment
        withdrawalStatus
        attemptId
        provider
        providerReference
        attemptStatus
        attemptUpdatedAt
        warnings
        requestedAt
        approvedAt
        completedAt
        payoutDestinationBank
        payoutDestinationMasked
        payoutMethodTypeSnapshot
        reservationStatus
        reservationAmount
        terminalLedgerStatus
        terminalLedgerAmount
        walletBalance
        walletHeldBalance
        legacyReviewed
        legacyReviewedAt
        legacyReviewedById
      }
    }
  }
`;

const REFRESH_PAYOUT_STATUS_MUTATION = gql`
  mutation RefreshWithdrawalPayoutStatus($attemptId: String!) {
    refreshWithdrawalPayoutStatus(attemptId: $attemptId) {
      attemptId
    }
  }
`;

const ADD_RECONCILIATION_NOTE_MUTATION = gql`
  mutation AddWithdrawalPayoutReconciliationNote($attemptId: String!, $note: String!) {
    addWithdrawalPayoutReconciliationNote(attemptId: $attemptId, note: $note) {
      attemptId
    }
  }
`;

const ACKNOWLEDGE_LEGACY_RECONCILIATION_MUTATION = gql`
  mutation AcknowledgeLegacyPayoutReconciliation($withdrawalId: Int!, $note: String) {
    acknowledgeLegacyPayoutReconciliation(withdrawalId: $withdrawalId, note: $note)
  }
`;

export function getAdminPayoutReconciliations(input: {
  environment: PayoutReconciliationEnvironment;
  search?: string;
  attemptStatus?: string;
  withdrawalStatus?: string;
  diagnostic?: string;
  needsReview?: boolean;
  provider?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}): Promise<PayoutReconciliationData> {
  return graphQLRequest<PayoutReconciliationData>(PAYOUT_RECONCILIATION_QUERY, input);
}

export function refreshAdminWithdrawalPayoutStatus(attemptId: string): Promise<{ refreshWithdrawalPayoutStatus: Pick<PayoutReconciliationRow, 'attemptId'> }> {
  return graphQLRequest(REFRESH_PAYOUT_STATUS_MUTATION, { attemptId });
}

export function addAdminWithdrawalPayoutReconciliationNote(attemptId: string, note: string): Promise<{ addWithdrawalPayoutReconciliationNote: Pick<PayoutReconciliationRow, 'attemptId'> }> {
  return graphQLRequest(ADD_RECONCILIATION_NOTE_MUTATION, { attemptId, note });
}

export function acknowledgeLegacyAdminPayoutReconciliation(withdrawalId: number, note?: string): Promise<{ acknowledgeLegacyPayoutReconciliation: boolean }> {
  return graphQLRequest(ACKNOWLEDGE_LEGACY_RECONCILIATION_MUTATION, { withdrawalId, note });
}
