import { gql } from 'graphql-request';
import { graphQLRequest } from './apiClient';

export class FinanceService {
  static async getAccountTitles(orgId?: number): Promise<any[]> {
    const QUERY = gql`
      query AccountTitles($orgId: Int) {
        accountTitles(orgId: $orgId) {
          id
          orgId
          name
          code
          createdAt
        }
      }
    `;

    const response = await graphQLRequest<{ accountTitles: any[] }>(QUERY, { orgId });
    return response.accountTitles;
  }

  static async createAccountTitle(orgId: number, name: string, code: string): Promise<any> {
    const MUTATION = gql`
      mutation CreateAccountTitle($orgId: Int!, $name: String!, $code: String!) {
        createAccountTitle(orgId: $orgId, name: $name, code: $code) {
          id
          orgId
          name
          code
        }
      }
    `;

    const response = await graphQLRequest<{ createAccountTitle: any }>(MUTATION, {
      orgId,
      name,
      code,
    });
    return response.createAccountTitle;
  }

  static async updateAccountTitle(id: number, name: string, code: string): Promise<any> {
    const MUTATION = gql`
      mutation UpdateAccountTitle($id: Int!, $name: String!, $code: String!) {
        updateAccountTitle(id: $id, name: $name, code: $code) {
          id
          name
          code
        }
      }
    `;

    const response = await graphQLRequest<{ updateAccountTitle: any }>(MUTATION, {
      id,
      name,
      code,
    });
    return response.updateAccountTitle;
  }

  static async deleteAccountTitle(id: number): Promise<any> {
    const MUTATION = gql`
      mutation DeleteAccountTitle($id: Int!) {
        deleteAccountTitle(id: $id) {
          id
        }
      }
    `;

    const response = await graphQLRequest<{ deleteAccountTitle: any }>(MUTATION, { id });
    return response.deleteAccountTitle;
  }

  static async getGISRows(orgId?: number): Promise<any[]> {
    const QUERY = gql`
      query GISRows($orgId: Int) {
        gisRows(orgId: $orgId) {
          id
          orgId
          accountTitleId
          amount
          description
        }
      }
    `;

    const response = await graphQLRequest<{ gisRows: any[] }>(QUERY, { orgId });
    return response.gisRows;
  }

  static async createGISRow(orgId: number, accountTitleId: number, amount: number, description: string): Promise<any> {
    const MUTATION = gql`
      mutation CreateGISRow($orgId: Int!, $accountTitleId: Int!, $amount: Float!, $description: String!) {
        createGISRow(orgId: $orgId, accountTitleId: $accountTitleId, amount: $amount, description: $description) {
          id
          orgId
          amount
          description
        }
      }
    `;

    const response = await graphQLRequest<{ createGISRow: any }>(MUTATION, {
      orgId,
      accountTitleId,
      amount,
      description,
    });
    return response.createGISRow;
  }

  static async updateGISRow(id: number, accountTitleId: number, amount: number, description: string): Promise<any> {
    const MUTATION = gql`
      mutation UpdateGISRow($id: Int!, $accountTitleId: Int!, $amount: Float!, $description: String!) {
        updateGISRow(id: $id, accountTitleId: $accountTitleId, amount: $amount, description: $description) {
          id
          orgId
          amount
          description
        }
      }
    `;

    const response = await graphQLRequest<{ updateGISRow: any }>(MUTATION, {
      id,
      accountTitleId,
      amount,
      description,
    });
    return response.updateGISRow;
  }

  static async deleteGISRow(id: number): Promise<any> {
    const MUTATION = gql`
      mutation DeleteGISRow($id: Int!) {
        deleteGISRow(id: $id) {
          id
        }
      }
    `;

    const response = await graphQLRequest<{ deleteGISRow: any }>(MUTATION, { id });
    return response.deleteGISRow;
  }

  static async getSummaryRows(orgId?: number): Promise<any[]> {
    const QUERY = gql`
      query SummaryRows($orgId: Int) {
        summaryRows(orgId: $orgId) {
          id
          orgId
          accountTitleId
          amount
          description
        }
      }
    `;

    const response = await graphQLRequest<{ summaryRows: any[] }>(QUERY, { orgId });
    return response.summaryRows;
  }

  static async createSummaryRow(orgId: number, accountTitleId: number, amount: number, description: string): Promise<any> {
    const MUTATION = gql`
      mutation CreateSummaryRow($orgId: Int!, $accountTitleId: Int!, $amount: Float!, $description: String!) {
        createSummaryRow(orgId: $orgId, accountTitleId: $accountTitleId, amount: $amount, description: $description) {
          id
          orgId
          amount
          description
        }
      }
    `;

    const response = await graphQLRequest<{ createSummaryRow: any }>(MUTATION, {
      orgId,
      accountTitleId,
      amount,
      description,
    });
    return response.createSummaryRow;
  }

  static async updateSummaryRow(id: number, accountTitleId: number, amount: number, description: string): Promise<any> {
    const MUTATION = gql`
      mutation UpdateSummaryRow($id: Int!, $accountTitleId: Int!, $amount: Float!, $description: String!) {
        updateSummaryRow(id: $id, accountTitleId: $accountTitleId, amount: $amount, description: $description) {
          id
          orgId
          amount
          description
        }
      }
    `;

    const response = await graphQLRequest<{ updateSummaryRow: any }>(MUTATION, {
      id,
      accountTitleId,
      amount,
      description,
    });
    return response.updateSummaryRow;
  }

  static async deleteSummaryRow(id: number): Promise<any> {
    const MUTATION = gql`
      mutation DeleteSummaryRow($id: Int!) {
        deleteSummaryRow(id: $id) {
          id
        }
      }
    `;

    const response = await graphQLRequest<{ deleteSummaryRow: any }>(MUTATION, { id });
    return response.deleteSummaryRow;
  }

  static async getSalesOrders(orgId?: number): Promise<any[]> {
    const QUERY = gql`
      query SalesOrders($orgId: Int) {
        salesOrders(orgId: $orgId) {
          id
          orgId
          customerName
          totalAmount
          status
          createdAt
        }
      }
    `;

    const response = await graphQLRequest<{ salesOrders: any[] }>(QUERY, { orgId });
    return response.salesOrders;
  }

  static async createSalesOrder(orgId: number, customerName: string, totalAmount: number, status: string): Promise<any> {
    const MUTATION = gql`
      mutation CreateSalesOrder($orgId: Int!, $customerName: String, $totalAmount: Float, $status: String) {
        createSalesOrder(orgId: $orgId, customerName: $customerName, totalAmount: $totalAmount, status: $status) {
          id
          orgId
          customerName
          totalAmount
          status
        }
      }
    `;

    const response = await graphQLRequest<{ createSalesOrder: any }>(MUTATION, {
      orgId,
      customerName,
      totalAmount,
      status,
    });
    return response.createSalesOrder;
  }

  static async updateSalesOrder(id: number, customerName?: string, totalAmount?: number, status?: string): Promise<any> {
    const MUTATION = gql`
      mutation UpdateSalesOrder($id: Int!, $customerName: String, $totalAmount: Float, $status: String) {
        updateSalesOrder(id: $id, customerName: $customerName, totalAmount: $totalAmount, status: $status) {
          id
          orgId
          customerName
          totalAmount
          status
        }
      }
    `;

    const response = await graphQLRequest<{ updateSalesOrder: any }>(MUTATION, {
      id,
      customerName,
      totalAmount,
      status,
    });
    return response.updateSalesOrder;
  }

  static async deleteSalesOrder(id: number): Promise<any> {
    const MUTATION = gql`
      mutation DeleteSalesOrder($id: Int!) {
        deleteSalesOrder(id: $id) {
          id
        }
      }
    `;

    const response = await graphQLRequest<{ deleteSalesOrder: any }>(MUTATION, { id });
    return response.deleteSalesOrder;
  }
}
