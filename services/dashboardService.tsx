// services/dashboardService.ts
import { gql } from 'graphql-request';
import { graphQLRequest } from './apiClient';

export interface DashboardOrderTrendPoint {
  period: string;
  total: number;
}

export interface DashboardOrderStatusBreakdown {
  category: string;
  count: number;
  amount: number;
}

export interface DashboardOrderStats {
  receivableSalesTotal: number;
  receivableOrderCount: number;
  totalSalesAmount: number;
  totalSalesOrderCount: number;
  processingOrders: number;
  pendingOrders: number;
  receivedOrders: number;
  cancelledReturnedOrders: number;
  salesOrderReceivableTotal: number;
  salesOrderReceivableCount: number;
  kompraReceivableTotal: number;
  kompraReceivableCount: number;
  salesOrderCompletedTotal: number;
  salesOrderCompletedCount: number;
  kompraCompletedTotal: number;
  kompraCompletedCount: number;
  orderStatusBreakdown: DashboardOrderStatusBreakdown[];
  salesTrend: DashboardOrderTrendPoint[];
}

export class DashboardService {
  static async getOrderDashboardStats(filters?: {
    organizationId?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<DashboardOrderStats> {
    const QUERY = gql`
      query GetOrderDashboardStats(
        $organizationId: Int
        $startDate: String
        $endDate: String
      ) {
        getDashboardOrderStats(
          organizationId: $organizationId
          startDate: $startDate
          endDate: $endDate
        ) {
          receivableSalesTotal
          receivableOrderCount
          totalSalesAmount
          totalSalesOrderCount
          processingOrders
          pendingOrders
          receivedOrders
          cancelledReturnedOrders
          salesOrderReceivableTotal
          salesOrderReceivableCount
          kompraReceivableTotal
          kompraReceivableCount
          salesOrderCompletedTotal
          salesOrderCompletedCount
          kompraCompletedTotal
          kompraCompletedCount
          orderStatusBreakdown { category count amount }
          salesTrend { period total }
        }
      }
    `;

    const zero: DashboardOrderStats = {
      receivableSalesTotal: 0,
      receivableOrderCount: 0,
      totalSalesAmount: 0,
      totalSalesOrderCount: 0,
      processingOrders: 0,
      pendingOrders: 0,
      receivedOrders: 0,
      cancelledReturnedOrders: 0,
      salesOrderReceivableTotal: 0,
      salesOrderReceivableCount: 0,
      kompraReceivableTotal: 0,
      kompraReceivableCount: 0,
      salesOrderCompletedTotal: 0,
      salesOrderCompletedCount: 0,
      kompraCompletedTotal: 0,
      kompraCompletedCount: 0,
      orderStatusBreakdown: [],
      salesTrend: [],
    };

    try {
      const response = await graphQLRequest<{
        getDashboardOrderStats: DashboardOrderStats | null;
      }>(QUERY, {
        organizationId: filters?.organizationId,
        startDate: filters?.startDate,
        endDate: filters?.endDate,
      });

      return response.getDashboardOrderStats ?? zero;
    } catch (error) {
      console.error('Failed to fetch dashboard order stats:', error);
      return zero;
    }
  }
}
