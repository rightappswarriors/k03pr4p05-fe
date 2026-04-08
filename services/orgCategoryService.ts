import { gql } from 'graphql-request';
import { graphQLRequest } from './apiClient';
export interface OrgItemCategory {
  id: number;
  orgId: number;
  categoryId?: number;       // ✅ optional
  name: string;              // ✅ required
  description?: string;
  icon?: string;
  cost_of_sale?: string;
  groupType?: string;
  sales?: string;
  stocks?: string;
  groupId?: number;
  isActive: boolean;
  createdAt: string;
  globalCategory?: {         // ✅ optional
    id: number;
    name: string;
  };
  group?: {
    id: number;
    name: string;
  };
}

export interface CreateOrgCategoryInput {
  name: string;              // ✅ required
  categoryId?: number;       // ✅ optional
  description?: string;
  icon?: string;
  cost_of_sale?: string;
  groupType?: string;
  sales?: string;
  stocks?: string;
  groupId?: number;
}

export interface UpdateOrgCategoryInput {
  id: number;
  name?: string;
  description?: string;
  icon?: string;
  cost_of_sale?: string;
  groupType?: string;
  sales?: string;
  stocks?: string;
  groupId?: number;
  isActive?: boolean;
}

export class OrgCategoryService {

  static async getOrgCategories(
    query?: string,
    size?: number,
    orderBy?: string,
    groupId?: number,
    isActive?: boolean
  ): Promise<OrgItemCategory[]> {
    const GQL = gql`
    query GetOrgCategories(
      $query: String
      $pageSize: Int
      $orderBy: String
      $groupId: Int
      $isActive: Boolean
    ) {
      getOrgCategories(
        query: $query
        pageSize: $pageSize
        orderBy: $orderBy
        groupId: $groupId
        isActive: $isActive
      ) {
        id
        orgId
        categoryId
        name
        description
        icon
        cost_of_sale
        groupType
        sales
        stocks
        groupId
        isActive
        createdAt
        # ✅ removed globalCategory — optional, only include if you need it
        group {
          id
          name
        }
      }
    }
  `;
    const res = await graphQLRequest<{ getOrgCategories: OrgItemCategory[] }>(GQL, {
      query,
      pageSize: size,
      orderBy,
      groupId,
      isActive,
    });
    return res.getOrgCategories;
  }

  static async getOrgCategoryById(id: number): Promise<OrgItemCategory> {
    const GQL = gql`
      query GetOrgCategoryById($id: Int!) {
        getOrgCategoryById(id: $id) {
          id
          orgId
          categoryId
          name
          description
          icon
          cost_of_sale
          groupType
          sales
          stocks
          groupId
          isActive
          createdAt
          globalCategory {
            id
            name
          }
          group {
            id
            name
          }
        }
      }
    `;
    const res = await graphQLRequest<{ getOrgCategoryById: OrgItemCategory }>(GQL, { id });
    return res.getOrgCategoryById;
  }

  static async createOrgCategory(input: CreateOrgCategoryInput): Promise<OrgItemCategory | null> {
    const mutation = gql`
    mutation CreateOrgItemCategory(
      $name: String!
      $categoryId: Int
      $description: String
      $icon: String
      $cost_of_sale: String
      $groupType: String
      $sales: String
      $stocks: String
      $groupId: Int
    ) {
      createOrgItemCategory(
        name: $name
        categoryId: $categoryId
        description: $description
        icon: $icon
        cost_of_sale: $cost_of_sale
        groupType: $groupType
        sales: $sales
        stocks: $stocks
        groupId: $groupId
      ) {
        id
        name
        categoryId
        groupId
        isActive
        createdAt
        # ✅ removed globalCategory — it's null when no categoryId is provided
      }
    }
  `;
    try {
      const res = await graphQLRequest<{ createOrgItemCategory: OrgItemCategory }>(mutation, input);
      return res.createOrgItemCategory;
    } catch (error) {
      console.error('createOrgCategory error:', error);
      throw error;
    }
  }

  static async updateOrgCategory(input: UpdateOrgCategoryInput): Promise<OrgItemCategory> {
    const { id, ...rest } = input;
    const mutation = gql`
      mutation UpdateOrgItemCategory(
        $id: Int!
        $name: String
        $description: String
        $icon: String
        $cost_of_sale: String
        $groupType: String
        $sales: String
        $stocks: String
        $groupId: Int
        $isActive: Boolean
      ) {
        updateOrgItemCategory(
          id: $id
          name: $name
          description: $description
          icon: $icon
          cost_of_sale: $cost_of_sale
          groupType: $groupType
          sales: $sales
          stocks: $stocks
          groupId: $groupId
          isActive: $isActive
        ) {
          id
          name
          description
          icon
          groupId
          isActive
          globalCategory {
            id
            name
          }
        }
      }
    `;
    try {
      const res = await graphQLRequest<{ updateOrgItemCategory: OrgItemCategory }>(mutation, { id, ...rest });
      return res.updateOrgItemCategory;
    } catch (error) {
      console.error('updateOrgCategory error:', error);
      throw error; // ✅ rethrow
    }
  }

  static async deleteOrgCategory(id: number): Promise<OrgItemCategory> {
    const mutation = gql`
      mutation DeleteOrgItemCategory($id: Int!) {
        deleteOrgItemCategory(id: $id) {
          id
          name
        }
      }
    `;
    try {
      const res = await graphQLRequest<{ deleteOrgItemCategory: OrgItemCategory }>(mutation, { id });
      return res.deleteOrgItemCategory;
    } catch (error) {
      console.error('deleteOrgCategory error:', error);
      throw error; // ✅ rethrow
    }
  }
}