import { gql } from 'graphql-request'
import { graphQLRequest } from '../apiClient'

export interface SupplierWalletSummary {
  id: number
  orgId: number
  balance: number
  heldBalance: number
  pendingWithdrawalTotal: number
  totalWithdrawn: number
  lifetimeEarnings: number
  feesPaid: number
  currency: string
  createdAt: string
  updatedAt: string
}

export interface SupplierLedgerEntry {
  id: number
  walletId: number
  type: string
  sourceType: string
  referenceId?: string | null
  amount: number
  balanceAfter: number
  status: string
  environment: string
  createdAt: string
}

export interface SupplierTransactionPageItem { id: number; label: string; direction: string; statusLabel: string; referenceType: string; reference?: string | null; amount: number; balanceAfter: number; sourceType: string; environment: string; createdAt: string; linkedPoNumber?: string | null; linkedWithdrawalId?: number | null }
export interface SupplierTransactionPage { items: SupplierTransactionPageItem[]; total: number; page: number; limit: number; totalPages: number }
export interface SupplierFeeHistoryItem { settlementId: string; poId: string; poNumber?: string | null; grossAmount: number; platformFee: number; supplierNet: number; feeRuleId: string; feeRateType: string; feeRate?: number | null; environment: string; settledAt: string; walletPostedAt?: string | null; status: string }
export interface SupplierFeeHistoryPage { items: SupplierFeeHistoryItem[]; total: number; page: number; limit: number; totalPages: number }

export async function getSupplierTransactionPage(input: { page?: number; limit?: number; search?: string; sourceType?: string; status?: string; from?: string; to?: string } = {}): Promise<SupplierTransactionPage> {
  const QUERY = gql`query SupplierTransactionPage($page: Int, $limit: Int, $search: String, $sourceType: String, $status: String, $from: DateTime, $to: DateTime) { supplierTransactionPage(page: $page, limit: $limit, search: $search, sourceType: $sourceType, status: $status, from: $from, to: $to) { items { id label direction statusLabel referenceType reference amount balanceAfter sourceType environment createdAt linkedPoNumber linkedWithdrawalId } total page limit totalPages } }`
  return (await graphQLRequest<{ supplierTransactionPage: SupplierTransactionPage }>(QUERY, input)).supplierTransactionPage
}

export async function getSupplierFeeHistoryPage(input: { page?: number; limit?: number; environment?: string; from?: string; to?: string } = {}): Promise<SupplierFeeHistoryPage> {
  const QUERY = gql`query SupplierFeeHistoryPage($page: Int, $limit: Int, $environment: Environment, $from: DateTime, $to: DateTime) { supplierFeeHistoryPage(page: $page, limit: $limit, environment: $environment, from: $from, to: $to) { items { settlementId poId poNumber grossAmount platformFee supplierNet feeRuleId feeRateType feeRate environment settledAt walletPostedAt status } total page limit totalPages } }`
  return (await graphQLRequest<{ supplierFeeHistoryPage: SupplierFeeHistoryPage }>(QUERY, input)).supplierFeeHistoryPage
}

export interface SupplierWithdrawalRecord {
  id: number
  walletId: number
  payoutMethodId: number
  amount: number
  status: string
  requestedAt: string
  approvedAt?: string | null
  completedAt?: string | null
  rejectionReason?: string | null
  payoutMethod: {
    id: number
    type: string
    accountName: string
    maskedAccountNumber: string
    bankName?: string | null
    isDefault: boolean
  }
}

export interface SupplierPayoutMethod {
  id: number
  orgId: number
  type: string
  accountName: string
  accountNumber: string
  confirmAccountNumber: string
  bankName?: string | null
  isVerified: boolean
  isDefault: boolean
  isActive: boolean
  createdAt: string
}

export async function getSupplierWalletSummary(): Promise<SupplierWalletSummary> {
  const QUERY = gql`
    query SupplierWalletSummary {
      supplierWalletSummary {
        id
        orgId
        balance
        heldBalance
        pendingWithdrawalTotal
        totalWithdrawn
        lifetimeEarnings
        feesPaid
        currency
        createdAt
        updatedAt
      }
    }
  `
  const res = await graphQLRequest<{ supplierWalletSummary: SupplierWalletSummary }>(QUERY)
  return res.supplierWalletSummary
}

export async function getSupplierFinanceTransactions(): Promise<SupplierLedgerEntry[]> {
  const QUERY = gql`
    query SupplierFinanceTransactions {
      supplierFinanceTransactions {
        id
        walletId
        type
        sourceType
        referenceId
        amount
        balanceAfter
        status
        environment
        createdAt
      }
    }
  `
  const res = await graphQLRequest<{ supplierFinanceTransactions: SupplierLedgerEntry[] }>(QUERY)
  return res.supplierFinanceTransactions
}

export async function getSupplierFinanceWithdrawals(): Promise<SupplierWithdrawalRecord[]> {
  const QUERY = gql`
    query SupplierFinanceWithdrawals {
      supplierFinanceWithdrawals {
        id
        walletId
        payoutMethodId
        amount
        status
        requestedAt
        approvedAt
        completedAt
        rejectionReason
        payoutMethod {
          id
          type
          accountName
          maskedAccountNumber
          bankName
          isDefault
        }
      }
    }
  `
  const res = await graphQLRequest<{ supplierFinanceWithdrawals: SupplierWithdrawalRecord[] }>(QUERY)
  return res.supplierFinanceWithdrawals
}

export async function getSupplierFinancePayoutMethods(): Promise<SupplierPayoutMethod[]> {
  const QUERY = gql`
    query SupplierFinancePayoutMethods {
      supplierFinancePayoutMethods {
        id
        orgId
        type
        accountName
        maskedAccountNumber
        bankName
        isVerified
        isDefault
        isActive
        createdAt
      }
    }
  `
  const res = await graphQLRequest<{ supplierFinancePayoutMethods: SupplierPayoutMethod[] }>(QUERY)
  return res.supplierFinancePayoutMethods
}

export async function getSupplierFinanceFeeHistory(): Promise<SupplierLedgerEntry[]> {
  const QUERY = gql`
    query SupplierFinanceFeeHistory {
      supplierFinanceFeeHistory {
        id
        walletId
        type
        sourceType
        referenceId
        amount
        balanceAfter
        status
        environment
        createdAt
      }
    }
  `
  const res = await graphQLRequest<{ supplierFinanceFeeHistory: SupplierLedgerEntry[] }>(QUERY)
  return res.supplierFinanceFeeHistory
}

export async function requestSupplierWithdrawal(amount: number, payoutMethodId: number): Promise<SupplierWithdrawalRecord> {
  const MUTATION = gql`
    mutation RequestSupplierWithdrawal($amount: Float!, $payoutMethodId: Int!) {
      requestSupplierWithdrawal(amount: $amount, payoutMethodId: $payoutMethodId) {
        id
        walletId
        payoutMethodId
        amount
        status
        requestedAt
        approvedAt
        completedAt
        rejectionReason
        payoutMethod {
          id
          type
          accountName
          maskedAccountNumber
          bankName
          isDefault
        }
      }
    }
  `
  const res = await graphQLRequest<{ requestSupplierWithdrawal: SupplierWithdrawalRecord }>(MUTATION, { amount, payoutMethodId })
  return res.requestSupplierWithdrawal
}

export async function createSupplierPayoutMethod(input: {
  type: string
  accountName: string
  maskedAccountNumber: string
  bankName?: string | null
  isDefault?: boolean
}): Promise<SupplierPayoutMethod> {
  const MUTATION = gql`
    mutation CreateSupplierPayoutMethod(
      $type: PayoutMethodType!
      $accountName: String!
      $accountNumber: String!
      $confirmAccountNumber: String!
      $bankName: String
      $isDefault: Boolean
    ) {
      createSupplierPayoutMethod(
        type: $type
        accountName: $accountName
        accountNumber: $accountNumber
        confirmAccountNumber: $confirmAccountNumber
        bankName: $bankName
        isDefault: $isDefault
      ) {
        id
        orgId
        type
        accountName
        maskedAccountNumber
        bankName
        isVerified
        isDefault
        isActive
        createdAt
      }
    }
  `
  const res = await graphQLRequest<{ createSupplierPayoutMethod: SupplierPayoutMethod }>(MUTATION, input)
  return res.createSupplierPayoutMethod
}
