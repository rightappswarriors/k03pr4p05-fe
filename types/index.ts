export interface Item {
  id: string;
  name: string;
  price: number;
  image?: string;
  categoryId?: string;
  category?: object;
  barcode?: string;
  description?: string;
  brand?: string; // ✅ already added
  vatable?: boolean,
  color?: string; // ✅ add this if you want to sort/filter by item color
}
export interface CartItem extends Item {
  quantity: number;
}

export interface Category {
  id: string;
  name: string;
  color?: string;
  brand?: string;
}
export interface Subscription {
  id: string;
  plan: 'BASIC' | 'GOLD';
}

export interface OrganizationInfo {
  id: string;
  name: string;
  subscription?: Subscription | null;
}

export interface User {
  id: string;
  email: string;
  fullname?: string;
  name: string;
  role: 'OWNER' | 'CASHIER' | 'STAFF' | 'MANAGER' | 'ADMIN';
  isVerified?: boolean;
  orgId?: number;
  org?: OrganizationInfo | null;
  assignedOutletId?: string; // For cashiers
  createdAt: string;
  profilePhoto?: string;
}


export type EWalletMethod = "PH_GCASH" | "PH_PAYMAYA";
// You can also refine your PaymentMethod to include E-Wallet details
export type PaymentMethod = 'cash' | 'e-wallet' | 'card';

export interface Outlet {
  id: string;
  branchId?: string;
  name: string;
  address: string;
  phone?: string;
  code: string;
  governmentTax?: number;
  serviceCharge?: number;
  outletType?: 'retail' | 'wholesale' | 'service';
  assignedStaff?: string;
  isVatRegistered?: boolean,
  VatPercent?: number
  VATZeroSale?: number
  ownerId?: string;
  isActive?: boolean;
  tin?: string,
  ptu?: string,
  bir?: string,
  hasKey?: boolean
  discountOption: Record<DiscountType, number>;
}
export interface DiscountOptions {
  type: DiscountType;
  promoPercent?: number; // only used if type === "Promo"
}

export type DiscountType = 'SENIOR' | 'PWD' | 'PROMO' | "NONE";

// Define the type of methods the parent can call
export type PaymentBottomSheetRef = {
  open: () => void;
  close: () => void;
};

export interface CalculationResult {
  subtotal: number; // in pesos
  discount: number; // in pesos
  vatAmount: number; // in pesos
  total: number; // in pesos
  discountRate: any
}
export interface Receipt {
  user?: User
  outlet?: Outlet,
  transaction: {
    id: string
    date: string
    timestamp: string
    cashier?: string
    //cashierId: number
  }
  items: Item[]
  totals: {
    vatAmount: number
    subtotal: number
    total: number
    cashReceived: number
    change: number
    discountType?: 'SENIOR' | 'PROMO' | "PWD"
    discountPercent?: number
    discountTotal?: number
  }
  payment: {
    status: string
    method: string
  }
}
export interface Transaction {
  id: string,
  outletId?: Number;
  cashierId?: Number;
  deviceId: string;
  items: CartItem[];
  total: number;
  vatAmount: number;
  subtotal: number;
  cashReceived: number;
  change: number;
  paymentMethod: 'CASH' | 'CARD' | 'DIGITAL';
  status: 'PENDING' | 'SYNCED' | 'FAILED' | 'PAYED' | 'CANCELED';
  createdAt: string;
  syncedAt?: string;
  retryCount: number;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  deviceBound?: boolean;
  accessToken?: null | string;
  refreshToken?: null | string;
  wifiAuthorized?: boolean;
}
export interface SyncLog {
  id: string;
  outletId?: Number;
  deviceId: string;
  deviceInfo: DeviceInfo;
  ordersCount: number;
  status: 'SYNCED' | 'FAILED';
  errorMessage?: string;
  timestamp: string;
  duration: number;
}
export interface DeviceInfo {
  deviceId: string;
  deviceName?: string;
  platform: string;
  osVersion?: string;
  appVersion: string;
}

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
}
/// Defining Admin type mock

export interface Order {
  id: string;
  storeId: string;
  deviceId: string;
  userId: string;
  userEmail: string;
  items: OrderItem[];
  total: number;
  tax: number;
  subtotal: number;
  paymentMethod: 'cash' | 'card' | 'digital';
  status: 'pending' | 'synced' | 'failed';
  createdAt: string;
  syncedAt?: string;
  retryCount: number;
}


export interface Store {
  id: string;
  name: string;
  address: string;
  wifiSSID: string;
  boundDeviceId?: string;
  isActive: boolean;
  createdAt: string;
}


export interface DeviceInfo {
  deviceId: string;
  deviceName?: string;
  platform: string;
  osVersion?: string;
  appVersion: string;
}



export interface Branch {
  id: string;
  name: string;
  outletIds: string[];
  address: string;
  isActive: boolean;
  createdAt: string;
  phone?: string;
  location?: Location
}

export interface Location {
  id: number
  address: string
  latitude?: number
  longitude?: number
}

export interface AdminOutlet {
  id: string;
  code?: string,
  governmentTax?: number | string
  phone: string,
  branchId?: string;
  serviceCharge?: number | string
  latitude?: number | string,
  longitude?: number | string,
  bannerImage?: string;
  bannerImagePath?: string;

  name: string;
  status: 'open' | 'closed' | 'maintenance';
  assignedCashierIds: string[];
  currentCashiers: PresentCashier[];
  location?: string;
  deviceId?: string;
  createdAt: string;
  outletType: string,
  address: string
}

export interface PresentCashier {
  isPresent: boolean,
  id: string
}
export interface Cashier {
  id: string;
  fullname: string;
  email: string;
  outletId?: string;
  //branchId: string;
  shiftStartTime?: string;
  isActive: boolean;
  totalTransactionsToday?: number;
}


export interface AdminTransaction {
  id: string;
  branchId: string;
  outletId: string;
  cashierId: string;
  items: OrderItem[];
  total: number;
  tax: number;
  subtotal: number;
  paymentMethod: 'cash' | 'card' | 'digital';
  status: 'completed' | 'pending' | 'cancelled';
  createdAt: string;
  completedAt?: string;
}

export interface BranchRevenue {
  branchId: string;
  totalRevenue: number;
  transactionCount: number;
  dateRange: {
    start: string;
    end: string;
  };
}

export interface OutletRevenue {
  outletId: string;
  totalRevenue: number;
  transactionCount: number;
  dateRange: {
    start: string;
    end: string;
  };
}