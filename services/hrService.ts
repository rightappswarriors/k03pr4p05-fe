import { gql } from 'graphql-request';
import { graphQLRequest } from './apiClient';

export class HrService {
  static async getOutletStaff(outletId: number): Promise<any[]> {
    const QUERY = gql`
      query GetOutletStaff($outletId: ID!) {
        getOutletStaff(outletId: $outletId) {
          id
          email
          fullname
          username
          role
          profilePhoto
        }
      }
    `;

    const res = await graphQLRequest<{ getOutletStaff: any[] }>(QUERY, { outletId });
    return res.getOutletStaff;
  }

  static async addStaffToOutlet(outletId: number, userId: number, role: string): Promise<any> {
    const mutation = gql`
      mutation AddOutletStaff($outletId: ID!, $users: [OutletStaffInput!]!) {
        AddOutletStaff(outletId: $outletId, users: $users) {
          id
          name
          staff {
            id
            email
            fullname
            role
          }
        }
      }
    `;

    const res = await graphQLRequest<{ AddOutletStaff: any }>(mutation, {
      outletId,
      users: [{ userId, role }],
    });
    return res.AddOutletStaff;
  }

  static async updateStaffRole(userId: number, role: string): Promise<any> {
    // Some backends may not support role on updateUser directly. We try to call it.
    const mutation = gql`
      mutation UpdateUserRole($id: ID!, $role: Role!) {
        updateUser(id: $id, role: $role) {
          id
          email
          fullname
          username
          role
        }
      }
    `;

    try {
      const res = await graphQLRequest<{ updateUser: any }>(mutation, {
        id: userId,
        role,
      });
      return res.updateUser;
    } catch (error) {
      throw new Error(`Failed to update staff role: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  static async updateUserPosition(userId: number, positionId?: string | null): Promise<any> {
    const mutation = gql`
      mutation UpdateUserPosition($id: ID!, $positionId: String) {
        updateUser(id: $id, positionId: $positionId) {
          id
          fullname
          username
          email
          role
          positionId
        }
      }
    `;

    const res = await graphQLRequest<{ updateUser: any }>(mutation, {
      id: userId,
      positionId,
    });
    return res.updateUser;
  }

  static async getAllStaffs(orgId?: number): Promise<any[]> {
    const QUERY = gql`
      query GetAllStaffs($orgId: Int) {
        getAllStaffs(orgId: $orgId) {
          id
          email
          fullname
          username
          role
          profilePhoto
          positionId
          department {
            label
          }
        }
      }
    `;

    const res = await graphQLRequest<{ getAllStaffs: any[] }>(QUERY, { orgId });
    return res.getAllStaffs;
  }

  static async createHRUser(payload: {
    fullname: string;
    email: string;
    password: string;
    departmentId?: number;
    positionId?: string;
  }): Promise<any> {
    const mutation = gql`
      mutation CreateHRUser(
        $fullname: String!
        $email: String!
        $password: String!
        $departmentId: Int
        $positionId: String
      ) {
        createHRUser(
          fullname: $fullname
          email: $email
          password: $password
          departmentId: $departmentId
          positionId: $positionId
        ) {
          id
          fullname
          email
          role
          positionId
          departmentId
          createdAt
        }
      }
    `;
    try {
      const res = await graphQLRequest<{ createHRUser: any }>(mutation, payload);
      return res.createHRUser;

    } catch (error) {
      throw new Error(`Failed to create HR user: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  static async checkUserTimeInStatus(userId: string): Promise<{ hasTimeIn: boolean }> {
    const QUERY = gql`
      query CheckUserTimeInStatus($userId: ID!) {
        checkUserTimeInStatus(userId: $userId) {
          hasTimeIn
          lastTimeIn
          status
        }
      }
    `;

    try {
      const res = await graphQLRequest<{ checkUserTimeInStatus: any }>(QUERY, { userId });
      return res.checkUserTimeInStatus;
    } catch (error) {
      if (__DEV__) console.error('Failed to check time-in status:', error);
      // Return false if query fails
      return { hasTimeIn: false };
    }
  }
}
