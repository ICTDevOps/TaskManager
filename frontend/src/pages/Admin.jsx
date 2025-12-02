import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import {
  Users, CheckSquare, BarChart3, LogOut, Search,
  Shield, ShieldOff, UserX, UserCheck, Key, Download, Upload,
  Trash2, AlertTriangle, X, RefreshCw, Cpu
} from 'lucide-react';
import { adminService } from '../services/admin';
import ImportModal from '../components/ImportModal';
import LanguageSelector from '../components/LanguageSelector';

export default function Admin() {
  const { t } = useTranslation(['admin']);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Modal states
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalType, setModalType] = useState(null); // 'password' | 'delete'
  const [newPassword, setNewPassword] = useState('');
  const [exportBeforeDelete, setExportBeforeDelete] = useState(true);
  const [modalLoading, setModalLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Import modal state
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importTargetUser, setImportTargetUser] = useState(null);

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/');
      return;
    }
    loadData();
  }, [user, navigate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, usersData] = await Promise.all([
        adminService.getStats(),
        adminService.getUsers()
      ]);
      setStats(statsData);
      setUsers(usersData.users);
    } catch (err) {
      showMessage('error', t('messages.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleToggleRole = async (userId, currentRole) => {
    try {
      const newRole = currentRole === 'admin' ? 'user' : 'admin';
      await adminService.updateUser(userId, { role: newRole });
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      showMessage('success', t('messages.roleUpdated'));
    } catch (err) {
      showMessage('error', err.response?.data?.error || t('messages.error'));
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    try {
      await adminService.updateUser(userId, { isActive: !currentStatus });
      setUsers(users.map(u => u.id === userId ? { ...u, isActive: !currentStatus } : u));
      showMessage('success', currentStatus ? t('messages.userDeactivated') : t('messages.userActivated'));
    } catch (err) {
      showMessage('error', err.response?.data?.error || t('messages.error'));
    }
  };

  const handleToggleApiAccess = async (userId, currentValue) => {
    try {
      await adminService.updateUser(userId, { canCreateApiTokens: !currentValue });
      setUsers(users.map(u => u.id === userId ? { ...u, canCreateApiTokens: !currentValue } : u));
      showMessage('success', currentValue ? t('messages.apiAccessDisabled') : t('messages.apiAccessEnabled'));
    } catch (err) {
      showMessage('error', err.response?.data?.error || t('messages.error'));
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      showMessage('error', t('modals.changePassword.minLength'));
      return;
    }
    setModalLoading(true);
    try {
      await adminService.changeUserPassword(selectedUser.id, newPassword);
      showMessage('success', t('modals.changePassword.success'));
      closeModal();
    } catch (err) {
      showMessage('error', err.response?.data?.error || t('modals.changePassword.error'));
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    setModalLoading(true);
    try {
      const result = await adminService.deleteUser(selectedUser.id, exportBeforeDelete);

      // If export was requested and returned, download it
      if (exportBeforeDelete && result.export) {
        const blob = new Blob([JSON.stringify(result.export, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${selectedUser.username}-tasks-backup.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }

      setUsers(users.filter(u => u.id !== selectedUser.id));
      showMessage('success', t('modals.deleteUser.success'));
      closeModal();
      loadData(); // Refresh stats
    } catch (err) {
      showMessage('error', err.response?.data?.error || t('modals.deleteUser.error'));
    } finally {
      setModalLoading(false);
    }
  };

  const handleExportUserTasks = async (userId, username, format) => {
    try {
      const response = await adminService.exportUserTasks(userId, format);
      const blob = new Blob([response.data], {
        type: format === 'xml' ? 'application/xml' : 'application/json'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${username}-tasks-export.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      showMessage('success', t('messages.exportSuccess'));
    } catch (err) {
      showMessage('error', t('messages.exportError'));
    }
  };

  const closeModal = () => {
    setSelectedUser(null);
    setModalType(null);
    setNewPassword('');
    setExportBeforeDelete(true);
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = searchTerm === '' ||
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.firstName && u.firstName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (u.lastName && u.lastName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesRole = filterRole === 'all' || u.role === filterRole;
    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'active' && u.isActive) ||
      (filterStatus === 'inactive' && !u.isActive);

    return matchesSearch && matchesRole && matchesStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                {t('title')}
              </span>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {user?.username}
              </span>
              <LanguageSelector />
              <button
                onClick={logout}
                className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
              >
                <LogOut className="h-4 w-4" />
                {t('logout')}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Message */}
      {message.text && (
        <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4`}>
          <div className={`p-3 rounded-lg text-sm ${
            message.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800'
          }`}>
            {message.text}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition ${
              activeTab === 'dashboard'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            {t('tabs.dashboard')}
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition ${
              activeTab === 'users'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
            }`}
          >
            <Users className="h-4 w-4" />
            {t('tabs.users')}
          </button>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && stats && (
          <div className="space-y-6">
            {/* Stats cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('stats.totalUsers')}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.users.total}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t('stats.activeInactive', { active: stats.users.active, inactive: stats.users.inactive })}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <CheckSquare className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('stats.totalTasks')}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.tasks.total}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t('stats.activeCompleted', { active: stats.tasks.active, completed: stats.tasks.completed })}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <BarChart3 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('stats.completionRate')}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.tasks.completionRate}%</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                    <CheckSquare className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('stats.categories')}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.categories.total}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Top users */}
            {stats.topUsers && stats.topUsers.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {t('topUsers.title')}
                </h3>
                <div className="space-y-3">
                  {stats.topUsers.map((u, index) => (
                    <div key={u.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-primary text-white text-sm font-medium flex items-center justify-center">
                          {index + 1}
                        </span>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{u.name}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">@{u.username}</p>
                        </div>
                      </div>
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {t('topUsers.taskCount', { count: u.taskCount })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={t('users.search')}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  />
                </div>

                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="all">{t('filters.allRoles')}</option>
                  <option value="user">{t('filters.users')}</option>
                  <option value="admin">{t('filters.admins')}</option>
                </select>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="all">{t('filters.allStatuses')}</option>
                  <option value="active">{t('filters.active')}</option>
                  <option value="inactive">{t('filters.inactive')}</option>
                </select>

                <button
                  onClick={loadData}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                >
                  <RefreshCw className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Users list */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('users.table.user')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('users.table.email')}</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('users.table.role')}</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('users.table.status')}</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('users.table.tasks')}</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('users.table.apiAccess')}</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('users.table.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredUsers.map(u => (
                    <tr key={u.id} className={!u.isActive ? 'opacity-60' : ''}>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {u.firstName || u.lastName ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : u.username}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">@{u.username}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{u.email}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          u.role === 'admin'
                            ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400'
                        }`}>
                          {u.role === 'admin' ? <Shield className="h-3 w-3" /> : null}
                          {u.role === 'admin' ? t('users.roles.admin') : t('users.roles.user')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          u.isActive
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                        }`}>
                          {u.isActive ? t('users.status.active') : t('users.status.inactive')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-600 dark:text-gray-400">
                        {u.taskCount}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleToggleApiAccess(u.id, u.canCreateApiTokens)}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition ${
                            u.canCreateApiTokens
                              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                          title={u.canCreateApiTokens ? t('users.apiAccess.disable') : t('users.apiAccess.enable')}
                        >
                          <Cpu className="h-3 w-3" />
                          {u.canCreateApiTokens ? t('users.apiAccess.enabled') : t('users.apiAccess.disabled')}
                          {u.apiTokenCount > 0 && (
                            <span className="ml-1 text-xs">({u.apiTokenCount})</span>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleToggleRole(u.id, u.role)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                            title={u.role === 'admin' ? t('users.actions.demoteAdmin') : t('users.actions.promoteAdmin')}
                          >
                            {u.role === 'admin' ? (
                              <ShieldOff className="h-4 w-4 text-gray-500" />
                            ) : (
                              <Shield className="h-4 w-4 text-gray-500" />
                            )}
                          </button>

                          <button
                            onClick={() => handleToggleStatus(u.id, u.isActive)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                            title={u.isActive ? t('users.actions.deactivate') : t('users.actions.activate')}
                          >
                            {u.isActive ? (
                              <UserX className="h-4 w-4 text-gray-500" />
                            ) : (
                              <UserCheck className="h-4 w-4 text-gray-500" />
                            )}
                          </button>

                          <button
                            onClick={() => { setSelectedUser(u); setModalType('password'); }}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                            title={t('users.actions.changePassword')}
                          >
                            <Key className="h-4 w-4 text-gray-500" />
                          </button>

                          <button
                            onClick={() => handleExportUserTasks(u.id, u.username, 'json')}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                            title={t('users.actions.exportTasks')}
                          >
                            <Download className="h-4 w-4 text-gray-500" />
                          </button>

                          <button
                            onClick={() => { setImportTargetUser(u); setImportModalOpen(true); }}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                            title={t('users.actions.importTasks')}
                          >
                            <Upload className="h-4 w-4 text-gray-500" />
                          </button>

                          <button
                            onClick={() => { setSelectedUser(u); setModalType('delete'); }}
                            className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition"
                            title={t('users.actions.delete')}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredUsers.length === 0 && (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  {t('users.noUsers')}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Change Password Modal */}
      {modalType === 'password' && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('modals.changePassword.title')}
              </h3>
              <button onClick={closeModal} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('modals.changePassword.subtitle')} <strong>{selectedUser.username}</strong>
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('modals.changePassword.newPassword')}
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  placeholder={t('modals.changePassword.newPasswordPlaceholder')}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  {t('modals.changePassword.cancel')}
                </button>
                <button
                  onClick={handleChangePassword}
                  disabled={modalLoading}
                  className="flex-1 px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition disabled:opacity-50"
                >
                  {modalLoading ? t('modals.changePassword.submitting') : t('modals.changePassword.submit')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {modalType === 'delete' && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                {t('modals.deleteUser.title')}
              </h3>
              <button onClick={closeModal} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('modals.deleteUser.message')} <strong>{selectedUser.username}</strong> ?
                {' '}{t('modals.deleteUser.warning')}
              </p>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={exportBeforeDelete}
                  onChange={(e) => setExportBeforeDelete(e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600 text-primary focus:ring-primary"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {t('modals.deleteUser.exportFirst')}
                </span>
              </label>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  {t('modals.deleteUser.cancel')}
                </button>
                <button
                  onClick={handleDeleteUser}
                  disabled={modalLoading}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition disabled:opacity-50"
                >
                  {modalLoading ? t('modals.deleteUser.submitting') : t('modals.deleteUser.submit')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      <ImportModal
        isOpen={importModalOpen}
        onClose={() => {
          setImportModalOpen(false);
          setImportTargetUser(null);
        }}
        onImportComplete={() => {
          setImportModalOpen(false);
          setImportTargetUser(null);
          showMessage('success', t('messages.importSuccess', { username: importTargetUser?.username }));
          loadData(); // Refresh stats
        }}
        targetUserId={importTargetUser?.id}
        targetUserName={importTargetUser?.username}
      />
    </div>
  );
}
