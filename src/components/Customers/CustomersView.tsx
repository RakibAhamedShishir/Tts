import React, { useState } from 'react';
import { Customer, Transaction, Refund, AppSettings, User } from '../../types/pos';
import { StorageService } from '../../utils/storage';
import { ThermalReceiptModal } from '../Receipt/ThermalReceiptModal';
import {
  Users,
  Search,
  UserPlus,
  Edit2,
  Trash2,
  History,
  Phone,
  Mail,
  MapPin,
  Calendar,
  X,
  Printer,
  ShoppingBag,
} from 'lucide-react';

interface CustomersViewProps {
  currentUser: User;
  settings: AppSettings;
  onOpenMenu: () => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  currentUser,
  settings,
  onOpenMenu,
}) => {
  const [customers, setCustomers] = useState<Customer[]>(() => StorageService.getCustomers());
  const [transactions] = useState<Transaction[]>(() => StorageService.getTransactions());
  const [refunds] = useState<Refund[]>(() => StorageService.getRefunds());
  const [search, setSearch] = useState('');

  // Modals state
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [receiptToView, setReceiptToView] = useState<{ tx: Transaction; refund?: Refund } | null>(
    null
  );

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  const isAdmin = currentUser.role === 'Admin';

  const handleOpenCreate = () => {
    setEditingCustomer(null);
    setName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setNotes('');
    setIsCreating(true);
  };

  const handleOpenEdit = (c: Customer) => {
    setEditingCustomer(c);
    setName(c.name);
    setPhone(c.phone);
    setEmail(c.email);
    setAddress(c.address);
    setNotes(c.notes);
    setIsCreating(false);
  };

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingCustomer) {
      const updated: Customer = {
        ...editingCustomer,
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        notes: notes.trim(),
      };
      const all = StorageService.getAllCustomersIncludingDeleted();
      const next = all.map((c) => (c.id === editingCustomer.id ? updated : c));
      StorageService.saveCustomers(next);
      setCustomers(StorageService.getCustomers());

      StorageService.logActivity(
        currentUser,
        'CUSTOMER',
        'Customer profile updated',
        `Updated customer details for "${updated.name}"`,
        { referenceId: updated.id, severity: 'info' }
      );
      setEditingCustomer(null);
    } else {
      const newCust: Customer = {
        id: `cust-${Date.now()}`,
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        notes: notes.trim(),
        createdAt: Date.now(),
        totalSpent: 0,
        orderCount: 0,
      };
      const all = StorageService.getAllCustomersIncludingDeleted();
      const next = [newCust, ...all];
      StorageService.saveCustomers(next);
      setCustomers(StorageService.getCustomers());

      StorageService.logActivity(
        currentUser,
        'CUSTOMER',
        'Customer created',
        `Created customer account for "${newCust.name}"`,
        { referenceId: newCust.id, severity: 'info' }
      );
      setIsCreating(false);
    }
  };

  const handleDeleteCustomer = () => {
    if (!customerToDelete) return;
    if (!isAdmin) return;

    // Soft delete customer to preserve financial and audit integrity
    const all = StorageService.getAllCustomersIncludingDeleted();
    const next = all.map((c) => (c.id === customerToDelete.id ? { ...c, isDeleted: true } : c));
    StorageService.saveCustomers(next);
    setCustomers(StorageService.getCustomers());

    StorageService.logActivity(
      currentUser,
      'CUSTOMER',
      'Customer soft-deleted',
      `Soft deleted customer "${customerToDelete.name}". All financial transaction records preserved.`,
      { referenceId: customerToDelete.id, severity: 'danger' }
    );

    setCustomerToDelete(null);
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  );

  // Get orders for history customer
  const customerOrders = historyCustomer
    ? transactions.filter((t) => t.customerId === historyCustomer.id)
    : [];

  return (
    <div className="flex flex-col h-screen bg-[#f4f6f8]">
      {/* Top Navbar */}
      <header className="h-14 bg-white border-b border-[#e1e3e5] px-4 flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#008060] text-white flex items-center justify-center font-bold">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900 text-sm">Customer Management</h2>
            <p className="text-[11px] text-gray-500">{customers.length} registered customers</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenCreate}
            className="py-1.5 px-3 bg-[#008060] hover:bg-[#006e52] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Customer</span>
          </button>
          <button onClick={onOpenMenu} className="p-2 rounded-lg hover:bg-gray-100 border border-gray-200">
            <span className="text-xs font-semibold">Menu</span>
          </button>
        </div>
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
              placeholder="Search by customer name, phone number, or email..."
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#008060]"
            />
          </div>
        </div>

        {/* Customer Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase font-semibold">
                <tr>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Contact</th>
                  <th className="p-3">Address</th>
                  <th className="p-3">Orders</th>
                  <th className="p-3">Total Spent</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-800">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-400">
                      No customers found. Click &quot;Add Customer&quot; above to create one.
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="p-3 font-semibold text-gray-900">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs">
                            {c.name.slice(0, 1).toUpperCase()}
                          </div>
                          <div>
                            <div>{c.name}</div>
                            {c.notes && <p className="text-[11px] text-gray-400 font-normal line-clamp-1">{c.notes}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="p-3 space-y-0.5 text-gray-600">
                        {c.phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-gray-400" />
                            <span>{c.phone}</span>
                          </div>
                        )}
                        {c.email && (
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3 h-3 text-gray-400" />
                            <span>{c.email}</span>
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-gray-600">
                        {c.address ? (
                          <div className="flex items-center gap-1.5 line-clamp-1">
                            <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                            <span>{c.address}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="p-3 font-semibold text-gray-900">{c.orderCount} orders</td>
                      <td className="p-3 font-bold text-gray-900">
                        {settings.currencySymbol}
                        {c.totalSpent.toFixed(2)}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setHistoryCustomer(c)}
                            className="px-2.5 py-1 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded text-xs font-semibold flex items-center gap-1"
                            title="View Purchase History"
                          >
                            <History className="w-3.5 h-3.5" />
                            <span>History</span>
                          </button>
                          <button
                            onClick={() => handleOpenEdit(c)}
                            className="p-1.5 text-gray-600 hover:text-blue-600 rounded hover:bg-gray-100"
                            title="Edit Customer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => setCustomerToDelete(c)}
                              className="p-1.5 text-gray-600 hover:text-red-600 rounded hover:bg-gray-100"
                              title="Delete Customer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add / Edit Customer Modal */}
      {(isCreating || editingCustomer) && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <h3 className="font-bold text-gray-900 text-sm">
                {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
              </h3>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setEditingCustomer(null);
                }}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#008060]"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#008060]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#008060]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Delivery Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#008060]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#008060]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setEditingCustomer(null);
                  }}
                  className="px-4 py-2 text-xs text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-[#008060] hover:bg-[#006e52] rounded-lg shadow-sm"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Purchase History Modal */}
      {historyCustomer && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div>
                <h3 className="font-bold text-gray-900 text-sm">
                  Purchase History: {historyCustomer.name}
                </h3>
                <p className="text-xs text-gray-500">
                  Total Spent: {settings.currencySymbol}
                  {historyCustomer.totalSpent.toFixed(2)} • {customerOrders.length} recorded orders
                </p>
              </div>
              <button
                onClick={() => setHistoryCustomer(null)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {customerOrders.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-xs">
                  No orders recorded for this customer yet.
                </div>
              ) : (
                customerOrders.map((ord) => {
                  const ordRefunds = refunds.filter((r) => r.transactionId === ord.id);
                  return (
                    <div key={ord.id} className="p-4 border border-gray-200 rounded-xl space-y-2.5">
                      <div className="flex items-center justify-between text-xs border-b border-gray-100 pb-2">
                        <div>
                          <span className="font-mono font-bold text-gray-900">{ord.receiptNumber}</span>
                          <span className="text-gray-400 text-[11px] ml-2">
                            {new Date(ord.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${
                              ord.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : ord.status === 'refunded'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {ord.status}
                          </span>
                          <button
                            onClick={() => setReceiptToView({ tx: ord })}
                            className="p-1 text-gray-600 hover:text-[#008060] rounded hover:bg-gray-100"
                            title="Reprint Receipt"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Items */}
                      <div className="text-xs space-y-1">
                        {ord.items.map((it, idx) => (
                          <div key={idx} className="flex justify-between text-gray-700">
                            <span>
                              {it.quantity}x {it.name}
                            </span>
                            <span className="font-medium">
                              {settings.currencySymbol}
                              {it.lineTotal.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Totals line */}
                      <div className="flex justify-between items-center pt-2 border-t border-gray-100 text-xs">
                        <span className="text-gray-500">
                          Payment: {ord.paymentMethod.toUpperCase()} (Cashier: {ord.cashierName})
                        </span>
                        <span className="font-bold text-gray-900 text-sm">
                          Total: {settings.currencySymbol}
                          {ord.total.toFixed(2)}
                        </span>
                      </div>

                      {/* Refunds notice if any */}
                      {ordRefunds.length > 0 && (
                        <div className="p-2 bg-red-50 border border-red-200 rounded-md text-[11px] text-red-800">
                          <span className="font-semibold">Refunds recorded: </span>
                          {ordRefunds.map((rf) => (
                            <span key={rf.id} className="mr-2">
                              {rf.id}: -{settings.currencySymbol}
                              {rf.totalRefundAmount.toFixed(2)} ({rf.reason})
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {customerToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-5 max-w-sm w-full text-center space-y-3">
            <h4 className="font-bold text-gray-900 text-sm">Delete Customer?</h4>
            <p className="text-xs text-gray-600">
              Are you sure you want to delete &quot;{customerToDelete.name}&quot;? All historical sales records and transactions will remain safely intact in the database.
            </p>
            <div className="flex justify-center gap-2 pt-2">
              <button
                onClick={() => setCustomerToDelete(null)}
                className="px-3 py-1.5 text-xs text-gray-700 bg-gray-100 rounded-md font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCustomer}
                className="px-4 py-1.5 text-xs text-white bg-red-600 hover:bg-red-700 rounded-md font-semibold"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Preview */}
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
