import { graphQLRequest } from './apiClient';

export type GovernanceTab = 'overview' | 'organizations' | 'wallet';

const DASHBOARD = `query { adminGovernanceDashboard { totalOrganizations verifiedOrganizations pendingOrganizations suspendedOrganizations bannedOrganizations totalStandaloneAgents verifiedStandaloneAgents pendingStandaloneAgents suspendedStandaloneAgents bannedStandaloneAgents platformWalletBalance platformFeesToday platformFees30Days successfulPaymentCount } }`;
const ORGANIZATIONS = `query($search:String,$verificationStatus:OrgVerificationStatus,$accountStatus:OrganizationAccountStatus,$page:Int,$limit:Int){ adminOrganizations(search:$search,verificationStatus:$verificationStatus,accountStatus:$accountStatus,page:$page,limit:$limit){ total page limit items { id name email roles verificationStatus accountStatus createdAt suspensionReason banReason } } }`;
const AGENTS = `query($search:String,$verificationStatus:VerificationStatus,$status:AgentStatus,$page:Int,$limit:Int){ adminStandaloneAgents(search:$search,verificationStatus:$verificationStatus,status:$status,page:$page,limit:$limit){ total page limit items { id fullname email phone address trustTier verificationStatus status createdAt suspensionReason banReason } } }`;
const WALLET = `query($page:Int,$limit:Int){ platformWallet { id currency balance heldBalance } platformWalletLedger(page:$page,limit:$limit){ total page limit items { id type sourceType referenceId amount balanceAfter description environment createdAt } } }`;
const GOVERNANCE_MUTATION = (name: string, idType: 'Int' | 'String', reason = false) => `mutation($id:${idType}!${reason ? ',$reason:String!' : ''}){ ${name}(id:$id${reason ? ',reason:$reason' : ''}) { id } }`;

export const adminGovernanceService = {
  dashboard: () => graphQLRequest<{ adminGovernanceDashboard: any }>(DASHBOARD),
  organizations: (variables: Record<string, unknown>) => graphQLRequest<{ adminOrganizations: any }>(ORGANIZATIONS, variables),
  agents: (variables: Record<string, unknown>) => graphQLRequest<{ adminStandaloneAgents: any }>(AGENTS, variables),
  wallet: (variables: Record<string, unknown> = {}) => graphQLRequest<{ platformWallet: any; platformWalletLedger: any }>(WALLET, variables),
  mutateOrganization: (name: string, id: number, reason?: string) => {
    if (name === 'adminRejectOrganizationVerification') return graphQLRequest(`mutation($id:Int!,$remarks:String!){ ${name}(id:$id,remarks:$remarks){ id } }`, { id, remarks: reason });
    return graphQLRequest(GOVERNANCE_MUTATION(name, 'Int', Boolean(reason)), reason ? { id, reason } : { id });
  },
  mutateAgent: (name: string, id: string, reason?: string) => {
    if (name === 'adminRejectAgent') return graphQLRequest(`mutation($id:String!,$remarks:String!){ ${name}(id:$id,remarks:$remarks){ id } }`, { id, remarks: reason });
    return graphQLRequest(GOVERNANCE_MUTATION(name, 'String', Boolean(reason)), reason ? { id, reason } : { id });
  },
};
