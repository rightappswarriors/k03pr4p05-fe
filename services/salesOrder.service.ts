// services/salesOrder.service.ts
// Frontend service for SalesOrder ERP fulfillment flow

import { gql } from "graphql-request";
import { graphQLRequest } from "./apiClient";
import { formatGraphQLError } from "@/utils/errorFormatter";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SalesOrderStatus =
  | "ORDERED"
  | "PROCESSING"
  | "SHIPPED"
  | "RECEIVED"
  | "CANCELLED";

export interface SalesOrderItemInput {
  itemId?: number;              // optional — omit for custom items
  quantity: number;
  unitPrice: number;
  unitId?: number;
  unitName?: string;
  discountQuantity?: number;
  discountRate?: number;
  discountAmount?: number;
  // ── Custom item fields ────────────────────────────────────────────────
  isCustomItem?: boolean;       // true = manually entered by staff
  customItemName?: string;      // name shown on order for custom items
  vatExempt?: boolean;          // VAT override for custom items
}

export interface DeliveryInput {
  address: string;
  courierName?: string;
  trackingNumber?: string;
  contactPerson?: string;
  contactNumber?: string;
  notes?: string;
  estimatedDate?: string;
}

export interface SalesOrderDelivery {
  id: number;
  salesOrderId: string;
  courierName?: string;
  trackingNumber?: string;
  address: string;
  contactPerson?: string;
  contactNumber?: string;
  notes?: string;
  estimatedDate?: string;
  shippedAt?: string;
  receivedAt?: string;
}

export interface SalesOrderItem {
  id: number;
  salesOrderId: string;
  itemId?: number;              // nullable — absent for custom items
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  unitId?: number;
  unitName?: string;
  discountQuantity?: number;
  discountRate?: number;
  discountAmount?: number;
  // ── Custom item fields ────────────────────────────────────────────────
  isCustomItem: boolean;
  customItemName?: string;
  vatExempt: boolean;
  item?: {
    id: number;
    name: string;
    image?: string;
    vatExempt?: boolean;
  };
}

export interface SalesOrder {
  id: string;
  orderNumber: string;
  customer: string;
  status: SalesOrderStatus;
  date: string;
  updatedAt: string;
  orgId: number;
  userId?: number;
  outletId?: number;
  branchId?: number;
  subtotal: number;
  discountAmount: number;
  vatAmount: number;
  total: number;
  vatRate: number;
  discountRate: number;
  outletPromoId?: number;
  items: SalesOrderItem[];
  delivery?: SalesOrderDelivery;
  outlet?: {
    id: number;
    name: string;
    code: string;
  };
  branch?: {
    id: number;
    name: string;
  };
}

export interface Branch {
  id: number;
  name: string;
  address: string;
  isActive: boolean;
}

export interface OutletPromo {
  id: number;
  outletId: number;
  discount: number;
  isActive: boolean;
  vatable: boolean;
  promoType: {
    id: number;
    name: string;
    description?: string;
  };
}

export interface OutletForSales {
  id: number;
  name: string;
  code: string;
  address: string;
  isActive: boolean;
  branchId?: number;
  governmentTax?: number;
  serviceCharge?: number;
  isVatRegistered: boolean;
  vatTypeId?: number;
  outletPromos: OutletPromo[];
  vatType?: {
    id: number;
    name: string;
    rate: number;
  };
}

export interface InventoryItemForSales {
  id: number;
  itemId: number;
  price: number;
  quantity: number;
  item: {
    id: number;
    name: string;
    image?: string;
    sellingPrice: number;
    barcode: string;
    description?: string;
    vatExempt?: boolean;
  };
  units: {
    id: number;
    unitName: string;
    unitLabel: string;
    price: number;
    isDefault: boolean;
    conversionFactor: number;
  }[];
  inventory?: {
    id: number;
    outlet?: {
      id: number;
      name: string;
      code: string;
    };
  };
}

export interface VatType {
  id: number;
  name: string;
  rate: number;
}

// ─── Fragment ─────────────────────────────────────────────────────────────────

const SALES_ORDER_FRAGMENT = gql`
  fragment SalesOrderFields on SalesOrder {
    id
    orderNumber
    customer
    status
    date
    updatedAt
    orgId
    userId
    outletId
    branchId
    subtotal
    discountAmount
    vatAmount
    total
    vatRate
    discountRate
    outletPromoId
    items {
      id
      itemId
      quantity
      unitPrice
      totalPrice
      unitId
      unitName
      discountQuantity
      discountRate
      discountAmount
      isCustomItem
      customItemName
      vatExempt
      item {
        id
        name
        image
        vatExempt
      }
    }
    delivery {
      id
      courierName
      trackingNumber
      address
      contactPerson
      contactNumber
      notes
      estimatedDate
      shippedAt
      receivedAt
    }
    outlet {
      id
      name
      code
    }
    branch {
      id
      name
    }
  }
`;

// ─── Service Class ────────────────────────────────────────────────────────────

export class SalesOrderService {
  // ── Queries ─────────────────────────────────────────────────────────────────

  static async getSalesOrders(filters?: {
    status?: SalesOrderStatus;
    outletId?: number;
    branchId?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<SalesOrder[]> {
    const QUERY = gql`
      ${SALES_ORDER_FRAGMENT}
      query GetSalesOrders(
        $status: SalesOrderStatusEnum
        $outletId: Int
        $branchId: Int
        $startDate: String
        $endDate: String
      ) {
        getSalesOrders(
          status: $status
          outletId: $outletId
          branchId: $branchId
          startDate: $startDate
          endDate: $endDate
        ) {
          ...SalesOrderFields
        }
      }
    `;
    try {
      const response = await graphQLRequest<{ getSalesOrders: SalesOrder[] }>(
        QUERY,
        filters ?? {}
      );
      return response.getSalesOrders ?? [];
    } catch (error) {
      console.error("getSalesOrders error:", formatGraphQLError(error));
      return [];
    }
  }

  static async getSalesOrder(id: string): Promise<SalesOrder | null> {
    const QUERY = gql`
      ${SALES_ORDER_FRAGMENT}
      query GetSalesOrder($id: String!) {
        getSalesOrder(id: $id) {
          ...SalesOrderFields
        }
      }
    `;
    try {
      const response = await graphQLRequest<{ getSalesOrder: SalesOrder | null }>(
        QUERY,
        { id }
      );
      return response.getSalesOrder;
    } catch (error) {
      console.error("getSalesOrder error:", formatGraphQLError(error));
      return null;
    }
  }

  static async getBranches(): Promise<Branch[]> {
    const QUERY = gql`
      query GetBranchesForSales {
        getBranchesForSales {
          id
          name
          address
          isActive
        }
      }
    `;
    try {
      const response = await graphQLRequest<{ getBranchesForSales: Branch[] }>(QUERY);
      return response.getBranchesForSales ?? [];
    } catch (error) {
      console.error("getBranches error:", formatGraphQLError(error));
      return [];
    }
  }

  static async getOutletsByBranch(branchId: number): Promise<OutletForSales[]> {
    const QUERY = gql`
      query GetOutletsByBranch($branchId: Int!) {
        getOutletsByBranch(branchId: $branchId) {
          id
          name
          code
          address
          isActive
          branchId
          governmentTax
          serviceCharge
          isVatRegistered
          vatTypeId
          outletPromos {
            id
            outletId
            discount
            isActive
            vatable
            promoType {
              id
              name
              description
            }
          }
          vatType {
            id
            name
            rate
          }
        }
      }
    `;
    try {
      const response = await graphQLRequest<{
        getOutletsByBranch: OutletForSales[];
      }>(QUERY, { branchId });
      return response.getOutletsByBranch ?? [];
    } catch (error) {
      console.error("getOutletsByBranch error:", formatGraphQLError(error));
      return [];
    }
  }

  static async getOrgVatTypes(): Promise<VatType[]> {
    const QUERY = gql`
      query GetOrgVatTypes {
        getOrgVatTypes {
          id
          name
          rate
        }
      }
    `;
    try {
      const response = await graphQLRequest<{ getOrgVatTypes: VatType[] }>(QUERY);
      return response.getOrgVatTypes ?? [];
    } catch (error) {
      console.error("getOrgVatTypes error:", formatGraphQLError(error));
      return [];
    }
  }

  static async getOutletInventoryItems(
    outletId: number | null
  ): Promise<InventoryItemForSales[]> {
    const QUERY = gql`
      query GetOutletInventoryItems($outletId: Int) {
        getOutletInventoryItems(outletId: $outletId) {
          id
          itemId
          price
          quantity
          item {
            id
            name
            image
            sellingPrice
            barcode
            description
            vatExempt
          }
          units {
            id
            unitName
            unitLabel
            price
            isDefault
            conversionFactor
          }
          inventory {
            id
            outlet {
              id
              name
              code
            }
          }
        }
      }
    `;
    try {
      const response = await graphQLRequest<{
        getOutletInventoryItems: InventoryItemForSales[];
      }>(QUERY, { outletId: outletId ?? null });
      return response.getOutletInventoryItems ?? [];
    } catch (error) {
      console.error("getOutletInventoryItems error:", formatGraphQLError(error));
      return [];
    }
  }

  static async searchInventoryItems(params: {
    outletId?: number | null;
    search?: string;
    skip?: number;
    take?: number;
  }): Promise<{ items: InventoryItemForSales[]; hasMore: boolean }> {
    const QUERY = gql`
      query SearchInventoryItems(
        $outletId: Int
        $search: String
        $skip: Int!
        $take: Int!
      ) {
        searchInventoryItems(
          outletId: $outletId
          search: $search
          skip: $skip
          take: $take
        ) {
          items {
            id
            itemId
            price
            quantity
            item {
              id
              name
              image
              sellingPrice
              barcode
              description
              vatExempt
            }
            units {
              id
              unitName
              unitLabel
              price
              isDefault
              conversionFactor
            }
            inventory {
              id
              outlet {
                id
                name
                code
              }
            }
          }
          hasMore
        }
      }
    `;
    try {
      const response = await graphQLRequest<{
        searchInventoryItems: { items: InventoryItemForSales[]; hasMore: boolean };
      }>(QUERY, {
        outletId: params.outletId ?? null,
        search: params.search || null,
        skip: params.skip || 0,
        take: params.take || 50,
      });
      return response.searchInventoryItems || { items: [], hasMore: false };
    } catch (error) {
      console.error("searchInventoryItems error:", formatGraphQLError(error));
      return { items: [], hasMore: false };
    }
  }

  // ── Mutations ────────────────────────────────────────────────────────────────

  static async createSalesOrder(data: {
    customer: string;
    outletId: number;
    branchId: number;
    items: SalesOrderItemInput[];
    subtotal: number;
    discountAmount: number;
    discountRate: number;
    vatAmount: number;
    vatRate: number;
    total: number;
    outletPromoId?: number;
  }): Promise<SalesOrder> {
    const MUTATION = gql`
      ${SALES_ORDER_FRAGMENT}
      mutation CreateSalesOrder(
        $customer: String!
        $outletId: Int!
        $branchId: Int!
        $items: [SalesOrderItemInput!]!
        $subtotal: Float!
        $discountAmount: Float!
        $discountRate: Float!
        $vatAmount: Float!
        $vatRate: Float!
        $total: Float!
        $outletPromoId: Int
      ) {
        createSalesOrder(
          customer: $customer
          outletId: $outletId
          branchId: $branchId
          items: $items
          subtotal: $subtotal
          discountAmount: $discountAmount
          discountRate: $discountRate
          vatAmount: $vatAmount
          vatRate: $vatRate
          total: $total
          outletPromoId: $outletPromoId
        ) {
          ...SalesOrderFields
        }
      }
    `;
    const response = await graphQLRequest<{ createSalesOrder: SalesOrder }>(
      MUTATION,
      data
    );
    return response.createSalesOrder;
  }

  static async processSalesOrder(id: string): Promise<SalesOrder> {
    const MUTATION = gql`
      ${SALES_ORDER_FRAGMENT}
      mutation ProcessSalesOrder($id: String!) {
        processSalesOrder(id: $id) {
          ...SalesOrderFields
        }
      }
    `;
    const response = await graphQLRequest<{ processSalesOrder: SalesOrder }>(
      MUTATION,
      { id }
    );
    return response.processSalesOrder;
  }

  static async shipSalesOrder(
    id: string,
    delivery: DeliveryInput
  ): Promise<SalesOrder> {
    const MUTATION = gql`
      ${SALES_ORDER_FRAGMENT}
      mutation ShipSalesOrder($id: String!, $delivery: DeliveryInput!) {
        shipSalesOrder(id: $id, delivery: $delivery) {
          ...SalesOrderFields
        }
      }
    `;
    const response = await graphQLRequest<{ shipSalesOrder: SalesOrder }>(
      MUTATION,
      { id, delivery }
    );
    return response.shipSalesOrder;
  }

  static async receiveSalesOrder(id: string): Promise<SalesOrder> {
    const MUTATION = gql`
      ${SALES_ORDER_FRAGMENT}
      mutation ReceiveSalesOrder($id: String!) {
        receiveSalesOrder(id: $id) {
          ...SalesOrderFields
        }
      }
    `;
    const response = await graphQLRequest<{ receiveSalesOrder: SalesOrder }>(
      MUTATION,
      { id }
    );
    return response.receiveSalesOrder;
  }

  static async cancelSalesOrder(
    id: string,
    reason?: string
  ): Promise<SalesOrder> {
    const MUTATION = gql`
      ${SALES_ORDER_FRAGMENT}
      mutation CancelSalesOrder($id: String!, $reason: String) {
        cancelSalesOrder(id: $id, reason: $reason) {
          ...SalesOrderFields
        }
      }
    `;
    const response = await graphQLRequest<{ cancelSalesOrder: SalesOrder }>(
      MUTATION,
      { id, reason }
    );
    return response.cancelSalesOrder;
  }
}