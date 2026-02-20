import { Branch, Outlet, Cashier, Transaction, BranchRevenue, OutletRevenue, AdminOutlet, AdminTransaction } from '@/types';

import { getGraphQLClient } from '@/utils/constants';
import { gql } from 'graphql-request';
import { AuthService } from './authService';

// Mock data for demonstration
const MOCK_BRANCHES: Branch[] = [
  {
    id: '1',
    name: 'Downtown Main',
    location: {
      address: '123 Main Street, Downtown',
      coordinates: { lat: 40.7128, lng: -74.0060 }
    },
    outletIds: ['outlet_001', 'outlet_002', 'outlet_003'],
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    name: 'Mall Plaza',
    location: {
      address: '456 Shopping Center, Mall Plaza',
      coordinates: { lat: 40.7589, lng: -73.9851 }
    },
    outletIds: ['outlet_004', 'outlet_005'],
    isActive: true,
    createdAt: '2024-01-15T00:00:00Z'
  },
  {
    id: '3',
    name: 'Airport Terminal',
    location: {
      address: 'Terminal 1, International Airport',
      coordinates: { lat: 40.6413, lng: -73.7781 }
    },
    outletIds: ['outlet_006'],
    isActive: true,
    createdAt: '2024-02-01T00:00:00Z'
  }
];

const MOCK_OUTLETS: AdminOutlet[] = [
  {
    id: '1',
    branchId: '1',
    name: 'Main Counter',
    status: 'open',
    assignedCashierIds: ['cashier_001', 'cashier_002'],
    currentCashierId: 'cashier_001',
    location: 'Ground Floor - Front',
    createdAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    branchId: '2',
    name: 'Express Lane',
    status: 'open',
    assignedCashierIds: ['cashier_003'],
    currentCashierId: 'cashier_003',
    location: 'Ground Floor - Side',
    createdAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '3',
    branchId: '1',
    name: 'Customer Service',
    status: 'closed',
    assignedCashierIds: ['cashier_004'],
    location: 'Ground Floor - Back',
    createdAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '4',
    branchId: '2',
    name: 'Food Court Counter',
    status: 'open',
    assignedCashierIds: ['cashier_005'],
    currentCashierId: 'cashier_005',
    location: 'Level 2 - Food Court',
    createdAt: '2024-01-15T00:00:00Z'
  },
  {
    id: '5',
    branchId: '2',
    name: 'Main Entrance',
    status: 'open',
    assignedCashierIds: ['cashier_006'],
    currentCashierId: 'cashier_006',
    location: 'Level 1 - Main Entrance',
    createdAt: '2024-01-15T00:00:00Z'
  },
  {
    id: '2',
    branchId: '3',
    name: 'Departure Gate',
    status: 'open',
    assignedCashierIds: ['cashier_007'],
    currentCashierId: 'cashier_007',
    location: 'Terminal 1 - Gate A12',
    createdAt: '2024-02-01T00:00:00Z'
  }
];

const MOCK_CASHIERS: Cashier[] = [
  {
    id: '1',
    name: 'Alice Johnson',
    email: 'alice@store.com',
    outletId: '3',
    branchId: '2',
    shiftStartTime: '2024-12-19T08:00:00Z',
    isActive: true,
    totalTransactionsToday: 45
  },
  {
    id: '2',
    name: 'Bob Smith',
    email: 'bob@store.com',
    branchId: '2',
    isActive: false,
    totalTransactionsToday: 0
  },
  {
    id: '3',
    name: 'Carol Davis',
    email: 'carol@store.com',
    outletId: '2',
    branchId: '2',
    shiftStartTime: '2024-12-19T09:00:00Z',
    isActive: true,
    totalTransactionsToday: 32
  },
  {
    id: '4',
    name: 'David Wilson',
    email: 'david@store.com',
    branchId: '1',
    isActive: false,
    totalTransactionsToday: 0
  },
  {
    id: '5',
    name: 'Eva Martinez',
    email: 'eva@store.com',
    outletId: '4',
    branchId: '2',
    shiftStartTime: '2024-12-19T10:00:00Z',
    isActive: true,
    totalTransactionsToday: 28
  },
  {
    id: '6',
    name: 'Frank Brown',
    email: 'frank@store.com',
    outletId: '5',
    branchId: '2',
    shiftStartTime: '2024-12-19T08:30:00Z',
    isActive: true,
    totalTransactionsToday: 38
  },
  {
    id: '7',
    name: 'Grace Lee',
    email: 'grace@store.com',
    outletId: '6',
    branchId: '3',
    shiftStartTime: '2024-12-19T06:00:00Z',
    isActive: true,
    totalTransactionsToday: 52
  }
];
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
        owner {
          id
          fullname
        }
        outlets {
          name
        }
      }
    }
    `
    try {
      const { accessToken } = await AuthService.getTokens()
      const client = await getGraphQLClient()
      const res = (await client.request(GET_OWNEDBRANCHES, {}, {
        Authorization: `Bearer ${accessToken}`
      })) as any
      console.log("Success getting branches:\n", res.getOwnedBranches)

    } catch (error) {
      console.error("Failed to get branches:", error)
    }
    // In real implementation, filter branches based on admin access
    return MOCK_BRANCHES.filter(branch => branch.isActive);
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
    } catch (error) {
      console.error("Failed to get outlets:", error)
    }

    return MOCK_OUTLETS.filter(outlet => outlet.branchId === branchId);
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
    query GetStaffByOutletId($outletId: ID!) {
      getStaffByOutletId(outletId: $outletId) {
        role
        email
        fullname
      }
    }`
    try {
      const { accessToken } = await AuthService.getTokens()
      const client = await getGraphQLClient()
      const res = (await client.request(GET_OUTLETCASHIERS, { outletId }, {
        Authorization: `Bearer ${accessToken}`
      })) as any
      console.log("Success getting outlet cashiers:\n", res.getStaffByOutletId)
    } catch (error) {
      console.error("Failed to get outlet cashiers:", error)
    }

    const outlet = MOCK_OUTLETS.find(o => o.id === outletId);
    if (!outlet) return [];

    return MOCK_CASHIERS.filter(cashier =>
      outlet.assignedCashierIds.includes(cashier.id)
    );
  }

  static async getCurrentCashier(outletId: string): Promise<Cashier | null> {
    await new Promise(resolve => setTimeout(resolve, 200));

    const outlet = MOCK_OUTLETS.find(o => o.id === outletId);
    if (!outlet?.currentCashierId) return null;

    return MOCK_CASHIERS.find(c => c.id === outlet.currentCashierId) || null;
  }

  static async getRecentTransactions(outletId: string, limit: number = 20): Promise<AdminTransaction[]> {


    return MOCK_TRANSACTIONS
      .filter(txn => txn.outletId === outletId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  static async getBranchById(branchId: string): Promise<Branch | null> {
    await new Promise(resolve => setTimeout(resolve, 200));

    return MOCK_BRANCHES.find(branch => branch.id === branchId) || null;
  }

  static async getOutletById(outletId: string): Promise<AdminOutlet | null> {
    await new Promise(resolve => setTimeout(resolve, 200));

    return MOCK_OUTLETS.find(outlet => outlet.id === outletId) || null;
  }
}