import React, { useState } from 'react';
import { User, Role, AppSettings } from '../../types/pos';
import { StorageService } from '../../utils/storage';
import {
  ShieldCheck,
  UserPlus,
  Search,
  Lock,
  Unlock,
  Edit2,
  Trash2,
  AlertTriangle,
  X,
  UserCheck,
  UserX,
} from 'lucide-react';

interface UserManagementViewProps {
  currentUser: User;
  settings: AppSettings;
  onOpenMenu: () => void;
  onLogoutIfSelfDeactivated?: () => void;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({
  currentUser,
  settings,
  onOpenMenu,
  onLogoutIfSelfDeactivated,
}) => {
  const [users, setUsers] = useState<User[]>(() => StorageService.getUsers());
  const [search, setSearch] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<Role>('User');

  const isAdmin = currentUser.role === 'Admin';

  const handleOpenCreate = () => {
    setError(null);
    setEditingUser(null);
    setFormUsername('');
    setFormPassword('');
    setFormRole('User');
    setIsCreating(true);
  };

  const handleOpenEdit = (u: User) => {
    setError(null);
    setEditingUser(u);
    setFormUsername(u.username);
    setFormPassword(u.passwordHash);
    setFormRole(u.role);
    setIsCreating(false);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUsername = formUsername.trim();
    if (!cleanUsername || !formPassword.trim()) {
      setError('Username and password are required.');
      return;
    }

    if (editingUser) {
      // Check if username taken by another user
      const duplicate = users.find(
        (u) => u.id !== editingUser.id && u.username.toLowerCase() === cleanUsername.toLowerCase()
      );
      if (duplicate) {
        setError(`Username "${cleanUsername}" is already taken by another account.`);
        return;
      }

      // Check: Prevent demoting last active Admin
      if (editingUser.role === 'Admin' && formRole === 'User') {
        const activeAdmins = users.filter((u) => u.role === 'Admin' && u.status === 'active' && u.id !== editingUser.id);
        if (activeAdmins.length === 0) {
          setError('Cannot demote this user. There must be at least one active Admin account in the system.');
          return;
        }
      }

      const updatedUser: User = {
        ...editingUser,
        username: cleanUsername,
        passwordHash: formPassword.trim(),
        role: formRole,
      };

      const next = users.map((u) => (u.id === editingUser.id ? updatedUser : u));
      StorageService.saveUsers(next);
      setUsers(next);

      StorageService.logActivity(
        currentUser,
        'USER_MANAGEMENT',
        'User account updated',
        `Updated credentials/role for user "${updatedUser.username}" (${updatedUser.role})`,
        { referenceId: updatedUser.id, severity: 'info' }
      );

      setEditingUser(null);
    } else {
      // Check for duplicate username
      const duplicate = users.find(
        (u) => u.username.toLowerCase() === cleanUsername.toLowerCase()
      );
      if (duplicate) {
        setError(`Username "${cleanUsername}" already exists.`);
        return;
      }

      const newUser: User = {
        id: `user-${Date.now()}`,
        username: cleanUsername,
        passwordHash: formPassword.trim(),
        role: formRole,
        status: 'active',
        createdAt: Date.now(),
      };

      const next = [...users, newUser];
      StorageService.saveUsers(next);
      setUsers(next);

      StorageService.logActivity(
        currentUser,
        'USER_MANAGEMENT',
        'User account created',
        `Created new ${newUser.role} user "${newUser.username}"`,
        { referenceId: newUser.id, severity: 'info' }
      );

      setIsCreating(false);
    }
  };

  const handleToggleFreeze = (targetUser: User) => {
    // Prevent freezing the currently logged-in Admin or last active Admin
    if (targetUser.id === currentUser.id) {
      alert('You cannot freeze your own active Admin account.');
      return;
    }

    if (targetUser.role === 'Admin' && targetUser.status === 'active') {
      const activeAdmins = users.filter((u) => u.role === 'Admin' && u.status === 'active' && u.id !== targetUser.id);
      if (activeAdmins.length === 0) {
        alert('Cannot freeze the last active Admin account in the system.');
        return;
      }
    }

    const nextStatus = targetUser.status === 'active' ? 'frozen' : 'active';
    const updated = { ...targetUser, status: nextStatus as 'active' | 'frozen' };
    const nextList = users.map((u) => (u.id === targetUser.id ? updated : u));
    StorageService.saveUsers(nextList);
    setUsers(nextList);

    StorageService.logActivity(
      currentUser,
      'USER_MANAGEMENT',
      nextStatus === 'frozen' ? 'User frozen' : 'User unfrozen',
      `${nextStatus === 'frozen' ? 'Frozen' : 'Unfrozen'} account "${targetUser.username}"`,
      { referenceId: targetUser.id, severity: nextStatus === 'frozen' ? 'warning' : 'info' }
    );
  };

  const handleDeleteUser = () => {
    if (!userToDelete) return;

    if (userToDelete.id === currentUser.id) {
      setError('You cannot delete your own currently logged-in account.');
      setUserToDelete(null);
      return;
    }

    if (userToDelete.role === 'Admin') {
      const remainingAdmins = users.filter((u) => u.role === 'Admin' && u.id !== userToDelete.id);
      if (remainingAdmins.length === 0) {
        setError('Cannot delete the last remaining Admin account in the system.');
        setUserToDelete(null);
        return;
      }
    }

    const nextList = users.filter((u) => u.id !== userToDelete.id);
    StorageService.saveUsers(nextList);
    setUsers(nextList);

    StorageService.logActivity(
      currentUser,
      'USER_MANAGEMENT',
      'User account deleted',
      `Deleted user account "${userToDelete.username}"`,
      { referenceId: userToDelete.id, severity: 'danger' }
    );

    setUserToDelete(null);
  };

  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-screen bg-[#f4f6f8]">
      {/* Top Navbar */}
      <header className="h-14 bg-white border-b border-[#e1e3e5] px-4 flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#008060] text-white flex items-center justify-center font-bold">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-gray-900 text-sm">Staff & User Management</h2>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                Admin Area
              </span>
            </div>
            <p className="text-[11px] text-gray-500">Configure cashier roles, credentials, and access freeze</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenCreate}
            className="py-1.5 px-3 bg-[#008060] hover:bg-[#006e52] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create User</span>
          </button>
          <button onClick={onOpenMenu} className="p-2 rounded-lg hover:bg-gray-100 border border-gray-200">
            <span className="text-xs font-semibold">Menu</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 overflow-y-auto p-4 max-w-5xl w-full mx-auto space-y-4">
        {/* Search */}
        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search user accounts by username..."
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#008060]"
            />
          </div>
        </div>

        {/* User Accounts Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase font-semibold">
              <tr>
                <th className="p-3">Username & Role</th>
                <th className="p-3">Status</th>
                <th className="p-3">Created</th>
                <th className="p-3">Last Active</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-800">
              {filteredUsers.map((u) => {
                const isSelf = u.id === currentUser.id;
                const isFrozen = u.status === 'frozen';

                return (
                  <tr key={u.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="p-3 font-semibold text-gray-900">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                            u.role === 'Admin'
                              ? 'bg-emerald-100 text-[#008060]'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {u.username.slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span>{u.username}</span>
                            {isSelf && (
                              <span className="text-[10px] bg-gray-200 text-gray-700 font-semibold px-1.5 py-0.2 rounded">
                                You
                              </span>
                            )}
                          </div>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider ${
                              u.role === 'Admin' ? 'text-[#008060]' : 'text-blue-600'
                            }`}
                          >
                            {u.role}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="p-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider ${
                          isFrozen
                            ? 'bg-red-100 text-red-700'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isFrozen ? 'bg-red-500' : 'bg-emerald-500'
                          }`}
                        />
                        {u.status}
                      </span>
                    </td>

                    <td className="p-3 text-gray-500">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>

                    <td className="p-3 text-gray-500">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never'}
                    </td>

                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Freeze / Unfreeze Button */}
                        <button
                          onClick={() => handleToggleFreeze(u)}
                          disabled={isSelf}
                          className={`p-1.5 rounded transition-colors ${
                            isFrozen
                              ? 'text-emerald-700 hover:bg-emerald-50'
                              : 'text-amber-700 hover:bg-amber-50'
                          } disabled:opacity-30`}
                          title={isFrozen ? 'Unfreeze Account' : 'Freeze Account'}
                        >
                          {isFrozen ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                        </button>

                        {/* Edit Button */}
                        <button
                          onClick={() => handleOpenEdit(u)}
                          className="p-1.5 text-gray-600 hover:text-blue-600 rounded hover:bg-gray-100"
                          title="Edit Credentials & Role"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => setUserToDelete(u)}
                          disabled={isSelf}
                          className="p-1.5 text-gray-600 hover:text-red-600 rounded hover:bg-gray-100 disabled:opacity-30"
                          title="Delete User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit User Modal */}
      {(isCreating || editingUser) && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <h3 className="font-bold text-gray-900 text-sm">
                {editingUser ? `Edit Account: ${editingUser.username}` : 'Create New User Account'}
              </h3>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setEditingUser(null);
                }}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-5 space-y-3.5">
              {error && (
                <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Username *
                </label>
                <input
                  type="text"
                  required
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#008060]"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Password *
                </label>
                <input
                  type="text"
                  required
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#008060]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Role Assignment *
                </label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as Role)}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-[#008060]"
                >
                  <option value="User">User (Standard POS Cashier)</option>
                  <option value="Admin">Admin (Full System Access & User Management)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setEditingUser(null);
                  }}
                  className="px-4 py-2 text-xs text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-[#008060] hover:bg-[#006e52] rounded-lg shadow-sm"
                >
                  Save User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-5 max-w-sm w-full text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-gray-900 text-sm">Delete Account?</h4>
            <p className="text-xs text-gray-600">
              Are you sure you want to permanently delete user &quot;{userToDelete.username}&quot;?
            </p>
            <div className="flex justify-center gap-2 pt-2">
              <button
                onClick={() => setUserToDelete(null)}
                className="px-3 py-1.5 text-xs text-gray-700 bg-gray-100 rounded-md font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                className="px-4 py-1.5 text-xs text-white bg-red-600 hover:bg-red-700 rounded-md font-semibold"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
