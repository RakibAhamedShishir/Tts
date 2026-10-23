import React, { useState } from 'react';
import { Product } from '../../../types/pos';
import { StorageService } from '../../../utils/storage';
import { PlusCircle, MinusCircle, X, ShieldAlert, ArrowRight } from 'lucide-react';

interface RestockModalProps {
  product: Product;
  onClose: () => void;
  onStockUpdated: (updatedProduct: Product) => void;
  currentUser: { id: string; username: string; role: 'Admin' | 'User' };
  settingsInventoryPin: string;
}

export const RestockModal: React.FC<RestockModalProps> = ({
  product,
  onClose,
  onStockUpdated,
  currentUser,
  settingsInventoryPin,
}) => {
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'remove'>('add');
  const [quantity, setQuantity] = useState<string>('5');
  const [reason, setReason] = useState<string>('Received shipment');
  const [notes, setNotes] = useState<string>('');
  const [pin, setPin] = useState<string>('');
  const [requiresPin, setRequiresPin] = useState<boolean>(() => !StorageService.isInventoryUnlocked());
  const [error, setError] = useState<string | null>(null);

  const addReasons = ['Received shipment', 'Inventory recount / found', 'Vendor sample', 'Customer return unrecorded', 'Other addition'];
  const removeReasons = ['Damaged / Expired item', 'Inventory recount / shrinkage', 'Internal store use', 'Defective returned to vendor', 'Other removal'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate PIN if needed
    if (requiresPin) {
      if (pin !== settingsInventoryPin) {
        setError('Incorrect Inventory PIN. Access denied.');
        return;
      }
      StorageService.setInventoryUnlocked(true);
      setRequiresPin(false);
    }

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      setError('Please enter a valid whole number greater than 0.');
      return;
    }

    const prevStock = product.stock;
    let newStock = prevStock;

    if (adjustmentType === 'add') {
      newStock = prevStock + qty;
    } else {
      if (qty > prevStock) {
        setError(`Cannot remove ${qty} units. Current stock is only ${prevStock}.`);
        return;
      }
      newStock = prevStock - qty;
    }

    const updatedProduct: Product = {
      ...product,
      stock: newStock,
      updatedAt: Date.now(),
    };

    // Update in products list
    const allProducts = StorageService.getProducts();
    const updatedList = allProducts.map((p) => (p.id === product.id ? updatedProduct : p));
    StorageService.saveProducts(updatedList);

    // Activity log: Must have distinctive red border!
    const actionName = adjustmentType === 'add' ? 'Manual stock addition' : 'Manual stock removal';
    const detailText = `${adjustmentType === 'add' ? 'Added' : 'Removed'} ${qty} units of "${product.name}" (${product.barcode}). Reason: ${reason}.${notes ? ` Note: ${notes}` : ''}`;

    StorageService.logActivity(
      currentUser,
      'STOCK_ADJUSTMENT',
      actionName,
      detailText,
      {
        referenceId: product.id,
        previousValue: `${prevStock} units`,
        newValue: `${newStock} units`,
        severity: newStock === 0 ? 'danger' : 'warning',
        forcedRedBorder: true, // DISTINCTIVE RED BORDER
      }
    );

    // If stock reached zero, log zero-stock event with red border
    if (newStock === 0) {
      StorageService.logActivity(
        currentUser,
        'INVENTORY',
        'Product reached zero stock',
        `Product "${product.name}" is now out of stock following manual stock adjustment.`,
        {
          referenceId: product.id,
          previousValue: `${prevStock} units`,
          newValue: '0 units',
          severity: 'danger',
          forcedRedBorder: true,
        }
      );
    }

    onStockUpdated(updatedProduct);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in duration-150">
        <div className="px-5 py-4 border-b border-[#e1e3e5] flex items-center justify-between bg-gray-50">
          <div>
            <h3 className="font-semibold text-gray-900">Adjust / Restock Inventory</h3>
            <p className="text-xs text-gray-500">{product.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Product Summary banner */}
          <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs">
            <div>
              <span className="text-gray-500">Barcode: </span>
              <span className="font-mono font-medium text-gray-800">{product.barcode}</span>
            </div>
            <div>
              <span className="text-gray-500">Current Stock: </span>
              <span
                className={`font-bold px-2 py-0.5 rounded text-xs ${
                  product.stock === 0
                    ? 'bg-red-100 text-red-700'
                    : product.stock <= product.lowStockThreshold
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {product.stock} units
              </span>
            </div>
          </div>

          {error && (
            <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
              {error}
            </div>
          )}

          {requiresPin && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs space-y-2">
              <div className="flex items-center gap-1.5 text-amber-900 font-semibold">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                <span>Inventory PIN Required</span>
              </div>
              <p className="text-amber-800 text-[11px]">
                Enter store inventory PIN to authorize stock adjustments (Default: <code>1111</code>):
              </p>
              <input
                type="password"
                maxLength={8}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Enter PIN (1111)"
                className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded text-sm font-mono tracking-widest focus:ring-2 focus:ring-[#008060]"
                required
              />
            </div>
          )}

          {/* Add vs Remove toggle */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-lg">
            <button
              type="button"
              onClick={() => {
                setAdjustmentType('add');
                setReason(addReasons[0]);
              }}
              className={`py-2 px-3 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-colors ${
                adjustmentType === 'add'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Add Stock (+)
            </button>
            <button
              type="button"
              onClick={() => {
                setAdjustmentType('remove');
                setReason(removeReasons[0]);
              }}
              className={`py-2 px-3 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-colors ${
                adjustmentType === 'remove'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              <MinusCircle className="w-3.5 h-3.5" />
              Remove Stock (-)
            </button>
          </div>

          {/* Quantity Input */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
              Quantity to {adjustmentType === 'add' ? 'Add' : 'Remove'} *
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#008060] font-semibold"
              required
            />
          </div>

          {/* Reason Selection */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
              Adjustment Reason *
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-[#008060]"
            >
              {(adjustmentType === 'add' ? addReasons : removeReasons).map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Optional Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
              Optional Notes / Batch #
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. PO #9921 from Roaster Co."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#008060]"
            />
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-5 py-2 text-xs font-semibold text-white rounded-lg shadow-sm flex items-center gap-1.5 ${
                adjustmentType === 'add'
                  ? 'bg-[#008060] hover:bg-[#006e52]'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              <span>Confirm {adjustmentType === 'add' ? 'Restock' : 'Removal'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
