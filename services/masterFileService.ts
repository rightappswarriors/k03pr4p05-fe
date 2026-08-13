import { gql } from 'graphql-request';
import { graphQLRequest } from './apiClient';

export class MasterFileService {

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
