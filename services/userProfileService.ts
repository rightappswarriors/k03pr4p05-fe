import { gql } from 'graphql-request';
import { graphQLRequest } from './apiClient';

export class UserProfileService {
    static async getMyProfile(): Promise<any> {
        const QUERY = gql`
      query GetMyProfile {
        getMyProfile {
          id
          contactNumber
          address
          city
          zipCode
          country
          dateOfBirth
          profilePhoto
          department {
            label
          }
          position {
            name
          }
          createdAt
          updatedAt
          fullname
          email
          username
         }
      }
    `;

        const response = await graphQLRequest<{ getMyProfile: any }>(QUERY);
        return response.getMyProfile;
    }

    static async getUserProfile(userId: number): Promise<any> {
        const QUERY = gql`
      query GetUserProfile($userId: Int!) {
        getUserProfile(userId: $userId) {
          id
          userId
          contactNumber
          address
          city
          zipCode
          country
          dateOfBirth
          profilePhoto
          
          department {
          id
            label
          }
          position {
          id
            name
          }
          createdAt
          updatedAt
          fullname
          email
          username
         }
        }
      }
    `;

        const response = await graphQLRequest<{ getUserProfile: any }>(QUERY, { userId });
        return response.getUserProfile;
    }

    static async updateMyProfile(data: {

        contactNumber?: string;
        address?: string;
        city?: string;
        zipCode?: string;
        country?: string;
        dateOfBirth?: string;
        profilePhoto?: string;
    }): Promise<any> {
        const MUTATION = gql`
      mutation UpdateMyProfile(
       
        $contactNumber: String
        $address: String
        $city: String
        $zipCode: String
        $country: String
        $dateOfBirth: String
        $profilePhoto: String
      ) {
        updateMyProfile(
          contactNumber: $contactNumber
          address: $address
          city: $city
          zipCode: $zipCode
          country: $country
          dateOfBirth: $dateOfBirth
          profilePhoto: $profilePhoto
        ) {
          id
          contactNumber
          address
          city
          zipCode
          country
          dateOfBirth
          profilePhoto
          department
          position
          createdAt
          updatedAt
        }
      }
    `;

        const response = await graphQLRequest<{ updateMyProfile: any }>(MUTATION, data);
        return response.updateMyProfile;
    }

    static async updateUserProfile(
        userId: number,
        data: {
            contactNumber?: string;
            address?: string;
            city?: string;
            zipCode?: string;
            country?: string;
            dateOfBirth?: string;
            profilePhoto?: string;
        }
    ): Promise<any> {
        const MUTATION = gql`
      mutation UpdateUserProfile(
        $id: Int!
        $contactNumber: String
        $address: String
        $city: String
        $zipCode: String
        $country: String
        $dateOfBirth: String
        $profilePhoto: String
      ) {
        updateUserProfile(
          id: $id
          contactNumber: $contactNumber
          address: $address
          city: $city
          zipCode: $zipCode
          country: $country
          dateOfBirth: $dateOfBirth
          profilePhoto: $profilePhoto
        ) {
          id
          contactNumber
          address
          city
          zipCode
          country
          dateOfBirth
          profilePhoto
          createdAt
          updatedAt
        }
      }
    `;

        const response = await graphQLRequest<{ updateUserProfile: any }>(MUTATION, {
            userId,
            ...data,
        });
        return response.updateUserProfile;
    }
}
