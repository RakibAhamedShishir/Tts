import React, { useState } from 'react';
import { StorageService, getDeviceDetails } from '../utils/storage';
import { User } from '../types/pos';
import { Lock, UserCheck, ShieldAlert, Store, ArrowRight, Eye, EyeOff } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    const trimmedUser = username.trim();
    if (!trimmedUser || !password) {
      setError('Please enter both username and password.');
      return;
    }

    setLoading(true);

    setTimeout(() => {
      const users = StorageService.getUsers();
      const matched = users.find(
        (u) => u.username.toLowerCase() === trimmedUser.toLowerCase() && u.passwordHash === password
      );

      if (!matched) {
        StorageService.logActivity(
          { id: 'unknown', username: trimmedUser, role: 'User' },
          'AUTH',
          'Failed login attempt',
          `Unsuccessful login attempt for username "${trimmedUser}"`,
          { severity: 'warning' }
        );
        setError('Invalid username or password. Please verify your credentials.');
        setLoading(false);
        return;
      }

      if (matched.status === 'frozen') {
        StorageService.logActivity(
          { id: matched.id, username: matched.username, role: matched.role },
          'AUTH',
          'Blocked frozen account login',
          `Frozen account "${matched.username}" attempted to log in`,
          { severity: 'danger' }
        );
        setError('Your account is currently frozen. Please contact a system administrator.');
        setLoading(false);
        return;
      }

      // Successful login
      matched.lastLoginAt = Date.now();
      const updatedUsers = users.map((u) => (u.id === matched.id ? matched : u));
      StorageService.saveUsers(updatedUsers);
      StorageService.setActiveSession(matched);

      StorageService.logActivity(
        { id: matched.id, username: matched.username, role: matched.role },
        'AUTH',
        'User logged in',
        `${matched.role} session started on ${getDeviceDetails()}`,
        { severity: 'success' }
      );

      setLoading(false);
      onLoginSuccess(matched);
    }, 250);
  };

  const fillCredentials = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setError(null);
  };

  return (
    <div className="min-h-screen w-full bg-[#f4f6f8] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#008060] text-white shadow-md mb-3">
            <Store className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#202223]">Shopify POS Pro</h1>
          <p className="text-sm text-[#6d7175] mt-1">Point of Sale Terminal & Management</p>
        </div>

        {/* Security / Default credentials notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3.5 mb-5 text-xs text-amber-900 flex gap-2.5 items-start">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Security Advisory: </span>
            Initialized with default credentials: <code className="bg-amber-100/70 px-1 py-0.5 rounded font-mono font-bold">Admin</code> /{' '}
            <code className="bg-amber-100/70 px-1 py-0.5 rounded font-mono font-bold">admin123</code>.
            Change these credentials in Settings before business production use.
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-xl border border-[#e1e3e5] shadow-sm p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-[#202223] mb-4">Cashier & Admin Sign In</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
              <span className="font-semibold">Error:</span> {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username (e.g. Admin)"
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#c9cccf] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#008060] focus:border-[#008060] transition-colors"
                autoFocus
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#c9cccf] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#008060] focus:border-[#008060] pr-10 transition-colors"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-[#008060] hover:bg-[#006e52] text-white text-sm font-semibold rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? (
                <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <span>Unlock Terminal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Fill Buttons */}
          <div className="mt-6 pt-5 border-t border-[#e1e3e5]">
            <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-2 text-center">
              Quick Demo Access
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fillCredentials('Admin', 'admin123')}
                className="py-1.5 px-2 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-md flex items-center justify-center gap-1.5"
              >
                <Lock className="w-3 h-3 text-[#008060]" />
                Admin (Full Access)
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('Cashier1', 'cashier123')}
                className="py-1.5 px-2 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-md flex items-center justify-center gap-1.5"
              >
                <UserCheck className="w-3 h-3 text-blue-600" />
                Cashier (POS Only)
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center mt-6 text-xs text-[#6d7175]">
          <p>Local Storage & Offline-First POS Engine</p>
          <p className="mt-0.5 text-[11px]">No external server or cloud runtime required</p>
        </div>
      </div>
    </div>
  );
};
