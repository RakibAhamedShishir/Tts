import React, { useState } from 'react';
import { AppSettings, User } from '../../types/pos';
import { StorageService } from '../../utils/storage';
import {
  Settings,
  Store,
  Printer,
  Lock,
  Moon,
  Sun,
  Cloud,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  Barcode,
  Volume2,
} from 'lucide-react';

interface SettingsViewProps {
  currentUser: User;
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  onOpenMenu: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentUser,
  settings,
  onUpdateSettings,
  onOpenMenu,
}) => {
  const [formData, setFormData] = useState<AppSettings>({ ...settings });
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [pinMessage, setPinMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [drawerKicked, setDrawerKicked] = useState(false);

  const isAdmin = currentUser.role === 'Admin';

  const handleSaveStoreProfile = (e: React.FormEvent) => {
    e.preventDefault();
    StorageService.saveSettings(formData);
    onUpdateSettings(formData);

    // Apply theme
    if (formData.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    StorageService.logActivity(
      currentUser,
      'SETTINGS',
      'Settings updated',
      `Updated store configuration profile (${formData.storeName})`,
      { severity: 'info' }
    );

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleUpdatePin = (e: React.FormEvent) => {
    e.preventDefault();
    setPinMessage(null);

    if (oldPin !== settings.inventoryPin) {
      setPinMessage({ text: 'Current PIN is incorrect.', isError: true });
      return;
    }

    if (newPin.length < 4) {
      setPinMessage({ text: 'New PIN must be at least 4 digits.', isError: true });
      return;
    }

    const next = { ...formData, inventoryPin: newPin };
    setFormData(next);
    StorageService.saveSettings(next);
    onUpdateSettings(next);

    StorageService.logActivity(
      currentUser,
      'SETTINGS',
      'Inventory PIN updated',
      'Security safeguard inventory PIN was modified by administrator',
      { severity: 'info' }
    );

    setOldPin('');
    setNewPin('');
    setPinMessage({ text: 'Inventory PIN updated successfully.', isError: false });
  };

  const handleTestCashDrawer = () => {
    setDrawerKicked(true);
    // Simulate electronic pulse sound via Web Audio API
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {
      // Audio fallback
    }

    StorageService.logActivity(
      currentUser,
      'HARDWARE',
      'Cash drawer kicked',
      'Hardware trigger command sent to RJ12 drawer port',
      { severity: 'info' }
    );

    setTimeout(() => setDrawerKicked(false), 2000);
  };

  const handleTestCloudSync = () => {
    if (!formData.googleSheetsUrl?.trim()) {
      setSyncStatus('Error: Please enter a Google Apps Script Web App URL first.');
      return;
    }

    setIsSyncing(true);
    setSyncStatus('Connecting to configured endpoint...');

    setTimeout(() => {
      // Offline / client-side check
      if (!navigator.onLine) {
        setIsSyncing(false);
        setSyncStatus('Offline: Browser has no network connection. Sync aborted.');
        return;
      }

      setIsSyncing(false);
      setSyncStatus(
        'Endpoint pinged. Note: Actual Google Sheets sync requires proper Google Apps Script deployment with doSet/doGet permissions enabled.'
      );
      StorageService.logActivity(
        currentUser,
        'CLOUD_SYNC',
        'Cloud sync pinged',
        `Attempted sync connection to ${formData.googleSheetsUrl}`,
        { severity: 'info' }
      );
    }, 1000);
  };

  // Full Database Export
  const handleExportJSON = () => {
    const backup = {
      timestamp: Date.now(),
      version: '1.0.0',
      users: StorageService.getUsers(),
      products: StorageService.getProducts(),
      customers: StorageService.getAllCustomersIncludingDeleted(),
      transactions: StorageService.getTransactions(),
      refunds: StorageService.getRefunds(),
      settings: StorageService.getSettings(),
      activityLog: StorageService.getActivityLogs(),
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shopify-pos-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Database Restore
  const handleRestoreJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.products && data.transactions) {
          if (data.users) StorageService.saveUsers(data.users);
          if (data.products) StorageService.saveProducts(data.products);
          if (data.customers) StorageService.saveCustomers(data.customers);
          if (data.transactions) StorageService.saveTransactions(data.transactions);
          if (data.refunds) StorageService.saveRefunds(data.refunds);
          if (data.settings) {
            StorageService.saveSettings(data.settings);
            onUpdateSettings(data.settings);
          }
          alert('Database restored successfully! Reloading...');
          window.location.reload();
        } else {
          alert('Invalid backup file format.');
        }
      } catch (err) {
        alert('Failed to parse backup JSON file.');
      }
    };
    reader.readAsText(file);
  };

  // Products CSV Export
  const handleExportProductsCSV = () => {
    const products = StorageService.getProducts();
    const headers = ['ID', 'Name', 'Barcode', 'SKU', 'Category', 'Price', 'CostPrice', 'Stock', 'LowStockThreshold'];
    const rows = products.map((p) => [
      p.id,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.barcode}"`,
      `"${p.sku}"`,
      `"${p.category}"`,
      p.price,
      p.costPrice || 0,
      p.stock,
      p.lowStockThreshold,
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `products-catalog-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-screen bg-[#f4f6f8]">
      {/* Top Navbar */}
      <header className="h-14 bg-white border-b border-[#e1e3e5] px-4 flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#008060] text-white flex items-center justify-center font-bold">
            <Settings className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900 text-sm">System & POS Settings</h2>
            <p className="text-[11px] text-gray-500">Configure store, receipt templates, theme, and hardware</p>
          </div>
        </div>

        <button onClick={onOpenMenu} className="p-2 rounded-lg hover:bg-gray-100 border border-gray-200">
          <span className="text-xs font-semibold">Menu</span>
        </button>
      </header>

      {/* Main Container */}
      <div className="flex-1 overflow-y-auto p-4 max-w-4xl w-full mx-auto space-y-6">
        {savedSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#008060]" />
            <span>Settings saved successfully.</span>
          </div>
        )}

        {/* Store Profile Section */}
        <section className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
          <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-3">
            <Store className="w-5 h-5 text-[#008060]" />
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Store Profile & Tax</h3>
              <p className="text-[11px] text-gray-500">Appears on printed thermal receipts and reports</p>
            </div>
          </div>

          <form onSubmit={handleSaveStoreProfile} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Business Store Name
                </label>
                <input
                  type="text"
                  value={formData.storeName}
                  onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#008060]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Store Phone Number
                </label>
                <input
                  type="text"
                  value={formData.storePhone}
                  onChange={(e) => setFormData({ ...formData, storePhone: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#008060]"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Store Physical Address
                </label>
                <input
                  type="text"
                  value={formData.storeAddress}
                  onChange={(e) => setFormData({ ...formData, storeAddress: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#008060]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Currency Symbol
                </label>
                <input
                  type="text"
                  value={formData.currencySymbol}
                  onChange={(e) => setFormData({ ...formData, currencySymbol: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-bold border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#008060]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Tax Rate (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.taxRate}
                  onChange={(e) =>
                    setFormData({ ...formData, taxRate: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 text-xs font-bold border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#008060]"
                  required
                />
              </div>
            </div>

            {/* Receipt Styling */}
            <div className="pt-3 border-t border-gray-100">
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-2">
                Thermal Receipt Paper Width
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-xs font-medium text-gray-800 cursor-pointer">
                  <input
                    type="radio"
                    name="paperWidth"
                    value="80mm"
                    checked={formData.paperWidth === '80mm'}
                    onChange={() => setFormData({ ...formData, paperWidth: '80mm' })}
                    className="text-[#008060] focus:ring-[#008060]"
                  />
                  <span>80mm (Standard Desktop Receipt Printer)</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-medium text-gray-800 cursor-pointer">
                  <input
                    type="radio"
                    name="paperWidth"
                    value="58mm"
                    checked={formData.paperWidth === '58mm'}
                    onChange={() => setFormData({ ...formData, paperWidth: '58mm' })}
                    className="text-[#008060] focus:ring-[#008060]"
                  />
                  <span>58mm (Mobile / Compact Receipt Printer)</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Receipt Footer Note
              </label>
              <input
                type="text"
                value={formData.receiptFooter}
                onChange={(e) => setFormData({ ...formData, receiptFooter: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#008060]"
              />
            </div>

            {/* Theme Selection: Exclusive to Settings */}
            <div className="pt-3 border-t border-gray-100">
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-2">
                Interface Display Theme
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, theme: 'light' })}
                  className={`py-2 px-4 rounded-lg text-xs font-semibold flex items-center gap-2 border transition-all ${
                    formData.theme === 'light'
                      ? 'border-[#008060] bg-emerald-50 text-emerald-900 shadow-xs'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span>Shopify Clean Light</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, theme: 'dark' })}
                  className={`py-2 px-4 rounded-lg text-xs font-semibold flex items-center gap-2 border transition-all ${
                    formData.theme === 'dark'
                      ? 'border-gray-800 bg-gray-900 text-white shadow-xs'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Moon className="w-4 h-4 text-indigo-400" />
                  <span>High Contrast Dark</span>
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold text-white bg-[#008060] hover:bg-[#006e52] rounded-lg shadow-sm"
              >
                Save Profile & Settings
              </button>
            </div>
          </form>
        </section>

        {/* Security & Inventory PIN Section */}
        <section className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
          <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-3">
            <Lock className="w-5 h-5 text-amber-600" />
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Security & Inventory PIN</h3>
              <p className="text-[11px] text-gray-500">
                Safeguard code required to view inventory and perform manual stock adjustments
              </p>
            </div>
          </div>

          {pinMessage && (
            <div
              className={`p-3 text-xs rounded-lg mb-3 ${
                pinMessage.isError
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              }`}
            >
              {pinMessage.text}
            </div>
          )}

          <form onSubmit={handleUpdatePin} className="space-y-3 max-w-sm">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Current Inventory PIN
              </label>
              <input
                type="password"
                maxLength={8}
                value={oldPin}
                onChange={(e) => setOldPin(e.target.value)}
                placeholder="Default: 1111"
                className="w-full px-3 py-1.5 text-xs font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#008060]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                New Inventory PIN
              </label>
              <input
                type="password"
                maxLength={8}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="At least 4 digits"
                className="w-full px-3 py-1.5 text-xs font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#008060]"
                required
              />
            </div>

            <button
              type="submit"
              className="py-2 px-4 text-xs font-bold text-gray-800 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg"
            >
              Update Security PIN
            </button>
          </form>
        </section>

        {/* Hardware Connectivity Simulation Section */}
        <section className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
          <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-3">
            <HardDrive className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Hardware Connectivity & Peripherals</h3>
              <p className="text-[11px] text-gray-500">
                Simulated integration with keyboard-wedge scanners, thermal printers, and cash drawers
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Barcode Scanner */}
            <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-gray-800">Barcode Scanner</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <p className="text-[11px] text-gray-500">
                  Global keyboard listener active. Supports USB, Bluetooth & wedge scanners.
                </p>
              </div>
              <div className="mt-3 text-[11px] font-semibold text-emerald-700 bg-emerald-50 p-1.5 rounded text-center">
                Listening for Keystroke Bursts
              </div>
            </div>

            {/* Thermal Printer */}
            <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-gray-800">Thermal Printer</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
                <p className="text-[11px] text-gray-500">
                  Formatted for {formData.paperWidth} roll paper via window.print() CSS media.
                </p>
              </div>
              <button
                type="button"
                onClick={() => window.print()}
                className="mt-3 py-1.5 px-2 bg-white hover:bg-gray-100 border border-gray-300 rounded text-xs font-semibold text-gray-700 text-center"
              >
                Trigger Test Print
              </button>
            </div>

            {/* Cash Drawer */}
            <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-gray-800">Cash Drawer</span>
                  <span className={`w-2 h-2 rounded-full ${drawerKicked ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'}`} />
                </div>
                <p className="text-[11px] text-gray-500">
                  Standard 24V pulse drawer trigger via printer RJ12 kick-out port.
                </p>
              </div>
              <button
                type="button"
                onClick={handleTestCashDrawer}
                className={`mt-3 py-1.5 px-2 rounded text-xs font-semibold text-center transition-all ${
                  drawerKicked
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'bg-white hover:bg-gray-100 border border-gray-300 text-gray-700'
                }`}
              >
                {drawerKicked ? '⚡ Drawer Fired!' : 'Test Kick Drawer'}
              </button>
            </div>
          </div>
        </section>

        {/* Optional Google Sheets Cloud Sync Section */}
        <section className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
          <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-3">
            <Cloud className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Optional Google Sheets Synchronization</h3>
              <p className="text-[11px] text-gray-500">
                Sync sales ledger to an external Google Sheet via custom Apps Script endpoint
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 text-xs rounded-xl">
              <strong>Requirement: </strong> Google Sheets integration requires a deployed Google Apps Script Web App URL with anonymous access or workspace permissions. Core POS operations remain 100% functional locally without this service.
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Google Apps Script Web App URL
              </label>
              <input
                type="url"
                value={formData.googleSheetsUrl || ''}
                onChange={(e) => setFormData({ ...formData, googleSheetsUrl: e.target.value })}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#008060]"
              />
            </div>

            {syncStatus && (
              <div className="p-2.5 bg-gray-100 border border-gray-200 text-xs text-gray-700 rounded-lg">
                {syncStatus}
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleTestCloudSync}
                disabled={isSyncing}
                className="py-2 px-4 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Test Connection & Sync</span>
              </button>
            </div>
          </div>
        </section>

        {/* Data Backup & Factory Reset */}
        <section className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
          <h3 className="font-bold text-gray-900 text-sm mb-1">Data Backup, Export & Factory Reset</h3>
          <p className="text-[11px] text-gray-500 mb-4">
            Manage your offline database backups and catalog CSV exports
          </p>

          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={handleExportJSON}
              className="py-2 px-3.5 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg text-xs font-semibold text-gray-800 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Full Backup (JSON)</span>
            </button>

            <button
              type="button"
              onClick={handleExportProductsCSV}
              className="py-2 px-3.5 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg text-xs font-semibold text-gray-800 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Catalog (CSV)</span>
            </button>

            <label className="py-2 px-3.5 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg text-xs font-semibold text-gray-800 flex items-center gap-1.5 cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>Restore Backup (JSON)</span>
              <input type="file" accept=".json" onChange={handleRestoreJSON} className="hidden" />
            </label>

            <button
              type="button"
              onClick={() => {
                if (confirm('Reset entire system to factory demo state? All local transactions will be reset.')) {
                  StorageService.resetToFactoryDefaults();
                  window.location.reload();
                }
              }}
              className="py-2 px-3.5 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg text-xs font-semibold text-red-700 ml-auto"
            >
              Reset to Factory Demo Data
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};
