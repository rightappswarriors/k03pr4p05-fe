import { gql } from 'graphql-request';
import { graphQLRequest } from './apiClient';

export class SalesService {
  static async getTransactions(outletId: number, startDate?: string, endDate?: string): Promise<any[]> {
    const QUERY = gql`
      query GetTransactionsByStoreId($outletId: Int!, $startDate: String, $endDate: String) {
        getTransactionsByStoreId(outletId: $outletId, startDate: $startDate, endDate: $endDate) {
          id
          outletId
          cashierId
          total
          subtotal
          vatAmount
          cashReceived
          change
          paymentMethod
          paymentType
          status
          createdAt
          itemsSold {
            itemId
            quantity
            price
          }
        }
      }
    `;

    const response = await graphQLRequest<{ getTransactionsByStoreId: any[] }>(QUERY, {
      outletId,
      startDate,
      endDate,
    });
    return response.getTransactionsByStoreId;
  }

  static async createTransaction(data: {
    outletId: number;
    cashierId: number;
    total: number;
    subtotal: number;
    vatAmount: number;
    paymentMethod: string;
    status: string;
    createdAt: string;
    itemsSold: Array<{ itemId: number; quantity: number; price: number }>;
    cashReceived?: number;
    change?: number;
    paymentType?: string;
  }): Promise<any> {
    const MUTATION = gql`
      mutation CreateTransaction(
        $outletId: Int!
        $cashierId: Int!
        $total: Float!
        $subtotal: Float!
        $vatAmount: Float!
        $paymentMethod: PaymentMethod!
        $status: Status!
        $createdAt: String!
        $itemsSold: [CartItemInput!]!
        $cashReceived: Float
        $change: Float
        $paymentType: String
      ) {
        createTransaction(
          outletId: $outletId
          cashierId: $cashierId
          total: $total
          subtotal: $subtotal
          vatAmount: $vatAmount
          paymentMethod: $paymentMethod
          status: $status
          createdAt: $createdAt
          itemsSold: $itemsSold
          cashReceived: $cashReceived
          change: $change
          paymentType: $paymentType
        ) {
          id
          outletId
          cashierId
          total
          status
          createdAt
        }
      }
    `;

    const response = await graphQLRequest<{ createTransaction: any }>(
      MUTATION,
      {
        outletId: data.outletId,
        cashierId: data.cashierId,
        total: data.total,
        subtotal: data.subtotal,
        vatAmount: data.vatAmount,
        paymentMethod: data.paymentMethod,
        status: data.status,
        createdAt: data.createdAt,
        itemsSold: data.itemsSold,
        cashReceived: data.cashReceived,
        change: data.change,
        paymentType: data.paymentType,
      }
    );
    return response.createTransaction;
  }

  static async getSalesAnalytics(outletId: number, startDate?: string, endDate?: string): Promise<any> {
    const transactions = await this.getTransactions(outletId, startDate, endDate);
    const totalSales = transactions.reduce((sum, tx) => sum + Number(tx.total || 0), 0);
    const totalCount = transactions.length;
    return {
      outletId,
      totalSales,
      totalCount,
      startDate,
      endDate,
    };
  }

  static async initiatePayment(data: {
    outletId: number;
    total: number;
    paymentMethod: string;
    paymentType: string;
    customerDetails?: any;
  }): Promise<any> {
    const MUTATION = gql`
      mutation InitiatePayment($outletId: Int!, $total: Float!, $paymentMethod: PaymentMethod!, $paymentType: PaymentTypeEnum!, $customerDetails: CustomerDetailsInput) {
        initiatePayment(outletId: $outletId, total: $total, paymentMethod: $paymentMethod, paymentType: $paymentType, customerDetails: $customerDetails) {
          url
          return_url
          public_key
          paymentIntentId
          client_key
          paymentMethodId
        }
      }
    `;

    const response = await graphQLRequest<{ initiatePayment: any }>(MUTATION, {
      outletId: data.outletId,
      total: data.total,
      paymentMethod: data.paymentMethod,
      paymentType: data.paymentType,
      customerDetails: data.customerDetails,
    });

    return response.initiatePayment;
  }

  static async finalizeTransaction(data: {
    outletId: number;
    total: number;
    subtotal: number;
    vatAmount: number;
    paymentMethod: string;
    customerDetails?: any;
    itemsSold: Array<{ itemId: number; quantity: number; price: number }>;
  }): Promise<any> {
    const MUTATION = gql`
      mutation FinalizeTransaction(
        $outletId: Int!
        $total: Float!
        $subtotal: Float!
        $vatAmount: Float!
        $paymentMethod: PaymentMethod!
        $customerDetails: CustomerDetailsInput
        $itemsSold: [CartItemInput!]!
      ) {
        finalizeTransaction(
          outletId: $outletId
          total: $total
          subtotal: $subtotal
          vatAmount: $vatAmount
          paymentMethod: $paymentMethod
          customerDetails: $customerDetails
          itemsSold: $itemsSold
        ) {
          id
          outletId
          total
          status
          createdAt
        }
      }
    `;

    const response = await graphQLRequest<{ finalizeTransaction: any }>(MUTATION, {
      outletId: data.outletId,
      total: data.total,
      subtotal: data.subtotal,
      vatAmount: data.vatAmount,
      paymentMethod: data.paymentMethod,
      customerDetails: data.customerDetails,
      itemsSold: data.itemsSold,
    });
    return response.finalizeTransaction;
  }
}
