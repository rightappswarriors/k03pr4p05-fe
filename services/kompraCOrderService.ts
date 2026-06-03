import { gql } from 'graphql-request';
import { graphQLRequest } from './apiClient';

export type KompraCOrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'in_delivery'
  | 'received'
  | 'cancelled'
  | 'returned';

export interface KompraCOrderItem {
  id: number;
  orderId: number;
  inventoryItemId: number;
  itemId: number;
  quantity: number;
  priceSnapshot: number;
  subtotal: number;
  item?: { id: number; name: string; image?: string | null };
  inventoryItem?: {
    id: number;
    price?: number | null;
    quantity: number;
    baseUnit?: string | null;
  };
  unit?: { id: number; unitName: string; baseUnit: string } | null;
}

export interface KompraCOrderFee {
  id: number;
  orderId: number;
  type: string;
  label: string;
  amount: number;
}

export interface KompraCOrderTracking {
  id: number;
  orderId: number;
  event: string;
  statusAt: string;
  currentLat?: number;
  currentLng?: number;
  note?: string;
  actorType: string;
  actorId?: number;
}

export interface KompraCOrder {
  id: number;
  transactionNumber: string;
  customerId: number;
  outletId: number;
  deliveryAddressId: number;
  subtotal: number;
  total: number;
  status: KompraCOrderStatus;
  paymentMethod: string;
  paymentStatus: string;
  createdAt: string;
  outlet?: { id: number; name: string };
  customer?: {
    id: number;
    fullname: string;
    phone?: string | null;
    email?: string | null;
  };
  items: KompraCOrderItem[];
  fees: KompraCOrderFee[];
  tracking: KompraCOrderTracking[];
  courier?: { id: number; name: string; phone: string } | null;
  deliveryAddress?: {
    id: number;
    label: string;
    address: string;
    latitude: number;
    longitude: number;
  };
  scheduledDeliveryAt?: string;
  estimatedDeliveryAt?: string;
  deliveredAt?: string;
  riderName?: string | null;
  riderPhone?: string | null;
  customerNote?: string | null;
  outletNote?: string | null;
}

export interface KompraCOrderSummary {
  status: KompraCOrderStatus;
  total: number;
  createdAt: string;
}

export class KompraCOrderService {
  private static readonly MANAGEMENT_ORDER_FIELDS = gql`
    fragment ManagementKompraOrderFields on KompraCOrder {
      id
      transactionNumber
      customerId
      outletId
      deliveryAddressId
      subtotal
      total
      status
      paymentMethod
      paymentStatus
      scheduledDeliveryAt
      estimatedDeliveryAt
      deliveredAt
      riderName
      riderPhone
      customerNote
      outletNote
      createdAt
      updatedAt
      customer {
        id
        fullname
        phone
        email
      }
      outlet {
        id
        name
      }
      deliveryAddress {
        id
        label
        address
        latitude
        longitude
      }
      courier {
        id
        name
        phone
      }
      items {
        id
        orderId
        inventoryItemId
        itemId
        quantity
        priceSnapshot
        subtotal
        item {
          id
          name
          image
        }
        inventoryItem {
          id
          price
          quantity
          baseUnit
        }
        unit {
          id
          unitName
          baseUnit
        }
      }
      fees {
        id
        orderId
        type
        label
        amount
      }
      tracking {
        id
        orderId
        event
        statusAt
        currentLat
        currentLng
        note
        actorType
        actorId
      }
    }
  `;

  static async getKompraCOrdersForManagement(filters?: {
    status?: KompraCOrderStatus[] | string;
    outletId?: number;
    take?: number;
    skip?: number;
  }): Promise<KompraCOrder[]> {
    const QUERY = gql`
      ${KompraCOrderService.MANAGEMENT_ORDER_FIELDS}
      query GetKompraCOrdersForManagement(
        $status: String
        $outletId: Int
        $take: Int
        $skip: Int
      ) {
        getKompraCOrdersForManagement(
          status: $status
          outletId: $outletId
          take: $take
          skip: $skip
        ) {
          ...ManagementKompraOrderFields
        }
      }
    `;

    const status =
      Array.isArray(filters?.status) ? filters.status.join(',') : filters?.status;
    const response = await graphQLRequest<{
      getKompraCOrdersForManagement: KompraCOrder[];
    }>(QUERY, {
      status: status || null,
      outletId: filters?.outletId ?? null,
      take: filters?.take ?? null,
      skip: filters?.skip ?? null,
    });

    return response.getKompraCOrdersForManagement ?? [];
  }

  static async confirmKompraOrder(orderId: number): Promise<KompraCOrder> {
    const MUTATION = gql`
      ${KompraCOrderService.MANAGEMENT_ORDER_FIELDS}
      mutation ConfirmKompraOrder($orderId: Int!) {
        confirmKompraOrder(orderId: $orderId) {
          ...ManagementKompraOrderFields
        }
      }
    `;
    const response = await graphQLRequest<{ confirmKompraOrder: KompraCOrder }>(
      MUTATION,
      { orderId },
    );
    return response.confirmKompraOrder;
  }

  static async markKompraOrderPacked(orderId: number): Promise<KompraCOrder> {
    const MUTATION = gql`
      ${KompraCOrderService.MANAGEMENT_ORDER_FIELDS}
      mutation MarkKompraOrderPacked($orderId: Int!) {
        markKompraOrderPacked(orderId: $orderId) {
          ...ManagementKompraOrderFields
        }
      }
    `;
    const response = await graphQLRequest<{
      markKompraOrderPacked: KompraCOrder;
    }>(MUTATION, { orderId });
    return response.markKompraOrderPacked;
  }

  static async assignKompraOrderRider(
    orderId: number,
    riderName: string,
    riderPhone?: string,
  ): Promise<KompraCOrder> {
    const MUTATION = gql`
      ${KompraCOrderService.MANAGEMENT_ORDER_FIELDS}
      mutation AssignKompraOrderRider(
        $orderId: Int!
        $riderName: String!
        $riderPhone: String
      ) {
        assignKompraOrderRider(
          orderId: $orderId
          riderName: $riderName
          riderPhone: $riderPhone
        ) {
          ...ManagementKompraOrderFields
        }
      }
    `;
    const response = await graphQLRequest<{
      assignKompraOrderRider: KompraCOrder;
    }>(MUTATION, {
      orderId,
      riderName,
      riderPhone: riderPhone || null,
    });
    return response.assignKompraOrderRider;
  }

  static async markKompraOrderDelivered(orderId: number): Promise<KompraCOrder> {
    const MUTATION = gql`
      ${KompraCOrderService.MANAGEMENT_ORDER_FIELDS}
      mutation MarkKompraOrderDelivered($orderId: Int!) {
        markKompraOrderDelivered(orderId: $orderId) {
          ...ManagementKompraOrderFields
        }
      }
    `;
    const response = await graphQLRequest<{
      markKompraOrderDelivered: KompraCOrder;
    }>(MUTATION, { orderId });
    return response.markKompraOrderDelivered;
  }

  static async getKompraCOrderSummaries(filters?: {
    organizationId?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<KompraCOrderSummary[]> {
    const QUERY = gql`
      query GetKompraCOrderSummaries(
        $organizationId: Int
        $startDate: String
        $endDate: String
      ) {
        getKompraCOrdersSummary(
          organizationId: $organizationId
          startDate: $startDate
          endDate: $endDate
        ) {
          status
          total
          createdAt
        }
      }
    `;

    try {
      const response = await graphQLRequest<{
        getKompraCOrdersSummary: KompraCOrderSummary[];
      }>(QUERY, {
        organizationId: filters?.organizationId,
        startDate: filters?.startDate,
        endDate: filters?.endDate,
      });

      return response.getKompraCOrdersSummary ?? [];
    } catch (error) {
      console.error('Failed to fetch KompraC order summaries:', error);
      return [];
    }
  }
}
