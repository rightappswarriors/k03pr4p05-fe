import { graphQLRequest } from './apiClient';

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
}
