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

  static async getBranchRevenue(branchId: string, startDate: string, endDate: string): Promise<BranchRevenue> {
    const GET_BRANCHREVENUE = gql`
    query GetBranchTransactions($getBranchTransactionsId: ID!) {
      getBranchTransactions(id: $getBranchTransactionsId) {
        id,
        total,
        createdAt,
        status
      }
    }
    `
    try {
      const { accessToken } = await AuthService.getTokens()
      const client = await getGraphQLClient()
      const res = (await client.request(GET_BRANCHREVENUE, { getBranchTransactionsId: branchId }, {
        Authorization: `Bearer ${accessToken}`
      })) as any
      console.log("Success getting branch transactions:\n", res.getBranchTransactions)


    } catch (error) {
      console.error("Failed to get branch Revenue:", error)
    }
    const branchTransactions = MOCK_TRANSACTIONS.filter(
      txn => txn.branchId === branchId &&
        txn.status === 'completed' &&
        txn.createdAt >= startDate &&
        txn.createdAt <= endDate
    );

    const totalRevenue = branchTransactions.reduce((sum, txn) => sum + txn.total, 0);

    return {
      branchId,
      totalRevenue,
      transactionCount: branchTransactions.length,
      dateRange: { start: startDate, end: endDate }
    };
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

  static async getOutletRevenue(outletId: string, startDate: string, endDate: string): Promise<OutletRevenue> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const GET_OUTLETREVENUE = gql`
    query GetOutletTransactions($outletId: ID!) {
      getOutletTransactions(outletId: $outletId) {
        id
        cashierId
        total
        subtotal
        cashReceived
        paymentMethod
        status
        createdAt
        items {
          item {
            name
            InventoryItems {
              price
            }
          }
          quantity
        }
        cashier {
          id
          fullname
          email
        }
      }
    }`
    try {
      const { accessToken } = await AuthService.getTokens()
      const client = await getGraphQLClient()
      const res = (await client.request(GET_OUTLETREVENUE, { outletId }, {
        Authorization: `Bearer ${accessToken}`
      })) as any
      console.log("Success getting outlet transactions:\n", res.getOutletTransactions)
    } catch (error) {
      console.error("Failed to get outlet Revenue:", error)
    }
    const outletTransactions = MOCK_TRANSACTIONS.filter(
      txn => txn.outletId === outletId &&
        txn.status === 'completed' &&
        txn.createdAt >= startDate &&
        txn.createdAt <= endDate
    );

    const totalRevenue = outletTransactions.reduce((sum, txn) => sum + txn.total, 0);

    return {
      outletId,
      totalRevenue,
      transactionCount: outletTransactions.length,
      dateRange: { start: startDate, end: endDate }
    };
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
}