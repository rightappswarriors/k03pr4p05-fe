export interface Item {
  id: string;
  name: string;
  price: number;
  image: string;
  categoryId: string;
  barcode?: string;
  description?: string;
}
export type TabType = 'overview' | 'inventory' | 'finances';
export interface CartItem extends Item {
  quantity: number;
}
export type StoreStatsType = {
  totalTransactions: number;
  todayTransactions: number;
  totalRevenue: number;
  todayRevenue: number;
  recentTransactions: {
    id: string;
    total: number;
  }[];
};
export interface Category {
  id: string;
  name: string;
  color?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'cashier' | 'staff';
  assignedStoreId?: string; // For cashiers
  createdAt: string;
  profilePhoto?: string
}
export interface Branch {
  id: string;
  name: string;
  address: string;
  phone?: string;
  ownerId: string;
  isActive: boolean;
  createdAt: string;
}
export interface Store {
  id: string;
  branchId: string;
  name: string;
  address: string;
  phone?: string;
  code: string;
  nextTransactionNumber: number;
  governmentTax: number;
  serviceCharge: number;
  outletType: 'retail' | 'wholesale' | 'service';
  assignedStaff?: string;
  ownerId: string;
  isActive: boolean;
  createdAt: string;
}
export interface Transaction {
  id: string;
  storeId: string;
  cashierId: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  cashReceived: number;
  change: number;
  timestamp: string;
  paymentMethod: 'cash' | 'card';
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}
