import { gql } from 'graphql-request';
import { graphQLRequest } from './apiClient';
import { CustomerType, DiscountType } from '@/types';

const LOG_PREFIX = '[KompraCOrderService]';

export type KompraCOrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'packed'
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

export interface ScPwdCustomer {
  id: string;
  fullName: string;
  idNumber: string;
  idType: string;
  customerType: CustomerType;
  isRepresentative?: boolean;
  representativeName?: string;
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
  // ── Timestamps ─────────────────────────────────────────────────────────────
  packedAt?: string | null;
  shippedAt?: string | null;
  placedAt?: string | null;
  cancelledAt?: string | null;
  // ── Relations ──────────────────────────────────────────────────────────────
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
  // ── Delivery ───────────────────────────────────────────────────────────────
  scheduledDeliveryAt?: string;
  estimatedDeliveryAt?: string;
  deliveredAt?: string;
  riderName?: string | null;
  riderPhone?: string | null;
  customerNote?: string | null;
  outletNote?: string | null;
  // ── Cancel ─────────────────────────────────────────────────────────────────
  cancelNote?: string | null;
  // ── SC / PWD ───────────────────────────────────────────────────────────────
  customerType?: CustomerType | undefined;
  discountType?: DiscountType | undefined;
  scPwdCustomer?: ScPwdCustomer;
  scPwdPax?: number;
  totalPax?: number;
  vatExemptSale?: number;
  discountAmount?: number;
  vatAmount?: number;
  grandTotal?: number;
}

export interface KompraCOrderSummary {
  status: KompraCOrderStatus;
  total: number;
  createdAt: string;
}

export class KompraCOrderService {
  // ─── Shared fragment ────────────────────────────────────────────────────────
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
      packedAt
      shippedAt
      placedAt
      cancelledAt
      cancelNote
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
      customerType
      discountType
      scPwdCustomer {
        id
        fullName
        idNumber
        idType
        customerType
        isRepresentative
        representativeName
      }
      scPwdPax
      totalPax
      vatExemptSale
      discountAmount
      vatAmount
      grandTotal
    }
  `;

  // ─── Queries ────────────────────────────────────────────────────────────────

  static async getKompraCOrdersForManagement(filters?: {
    status?: KompraCOrderStatus[] | string;
    outletId?: number;
    take?: number;
    skip?: number;
  }): Promise<KompraCOrder[]> {
    console.log(`${LOG_PREFIX} getKompraCOrdersForManagement — filters:`, JSON.stringify(filters));

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

    try {
      const response = await graphQLRequest<{
        getKompraCOrdersForManagement: KompraCOrder[];
      }>(QUERY, {
        status: status || null,
        outletId: filters?.outletId ?? null,
        take: filters?.take ?? null,
        skip: filters?.skip ?? null,
      });

      const orders = response.getKompraCOrdersForManagement ?? [];
      console.log(`${LOG_PREFIX} getKompraCOrdersForManagement — received ${orders.length} orders`);
      return orders;
    } catch (error) {
      console.error(`${LOG_PREFIX} getKompraCOrdersForManagement — ERROR:`, error);
      throw error;
    }
  }

  // ─── Mutations ──────────────────────────────────────────────────────────────

  static async confirmKompraOrder(orderId: number): Promise<KompraCOrder> {
    console.log(`${LOG_PREFIX} confirmKompraOrder — orderId:`, orderId);

    const MUTATION = gql`
      ${KompraCOrderService.MANAGEMENT_ORDER_FIELDS}
      mutation ConfirmKompraOrder($orderId: Int!) {
        confirmKompraOrder(orderId: $orderId) {
          ...ManagementKompraOrderFields
        }
      }
    `;

    try {
      const response = await graphQLRequest<{ confirmKompraOrder: KompraCOrder }>(
        MUTATION,
        { orderId },
      );

      if (!response.confirmKompraOrder) {
        console.error(`${LOG_PREFIX} confirmKompraOrder — mutation returned null/undefined for orderId:`, orderId);
        throw new Error('confirmKompraOrder mutation returned no data. Check server resolver.');
      }

      console.log(
        `${LOG_PREFIX} confirmKompraOrder — success. New status:`,
        response.confirmKompraOrder.status,
        '| txNum:', response.confirmKompraOrder.transactionNumber,
      );
      return response.confirmKompraOrder;
    } catch (error) {
      console.error(`${LOG_PREFIX} confirmKompraOrder — ERROR for orderId ${orderId}:`, error);
      throw error;
    }
  }

  static async markKompraOrderPacked(orderId: number): Promise<KompraCOrder> {
    console.log(`${LOG_PREFIX} markKompraOrderPacked — orderId:`, orderId);

    const MUTATION = gql`
      ${KompraCOrderService.MANAGEMENT_ORDER_FIELDS}
      mutation MarkKompraOrderPacked($orderId: Int!) {
        markKompraOrderPacked(orderId: $orderId) {
          ...ManagementKompraOrderFields
        }
      }
    `;

    try {
      const response = await graphQLRequest<{
        markKompraOrderPacked: KompraCOrder;
      }>(MUTATION, { orderId });

      if (!response.markKompraOrderPacked) {
        console.error(`${LOG_PREFIX} markKompraOrderPacked — mutation returned null/undefined for orderId:`, orderId);
        throw new Error('markKompraOrderPacked mutation returned no data. Check server resolver.');
      }

      const order = response.markKompraOrderPacked;
      console.log(
        `${LOG_PREFIX} markKompraOrderPacked — success.`,
        '| New status:', order.status,
        '| packedAt:', order.packedAt ?? 'MISSING — check server sets packedAt',
      );

      if (!order.packedAt) {
        console.warn(
          `${LOG_PREFIX} markKompraOrderPacked — WARNING: packedAt is MISSING from response.`,
          'Check your resolver sets packedAt on the DB update.',
        );
      }

      return order;
    } catch (error) {
      console.error(`${LOG_PREFIX} markKompraOrderPacked — ERROR for orderId ${orderId}:`, error);
      throw error;
    }
  }

  static async assignKompraOrderRider(
    orderId: number,
    riderName: string,
    riderPhone?: string,
  ): Promise<KompraCOrder> {
    console.log(`${LOG_PREFIX} assignKompraOrderRider — orderId:`, orderId, '| riderName:', riderName, '| riderPhone:', riderPhone);

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

    try {
      const response = await graphQLRequest<{
        assignKompraOrderRider: KompraCOrder;
      }>(MUTATION, {
        orderId,
        riderName,
        riderPhone: riderPhone || null,
      });

      if (!response.assignKompraOrderRider) {
        console.error(`${LOG_PREFIX} assignKompraOrderRider — mutation returned null/undefined for orderId:`, orderId);
        throw new Error('assignKompraOrderRider mutation returned no data. Check server resolver.');
      }

      const order = response.assignKompraOrderRider;
      console.log(
        `${LOG_PREFIX} assignKompraOrderRider — success.`,
        '| New status:', order.status,
        '| riderName:', order.riderName,
        '| courierId:', order.courier?.id ?? 'no courier relation returned',
        '| shippedAt:', order.shippedAt ?? 'MISSING',
      );

      return order;
    } catch (error) {
      console.error(`${LOG_PREFIX} assignKompraOrderRider — ERROR for orderId ${orderId}:`, error);
      throw error;
    }
  }

  static async markKompraOrderDelivered(orderId: number): Promise<KompraCOrder> {
    console.log(`${LOG_PREFIX} markKompraOrderDelivered — orderId:`, orderId);

    const MUTATION = gql`
      ${KompraCOrderService.MANAGEMENT_ORDER_FIELDS}
      mutation MarkKompraOrderDelivered($orderId: Int!) {
        markKompraOrderDelivered(orderId: $orderId) {
          ...ManagementKompraOrderFields
        }
      }
    `;

    try {
      const response = await graphQLRequest<{
        markKompraOrderDelivered: KompraCOrder;
      }>(MUTATION, { orderId });

      if (!response.markKompraOrderDelivered) {
        console.error(`${LOG_PREFIX} markKompraOrderDelivered — mutation returned null/undefined for orderId:`, orderId);
        throw new Error('markKompraOrderDelivered mutation returned no data. Check server resolver.');
      }

      const order = response.markKompraOrderDelivered;
      console.log(
        `${LOG_PREFIX} markKompraOrderDelivered — success.`,
        '| New status:', order.status,
        '| deliveredAt:', order.deliveredAt ?? 'MISSING',
        '| paymentStatus:', order.paymentStatus,
      );
      return order;
    } catch (error) {
      console.error(`${LOG_PREFIX} markKompraOrderDelivered — ERROR for orderId ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Cancel an order. Requires actor info and an optional reason (cancelNote).
   * The server restores inventory stock, writes a tracking event, and sets
   * cancelledAt + cancelNote on the order row.
   */
  static async cancelKompraOrder(
    orderId: number,
    actorType: string,
    actorId: number,
    reason?: string,
  ): Promise<KompraCOrder> {
    console.log(
      `${LOG_PREFIX} cancelKompraOrder — orderId:`, orderId,
      '| actorType:', actorType,
      '| actorId:', actorId,
      '| reason:', reason,
    );

    const MUTATION = gql`
      ${KompraCOrderService.MANAGEMENT_ORDER_FIELDS}
      mutation CancelKompraOrder(
        $orderId: Int!
        $actorType: String!
        $actorId: Int!
        $reason: String
      ) {
        cancelKompraOrder(
          orderId: $orderId
          actorType: $actorType
          actorId: $actorId
          reason: $reason
        ) {
          ...ManagementKompraOrderFields
        }
      }
    `;

    try {
      const response = await graphQLRequest<{ cancelKompraOrder: KompraCOrder }>(
        MUTATION,
        {
          orderId,
          actorType,
          actorId,
          reason: reason?.trim() || null,
        },
      );

      if (!response.cancelKompraOrder) {
        console.error(`${LOG_PREFIX} cancelKompraOrder — mutation returned null/undefined for orderId:`, orderId);
        throw new Error('cancelKompraOrder mutation returned no data. Check server resolver.');
      }

      const order = response.cancelKompraOrder;
      console.log(
        `${LOG_PREFIX} cancelKompraOrder — success.`,
        '| New status:', order.status,
        '| cancelledAt:', order.cancelledAt ?? 'MISSING',
        '| cancelNote:', order.cancelNote ?? '(none)',
      );
      return order;
    } catch (error) {
      console.error(`${LOG_PREFIX} cancelKompraOrder — ERROR for orderId ${orderId}:`, error);
      throw error;
    }
  }

  // ─── Summary ────────────────────────────────────────────────────────────────

  static async getKompraCOrderSummaries(filters?: {
    organizationId?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<KompraCOrderSummary[]> {
    console.log(`${LOG_PREFIX} getKompraCOrderSummaries — filters:`, JSON.stringify(filters));

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

      const summaries = response.getKompraCOrdersSummary ?? [];
      console.log(`${LOG_PREFIX} getKompraCOrderSummaries — received ${summaries.length} summaries`);
      return summaries;
    } catch (error) {
      console.error(`${LOG_PREFIX} getKompraCOrderSummaries — ERROR:`, error);
      return [];
    }
  }
}