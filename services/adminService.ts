import { Branch, Outlet, Cashier, Transaction, BranchRevenue, OutletRevenue, AdminOutlet, AdminTransaction } from '@/types';

import { getGraphQLClient } from '@/utils/constants';
import { gql } from 'graphql-request';
import { AuthService } from './authService';



const MOCK_TRANSACTIONS: AdminTransaction[] = [
  // Branch 001 transactions
  {
    id: '1',
    branchId: '1',
    outletId: '1',
    cashierId: '1',
    items: [
      { id: '1', name: 'Coffee', price: 4.50, quantity: 2, category: 'Beverages' },
      { id: '2', name: 'Sandwich', price: 8.99, quantity: 1, category: 'Food' }
    ],
    subtotal: 17.99,
    tax: 1.44,
    total: 19.43,
    paymentMethod: 'card',
    status: 'completed',
    createdAt: '2024-12-19T10:30:00Z',
    completedAt: '2024-12-19T10:31:00Z'
  },
  {
    id: '2',
    branchId: '1',
    outletId: '2',
    cashierId: '3',
    items: [
      { id: '3', name: 'Soda', price: 2.99, quantity: 3, category: 'Beverages' }
    ],
    subtotal: 8.97,
    tax: 0.72,
    total: 9.69,
    paymentMethod: 'cash',
    status: 'completed',
    createdAt: '2024-12-19T11:15:00Z',
    completedAt: '2024-12-19T11:16:00Z'
  },
  // Branch 002 transactions
  {
    id: '3',
    branchId: '2',
    outletId: '4',
    cashierId: '5',
    items: [
      { id: '4', name: 'Pizza Slice', price: 6.50, quantity: 2, category: 'Food' },
      { id: '5', name: 'Drink', price: 3.25, quantity: 2, category: 'Beverages' }
    ],
    subtotal: 19.50,
    tax: 1.56,
    total: 21.06,
    paymentMethod: 'card',
    status: 'completed',
    createdAt: '2024-12-19T12:00:00Z',
    completedAt: '2024-12-19T12:01:00Z'
  },
  // Branch 003 transactions
  {
    id: '4',
    branchId: '3',
    outletId: '6',
    cashierId: '7',
    items: [
      { id: '6', name: 'Travel Mug', price: 15.99, quantity: 1, category: 'Merchandise' },
      { id: '7', name: 'Coffee', price: 5.50, quantity: 1, category: 'Beverages' }
    ],
    subtotal: 21.49,
    tax: 1.72,
    total: 23.21,
    paymentMethod: 'card',
    status: 'completed',
    createdAt: '2024-12-19T13:45:00Z',
    completedAt: '2024-12-19T13:46:00Z'
  }
];

export class AdminService {

  static async getBranches(): Promise<Branch[]> {
    // Simulate API delay
    const GET_OWNEDBRANCHES = gql`
    query GetOwnedBranches {
      getOwnedBranches {
        id
        name
        address
        createdAt
        isActive
        owner {
          id
          fullname
        }
        outlets {
          id
        }
      }
    }
    `
    let branches: Branch[]
    try {
      const { accessToken } = await AuthService.getTokens()
      const client = await getGraphQLClient()
      const res = (await client.request(GET_OWNEDBRANCHES, {}, {
        Authorization: `Bearer ${accessToken}`
      })) as any
      console.log("Success getting branches:\n", res.getOwnedBranches)
      branches = res.getOwnedBranches.map((b: any) => {
        return {
          id: b.id,
          name: b.name,
          address: b.address,
          outletIds: b.outlets.map((o: any) => {
            return o.id
          }) ?? [],
          isActive: b.isActive,
          createdAt: b.createdAt
        }
      }) ?? []
      return branches
    } catch (error) {
      console.error("Failed to get branches:", error)
      return []
    }

  }

  static async getBranchRevenue(branchId: string, startDate: Date, endDate: Date): Promise<BranchRevenue> {
    const GET_BRANCHREVENUE = gql`
    query GetBranchTransactions($getBranchTransactionsId: ID!, $startDate: DateTime, $endDate: DateTime) {
      getBranchTransactions(id: $getBranchTransactionsId, startDate: $startDate, endDate: $endDate) {
        id
        total
        createdAt
        status
      }
    }
  `
    try {
      const { accessToken } = await AuthService.getTokens()
      const client = await getGraphQLClient()
      const res = (await client.request(GET_BRANCHREVENUE, {
        getBranchTransactionsId: branchId,
        startDate,   // ✅ Date object — your DateTime scalar handles serialization
        endDate
      }, {
        Authorization: `Bearer ${accessToken}`
      })) as any

      const transactions = res.getBranchTransactions
      const totalRevenue = transactions.reduce((sum: number, txn: any) => sum + txn.total, 0)

      return {
        branchId,
        totalRevenue,
        transactionCount: transactions.length,
        dateRange: {
          start: startDate.toISOString(),   // ✅ convert to string only for the return type
          end: endDate.toISOString()
        }
      }
    } catch (error) {
      console.error("Failed to get branch Revenue:", error)
      // ✅ return empty result on failure instead of falling through to mock data
      return {
        branchId,
        totalRevenue: 0,
        transactionCount: 0,
        dateRange: { start: startDate.toISOString(), end: endDate.toISOString() }
      }
    }
  }
  static async getOutletsByBranch(branchId: string): Promise<AdminOutlet[]> {
    const GET_BRANCHOUTLETS = gql`
      query GetOutletsByBranch($branchId: ID!) {
        getOutletsByBranch(branchId: $branchId) {
          id
          name
          outletType
          address 
          branchId
          createdAt
          status
          staff {
            id
            isPresent
          }
        }
      }
  `
    try {
      const { accessToken } = await AuthService.getTokens()
      const client = await getGraphQLClient()
      const res = (await client.request(GET_BRANCHOUTLETS, { branchId }, {
        Authorization: `Bearer ${accessToken}`
      })) as any
      console.log("Success getting outlets:\n", res.getOutletsByBranch)
      return res.getOutletsByBranch.map((o: any) => {
        return {
          id: o.id,
          name: o.name,
          status: o.status === null ? "open" : o.status,
          outletType: o.outletType,
          address: o.address,
          createdAt: o.createdAt,
          assignedCashierIds: o.staff.map((s: any) => s.id) ?? [],
          currentCashiers: o.staff.filter((s: any) => s.isPresent === true).map((s: any) => {
            return {
              id: s.id,
              isPresent: s.isPresent
            }
          })
        }
      }) as AdminOutlet[] ?? []
    } catch (error) {
      console.error("Failed to get outlets:", error)
      return []
    }
  }

  static async getOutletRevenue(outletId: string, startDate: Date, endDate: Date): Promise<OutletRevenue> {
    const GET_OUTLETREVENUE = gql`
    query GetOutletTransactions($outletId: ID!, $startDate: DateTime, $endDate: DateTime) {
      getOutletTransactions(outletId: $outletId, startDate: $startDate, endDate: $endDate) {
        id
        total
        status
        createdAt
      }
    }
  `
    try {
      const { accessToken } = await AuthService.getTokens()
      const client = await getGraphQLClient()
      const res = (await client.request(GET_OUTLETREVENUE, {
        outletId,
        startDate,  // ✅ pass Date objects — DateTime scalar handles it
        endDate
      }, {
        Authorization: `Bearer ${accessToken}`
      })) as any

      const transactions = res.getOutletTransactions

      // ✅ compute total from real data
      const totalRevenue = transactions.reduce(
        (sum: number, txn: any) => sum + txn.total, 0
      )
      console.log("Success getting outlet Revenue:", totalRevenue)
      return {
        outletId,
        totalRevenue,
        transactionCount: transactions.length,
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        }
      }
    } catch (error) {
      console.error("Failed to get outlet Revenue:", error)
      return {
        outletId,
        totalRevenue: 0,
        transactionCount: 0,
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        }
      }
    }
  }

  static async getCashiersByOutlet(outletId: string): Promise<Cashier[]> {
    const GET_OUTLETCASHIERS = gql`
   query GetOutletsByBranch($outletId: ID!) {
    getStaffByOutletId(outletId: $outletId) {
      user {
        id
        fullname
        username
        email
      }
      id
      outletId
      isPresent
    }
  }`
    try {
      const { accessToken } = await AuthService.getTokens()
      const client = await getGraphQLClient()
      const res = (await client.request(GET_OUTLETCASHIERS, { outletId }, {
        Authorization: `Bearer ${accessToken}`
      })) as any
      console.log("Success getting outlet cashiers:\n", res.getStaffByOutletId)
      const staffs = res.getStaffByOutletId
      return staffs.map((s: any) => {
        return {
          id: s.user.id,
          fullname: s.user.fullname,
          email: s.user.email,
          outletId: s.outletId,
          isActive: s.isActive
        }
      })
    } catch (error) {
      //console.error("Failed to get outlet cashiers:", error)
      return []
    }
  }

  static async getCurrentCashiers(outletId: string): Promise<Cashier[] | []> {
    await new Promise(resolve => setTimeout(resolve, 200));

    const GET_CURRENTCASHIER_QUERY = `
  query GetPresentStaffs($outletId: ID!) {
    getPresentStaffs(outletId: $outletId) {
      user { id fullname role email }
      outletId
      id
      isPresent
    }
  }`;

    try {
      const { accessToken } = await AuthService.getTokens();
      const client = await getGraphQLClient();
      const res = await client.request(GET_CURRENTCASHIER_QUERY, { outletId }, {
        Authorization: `Bearer ${accessToken}`
      }) as any;

      const presentStaffs: Cashier[] = res.getPresentStaffs.map((ps: any) => ({
        id: ps.user.id,
        fullname: ps.user.fullname,
        email: ps.user.email,
        isActive: ps.isPresent,
        outletId: ps.outletId
      }));

      return presentStaffs;

    } catch (error) {
      console.error("Failed to get outlet cashiers:", error);
      return [];
    }
  }

  static async getRecentTransactions(outletId: string, limit: number = 20): Promise<AdminTransaction[]> {


    return MOCK_TRANSACTIONS
      .filter(txn => txn.outletId === outletId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  static async getBranchById(branchId: string): Promise<Branch | null> {
    const GETBRANCH_ID = `
    query GetBranchById($getBranchByIdId: ID!) {
      getBranchById(id: $getBranchByIdId) {
        id
        name
        address
        createdAt
        isActive
        outlets {
          id
        }
        owner {
          id
        }
      }
    }`
    try {
      const { accessToken } = await AuthService.getTokens()
      const client = await getGraphQLClient()
      const res = (await client.request(GETBRANCH_ID, { getBranchByIdId: branchId }, {
        Authorization: `Bearer ${accessToken}`
      })) as any
      console.log("Success getting branch by id:\n", res.getBranchById)
      const branch = res.getBranchById
      return {
        id: branch.id,
        name: branch.name,
        address: branch.address,
        location: branch.location ?? undefined,
        isActive: branch.isActive,
        outletIds: branch.outlets.map((o: any) => o.id) ?? [],
        createdAt: branch.createdAt
      }
    } catch (error) {
      console.error("Failed to get branch by id:", error)
      return null
    }
  }

  static async getOutletById(outletId: string): Promise<AdminOutlet | null> {
    const GETOUTLET_ID = `
    query GetOutletsByBranch($branchId: ID!) {
      getOutletsByBranch(branchId: $branchId) {
        id
        name
        outletType
        address 
        branchId
        createdAt
        status
        staff {
          id
          isPresent
        }
      }
    }`
    try {
      const { accessToken } = await AuthService.getTokens()
      const client = await getGraphQLClient()
      const res = (await client.request(GETOUTLET_ID, { getOutletByIdId: outletId }, {
        Authorization: `Bearer ${accessToken}`
      })) as any
      console.log("Success getting outlet by id:\n", res.getOutletById)
      const o = res.getOutletById
      return {
        id: o.id,
        name: o.name,
        status: o.status === null ? "open" : o.status,
        outletType: o.outletType,
        branchId: o.branchId,
        address: o.address,
        phone:o.phone,
        createdAt: o.createdAt,
        assignedCashierIds: o.staff.map((s: any) => s.id) ?? [],
        currentCashiers: o.staffs.filter((s: any) => s.isPresent === true).map((s: any) => {
          return {
            id: s.id,
            isPresent: s.isPresent
          }
        })
      }
    } catch (error) {
      console.error("Failed to get outlet by id:", error)
      return null
    }
  }

  static async createBranch(data: { name: string; address: string; phone?: string }): Promise<Branch> {
    const CREATE_BRANCH_MUTATION = gql`
      mutation CreateBranch($name: String!, $address: String!, $phone: String) {
        createBranch(name: $name, address: $address, phone: $phone) {
          id
          name
          address
          phone
          createdAt
          isActive
          owner {
            id
            fullname
          }
          outlets {
            id
          }
        }
      }
    `;

    try {
      const { accessToken } = await AuthService.getTokens();
      const client = await getGraphQLClient();
      const res = await client.request(CREATE_BRANCH_MUTATION, data, {
        Authorization: `Bearer ${accessToken}`
      }) as any;

      console.log("Success creating branch:", res.createBranch);
      const branch = res.createBranch;
      return {
        id: branch.id,
        name: branch.name,
        address: branch.address,
        phone: branch.phone,
        outletIds: branch.outlets.map((o: any) => o.id) ?? [],
        isActive: branch.isActive,
        createdAt: branch.createdAt
      };
    } catch (error) {
      console.error("Failed to create branch:", error);
      throw error;
    }
  }

  static async createOutlet(branchId: string, data: {
    name: string;
    address: string;
    phone: string;
    outletType: string;
    status: string;
    code: string;
    governmentTax: number;
    serviceCharge: number;
    latitude?: number;
    longitude?: number;
    bannerImage?: string;
  }): Promise<AdminOutlet> {
    const CREATE_OUTLET_MUTATION = gql`
      mutation CreateOutlet(
        $branchId: ID!
        $name: String!
        $address: String!
        $phone: String!
        $outletType: OutletType!
        $status: OutletStatus!
        $code: String!
        $governmentTax: Float!
        $serviceCharge: Float!
        $latitude: Float
        $longitude: Float
        $bannerImage: String
      ) {
        createOutlet(
          branchId: $branchId
          name: $name
          address: $address
          phone: $phone
          outletType: $outletType
          status: $status
          code: $code
          governmentTax: $governmentTax
          serviceCharge: $serviceCharge
          latitude: $latitude
          longitude: $longitude
          bannerImage: $bannerImage
        ) {
          id
          name
          address
          phone
          outletType
          status
          code
          governmentTax
          serviceCharge
          latitude
          longitude
          bannerImage
          branchId
          createdAt
          staff {
            id
            isPresent
          }
        }
      }
    `;

    try {
      const { accessToken } = await AuthService.getTokens();
      const client = await getGraphQLClient();
      const res = await client.request(CREATE_OUTLET_MUTATION, { branchId, ...data }, {
        Authorization: `Bearer ${accessToken}`
      }) as any;

      console.log("Success creating outlet:", res.createOutlet);
      const outlet = res.createOutlet;
      return {
        id: outlet.id,
        name: outlet.name,
        address: outlet.address,
        phone: outlet.phone,
        outletType: outlet.outletType,
        status: outlet.status,
        code: outlet.code,
        governmentTax: outlet.governmentTax,
        serviceCharge: outlet.serviceCharge,
        latitude: outlet.latitude,
        longitude: outlet.longitude,
        bannerImage: outlet.bannerImage,
        branchId: outlet.branchId,
        createdAt: outlet.createdAt,
        assignedCashierIds: outlet.staff.map((s: any) => s.id) ?? [],
        currentCashiers: outlet.staff.filter((s: any) => s.isPresent === true).map((s: any) => ({
          id: s.id,
          isPresent: s.isPresent
        })) ?? []
      };
    } catch (error) {
      console.error("Failed to create outlet:", error);
      throw error;
    }
  }

  static async assignItemsToOutlet(outletId: string, itemIds: string[]): Promise<void> {
    const ASSIGN_ITEMS_MUTATION = gql`
      mutation AssignItemsToOutlet($outletId: ID!, $itemIds: [ID!]!) {
        assignItemsToOutlet(outletId: $outletId, itemIds: $itemIds) {
          success
        }
      }
    `;

    try {
      const { accessToken } = await AuthService.getTokens();
      const client = await getGraphQLClient();
      await client.request(ASSIGN_ITEMS_MUTATION, { outletId, itemIds }, {
        Authorization: `Bearer ${accessToken}`
      });
      console.log("Success assigning items to outlet");
    } catch (error) {
      console.error("Failed to assign items to outlet:", error);
      throw error;
    }
  }

  static async assignStaffToOutlet(outletId: string, userIds: string[]): Promise<void> {
    const ASSIGN_STAFF_MUTATION = gql`
      mutation AssignStaffToOutlet($outletId: ID!, $userIds: [ID!]!) {
        assignStaffToOutlet(outletId: $outletId, userIds: $userIds) {
          success
        }
      }
    `;

    try {
      const { accessToken } = await AuthService.getTokens();
      const client = await getGraphQLClient();
      await client.request(ASSIGN_STAFF_MUTATION, { outletId, userIds }, {
        Authorization: `Bearer ${accessToken}`
      });
      console.log("Success assigning staff to outlet");
    } catch (error) {
      console.error("Failed to assign staff to outlet:", error);
      throw error;
    }
  }

  static async getItemsByOutlet(outletId: string): Promise<any[]> {
    const GET_OUTLET_ITEMS = gql`
      query GetItemsByOutlet($outletId: ID!) {
        getItemsByOutlet(outletId: $outletId) {
          id
          name
          barcode
          categoryId
          price
          stock
        }
      }
    `;

    try {
      const { accessToken } = await AuthService.getTokens();
      const client = await getGraphQLClient();
      const res = await client.request(GET_OUTLET_ITEMS, { outletId }, {
        Authorization: `Bearer ${accessToken}`
      }) as any;
      return res.getItemsByOutlet ?? [];
    } catch (error) {
      console.error("Failed to get outlet items:", error);
      return [];
    }
  }
}