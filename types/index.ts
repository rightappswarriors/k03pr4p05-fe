// VAT Configuration
export const DEFAULT_VAT_RATE = 0.12; // 12% VAT

export interface Item {
  id: string;
  name: string;
  price: number;
  image?: string;
  description?: string;
  barcode?: string;
  brand?: string;
  categoryId?: string;
  color?: string;
  vatExempt?: boolean;
  isVatExempt?: boolean;
  isBNPC?: boolean;
  hasSeniorDiscountVATExempt?: boolean;
  vatRate?: number;
  units?: ItemUnit[];
}
export interface CartItem {
  id: string;
  name: string;
  price: number;
  image?: string;
  quantity: number;        // stays number (Float in JS is just number)
  unitId?: number;         // ← new
  unitName?: string;       // ← new — display label e.g. "kg"
  unitLabel?: string;      // ← new — full label e.g. "Per Kilo"
  priceAtSale: number;     // ← new — unit price at time of add
  discountAmount?: number; // ← new — per-item discount amount

  discountQuantity?: number; // ← new — per-item discount amount
  discountRate?: number; // ← new — per-item discount amount
  vatExempt?: boolean;
  isVatExempt?: boolean;
  isBNPC?: boolean;
  hasSeniorDiscountVATExempt?: boolean;
  vatRate?: number;
  rate?: number
  barcode?: string;
  itemVatAmount?: number;  // ← new — per-item VAT (12% by default, 0 if vatExempt=true)
}

export type OutletPromoInput = {
  promoTypeId: number;
  discount: number;
  isActive?: boolean;
};

export interface ItemUnit {
  id: number;
  inventoryItemId: number;
  unitName: string;       // "kg", "sack", "dozen", "piece"
  unitLabel: string;      // "Per Kilo", "25kg Sack", "Per Dozen"
  price: number;          // price for this unit
  quantity: number;
  conversionFactor: number; // 1 sack = 25kg → 25
  baseUnit: string;         // "kg", "piece", "liter"
  barcode?: string;
  isDefault: boolean;
  isActive: boolean;
  minOrderQty?: number;
  maxOrderQty?: number;
  reorderPoint?: number;
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
export type orgRoles = 'SELLER' | 'SUPPLIER'
export interface OrganizationInfo {
  id: string;
  name: string;
  subscription?: Subscription | null;
  profileImg?: string;
  roles: orgRoles[];
}

export interface User {
  id: string;
  email: string;
  fullname?: string;
  name: string;
  role: 'OWNER' | 'CASHIER' | 'STAFF' | 'MANAGER' | 'ADMIN' | 'SUPPLIER' | 'CUSTOMER';
  isVerified?: boolean;
  orgId: number;
  org: OrganizationInfo | null;
  assignedOutletId?: string; // For cashiers
  assignedStoreId?: string;
  createdAt: string;
  profilePhoto?: string;
  position?: Position | null;
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
}
export interface Position {
  id: string;
  name: string;
  description?: string;
  permissions?: PositionPermission[];
}
export interface PositionPermission {
  pageId: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  page: Page;

}
export interface Page {
  id: string;
  key: string;
  label: string;
  access?: 'SELLER' | 'SUPPLIER' | 'POSTERMINAL';
  sortOrder?: number;
  parentKey?: string;
}
export type EWalletMethod = "PH_GCASH" | "PH_PAYMAYA";
// You can also refine your PaymentMethod to include E-Wallet details
export type PaymentMethod = 'cash' | 'e-wallet' | 'card';

export interface Outlet {
  status: 'open' | 'closed' | 'maintenance';
  id: string;
  branchId?: string;
  name: string;
  address: string;
  vatZeroSale?: number;
  vatType?: {
    id: number;
    name: string;
    rate: number; // e.g. 0.12 for 12%
  };
  longitude?: number;
  latitude?: number;
  createdAt?: string;
  currentCashiers?: any,
  vatTypeId: any,
  assignedCashierIds?: any
  phone?: string;
  code: string;
  bannerImage?: string;
  wifiSSID?: string;
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
  outletPromos?: Array<{
    id: number;
    promoTypeId: number;
    discount: number;
    isActive: boolean;
    promoType: {
      id: number;
      name: string;
      description?: string;
    };
  }>;
  discountOption?: {
    SENIOR?: number;   // e.g. 0.20
    PWD?: number;      // e.g. 0.20
    PROMO?: number;    // e.g. 15 (percent, divided by 100 in calculateTotal)
    [key: string]: number | undefined;
  };
}
// Keep a constant for the only truly fixed value:
export const NO_DISCOUNT: DiscountType = 'NONE';

// Update DiscountType to include SC/PWD:
export type DiscountType = 'NONE' | 'SENIOR' | 'SENIOR_CITIZEN' | 'PWD' | 'BNPC_SENIOR_CITIZEN' | 'BNPC_PWD' | 'CUSTOM' | 'PROMO' | string;
export type CustomerType = 'REGULAR' | 'SENIOR_CITIZEN' | 'PWD';
export interface DiscountOptions {
  type: DiscountType;
  promoPercent?: number;
  applyVatExempt?: boolean;
}
// Define the type of methods the parent can call
export type PaymentBottomSheetRef = {
  open: () => void;
  close: () => void;
};

export type CalculationResult = {
  subtotal: number;
  grossSubtotal?: number;
  vatableSale?: number;
  discount: number;
  vatAmount: number;
  vatExemptSale?: number;
  discountRate: number;
  total: number;
  netTotal?: number;
  isVatExempt?: boolean;
  scPwdDiscountAmt?: number;
  vatExemptAmount?: number;
  itemBreakdown?: any[];
  usePromoInstead?: boolean;
  bnpcCapReached?: boolean;
};

export interface Receipt {
  user?: User;
  outlet?: Outlet;
  store?: any;
  transaction: {
    id: string;
    date: string;
    timestamp: string;
    cashier?: string;
  };
  items: ReceiptItem[];
  totals: {
    vatAmount: number;
    subtotal: number;
    total: number;
    cashReceived: number;
    change: number;
    discountType?: DiscountType;
    discountPercent?: number;
    discountTotal?: number;
    // ── new ──
    isVatExempt?: boolean;
    vatExemptType?: 'SENIOR_CITIZEN' | 'PWD' | 'DIPLOMAT' | 'GOVERNMENT';
    vatExemptRefNo?: string;
    vatExemptSale?: number;
    vatExemptAmount?: number;
  };
  payment: {
    status: string;
    method: string;
  };
  scPwdCustomer?: any;
}
export interface ReceiptItem {
  id: string;
  name: string;
  price: number;
  priceAtSale: number;     // unit price at time of sale
  quantity: number;        // Float — supports 0.875 kg
  unitId?: number;
  unitName?: string;       // "kg", "dozen", "piece"
  unitLabel?: string;      // "Per Kilo", "Per Dozen"
  subtotal: number;        // priceAtSale * quantity
  discountAmount?: number; // ← new — per-item discount
  discountType?: DiscountType;
  discountRate?: number;
  originalPrice?: number;
  vatExclusivePrice?: number;
  finalPrice?: number;
  vatExempt?: boolean;
  isVatExempt?: boolean;
  isBNPC?: boolean;
  vatRate?: number;
  barcode?: string;
  itemVatAmount?: number;  // ← new — per-item VAT
}
export interface Transaction {
  id: string;
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
  status: 'PENDING' | 'PAID' | 'SYNCED' | 'FAILED' | 'CANCELED'; // ← added PAID + SYNCED
  createdAt: string;
  syncedAt?: string;
  retryCount: number;

  // ── VAT Exemption (SC / PWD) ──────────────────────────────────
  isVatExempt?: boolean;
  vatExemptType?: 'SENIOR_CITIZEN' | 'PWD' | 'DIPLOMAT' | 'GOVERNMENT';
  vatExemptRefNo?: string;     // SC/PWD ID — BIR required on receipt
  vatExemptAmount?: number;    // total VAT stripped

  // ── Promo applied (mutually exclusive with SC/PWD benefit) ────
  outletPromoId?: number;
  promoDiscountAmt?: number;
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
  wifiSSID?: string;
  isActive?: boolean;
  tin?: string;
  ptu?: string;
  bir?: string;
  isVatRegistered?: boolean;
  vatZeroSale?: number | string;
  vatTypeId?: number;

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


export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  // new fields resolved from CartItem → InventoryItemUnit → Item
  unitName?: string;
  unitLabel?: string;
  stockLabel?: string;
  image?: string | null;
}

export interface CustomerDetails {
  id: number;
  name?: string;
  address?: string;
  tin?: string;
  businessStyle?: string;
}

export interface AdminTransaction {
  id: string;
  branchId: string;
  outletId: string;
  cashierId: string;
  /** Resolved cashier info (present when fetched via getOutletTransactions) */
  cashier?: {
    id: number;
    fullname: string;
    email: string;
  } | null;
  items: OrderItem[];
  total: number;
  tax: number;       // mapped from vatAmount on the server
  subtotal: number;
  vatAmount?: number;       // raw server field, same value as tax
  cashReceived?: number | null;
  change?: number | null;
  paymentMethod: 'cash' | 'card' | 'digital' | string;
  status: 'completed' | 'pending' | 'cancelled' | string;
  createdAt: string;
  completedAt?: string;
  customerDetails?: CustomerDetails | null;
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
// ─── Category Search Modal ──────────────────────────────────────────────────────
export interface CategoryOption {
  id: number;
  name: string;
}
export interface UnitLine {
  id: string;
  unitName: string; // e.g. "box", "piece", "pack"
  unitLabel: string; // display label e.g. "Box of 12"
  price: string;
  quantity: string;
  conversionFactor: string; // how many base units in this unit
  barcode: string;
  isDefault: boolean;
  reorderPoint: string;
  allowDecimal: boolean;
}


export interface CostLine {
  id: string; // local UI id only — not sent to backend
  label: string;
  amount: number;
}
export interface CatalogItem {
  id: string;
  name: string;
  itemCode?: string;
  barcode: string;
  brand?: string;
  category?: string;
  image?: string;
  sellingPrice: string;
  costLines: CostLine[] | [];
  stock?: number;
  remainingStock?: number;
  maxAllocatable?: number;
}

// ─── Wholesale Product Types ──────────────────────────────────────────────────────

export interface PriceTier {
  id: string;
  minQty: number;
  maxQty?: number | null; // null means unlimited upper bound
  price: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface WholesaleDocType {
  CE: 'CE';
  FDA: 'FDA';
  ISO: 'ISO';
  ROHS: 'ROHS';
  MSDS: 'MSDS';
  OTHER: 'OTHER';
}

export interface WholesaleDocument {
  id: string;
  supplierItemId: string;
  title?: string;
  type: keyof WholesaleDocType;
  fileUrl: string;
  verified: boolean;
  verifiedById?: number;
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductWholesaleSettings {
  id: string;
  supplierItemId: string;
  minimumOrderQty?: number;
  sampleAvailable: boolean;
  samplePrice?: number;
  leadTime?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductSpecification {
  id: string;
  supplierItemId: string;
  category?: string;
  groupName?: string;
  name: string;
  value: string;
  unit?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface WholesalePackaging {
  id: string;
  supplierItemId: string;
  sellingUnit?: string;
  packageLength?: number;
  packageWidth?: number;
  packageHeight?: number;
  grossWeight?: number; // kg
  netWeight?: number; // kg
  createdAt: string;
  updatedAt: string;
}

export interface WholesaleShipping {
  id: string;
  supplierItemId: string;
  originCountry?: string;
  originProvince?: string;
  originCity?: string;
  shippingMethod?: string;
  estimatedDays?: number;
  shippingNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export type SupplierCapabilityType =
  | 'MINOR_CUSTOMIZATION'
  | 'DRAWING_CUSTOMIZATION'
  | 'SAMPLE_CUSTOMIZATION'
  | 'FULL_CUSTOMIZATION'
  | 'OEM'
  | 'ODM';

export interface SupplierCapability {
  id: string;
  organizationId: number;
  type: SupplierCapabilityType;
  name: string;
  icon?: string;
  available: boolean;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierItemImage {
  id: number;
  supplierItemId: string;
  url: string;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string;
}

export interface SupplierItemVariantImage {
  id: number;
  supplierItemVariantId: string;
  url: string;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string;
}

export interface SupplierItemReviewImage {
  id: number;
  supplierItemReviewId: string;
  url: string;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string;
}

export interface SupplierItem {
  id: string;
  name: string;
  description?: string;
  sku?: string;
  unit: string;
  unitPrice: number;
  isVatExempt: boolean;
  vatRate: number;
  moq: number;
  availableQty: number;
  isActive: boolean;
  averageRating: number;
  reviewCount: number;
  image?: string;
  currentCost?: number;
  reservedQty: number;
  incomingQty: number;
  damagedQty: number;
  returnedQty: number;
  reorderLevel?: number;
  reorderQty?: number;
  createdAt: string;
  updatedAt: string;
  // Relations
  priceTiers: PriceTier[];
  reviews: SupplierItemReview[];
  productWholesaleSettings?: ProductWholesaleSettings;
  productSpecifications: ProductSpecification[];
  wholesalePackaging?: WholesalePackaging;
  wholesaleShipping?: WholesaleShipping;
  wholesaleDocuments?: WholesaleDocument[];
  // Image collections for Alibaba-style product management
  images: SupplierItemImage[];
}

export interface SupplierItemReview {
  id: string;
  supplierItemId: string;
  reviewerOrgId: number;
  rating: number;
  title?: string;
  comment?: string;
  isVerifiedPurchase: boolean;
  createdAt: string;
  updatedAt: string;
  // Review images for Alibaba-style display
  images: SupplierItemReviewImage[];
}


