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
    const MUTATION = gql`
      mutation CreateOrganization($name: String) {
        createOrganization(name: $name) {
          id
          name
          createdAt
          updatedAt
        }
      }
    `;

    const response = await graphQLRequest<{ createOrganization: any }>(MUTATION, { name });
    return response.createOrganization;
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
