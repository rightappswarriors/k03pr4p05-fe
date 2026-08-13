// procurementAgentService.ts — Frontend GraphQL service for procurement agent operations
import { gql } from 'graphql-request';
import { graphQLRequest } from './apiClient';
import { formatGraphQLError } from '@/utils/errorFormatter';

// ─── TypeScript Interfaces ────────────────────────────────────────────────────

export interface VerificationDocument {
  id: string;
  documentType: string;
  fileUrl: string;
  status: string;
  createdAt: string;
}

export interface AgentPersonalInfo {
  dateOfBirth: string | null;
  gender: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  zipCode: string | null;
  civilStatus: string | null;
  emergencyContact: string | null;
}

export interface AgentPreferences {
  interestedIndustries: string[];
  experienceLevel: string;
}

export interface AgentInvitationInfo {
  id: string;
  orgId: number;
  orgName: string;
  orgLogo: string | null;
  orgAddress: string | null;
  positionId: string | null;
  positionName: string | null;
  status: string;
  expiresAt: string | null;
  usedAt: string | null;
}

export interface AgentOrganizationInfo {
  id: number;
  name: string;
  profileImg: string | null;
  location: string | null;
}

export interface PendingAgentVerification {
  id: string;
  type: string;
  url: string;
  status: string;
  createdAt: string;
}

export interface PendingAgentAgent {
  id: string;
  fullname: string;
  email: string;
  phone: string | null;
  birthday: string | null;
  gender: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  zipCode: string | null;
  civilStatus: string | null;
  emergencyContact: string | null;
  interestedIndustries: string[];
  experienceLevel: string;
  verificationStatus: string;
  organization: AgentOrganizationInfo | null;
}

export interface PendingAgentInvitation {
  id: string;
  orgId: number;
  code: string | null;
  link: string | null;
  positionId: string | null;
  position: { id: string; name: string } | null;
  status: string;
  expiresAt: string | null;
  usedAt: string | null;
}

export interface PendingAgentInvitedBy {
  fullname: string;
  email: string;
}

export interface PendingAgentOrganization {
  id: number;
  name: string;
  profileImg: string | null;
  location: string | null;
}

export interface PendingAgent {
  id: string;
  agentId: string;
  status: string;
  invitationId: string;
  position: string | null;
  positionId: string | null;
  createdAt: string;
  submittedAt: string;
  agent: PendingAgentAgent | null;
  invitation: PendingAgentInvitation | null;
  invitedBy: PendingAgentInvitedBy | null;
  organization: PendingAgentOrganization | null;
}

export interface AgentDetailsPersonalInfo {
  dateOfBirth: string | null;
  gender: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  zipCode: string | null;
  civilStatus: string | null;
  emergencyContact: string | null;
}

export interface AgentDetailsPreferences {
  interestedIndustries: string[];
  experienceLevel: string;
}

export interface AgentDetailsVerification {
  id: string;
  documentType: string;
  fileUrl: string;
  status: string;
  createdAt: string;
}

export interface AgentDetailsInvitation {
  id: string;
  orgId: number;
  orgName: string;
  orgLogo: string | null;
  orgAddress: string | null;
  positionId: string | null;
  positionName: string | null;
  status: string;
  expiresAt: string | null;
  usedAt: string | null;
}

export interface AgentDetailsOrganization {
  id: number;
  name: string;
  profileImg: string | null;
  location: string | null;
}

export interface AgentDetails {
  id: string;
  agentType: string;
  status: string;
  email: string;
  phone: string | null;
  fullname: string;
  verificationStatus: string;
  submittedAt: string;
  personalInfo: AgentDetailsPersonalInfo;
  preferences: AgentDetailsPreferences;
  verifications: AgentDetailsVerification[];
  invitation: AgentDetailsInvitation | null;
  organization: AgentDetailsOrganization | null;
}

export interface ProcurementAgent {
  id: string;
  email: string | null;
  status: string;
  positionId: string | null;
  expiresAt: string | null;
  createdAt: string;
  position: { id: string; name: string } | null;
  fullname?: string | null;
  phone?: string | null;
  verificationStatus?: string;
}

export interface OrganizationAgent {
  id: string;
  agentType: string;
  organizationId: number;
  email: string;
  phone: string | null;
  fullname: string;
  verificationStatus: string;
  trustTier: string;
  status: string;
  address: string | null;
  birthday: string | null;
  city: string | null;
  province: string | null;
  zipCode: string | null;
  civilStatus: string | null;
  emergencyContact: string | null;
  experienceLevel: string;
  gender: string | null;
  interestedIndustries: string[];
  positionId: string | null;
  positionName: string | null;
  invitationId: string | null;
  invitationStatus: string | null;
  user: { id: string; fullname: string; email: string; phone: string | null } | null;
  organization: { id: number; name: string; profileImg: string | null; location: string | null } | null;
  verifications: VerificationDocument[];
  createdAt: string;
  updatedAt: string;
}

export interface UpdateOrganizationAgentInput {
  fullname?: string;
  phone?: string;
  address?: string;
  city?: string;
  province?: string;
  zipCode?: string;
  birthday?: string | null;
  gender?: string | null;
  civilStatus?: string | null;
  emergencyContact?: string | null;
  experienceLevel?: string;
  interestedIndustries?: string[];
  positionId?: string | null;
}

export interface ApproveResult {
  success: boolean;
  membershipId: string;
  agentId: string;
  invitationId: string;
}

export interface RejectResult {
  success: boolean;
  agentId: string;
  invitationId: string;
}

// ─── Helper: dev logging ──────────────────────────────────────────────────────

function devLog(label: string, data?: any): void {
  if (__DEV__) {
    console.log(`[ProcurementAgentService] ${label}`, data ?? '');
  }
}

// ─── GraphQL Operations ──────────────────────────────────────────────────────

const PENDING_PURCHASE_AGENTS_QUERY = gql`
  query PendingProcurementAgents($orgId: Int!) {
    pendingProcurementAgents(orgId: $orgId) {
      id
      agentId
      status
      invitationId
      position
      positionId
      createdAt
      submittedAt
      agent {
        id
        fullname
        email
        phone
        birthday
        gender
        address
        city
        province
        zipCode
        civilStatus
        emergencyContact
        interestedIndustries
        experienceLevel
        verificationStatus
        organization {
          id
          name
          profileImg
          location
        }
      }
      invitation {
        id
        orgId
        code
        link
        positionId
        position { id name }
        status
        expiresAt
        usedAt
      }
      invitedBy {
        fullname
        email
      }
      organization {
        id
        name
        profileImg
        location
      }
    }
  }
`;

const ORGANIZATION_AGENT_DETAILS_QUERY = gql`
  query OrganizationAgentDetails($agentId: String!) {
    organizationAgentDetails(agentId: $agentId) {
      id
      agentType
      status
      email
      phone
      fullname
      verificationStatus
      submittedAt
      personalInfo {
        dateOfBirth
        gender
        address
        city
        province
        zipCode
        civilStatus
        emergencyContact
      }
      preferences {
        interestedIndustries
        experienceLevel
      }
      verifications {
        id
        documentType
        fileUrl
        status
        createdAt
      }
      invitation {
        id
        orgId
        orgName
        orgLogo
        orgAddress
        positionId
        positionName
        status
        expiresAt
        usedAt
      }
      organization {
        id
        name
        profileImg
        location
      }
    }
  }
`;

const APPROVE_ORGANIZATION_AGENT_MUTATION = gql`
  mutation ApproveOrganizationAgent($agentId: String!) {
    approveOrganizationAgent(agentId: $agentId) {
      success
      membershipId
      agentId
      invitationId
    }
  }
`;

const ORGANIZATION_AGENTS_QUERY = gql`
  query OrganizationAgents($orgId: Int!) {
    organizationAgents(orgId: $orgId) {
      id
      agentType
      organizationId
      email
      phone
      fullname
      verificationStatus
      trustTier
      status
      address
      birthday
      city
      province
      zipCode
      civilStatus
      emergencyContact
      experienceLevel
      gender
      interestedIndustries
      positionId
      positionName
      invitationId
      invitationStatus
      agent {
        id
        fullname
        email
        phone
      }
      organization {
        id
        name
        profileImg
        location
      }
      verifications {
        id
        documentType
        fileUrl
        status
        createdAt
      }
      createdAt
      updatedAt
    }
  }
`;

const UPDATE_ORGANIZATION_AGENT_MUTATION = gql`
  mutation UpdateOrganizationAgent($agentId: String!, $input: UpdateOrganizationAgentInput!) {
    updateOrganizationAgent(agentId: $agentId, input: $input) {
      id
      agentType
      organizationId
      email
      phone
      fullname
      verificationStatus
      trustTier
      status
      address
      birthday
      city
      province
      zipCode
      civilStatus
      emergencyContact
      experienceLevel
      gender
      interestedIndustries
      positionId
      positionName
      invitationId
      invitationStatus
      user {
        id
        fullname
        email
        phone
      }
      organization {
        id
        name
        profileImg
        location
      }
      verifications {
        id
        documentType
        fileUrl
        status
        createdAt
      }
      createdAt
      updatedAt
    }
  }
`;

const REJECT_ORGANIZATION_AGENT_MUTATION = gql`
  mutation RejectOrganizationAgent($agentId: String!, $reason: String!) {
    rejectOrganizationAgent(agentId: $agentId, reason: $reason) {
      success
      agentId
      invitationId
    }
  }
`;

const REJECT_APPROVED_ORGANIZATION_AGENT_MUTATION = gql`
  mutation RejectApprovedOrganizationAgent($agentId: String!, $reason: String!) {
    rejectApprovedOrganizationAgent(agentId: $agentId, reason: $reason) {
      id
      agentType
      organizationId
      email
      phone
      fullname
      verificationStatus
      trustTier
      status
      address
      birthday
      city
      province
      zipCode
      civilStatus
      emergencyContact
      experienceLevel
      gender
      interestedIndustries
      positionId
      positionName
      invitationId
      invitationStatus
      user {
        id
        fullname
        email
        phone
      }
      organization {
        id
        name
        profileImg
        location
      }
      verifications {
        id
        documentType
        fileUrl
        status
        createdAt
      }
      createdAt
      updatedAt
    }
  }
`;

// ─── Service Functions ───────────────────────────────────────────────────────

export async function getPendingProcurementAgents(
  orgId: number,
): Promise<PendingAgent[]> {
  devLog('pendingProcurementAgents', { operation: 'pendingProcurementAgents', variables: { orgId } });
  const res = await graphQLRequest<{ pendingProcurementAgents: PendingAgent[] }>(
    PENDING_PURCHASE_AGENTS_QUERY,
    { orgId },
  );
  devLog('pendingProcurementAgents response', {
    operation: 'pendingProcurementAgents',
    returnedCount: res.pendingProcurementAgents?.length ?? 0,
  });
  return res.pendingProcurementAgents;
}

export async function getOrganizationAgentDetails(
  agentId: string,
): Promise<AgentDetails | null> {
  devLog('organizationAgentDetails', {
    operation: 'organizationAgentDetails',
    variables: { agentId },
  });
  const res = await graphQLRequest<{ organizationAgentDetails: AgentDetails | null }>(
    ORGANIZATION_AGENT_DETAILS_QUERY,
    { agentId },
  );
  devLog('organizationAgentDetails response', {
    operation: 'organizationAgentDetails',
    agentId,
    result: res.organizationAgentDetails ? 'found' : 'not found',
  });
  return res.organizationAgentDetails;
}

export async function approveOrganizationAgent(
  agentId: string,
): Promise<ApproveResult> {
  devLog('approveOrganizationAgent', {
    operation: 'approveOrganizationAgent',
    variables: { agentId },
  });
  try {
    const res = await graphQLRequest<{ approveOrganizationAgent: ApproveResult }>(
      APPROVE_ORGANIZATION_AGENT_MUTATION,
      { agentId },
    );
    devLog('approveOrganizationAgent response', {
      operation: 'approveOrganizationAgent',
      agentId,
      result: 'approved',
    });
    return res.approveOrganizationAgent;
  } catch (error) {
    if (__DEV__) {
      const errorMessage = formatGraphQLError(error);
      console.error(errorMessage);
    }
    throw new Error('Failed to approve organization agent');
  }
}

export async function getOrganizationAgents(
  orgId: number,
): Promise<OrganizationAgent[]> {
  devLog('organizationAgents', {
    operation: 'organizationAgents',
    variables: { orgId },
  });
  const res = await graphQLRequest<{ organizationAgents: OrganizationAgent[] }>(
    ORGANIZATION_AGENTS_QUERY,
    { orgId },
  );
  devLog('organizationAgents response', {
    operation: 'organizationAgents',
    returnedCount: res.organizationAgents?.length ?? 0,
    organizationId: orgId,
  });
  return res.organizationAgents;
}

export async function updateOrganizationAgent(
  agentId: string,
  input: UpdateOrganizationAgentInput,
): Promise<OrganizationAgent> {
  devLog('updateOrganizationAgent', {
    operation: 'updateOrganizationAgent',
    variables: { agentId, input },
  });
  try {
    const res = await graphQLRequest<{ updateOrganizationAgent: OrganizationAgent }>(
      UPDATE_ORGANIZATION_AGENT_MUTATION,
      { agentId, input },
    );
    devLog('updateOrganizationAgent response', {
      operation: 'updateOrganizationAgent',
      agentId,
      result: 'updated',
    });
    return res.updateOrganizationAgent;
  } catch (error) {
    if (__DEV__) {
      const errorMessage = formatGraphQLError(error);
      console.error(errorMessage);
    }
    throw new Error('Failed to update organization agent');
  }
}

export async function rejectApprovedOrganizationAgent(
  agentId: string,
  reason: string,
): Promise<OrganizationAgent> {
  devLog('rejectApprovedOrganizationAgent', {
    operation: 'rejectApprovedOrganizationAgent',
    variables: { agentId, reason },
  });
  try {
    const res = await graphQLRequest<{ rejectApprovedOrganizationAgent: OrganizationAgent }>(
      REJECT_APPROVED_ORGANIZATION_AGENT_MUTATION,
      { agentId, reason },
    );
    devLog('rejectApprovedOrganizationAgent response', {
      operation: 'rejectApprovedOrganizationAgent',
      agentId,
      result: 'rejected',
    });
    return res.rejectApprovedOrganizationAgent;
  } catch (error) {
    if (__DEV__) {
      const errorMessage = formatGraphQLError(error);
      console.error(errorMessage);
    }
    throw new Error('Failed to reject organization agent');
  }
}

// Keep legacy rejectOrganizationAgent for pending agents (uses the backend rejectProcurementAgent flow)
export async function rejectPendingOrganizationAgent(
  agentId: string,
  reason: string,
): Promise<RejectResult> {
  devLog('rejectPendingOrganizationAgent', {
    operation: 'rejectPendingOrganizationAgent',
    variables: { agentId, reason },
  });
  const res = await graphQLRequest<{ rejectOrganizationAgent: RejectResult }>(
    REJECT_ORGANIZATION_AGENT_MUTATION,
    { agentId, reason },
  );
  devLog('rejectPendingOrganizationAgent response', {
    operation: 'rejectPendingOrganizationAgent',
    agentId,
    result: 'rejected',
  });
  return res.rejectOrganizationAgent;
}
