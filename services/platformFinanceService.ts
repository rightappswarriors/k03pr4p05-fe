import { gql } from 'graphql-request';

import { graphQLRequest } from './apiClient';

export type PlatformEnvironment = 'SANDBOX' | 'PRODUCTION';
export type PlatformWithdrawalStatus = 'PENDING' | 'APPROVED' | 'PROCESSING' | 'COMPLETED' | 'REJECTED' | 'FAILED' | 'CANCELLED';

const PLATFORM_FINANCE = gql`
  query PlatformFinance($environment: Environment!, $page: Int!, $pageSize: Int!) {
    platformFeeSummary(environment: $environment) {
      wallet { id currency environment balance heldBalance }
      totalEarned totalWithdrawn pendingAmount pendingCount processingCount
    }
    platformPayoutMethods(environment: $environment) {
      id environment type accountName maskedAccountNumber bankName isVerified isActive verifiedAt createdAt
    }
    platformWithdrawals(environment: $environment, page: $page, pageSize: $pageSize) {
      total page pageSize
      items {
        id amount status environment requestedById approvedById requestedAt approvedAt completedAt rejectionReason
        payoutDestinationMasked payoutDestinationAccount payoutDestinationBank payoutMethodTypeSnapshot
        payoutAttempts { id provider status providerReference failureReason createdAt completedAt }
      }
    }
    platformFeeLedger(environment: $environment, page: $page, pageSize: $pageSize) {
      total page pageSize
      items { id sourceType referenceId paymentTransactionId purchaseOrderId grossAmount platformFee supplierNet channel amount balanceAfter environment createdAt }
    }
  }
`;

export const platformFinanceService = {
  load: (environment: PlatformEnvironment, page = 1, pageSize = 20) => graphQLRequest<any>(PLATFORM_FINANCE, { environment, page, pageSize }),
  createPayoutMethod: (input: { environment: PlatformEnvironment; type: string; accountName: string; destination: string; bankName?: string }) => graphQLRequest<any>(
    `mutation($environment:Environment!,$type:PayoutMethodType!,$accountName:String!,$destination:String!,$bankName:String){createPlatformPayoutMethod(environment:$environment,type:$type,accountName:$accountName,destination:$destination,bankName:$bankName){id}}`, input,
  ),
  requestWithdrawal: (environment: PlatformEnvironment, amount: number, payoutMethodId: string) => graphQLRequest<any>(
    `mutation($environment:Environment!,$amount:Float!,$payoutMethodId:String!){requestPlatformWithdrawal(environment:$environment,amount:$amount,payoutMethodId:$payoutMethodId){id status}}`, { environment, amount, payoutMethodId },
  ),
  verifyPayoutMethod: (id: string) => graphQLRequest<any>(
    `mutation($id:String!){verifyPlatformPayoutMethod(id:$id){id isVerified verifiedAt}}`, { id },
  ),
  act: (name: 'approvePlatformWithdrawal' | 'processPlatformWithdrawalPayout' | 'completeSandboxPlatformWithdrawal', id: string) => graphQLRequest<any>(`mutation($id:String!){${name}(id:$id){id status}}`, { id }),
  reject: (name: 'rejectPlatformWithdrawal' | 'failSandboxPlatformWithdrawal', id: string, reason: string) => graphQLRequest<any>(`mutation($id:String!,$reason:String!){${name}(id:$id,reason:$reason){id status rejectionReason}}`, { id, reason }),
};
