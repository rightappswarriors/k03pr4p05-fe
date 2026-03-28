import { gql } from 'graphql-request';
import { graphQLRequest } from './apiClient';

export class MasterFileService {
  static async getItems(query?: string, size?: number, orderBy: 'asc' | 'desc' = 'asc'): Promise<any[]> {
    const GQL = gql`
      query GetItems($query: String, $size: Int, $orderBy: orderBy) {
        getItems(query: $query, size: $size, orderBy: $orderBy) {
          id
          name
          barcode
          description
          brand
          categoryId
          vatExempt
          serviceCharge
          assembly
          itemCode
          skuNumber
        }
      }
    `;

    const res = await graphQLRequest<{ getItems: any[] }>(GQL, {
      query,
      size,
      orderBy,
    });
    return res.getItems;
  }

  static async createItem(item: {
    name: string;
    barcode:string;
    image?: string;
    description?: string;
    brand?: string;
    categoryId?: number;
    brandId?: number;
    itemCode?: string;
    skuNumber?: string;
    vatExempt?: boolean;
    ServiceCharge?: boolean;
    assembly?: boolean;
  }): Promise<any> {
    const mutation = gql`
      mutation CreateItems($items: [CreateItemInput!]!) {
        createItems(items: $items) {
          count
        }
      }
    `;

    const response = await graphQLRequest<{ createItems: any }>(mutation, {
      items: [item],
    });
    return response.createItems;
  }

  static async updateItem(id: number, item: { name?: string; barcode?: string; description?: string; brand?: string; categoryId?: number }): Promise<any> {
    const mutation = gql`
      mutation UpdateItem($id: ID!, $item: UpdateItemInput!) {
        updateItem(id: $id, item: $item) {
          id
          name
          barcode
          description
          brand
          categoryId
        }
      }
    `;

    const response = await graphQLRequest<{ updateItem: any }>(mutation, {
      id,
      item,
    });
    return response.updateItem;
  }

  static async deleteItem(id: number): Promise<any> {
    const mutation = gql`
      mutation DeleteItem($id: ID!) {
        deleteItem(id: $id) {
          id
        }
      }
    `;

    const response = await graphQLRequest<{ deleteItem: any }>(mutation, { id });
    return response.deleteItem;
  }

  static async getCategories(query?: string, size?: number, orderBy?: string): Promise<any[]> {
    const GQL = gql`
      query GetAllCategory($query: String, $pageSize: Int, $orderBy: String) {
        getAllCategory(query: $query, pageSize: $pageSize, orderBy: $orderBy) {
          id
          name
          createdAt
        }
      }
    `;

    const res = await graphQLRequest<{ getAllCategory: any[] }>(GQL, {
      query,
      pageSize: size,
      orderBy,
    });
    return res.getAllCategory;
  }

  static async createCategories(categories: string[]): Promise<any[]> {
    if (!categories.length) throw new Error('categories must be non-empty');
    const mutation = gql`
      mutation CreateCategories($categories: [String!]!) {
        createCategories(categories: $categories) {
          id
          name
        }
      }
    `;
    const res = await graphQLRequest<{ createCategories: any[] }>(mutation, { categories });
    return res.createCategories;
  }

  static async updateCategory(id: number, name: string): Promise<any> {
    const mutation = gql`
      mutation UpdateCategory($id: ID!, $name: String!) {
        updateCategory(id: $id, name: $name) {
          id
          name
        }
      }
    `;
    const res = await graphQLRequest<{ updateCategory: any }>(mutation, { id, name });
    return res.updateCategory;
  }

  static async deleteCategory(id: number): Promise<any> {
    const mutation = gql`
      mutation DeleteCategory($id: ID!) {
        deleteCategory(id: $id) {
          id
        }
      }
    `;
    const res = await graphQLRequest<{ deleteCategory: any }>(mutation, { id });
    return res.deleteCategory;
  }
}
