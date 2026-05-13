// services/salesOrder.service.ts
import { gql } from "graphql-request";
import { graphQLRequest } from "./apiClient";
import { formatGraphQLError } from "@/utils/errorFormatter";

export type OrderMode = "WALK_IN" | "PICK_UP" | "DELIVERY";
export type SalesOrderStatus =
  | "PENDING"
  | "PROCESSING"
  | "READY_FOR_PICKUP"
  | "OUT_FOR_DELIVERY"
  | "COMPLETED"
  | "CANCELLED"
  | "RECEIVED"
  | "ORDERED"
  | "SHIPPED";

export type CustomerType = "REGULAR" | "SENIOR_CITIZEN" | "PWD";
export type DiscountType =
  | "NONE"
  | "SENIOR_CITIZEN"
  | "PWD"
  | "BNPC_SENIOR_CITIZEN"
  | "BNPC_PWD"
  | "CUSTOM";

export interface ScPwdCustomerInput {
  id?: string;
  fullName: string;
  idNumber: string;
  idType?: string;
  customerType?: CustomerType;
  dateOfBirth?: string;
  contactNumber?: string;
  address?: string;
  isRepresentative?: boolean;
  representativeName?: string;
  representativeIdNumber?: string;
}

export interface ScPwdCustomer {
  id: string;
  fullName: string;
  idNumber: string;
  idType: string;
  customerType: CustomerType;
  isRepresentative: boolean;
  representativeName?: string;
  representativeIdNumber?: string;
}

export interface ExtraCharge {
  id: string;
  label: string;
  amount: number;
  salesOrderId: string;
  createdAt: string;
}

export interface SalesOrderItemInput {
  itemId?: number;
  quantity: number;
  unitPrice: number;
  unitId?: number;
  unitName?: string;
  discountQuantity?: number;
  discountRate?: number;
  discountAmount?: number;
  isCustomItem?: boolean;
  customItemName?: string;
  vatExempt?: boolean;
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
  itemId?: number;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  unitId?: number;
  unitName?: string;
  discountQuantity?: number;
  discountRate?: number;
  discountAmount?: number;
  isCustomItem: boolean;
  customItemName?: string;
  vatExempt: boolean;
  item?: {
    id: number;
    name: string;
    image?: string;
    vatExempt?: boolean;
    isVatExempt?: boolean;
    isBNPC?: boolean;
    vatRate?: number;
  };
}

export interface SalesOrder {
  id: string;
  orderNumber: string;
  customer: string;
  orderMode: OrderMode;
  status: SalesOrderStatus;
  date: string;
  updatedAt: string;
  orgId: number;
  userId?: number;
  outletId?: number;
  branchId?: number;
  customerName?: string;
  customerContact?: string;
  customerType: CustomerType;
  discountType: DiscountType;
  subtotal: number;
  discountAmount: number;
  vatAmount: number;
  vatExemptSale: number;
  total: number;
  vatRate: number;
  discountRate: number;
  totalPax?: number;
  scPwdPax?: number;
  scPwdCustomer?: ScPwdCustomer;
  extraCharges: ExtraCharge[];
  deliveryAddress?: string;
  deliveryNotes?: string;
  extraChargesTotal: number;
  grandTotal: number;
  outletPromoId?: number;
  items: SalesOrderItem[];
  delivery?: SalesOrderDelivery;
  outlet?: {
    id: number;
    name: string;
    code: string;
    address?: string;
    tin?: string;
    ptu?: string;
    bir?: string;
    isVatRegistered?: boolean;
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
    isVatExempt?: boolean;
    isBNPC?: boolean;
    vatRate?: number;
    vatType? : {
      id: number
      name: string;
      rate: number;
    }
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

export interface SalesOrderFilterInput {
  status?: SalesOrderStatus;
  orderMode?: OrderMode;
  discountType?: DiscountType;
  outletId?: number;
  branchId?: number;
  startDate?: string;
  endDate?: string;
  customerName?: string;
}

const SALES_ORDER_FRAGMENT = gql`
  fragment SalesOrderFields on SalesOrder {
    id
    orderNumber
    customer
    orderMode
    status
    date
    updatedAt
    orgId
    userId
    outletId
    branchId
    customerName
    customerContact
    customerType
    discountType
    subtotal
    discountAmount
    vatAmount
    vatExemptSale
    total
    vatRate
    discountRate
    totalPax
    scPwdPax
    deliveryAddress
    deliveryNotes
    extraChargesTotal
    grandTotal
    outletPromoId
    scPwdCustomer {
      id
      fullName
      idNumber
      idType
      customerType
      isRepresentative
      representativeName
      representativeIdNumber
    }
    extraCharges {
      id
      label
      amount
      salesOrderId
      createdAt
    }
    items {
      id
      salesOrderId
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
        isVatExempt
        isBNPC
        vatRate
      }
    }
    delivery {
      id
      salesOrderId
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
      address
      tin
      ptu
      bir
      isVatRegistered
    }
    branch {
      id
      name
    }
  }
`;

export class SalesOrderService {
  static async getSalesOrders(filters?: SalesOrderFilterInput): Promise<SalesOrder[]> {
    const QUERY = gql`
      ${SALES_ORDER_FRAGMENT}
      query GetSalesOrders(
        $status: SalesOrderStatusEnum
        $orderMode: OrderModeEnum
        $discountType: DiscountType
        $outletId: Int
        $branchId: Int
        $startDate: String
        $endDate: String
        $customerName: String
      ) {
        getSalesOrders(
          status: $status
          orderMode: $orderMode
          discountType: $discountType
          outletId: $outletId
          branchId: $branchId
          startDate: $startDate
          endDate: $endDate
          customerName: $customerName
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
      const response = await graphQLRequest<{ getSalesOrder: SalesOrder | null }>(QUERY, { id });
      return response.getSalesOrder;
    } catch (error) {
      console.error("getSalesOrder error:", formatGraphQLError(error));
      return null;
    }
  }

  static async getSalesOrdersByStatus(status: SalesOrderStatus): Promise<SalesOrder[]> {
    const QUERY = gql`
      ${SALES_ORDER_FRAGMENT}
      query SalesOrdersByStatus($status: SalesOrderStatusEnum!) {
        salesOrdersByStatus(status: $status) {
          ...SalesOrderFields
        }
      }
    `;
    const response = await graphQLRequest<{ salesOrdersByStatus: SalesOrder[] }>(QUERY, { status });
    return response.salesOrdersByStatus ?? [];
  }

  static async getSalesOrdersByMode(orderMode: OrderMode): Promise<SalesOrder[]> {
    const QUERY = gql`
      ${SALES_ORDER_FRAGMENT}
      query SalesOrdersByMode($orderMode: OrderModeEnum!) {
        salesOrdersByMode(orderMode: $orderMode) {
          ...SalesOrderFields
        }
      }
    `;
    const response = await graphQLRequest<{ salesOrdersByMode: SalesOrder[] }>(QUERY, { orderMode });
    return response.salesOrdersByMode ?? [];
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
      const response = await graphQLRequest<{ getOutletsByBranch: OutletForSales[] }>(QUERY, { branchId });
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

  static async getOutletInventoryItems(outletId: number | null, branchId?: number | null): Promise<InventoryItemForSales[]> {
    const QUERY = gql`
      query GetOutletInventoryItems($outletId: Int, $branchId: Int) {
        getOutletInventoryItems(outletId: $outletId, branchId: $branchId) {
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
            vatType {
              id
              name
              rate
            }
            vatExempt
            isVatExempt
            isBNPC
            vatRate
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
      const response = await graphQLRequest<{ getOutletInventoryItems: InventoryItemForSales[] }>(
        QUERY,
        { outletId: outletId ?? null, branchId: branchId ?? null }
      );
      return response.getOutletInventoryItems ?? [];
    } catch (error) {
      console.error("getOutletInventoryItems error:", formatGraphQLError(error));
      return [];
    }
  }

  static async searchInventoryItems(params: {
    outletId?: number | null;
    branchId?: number | null;
    search?: string;
    skip?: number;
    take?: number;
  }): Promise<{ items: InventoryItemForSales[]; hasMore: boolean }> {
    const QUERY = gql`
      query SearchInventoryItems($outletId: Int, $branchId: Int, $search: String, $skip: Int!, $take: Int!) {
        searchInventoryItems(outletId: $outletId, branchId: $branchId, search: $search, skip: $skip, take: $take) {
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
              isVatExempt
              isBNPC
              vatRate
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
        branchId: params.branchId ?? null,
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

  static async createSalesOrder(data: {
    customer?: string;
    orderMode: OrderMode;
    customerName?: string;
    customerContact?: string;
    outletId?: number;
    branchId?: number;
    items: SalesOrderItemInput[];
    customerType?: CustomerType;
    scPwdCustomerInput?: ScPwdCustomerInput;
    discountType?: DiscountType;
    totalPax?: number;
    scPwdPax?: number;
    extraCharges?: { label: string; amount: number }[];
    deliveryAddress?: string;
    deliveryNotes?: string;
    subtotal?: number;
    discountAmount?: number;
    discountRate?: number;
    vatAmount?: number;
    vatRate?: number;
    total?: number;
    outletPromoId?: number;
  }): Promise<SalesOrder> {
    const MUTATION = gql`
      ${SALES_ORDER_FRAGMENT}
      mutation CreateSalesOrder(
        $customer: String
        $orderMode: OrderModeEnum!
        $customerName: String
        $customerContact: String
        $outletId: Int
        $branchId: Int
        $items: [SalesOrderItemInput!]!
        $customerType: CustomerType
        $scPwdCustomerInput: ScPwdCustomerInput
        $discountType: DiscountType
        $totalPax: Int
        $scPwdPax: Int
        $extraCharges: [ExtraChargeInput!]
        $deliveryAddress: String
        $deliveryNotes: String
        $subtotal: Float
        $discountAmount: Float
        $discountRate: Float
        $vatAmount: Float
        $vatRate: Float
        $total: Float
        $outletPromoId: Int
      ) {
        createSalesOrder(
          customer: $customer
          orderMode: $orderMode
          customerName: $customerName
          customerContact: $customerContact
          outletId: $outletId
          branchId: $branchId
          items: $items
          customerType: $customerType
          scPwdCustomerInput: $scPwdCustomerInput
          discountType: $discountType
          totalPax: $totalPax
          scPwdPax: $scPwdPax
          extraCharges: $extraCharges
          deliveryAddress: $deliveryAddress
          deliveryNotes: $deliveryNotes
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
    const response = await graphQLRequest<{ createSalesOrder: SalesOrder }>(MUTATION, data);
    return response.createSalesOrder;
  }

  static async updateSalesOrderStatus(salesOrderId: string, status: SalesOrderStatus): Promise<SalesOrder> {
    const MUTATION = gql`
      ${SALES_ORDER_FRAGMENT}
      mutation UpdateSalesOrderStatus($salesOrderId: String!, $status: SalesOrderStatusEnum!) {
        updateSalesOrderStatus(salesOrderId: $salesOrderId, status: $status) {
          ...SalesOrderFields
        }
      }
    `;
    const response = await graphQLRequest<{ updateSalesOrderStatus: SalesOrder }>(
      MUTATION,
      { salesOrderId, status }
    );
    return response.updateSalesOrderStatus;
  }

  static async addExtraCharge(salesOrderId: string, label: string, amount: number): Promise<SalesOrder> {
    const MUTATION = gql`
      ${SALES_ORDER_FRAGMENT}
      mutation AddExtraCharge($salesOrderId: String!, $label: String!, $amount: Float!) {
        addExtraCharge(salesOrderId: $salesOrderId, label: $label, amount: $amount) {
          ...SalesOrderFields
        }
      }
    `;
    const response = await graphQLRequest<{ addExtraCharge: SalesOrder }>(
      MUTATION,
      { salesOrderId, label, amount }
    );
    return response.addExtraCharge;
  }

  static async removeExtraCharge(extraChargeId: string): Promise<SalesOrder> {
    const MUTATION = gql`
      ${SALES_ORDER_FRAGMENT}
      mutation RemoveExtraCharge($extraChargeId: String!) {
        removeExtraCharge(extraChargeId: $extraChargeId) {
          ...SalesOrderFields
        }
      }
    `;
    const response = await graphQLRequest<{ removeExtraCharge: SalesOrder }>(MUTATION, { extraChargeId });
    return response.removeExtraCharge;
  }

  static async processSalesOrder(id: string): Promise<SalesOrder> {
    return this.updateSalesOrderStatus(id, "PROCESSING");
  }

  static async shipSalesOrder(id: string, delivery: DeliveryInput): Promise<SalesOrder> {
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
    return this.updateSalesOrderStatus(id, "COMPLETED");
  }

  static async cancelSalesOrder(id: string): Promise<SalesOrder> {
    return this.updateSalesOrderStatus(id, "CANCELLED");
  }
}
