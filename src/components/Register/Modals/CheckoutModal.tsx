import React, { useState } from 'react';
import { CartItem, Customer, Discount, PaymentMethod, Transaction, Product } from '../../../types/pos';
import { StorageService } from '../../../utils/storage';
import { generateTransactionId, generateReceiptNumber } from '../../../utils/pos-logic';
import { X, CreditCard, Banknote, Split, CheckCircle2, ShieldCheck } from 'lucide-react';

interface CheckoutModalProps {
  cart: CartItem[];
  subtotal: number;
  discount: Discount | null;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  customer: Customer | null;
  cashierUser: { id: string; username: string; role: 'Admin' | 'User' };
  currencySymbol: string;
  onClose: () => void;
  onCheckoutSuccess: (transaction: Transaction) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  cart,
  subtotal,
  discount,
  discountAmount,
  taxRate,
  taxAmount,
  total,
  customer,
  cashierUser,
  currencySymbol,
  onClose,
  onCheckoutSuccess,
}) => {
  const [method, setMethod] = useState<PaymentMethod>('card');
  const [tenderedInput, setTenderedInput] = useState<string>(Math.ceil(total).toString());
  const [cardDigits, setCardDigits] = useState<string>('4242');
  const [splitCash, setSplitCash] = useState<string>((total / 2).toFixed(2));
  const [splitCard, setSplitCard] = useState<string>((total / 2).toFixed(2));
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tenderedAmount = parseFloat(tenderedInput) || 0;
  const changeDue = Math.max(0, Number((tenderedAmount - total).toFixed(2)));

  const handleQuickTender = (amt: number) => {
    setTenderedInput(amt.toString());
  };

  const handleProcessSale = () => {
    setError(null);

    // Validate Payment
    if (method === 'cash') {
      if (tenderedAmount < total) {
        setError(`Tendered cash (${currencySymbol}${tenderedAmount.toFixed(2)}) is less than total due (${currencySymbol}${total.toFixed(2)}).`);
        return;
      }
    } else if (method === 'split') {
      const c = parseFloat(splitCash) || 0;
      const cd = parseFloat(splitCard) || 0;
      if (Math.abs(c + cd - total) > 0.05) {
        setError(`Split amounts (${currencySymbol}${(c + cd).toFixed(2)}) must equal order total (${currencySymbol}${total.toFixed(2)}).`);
        return;
      }
    }

    // Verify stock availability once more
    const products = StorageService.getProducts();
    const productMap = new Map(products.map((p) => [p.id, p]));

    for (const item of cart) {
      const currentProd = productMap.get(item.product.id);
      if (!currentProd || currentProd.stock < item.quantity) {
        setError(`Inventory error: "${item.product.name}" has only ${currentProd?.stock || 0} units left in stock.`);
        return;
      }
    }

    setIsProcessing(true);

    setTimeout(() => {
      // 1. Deduct stock quantities and check for zero-stock / low-stock triggers
      const updatedProducts = products.map((p) => {
        const cartMatch = cart.find((c) => c.product.id === p.id);
        if (cartMatch) {
          const newStock = p.stock - cartMatch.quantity;
          const updatedP: Product = {
            ...p,
            stock: newStock,
            updatedAt: Date.now(),
          };

          // If stock reaches zero, log zero stock event with distinctive red border
          if (newStock === 0) {
            StorageService.logActivity(
              cashierUser,
              'INVENTORY',
              'Product reached zero stock',
              `Stock for "${p.name}" reached 0 after sale. Restock needed.`,
              {
                referenceId: p.id,
                previousValue: `${p.stock} units`,
                newValue: '0 units',
                severity: 'danger',
                forcedRedBorder: true,
              }
            );
          } else if (newStock <= p.lowStockThreshold) {
            StorageService.logActivity(
              cashierUser,
              'INVENTORY',
              'Low stock threshold reached',
              `Stock for "${p.name}" is low (${newStock} remaining).`,
              { referenceId: p.id, severity: 'warning' }
            );
          }

          return updatedP;
        }
        return p;
      });

      StorageService.saveProducts(updatedProducts);

      // 2. Create Transaction Record
      const txnId = generateTransactionId();
      const receiptNo = generateReceiptNumber();

      const newTxn: Transaction = {
        id: txnId,
        receiptNumber: receiptNo,
        items: cart.map((c) => ({
          productId: c.product.id,
          name: c.product.name,
          barcode: c.product.barcode,
          sku: c.product.sku,
          unitPrice: c.product.price,
          quantity: c.quantity,
          lineTotal: Number((c.product.price * c.quantity).toFixed(2)),
        })),
        subtotal,
        discountAmount,
        discountDetails: discount || undefined,
        taxRate,
        taxAmount,
        total,
        paymentMethod: method,
        paymentDetails: {
          cashTendered: method === 'cash' ? tenderedAmount : undefined,
          change: method === 'cash' ? changeDue : undefined,
          cardLast4: method !== 'cash' ? cardDigits : undefined,
        },
        customerId: customer?.id,
        customerName: customer?.name,
        cashierId: cashierUser.id,
        cashierName: cashierUser.username,
        timestamp: Date.now(),
        status: 'completed',
        refundedAmount: 0,
      };

      const transactions = StorageService.getTransactions();
      StorageService.saveTransactions([newTxn, ...transactions]);

      // 3. Update Customer records if assigned
      if (customer) {
        const customers = StorageService.getAllCustomersIncludingDeleted();
        const updatedCustomers = customers.map((c) => {
          if (c.id === customer.id) {
            return {
              ...c,
              totalSpent: Number((c.totalSpent + total).toFixed(2)),
              orderCount: c.orderCount + 1,
            };
          }
          return c;
        });
        StorageService.saveCustomers(updatedCustomers);
      }

      // 4. Log Activity
      StorageService.logActivity(
        cashierUser,
        'SALE',
        `Sale completed ${newTxn.receiptNumber}`,
        `Processed ${currencySymbol}${total.toFixed(2)} (${method.toUpperCase()}) for ${cart.reduce((s, i) => s + i.quantity, 0)} items.`,
        {
          referenceId: newTxn.id,
          severity: 'success',
          newValue: `${currencySymbol}${total.toFixed(2)}`,
        }
      );

      setIsProcessing(false);
      onCheckoutSuccess(newTxn);
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <div>
            <h3 className="font-bold text-gray-900 text-lg">Checkout Order</h3>
            <p className="text-xs text-gray-500">
              {cart.reduce((s, i) => s + i.quantity, 0)} items • Customer:{' '}
              <span className="font-medium text-gray-700">{customer ? customer.name : 'Walk-in'}</span>
            </p>
          </div>
          <button onClick={onClose} disabled={isProcessing} className="text-gray-400 hover:text-gray-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          {/* Total Due Banner */}
          <div className="p-4 bg-[#f4f6f8] border border-gray-200 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-xs uppercase font-bold text-gray-500 tracking-wider">Amount Due</span>
              <p className="text-2xl font-black text-[#202223]">
                {currencySymbol}
                {total.toFixed(2)}
              </p>
            </div>
            {discountAmount > 0 && (
              <div className="text-right">
                <span className="text-xs text-emerald-700 font-semibold bg-emerald-100 px-2 py-0.5 rounded">
                  Discount: -{currencySymbol}
                  {discountAmount.toFixed(2)}
                </span>
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
              {error}
            </div>
          )}

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              Select Payment Method
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setMethod('card')}
                className={`py-3 px-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                  method === 'card'
                    ? 'border-[#008060] bg-emerald-50/60 text-[#008060] font-bold shadow-xs'
                    : 'border-gray-200 text-gray-700 hover:bg-gray-50 font-medium'
                }`}
              >
                <CreditCard className="w-5 h-5" />
                <span className="text-xs">Credit / Debit Card</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod('cash')}
                className={`py-3 px-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                  method === 'cash'
                    ? 'border-[#008060] bg-emerald-50/60 text-[#008060] font-bold shadow-xs'
                    : 'border-gray-200 text-gray-700 hover:bg-gray-50 font-medium'
                }`}
              >
                <Banknote className="w-5 h-5" />
                <span className="text-xs">Cash</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod('split')}
                className={`py-3 px-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                  method === 'split'
                    ? 'border-[#008060] bg-emerald-50/60 text-[#008060] font-bold shadow-xs'
                    : 'border-gray-200 text-gray-700 hover:bg-gray-50 font-medium'
                }`}
              >
                <Split className="w-5 h-5" />
                <span className="text-xs">Split Payment</span>
              </button>
            </div>
          </div>

          {/* Cash Details */}
          {method === 'cash' && (
            <div className="space-y-3 p-4 bg-gray-50 border border-gray-200 rounded-xl">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Cash Tendered ({currencySymbol})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min={total.toString()}
                  value={tenderedInput}
                  onChange={(e) => setTenderedInput(e.target.value)}
                  className="w-full px-3 py-2 text-lg font-bold border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#008060]"
                />
              </div>

              {/* Quick cash presets */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickTender(total)}
                  className="px-2.5 py-1.5 text-xs font-medium bg-white border border-gray-300 rounded-md hover:bg-gray-100"
                >
                  Exact ({currencySymbol}
                  {total.toFixed(2)})
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickTender(Math.ceil(total / 10) * 10)}
                  className="px-2.5 py-1.5 text-xs font-medium bg-white border border-gray-300 rounded-md hover:bg-gray-100"
                >
                  {currencySymbol}
                  {Math.ceil(total / 10) * 10}
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickTender(50)}
                  className="px-2.5 py-1.5 text-xs font-medium bg-white border border-gray-300 rounded-md hover:bg-gray-100"
                >
                  {currencySymbol}50
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickTender(100)}
                  className="px-2.5 py-1.5 text-xs font-medium bg-white border border-gray-300 rounded-md hover:bg-gray-100"
                >
                  {currencySymbol}100
                </button>
              </div>

              {/* Change due calculation */}
              <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                <span className="text-xs font-semibold text-gray-600">Change to Return:</span>
                <span className="text-lg font-bold text-emerald-700">
                  {currencySymbol}
                  {changeDue.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* Card Details */}
          {method === 'card' && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-800">
                <ShieldCheck className="w-4 h-4 text-[#008060]" />
                <span>Simulated Integrated Card Reader Ready</span>
              </div>
              <p className="text-[11px] text-gray-500">
                Customer can tap, insert chip, or swipe on external payment hardware terminal.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <label className="text-xs text-gray-600">Simulate Card Last 4:</label>
                <input
                  type="text"
                  maxLength={4}
                  value={cardDigits}
                  onChange={(e) => setCardDigits(e.target.value)}
                  className="w-16 px-2 py-1 text-xs font-mono font-bold text-center border border-gray-300 rounded bg-white"
                />
              </div>
            </div>
          )}

          {/* Split Details */}
          {method === 'split' && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Cash Portion ({currencySymbol})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={splitCash}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setSplitCash(e.target.value);
                      setSplitCard(Math.max(0, total - val).toFixed(2));
                    }}
                    className="w-full px-3 py-1.5 text-sm font-semibold border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Card Portion ({currencySymbol})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={splitCard}
                    onChange={(e) => setSplitCard(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm font-semibold border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              <p className="text-[11px] text-gray-500">
                Total must match {currencySymbol}
                {total.toFixed(2)}
              </p>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="p-4 border-t border-gray-200 bg-white flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleProcessSale}
            disabled={isProcessing}
            className="px-6 py-2.5 text-sm font-bold text-white bg-[#008060] hover:bg-[#006e52] rounded-lg shadow-sm flex items-center gap-2 transition-all disabled:opacity-50"
          >
            {isProcessing ? (
              <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Complete Payment ({currencySymbol}{total.toFixed(2)})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
