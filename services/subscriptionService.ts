import { gql } from 'graphql-request';
import { graphQLRequest } from './apiClient';
import { formatGraphQLError } from '@/utils/errorFormatter';

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
    try {
      if (__DEV__) console.log(`[Frontend] Creating subscription for org ${orgId} with plan ${plan}...`)

      const MUTATION = gql`
        mutation CreateSubscription($orgId: Int!, $plan: SubscriptionPlan!) {
          createSubscription(orgId: $orgId, plan: $plan) {
            id
            orgId
            plan
            createdAt
          }
        }
      `;

      const response = await graphQLRequest<{ createSubscription: any }>(MUTATION, {
        orgId,
        plan,
      });

      if (!response?.createSubscription) {
        throw new Error('No subscription returned from server')
      }

      if (__DEV__) console.log(`[Frontend] ✅ Subscription created:`, response.createSubscription)
      return response.createSubscription;
    } catch (error) {
      const errorMessage = formatGraphQLError(error)
      if (__DEV__) {
        console.error(`[Frontend] ❌ Subscription creation error:`, errorMessage)
      }
      throw new Error(errorMessage || 'Failed to create subscription')
    }
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
