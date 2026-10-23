import React from 'react';
import { Product } from '../../../types/pos';
import { AlertCircle, PlusCircle, X } from 'lucide-react';

interface OutOfStockModalProps {
  product: Product;
  onClose: () => void;
  onOpenRestock: (product: Product) => void;
}

export const OutOfStockModal: React.FC<OutOfStockModalProps> = ({
  product,
  onClose,
  onOpenRestock,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-6 text-center">
          <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>

          <h3 className="text-lg font-bold text-gray-900 mb-1">Item Out of Stock</h3>
          <p className="text-sm font-semibold text-gray-700">{product.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">Barcode: {product.barcode}</p>

          <div className="mt-4 p-3 bg-red-50/70 border border-red-200/70 rounded-lg text-xs text-red-700 text-left">
            This product currently has <strong>0 available stock</strong> in inventory and cannot be added to the cart for checkout until inventory is replenished.
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-center">
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors order-2 sm:order-1"
            >
              Dismiss
            </button>
            <button
              onClick={() => {
                onClose();
                onOpenRestock(product);
              }}
              className="px-4 py-2.5 text-xs font-semibold text-white bg-[#008060] hover:bg-[#006e52] rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition-colors order-1 sm:order-2"
            >
              <PlusCircle className="w-4 h-4" />
              Adjust / Restock Item
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
