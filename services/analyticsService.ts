// services/analyticsService.ts
// Follows the same pattern as AdminCategoryService — gql + graphQLRequest

import { gql } from 'graphql-request';
import { graphQLRequest } from './apiClient';

// ─── Shared Types ─────────────────────────────────────────────────────────────

export type DateRangePreset = 'all' | 'today' | 'this_week' | 'this_month' | 'custom';

export interface DateRangeInput {
    startDate?: string; // ISO string
    endDate?: string;   // ISO string
}

export interface BranchPerformance {
    branchId: number;
    branchName: string;
    totalRevenue: number;
    totalCost: number;
    grossProfit: number;
    profitMargin: number;
    totalOrders: number;
    deltaRevenue: number;       // % change vs previous period
    deltaProfit: number;        // % change vs previous period
    isProfitable: boolean;
    trend: number[];            // sparkline — last 6 data points
}

export interface ItemPerformance {
    itemId: number;
    itemName: string;
    itemImage?: string;
    categoryName?: string;
    totalRevenue: number;
    totalCost: number;
    grossProfit: number;
    profitMargin: number;
    unitsSold: number;
    revenuePerUnit: number;
    trend: 'up' | 'down' | 'stable';
    trendPct: number;
    status: 'top_seller' | 'stable' | 'slow_mover' | 'loss_item';
}

export interface SalesTrendPoint {
    label: string;
    revenue: number;
    cost: number;
    profit: number;
    orders: number;
}

export interface AnalyticsSummary {
    totalRevenue: number;
    totalCost: number;
    grossProfit: number;
    profitMargin: number;
    totalOrders: number;
    totalItemsSold: number;
    revenueChange: number;   // % vs previous period
    profitChange: number;    // % vs previous period
    profitableBranches: number;
    totalBranches: number;
}

export interface SalesAnalyticsPayload {
    summary: AnalyticsSummary;
    branches: BranchPerformance[];
    topItems: ItemPerformance[];
    bottomItems: ItemPerformance[];
    trend: SalesTrendPoint[];
}

// ─── Analytics Service ────────────────────────────────────────────────────────

export class AnalyticsService {

    /**
     * Master sales analytics query — returns everything the screen needs
     * in a single round-trip.
     */
    static async getSalesAnalytics(
        preset: DateRangePreset = 'this_month',
        dateRange?: DateRangeInput,
    ): Promise<SalesAnalyticsPayload> {
        const GQL = gql`
      query GetSalesAnalytics(
        $preset: DateRangePreset!
        $startDate: String
        $endDate: String
      ) {
        getSalesAnalytics(
          preset: $preset
          startDate: $startDate
          endDate: $endDate
        ) {
          summary {
            totalRevenue
            totalCost
            grossProfit
            profitMargin
            totalOrders
            totalItemsSold
            revenueChange
            profitChange
            profitableBranches
            totalBranches
          }
          branches {
            branchId
            branchName
            totalRevenue
            totalCost
            grossProfit
            profitMargin
            totalOrders
            deltaRevenue
            deltaProfit
            isProfitable
            trend
          }
          topItems {
            itemId
            itemName
            itemImage
            categoryName
            totalRevenue
            totalCost
            grossProfit
            profitMargin
            unitsSold
            revenuePerUnit
            trend
            trendPct
            status
          }
          bottomItems {
            itemId
            itemName
            itemImage
            categoryName
            totalRevenue
            totalCost
            grossProfit
            profitMargin
            unitsSold
            revenuePerUnit
            trend
            trendPct
            status
          }
          trend {
            label
            revenue
            cost
            profit
            orders
          }
        }
      }
    `;

        try {
            const res = await graphQLRequest<{ getSalesAnalytics: SalesAnalyticsPayload }>(GQL, {
                preset,
                startDate: dateRange?.startDate ?? null,
                endDate: dateRange?.endDate ?? null,
            });
            return res.getSalesAnalytics;
        } catch (error) {
            console.log('AnalyticsService.getSalesAnalytics error:', JSON.stringify(error));
            throw error;
        }
    }

    /**
     * Branch-only breakdown — used when drilling into a single branch.
     */
    static async getBranchAnalytics(
        branchId: number,
        preset: DateRangePreset = 'this_month',
        dateRange?: DateRangeInput,
    ): Promise<{ branch: BranchPerformance; trend: SalesTrendPoint[] }> {
        const GQL = gql`
      query GetBranchAnalytics(
        $branchId: Int!
        $preset: DateRangePreset!
        $startDate: String
        $endDate: String
      ) {
        getBranchAnalytics(
          branchId: $branchId
          preset: $preset
          startDate: $startDate
          endDate: $endDate
        ) {
          branch {
            branchId
            branchName
            totalRevenue
            totalCost
            grossProfit
            profitMargin
            totalOrders
            deltaRevenue
            deltaProfit
            isProfitable
            trend
          }
          trend {
            label
            revenue
            cost
            profit
            orders
          }
        }
      }
    `;

        try {
            const res = await graphQLRequest<{
                getBranchAnalytics: { branch: BranchPerformance; trend: SalesTrendPoint[] };
            }>(GQL, {
                branchId,
                preset,
                startDate: dateRange?.startDate ?? null,
                endDate: dateRange?.endDate ?? null,
            });
            return res.getBranchAnalytics;
        } catch (error) {
            console.log('AnalyticsService.getBranchAnalytics error:', JSON.stringify(error));
            throw error;
        }
    }

    /**
     * Item performance only — for the full item table view.
     */
    static async getItemAnalytics(
        preset: DateRangePreset = 'this_month',
        dateRange?: DateRangeInput,
        limit = 20,
    ): Promise<{ topItems: ItemPerformance[]; bottomItems: ItemPerformance[] }> {
        const GQL = gql`
      query GetItemAnalytics(
        $preset: DateRangePreset!
        $startDate: String
        $endDate: String
        $limit: Int
      ) {
        getItemAnalytics(
          preset: $preset
          startDate: $startDate
          endDate: $endDate
          limit: $limit
        ) {
          topItems {
            itemId
            itemName
            itemImage
            categoryName
            totalRevenue
            totalCost
            grossProfit
            profitMargin
            unitsSold
            revenuePerUnit
            trend
            trendPct
            status
          }
          bottomItems {
            itemId
            itemName
            itemImage
            categoryName
            totalRevenue
            totalCost
            grossProfit
            profitMargin
            unitsSold
            revenuePerUnit
            trend
            trendPct
            status
          }
        }
      }
    `;

        try {
            const res = await graphQLRequest<{
                getItemAnalytics: { topItems: ItemPerformance[]; bottomItems: ItemPerformance[] };
            }>(GQL, {
                preset,
                startDate: dateRange?.startDate ?? null,
                endDate: dateRange?.endDate ?? null,
                limit,
            });
            return res.getItemAnalytics;
        } catch (error) {
            console.log('AnalyticsService.getItemAnalytics error:', JSON.stringify(error));
            throw error;
        }
    }
}