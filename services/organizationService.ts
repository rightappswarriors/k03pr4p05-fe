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
          roles
          bio
          email
          contactNumber
          location
          profileImg
          bannerImg
          facebookLink
          instagramLink
          twitterLink
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

  static async createOrganization(name: string, roles: string[] = ['SELLER']): Promise<any> {
    if (!name || !name.trim()) {
      throw new Error('Organization name is required');
    }

    try {
      console.log(`[Frontend] Creating organization: ${name} roles: ${roles}`)

      const MUTATION = gql`
        mutation CreateOrganization($name: String!, $roles: [OrgRole!]) {
          createOrganization(name: $name, roles: $roles) {
            id
            name
            roles
            createdAt
          }
        }
      `;

      const response = await graphQLRequest<{ createOrganization: any }>(MUTATION, { name, roles });

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

  static async updateOrganization(
    id: number,
    data: {
      name?: string;
      bio?: string;
      email?: string;
      contactNumber?: string;
      location?: string;
      profileImg?: string;
      bannerImg?: string;
      facebookLink?: string;
      instagramLink?: string;
      twitterLink?: string;
    }
  ): Promise<any> {
    const MUTATION = gql`
      mutation UpdateOrganization(
        $id:            Int!
        $name:          String
        $bio:           String
        $email:         String
        $contactNumber: String
        $location:      String
        $profileImg:    String
        $bannerImg:     String
        $facebookLink:  String
        $instagramLink: String
        $twitterLink:   String
      ) {
        updateOrganization(
          id:            $id
          name:          $name
          bio:           $bio
          email:         $email
          contactNumber: $contactNumber
          location:      $location
          profileImg:    $profileImg
          bannerImg:     $bannerImg
          facebookLink:  $facebookLink
          instagramLink: $instagramLink
          twitterLink:   $twitterLink
        ) {
          id
          name
          bio
          email
          contactNumber
          location
          profileImg
          bannerImg
          facebookLink
          instagramLink
          twitterLink
          createdAt
          updatedAt
        }
      }
    `;

    const response = await graphQLRequest<{ updateOrganization: any }>(MUTATION, { id, ...data });
    return response.updateOrganization;
  }
}
