/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, AppSettings } from './types/pos';
import { StorageService } from './utils/storage';
import { LoginScreen } from './components/LoginScreen';
import { NavigationDrawer, ScreenId } from './components/NavigationDrawer';
import { RegisterView } from './components/Register/RegisterView';
import { InventoryView } from './components/Inventory/InventoryView';
import { CustomersView } from './components/Customers/CustomersView';
import { ReportsView } from './components/Reports/ReportsView';
import { RefundsView } from './components/Refunds/RefundsView';
import { ActivityLogView } from './components/ActivityLog/ActivityLogView';
import { UserManagementView } from './components/UserManagement/UserManagementView';
import { SettingsView } from './components/Settings/SettingsView';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeScreen, setActiveScreen] = useState<ScreenId>('register');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(() => {
    StorageService.initStorage();
    return StorageService.getSettings();
  });
  const [prefillBarcodeForInventory, setPrefillBarcodeForInventory] = useState<string | null>(null);

  // Initialize storage & session check
  useEffect(() => {
    StorageService.initStorage();
    const sessionUser = StorageService.getActiveSession();
    if (sessionUser) {
      setCurrentUser(sessionUser);
    }

    // Apply stored theme
    const currentSettings = StorageService.getSettings();
    setSettings(currentSettings);
    if (currentSettings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setActiveScreen('register');
  };

  const handleLogout = () => {
    if (currentUser) {
      StorageService.logActivity(
        currentUser,
        'AUTH',
        'User logged out',
        `Terminal locked for user "${currentUser.username}"`,
        { severity: 'info' }
      );
    }
    StorageService.clearActiveSession();
    setCurrentUser(null);
    setIsDrawerOpen(false);
  };

  const handleNavigate = (screen: ScreenId) => {
    // Role check guard
    if ((screen === 'activity' || screen === 'users') && currentUser?.role !== 'Admin') {
      return;
    }
    setActiveScreen(screen);
  };

  const handlePrefillBarcodeInInventory = (barcode: string) => {
    setPrefillBarcodeForInventory(barcode);
    setActiveScreen('inventory');
  };

  // 1. Mandatory dedicated login screen first
  if (!currentUser) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="relative min-h-screen w-full bg-[#f4f6f8] text-[#202223] font-sans">
      {/* Active Screen Display */}
      {activeScreen === 'register' && (
        <RegisterView
          currentUser={currentUser}
          settings={settings}
          onOpenMenu={() => setIsDrawerOpen(true)}
          onOpenAddProductModalWithBarcode={handlePrefillBarcodeInInventory}
        />
      )}

      {activeScreen === 'inventory' && (
        <InventoryView
          currentUser={currentUser}
          settings={settings}
          onOpenMenu={() => setIsDrawerOpen(true)}
          prefillBarcode={prefillBarcodeForInventory}
          onClearPrefillBarcode={() => setPrefillBarcodeForInventory(null)}
        />
      )}

      {activeScreen === 'reports' && (
        <ReportsView
          currentUser={currentUser}
          settings={settings}
          onOpenMenu={() => setIsDrawerOpen(true)}
        />
      )}

      {activeScreen === 'customers' && (
        <CustomersView
          currentUser={currentUser}
          settings={settings}
          onOpenMenu={() => setIsDrawerOpen(true)}
        />
      )}

      {activeScreen === 'refunds' && (
        <RefundsView
          currentUser={currentUser}
          settings={settings}
          onOpenMenu={() => setIsDrawerOpen(true)}
        />
      )}

      {activeScreen === 'activity' && currentUser.role === 'Admin' && (
        <ActivityLogView
          currentUser={currentUser}
          settings={settings}
          onOpenMenu={() => setIsDrawerOpen(true)}
        />
      )}

      {activeScreen === 'settings' && (
        <SettingsView
          currentUser={currentUser}
          settings={settings}
          onUpdateSettings={(newSettings) => setSettings(newSettings)}
          onOpenMenu={() => setIsDrawerOpen(true)}
        />
      )}

      {activeScreen === 'users' && currentUser.role === 'Admin' && (
        <UserManagementView
          currentUser={currentUser}
          settings={settings}
          onOpenMenu={() => setIsDrawerOpen(true)}
        />
      )}

      {/* Navigation Drawer Component */}
      <NavigationDrawer
        isOpen={isDrawerOpen}
        activeScreen={activeScreen}
        currentUser={currentUser}
        onNavigate={handleNavigate}
        onClose={() => setIsDrawerOpen(false)}
        onLogout={handleLogout}
      />
    </div>
  );
}
