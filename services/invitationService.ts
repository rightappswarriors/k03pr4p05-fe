import { gql } from 'graphql-request'
import { graphQLRequest } from './apiClient'

export type InvitationMethod = 'EMAIL' | 'LINK' | 'CODE'

export type InvitationInput = {
  method: InvitationMethod
  email?: string
  positionId?: string
  expiresInDays?: number
  customMessage?: string
}

export class InvitationService {
  static async getOrganizationInvitations(status?: string, method?: InvitationMethod): Promise<any[]> {
    const QUERY = gql`
      query GetOrganizationInvitations($status: ProcurementInvitationStatus, $method: String) {
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
    `
    const res = await graphQLRequest<{ organizationInvitations: any[] }>(QUERY, { status, method })
    return res.organizationInvitations
  }

  static async generateInvitation(input: { expiresInDays?: number }): Promise<any> {
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
    `
    const res = await graphQLRequest<{ generateInvitation: any }>(mutation, { input })
    return res.generateInvitation
  }

  static async inviteProcurementAgent(input: InvitationInput): Promise<any> {
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
    `
    const res = await graphQLRequest<{ inviteProcurementAgent: any }>(mutation, { input })
    return res.inviteProcurementAgent
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
    `
    const res = await graphQLRequest<{ resendInvitation: any }>(mutation, { id })
    return res.resendInvitation
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
    `
    const res = await graphQLRequest<{ revokeInvitation: any }>(mutation, { id })
    return res.revokeInvitation
  }

  static async extendExpiration(id: string, expiresInDays: number): Promise<any> {
    const mutation = gql`
      mutation ExtendInvitationExpiration($id: String!, $expiresInDays: Int!) {
        extendInvitationExpiration(id: $id, expiresInDays: $expiresInDays) {
          id
          expiresAt
          status
        }
      }
    `
    const res = await graphQLRequest<{ extendInvitationExpiration: any }>(mutation, { id, expiresInDays })
    return res.extendInvitationExpiration
  }

  static async deleteInvitation(id: string): Promise<any> {
    const mutation = gql`
      mutation DeleteInvitation($id: String!) {
        removeProcurementAgent(id: $id) {
          id
          status
          deletedAt
        }
      }
    `
    const res = await graphQLRequest<{ removeProcurementAgent: any }>(mutation, { id })
    return res.removeProcurementAgent
  }
}