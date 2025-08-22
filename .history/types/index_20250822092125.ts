export interface Item {
  id: string;
  name: string;
  price: number;
  image: string;
  categoryId: string;
  barcode?: string;
  description?: string;
  brand?: string; // ✅ already added
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
  role: 'owner' | 'cashier' | 'staff';
  assignedStoreId?: string; // For cashiers
  createdAt: string;
  profilePhoto?: string;
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
  deviceId: string;
  items: CartItem[];
  total: number;
  tax: number;
  subtotal: number;
  cashReceived: number;
  change: number;
  paymentMethod: 'cash' | 'card' | 'digital';
  status: 'pending' | 'synced' | 'failed';
  createdAt: string;
  syncedAt?: string;
  retryCount: number;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  deviceBound?: boolean;
  accessToken: null;
  refreshToken: null;
  authenticated: null;
}
export interface SyncLog {
  id: string;
  storeId: string;
  deviceId: string;
  deviceInfo: DeviceInfo;
  ordersCount: number;
  status: 'success' | 'failed';
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
