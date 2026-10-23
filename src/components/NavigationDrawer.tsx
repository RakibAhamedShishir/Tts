import React from 'react';
import { User } from '../types/pos';
import {
  ShoppingCart,
  Package,
  BarChart3,
  Users,
  RotateCcw,
  ClipboardList,
  Settings,
  ShieldCheck,
  LogOut,
  X,
  Store,
} from 'lucide-react';

export type ScreenId =
  | 'register'
  | 'inventory'
  | 'reports'
  | 'customers'
  | 'refunds'
  | 'activity'
  | 'settings'
  | 'users';

interface NavigationDrawerProps {
  isOpen: boolean;
  activeScreen: ScreenId;
  currentUser: User;
  onNavigate: (screen: ScreenId) => void;
  onClose: () => void;
  onLogout: () => void;
}

export const NavigationDrawer: React.FC<NavigationDrawerProps> = ({
  isOpen,
  activeScreen,
  currentUser,
  onNavigate,
  onClose,
  onLogout,
}) => {
  if (!isOpen) return null;

  const isAdmin = currentUser.role === 'Admin';

  const menuItems: { id: ScreenId; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
    { id: 'register', label: '1. Register', icon: <ShoppingCart className="w-5 h-5" /> },
    { id: 'inventory', label: '2. Inventory', icon: <Package className="w-5 h-5" /> },
    { id: 'reports', label: '3. Reports', icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'customers', label: '4. Customers', icon: <Users className="w-5 h-5" /> },
    { id: 'refunds', label: '5. Refunds', icon: <RotateCcw className="w-5 h-5" /> },
    { id: 'activity', label: '6. Activity Log', icon: <ClipboardList className="w-5 h-5" />, adminOnly: true },
    { id: 'settings', label: '7. Settings', icon: <Settings className="w-5 h-5" /> },
    { id: 'users', label: '8. User Management', icon: <ShieldCheck className="w-5 h-5" />, adminOnly: true },
  ];

  // Filter out admin-only items for standard users
  const visibleItems = menuItems.filter((item) => !item.adminOnly || isAdmin);

  const handleItemClick = (screen: ScreenId) => {
    onNavigate(screen);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-label="Close menu backdrop"
      />

      {/* Drawer content (Dark charcoal / slate theme as specified: #1a1c1d) */}
      <div className="relative w-80 max-w-[85vw] h-full bg-[#1a1c1d] text-[#f6f6f7] shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-5 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#008060] text-white flex items-center justify-center shadow">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-sm tracking-wide text-white">Shopify POS Pro</h2>
              <span className="text-[11px] text-gray-400">Terminal Menu</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-md transition-colors"
            aria-label="Close navigation menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
          {visibleItems.map((item) => {
            const isActive = activeScreen === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#008060] text-white shadow-sm'
                    : 'text-gray-300 hover:bg-gray-800/80 hover:text-white'
                }`}
              >
                <span className={isActive ? 'text-white' : 'text-gray-400'}>{item.icon}</span>
                <span className="flex-1 text-left">{item.label}</span>
                {item.adminOnly && (
                  <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 font-semibold">
                    Admin
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Bottom User Profile & Logout */}
        <div className="p-4 border-t border-gray-800 bg-[#141617]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center font-bold text-xs text-white">
                {currentUser.username.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-xs font-semibold text-white leading-tight">{currentUser.username}</p>
                <p className="text-[11px] text-emerald-400 font-medium">{currentUser.role} Account</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              onClose();
              onLogout();
            }}
            className="w-full py-2.5 px-3 bg-red-950/60 hover:bg-red-900/80 text-red-200 border border-red-800/60 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Lock / Log Out
          </button>
        </div>
      </div>
    </div>
  );
};
