import { gql } from "graphql-request";
import { graphQLRequest } from "./apiClient";
import { formatGraphQLError } from "@/utils/errorFormatter";
export interface PromoTypeItem {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
  orgId: number;
}

export class PromoTypeService {
  static async getAll(): Promise<PromoTypeItem[]> {
    const GQL = gql`
      query GetPromoTypes {
        promoTypesByOrg {
          id
          name
          description
          isActive
          orgId
        }
      }
    `;
    try {
      const res = await graphQLRequest<{ promoTypesByOrg: PromoTypeItem[] }>(GQL);
      return res.promoTypesByOrg ?? [];
    } catch (e) {
      if (__DEV__) {
        const message = formatGraphQLError(e)
        console.error('PromoTypeService.getAll error:', message);
      } return [];
    }
  }

  static async create(name: string, description?: string): Promise<PromoTypeItem> {
    const GQL = gql`
      mutation CreatePromoType($data: CreatePromoTypeInput!) {
        createPromoType(data: $data) {
          id
          name
          description
          isActive
          orgId
        }
      }
    `;
    const res = await graphQLRequest<{ createPromoType: PromoTypeItem }>(GQL, {
      data: {
        name,
        description: description ?? null,
        isActive: true,
      },
    });
    return res.createPromoType;
  }

  static async update(
    id: number,
    name: string,
    description?: string,
  ): Promise<PromoTypeItem> {
    const GQL = gql`
      mutation UpdatePromoType($id: Int!, $data: UpdatePromoTypeInput!) {
        updatePromoType(id: $id, data: $data) {
          id
          name
          description
          isActive
          orgId
        }
      }
    `;
    const res = await graphQLRequest<{ updatePromoType: PromoTypeItem }>(GQL, {
      id,
      data: {
        name,
        description: description ?? null,
      },
    });
    return res.updatePromoType;
  }

  static async delete(id: number): Promise<void> {
    const GQL = gql`
      mutation DeletePromoType($id: Int!) {
        deletePromoType(id: $id) {
          id
        }
      }
    `;
    await graphQLRequest(GQL, { id });
  }
}