import { gql } from 'graphql-request';
import { graphQLRequest } from './apiClient';

export class SubscriptionService {
  static async getSubscription(orgId: number): Promise<any | null> {
    const QUERY = gql`
      query Subscription($orgId: Int) {
        subscription(orgId: $orgId) {
          id
          orgId
          plan
          createdAt
          updatedAt
        }
      }
    `;

    const response = await graphQLRequest<{ subscription: any | null }>(QUERY, { orgId });
    return response.subscription;
  }

  static async createSubscription(orgId: number, plan: 'BASIC' | 'GOLD'): Promise<any> {
    const MUTATION = gql`
      mutation CreateSubscription($orgId: Int, $plan: SubscriptionPlan) {
        createSubscription(orgId: $orgId, plan: $plan) {
          id
          orgId
          plan
          createdAt
          updatedAt
        }
      }
    `;

    const response = await graphQLRequest<{ createSubscription: any }>(MUTATION, {
      orgId,
      plan,
    });
    return response.createSubscription;
  }

  static async updateSubscription(orgId: number, plan: 'BASIC' | 'GOLD'): Promise<any> {
    const MUTATION = gql`
      mutation UpdateSubscription($orgId: Int, $plan: SubscriptionPlan) {
        updateSubscription(orgId: $orgId, plan: $plan) {
          id
          orgId
          plan
          createdAt
          updatedAt
        }
      }
    `;

    const response = await graphQLRequest<{ updateSubscription: any }>(MUTATION, {
      orgId,
      plan,
    });
    return response.updateSubscription;
  }

  static async upgradePlan(orgId: number, plan: 'BASIC' | 'GOLD'): Promise<any> {
    return this.updateSubscription(orgId, plan);
  }
}
