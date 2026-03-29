import { gql } from 'graphql-request';
import { graphQLRequest } from './apiClient';

export class OrganizationService {
  static async getOrganizations(): Promise<any[]> {
    const QUERY = gql`
      query GetOrganizations {
        organizations {
          id
          name
          createdAt
          updatedAt
        }
      }
    `;

    const response = await graphQLRequest<{ organizations: any[] }>(QUERY);
    return response.organizations;
  }

  static async getOrganization(id: number): Promise<any | null> {
    const QUERY = gql`
      query GetOrganization($id: Int!) {
        organization(id: $id) {
          id
          name
          createdAt
          updatedAt
          subscription {
            id
            plan
            orgId
          }
        }
      }
    `;

    const response = await graphQLRequest<{ organization: any | null }>(QUERY, { id });
    return response.organization;
  }

  static async createOrganization(name: string): Promise<any> {
    if (!name || !name.trim()) {
      throw new Error('Organization name is required');
    }
    
    try {
      console.log(`[Frontend] Creating organization: ${name}`)
      
      const MUTATION = gql`
        mutation CreateOrganization($name: String!) {
          createOrganization(name: $name) {
            id
            name
            createdAt
          }
        }
      `;

      const response = await graphQLRequest<{ createOrganization: any }>(MUTATION, { name });
      
      if (!response?.createOrganization) {
        throw new Error('No organization returned from server');
      }
      
      console.log(`[Frontend] ✅ Organization created:`, response.createOrganization)
      return response.createOrganization;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[Frontend] ❌ Organization creation error:`, errorMessage);
      throw new Error(errorMessage || 'Failed to create organization');
    }
  }

  static async updateOrganization(id: number, name: string): Promise<any> {
    const MUTATION = gql`
      mutation UpdateOrganization($id: Int!, $name: String) {
        updateOrganization(id: $id, name: $name) {
          id
          name
          createdAt
          updatedAt
        }
      }
    `;

    const response = await graphQLRequest<{ updateOrganization: any }>(MUTATION, {
      id,
      name,
    });
    return response.updateOrganization;
  }
}
