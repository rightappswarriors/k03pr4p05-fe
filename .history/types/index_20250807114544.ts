export interface Item {
  id: string;
  name: string;
  price: number;
  image: string;
  categoryId: string;
  barcode?: string;
  description?: string;
  brand?: string;  // ✅ already added
  color?: string;  // ✅ add this if you want to sort/filter by item color
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
  profilePhoto?: string
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
