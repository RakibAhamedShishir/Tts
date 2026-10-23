import React, { useState } from 'react';
import { Customer } from '../../../types/pos';
import { StorageService } from '../../../utils/storage';
import { X, Search, UserPlus, Check, User, Phone, Mail } from 'lucide-react';

interface CustomerSelectModalProps {
  currentCustomer: Customer | null;
  onSelectCustomer: (customer: Customer | null) => void;
  onClose: () => void;
  cashierUser: { id: string; username: string; role: 'Admin' | 'User' };
}

export const CustomerSelectModal: React.FC<CustomerSelectModalProps> = ({
  currentCustomer,
  onSelectCustomer,
  onClose,
  cashierUser,
}) => {
  const [customers, setCustomers] = useState<Customer[]>(() => StorageService.getCustomers());
  const [search, setSearch] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // New customer form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newCustomer: Customer = {
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

    const updated = [newCustomer, ...customers];
    StorageService.saveCustomers(updated);
    setCustomers(updated);

    StorageService.logActivity(
      cashierUser,
      'CUSTOMER',
      'Customer created',
      `Created customer profile for "${newCustomer.name}"`,
      { referenceId: newCustomer.id, severity: 'info' }
    );

    onSelectCustomer(newCustomer);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#e1e3e5] flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-[#008060]" />
            <h3 className="font-semibold text-gray-900">
              {isCreating ? 'Add New Customer' : 'Select Customer for Sale'}
            </h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1">
          {isCreating ? (
            <form onSubmit={handleCreateCustomer} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#008060] focus:border-transparent"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#008060] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jane@example.com"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#008060] focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Street Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Main St, Apt 4"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#008060] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Customer Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Loyalty preferences, allergies, VIP notes..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#008060] focus:border-transparent"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold text-white bg-[#008060] hover:bg-[#006e52] rounded-lg shadow-sm"
                >
                  Save & Select
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name, phone or email..."
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#008060] focus:border-transparent"
                    autoFocus
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreating(true)}
                  className="px-3 py-2 text-xs font-semibold text-white bg-[#008060] hover:bg-[#006e52] rounded-lg flex items-center gap-1.5 shrink-0 shadow-sm"
                >
                  <UserPlus className="w-4 h-4" />
                  New Customer
                </button>
              </div>

              {currentCustomer && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-[#008060] text-white flex items-center justify-center text-xs font-bold">
                      {currentCustomer.name[0]}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-emerald-900">
                        Currently Assigned: {currentCustomer.name}
                      </p>
                      <p className="text-[11px] text-emerald-700">{currentCustomer.phone || currentCustomer.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      onSelectCustomer(null);
                      onClose();
                    }}
                    className="text-xs font-medium text-red-600 hover:text-red-800 underline"
                  >
                    Remove
                  </button>
                </div>
              )}

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {filtered.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 text-xs">
                    No customers found. Click &quot;New Customer&quot; above to create one.
                  </div>
                ) : (
                  filtered.map((c) => {
                    const isSelected = currentCustomer?.id === c.id;
                    return (
                      <div
                        key={c.id}
                        onClick={() => {
                          onSelectCustomer(c);
                          onClose();
                        }}
                        className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                          isSelected
                            ? 'border-[#008060] bg-emerald-50/50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{c.name}</p>
                          <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                            {c.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {c.phone}
                              </span>
                            )}
                            {c.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {c.email}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-gray-400 mt-1 inline-block">
                            Orders: {c.orderCount} • Spent: ${c.totalSpent.toFixed(2)}
                          </span>
                        </div>
                        {isSelected && <Check className="w-5 h-5 text-[#008060]" />}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
