export type Role = 'Admin' | 'User';

export interface User {
  id: string;
  username: string;
  passwordHash: string; // Plain/SHA for local demo storage
  role: Role;
  status: 'active' | 'frozen';
  createdAt: number;
  lastLoginAt?: number;
}

export interface Product {
  id: string;
  name: string;
  barcode: string;
  sku: string;
  category: string;
  price: number;
  costPrice?: number;
  stock: number;
  lowStockThreshold: number;
  description: string;
  imageUrl?: string;
  createdAt: number;
  updatedAt: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export type DiscountType = 'percentage' | 'fixed';

export interface Discount {
  type: DiscountType;
  value: number; // e.g. 10 for 10% or 5 for $5
  label?: string;
}

export type PaymentMethod = 'cash' | 'card' | 'split';

export interface TransactionItem {
  productId: string;
  name: string;
  barcode: string;
  sku: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface Transaction {
  id: string;
  receiptNumber: string;
  items: TransactionItem[];
  subtotal: number;
  discountAmount: number;
  discountDetails?: Discount;
  taxRate: number; // percentage, e.g. 8 for 8%
  taxAmount: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentDetails?: {
    cashTendered?: number;
    change?: number;
    cardLast4?: string;
  };
  customerId?: string;
  customerName?: string;
  cashierId: string;
  cashierName: string;
  timestamp: number;
  status: 'completed' | 'refunded' | 'partially_refunded';
  refundedAmount: number;
  notes?: string;
}

export interface RefundItem {
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  restock: boolean;
  lineRefundTotal: number;
}

export interface Refund {
  id: string;
  transactionId: string;
  receiptNumber: string;
  items: RefundItem[];
  totalRefundAmount: number;
  reason: string;
  cashierId: string;
  cashierName: string;
  timestamp: number;
  customerId?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  createdAt: number;
  totalSpent: number;
  orderCount: number;
  isDeleted?: boolean;
}

export type ActivityCategory =
  | 'AUTH'
  | 'USER_MANAGEMENT'
  | 'INVENTORY'
  | 'STOCK_ADJUSTMENT'
  | 'CART'
  | 'SALE'
  | 'RECEIPT'
  | 'REFUND'
  | 'CUSTOMER'
  | 'SETTINGS'
  | 'HARDWARE'
  | 'CLOUD_SYNC';

export type ActivitySeverity = 'info' | 'success' | 'warning' | 'danger';

export interface ActivityRecord {
  id: string;
  timestamp: number;
  userId: string;
  username: string;
  userRole: Role;
  category: ActivityCategory;
  action: string;
  details: string;
  referenceId?: string;
  previousValue?: string;
  newValue?: string;
  isRedBorder: boolean; // Required for manual stock additions, manual stock removals, and zero-stock events
  severity: ActivitySeverity;
  device: string;
  location?: string;
  syncStatus?: 'local' | 'synced';
}

export interface AppSettings {
  storeName: string;
  storeAddress: string;
  storePhone: string;
  storeEmail: string;
  currencySymbol: string;
  taxRate: number; // percentage
  receiptFooter: string;
  inventoryPin: string;
  paperWidth: '58mm' | '80mm';
  theme: 'light' | 'dark';
  googleSheetsUrl?: string;
  googleSheetsAutoSync: boolean;
  lastSyncedAt?: number;
  hardwareScannerConnected: boolean;
  hardwarePrinterConnected: boolean;
  hardwareDrawerConnected: boolean;
}
