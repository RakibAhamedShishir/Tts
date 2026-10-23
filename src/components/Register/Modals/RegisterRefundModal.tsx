import React, { useState } from 'react';
import { Transaction, Refund, AppSettings, Product } from '../../../types/pos';
import { StorageService } from '../../../utils/storage';
import { calculateRefundValidation } from '../../../utils/pos-logic';
import { X, Search, RotateCcw, AlertTriangle, CheckCircle, Package } from 'lucide-react';

interface RegisterRefundModalProps {
  onClose: () => void;
  onRefundCompleted: (refund: Refund, originalTx: Transaction) => void;
  cashierUser: { id: string; username: string; role: 'Admin' | 'User' };
  settings: AppSettings;
}

export const RegisterRefundModal: React.FC<RegisterRefundModalProps> = ({
  onClose,
  onRefundCompleted,
  cashierUser,
  settings,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [transactions] = useState<Transaction[]>(() => StorageService.getTransactions());
  const [allRefunds, setAllRefunds] = useState<Refund[]>(() => StorageService.getRefunds());
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  // Refund builder state
  const [itemSelections, setItemSelections] = useState<
    Record<string, { quantity: number; restock: boolean }>
  >({});
  const [refundReason, setRefundReason] = useState('Customer returned item');
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Filter transactions by receipt number, id, or customer name
  const filteredTransactions = transactions.filter((tx) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return (
      tx.receiptNumber.toLowerCase().includes(term) ||
      tx.id.toLowerCase().includes(term) ||
      (tx.customerName && tx.customerName.toLowerCase().includes(term))
    );
  });

  // Calculate previously refunded amounts for selectedTx
  const txRefunds = selectedTx ? allRefunds.filter((r) => r.transactionId === selectedTx.id) : [];
  const previouslyRefundedQtyMap: Record<string, number> = {};
  txRefunds.forEach((r) => {
    r.items.forEach((item) => {
      previouslyRefundedQtyMap[item.productId] =
        (previouslyRefundedQtyMap[item.productId] || 0) + item.quantity;
    });
  });

  const handleSelectTransaction = (tx: Transaction) => {
    setSelectedTx(tx);
    setError(null);
    // Initialize selection state
    const initialSelections: Record<string, { quantity: number; restock: boolean }> = {};
    tx.items.forEach((item) => {
      const alreadyRefunded = previouslyRefundedQtyMap[item.productId] || 0;
      const maxRefundable = item.quantity - alreadyRefunded;
      initialSelections[item.productId] = {
        quantity: 0,
        restock: true, // Default to true as per standard restock practice
      };
    });
    setItemSelections(initialSelections);
  };

  const handleProcessRefund = () => {
    if (!selectedTx) return;
    setError(null);

    const requestedItems = Object.entries(itemSelections)
      .map(([productId, val]) => ({
        productId,
        quantity: val.quantity,
        restock: val.restock,
      }))
      .filter((i) => i.quantity > 0);

    const validation = calculateRefundValidation(selectedTx, txRefunds, requestedItems);

    if (!validation.isValid) {
      setError(validation.errorMessage || 'Invalid refund request.');
      return;
    }

    setIsProcessing(true);

    setTimeout(() => {
      const refundId = `REF-${Date.now().toString().slice(-6)}`;
      const newRefund: Refund = {
        id: refundId,
        transactionId: selectedTx.id,
        receiptNumber: selectedTx.receiptNumber,
        items: validation.itemsToRefund,
        totalRefundAmount: validation.refundTotal,
        reason: refundReason,
        cashierId: cashierUser.id,
        cashierName: cashierUser.username,
        timestamp: Date.now(),
        customerId: selectedTx.customerId,
      };

      // 1. Save refund
      const updatedRefunds = [newRefund, ...allRefunds];
      StorageService.saveRefunds(updatedRefunds);
      setAllRefunds(updatedRefunds);

      // 2. Restock inventory items if requested
      const products = StorageService.getProducts();
      let inventoryChanged = false;
      const updatedProducts = products.map((p) => {
        const itemToRestock = validation.itemsToRefund.find(
          (i) => i.productId === p.id && i.restock
        );
        if (itemToRestock) {
          inventoryChanged = true;
          const newStock = p.stock + itemToRestock.quantity;

          // Manual restock from refund gets red border log
          StorageService.logActivity(
            cashierUser,
            'STOCK_ADJUSTMENT',
            'Manual stock addition',
            `Restocked ${itemToRestock.quantity} units of "${p.name}" from Refund ${refundId}.`,
            {
              referenceId: p.id,
              previousValue: `${p.stock} units`,
              newValue: `${newStock} units`,
              severity: 'warning',
              forcedRedBorder: true,
            }
          );

          return { ...p, stock: newStock, updatedAt: Date.now() };
        }
        return p;
      });

      if (inventoryChanged) {
        StorageService.saveProducts(updatedProducts);
      }

      // 3. Update transaction status
      const allTx = StorageService.getTransactions();
      const newTotalRefunded = Number((selectedTx.refundedAmount + validation.refundTotal).toFixed(2));
      const isFullyRefunded = newTotalRefunded >= selectedTx.total;

      const updatedTxList = allTx.map((t) => {
        if (t.id === selectedTx.id) {
          return {
            ...t,
            refundedAmount: newTotalRefunded,
            status: (isFullyRefunded ? 'refunded' : 'partially_refunded') as 'refunded' | 'partially_refunded',
          };
        }
        return t;
      });
      StorageService.saveTransactions(updatedTxList);

      // 4. Update customer stats if applicable
      if (selectedTx.customerId) {
        const customers = StorageService.getAllCustomersIncludingDeleted();
        const updatedCust = customers.map((c) => {
          if (c.id === selectedTx.customerId) {
            return {
              ...c,
              totalSpent: Math.max(0, Number((c.totalSpent - validation.refundTotal).toFixed(2))),
            };
          }
          return c;
        });
        StorageService.saveCustomers(updatedCust);
      }

      // 5. Activity log
      StorageService.logActivity(
        cashierUser,
        'REFUND',
        `Refund processed ${refundId}`,
        `Processed ${settings.currencySymbol}${validation.refundTotal.toFixed(2)} refund on ${selectedTx.receiptNumber}. Reason: ${refundReason}`,
        {
          referenceId: selectedTx.id,
          severity: 'warning',
          newValue: `${settings.currencySymbol}${validation.refundTotal.toFixed(2)}`,
        }
      );

      setIsProcessing(false);
      onRefundCompleted(newRefund, selectedTx);
      onClose();
    }, 250);
  };

  // Compute live preview of refund amount
  const liveRefundTotal = selectedTx
    ? selectedTx.items.reduce((sum, item) => {
        const sel = itemSelections[item.productId];
        if (!sel || sel.quantity <= 0) return sum;
        return sum + item.unitPrice * sel.quantity;
      }, 0)
    : 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-amber-600" />
            <div>
              <h3 className="font-bold text-gray-900">Register Refund & Return</h3>
              <p className="text-xs text-gray-500">
                Process returns without leaving Register or discarding active cart
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!selectedTx ? (
            /* Step 1: Select Transaction */
            <div className="space-y-3">
              <label className="block text-xs font-bold text-gray-700 uppercase">
                Find Sale by Receipt #, Transaction ID, or Customer
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="e.g. RCP-519283 or Sarah Jenkins"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#008060]"
                  autoFocus
                />
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100 max-h-72 overflow-y-auto">
                {filteredTransactions.length === 0 ? (
                  <div className="p-8 text-center text-xs text-gray-500">
                    No matching sales found.
                  </div>
                ) : (
                  filteredTransactions.map((tx) => (
                    <div
                      key={tx.id}
                      onClick={() => handleSelectTransaction(tx)}
                      className="p-3.5 hover:bg-gray-50 cursor-pointer flex items-center justify-between transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-gray-900">
                            {tx.receiptNumber}
                          </span>
                          <span
                            className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${
                              tx.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : tx.status === 'refunded'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {tx.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {new Date(tx.timestamp).toLocaleString()} • {tx.customerName || 'Walk-in'} • Cashier:{' '}
                          {tx.cashierName}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="font-bold text-sm text-gray-900">
                          {settings.currencySymbol}
                          {tx.total.toFixed(2)}
                        </span>
                        {tx.refundedAmount > 0 && (
                          <p className="text-[11px] text-red-600 font-medium">
                            Refunded: {settings.currencySymbol}
                            {tx.refundedAmount.toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            /* Step 2: Configure Items to Refund */
            <div className="space-y-4">
              <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm text-gray-900">
                    Selected Sale: {selectedTx.receiptNumber}
                  </p>
                  <p className="text-xs text-gray-500">
                    Total: {settings.currencySymbol}
                    {selectedTx.total.toFixed(2)} • Customer: {selectedTx.customerName || 'Walk-in'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTx(null)}
                  className="text-xs font-semibold text-[#008060] hover:underline"
                >
                  Change Sale
                </button>
              </div>

              {/* Items Table */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-2">
                  Select Quantities & Restock Preference
                </label>
                <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-200">
                  {selectedTx.items.map((item) => {
                    const alreadyRefunded = previouslyRefundedQtyMap[item.productId] || 0;
                    const maxRefundable = item.quantity - alreadyRefunded;
                    const currentSelection = itemSelections[item.productId] || {
                      quantity: 0,
                      restock: true,
                    };

                    return (
                      <div key={item.productId} className="p-3.5 flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                          <p className="text-xs text-gray-500">
                            Unit Price: {settings.currencySymbol}
                            {item.unitPrice.toFixed(2)} • Original Qty: {item.quantity} (Already returned: {alreadyRefunded})
                          </p>
                        </div>

                        {maxRefundable > 0 ? (
                          <div className="flex items-center gap-4">
                            {/* Restock checkbox */}
                            <label className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={currentSelection.restock}
                                onChange={(e) =>
                                  setItemSelections({
                                    ...itemSelections,
                                    [item.productId]: {
                                      ...currentSelection,
                                      restock: e.target.checked,
                                    },
                                  })
                                }
                                className="rounded text-[#008060] focus:ring-[#008060]"
                              />
                              <span>Return to Stock</span>
                            </label>

                            {/* Quantity dropdown */}
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-gray-500">Refund Qty:</span>
                              <select
                                value={currentSelection.quantity}
                                onChange={(e) =>
                                  setItemSelections({
                                    ...itemSelections,
                                    [item.productId]: {
                                      ...currentSelection,
                                      quantity: parseInt(e.target.value, 10),
                                    },
                                  })
                                }
                                className="px-2 py-1 text-xs border border-gray-300 rounded font-semibold bg-white"
                              >
                                {Array.from({ length: maxRefundable + 1 }, (_, i) => (
                                  <option key={i} value={i}>
                                    {i}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-1 rounded">
                            Fully Refunded
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Refund Reason */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Reason for Return / Refund *
                </label>
                <input
                  type="text"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="e.g. Defective, wrong size, customer changed mind"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#008060]"
                  required
                />
              </div>

              {/* Calculated Refund Banner */}
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs uppercase font-bold text-amber-800">
                    Recalculated Refund Total:
                  </span>
                  <p className="text-xl font-black text-amber-900">
                    {settings.currencySymbol}
                    {liveRefundTotal.toFixed(2)}
                  </p>
                </div>
                <div className="text-right text-xs text-amber-700">
                  <span>Method: Original Tender ({selectedTx.paymentMethod.toUpperCase()})</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="p-4 border-t border-gray-200 bg-white flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
          >
            Cancel
          </button>
          {selectedTx && (
            <button
              type="button"
              onClick={handleProcessRefund}
              disabled={isProcessing || liveRefundTotal <= 0}
              className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Confirm & Process Refund</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
