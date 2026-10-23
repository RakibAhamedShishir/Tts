import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCartTotals,
  calculateMostSellingProducts,
  isRedBorderActivity,
  checkPermission,
  calculateRefundValidation,
} from './pos-logic';
import { Product, CartItem, Transaction, Refund } from '../types/pos';

const dummyProduct1: Product = {
  id: 'prod-1',
  name: 'Organic Espresso Beans 1kg',
  barcode: '8901234567890',
  sku: 'COF-001',
  category: 'Beverage',
  price: 24.5,
  costPrice: 12.0,
  stock: 15,
  lowStockThreshold: 5,
  description: 'Fair trade organic dark roast',
  createdAt: 1000,
  updatedAt: 1000,
};

const dummyProduct2: Product = {
  id: 'prod-2',
  name: 'Ceramic Pour Over Mug',
  barcode: '8901234567891',
  sku: 'ACC-002',
  category: 'Accessories',
  price: 15.0,
  costPrice: 6.0,
  stock: 8,
  lowStockThreshold: 3,
  description: 'Handcrafted stoneware',
  createdAt: 1000,
  updatedAt: 1000,
};

test('calculateCartTotals calculates subtotal, percentage discount, and tax correctly', () => {
  const items: CartItem[] = [
    { product: dummyProduct1, quantity: 2 }, // 2 * 24.50 = 49.00
    { product: dummyProduct2, quantity: 1 }, // 1 * 15.00 = 15.00
  ];
  // Subtotal = 64.00
  // Discount 10% = 6.40
  // Taxable = 57.60
  // Tax 8% = 4.61 (57.60 * 0.08 = 4.608 -> 4.61)
  // Total = 62.21
  const result = calculateCartTotals(items, { type: 'percentage', value: 10 }, 8);

  assert.equal(result.subtotal, 64.0);
  assert.equal(result.discountAmount, 6.4);
  assert.equal(result.taxableAmount, 57.6);
  assert.equal(result.taxAmount, 4.61);
  assert.equal(result.total, 62.21);
  assert.equal(result.totalItemsCount, 3);
});

test('calculateCartTotals handles fixed discount and prevents negative taxable amount', () => {
  const items: CartItem[] = [
    { product: dummyProduct2, quantity: 1 }, // 15.00
  ];
  // If fixed discount is $20 (greater than $15 subtotal), it should cap at $15
  const result = calculateCartTotals(items, { type: 'fixed', value: 20 }, 10);

  assert.equal(result.subtotal, 15.0);
  assert.equal(result.discountAmount, 15.0);
  assert.equal(result.taxableAmount, 0);
  assert.equal(result.taxAmount, 0);
  assert.equal(result.total, 0);
});

test('calculateMostSellingProducts orders products by historical quantity sold', () => {
  const products: Product[] = [dummyProduct1, dummyProduct2];
  const transactions: Transaction[] = [
    {
      id: 'tx-1',
      receiptNumber: 'RCP-1',
      items: [
        {
          productId: 'prod-2',
          name: dummyProduct2.name,
          barcode: dummyProduct2.barcode,
          sku: dummyProduct2.sku,
          unitPrice: 15.0,
          quantity: 10,
          lineTotal: 150.0,
        },
        {
          productId: 'prod-1',
          name: dummyProduct1.name,
          barcode: dummyProduct1.barcode,
          sku: dummyProduct1.sku,
          unitPrice: 24.5,
          quantity: 2,
          lineTotal: 49.0,
        },
      ],
      subtotal: 199.0,
      discountAmount: 0,
      taxRate: 0,
      taxAmount: 0,
      total: 199.0,
      paymentMethod: 'cash',
      cashierId: 'u1',
      cashierName: 'Admin',
      timestamp: Date.now(),
      status: 'completed',
      refundedAmount: 0,
    },
  ];

  const topProducts = calculateMostSellingProducts(products, transactions);
  // dummyProduct2 sold 10 units, dummyProduct1 sold 2 units
  assert.equal(topProducts[0].id, 'prod-2');
  assert.equal(topProducts[1].id, 'prod-1');
});

test('isRedBorderActivity flags manual stock additions, removals, and zero-stock events', () => {
  // Stock adjustment category must be red bordered
  assert.equal(isRedBorderActivity('STOCK_ADJUSTMENT', 'Manual stock addition'), true);
  assert.equal(isRedBorderActivity('STOCK_ADJUSTMENT', 'Stock removed'), true);
  // Zero-stock / out of stock in inventory or sales
  assert.equal(isRedBorderActivity('INVENTORY', 'Product reached zero stock'), true);
  assert.equal(isRedBorderActivity('SALE', 'Product stock reached zero after sale'), true);
  // Normal sale or customer should not be red bordered
  assert.equal(isRedBorderActivity('SALE', 'Sale completed TXN-101'), false);
  assert.equal(isRedBorderActivity('AUTH', 'User login'), false);
});

test('checkPermission properly gates Admin vs User roles', () => {
  assert.equal(checkPermission('Admin', 'ACCESS_USER_MANAGEMENT'), true);
  assert.equal(checkPermission('Admin', 'ACCESS_ACTIVITY_LOG'), true);
  assert.equal(checkPermission('Admin', 'CONFIGURE_CLOUD_SYNC'), true);

  assert.equal(checkPermission('User', 'ACCESS_USER_MANAGEMENT'), false);
  assert.equal(checkPermission('User', 'ACCESS_ACTIVITY_LOG'), false);
  assert.equal(checkPermission('User', 'CONFIGURE_CLOUD_SYNC'), false);
  assert.equal(checkPermission('User', 'ACCESS_INVENTORY'), true);
});

test('calculateRefundValidation prevents refunds greater than original quantities', () => {
  const transaction: Transaction = {
    id: 'tx-100',
    receiptNumber: 'RCP-100',
    items: [
      {
        productId: 'prod-1',
        name: dummyProduct1.name,
        barcode: dummyProduct1.barcode,
        sku: dummyProduct1.sku,
        unitPrice: 20.0,
        quantity: 3,
        lineTotal: 60.0,
      },
    ],
    subtotal: 60.0,
    discountAmount: 0,
    taxRate: 0,
    taxAmount: 0,
    total: 60.0,
    paymentMethod: 'card',
    cashierId: 'u1',
    cashierName: 'Admin',
    timestamp: 1000,
    status: 'completed',
    refundedAmount: 0,
  };

  const existingRefunds: Refund[] = [
    {
      id: 'ref-1',
      transactionId: 'tx-100',
      receiptNumber: 'RCP-100',
      items: [
        {
          productId: 'prod-1',
          productName: dummyProduct1.name,
          unitPrice: 20.0,
          quantity: 2,
          restock: true,
          lineRefundTotal: 40.0,
        },
      ],
      totalRefundAmount: 40.0,
      reason: 'Defective item',
      cashierId: 'u1',
      cashierName: 'Admin',
      timestamp: 2000,
    },
  ];

  // Trying to refund 2 more when only 1 is remaining (3 total - 2 refunded = 1)
  const invalidResult = calculateRefundValidation(transaction, existingRefunds, [
    { productId: 'prod-1', quantity: 2, restock: true },
  ]);
  assert.equal(invalidResult.isValid, false);

  // Trying to refund 1 valid remaining unit
  const validResult = calculateRefundValidation(transaction, existingRefunds, [
    { productId: 'prod-1', quantity: 1, restock: true },
  ]);
  assert.equal(validResult.isValid, true);
  assert.equal(validResult.refundTotal, 20.0);
  assert.equal(validResult.itemsToRefund.length, 1);
});
