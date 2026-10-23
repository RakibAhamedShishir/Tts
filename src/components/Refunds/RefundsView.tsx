import React, { useState } from 'react';
import { Refund, Transaction, AppSettings, User } from '../../types/pos';
import { StorageService } from '../../utils/storage';
import { ThermalReceiptModal } from '../Receipt/ThermalReceiptModal';
import { RotateCcw, Search, Calendar, UserCheck, PackageCheck, Printer } from 'lucide-react';

interface RefundsViewProps {
  currentUser: User;
  settings: AppSettings;
  onOpenMenu: () => void;
}

export const RefundsView: React.FC<RefundsViewProps> = ({
  currentUser,
  settings,
  onOpenMenu,
}) => {
  const [refunds] = useState<Refund[]>(() => StorageService.getRefunds());
  const [transactions] = useState<Transaction[]>(() => StorageService.getTransactions());
  const [search, setSearch] = useState('');
  const [receiptToView, setReceiptToView] = useState<{ tx: Transaction; refund?: Refund } | null>(
    null
  );

  const filteredRefunds = refunds.filter((r) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      r.id.toLowerCase().includes(q) ||
      r.receiptNumber.toLowerCase().includes(q) ||
      r.reason.toLowerCase().includes(q) ||
      r.cashierName.toLowerCase().includes(q)
    );
  });

  const handleReprintReceipt = (refund: Refund) => {
    const matchedTx = transactions.find((t) => t.id === refund.transactionId);
    if (matchedTx) {
      setReceiptToView({ tx: matchedTx, refund });
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#f4f6f8]">
      {/* Top Navbar */}
      <header className="h-14 bg-white border-b border-[#e1e3e5] px-4 flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center font-bold">
            <RotateCcw className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900 text-sm">Returns & Refunds Center</h2>
            <p className="text-[11px] text-gray-500">{refunds.length} processed refund records</p>
          </div>
        </div>

        <button onClick={onOpenMenu} className="p-2 rounded-lg hover:bg-gray-100 border border-gray-200">
          <span className="text-xs font-semibold">Menu</span>
        </button>
      </header>

      {/* Main Container */}
      <div className="flex-1 overflow-y-auto p-4 max-w-7xl w-full mx-auto space-y-4">
        {/* Search */}
        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by refund ID, receipt number, cashier, reason..."
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#008060]"
            />
          </div>
        </div>

        {/* Refunds List */}
        <div className="space-y-3">
          {filteredRefunds.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-xl border border-gray-200 text-gray-400 text-xs">
              <RotateCcw className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              <p className="font-semibold text-gray-600">No refund records found</p>
              <p className="text-gray-400 mt-1">Refunds processed from Register will appear here</p>
            </div>
          ) : (
            filteredRefunds.map((refund) => (
              <div
                key={refund.id}
                className="bg-white rounded-xl border border-amber-200 p-4 shadow-xs space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded font-mono font-bold text-xs">
                      {refund.id}
                    </span>
                    <span className="text-xs text-gray-500">
                      Original Sale: <strong className="text-gray-800">{refund.receiptNumber}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-base font-bold text-red-600">
                      -{settings.currencySymbol}
                      {refund.totalRefundAmount.toFixed(2)}
                    </span>
                    <button
                      onClick={() => handleReprintReceipt(refund)}
                      className="px-2.5 py-1 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md flex items-center gap-1.5"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Receipt
                    </button>
                  </div>
                </div>

                {/* Refund Items details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  {refund.items.map((it, idx) => (
                    <div key={idx} className="p-2.5 bg-gray-50 rounded-lg flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{it.productName}</p>
                        <p className="text-[11px] text-gray-500">
                          Qty: {it.quantity} • Unit Price: {settings.currencySymbol}
                          {it.unitPrice.toFixed(2)}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-gray-800">
                          {settings.currencySymbol}
                          {it.lineRefundTotal.toFixed(2)}
                        </span>
                        <div className="text-[10px] flex items-center gap-1 justify-end text-emerald-700 font-medium">
                          {it.restock ? (
                            <>
                              <PackageCheck className="w-3 h-3 text-emerald-600" />
                              <span>Restocked</span>
                            </>
                          ) : (
                            <span className="text-gray-400">Not Restocked</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Metadata & Reason footer */}
                <div className="flex flex-wrap items-center justify-between text-[11px] text-gray-500 pt-1 border-t border-gray-100">
                  <div>
                    <span className="font-semibold text-gray-700">Reason: </span>
                    <span>{refund.reason}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span>Cashier: {refund.cashierName}</span>
                    <span>•</span>
                    <span>{new Date(refund.timestamp).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Thermal Receipt Preview Modal */}
      {receiptToView && (
        <ThermalReceiptModal
          transaction={receiptToView.tx}
          refund={receiptToView.refund}
          settings={settings}
          onClose={() => setReceiptToView(null)}
        />
      )}
    </div>
  );
};
