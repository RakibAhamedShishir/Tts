import React, { useState, useMemo } from 'react';
import { Transaction, Refund, AppSettings, User } from '../../types/pos';
import { StorageService } from '../../utils/storage';
import { ThermalReceiptModal } from '../Receipt/ThermalReceiptModal';
import {
  BarChart3,
  DollarSign,
  TrendingUp,
  Receipt,
  Tag,
  CreditCard,
  ShoppingBag,
  Printer,
  Calendar,
} from 'lucide-react';

interface ReportsViewProps {
  currentUser: User;
  settings: AppSettings;
  onOpenMenu: () => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  currentUser,
  settings,
  onOpenMenu,
}) => {
  const [transactions] = useState<Transaction[]>(() => StorageService.getTransactions());
  const [refunds] = useState<Refund[]>(() => StorageService.getRefunds());
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'all'>('all');
  const [receiptToView, setReceiptToView] = useState<{ tx: Transaction; refund?: Refund } | null>(
    null
  );

  // Filter transactions by time range
  const filteredTransactions = useMemo(() => {
    const now = Date.now();
    let cutoff = 0;
    if (timeRange === 'today') {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      cutoff = d.getTime();
    } else if (timeRange === 'week') {
      cutoff = now - 7 * 86400000;
    } else if (timeRange === 'month') {
      cutoff = now - 30 * 86400000;
    }
    return transactions.filter((t) => t.timestamp >= cutoff);
  }, [transactions, timeRange]);

  // Aggregate metrics
  const metrics = useMemo(() => {
    let gross = 0;
    let discounts = 0;
    let tax = 0;
    let totalRefunded = 0;
    const productSalesMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
    const categorySalesMap: Record<string, number> = {};
    const paymentMap: Record<string, number> = { cash: 0, card: 0, split: 0 };

    filteredTransactions.forEach((tx) => {
      gross += tx.subtotal;
      discounts += tx.discountAmount;
      tax += tx.taxAmount;
      totalRefunded += tx.refundedAmount;
      paymentMap[tx.paymentMethod] = (paymentMap[tx.paymentMethod] || 0) + tx.total;

      tx.items.forEach((item) => {
        if (!productSalesMap[item.productId]) {
          productSalesMap[item.productId] = { name: item.name, quantity: 0, revenue: 0 };
        }
        productSalesMap[item.productId].quantity += item.quantity;
        productSalesMap[item.productId].revenue += item.lineTotal;
      });
    });

    const netSales = gross - discounts - totalRefunded;
    const totalTransactions = filteredTransactions.length;
    const averageOrderValue = totalTransactions > 0 ? (gross - discounts) / totalTransactions : 0;

    const topProducts = Object.values(productSalesMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 6);

    return {
      gross,
      netSales,
      discounts,
      tax,
      totalRefunded,
      totalTransactions,
      averageOrderValue,
      topProducts,
      paymentMap,
    };
  }, [filteredTransactions]);

  return (
    <div className="flex flex-col h-screen bg-[#f4f6f8]">
      {/* Top Navbar */}
      <header className="h-14 bg-white border-b border-[#e1e3e5] px-4 flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#008060] text-white flex items-center justify-center font-bold">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900 text-sm">POS Analytics & Reports</h2>
            <p className="text-[11px] text-gray-500">Sales performance and audit insights</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Time range selector */}
          <div className="flex p-0.5 bg-gray-100 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setTimeRange('today')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                timeRange === 'today' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setTimeRange('week')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                timeRange === 'week' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600'
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => setTimeRange('month')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                timeRange === 'month' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600'
              }`}
            >
              30 Days
            </button>
            <button
              onClick={() => setTimeRange('all')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                timeRange === 'all' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600'
              }`}
            >
              All Time
            </button>
          </div>

          <button onClick={onOpenMenu} className="p-2 rounded-lg hover:bg-gray-100 border border-gray-200">
            <span className="text-xs font-semibold">Menu</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 overflow-y-auto p-4 max-w-7xl w-full mx-auto space-y-5">
        {/* Key Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              Gross Sales
            </span>
            <p className="text-xl font-black text-gray-900 mt-1">
              {settings.currencySymbol}
              {metrics.gross.toFixed(2)}
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
              Net Sales
            </span>
            <p className="text-xl font-black text-emerald-700 mt-1">
              {settings.currencySymbol}
              {metrics.netSales.toFixed(2)}
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              Discounts Given
            </span>
            <p className="text-xl font-black text-gray-700 mt-1">
              {settings.currencySymbol}
              {metrics.discounts.toFixed(2)}
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              Tax Collected
            </span>
            <p className="text-xl font-black text-gray-900 mt-1">
              {settings.currencySymbol}
              {metrics.tax.toFixed(2)}
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              Total Orders
            </span>
            <p className="text-xl font-black text-gray-900 mt-1">{metrics.totalTransactions}</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              Avg Order Value
            </span>
            <p className="text-xl font-black text-gray-900 mt-1">
              {settings.currencySymbol}
              {metrics.averageOrderValue.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Charts & Distributions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Top Products */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-[#008060]" />
              Top Selling Products (Quantity Sold)
            </h3>
            {metrics.topProducts.length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center">No sales in this time window.</p>
            ) : (
              <div className="space-y-2.5">
                {metrics.topProducts.map((p, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-600 font-bold flex items-center justify-center text-[10px]">
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-gray-900">{p.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-gray-900">{p.quantity} sold</span>
                      <span className="text-gray-400 text-[11px] ml-2">
                        ({settings.currencySymbol}
                        {p.revenue.toFixed(2)})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payment Methods Breakdown */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-blue-600" />
              Payment Methods Breakdown
            </h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-gray-700">Card Payments</span>
                  <span className="font-bold text-gray-900">
                    {settings.currencySymbol}
                    {(metrics.paymentMap.card || 0).toFixed(2)}
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full"
                    style={{
                      width: `${
                        metrics.gross > 0
                          ? ((metrics.paymentMap.card || 0) / metrics.gross) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-gray-700">Cash Payments</span>
                  <span className="font-bold text-gray-900">
                    {settings.currencySymbol}
                    {(metrics.paymentMap.cash || 0).toFixed(2)}
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full"
                    style={{
                      width: `${
                        metrics.gross > 0
                          ? ((metrics.paymentMap.cash || 0) / metrics.gross) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-gray-700">Split Payments</span>
                  <span className="font-bold text-gray-900">
                    {settings.currencySymbol}
                    {(metrics.paymentMap.split || 0).toFixed(2)}
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-600 rounded-full"
                    style={{
                      width: `${
                        metrics.gross > 0
                          ? ((metrics.paymentMap.split || 0) / metrics.gross) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Transaction Journal Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-gray-900 text-xs uppercase tracking-wider">
              Recent Transactions Journal
            </h3>
            <span className="text-xs text-gray-500">{filteredTransactions.length} orders</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase">
                <tr>
                  <th className="p-3">Receipt #</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Cashier</th>
                  <th className="p-3">Payment</th>
                  <th className="p-3">Items</th>
                  <th className="p-3">Total</th>
                  <th className="p-3 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-3 font-mono font-bold text-gray-900">{tx.receiptNumber}</td>
                    <td className="p-3 text-gray-500">
                      {new Date(tx.timestamp).toLocaleDateString()}{' '}
                      {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="p-3 text-gray-800">{tx.customerName || 'Walk-in'}</td>
                    <td className="p-3 text-gray-600">{tx.cashierName}</td>
                    <td className="p-3 uppercase font-medium text-gray-700">{tx.paymentMethod}</td>
                    <td className="p-3 text-gray-600">{tx.items.reduce((s, i) => s + i.quantity, 0)} units</td>
                    <td className="p-3 font-bold text-gray-900">
                      {settings.currencySymbol}
                      {tx.total.toFixed(2)}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => setReceiptToView({ tx })}
                        className="px-2.5 py-1 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded flex items-center gap-1 ml-auto"
                      >
                        <Printer className="w-3 h-3" />
                        <span>Receipt</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
