import React from 'react';
import { Transaction, Refund, AppSettings } from '../../types/pos';
import { Printer, Download, X } from 'lucide-react';

interface ThermalReceiptModalProps {
  transaction: Transaction;
  settings: AppSettings;
  refund?: Refund;
  onClose: () => void;
}

export const ThermalReceiptModal: React.FC<ThermalReceiptModalProps> = ({
  transaction,
  settings,
  refund,
  onClose,
}) => {
  const is58mm = settings.paperWidth === '58mm';
  const widthClass = is58mm ? 'max-w-[320px]' : 'max-w-[400px]';

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadText = () => {
    const lines = [
      '================================',
      settings.storeName.toUpperCase(),
      settings.storeAddress,
      `Tel: ${settings.storePhone}`,
      '================================',
      `Receipt: ${transaction.receiptNumber}`,
      `Date: ${new Date(transaction.timestamp).toLocaleString()}`,
      `Cashier: ${transaction.cashierName}`,
      transaction.customerName ? `Customer: ${transaction.customerName}` : '',
      '--------------------------------',
      'ITEMS:',
      ...transaction.items.map(
        (i) => `${i.name.padEnd(20).slice(0, 20)} ${i.quantity}x ${settings.currencySymbol}${i.unitPrice.toFixed(2)} = ${settings.currencySymbol}${i.lineTotal.toFixed(2)}`
      ),
      '--------------------------------',
      `Subtotal:     ${settings.currencySymbol}${transaction.subtotal.toFixed(2)}`,
      transaction.discountAmount > 0
        ? `Discount:    -${settings.currencySymbol}${transaction.discountAmount.toFixed(2)}`
        : '',
      `Tax (${transaction.taxRate}%):  ${settings.currencySymbol}${transaction.taxAmount.toFixed(2)}`,
      `TOTAL:        ${settings.currencySymbol}${transaction.total.toFixed(2)}`,
      '--------------------------------',
      `Payment:      ${transaction.paymentMethod.toUpperCase()}`,
      transaction.paymentDetails?.cashTendered
        ? `Tendered:     ${settings.currencySymbol}${transaction.paymentDetails.cashTendered.toFixed(2)}`
        : '',
      transaction.paymentDetails?.change
        ? `Change:       ${settings.currencySymbol}${transaction.paymentDetails.change.toFixed(2)}`
        : '',
      '================================',
      settings.receiptFooter,
      '================================',
    ].filter(Boolean);

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Receipt-${transaction.receiptNumber}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden max-w-lg w-full">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-[#008060]" />
            <h3 className="font-semibold text-gray-800">
              Receipt Preview ({settings.paperWidth})
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-md"
            aria-label="Close receipt preview"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Receipt Body */}
        <div className="overflow-y-auto p-6 bg-gray-100 flex justify-center">
          <div
            id="printable-receipt"
            className={`${widthClass} w-full bg-white p-5 shadow-sm border border-gray-200 text-gray-900 font-mono text-xs leading-relaxed`}
          >
            {/* Header / Brand */}
            <div className="text-center pb-3 border-b border-dashed border-gray-400">
              <h2 className="font-bold text-sm tracking-wider uppercase mb-1">
                {settings.storeName}
              </h2>
              <p className="text-[11px] text-gray-600">{settings.storeAddress}</p>
              <p className="text-[11px] text-gray-600">Tel: {settings.storePhone}</p>
              {settings.storeEmail && (
                <p className="text-[11px] text-gray-600">{settings.storeEmail}</p>
              )}
            </div>

            {/* Transaction Metadata */}
            <div className="py-2.5 border-b border-dashed border-gray-300 space-y-0.5 text-[11px]">
              <div className="flex justify-between">
                <span>Receipt #:</span>
                <span className="font-semibold">{transaction.receiptNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Date:</span>
                <span>{new Date(transaction.timestamp).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Cashier:</span>
                <span>{transaction.cashierName}</span>
              </div>
              {transaction.customerName && (
                <div className="flex justify-between">
                  <span>Customer:</span>
                  <span className="font-medium">{transaction.customerName}</span>
                </div>
              )}
              {refund && (
                <div className="flex justify-between text-red-600 font-bold mt-1">
                  <span>REFUND RECEIPT:</span>
                  <span>{refund.id}</span>
                </div>
              )}
            </div>

            {/* Line Items Table */}
            <div className="py-2.5 border-b border-dashed border-gray-400">
              <div className="flex justify-between font-semibold border-b border-gray-200 pb-1 mb-1.5 text-[11px]">
                <span className="w-1/2">Item</span>
                <span className="w-1/4 text-center">Qty x Price</span>
                <span className="w-1/4 text-right">Total</span>
              </div>
              <div className="space-y-1.5">
                {transaction.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-start text-[11px]">
                    <div className="w-1/2 pr-1">
                      <p className="font-medium truncate">{item.name}</p>
                      <span className="text-[10px] text-gray-500">{item.sku || item.barcode}</span>
                    </div>
                    <div className="w-1/4 text-center">
                      {item.quantity} x {settings.currencySymbol}
                      {item.unitPrice.toFixed(2)}
                    </div>
                    <div className="w-1/4 text-right font-medium">
                      {settings.currencySymbol}
                      {item.lineTotal.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals Section */}
            <div className="py-2 border-b border-dashed border-gray-400 space-y-1 text-[11px]">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>
                  {settings.currencySymbol}
                  {transaction.subtotal.toFixed(2)}
                </span>
              </div>
              {transaction.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>
                    Discount {transaction.discountDetails?.label ? `(${transaction.discountDetails.label})` : ''}
                  </span>
                  <span>
                    -{settings.currencySymbol}
                    {transaction.discountAmount.toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-gray-600">
                <span>Tax ({transaction.taxRate}%)</span>
                <span>
                  {settings.currencySymbol}
                  {transaction.taxAmount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold pt-1 border-t border-gray-300">
                <span>TOTAL</span>
                <span>
                  {settings.currencySymbol}
                  {transaction.total.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Payment Details */}
            <div className="py-2 border-b border-dashed border-gray-400 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>Payment Method:</span>
                <span className="font-semibold uppercase">{transaction.paymentMethod}</span>
              </div>
              {transaction.paymentDetails?.cardLast4 && (
                <div className="flex justify-between text-gray-600">
                  <span>Card Ending:</span>
                  <span>•••• {transaction.paymentDetails.cardLast4}</span>
                </div>
              )}
              {transaction.paymentDetails?.cashTendered !== undefined && (
                <>
                  <div className="flex justify-between text-gray-600">
                    <span>Cash Tendered:</span>
                    <span>
                      {settings.currencySymbol}
                      {transaction.paymentDetails.cashTendered.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Change Due:</span>
                    <span>
                      {settings.currencySymbol}
                      {(transaction.paymentDetails.change || 0).toFixed(2)}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Barcode Graphic */}
            <div className="py-3 text-center">
              <div className="inline-block px-4 py-1.5 bg-gray-50 border border-gray-300 rounded font-mono tracking-widest text-[12px] font-bold">
                |||| | ||||| || |||||| | |||
              </div>
              <div className="text-[10px] text-gray-500 mt-1">{transaction.receiptNumber}</div>
            </div>

            {/* Footer */}
            <div className="text-center pt-2 text-[10px] text-gray-600 leading-tight">
              <p>{settings.receiptFooter}</p>
              <p className="mt-1 font-semibold">Shopify POS System Verified</p>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 border-t border-gray-200 bg-white flex items-center justify-end gap-3">
          <button
            onClick={handleDownloadText}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download .txt
          </button>
          <button
            onClick={handlePrint}
            className="px-5 py-2 text-sm font-semibold text-white bg-[#008060] hover:bg-[#006e52] rounded-lg flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print Receipt
          </button>
        </div>
      </div>
    </div>
  );
};
