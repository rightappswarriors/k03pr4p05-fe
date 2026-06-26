// services/vatTypeService.ts
import { gql } from 'graphql-request';
import { graphQLRequest } from './apiClient';

export interface VatTypeItem {
  id: number;
  name: string;
  rate: number;
  orgId: number;
}

export class VatTypeService {
  static async getAll(): Promise<VatTypeItem[]> {
    const GQL = gql`
      query GetVatTypes {
        vatTypes {
          id
          name
          rate
          orgId
        }
      }
    `;
    try {
      const res = await graphQLRequest<{ vatTypes: VatTypeItem[] }>(GQL);
      return res.vatTypes ?? [];
    } catch (error) {
      if (__DEV__) console.error('VatTypeService.getAll error:', error);
      return [];
    }
  }

  static async create(name: string, rate: number): Promise<VatTypeItem> {
    if (rate < 0) {
      throw new Error("Rate must not be less than 0.")
    }
    const mutation = gql`
      mutation CreateVatType($name: String!, $rate: Float!) {
        createVatType(name: $name, rate:$rate) {
          id
          name
          rate
          orgId
        }
      }
    `;
    const res = await graphQLRequest<{ createVatType: VatTypeItem }>(mutation, { name, rate });
    return res.createVatType;
  }

  static async update(id: number, name: string, rate: number): Promise<VatTypeItem | null> {
    if (rate < 0) {
      throw new Error("Rate must not be less than 0.")
    }
    const mutation = gql`
      mutation UpdateVatType($id: Int!, $name: String!, $rate: Float!) {
        updateVatType(id: $id, name: $name, rate: $rate) {
          id
          name
          rate
        }
      }
    `;
    try {
      const res = await graphQLRequest<{ updateVatType: VatTypeItem }>(mutation, { id, name, rate });
      return res.updateVatType;
    } catch (error) {
      if (__DEV__) console.error("Error deleting VatItem: ", error)
      return null
    }
  }

  static async delete(id: number): Promise<VatTypeItem | null> {
    const mutation = gql`
      mutation DeleteVatType($id: Int!) {
        deleteVatType(id: $id) {
          id
          name
          rate
        }
      }
    `;
    try {

      const res = await graphQLRequest<{ deleteVatType: VatTypeItem }>(mutation, { id });
      return res.deleteVatType;
    } catch (error) {
      if (__DEV__) console.error("Error deleting VatItem: ", error)
      return null
    }
  }
}