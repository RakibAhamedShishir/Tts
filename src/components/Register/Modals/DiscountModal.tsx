import React, { useState } from 'react';
import { Discount, DiscountType } from '../../../types/pos';
import { StorageService } from '../../../utils/storage';
import { X, Tag, Percent, DollarSign, Trash2 } from 'lucide-react';

interface DiscountModalProps {
  currentDiscount: Discount | null;
  subtotal: number;
  currencySymbol: string;
  onApplyDiscount: (discount: Discount | null) => void;
  onClose: () => void;
  cashierUser: { id: string; username: string; role: 'Admin' | 'User' };
}

export const DiscountModal: React.FC<DiscountModalProps> = ({
  currentDiscount,
  subtotal,
  currencySymbol,
  onApplyDiscount,
  onClose,
  cashierUser,
}) => {
  const [discountType, setDiscountType] = useState<DiscountType>(
    currentDiscount?.type || 'percentage'
  );
  const [discountValue, setDiscountValue] = useState<string>(
    currentDiscount ? currentDiscount.value.toString() : '10'
  );
  const [error, setError] = useState<string | null>(null);

  const presets = [5, 10, 15, 20];

  const handleApply = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    const val = parseFloat(discountValue);
    if (isNaN(val) || val <= 0) {
      setError('Please enter a valid discount amount greater than zero.');
      return;
    }

    if (discountType === 'percentage') {
      if (val > 100) {
        setError('Percentage discount cannot exceed 100%.');
        return;
      }
      const disc: Discount = {
        type: 'percentage',
        value: val,
        label: `${val}% OFF`,
      };
      StorageService.logActivity(
        cashierUser,
        'CART',
        'Discount applied',
        `Applied ${val}% discount to order (Subtotal: ${currencySymbol}${subtotal.toFixed(2)})`,
        { severity: 'info' }
      );
      onApplyDiscount(disc);
      onClose();
    } else {
      if (val > subtotal) {
        setError(`Fixed discount cannot exceed the order subtotal (${currencySymbol}${subtotal.toFixed(2)}).`);
        return;
      }
      const disc: Discount = {
        type: 'fixed',
        value: val,
        label: `${currencySymbol}${val.toFixed(2)} OFF`,
      };
      StorageService.logActivity(
        cashierUser,
        'CART',
        'Discount applied',
        `Applied fixed ${currencySymbol}${val.toFixed(2)} discount to order`,
        { severity: 'info' }
      );
      onApplyDiscount(disc);
      onClose();
    }
  };

  const handleRemove = () => {
    StorageService.logActivity(
      cashierUser,
      'CART',
      'Discount removed',
      `Removed discount from order`,
      { severity: 'info' }
    );
    onApplyDiscount(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#e1e3e5] flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-[#008060]" />
            <h3 className="font-semibold text-gray-900">Add Order Discount</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleApply} className="p-5 space-y-4">
          {/* Subtotal preview */}
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg text-xs text-gray-700">
            <span>Cart Subtotal:</span>
            <span className="font-bold text-sm text-gray-900">
              {currencySymbol}
              {subtotal.toFixed(2)}
            </span>
          </div>

          {error && (
            <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
              {error}
            </div>
          )}

          {/* Mode Switcher */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-lg">
            <button
              type="button"
              onClick={() => {
                setDiscountType('percentage');
                setError(null);
              }}
              className={`py-2 px-3 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-colors ${
                discountType === 'percentage'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Percent className="w-3.5 h-3.5" />
              Percentage (%)
            </button>
            <button
              type="button"
              onClick={() => {
                setDiscountType('fixed');
                setError(null);
              }}
              className={`py-2 px-3 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-colors ${
                discountType === 'fixed'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              Fixed Amount ({currencySymbol})
            </button>
          </div>

          {/* Preset Buttons ONLY in Percentage Mode as strictly required */}
          {discountType === 'percentage' && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-2">
                Quick Presets
              </label>
              <div className="grid grid-cols-4 gap-2">
                {presets.map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => {
                      setDiscountValue(pct.toString());
                      setError(null);
                    }}
                    className={`py-2 rounded-lg text-xs font-semibold border transition-all ${
                      discountValue === pct.toString()
                        ? 'border-[#008060] bg-emerald-50 text-[#008060]'
                        : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Custom value input */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1.5">
              {discountType === 'percentage' ? 'Discount Percentage (%)' : `Discount Amount (${currencySymbol})`}
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0"
                max={discountType === 'percentage' ? '100' : subtotal.toString()}
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                placeholder={discountType === 'percentage' ? '15' : '5.00'}
                className="w-full pl-3 pr-8 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#008060] focus:border-transparent font-medium"
                autoFocus
                required
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">
                {discountType === 'percentage' ? '%' : currencySymbol}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-2">
            {currentDiscount ? (
              <button
                type="button"
                onClick={handleRemove}
                className="text-red-600 hover:text-red-800 text-xs font-semibold flex items-center gap-1 p-2 rounded-lg hover:bg-red-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Remove Discount
              </button>
            ) : <div />}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold text-white bg-[#008060] hover:bg-[#006e52] rounded-lg shadow-sm"
              >
                Apply Discount
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
