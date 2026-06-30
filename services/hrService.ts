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

  static async recordSalarySnapshot(
    employeeId: string,
    ammount: number,
    effectiveAt?: string,
  ): Promise<any> {
    const mutation = gql`
    mutation RecordSalarySnapshot(
      $employeeId: ID!
      $ammount: Float!
      $effectiveAt: String
    ) {
      recordSalarySnapshot(
        employeeId: $employeeId
        ammount: $ammount
        effectiveAt: $effectiveAt
      ) {
        id
        ammount
        effectiveAt
      }
    }
  `;
    try {

      const res = await graphQLRequest<{ recordSalarySnapshot: any }>(mutation, {
        employeeId,
        ammount,
        effectiveAt,
      });
      return res.recordSalarySnapshot;
    } catch (error) {
      if (__DEV__)
        console.error(error)
      throw new Error("Error upon saving Salary")
    }
  }
  /**
   * Generic employee editor — supports updating any combination of
   * fullname, username, positionId, role, and salary in a single call.
   * Use this for the "Edit Employee" flow instead of separate single-field
   * mutations when more than one field changes at once.
   */
  static async updateEmployee(
    userId: number,
    fields: {
      fullname?: string;
      username?: string;
      positionId?: string | null;
      role?: string;
      salary?: number;
    },
  ): Promise<any> {
    const mutation = gql`
      mutation UpdateEmployee(
        $id: ID!
        $fullname: String
        $username: String
        $positionId: String
        $role: Role
        $salary: Float
      ) {
        updateUser(
          id: $id
          fullname: $fullname
          username: $username
          positionId: $positionId
          role: $role
          salary: $salary
        ) {
          id
          fullname
          username
          email
          role
          positionId
          salary
        }
      }
    `;

    try {
      const res = await graphQLRequest<{ updateUser: any }>(mutation, {
        id: userId,
        ...fields,
      });
      return res.updateUser;
    } catch (error) {
      throw new Error(
        `Failed to update employee: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  static async updateUserSalary(userId: number, salary: number): Promise<any> {
    return this.updateEmployee(userId, { salary });
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
        createdAt
        positionId
        salary
        department {
          label
        }
        position {
          id
          name
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
    role?: string;
    salary?: number;
  }): Promise<any> {
    const mutation = gql`
      mutation CreateHRUser(
        $fullname: String!
        $email: String!
        $password: String!
        $departmentId: Int
        $positionId: String
        $role: Role
        $salary: Float
      ) {
        createHRUser(
          fullname: $fullname
          email: $email
          password: $password
          departmentId: $departmentId
          positionId: $positionId
          role: $role
          salary: $salary
        ) {
          id
          fullname
          email
          role
          positionId
          departmentId
          salary
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