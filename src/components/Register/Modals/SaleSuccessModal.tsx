import React from 'react';
import { Transaction, AppSettings } from '../../../types/pos';
import { CheckCircle, Printer, Eye, Plus, ArrowRight } from 'lucide-react';

interface SaleSuccessModalProps {
  transaction: Transaction;
  settings: AppSettings;
  onNewSale: () => void;
  onViewReceipt: () => void;
}

export const SaleSuccessModal: React.FC<SaleSuccessModalProps> = ({
  transaction,
  settings,
  onNewSale,
  onViewReceipt,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden text-center p-6 animate-in zoom-in-95 duration-200">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-[#008060] flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-10 h-10" />
        </div>

        <h3 className="text-xl font-bold text-gray-900">Sale Completed!</h3>
        <p className="text-xs text-gray-500 mt-1">
          Receipt <span className="font-mono font-semibold text-gray-700">{transaction.receiptNumber}</span>
        </p>

        {/* Transaction Summary Card */}
        <div className="my-5 p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-2 text-left">
          <div className="flex justify-between items-center text-xs text-gray-600">
            <span>Payment Total:</span>
            <span className="text-base font-bold text-gray-900">
              {settings.currencySymbol}
              {transaction.total.toFixed(2)}
            </span>
          </div>

          <div className="flex justify-between items-center text-xs text-gray-600">
            <span>Payment Method:</span>
            <span className="font-semibold uppercase text-gray-800">{transaction.paymentMethod}</span>
          </div>

          {transaction.paymentDetails?.change !== undefined && transaction.paymentDetails.change > 0 && (
            <div className="flex justify-between items-center text-xs pt-1 border-t border-gray-200">
              <span className="font-semibold text-emerald-800">Change Due:</span>
              <span className="text-sm font-bold text-emerald-700">
                {settings.currencySymbol}
                {transaction.paymentDetails.change.toFixed(2)}
              </span>
            </div>
          )}

          {transaction.customerName && (
            <div className="flex justify-between items-center text-xs text-gray-600 pt-1 border-t border-gray-200">
              <span>Customer:</span>
              <span className="font-medium text-gray-800">{transaction.customerName}</span>
            </div>
          )}
        </div>

        {/* Receipt Actions */}
        <div className="grid grid-cols-2 gap-2.5 mb-4">
          <button
            onClick={() => {
              onViewReceipt();
            }}
            className="py-2.5 px-3 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
          >
            <Eye className="w-4 h-4 text-gray-600" />
            View Receipt
          </button>
          <button
            onClick={() => {
              onViewReceipt();
              setTimeout(() => window.print(), 300);
            }}
            className="py-2.5 px-3 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
          >
            <Printer className="w-4 h-4 text-[#008060]" />
            Print Receipt
          </button>
        </div>

        {/* Primary New Sale button */}
        <button
          onClick={onNewSale}
          className="w-full py-3 px-4 bg-[#008060] hover:bg-[#006e52] text-white text-sm font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Start New Sale</span>
          <ArrowRight className="w-4 h-4 ml-1" />
        </button>
      </div>
    </div>
  );
};
