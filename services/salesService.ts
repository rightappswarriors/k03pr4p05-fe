import { gql } from 'graphql-request';
import { graphQLRequest } from './apiClient';
import { formatGraphQLError } from '@/utils/errorFormatter';
// example service
export class SalesService {
  static async getTransactionsByYear(year: string): Promise<any[]> {
    // Calculate start and end dates for the year
    const startDate = `${year}-01-01T00:00:00.000Z`;
    const endDate = `${year}-12-31T23:59:59.999Z`;

    const QUERY = gql`
      query GetTransactionsByOrgId($startDate: String, $endDate: String) {
        getTransactionsByOrgId(startDate: $startDate, endDate: $endDate) {
          id
          total
          subtotal
          vatAmount
          vatExemptSale
          customerType
          discountType
          discountRate
          discountAmount
          totalPax
          scPwdPax
          scPwdCustomer { id fullName idNumber idType customerType isRepresentative representativeName representativeIdNumber }
          paymentMethod
          status
          createdAt
          items {
            itemId
            quantity
            priceAtSale
            discountType
            discountRate
            discountAmount
            originalPrice
            vatExclusivePrice
            finalPrice
          }
        }
      }
    `;

    try {
      const response = await graphQLRequest<{ getTransactionsByOrgId: any[] }>(
        QUERY,
        { startDate, endDate }
      );
      if (__DEV__) console.log('Transactions by year response:', response);
      return response.getTransactionsByOrgId ?? [];
    } catch (error) {
      if (__DEV__) {
        if (__DEV__) {
          const message = formatGraphQLError(error);
          console.error('Failed to get transactions by yearError message:', message);
        }
      } return [];
    }
  }

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

  static async getTransactionsByOrgId(startDate?: string, endDate?: string, year?: string): Promise<any[]> {
    const QUERY = gql`
    query GetTransactionsByOrgId($startDate: String, $endDate: String) {
      getTransactionsByOrgId(startDate: $startDate, endDate: $endDate) {
        id
        outletId
        cashierId
        total
        subtotal
        vatAmount
        cashReceived
        change
        paymentMethod
        status
        createdAt
        items {
          itemId
          quantity
          priceAtSale
            discountType
            discountRate
            discountAmount
            originalPrice
            vatExclusivePrice
            finalPrice
          }
      }
    }
  `;
    try {
      const response = await graphQLRequest<{ getTransactionsByOrgId: any[] }>(QUERY, {
        startDate,
        endDate,
      });
      return response.getTransactionsByOrgId;
    } catch (error) {
      if (__DEV__) {
        const message = formatGraphQLError(error);
        console.error('Failed to get transactions query getTransactionsByOrgId:', message);
      } return [];
    }

  }
  static async createTransaction(data: {
    outletId: number;
    cashierId: number;
    total: number;
    subtotal: number;
    vatAmount: number;
    vatExemptSale?: number;
    paymentMethod: string;
    status: string;
    createdAt: string;
    itemsSold: Array<{ itemId: number; quantity: number; price: number; priceAtSale: number; unitId?: number; unitName?: string; discountType?: string; discountRate?: number; discountAmount?: number; originalPrice?: number; vatExclusivePrice?: number; finalPrice?: number }>;
    cashReceived?: number;
    change?: number;
    paymentType?: string;
    customerType?: string;
    scPwdCustomerInput?: any;
    discountType?: string;
    discountRate?: number;
    discountAmount?: number;
    totalPax?: number;
    scPwdPax?: number;
    isVatExempt?: boolean;
    vatExemptType?: string;
    vatExemptRefNo?: string;
    vatExemptAmount?: number;
    outletPromoId?: number;
    promoDiscountAmt?: number;
  }): Promise<any> {
    const MUTATION = gql`
      mutation CreateTransaction(
        $outletId: Int!
        $cashierId: Int!
        $total: Float!
        $subtotal: Float!
        $vatAmount: Float!
        $vatExemptSale: Float
        $paymentMethod: PaymentMethod!
        $status: Status!
        $createdAt: String!
        $itemsSold: [CartItemInput!]!
        $cashReceived: Float
        $change: Float
        $paymentType: String
        $discountType: DiscountType
        $discountAmount: Float
        $customerType: CustomerType
        $scPwdCustomerInput: ScPwdCustomerInput
        $discountRate: Float
        $totalPax: Int
        $scPwdPax: Int
        $isVatExempt: Boolean
        $vatExemptType: VatExemptType
        $vatExemptRefNo: String
        $vatExemptAmount: Float
        $outletPromoId: Int
        $promoDiscountAmt: Float
      ) {
        createTransaction(
          outletId: $outletId
          cashierId: $cashierId
          total: $total
          subtotal: $subtotal
          vatAmount: $vatAmount
          vatExemptSale: $vatExemptSale
          paymentMethod: $paymentMethod
          status: $status
          createdAt: $createdAt
          itemsSold: $itemsSold
          cashReceived: $cashReceived
          change: $change
          paymentType: $paymentType
          discountType: $discountType
          discountAmount: $discountAmount
          customerType: $customerType
          scPwdCustomerInput: $scPwdCustomerInput
          discountRate: $discountRate
          totalPax: $totalPax
          scPwdPax: $scPwdPax
          isVatExempt: $isVatExempt
          vatExemptType: $vatExemptType
          vatExemptRefNo: $vatExemptRefNo
          vatExemptAmount: $vatExemptAmount
          outletPromoId: $outletPromoId
          promoDiscountAmt: $promoDiscountAmt
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
        vatExemptSale: data.vatExemptSale,
        paymentMethod: data.paymentMethod,
        status: data.status,
        createdAt: data.createdAt,
        itemsSold: data.itemsSold,
        discountType: data.discountType,
        customerType: data.customerType,
        scPwdCustomerInput: data.scPwdCustomerInput,
        discountRate: data.discountRate,
        totalPax: data.totalPax,
        scPwdPax: data.scPwdPax,
        discountAmount: data.discountAmount,
        isVatExempt: data.isVatExempt,
        vatExemptType: data.vatExemptType,
        vatExemptRefNo: data.vatExemptRefNo,
        vatExemptAmount: data.vatExemptAmount,
        outletPromoId: data.outletPromoId,
        promoDiscountAmt: data.promoDiscountAmt,

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
  static async getBirDiscountLogbook(startDate?: string, endDate?: string): Promise<any[]> {
    const QUERY = gql`
      query BirDiscountLogbook($startDate: String, $endDate: String) {
        birDiscountLogbook(startDate: $startDate, endDate: $endDate) {
          date
          orNumber
          fullName
          idNumber
          itemsPurchased
          totalBeforeDiscount
          discountAmount
          netAmountPaid
          discountType
        }
      }
    `;
    const response = await graphQLRequest<{ birDiscountLogbook: any[] }>(QUERY, { startDate, endDate });
    return response.birDiscountLogbook ?? [];
  }

  static async getTransactionsByDiscountType(discountType: string): Promise<any[]> {
    const QUERY = gql`
      query TransactionsByDiscountType($discountType: DiscountType!) {
        transactionsByDiscountType(discountType: $discountType) {
          id total subtotal vatAmount vatExemptSale customerType discountType discountRate discountAmount createdAt
          scPwdCustomer { id fullName idNumber idType customerType }
          items { itemId quantity priceAtSale discountType discountRate discountAmount originalPrice vatExclusivePrice finalPrice }
        }
      }
    `;
    const response = await graphQLRequest<{ transactionsByDiscountType: any[] }>(QUERY, { discountType });
    return response.transactionsByDiscountType ?? [];
  }
}



