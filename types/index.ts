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
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'OWNER' | 'CASHIER' | 'STAFF' | 'MANAGER';
  assignedOutletId?: string; // For cashiers
  createdAt: string;
  profilePhoto?: string;
}


export type EWalletMethod = "PH_GCASH" | "PH_PAYMAYA";
// You can also refine your PaymentMethod to include E-Wallet details
export type PaymentMethod = 'cash' | 'e-wallet' | 'card';

export interface Outlet {
  id: string;
  branchId: string;
  name: string;
  address: string;
  phone?: string;
  code: string;
  governmentTax: number;
  serviceCharge: number;
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
  discountOption?: Record<DiscountType, number>;
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
    discountType?: 'SENIOR'|'PROMO' | "PWD" 
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
  status: 'PENDING' | 'SYNCED'| 'FAILED' | 'PAYED'| 'CANCELED';
  createdAt: string;
  syncedAt?: string;
  retryCount: number;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  //deviceBound?: boolean;
  accessToken?: null | string;
  refreshToken?: null | string;
  //wifiAuthorized: boolean;
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
