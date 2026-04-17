import { gql } from 'graphql-request';
import { graphQLRequest } from './apiClient';

export class FinanceService {
  // ✅ Fix — remove the empty parens
  static async getAccountTitles(): Promise<any[]> {
    const QUERY = gql`
    query {
      getAll {
        id
        label
      }
    }
  `;
    const response = await graphQLRequest<{ getAll: any[] }>(QUERY, {});
    return response.getAll;
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


  static async getGISRows(startDate?: string, endDate?: string): Promise<any[]> {
    const QUERY = gql`
    query GISRows($startDate: String, $endDate: String) {
      gisRows(startDate: $startDate, endDate: $endDate) {
        id
        orgId
        accountTitleId
        amount
        description
      }
    }
  `;
    const response = await graphQLRequest<{ gisRows: any[] }>(QUERY, { startDate, endDate });
    return response.gisRows ?? [];
  }


  static async createGISRow(row: {
    main: string;
    group: string;
    code: string;
    description: string;
    debit: number;
    credit: number;
    total: number;
  }): Promise<any> {
    const MUTATION = gql`
      mutation CreateGISRow(
        $main: String!
        $group: String!
        $code: String!
        $description: String!
        $debit: Float!
        $credit: Float!
        $total: Float!
      ) {
        createGISRow(
          main: $main
          group: $group
          code: $code
          description: $description
          debit: $debit
          credit: $credit
          total: $total
        ) {
          id
          main
          group
          code
          description
          debit
          credit
          total
        }
      }
    `;
    const response = await graphQLRequest<{ createGISRow: any }>(MUTATION, row);
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

  static async deleteGISRow(id: string): Promise<any> {
    const MUTATION = gql`
      mutation DeleteGISRow($id: String!) {
        deleteGISRow(id: $id) {
          id
        }
      }
    `;
    await graphQLRequest<{ deleteGISRow: any }>(MUTATION, { id });
  }

  static async getSummaryRows(startDate?: string, endDate?: string): Promise<any[]> {
    const QUERY = gql`
    query SummaryRows($startDate: String, $endDate: String) {
      summaryRows(startDate: $startDate, endDate: $endDate) {
        id
        orgId
        accountTitleId
        amount
        description
        itemId
        itemName
      }
    }
  `;
    const response = await graphQLRequest<{ summaryRows: any[] }>(QUERY, { startDate, endDate });
    return response.summaryRows ?? [];
  }

  /**
   * Create a Summary Row (Item Net Summary entry).
   * @param orgId       Organisation ID
   * @param accountTitleId  Optional account title reference
   * @param amount      Entry amount
   * @param description Optional free-text description
   * @param itemId      Optional: catalog item ID (from CatalogSearchModal)
   * @param itemName    Optional: item name — either resolved from catalog or entered manually
   */
  static async createSummaryRow(

    accountTitleId?: number,
    amount?: number,
    description?: string,
    itemId?: number,
    itemName?: string,
  ): Promise<any> {
    const MUTATION = gql`
      mutation CreateSummaryRow(
        $orgId: Int
        $accountTitleId: Int
        $amount: Float
        $description: String
        $itemId: Int
        $itemName: String
      ) {
        createSummaryRow(
          orgId: $orgId
          accountTitleId: $accountTitleId
          amount: $amount
          description: $description
          itemId: $itemId
          itemName: $itemName
        ) {
          id
          orgId
          accountTitleId
          amount
          description
          itemId
          itemName
        }
      }
    `;

    const response = await graphQLRequest<{ createSummaryRow: any }>(MUTATION, {
      accountTitleId,
      amount,
      description,
      itemId,
      itemName,
    });
    return response.createSummaryRow;
  }

  static async updateSummaryRow(
    id: number,
    accountTitleId: number,
    amount: number,
    description: string,
    itemId?: number,
    itemName?: string,
  ): Promise<any> {
    const MUTATION = gql`
      mutation UpdateSummaryRow(
        $id: Int!
        $accountTitleId: Int
        $amount: Float
        $description: String
        $itemId: Int
        $itemName: String
      ) {
        updateSummaryRow(
          id: $id
          accountTitleId: $accountTitleId
          amount: $amount
          description: $description
          itemId: $itemId
          itemName: $itemName
        ) {
          id
          orgId
          amount
          description
          itemId
          itemName
        }
      }
    `;

    const response = await graphQLRequest<{ updateSummaryRow: any }>(MUTATION, {
      id,
      accountTitleId,
      amount,
      description,
      itemId,
      itemName,
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