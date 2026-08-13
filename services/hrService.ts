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

  // ─── Procurement Agent Management ──────────────────────────────────────────────

  static async getProcurementAgents(orgId?: number, status?: string): Promise<any[]> {
    const QUERY = gql`
      query GetProcurementAgents($orgId: Int, $status: ProcurementInvitationStatus) {
        procurementAgents(orgId: $orgId, status: $status) {
          id
          email
          status
          positionId
          expiresAt
          createdAt
          position {
            id
            name
          }
        }
      }
    `;
    const res = await graphQLRequest<{ procurementAgents: any[] }>(QUERY, { orgId, status });
    return res.procurementAgents;
  }

  static async getPendingAgentRequests(status?: string): Promise<any[]> {
    const QUERY = gql`
      query GetPendingAgentRequests($status: ProcurementAgentRequestStatus) {
        pendingAgentRequests(status: $status) {
          id
          orgId
          agentId
          message
          status
          reviewedAt
          reviewNotes
          createdAt
          agent {
            id
            fullname
            email
            phone
            isVerified
            verificationStatus
          }
        }
      }
    `;
    const res = await graphQLRequest<{ pendingAgentRequests: any[] }>(QUERY, { status });
    return res.pendingAgentRequests;
  }

  static async getOrganizationInvitations(status?: string): Promise<any[]> {
    const QUERY = gql`
      query GetOrganizationInvitations($status: ProcurementInvitationStatus) {
        organizationInvitations(status: $status) {
          id
          email
          code
          link
          positionId
          status
          expiresAt
          createdAt
          position {
            id
            name
          }
        }
      }
    `;
    const res = await graphQLRequest<{ organizationInvitations: any[] }>(QUERY, { status });
    return res.organizationInvitations;
  }

  static async inviteProcurementAgent(input: {
    email?: string;
    positionId?: string;
    expiresInDays?: number;
  }): Promise<any> {
    const mutation = gql`
      mutation InviteProcurementAgent($input: InviteProcurementAgentInput!) {
        inviteProcurementAgent(input: $input) {
          id
          email
          code
          link
          positionId
          status
          expiresAt
          position {
            id
            name
          }
        }
      }
    `;
    const res = await graphQLRequest<{ inviteProcurementAgent: any }>(mutation, { input });
    return res.inviteProcurementAgent;
  }

  static async generateInvitation(input: {
    positionId?: string;
    expiresInDays?: number;
  }): Promise<any> {
    const mutation = gql`
      mutation GenerateInvitation($input: GenerateInvitationInput!) {
        generateInvitation(input: $input) {
          id
          code
          link
          positionId
          status
          expiresAt
          position {
            id
            name
          }
        }
      }
    `;
    const res = await graphQLRequest<{ generateInvitation: any }>(mutation, { input });
    return res.generateInvitation;
  }

  static async approveProcurementAgent(id: string, positionId?: string): Promise<any> {
    const mutation = gql`
      mutation ApproveProcurementAgent($id: String!, $positionId: String) {
        approveProcurementAgent(id: $id, positionId: $positionId) {
          id
          status
          expiresAt
          position {
            id
            name
          }
        }
      }
    `;
    const res = await graphQLRequest<{ approveProcurementAgent: any }>(mutation, { id, positionId });
    return res.approveProcurementAgent;
  }

  static async rejectProcurementAgent(id: string, notes?: string): Promise<any> {
    const mutation = gql`
      mutation RejectProcurementAgent($id: String!, $notes: String) {
        rejectProcurementAgent(id: $id, notes: $notes) {
          id
          status
          reviewedAt
          reviewNotes
        }
      }
    `;
    const res = await graphQLRequest<{ rejectProcurementAgent: any }>(mutation, { id, notes });
    return res.rejectProcurementAgent;
  }

  static async assignProcurementPosition(id: string, positionId: string): Promise<any> {
    const mutation = gql`
      mutation AssignProcurementPosition($id: String!, $positionId: String!) {
        assignProcurementPosition(id: $id, positionId: $positionId) {
          id
          positionId
          position {
            id
            name
          }
        }
      }
    `;
    const res = await graphQLRequest<{ assignProcurementPosition: any }>(mutation, { id, positionId });
    return res.assignProcurementPosition;
  }

  static async removeProcurementAgent(id: string): Promise<any> {
    const mutation = gql`
      mutation RemoveProcurementAgent($id: String!) {
        removeProcurementAgent(id: $id) {
          id
          status
        }
      }
    `;
    const res = await graphQLRequest<{ removeProcurementAgent: any }>(mutation, { id });
    return res.removeProcurementAgent;
  }

  static async resendInvitation(id: string): Promise<any> {
    const mutation = gql`
      mutation ResendInvitation($id: String!) {
        resendInvitation(id: $id) {
          id
          expiresAt
          status
        }
      }
    `;
    const res = await graphQLRequest<{ resendInvitation: any }>(mutation, { id });
    return res.resendInvitation;
  }

  static async revokeInvitation(id: string): Promise<any> {
    const mutation = gql`
      mutation RevokeInvitation($id: String!) {
        revokeInvitation(id: $id) {
          id
          status
          revokedAt
        }
      }
    `;
    const res = await graphQLRequest<{ revokeInvitation: any }>(mutation, { id });
    return res.revokeInvitation;
  }

  static async extendInvitationExpiration(id: string, days: number): Promise<any> {
    const mutation = gql`
      mutation ExtendInvitationExpiration($id: String!, $days: Int!) {
        extendInvitationExpiration(id: $id, days: $days) {
          id
          expiresAt
          status
        }
      }
    `;
    const res = await graphQLRequest<{ extendInvitationExpiration: any }>(mutation, { id, days });
    return res.extendInvitationExpiration;
  }

  static async deleteInvitation(id: string): Promise<any> {
    const mutation = gql`
      mutation DeleteInvitation($id: String!) {
        deleteInvitation(id: $id) {
          id
          status
        }
      }
    `;
    const res = await graphQLRequest<{ deleteInvitation: any }>(mutation, { id });
    return res.deleteInvitation;
  }

  static async getProcurementAgentDetails(agentId: string): Promise<any> {
    const QUERY = gql`
      query GetProcurementAgentDetails($agentId: String!) {
        procurementAgentDetails(agentId: $agentId) {
          id
          agentType
          status
          verificationStatus
          user {
            id
            fullname
            email
            contactNumber
            dateOfBirth
            gender
            address
            city
            province
          }
          personalInfo {
            birthday
            gender
            address
            city
            province
            zipCode
          }
          preferences {
            interestedIndustries
            experienceLevel
          }
          organization {
            id
            name
          }
          position {
            id
            name
          }
          invitedBy {
            fullname
            email
          }
          verifications {
            id
            documentType
            fileUrl
            status
            createdAt
          }
          createdAt
        }
      }
    `;
    const res = await graphQLRequest<{ procurementAgentDetails: any }>(QUERY, { agentId });
    return res.procurementAgentDetails;
  }
}