import { gql } from 'graphql-request';
import { graphQLRequest } from './apiClient';
import { formatGraphQLError } from '@/utils/errorFormatter';

export class FinanceService {
  static async getAccountTitles(): Promise<any[]> {
    const QUERY = gql`
    query {
      getAllAccountTitles {
        id
        label
      }
    }
  `;
    const response = await graphQLRequest<{ getAllAccountTitles: any[] }>(QUERY, {});
    return response.getAllAccountTitles;
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
        main
        group
        code
        centerId
        subCenterId
        accountTitleId
        description
        debit
        credit
        total
        orgId
        userId
        createdAt
        accountTitle {
          id
          label
          code
        }
        center {
          id
          label
        }
        subCenter {
          id
          label
        }
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
    debit?: number;
    credit?: number;
    centerId: number;
    subCenterId: number;
    accountTitleId: number;
  }): Promise<any> {
    const MUTATION = gql`
      mutation CreateGISRow(
        $main: String
        $group: String
        $code: String
        $description: String
        $debit: Float
        $credit: Float
        $centerId: Int!
        $subCenterId: Int!
        $accountTitleId: Int!
      ) {
        createGISRow(
          main: $main
          group: $group
          code: $code
          description: $description
          debit: $debit
          credit: $credit
          centerId: $centerId
          subCenterId: $subCenterId
          accountTitleId: $accountTitleId
        ) {
          id
          main
          group
          code
          centerId
          subCenterId
          accountTitleId
          description
          debit
          credit
          total
          createdAt
          accountTitle {
            id
            label
            code
          }
          center {
            id
            label
          }
          subCenter {
            id
            label
          }
        }
      }
    `;
    const response = await graphQLRequest<{ createGISRow: any }>(MUTATION, row);
    return response.createGISRow;
  }

  static async updateGISRow(
    id: number,
    accountTitleId?: number,
    centerId?: number,
    subCenterId?: number,
    debit?: number,
    credit?: number,
    description?: string,
    main?: string,
    group?: string,
    code?: string,
  ): Promise<any> {
    const MUTATION = gql`
      mutation UpdateGISRow(
        $id: Int!
        $accountTitleId: Int
        $centerId: Int
        $subCenterId: Int
        $debit: Float
        $credit: Float
        $description: String
        $main: String
        $group: String
        $code: String
      ) {
        updateGISRow(
          id: $id
          accountTitleId: $accountTitleId
          centerId: $centerId
          subCenterId: $subCenterId
          debit: $debit
          credit: $credit
          description: $description
          main: $main
          group: $group
          code: $code
        ) {
          id
          main
          group
          code
          centerId
          subCenterId
          accountTitleId
          description
          debit
          credit
          total
          accountTitle {
            id
            label
            code
          }
          center {
            id
            label
          }
          subCenter {
            id
            label
          }
        }
      }
    `;

    const response = await graphQLRequest<{ updateGISRow: any }>(MUTATION, {
      id,
      accountTitleId,
      centerId,
      subCenterId,
      debit,
      credit,
      description,
      main,
      group,
      code,
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
    await graphQLRequest<{ deleteGISRow: any }>(MUTATION, { id });
  }

  static async getSummaryRowFinance(startDate: string, endDate: string): Promise<any[]> {
    const QUERY = gql`
    query SummaryRowExpenses($startDate: String, $endDate: String) {
      summaryRowExpenses(startDate: $startDate, endDate: $endDate) {
        id
        status
        netProfit
        createdAt
      }
    }
    `
    try {
      const response = await graphQLRequest<{ summaryRowExpenses: any[] }>(QUERY, { startDate, endDate });
      return response.summaryRowExpenses ?? [];
    
    } catch (error) {
      const errorMessge = formatGraphQLError(error)
      console.error("Error fetching summary row expenses:", errorMessge);
      return Promise.resolve([]);
    }
  }
  
  static async getSummaryRows(startDate?: string, endDate?: string): Promise<any[]> {
    const QUERY = gql`
    query SummaryRows($startDate: String, $endDate: String) {
      summaryRows(startDate: $startDate, endDate: $endDate) {
        id
        itemCode
        description
        opExPct
        computedCost
        costContribution
        sellingPrice
        centerId
        subCenterId
        accountTitleId
        status
        itemName
        costLines
        netProfit
        itemId
        orgId
        opExAmount
        createdAt
        item {
          id
          name
        }
        accountTitle {
          id
          label
          code
        }
        center {
          id
          label
        }
        subCenter {
          id
          label
        }
      }
    }
  `;
    const response = await graphQLRequest<{ summaryRows: any[] }>(QUERY, { startDate, endDate });
    return response.summaryRows ?? [];
  }

  static async createSummaryRow(
    orgId?: number,
    accountTitleId?: number,
    vatTypeId?: number,
    centerId?: number,
    subCenterId?: number,
    itemId?: number,
    itemName?: string,
    costLines?: any[],
    costInputAmount?: number,
    costInputVatInclusive?: boolean,
    sellingPriceInput?: number,
    sellingPriceVatInclusive?: boolean,
    opExPct?: number,
    description?: string,
    itemCode?: string,
  ): Promise<any> {
    const MUTATION = gql`
    mutation CreateSummaryRow(
      $orgId: Int!
      $accountTitleId: Int!
      $vatTypeId: Int!
      $centerId: Int!
      $subCenterId: Int!
      $itemId: Int
      $itemName: String
      $costLines: Json
      $costInputAmount: Float
      $costInputVatInclusive: Boolean!
      $sellingPriceInput: Float
      $sellingPriceVatInclusive: Boolean!
      $opExPct: Float!
      $description: String
      $itemCode: String
    ) {
      createSummaryRow(
        orgId: $orgId
        accountTitleId: $accountTitleId
        vatTypeId: $vatTypeId
        centerId: $centerId
        subCenterId: $subCenterId
        itemId: $itemId
        itemName: $itemName
        costLines: $costLines
        costInputAmount: $costInputAmount
        costInputVatInclusive: $costInputVatInclusive
        sellingPriceInput: $sellingPriceInput
        sellingPriceVatInclusive: $sellingPriceVatInclusive
        opExPct: $opExPct
        description: $description
        itemCode: $itemCode
      ) {
        id
        itemCode
        itemName
        description
        baseCost
        costLines
        vatInput
        sellingPrice
        vatOutput
        opExPct
        opExAmount
        grossProfit
        netProfit
        status
        amount
        computedCost
        costContribution
        centerId
        subCenterId
        accountTitleId
        orgId
        createdAt
        item { id name }
        accountTitle { id label code }
        center { id label }
        subCenter { id label }
      }
    }
  `;

    const response = await graphQLRequest<{ createSummaryRow: any }>(MUTATION, {
      orgId,
      accountTitleId,
      vatTypeId,
      centerId,
      subCenterId,
      itemId,
      itemName,
      costLines,
      costInputAmount,
      costInputVatInclusive,
      sellingPriceInput,
      sellingPriceVatInclusive,
      opExPct,
      description,
      itemCode,
    });
    return response.createSummaryRow;
  }
  
  static async updateSummaryRow(
    id: number,
    accountTitleId?: number,
    centerId?: number,
    subCenterId?: number,
    itemId?: number,
    itemName?: string,
    costLines?: any[],
  ): Promise<any> {
    const MUTATION = gql`
      mutation UpdateSummaryRow(
        $id: Int!
        $accountTitleId: Int
        $centerId: Int
        $subCenterId: Int
        $itemId: Int
        $itemName: String
        $costLines: Json
      ) {
        updateSummaryRow(
          id: $id
          accountTitleId: $accountTitleId
          centerId: $centerId
          subCenterId: $subCenterId
          itemId: $itemId
          itemName: $itemName
          costLines: $costLines
        ) {
          id
          itemCode
          description
          opExPct
          opExAmount
          computedCost
          costLines
          costContribution
          sellingPrice
          centerId
          subCenterId
          accountTitleId
          status
          itemName
          itemId
          orgId
          createdAt
          item {
            id
            name
          }
          costLines
          accountTitle {
            id
            label
            code
          }
          center {
            id
            label
          }
          subCenter {
            id
            label
          }
        }
      }
    `;

    const response = await graphQLRequest<{ updateSummaryRow: any }>(MUTATION, {
      id,
      accountTitleId,
      centerId,
      subCenterId,
      itemId,
      itemName,
      costLines,
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