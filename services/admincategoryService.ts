import { gql } from 'graphql-request';
import { graphQLRequest } from './apiClient';

export class AdminCategoryService {

  // Browse all global categories (for orgs to pick from)
  static async getCategories(query?: string, size?: number, orderBy?: string): Promise<any[]> {
    const GQL = gql`
      query GetAllCategories($query: String, $pageSize: Int, $orderBy: String) {
        getAllCategories(query: $query, pageSize: $pageSize, orderBy: $orderBy) {
          id
          name
          createdAt
        }
      }
    `;
    try {
      const res = await graphQLRequest<{ getAllCategories: any[] }>(GQL, {
        query,
        pageSize: size,
        orderBy,
      });
      if (__DEV__) console.log('raw res:', JSON.stringify(res));
      return res.getAllCategories;
    } catch (error) {
      if (__DEV__) console.log('full error:', JSON.stringify(error));
      throw error;
    }
  }

  static async getCategoryById(id: number): Promise<any> {
    const GQL = gql`
      query GetCategoryById($id: ID!) {
        getCategoryById(id: $id) {
          id
          name
          createdAt
        }
      }
    `;
    const res = await graphQLRequest<{ getCategoryById: any }>(GQL, { id });
    return res.getCategoryById;
  }

  // Super admin only
  static async createCategories(categories: string[]): Promise<any[]> {
    if (!categories.length) throw new Error('categories must be non-empty');
    const mutation = gql`
      mutation CreateCategories($categories: [String!]!) {
        createCategories(categories: $categories) {
          id
          name
          createdAt
        }
      }
    `;
    try {
      const res = await graphQLRequest<{ createCategories: any[] }>(mutation, { categories });
      return res.createCategories;
    } catch (error) {
      if (__DEV__) console.log(error)
      return []
    }
  }

  // Super admin only
  static async updateCategory(id: number, name: string): Promise<any> {
    const mutation = gql`
      mutation UpdateCategory($id: ID!, $name: String!) {
        updateCategory(id: $id, name: $name) {
          id
          name
          createdAt
        }
      }
    `;
    const res = await graphQLRequest<{ updateCategory: any }>(mutation, { id, name });
    return res.updateCategory;
  }

  // Super admin only
  static async deleteCategory(id: number): Promise<any> {
    const mutation = gql`
      mutation DeleteCategory($id: ID!) {
        deleteCategory(id: $id) {
          id
          name
        }
      }
    `;
    const res = await graphQLRequest<{ deleteCategory: any }>(mutation, { id });
    return res.deleteCategory;
  }
}