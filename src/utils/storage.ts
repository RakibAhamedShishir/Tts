import {
  User,
  Product,
  Customer,
  Transaction,
  Refund,
  ActivityRecord,
  AppSettings,
  ActivityCategory,
  ActivitySeverity,
} from '../types/pos';
import { isRedBorderActivity } from './pos-logic';

const STORAGE_KEYS = {
  USERS: 'shopify_pos_users',
  PRODUCTS: 'shopify_pos_products',
  CUSTOMERS: 'shopify_pos_customers',
  TRANSACTIONS: 'shopify_pos_transactions',
  REFUNDS: 'shopify_pos_refunds',
  ACTIVITY_LOG: 'shopify_pos_activity_log',
  SETTINGS: 'shopify_pos_settings',
  ACTIVE_SESSION: 'shopify_pos_active_session',
  INVENTORY_AUTH_SESSION: 'shopify_pos_inventory_pin_unlocked',
};

export function getDeviceDetails(): string {
  if (typeof window === 'undefined') return 'Server';
  const ua = navigator.userAgent;
  let browser = 'Browser';
  if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('SamsungBrowser')) browser = 'Samsung Internet';
  else if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Safari')) browser = 'Safari';
  else if (ua.includes('Edge')) browser = 'Edge';

  let os = 'OS';
  if (ua.includes('Win')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('like Mac')) os = 'iOS';

  const isMobile = /Mobi|Android/i.test(ua);
  const deviceType = isMobile ? 'Mobile' : 'Desktop/Tablet';

  return `${browser} on ${os} (${deviceType})`;
}

const INITIAL_USERS: User[] = [
  {
    id: 'user-admin',
    username: 'Admin',
    passwordHash: 'admin123',
    role: 'Admin',
    status: 'active',
    createdAt: Date.now() - 86400000 * 30,
  },
  {
    id: 'user-cashier1',
    username: 'Cashier1',
    passwordHash: 'cashier123',
    role: 'User',
    status: 'active',
    createdAt: Date.now() - 86400000 * 15,
  },
];

const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-101',
    name: 'Organic Espresso Beans 1kg',
    barcode: '793573192011',
    sku: 'BEV-ESP-01',
    category: 'Beverage',
    price: 24.5,
    costPrice: 11.5,
    stock: 22,
    lowStockThreshold: 6,
    description: 'Direct-trade whole bean dark roast with notes of cocoa and toasted caramel.',
    createdAt: Date.now() - 86400000 * 20,
    updatedAt: Date.now() - 86400000 * 5,
  },
  {
    id: 'prod-102',
    name: 'Nitro Cold Brew Can 330ml',
    barcode: '793573192028',
    sku: 'BEV-NIT-02',
    category: 'Beverage',
    price: 4.95,
    costPrice: 2.1,
    stock: 36,
    lowStockThreshold: 10,
    description: 'Smooth, creamy draft cold brew nitrogen-infused in aluminum sleek can.',
    createdAt: Date.now() - 86400000 * 20,
    updatedAt: Date.now() - 86400000 * 3,
  },
  {
    id: 'prod-103',
    name: 'Artisan Sourdough Loaf',
    barcode: '793573192035',
    sku: 'FOD-SDR-01',
    category: 'Food',
    price: 8.5,
    costPrice: 3.2,
    stock: 14,
    lowStockThreshold: 5,
    description: 'Naturally fermented 36-hour sourdough boule with crisp golden crust.',
    createdAt: Date.now() - 86400000 * 20,
    updatedAt: Date.now() - 86400000 * 1,
  },
  {
    id: 'prod-104',
    name: 'Butter Almond Croissant',
    barcode: '793573192042',
    sku: 'FOD-CRS-02',
    category: 'Food',
    price: 4.75,
    costPrice: 1.8,
    stock: 18,
    lowStockThreshold: 5,
    description: 'Twice-baked French pastry filled with rich frangipane almond cream.',
    createdAt: Date.now() - 86400000 * 20,
    updatedAt: Date.now() - 86400000 * 2,
  },
  {
    id: 'prod-105',
    name: 'Ceramic Pour Over Dripper v60',
    barcode: '793573192059',
    sku: 'ACC-POD-01',
    category: 'Accessories',
    price: 29.5,
    costPrice: 14.0,
    stock: 9,
    lowStockThreshold: 4,
    description: 'Heat-retaining matte ceramic cone for precise manual coffee brewing.',
    createdAt: Date.now() - 86400000 * 20,
    updatedAt: Date.now() - 86400000 * 4,
  },
  {
    id: 'prod-106',
    name: 'Double Wall Borosilicate Tumbler',
    barcode: '793573192066',
    sku: 'ACC-TMB-02',
    category: 'Accessories',
    price: 19.95,
    costPrice: 8.5,
    stock: 15,
    lowStockThreshold: 5,
    description: 'Thermal insulated glass tumbler with spill-resistant bamboo lid.',
    createdAt: Date.now() - 86400000 * 20,
    updatedAt: Date.now() - 86400000 * 8,
  },
  {
    id: 'prod-107',
    name: 'Barista Precision Digital Scale',
    barcode: '793573192073',
    sku: 'ACC-SCL-03',
    category: 'Accessories',
    price: 45.0,
    costPrice: 21.0,
    stock: 2, // Low stock threshold trigger demo
    lowStockThreshold: 3,
    description: '0.1g accuracy timer scale for espresso extraction and pour-overs.',
    createdAt: Date.now() - 86400000 * 20,
    updatedAt: Date.now() - 86400000 * 6,
  },
  {
    id: 'prod-108',
    name: 'Leather Artisan Mug Sleeve',
    barcode: '793573192080',
    sku: 'ACC-LEA-04',
    category: 'Accessories',
    price: 22.0,
    costPrice: 9.0,
    stock: 0, // Out of stock trigger demo
    lowStockThreshold: 3,
    description: 'Hand-stitched vegetable tanned full grain leather grip.',
    createdAt: Date.now() - 86400000 * 20,
    updatedAt: Date.now() - 86400000 * 1,
  },
  {
    id: 'prod-109',
    name: 'Ceramic Oat Milk Matcha Latte',
    barcode: '793573192097',
    sku: 'BEV-MTC-03',
    category: 'Beverage',
    price: 6.25,
    costPrice: 2.3,
    stock: 25,
    lowStockThreshold: 6,
    description: 'Ceremonial Uji matcha whisked fresh with barista oat milk.',
    createdAt: Date.now() - 86400000 * 20,
    updatedAt: Date.now() - 86400000 * 2,
  },
  {
    id: 'prod-110',
    name: 'Avocado Toast with Poached Egg',
    barcode: '793573192103',
    sku: 'FOD-AVO-03',
    category: 'Food',
    price: 12.5,
    costPrice: 4.8,
    stock: 20,
    lowStockThreshold: 5,
    description: 'Hass avocado mash, heirloom radish, chili flakes on toasted sourdough.',
    createdAt: Date.now() - 86400000 * 20,
    updatedAt: Date.now() - 86400000 * 1,
  },
];

const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'cust-1',
    name: 'Sarah Jenkins',
    phone: '+1 (555) 234-5678',
    email: 'sarah.jenkins@example.com',
    address: '142 Pine Street, Apt 4B',
    notes: 'Prefers oat milk in all drinks. Regular morning patron.',
    createdAt: Date.now() - 86400000 * 45,
    totalSpent: 142.5,
    orderCount: 6,
  },
  {
    id: 'cust-2',
    name: 'Michael Chang',
    phone: '+1 (555) 876-5432',
    email: 'm.chang@workspace.dev',
    address: '88 Tech Boulevard, Floor 12',
    notes: 'Corporate catering buyer. Always requests receipts.',
    createdAt: Date.now() - 86400000 * 30,
    totalSpent: 310.25,
    orderCount: 4,
  },
  {
    id: 'cust-3',
    name: 'Emma Wilson',
    phone: '+1 (555) 432-1098',
    email: 'emma.wilson@studio.art',
    address: '500 Craft Lane, Studio 3',
    notes: 'Local ceramics artist.',
    createdAt: Date.now() - 86400000 * 15,
    totalSpent: 68.75,
    orderCount: 2,
  },
];

const INITIAL_SETTINGS: AppSettings = {
  storeName: 'Shopify Merchant Store',
  storeAddress: '742 Market Street, Suite 400, San Francisco, CA',
  storePhone: '+1 (415) 555-0199',
  storeEmail: 'pos-support@merchant.shopify',
  currencySymbol: '$',
  taxRate: 8.5,
  receiptFooter: 'Thank you for shopping with us! Returns accepted within 30 days with receipt.',
  inventoryPin: '1111',
  paperWidth: '80mm',
  theme: 'light',
  googleSheetsUrl: '',
  googleSheetsAutoSync: false,
  hardwareScannerConnected: true,
  hardwarePrinterConnected: true,
  hardwareDrawerConnected: true,
};

const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'TXN-20261020-4102',
    receiptNumber: 'RCP-519283',
    items: [
      {
        productId: 'prod-101',
        name: 'Organic Espresso Beans 1kg',
        barcode: '793573192011',
        sku: 'BEV-ESP-01',
        unitPrice: 24.5,
        quantity: 2,
        lineTotal: 49.0,
      },
      {
        productId: 'prod-104',
        name: 'Butter Almond Croissant',
        barcode: '793573192042',
        sku: 'FOD-CRS-02',
        unitPrice: 4.75,
        quantity: 2,
        lineTotal: 9.5,
      },
    ],
    subtotal: 58.5,
    discountAmount: 0,
    taxRate: 8.5,
    taxAmount: 4.97,
    total: 63.47,
    paymentMethod: 'card',
    paymentDetails: { cardLast4: '4242' },
    customerId: 'cust-1',
    customerName: 'Sarah Jenkins',
    cashierId: 'user-admin',
    cashierName: 'Admin',
    timestamp: Date.now() - 86400000 * 2,
    status: 'completed',
    refundedAmount: 0,
  },
  {
    id: 'TXN-20261022-8921',
    receiptNumber: 'RCP-892104',
    items: [
      {
        productId: 'prod-102',
        name: 'Nitro Cold Brew Can 330ml',
        barcode: '793573192028',
        sku: 'BEV-NIT-02',
        unitPrice: 4.95,
        quantity: 4,
        lineTotal: 19.8,
      },
      {
        productId: 'prod-103',
        name: 'Artisan Sourdough Loaf',
        barcode: '793573192035',
        sku: 'FOD-SDR-01',
        unitPrice: 8.5,
        quantity: 1,
        lineTotal: 8.5,
      },
    ],
    subtotal: 28.3,
    discountAmount: 2.83,
    discountDetails: { type: 'percentage', value: 10, label: '10% OFF' },
    taxRate: 8.5,
    taxAmount: 2.16,
    total: 27.63,
    paymentMethod: 'cash',
    paymentDetails: { cashTendered: 30.0, change: 2.37 },
    cashierId: 'user-cashier1',
    cashierName: 'Cashier1',
    timestamp: Date.now() - 86400000 * 1,
    status: 'completed',
    refundedAmount: 0,
  },
];

const INITIAL_LOGS: ActivityRecord[] = [
  {
    id: 'log-seed-1',
    timestamp: Date.now() - 86400000 * 2,
    userId: 'user-admin',
    username: 'Admin',
    userRole: 'Admin',
    category: 'AUTH',
    action: 'System initialized',
    details: 'Shopify POS database initialized with default Admin user',
    severity: 'info',
    isRedBorder: false,
    device: getDeviceDetails(),
    syncStatus: 'local',
  },
  {
    id: 'log-seed-2',
    timestamp: Date.now() - 86400000 * 2,
    userId: 'user-admin',
    username: 'Admin',
    userRole: 'Admin',
    category: 'SALE',
    action: 'Sale completed TXN-20261020-4102',
    details: 'Completed $63.47 card checkout for Sarah Jenkins',
    referenceId: 'TXN-20261020-4102',
    severity: 'success',
    isRedBorder: false,
    device: getDeviceDetails(),
    syncStatus: 'local',
  },
  {
    id: 'log-seed-3',
    timestamp: Date.now() - 86400000 * 1,
    userId: 'user-admin',
    username: 'Admin',
    userRole: 'Admin',
    category: 'STOCK_ADJUSTMENT',
    action: 'Manual stock removal',
    details: 'Removed 1 unit of Leather Artisan Mug Sleeve (Damaged during display)',
    referenceId: 'prod-108',
    previousValue: '1',
    newValue: '0',
    severity: 'danger',
    isRedBorder: true, // Red border event
    device: getDeviceDetails(),
    syncStatus: 'local',
  },
];

// Helper to safely read and parse localStorage
function getLocalItem<T>(key: string, defaultValue: T): T {
  try {
    const val = localStorage.getItem(key);
    if (!val) return defaultValue;
    return JSON.parse(val) as T;
  } catch (err) {
    console.error(`Error reading ${key} from storage:`, err);
    return defaultValue;
  }
}

function setLocalItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Error writing ${key} to storage:`, err);
  }
}

export const StorageService = {
  // Initialization
  initStorage() {
    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
      setLocalItem(STORAGE_KEYS.USERS, INITIAL_USERS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.PRODUCTS)) {
      setLocalItem(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.CUSTOMERS)) {
      setLocalItem(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)) {
      setLocalItem(STORAGE_KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.REFUNDS)) {
      setLocalItem(STORAGE_KEYS.REFUNDS, []);
    }
    if (!localStorage.getItem(STORAGE_KEYS.ACTIVITY_LOG)) {
      setLocalItem(STORAGE_KEYS.ACTIVITY_LOG, INITIAL_LOGS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
      setLocalItem(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
    }
  },

  // Auth / Sessions
  getActiveSession(): User | null {
    const session = getLocalItem<User | null>(STORAGE_KEYS.ACTIVE_SESSION, null);
    if (!session) return null;
    // Check if user has become frozen in db
    const users = this.getUsers();
    const current = users.find((u) => u.id === session.id);
    if (!current || current.status === 'frozen') {
      this.clearActiveSession();
      return null;
    }
    return current;
  },

  setActiveSession(user: User | null) {
    if (user) {
      setLocalItem(STORAGE_KEYS.ACTIVE_SESSION, user);
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);
    }
  },

  clearActiveSession() {
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);
    localStorage.removeItem(STORAGE_KEYS.INVENTORY_AUTH_SESSION);
  },

  // Users
  getUsers(): User[] {
    return getLocalItem<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
  },

  saveUsers(users: User[]) {
    setLocalItem(STORAGE_KEYS.USERS, users);
  },

  // Products
  getProducts(): Product[] {
    return getLocalItem<Product[]>(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
  },

  saveProducts(products: Product[]) {
    setLocalItem(STORAGE_KEYS.PRODUCTS, products);
  },

  // Customers
  getCustomers(): Customer[] {
    return getLocalItem<Customer[]>(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS).filter((c) => !c.isDeleted);
  },

  getAllCustomersIncludingDeleted(): Customer[] {
    return getLocalItem<Customer[]>(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
  },

  saveCustomers(customers: Customer[]) {
    setLocalItem(STORAGE_KEYS.CUSTOMERS, customers);
  },

  // Transactions
  getTransactions(): Transaction[] {
    return getLocalItem<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS);
  },

  saveTransactions(transactions: Transaction[]) {
    setLocalItem(STORAGE_KEYS.TRANSACTIONS, transactions);
  },

  // Refunds
  getRefunds(): Refund[] {
    return getLocalItem<Refund[]>(STORAGE_KEYS.REFUNDS, []);
  },

  saveRefunds(refunds: Refund[]) {
    setLocalItem(STORAGE_KEYS.REFUNDS, refunds);
  },

  // Activity Logs
  getActivityLogs(): ActivityRecord[] {
    return getLocalItem<ActivityRecord[]>(STORAGE_KEYS.ACTIVITY_LOG, INITIAL_LOGS);
  },

  logActivity(
    user: { id: string; username: string; role: 'Admin' | 'User' },
    category: ActivityCategory,
    action: string,
    details: string,
    options?: {
      referenceId?: string;
      previousValue?: string;
      newValue?: string;
      severity?: ActivitySeverity;
      forcedRedBorder?: boolean;
    }
  ) {
    const logs = this.getActivityLogs();
    const isRed = options?.forcedRedBorder ?? isRedBorderActivity(category, action, details);

    const newRecord: ActivityRecord = {
      id: `act-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: Date.now(),
      userId: user.id,
      username: user.username,
      userRole: user.role,
      category,
      action,
      details,
      referenceId: options?.referenceId,
      previousValue: options?.previousValue,
      newValue: options?.newValue,
      isRedBorder: isRed,
      severity: options?.severity || (isRed ? 'danger' : 'info'),
      device: getDeviceDetails(),
      syncStatus: 'local',
    };

    logs.unshift(newRecord);
    // Keep last 1000 records to prevent memory exhaustion
    if (logs.length > 1000) {
      logs.length = 1000;
    }
    setLocalItem(STORAGE_KEYS.ACTIVITY_LOG, logs);
    return newRecord;
  },

  // Settings
  getSettings(): AppSettings {
    return getLocalItem<AppSettings>(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
  },

  saveSettings(settings: AppSettings) {
    setLocalItem(STORAGE_KEYS.SETTINGS, settings);
  },

  // Inventory PIN unlocked session flag
  isInventoryUnlocked(): boolean {
    return sessionStorage.getItem(STORAGE_KEYS.INVENTORY_AUTH_SESSION) === 'true';
  },

  setInventoryUnlocked(val: boolean) {
    if (val) {
      sessionStorage.setItem(STORAGE_KEYS.INVENTORY_AUTH_SESSION, 'true');
    } else {
      sessionStorage.removeItem(STORAGE_KEYS.INVENTORY_AUTH_SESSION);
    }
  },

  // Reset demo data
  resetToFactoryDefaults() {
    localStorage.clear();
    sessionStorage.clear();
    this.initStorage();
  },
};
