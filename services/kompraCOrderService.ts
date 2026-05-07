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
  item?: { id: number; name: string };
  inventoryItem?: { id: number; price: number; quantity: number };
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
  subtotal: number;
  total: number;
  status: KompraCOrderStatus;
  paymentMethod: string;
  paymentStatus: string;
  createdAt: string;
  outlet?: { id: number; name: string };
  customer?: { id: number; fullname: string };
  items: KompraCOrderItem[];
  fees: KompraCOrderFee[];
  tracking: KompraCOrderTracking[];
  courier?: { id: number; name: string; phone: string };
  deliveryAddress?: { id: number; label: string; address: string };
  scheduledDeliveryAt?: string;
  estimatedDeliveryAt?: string;
  deliveredAt?: string;
}

export interface KompraCOrderSummary {
  status: KompraCOrderStatus;
  total: number;
  createdAt: string;
}

export class KompraCOrderService {
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
