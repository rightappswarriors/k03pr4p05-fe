import { graphQLRequest } from './apiClient';

export type DiscountAuditTransactionType = 'Transaction' | 'SalesOrder' | 'KompraOrder';

export interface DiscountAuditFilters {
  customerId?: string;
  itemId?: number;
  discountType?: string;
  transactionType?: DiscountAuditTransactionType | 'ALL';
  dateFrom?: string;
  dateTo?: string;
}

export interface DiscountAuditRow {
  id: string;
  orgId: number;
  userId: number;
  customerId?: string | null;
  itemId?: number | null;
  transactionId?: number | null;
  salesOrderId?: string | null;
  kompraOrderId?: number | null;
  customItemName?: string | null;
  transactionType: DiscountAuditTransactionType | 'Unknown';
  discountType: string;
  discountAmount: number;
  eligibleAmount?: number | null;
  runningWeeklyBnpcTotal?: number | null;
  createdAt: string;
  user?: { id: number; fullname: string; email: string };
  item?: { id: number; name: string };
}

export class AuditService {
  static async getLogs(orgId: number, filters: any = {}, pagination: any = {}) {
    const query = `
      query GetAuditLogs($orgId: Int!, $filters: AuditLogFiltersInput, $pagination: PaginationInput) {
        auditLogs(orgId: $orgId, filters: $filters, pagination: $pagination) {
          id
          orgId
          userId
          pageKey
          action
          recordId
          recordType
          oldValue
          newValue
          ipAddress
          userAgent
          createdAt
          user {
            id
            fullname
            email
          }
        }
      }
    `;

    const response = await graphQLRequest(query, {
      orgId,
      filters: {
        userId: filters.userId ? Number(filters.userId) : undefined,
        action: filters.action || undefined,
        pageKey: filters.pageKey || undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
      },
      pagination: {
        page: pagination.page || 1,
        pageSize: pagination.pageSize || 25,
      },
    });

    return response.auditLogs;
  }

  static async getDiscountAudits(
    orgId: number,
    filters: DiscountAuditFilters = {},
    pagination: any = {},
  ): Promise<DiscountAuditRow[]> {
    const query = `
      query GetDiscountAudits($orgId: Int!, $filters: DiscountAuditFiltersInput, $pagination: PaginationInput) {
        discountAudits(orgId: $orgId, filters: $filters, pagination: $pagination) {
          id
          orgId
          userId
          customerId
          itemId
          transactionId
          salesOrderId
          kompraOrderId
          customItemName
          transactionType
          discountType
          discountAmount
          eligibleAmount
          runningWeeklyBnpcTotal
          createdAt
          user { id fullname email }
          item { id name }
        }
      }
    `;

    const response = await graphQLRequest<{ discountAudits: DiscountAuditRow[] }>(query, {
      orgId,
      filters: {
        customerId: filters.customerId || undefined,
        itemId: filters.itemId || undefined,
        discountType: filters.discountType === 'ALL' ? undefined : filters.discountType || undefined,
        transactionType: filters.transactionType === 'ALL' ? undefined : filters.transactionType || undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
      },
      pagination: {
        page: pagination.page || 1,
        pageSize: pagination.pageSize || 200,
      },
    });

    return response.discountAudits ?? [];
  }
}
