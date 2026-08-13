import { gql } from 'graphql-request';
import { graphQLRequest } from './apiClient';

export class BudgetService {
    static async getBudgetEntries(year?: number): Promise<any[]> {
        const QUERY = gql`
      query BudgetEntries($year: Int) {
        budgetEntries(year: $year) {
          id
          year
          account
          begBal
          months
          orgId
          createdAt
          updatedAt
        }
      }
    `;

        const response = await graphQLRequest<{ budgetEntries: any[] }>(QUERY, { year });
        return response.budgetEntries ?? [];
    }

    static async createBudgetEntry(
        year: number,
        account: string,
        begBal: number,
        months: Record<string, number>,
    ): Promise<any> {
        const MUTATION = gql`
      mutation CreateBudgetEntry(
        $year: Int!
        $account: String!
        $begBal: Float!
        $months: Json!
      ) {
        createBudgetEntry(
          year: $year
          account: $account
          begBal: $begBal
          months: $months
        ) {
          id
          year
          account
          begBal
          months
          orgId
          createdAt
          updatedAt
        }
      }
    `;
        try {
            const response = await graphQLRequest<{ createBudgetEntry: any }>(MUTATION, {
                year,
                account,
                begBal,
                months,
            });
            return response.createBudgetEntry;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            throw new Error(`Failed to create budget entry: ${errorMessage}`);
        }

    }

    static async updateBudgetEntry(
        id: number,
        year: number,
        account: string,
        begBal: number,
        months: Record<string, number>,
    ): Promise<any> {
        const MUTATION = gql`
      mutation UpdateBudgetEntry(
        $id: Int!
        $year: Int!
        $account: String!
        $begBal: Float!
        $months: Json!
      ) {
        updateBudgetEntry(
          id: $id
          year: $year
          account: $account
          begBal: $begBal
          months: $months
        ) {
          id
          year
          account
          begBal
          months
          orgId
          createdAt
          updatedAt
        }
      }
    `;

        const response = await graphQLRequest<{ updateBudgetEntry: any }>(MUTATION, {
            id,
            year,
            account,
            begBal,
            months,
        });
        return response.updateBudgetEntry;
    }

    static async deleteBudgetEntry(id: number): Promise<void> {
        const MUTATION = gql`
      mutation DeleteBudgetEntry($id: Int!) {
        deleteBudgetEntry(id: $id) {
          id
        }
      }
    `;
        await graphQLRequest<{ deleteBudgetEntry: any }>(MUTATION, { id });
    }
}
