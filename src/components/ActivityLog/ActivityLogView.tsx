import React, { useState, useMemo } from 'react';
import { ActivityRecord, ActivityCategory, User, AppSettings } from '../../types/pos';
import { StorageService } from '../../utils/storage';
import {
  ClipboardList,
  Search,
  Download,
  Filter,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  AlertOctagon,
  CheckCircle2,
  AlertTriangle,
  Info,
  Laptop,
  Smartphone,
  MapPin,
  RefreshCw,
} from 'lucide-react';

interface ActivityLogViewProps {
  currentUser: User;
  settings: AppSettings;
  onOpenMenu: () => void;
}

export const ActivityLogView: React.FC<ActivityLogViewProps> = ({
  currentUser,
  settings,
  onOpenMenu,
}) => {
  const [logs, setLogs] = useState<ActivityRecord[]>(() => StorageService.getActivityLogs());
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [userFilter, setUserFilter] = useState<string>('ALL');
  const [onlyRedBorder, setOnlyRedBorder] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const isAdmin = currentUser.role === 'Admin';

  const userList = useMemo(() => {
    return Array.from(new Set(logs.map((l) => l.username)));
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        log.action.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q) ||
        log.username.toLowerCase().includes(q) ||
        (log.referenceId && log.referenceId.toLowerCase().includes(q));

      const matchesCat = categoryFilter === 'ALL' || log.category === categoryFilter;
      const matchesUser = userFilter === 'ALL' || log.username === userFilter;
      const matchesRed = !onlyRedBorder || log.isRedBorder;

      return matchesSearch && matchesCat && matchesUser && matchesRed;
    });
  }, [logs, search, categoryFilter, userFilter, onlyRedBorder]);

  const handleExportCSV = () => {
    const headers = [
      'ID',
      'Timestamp',
      'Date Time',
      'User',
      'Role',
      'Category',
      'Action',
      'Details',
      'Reference ID',
      'Previous Value',
      'New Value',
      'Device',
      'Red Border Event',
    ];

    const rows = filteredLogs.map((l) => [
      `"${l.id}"`,
      l.timestamp,
      `"${new Date(l.timestamp).toISOString()}"`,
      `"${l.username}"`,
      `"${l.userRole}"`,
      `"${l.category}"`,
      `"${l.action.replace(/"/g, '""')}"`,
      `"${l.details.replace(/"/g, '""')}"`,
      `"${l.referenceId || ''}"`,
      `"${l.previousValue || ''}"`,
      `"${l.newValue || ''}"`,
      `"${l.device || ''}"`,
      l.isRedBorder ? 'YES' : 'NO',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Activity-Audit-Log-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col h-screen bg-[#f4f6f8] items-center justify-center p-4">
        <div className="bg-white p-6 rounded-xl border border-red-200 text-center max-w-sm">
          <AlertOctagon className="w-10 h-10 text-red-600 mx-auto mb-2" />
          <h3 className="font-bold text-gray-900 text-sm">Access Restricted</h3>
          <p className="text-xs text-gray-600 mt-1">
            Activity logs are strictly reserved for Administrator accounts.
          </p>
          <button
            onClick={onOpenMenu}
            className="mt-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-xs font-semibold rounded-lg"
          >
            Back to Menu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#f4f6f8]">
      {/* Top Navbar */}
      <header className="h-14 bg-white border-b border-[#e1e3e5] px-4 flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gray-900 text-white flex items-center justify-center font-bold">
            <ClipboardList className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-gray-900 text-sm">System Audit & Activity Log</h2>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                Admin Exclusive
              </span>
            </div>
            <p className="text-[11px] text-gray-500">
              Immutable ledger of sales, inventory shifts, auth, and system actions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="py-1.5 px-3 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button onClick={onOpenMenu} className="p-2 rounded-lg hover:bg-gray-100 border border-gray-200">
            <span className="text-xs font-semibold">Menu</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 overflow-y-auto p-4 max-w-7xl w-full mx-auto space-y-4">
        {/* Filters Bar */}
        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search action, details, cashier, ID..."
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#008060]"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-gray-500 font-medium">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-2.5 py-1.5 border border-gray-300 rounded-lg bg-white text-xs font-medium"
            >
              <option value="ALL">All Categories</option>
              <option value="STOCK_ADJUSTMENT">Stock Adjustments (Red Border)</option>
              <option value="SALE">Sales</option>
              <option value="REFUND">Refunds</option>
              <option value="INVENTORY">Inventory</option>
              <option value="AUTH">Authentication</option>
              <option value="CUSTOMER">Customers</option>
              <option value="USER_MANAGEMENT">User Management</option>
              <option value="SETTINGS">Settings</option>
            </select>
          </div>

          {/* User Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-gray-500 font-medium">User:</span>
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="px-2.5 py-1.5 border border-gray-300 rounded-lg bg-white text-xs font-medium"
            >
              <option value="ALL">All Users</option>
              {userList.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>

          {/* Toggle: Red Border items only */}
          <label className="flex items-center gap-1.5 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={onlyRedBorder}
              onChange={(e) => setOnlyRedBorder(e.target.checked)}
              className="rounded text-red-600 focus:ring-red-500"
            />
            <span>Critical Inventory Events Only</span>
          </label>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-[11px] text-gray-500 bg-gray-50/80 p-2.5 rounded-lg border border-gray-200">
          <span className="font-semibold text-gray-700">Audit Markers:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 border-2 border-red-600 bg-red-50 rounded" />
            <span>Red Border: Manual Stock Add / Remove & Zero-Stock Events</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
            <span>Green: Sales Completed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
            <span>Blue: General Informational</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>Amber: Warnings & Returns</span>
          </div>
        </div>

        {/* Log Entries List */}
        <div className="space-y-2.5">
          {filteredLogs.length === 0 ? (
            <div className="bg-white p-10 text-center rounded-xl border border-gray-200 text-gray-400 text-xs">
              No activity records match your current filters.
            </div>
          ) : (
            filteredLogs.map((log) => {
              const isExpanded = expandedLogId === log.id;

              return (
                <div
                  key={log.id}
                  className={`bg-white rounded-xl transition-all shadow-xs ${
                    log.isRedBorder
                      ? 'border-2 border-red-500 hover:border-red-600'
                      : 'border border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div
                    onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                    className="p-3.5 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-2.5 select-none"
                  >
                    {/* Left: Icon, category, action */}
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0">
                        {log.isRedBorder ? (
                          <div className="w-7 h-7 rounded-lg bg-red-100 text-red-600 flex items-center justify-center font-bold">
                            <AlertOctagon className="w-4 h-4" />
                          </div>
                        ) : log.severity === 'success' ? (
                          <div className="w-7 h-7 rounded-lg bg-emerald-100 text-[#008060] flex items-center justify-center font-bold">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                        ) : log.severity === 'warning' ? (
                          <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                            <AlertTriangle className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                            <Info className="w-4 h-4" />
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs text-gray-900">{log.action}</span>
                          <span
                            className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${
                              log.isRedBorder
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {log.category}
                          </span>
                          {log.isRedBorder && (
                            <span className="text-[10px] font-bold text-red-700 uppercase bg-red-50 border border-red-300 px-1.5 py-0.2 rounded">
                              Inventory Action
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-gray-600 mt-0.5 leading-snug">{log.details}</p>
                      </div>
                    </div>

                    {/* Right: User, timestamp, expand button */}
                    <div className="flex items-center gap-3 shrink-0 text-xs text-gray-500 pl-10 md:pl-0">
                      <div className="text-left md:text-right">
                        <span className="font-semibold text-gray-800">{log.username}</span>
                        <div className="text-[11px] text-gray-400">
                          {new Date(log.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}{' '}
                          • {new Date(log.timestamp).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="text-gray-400 hover:text-gray-700">
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Audit Metadata */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-2 border-t border-gray-100 bg-gray-50/70 text-xs space-y-2 rounded-b-xl">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-gray-700">
                        <div>
                          <span className="text-[11px] text-gray-500 font-medium block">Record ID:</span>
                          <span className="font-mono text-[11px]">{log.id}</span>
                        </div>
                        <div>
                          <span className="text-[11px] text-gray-500 font-medium block">Device / Browser:</span>
                          <span className="text-[11px]">{log.device}</span>
                        </div>
                        <div>
                          <span className="text-[11px] text-gray-500 font-medium block">Location:</span>
                          <span className="text-[11px]">{log.location || 'Local Terminal (Offline)'}</span>
                        </div>
                        <div>
                          <span className="text-[11px] text-gray-500 font-medium block">Reference Key:</span>
                          <span className="font-mono text-[11px]">{log.referenceId || 'N/A'}</span>
                        </div>
                      </div>

                      {(log.previousValue !== undefined || log.newValue !== undefined) && (
                        <div className="flex items-center gap-4 pt-1 border-t border-gray-200">
                          {log.previousValue !== undefined && (
                            <div>
                              <span className="text-[10px] text-gray-500 font-medium uppercase">
                                Previous State:
                              </span>
                              <span className="font-semibold text-gray-800 ml-1.5">{log.previousValue}</span>
                            </div>
                          )}
                          {log.newValue !== undefined && (
                            <div>
                              <span className="text-[10px] text-gray-500 font-medium uppercase">
                                New State:
                              </span>
                              <span className="font-semibold text-emerald-800 ml-1.5">{log.newValue}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
