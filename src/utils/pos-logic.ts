import { CartItem, Discount, Product, Transaction, Refund, ActivityCategory, Role } from '../types/pos';

export interface CartCalculationResult {
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  total: number;
  totalItemsCount: number;
}

/**
 * Calculates cart subtotal, discount, tax, and final total with floating point precision guards.
 */
export function calculateCartTotals(
  items: CartItem[],
  discount: Discount | null,
  taxRatePercent: number
): CartCalculationResult {
  const subtotal = items.reduce((acc, item) => {
    return acc + Number((item.product.price * item.quantity).toFixed(2));
  }, 0);

  const roundedSubtotal = Number(subtotal.toFixed(2));
  let discountAmount = 0;

  if (discount && discount.value > 0) {
    if (discount.type === 'percentage') {
      const pct = Math.min(Math.max(discount.value, 0), 100);
      discountAmount = Number(((roundedSubtotal * pct) / 100).toFixed(2));
    } else {
      // Fixed amount discount cannot exceed subtotal
      discountAmount = Math.min(Number(discount.value.toFixed(2)), roundedSubtotal);
    }
  }

  const taxableAmount = Math.max(0, Number((roundedSubtotal - discountAmount).toFixed(2)));
  const rate = Math.max(0, taxRatePercent);
  const taxAmount = Number(((taxableAmount * rate) / 100).toFixed(2));
  const total = Number((taxableAmount + taxAmount).toFixed(2));
  const totalItemsCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    subtotal: roundedSubtotal,
    discountAmount,
    taxableAmount,
    taxAmount,
    total,
    totalItemsCount,
  };
}

/**
 * Computes the "Most Selling Products" dynamically from recorded sales data.
 * Falls back sensibly to in-stock popular products when sales data is low.
 */
export function calculateMostSellingProducts(
  products: Product[],
  transactions: Transaction[],
  limit = 12
): Product[] {
  const salesCountMap: Record<string, number> = {};

  transactions.forEach((tx) => {
    tx.items.forEach((item) => {
      salesCountMap[item.productId] = (salesCountMap[item.productId] || 0) + item.quantity;
    });
  });

  // Sort products by sales count descending
  const sorted = [...products].sort((a, b) => {
    const countA = salesCountMap[a.id] || 0;
    const countB = salesCountMap[b.id] || 0;
    if (countB !== countA) {
      return countB - countA;
    }
    // Secondary fallback: available stock or id
    return b.stock - a.stock;
  });

  return sorted.slice(0, limit);
}

/**
 * Determines whether an activity log record must have the distinctive RED border.
 * Requirement: "Apply a distinctive red border to activity entries involving manual inventory additions, manual inventory removals, and zero-stock events."
 */
export function isRedBorderActivity(
  category: ActivityCategory,
  action: string,
  details = ''
): boolean {
  if (category === 'STOCK_ADJUSTMENT') {
    return true;
  }
  const combined = `${action} ${details}`.toLowerCase();
  if (
    combined.includes('manual stock') ||
    combined.includes('stock addition') ||
    combined.includes('stock removal') ||
    combined.includes('zero stock') ||
    combined.includes('reached zero') ||
    combined.includes('out of stock')
  ) {
    return true;
  }
  return false;
}

/**
 * Checks role-based permissions in JavaScript action handlers, not merely UI hiding.
 */
export function checkPermission(
  role: Role,
  action:
    | 'ACCESS_USER_MANAGEMENT'
    | 'ACCESS_ACTIVITY_LOG'
    | 'CONFIGURE_CLOUD_SYNC'
    | 'DELETE_CUSTOMER'
    | 'ACCESS_INVENTORY'
    | 'PROCESS_REFUND'
    | 'MODIFY_SECURITY'
): boolean {
  if (role === 'Admin') {
    return true;
  }
  // Standard User
  switch (action) {
    case 'ACCESS_USER_MANAGEMENT':
    case 'ACCESS_ACTIVITY_LOG':
    case 'CONFIGURE_CLOUD_SYNC':
    case 'DELETE_CUSTOMER':
    case 'MODIFY_SECURITY':
      return false;
    case 'ACCESS_INVENTORY':
    case 'PROCESS_REFUND':
      return true; // allowed with standard workflow / PIN
    default:
      return false;
  }
}

/**
 * Validates requested refund items against an existing transaction and previous refunds.
 */
export function calculateRefundValidation(
  transaction: Transaction,
  existingRefundsForTx: Refund[],
  requestedItems: { productId: string; quantity: number; restock: boolean }[]
): {
  isValid: boolean;
  errorMessage?: string;
  refundTotal: number;
  itemsToRefund: {
    productId: string;
    productName: string;
    unitPrice: number;
    quantity: number;
    restock: boolean;
    lineRefundTotal: number;
  }[];
} {
  // Compute previously refunded quantities per product
  const refundedQtyMap: Record<string, number> = {};
  existingRefundsForTx.forEach((rf) => {
    rf.items.forEach((item) => {
      refundedQtyMap[item.productId] = (refundedQtyMap[item.productId] || 0) + item.quantity;
    });
  });

  const txItemMap = new Map(transaction.items.map((i) => [i.productId, i]));
  let refundTotal = 0;
  const itemsToRefund = [];

  for (const req of requestedItems) {
    if (req.quantity <= 0) continue;
    const orig = txItemMap.get(req.productId);
    if (!orig) {
      return { isValid: false, errorMessage: `Product ${req.productId} not found in transaction.`, refundTotal: 0, itemsToRefund: [] };
    }
    const alreadyRefunded = refundedQtyMap[req.productId] || 0;
    const maxRefundable = orig.quantity - alreadyRefunded;
    if (req.quantity > maxRefundable) {
      return {
        isValid: false,
        errorMessage: `Cannot refund ${req.quantity} of "${orig.name}". Only ${maxRefundable} item(s) eligible.`,
        refundTotal: 0,
        itemsToRefund: [],
      };
    }

    const lineRefund = Number((orig.unitPrice * req.quantity).toFixed(2));
    refundTotal = Number((refundTotal + lineRefund).toFixed(2));
    itemsToRefund.push({
      productId: req.productId,
      productName: orig.name,
      unitPrice: orig.unitPrice,
      quantity: req.quantity,
      restock: req.restock,
      lineRefundTotal: lineRefund,
    });
  }

  if (itemsToRefund.length === 0) {
    return { isValid: false, errorMessage: 'Select at least one item and quantity to refund.', refundTotal: 0, itemsToRefund: [] };
  }

  return {
    isValid: true,
    refundTotal,
    itemsToRefund,
  };
}

/**
 * Generate a consistent transaction ID and Receipt number
 */
export function generateTransactionId(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `TXN-${dateStr}-${rand}`;
}

export function generateReceiptNumber(): string {
  const seq = Math.floor(100000 + Math.random() * 900000);
  return `RCP-${seq}`;
}
