// adminCommerceService.ts
import { gql } from 'graphql-request';
import { graphQLRequest } from './apiClient';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CommerceMetrics {
  grossMerchandiseValue: number;
  confirmedPayments: number;
  kompraFeesEarned: number;
  supplierFundsHeld: number;
  supplierFundsAvailable: number;
  pendingWithdrawals: number;
  completedWithdrawals: number;
}

export interface CommercePayment {
  id: string;
  provider: string;
  status: string;
  relatedId: string;
  gross: number;
  fee: number;
  net: number;
  environment: string;
  createdAt: string;
  poNumber?: string | null;
  buyerName?: string | null;
  supplierName?: string | null;
  fundsStatus?: string | null;
}

export interface CommerceWithdrawal {
  id: number;
  amount: number;
  status: string;
  requestedAt: string;
  sandboxReference?: string | null;
  supplierName: string;
  payoutMethod: string;
  environment: string;
}

export interface SandboxPaymentReconciliation {
  id: string;
  poNumber: string;
  buyerName?: string | null;
  supplierName: string;
  provider: string;
  amount: number;
  currency: string;
  gatewayReference?: string | null;
  webhookStatus?: string | null;
  webhookReceivedAt?: string | null;
  verificationResult?: string | null;
  status: string;
  environment: string;
}

export interface AdminCommerceData {
  adminCommerceDashboard: CommerceMetrics;
  adminCommercePayments: CommercePayment[];
  adminCommerceWithdrawals: CommerceWithdrawal[];
}

export interface ReleaseSupplierFundsResult {
  id: string;
  balance: number;
  heldBalance: number;
}

export interface ApproveWithdrawalResult {
  id: number;
  status: string;
}

export type SandboxPayoutOutcome = 'SUCCESS' | 'FAILURE';

export interface SimulateSandboxPayoutResult {
  id: number;
  status: string;
  sandboxReference: string | null;
}

export interface SandboxPaymentReconciliationsData {
  adminSandboxPaymentReconciliations: SandboxPaymentReconciliation[];
}

export interface ConfirmSandboxPaymentResult {
  id: string;
  status: string;
}

// ─── GraphQL Queries & Mutations ───────────────────────────────────────────────

export const ADMIN_COMMERCE_QUERY = gql`
  query AdminCommerce {
    adminCommerceDashboard {
      grossMerchandiseValue
      confirmedPayments
      kompraFeesEarned
      supplierFundsHeld
      supplierFundsAvailable
      pendingWithdrawals
      completedWithdrawals
    }
    adminCommercePayments {
      id
      provider
      status
      relatedId
      gross
      fee
      net
      environment
      createdAt
      poNumber
      buyerName
      supplierName
      fundsStatus
    }
    adminCommerceWithdrawals {
      id
      amount
      status
      requestedAt
      sandboxReference
      supplierName
      payoutMethod
      environment
    }
  }
`;

export const RELEASE_SUPPLIER_FUNDS_MUTATION = gql`
  mutation ReleaseSupplierFunds($paymentTransactionId: String!) {
    adminReleaseSupplierFunds(paymentTransactionId: $paymentTransactionId) {
      id
      balance
      heldBalance
    }
  }
`;

export const APPROVE_WITHDRAWAL_MUTATION = gql`
  mutation ApproveWithdrawal($withdrawalId: Int!) {
    adminApproveWithdrawal(withdrawalId: $withdrawalId) {
      id
      status
    }
  }
`;

export const SIMULATE_SANDBOX_PAYOUT_MUTATION = gql`
  mutation SimulateSandboxPayout($withdrawalId: Int!, $outcome: SandboxPayoutOutcome!) {
    adminSimulateSandboxPayout(withdrawalId: $withdrawalId, outcome: $outcome) {
      id
      status
      sandboxReference
    }
  }
`;

export const SANDBOX_PAYMENT_RECONCILIATIONS_QUERY = gql`
  query SandboxPaymentReconciliations {
    adminSandboxPaymentReconciliations {
      id
      poNumber
      buyerName
      supplierName
      provider
      amount
      currency
      gatewayReference
      webhookStatus
      webhookReceivedAt
      verificationResult
      status
      environment
    }
  }
`;

export const CONFIRM_SANDBOX_PAYMENT_MUTATION = gql`
  mutation ConfirmSandboxPayment($paymentTransactionId: String!, $reason: String!) {
    adminConfirmSandboxPaymentReconciliation(
      paymentTransactionId: $paymentTransactionId
      reason: $reason
    ) {
      id
      status
    }
  }
`;

// ─── Fetchers ──────────────────────────────────────────────────────────────────

export function getAdminCommerce(): Promise<AdminCommerceData> {
  return graphQLRequest<AdminCommerceData>(ADMIN_COMMERCE_QUERY);
}

export function releaseSupplierFunds(
  paymentTransactionId: string,
): Promise<ReleaseSupplierFundsResult> {
  return graphQLRequest<ReleaseSupplierFundsResult>(RELEASE_SUPPLIER_FUNDS_MUTATION, {
    paymentTransactionId,
  });
}

export function approveWithdrawal(withdrawalId: number): Promise<ApproveWithdrawalResult> {
  return graphQLRequest<ApproveWithdrawalResult>(APPROVE_WITHDRAWAL_MUTATION, {
    withdrawalId,
  });
}

export function simulateSandboxPayout(
  withdrawalId: number,
  outcome: SandboxPayoutOutcome,
): Promise<SimulateSandboxPayoutResult> {
  return graphQLRequest<SimulateSandboxPayoutResult>(SIMULATE_SANDBOX_PAYOUT_MUTATION, {
    withdrawalId,
    outcome,
  });
}

export function getSandboxPaymentReconciliations(): Promise<SandboxPaymentReconciliationsData> {
  return graphQLRequest<SandboxPaymentReconciliationsData>(
    SANDBOX_PAYMENT_RECONCILIATIONS_QUERY,
  );
}

export function confirmSandboxPaymentReconciliation(
  paymentTransactionId: string,
  reason: string,
): Promise<ConfirmSandboxPaymentResult> {
  return graphQLRequest<ConfirmSandboxPaymentResult>(CONFIRM_SANDBOX_PAYMENT_MUTATION, {
    paymentTransactionId,
    reason,
  });
}