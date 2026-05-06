
// services/AdminSubscriptionService.ts
import { gql } from 'graphql-request';
import { graphQLRequest } from './apiClient';

export type SubscriptionPlan = 'BASIC' | 'GOLD';

export interface OrgSubscription {
  id: number;
  orgId: number;
  plan: SubscriptionPlan;
  expiresAt: string | null;
  features: string | null;
  createdAt: string;
  org: {
    id: number;
    name: string;
    email: string | null;
    profilePhoto: string | null;
  };
}

export interface SubscriptionList {
  items: OrgSubscription[];
  total: number;
  page: number;
  pageSize: number;
}

// Shared GQL fragment to keep fields DRY
const SUBSCRIPTION_FIELDS = `
  id
  orgId
  plan
  expiresAt
  features
  createdAt
  org {
    id
    name
    email
    profilePhoto
  }
`;

export class AdminSubscriptionService {

  // ── Queries ──────────────────────────────────────────────────────────────────

  static async getAllSubscriptions(params?: {
    query?: string;
    plan?: SubscriptionPlan;
    page?: number;
    pageSize?: number;
  }): Promise<SubscriptionList> {
    const GQL = gql`
      query GetAllSubscriptions(
        $query: String
        $plan: SubscriptionPlan
        $page: Int
        $pageSize: Int
      ) {
        getAllSubscriptions(
          query: $query
          plan: $plan
          page: $page
          pageSize: $pageSize
        ) {
          items { ${SUBSCRIPTION_FIELDS} }
          total
          page
          pageSize
        }
      }
    `;
    const res = await graphQLRequest<{ getAllSubscriptions: SubscriptionList }>(
      GQL,
      params ?? {},
    );
    return res.getAllSubscriptions;
  }

  static async getSubscriptionByOrgId(orgId: number): Promise<OrgSubscription | null> {
    const GQL = gql`
      query GetSubscriptionByOrgId($orgId: Int!) {
        getSubscriptionByOrgId(orgId: $orgId) {
          ${SUBSCRIPTION_FIELDS}
        }
      }
    `;
    const res = await graphQLRequest<{ getSubscriptionByOrgId: OrgSubscription | null }>(
      GQL,
      { orgId },
    );
    return res.getSubscriptionByOrgId;
  }

  // ── Mutations ────────────────────────────────────────────────────────────────

  static async createSubscription(input: {
    orgId: number;
    plan: SubscriptionPlan;
    expiresAt?: string | null;
    features?: string | null;
  }): Promise<OrgSubscription> {
    const mutation = gql`
      mutation CreateSubscriptionAdmin(
        $orgId: Int!
        $plan: SubscriptionPlan!
        $expiresAt: String
        $features: String
      ) {
        createSubscriptionAdmin(
          orgId: $orgId
          plan: $plan
          expiresAt: $expiresAt
          features: $features
        ) {
          ${SUBSCRIPTION_FIELDS}
        }
      }
    `;
    const res = await graphQLRequest<{ createSubscriptionAdmin: OrgSubscription }>(
      mutation,
      input,
    );
    return res.createSubscriptionAdmin;
  }

  static async updateSubscription(input: {
    orgId: number;
    plan?: SubscriptionPlan;
    expiresAt?: string | null;
    features?: string | null;
  }): Promise<OrgSubscription> {
    const mutation = gql`
      mutation UpdateSubscriptionAdmin(
        $orgId: Int!
        $plan: SubscriptionPlan
        $expiresAt: String
        $features: String
      ) {
        updateSubscriptionAdmin(
          orgId: $orgId
          plan: $plan
          expiresAt: $expiresAt
          features: $features
        ) {
          ${SUBSCRIPTION_FIELDS}
        }
      }
    `;
    const res = await graphQLRequest<{ updateSubscriptionAdmin: OrgSubscription }>(
      mutation,
      input,
    );
    return res.updateSubscriptionAdmin;
  }

  static async deleteSubscription(orgId: number): Promise<OrgSubscription> {
    const mutation = gql`
      mutation DeleteSubscriptionAdmin($orgId: Int!) {
        deleteSubscriptionAdmin(orgId: $orgId) {
          id
          orgId
          plan
          org { id name }
        }
      }
    `;
    const res = await graphQLRequest<{ deleteSubscriptionAdmin: OrgSubscription }>(
      mutation,
      { orgId },
    );
    return res.deleteSubscriptionAdmin;
  }

  static async extendSubscription(orgId: number, days: number): Promise<OrgSubscription> {
    const mutation = gql`
      mutation ExtendSubscriptionAdmin($orgId: Int!, $days: Int!) {
        extendSubscriptionAdmin(orgId: $orgId, days: $days) {
          ${SUBSCRIPTION_FIELDS}
        }
      }
    `;
    const res = await graphQLRequest<{ extendSubscriptionAdmin: OrgSubscription }>(
      mutation,
      { orgId, days },
    );
    return res.extendSubscriptionAdmin;
  }
}