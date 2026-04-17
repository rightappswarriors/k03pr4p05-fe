// services/outletPromoService.ts
import { gql } from 'graphql-request';
import { graphQLRequest } from './apiClient'; // or however you call GQL

export type OutletPromoItem = {
    id: number;
    promoTypeId: number;
    discount: number;
    isActive: boolean;
};

export interface OutletPromoWithType {
    id: number;
    outletId: number;
    promoTypeId: number;
    discount: number;       // e.g. 0.20 for 20%
    isActive: boolean;
    promoType: {
        id: number;
        name: string;
        description?: string;
    }
}

export class OutletPromoService {
  static async getByOutlet(outletId: number): Promise<OutletPromoWithType[]> {
    const GQL = gql`
      query GetOutletPromos($outletId: Int!) {
        outletPromosByOutlet(outletId: $outletId) {
          id
          outletId
          promoTypeId
          discount
          isActive
          promoType {
            id
            name
            description
          }
        }
      }
    `;
    try {
      const res = await graphQLRequest<{
        outletPromosByOutlet: OutletPromoWithType[];
      }>(GQL, { outletId });
      return (res.outletPromosByOutlet ?? []).filter((p) => p.isActive);
    } catch (e) {
      console.error('OutletPromoService.getByOutlet error:', e);
      return [];
    }
  }
}