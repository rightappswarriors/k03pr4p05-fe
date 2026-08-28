import { gql } from 'graphql-request'
import { graphQLRequest } from './apiClient'

export type CommerceMetrics = { grossMerchandiseValue: number; confirmedPayments: number; kompraFeesEarned: number; supplierFundsHeld: number; supplierFundsAvailable: number; pendingWithdrawals: number; completedWithdrawals: number }
export type CommercePayment = { id: string; provider: string; status: string; relatedId: string; gross: number; fee: number; net: number; environment: string; createdAt: string; poNumber?: string | null; buyerName?: string | null; supplierName?: string | null; fundsStatus?: string | null }
export type CommerceWithdrawal = { id: number; amount: number; status: string; requestedAt: string; sandboxReference?: string | null; supplierName: string; payoutMethod: string; environment: string }
export type SandboxPaymentReconciliation = { id: string; poNumber: string; buyerName?: string | null; supplierName: string; provider: string; amount: number; currency: string; gatewayReference?: string | null; webhookStatus?: string | null; webhookReceivedAt?: string | null; verificationResult?: string | null; status: string; environment: string }

export async function getAdminCommerce() {
  const query = gql`query AdminCommerce { adminCommerceDashboard { grossMerchandiseValue confirmedPayments kompraFeesEarned supplierFundsHeld supplierFundsAvailable pendingWithdrawals completedWithdrawals } adminCommercePayments { id provider status relatedId gross fee net environment createdAt poNumber buyerName supplierName fundsStatus } adminCommerceWithdrawals { id amount status requestedAt sandboxReference supplierName payoutMethod environment } }`
  return graphQLRequest<{ adminCommerceDashboard: CommerceMetrics; adminCommercePayments: CommercePayment[]; adminCommerceWithdrawals: CommerceWithdrawal[] }>(query)
}

export async function releaseSupplierFunds(paymentTransactionId: string) {
  return graphQLRequest(gql`mutation ReleaseSupplierFunds($paymentTransactionId: String!) { adminReleaseSupplierFunds(paymentTransactionId: $paymentTransactionId) { id balance heldBalance } }`, { paymentTransactionId })
}

export async function approveWithdrawal(withdrawalId: number) {
  return graphQLRequest(gql`mutation ApproveWithdrawal($withdrawalId: Int!) { adminApproveWithdrawal(withdrawalId: $withdrawalId) { id status } }`, { withdrawalId })
}

export async function simulateSandboxPayout(withdrawalId: number, outcome: 'SUCCESS' | 'FAILURE') {
  return graphQLRequest(gql`mutation SimulateSandboxPayout($withdrawalId: Int!, $outcome: SandboxPayoutOutcome!) { adminSimulateSandboxPayout(withdrawalId: $withdrawalId, outcome: $outcome) { id status sandboxReference } }`, { withdrawalId, outcome })
}

export async function getSandboxPaymentReconciliations() {
  return graphQLRequest<{ adminSandboxPaymentReconciliations: SandboxPaymentReconciliation[] }>(gql`query SandboxPaymentReconciliations { adminSandboxPaymentReconciliations { id poNumber buyerName supplierName provider amount currency gatewayReference webhookStatus webhookReceivedAt verificationResult status environment } }`)
}

export async function confirmSandboxPaymentReconciliation(paymentTransactionId: string, reason: string) {
  return graphQLRequest(gql`mutation ConfirmSandboxPayment($paymentTransactionId: String!, $reason: String!) { adminConfirmSandboxPaymentReconciliation(paymentTransactionId: $paymentTransactionId, reason: $reason) { id status } }`, { paymentTransactionId, reason })
}
