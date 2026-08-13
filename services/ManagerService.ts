// @/services/adminService.ts
import { Branch, Cashier, BranchRevenue, OutletRevenue, AdminOutlet, AdminTransaction, Outlet } from '@/types';

import { getGraphQLClient } from '@/utils/constants';
import { gql } from 'graphql-request';
import { AuthService } from './authService';
import { OutletPromoInput } from '@/types';
import { formatGraphQLError } from '@/utils/errorFormatter';
function mapTransaction(raw: any): AdminTransaction {
  return {
    id: String(raw.id),
    branchId: '',
    outletId: String(raw.outletId),
    cashierId: String(raw.cashierId),
    cashier: raw.cashier ?? null,

    total: raw.total,
    subtotal: raw.subtotal,

    tax: raw.vatAmount,
    vatAmount: raw.vatAmount,

    cashReceived: raw.cashReceived ?? null,
    change: raw.change ?? null,

    paymentMethod: raw.paymentMethod?.toLowerCase() ?? 'cash',
    status: raw.status?.toLowerCase() ?? 'completed',

    createdAt: raw.createdAt,
    completedAt: raw.syncedAt ?? undefined,

    customerDetails: raw.customerDetails ?? null,

    items: (raw.items ?? []).map((ci: any) => ({
      id: `${ci.transactionId}-${ci.itemId}`, // composite-safe id

      quantity: ci.quantity,
      price: ci.priceAtSale,

      // item name comes from direct relation now
      name: ci.item?.name ?? 'Unknown Item',

      // unit info comes from ci.unit (NOT inventoryItemUnit)
      unitName: ci.unitName ?? ci.unit?.unitName ?? '',
      unitLabel: ci.unit?.unitLabel ?? '',

      stockLabel: ci.item?.stockLabel ?? 'pcs',
      image: ci.item?.image ?? null,
    })),
  };
}
const TXN_FIELDS = `
  id
  outletId
  cashierId
  cashier { id fullname email }
  total
  subtotal
  vatAmount
  cashReceived
  change
  paymentMethod
  status
  createdAt
  syncedAt
  customerDetails {
    id
    fullname
  }
  items {
    transactionId
    itemId
    quantity
    priceAtSale
    unitId
    unitName

    item {
      id
      name
      stockLabel
      image
    }

    unit {
      id
      unitName
      unitLabel
      price
    }
  }
`;
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
      if (__DEV__) console.log("Success getting branches:\n", res.getOwnedBranches)
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

      if (__DEV__) {
        const errorMessage = formatGraphQLError(error)
        console.error("Failed to get branches:", errorMessage)
      }
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
      if (__DEV__) {
        const errorMessage = formatGraphQLError(error)
        console.error("Failed to get branch Revenue:", errorMessage)
      }
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
      query getOutletsByBranchIDD($branchId: ID!) {
        getOutletsByBranchIDD(branchId: $branchId) {
          id
          name
          outletType
          address 
          branchId
          createdAt
          bannerImage
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
      if (__DEV__) console.log("Success getting outlets:\n", res.getOutletsByBranchIDD)
      return res.getOutletsByBranchIDD.map((o: any) => {
        return {
          id: o.id,
          name: o.name,
          status: o.status === null ? "open" : o.status,
          outletType: o.outletType,
          address: o.address,

          bannerImage: o.bannerImage ?? null,
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
    query GetOutletTransactionsMoney($outletId: ID!, $startDate: DateTime, $endDate: DateTime) {
      getOutletTransactionsMoney(outletId: $outletId, startDate: $startDate, endDate: $endDate) {
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

      const transactions = res.getOutletTransactionsMoney

      // ✅ compute total from real data
      const totalRevenue = transactions.reduce(
        (sum: number, txn: any) => sum + txn.total, 0
      )
      if (__DEV__) console.log("Success getting outlet Revenue:", totalRevenue)
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

      if (__DEV__) {
        const errorMessage = formatGraphQLError(error)
        console.error("Failed to get outlet Revenue:", errorMessage)
      }
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

  static async getRecentTransactions(
    outletId: string,
    limit: number = 50,
    offset: number = 0,
    startDate?: Date,
    endDate?: Date,
  ): Promise<AdminTransaction[]> {
    const QUERY = gql`
    query GetOutletTransactions(
      $outletId: ID!,
      $limit: Int,
      $offset: Int,
      $startDate: DateTime,
      $endDate: DateTime
    ) {
      getOutletTransactions(
        outletId: $outletId,
        limit: $limit,
        offset: $offset,
        startDate: $startDate,
        endDate: $endDate
      ) {
        ${TXN_FIELDS}
      }
    }
  `;
    try {
      const { accessToken } = await AuthService.getTokens();
      const client = await getGraphQLClient();
      const res = await client.request(
        QUERY,
        { outletId: parseInt(outletId), limit, offset, startDate, endDate },
        { Authorization: `Bearer ${accessToken}` },
      ) as any;
      return (res.getOutletTransactions ?? []).map(mapTransaction);
    } catch (error) {
      console.error('Failed to get transactions query getRecentTransactions:', error);
      return [];
    }
  }
  static async getTransactionById(id: string): Promise<AdminTransaction | null> {
    const QUERY = gql`
    query GetTransactionById($id: Int!) {
      getTransactionById(id: $id) {
        ${TXN_FIELDS}
      }
    }
  `;
    try {
      const { accessToken } = await AuthService.getTokens();
      const client = await getGraphQLClient();
      const res = await client.request(
        QUERY,
        { id: parseInt(id) },
        { Authorization: `Bearer ${accessToken}` },
      ) as any;
      return res.getTransactionById ? mapTransaction(res.getTransactionById) : null;
    } catch (error) {
      console.error('Failed to get transaction detail:', error);
      return null;
    }
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
      if (__DEV__) console.log("Success getting branch by id:\n", res.getBranchById)
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
      if (__DEV__) {
        const errorMessage = formatGraphQLError(error)
        console.error("Failed to get branch by id:", errorMessage)
      }
      return null
    }
  }



  static async getOutletById(outletId: string): Promise<Outlet | null> {
    const GETOUTLET_ID = `
      query GetOutletById($outletId: ID!) {
        getOutletById(id: $outletId) {
          id
          name
          outletType
          address
          branchId
          createdAt
          status
          phone
          code
          governmentTax
          serviceCharge
          latitude
          longitude
          bannerImage
          wifiSSID
          isActive
          tin
          ptu
          bir
          isVatRegistered
          vatZeroSale
          vatTypeId
          staff { id isPresent }
        }
      }`
    try {
      const { accessToken } = await AuthService.getTokens();
      const client = await getGraphQLClient();
      const res = (await client.request(GETOUTLET_ID, { outletId }, {
        Authorization: `Bearer ${accessToken}`,
      })) as any;
      const o = res.getOutletById;
      if (!o) return null;

      return {
        id: o.id,
        name: o.name,
        status: o.status === null ? 'open' : o.status,
        outletType: o.outletType,
        branchId: o.branchId,
        address: o.address,
        phone: o.phone,
        code: o.code,
        governmentTax: o.governmentTax,
        serviceCharge: o.serviceCharge,
        latitude: o.latitude,
        longitude: o.longitude,
        bannerImage: o.bannerImage,
        wifiSSID: o.wifiSSID,
        isActive: o.isActive,
        createdAt: o.createdAt,
        assignedCashierIds: o.staff?.map((s: any) => s.id) ?? [],
        currentCashiers: o.staff?.filter((s: any) => s.isPresent).map((s: any) => ({ id: s.id, isPresent: s.isPresent })) ?? [],
        tin: o.tin,
        ptu: o.ptu,
        bir: o.bir,
        isVatRegistered: o.isVatRegistered,
        vatZeroSale: o.vatZeroSale,
        vatTypeId: o.vatTypeId,
      };
    } catch (error) {
      if (__DEV__) {
        const errorMessage = formatGraphQLError(error)
        console.error('Failed to get outlet by id:', errorMessage);
      }
      return null;
    }
  }

  static async createBranch(data: { name: string; address: string; phone?: string }): Promise<Branch> {
    // Check if user has an organization
    const currentUser = await AuthService.getCurrentUser();
    if (!currentUser?.orgId) {
      throw new Error('You must complete organization setup before creating branches');
    }

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

      if (__DEV__) console.log("Success creating branch:", res.createBranch);
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
      if (__DEV__) {
        const errorMessage = formatGraphQLError(error)
        console.error("Failed to create branch:", errorMessage);
      }
      throw error;
    }
  }

  static async createOutlet(branchId: string, data: {
    name: string;
    address: string;
    phone?: string;
    outletType: string;
    status: string;
    code: string;
    governmentTax: number;
    serviceCharge: number;
    latitude?: number;
    longitude?: number;
    bannerImage?: string;
    wifiSSID?: string;
    tin?: string;
    ptu?: string;
    bir?: string;
    isActive?: boolean;
    isVatRegistered?: boolean;
    vatZeroSale?: number;
    vatTypeId?: number;
    outletPromos?: OutletPromoInput[];
  }): Promise<AdminOutlet> {
    const CREATE_OUTLET_MUTATION = gql`
    mutation CreateOutlet(
      $branchId: ID!
      $name: String!
      $address: String!
      $phone: String
      $outletType: OutletType!
      $status: OutletStatus!
      $code: String!
      $governmentTax: Float!
      $serviceCharge: Float!
      $latitude: Float
      $longitude: Float
      $bannerImage: String
      $wifiSSID: String
      $tin: String
      $ptu: String
      $bir: String
      $isActive: Boolean
      $isVatRegistered: Boolean
      $vatZeroSale: Float
      $vatTypeId: Int
      $outletPromos: [OutletPromoInput!]
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
        wifiSSID: $wifiSSID
        tin: $tin
        ptu: $ptu
        bir: $bir
        isActive: $isActive
        isVatRegistered: $isVatRegistered
        vatZeroSale: $vatZeroSale
        vatTypeId: $vatTypeId
        outletPromos: $outletPromos
      ) {
        id name address phone outletType status code
        governmentTax serviceCharge latitude longitude bannerImage wifiSSID isActive
        tin ptu bir isVatRegistered vatZeroSale vatTypeId
        branchId createdAt
        staff { id isPresent }
        outletPromos { id promoTypeId discount isActive }
      }
    }
  `;

    try {
      const { accessToken } = await AuthService.getTokens();
      const client = await getGraphQLClient();
      const res = await client.request(CREATE_OUTLET_MUTATION, { branchId, ...data }, {
        Authorization: `Bearer ${accessToken}`
      }) as any;

      if (__DEV__) console.log("Success creating outlet:", res.createOutlet);
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
        wifiSSID: outlet.wifiSSID,
        isActive: outlet.isActive,
        branchId: outlet.branchId,
        createdAt: outlet.createdAt,
        assignedCashierIds: outlet.staff.map((s: any) => s.id) ?? [],
        currentCashiers: outlet.staff.filter((s: any) => s.isPresent === true).map((s: any) => ({
          id: s.id,
          isPresent: s.isPresent
        })) ?? []
      };
    } catch (error) {
      if (__DEV__) {
        const errorMessage = formatGraphQLError(error)
        console.error("Failed to create outlet:", errorMessage);
      }
      throw error;
    }
  }

  static async updateBranch(branchId: string, data: { name?: string; address?: string; phone?: string; }): Promise<Branch> {
    const UPDATE_BRANCH_MUTATION = gql`
      mutation UpdateBranch($branchId: ID!, $name: String, $address: String, $phone: String) {
        updateBranch(id: $branchId, name: $name, address: $address, phone: $phone) {
          id
          name
          address
          phone
          isActive
          owner {
            id
            fullname
          }
          outlets { id }
          createdAt
        }
      }
    `;

    try {
      const { accessToken } = await AuthService.getTokens();
      const client = await getGraphQLClient();
      const res = (await client.request(UPDATE_BRANCH_MUTATION, {
        branchId,
        name: data.name,
        address: data.address,
        phone: data.phone,
      }, {
        Authorization: `Bearer ${accessToken}`
      })) as any;

      const branch = res.updateBranch;
      return {
        id: branch.id,
        name: branch.name,
        address: branch.address,
        phone: branch.phone,
        outletIds: branch.outlets.map((o: any) => o.id) ?? [],
        isActive: branch.isActive,
        createdAt: branch.createdAt,
      };
    } catch (error) {

      if (__DEV__) {
        const errorMessage = formatGraphQLError(error)
        console.error('Failed to update branch:', errorMessage);
      }
      throw error;
    }
  }

  static async updateOutlet(outletId: string, data: {
    name?: string;
    address?: string;
    phone?: string;
    code?: string;
    status?: string;
    outletType?: string;
    governmentTax?: number;
    serviceCharge?: number;
    latitude?: number;
    longitude?: number;
    isActive?: boolean;
    bannerImage?: string;
    wifiSSID?: string;
    tin?: string;
    ptu?: string;
    bir?: string;
    isVatRegistered?: boolean;
    vatZeroSale?: number;
    vatTypeId?: number;
    outletPromos?: OutletPromoInput[];
  }): Promise<AdminOutlet> {
    const UPDATE_OUTLET_MUTATION = gql`
      mutation UpdateOutlet(
        $outletId: ID!
        $name: String
        $address: String
        $phone: String
        $code: String
        $status: OutletStatus
        $outletType: OutletType
        $governmentTax: Float
        $serviceCharge: Float
        $latitude: Float
        $longitude: Float
        $isActive: Boolean
        $bannerImage: String
        $wifiSSID: String
        $tin: String
        $ptu: String
        $bir: String
        $isVatRegistered: Boolean
        $vatZeroSale: Float
        $vatTypeId: Int
        $outletPromos: [OutletPromoInput!]
      ) {
        updateOutlet(
          outletId: $outletId
          name: $name
          address: $address
          phone: $phone
          code: $code
          status: $status
          outletType: $outletType
          governmentTax: $governmentTax
          serviceCharge: $serviceCharge
          latitude: $latitude
          longitude: $longitude
          isActive: $isActive
          bannerImage: $bannerImage
          wifiSSID: $wifiSSID
          tin: $tin
          ptu: $ptu
          bir: $bir
          isVatRegistered: $isVatRegistered
          vatZeroSale: $vatZeroSale
          vatTypeId: $vatTypeId
          outletPromos: $outletPromos
        ) {
          id
          name
          address
          phone
          code
          status
          outletType
          governmentTax
          serviceCharge
          latitude
          longitude
          bannerImage
          wifiSSID
          isActive
          tin
          ptu
          bir
          isVatRegistered
          vatZeroSale
          vatTypeId  
          outletPromos { id promoTypeId discount isActive }
          branchId
          createdAt
          staff { id isPresent }
        }
      }
    `;

    try {
      const { accessToken } = await AuthService.getTokens();
      const client = await getGraphQLClient();
      const res = (await client.request(UPDATE_OUTLET_MUTATION, {
        outletId,
        ...data,
      }, {
        Authorization: `Bearer ${accessToken}`,
      })) as any;

      const outlet = res.updateOutlet;
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
        wifiSSID: outlet.wifiSSID,
        isActive: outlet.isActive,
        branchId: outlet.branchId,
        createdAt: outlet.createdAt,
        assignedCashierIds: outlet.staff.map((s: any) => s.id) ?? [],
        currentCashiers: outlet.staff.filter((s: any) => s.isPresent === true).map((s: any) => ({
          id: s.id,
          isPresent: s.isPresent,
        })) ?? [],
      };
    } catch (error) {

      if (__DEV__) {
        const errorMessage = formatGraphQLError(error)
        console.error('Failed to update outlet:', errorMessage);
      }
      throw error;
    }
  }

  static async assignItemsToOutlet(
    outletId: string,
    itemIds: string[],
    quantities?: Record<string, number>,
    prices?: Record<string, number>
  ): Promise<void> {
    try {
      const { accessToken } = await AuthService.getTokens();
      const client = await getGraphQLClient();

      // Step 1: Fetch the outlet to get its inventory ID
      const GET_OUTLET_INVENTORY = gql`
        query GetOutletInventory($outletId: Int!) {
          getInventoryByOutletId(outletId: $outletId) {
            inventory {
              id
            }
          }
        }
      `;

      const outletData = await client.request(
        GET_OUTLET_INVENTORY,
        { outletId: parseInt(outletId) },
        { Authorization: `Bearer ${accessToken}` }
      ) as any;

      const inventoryId = outletData.getInventoryByOutletId?.inventory?.id;
      if (!inventoryId) {
        throw new Error("Could not find inventory for this outlet");
      }

      // Step 2: Prepare items for addition with quantities and prices
      const itemsToAdd = itemIds.map((itemId) => ({
        itemId: parseInt(itemId),
        quantity: quantities?.[itemId] || 0,
        price: prices?.[itemId] || 0, // Use provided price or default to 0
      }));

      // Step 3: Add items to inventory
      const ADD_ITEMS_MUTATION = gql`
        mutation AddItemsToInventory($inventoryId: ID!, $items: [AddItemToInventoryInput!]!) {
          addItemsToInventory(inventoryId: $inventoryId, items: $items) {
            count
          }
        }
      `;

      const result = await client.request(
        ADD_ITEMS_MUTATION,
        {
          inventoryId: inventoryId.toString(),
          items: itemsToAdd,
        },
        { Authorization: `Bearer ${accessToken}` }
      );

      if (__DEV__) console.log(`Successfully assigned ${itemIds.length} items to outlet`);
    } catch (error) {
      if (__DEV__) {
        const errorMessage = formatGraphQLError(error)
        console.error("Failed to assign items to outlet:", errorMessage);
      }
      throw error;
    }
  }

  // adminService.ts
  static async assignStaffToOutlet(
    outletId: string,
    users: { userId: number; role: string }[]
  ): Promise<void> {
    const ASSIGN_STAFF_MUTATION = gql`
    mutation AddOutletStaff($outletId: ID!, $users: [OutletStaffInput!]!) {
      AddOutletStaff(outletId: $outletId, users: $users) {
        id
        name
        staff {
          id
          fullname
        }
      }
    }
  `;
    const { accessToken } = await AuthService.getTokens();
    const client = await getGraphQLClient();
    await client.request(
      ASSIGN_STAFF_MUTATION,
      {
        outletId, users: users.map(u => ({
          userId: Number(u.userId),
          role: u.role
        }))
      },
      { Authorization: `Bearer ${accessToken}` }
    );
  }

  static async getItemsByOutlet(outletId: string): Promise<any[]> {
    const GET_OUTLET_ITEMS = gql`
      query GetItemsByOutlet($outletId: ID!) {
        getItemsByOutlet(outletId: $outletId) {
          id
          item {
            id
            name
            barcode
            categoryId
            sellingPrice
            image
            stock
            stockLabel
            remainingStock
            costLines {
              label
              amount
            }
          }
          price
          quantity
          units {
            id
            unitName
            unitLabel
            price
            quantity
            conversionFactor
            baseUnit
            barcode
            isDefault
            minOrderQty
            maxOrderQty
            reorderPoint
          }
        }
      }
    `;

    try {
      const { accessToken } = await AuthService.getTokens();
      const client = await getGraphQLClient();
      const res = await client.request(GET_OUTLET_ITEMS, { outletId: parseInt(outletId) }, {
        Authorization: `Bearer ${accessToken}`
      }) as any;
      return res.getItemsByOutlet ?? [];
    } catch (error) {
      if (__DEV__) {
        const errorMessage = formatGraphQLError(error)
        console.error("Failed to get outlet items:", errorMessage);
      }
      return [];
    }
  }

  static async getBranchesMinimal(search?: string): Promise<{ id: number; name: string; address: string; isActive: boolean }[]> {
    try {
      const { accessToken } = await AuthService.getTokens();
      const client = await getGraphQLClient();

      const GET_BRANCHES_MINIMAL = gql`
        query GetBranchesMinimal($search: String) {
          getOwnedBranches(search: $search) {
            id
            name
            address
            isActive
          }
        }
      `;

      const res = await client.request(GET_BRANCHES_MINIMAL, { search }, {
        Authorization: `Bearer ${accessToken}`
      }) as any;
      return res.getOwnedBranches ?? [];
    } catch (error) {
      if (__DEV__) {
        const errorMessage = formatGraphQLError(error)
        console.error("Failed to get branches minimal:", errorMessage);
      }
      return [];
    }
  }

  static async getOutletsByBranchMinimal(branchId: string, search?: string): Promise<{ id: number; name: string; address: string; latitude?: number; longitude?: number; status: string }[]> {
    try {
      const { accessToken } = await AuthService.getTokens();
      const client = await getGraphQLClient();

      const GET_OUTLETS_MINIMAL = gql`
        query GetOutletsByBranchMinimal($branchId: ID!, $search: String) {
          getOutletsByBranch(branchId: $branchId, search: $search) {
            id
            name
            address
            latitude
            longitude
            status
          }
        }
      `;

      const res = await client.request(GET_OUTLETS_MINIMAL, { branchId: parseInt(branchId), search }, {
        Authorization: `Bearer ${accessToken}`
      }) as any;
      return res.getOutletsByBranch ?? [];
    } catch (error) {
      if (__DEV__) {
        const errorMessage = formatGraphQLError(error)
        console.error("Failed to get outlets minimal:", errorMessage);
      } return [];
    }
  }
}
