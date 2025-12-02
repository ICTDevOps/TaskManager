import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, User, Mail, Lock, Download, Upload, Save, Eye, EyeOff, Key } from 'lucide-react'
import { authService } from '../services/auth'
import { tasksService } from '../services/tasks'
import TokenManager from './TokenManager'
import ImportModal from './ImportModal'

export default function SettingsPanel({ isOpen, onClose, user, onUserUpdate, onTasksRefresh }) {
  const { t } = useTranslation(['settings', 'common'])
  const [activeTab, setActiveTab] = useState('profile')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [showImportModal, setShowImportModal] = useState(false)

  // Profile form
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || ''
  })

  // Email form
  const [emailData, setEmailData] = useState({
    newEmail: user?.email || '',
    password: ''
  })
  const [showEmailPassword, setShowEmailPassword] = useState(false)

  // Password form
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)

  // Token Manager modal
  const [showTokenManager, setShowTokenManager] = useState(false)

  const showMessage = (type, text) => {
    setMessage({ type, text })
    setTimeout(() => setMessage({ type: '', text: '' }), 5000)
  }

  // Update profile (firstName, lastName)
  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { user: updatedUser } = await authService.updateProfile(profileData)
      onUserUpdate(updatedUser)
      showMessage('success', t('profile.success'))
    } catch (err) {
      showMessage('error', err.response?.data?.error || t('profile.error'))
    } finally {
      setLoading(false)
    }
  }

  // Update email
  const handleUpdateEmail = async (e) => {
    e.preventDefault()
    if (!emailData.password) {
      showMessage('error', t('password.validation.currentRequired'))
      return
    }
    setLoading(true)
    try {
      const { user: updatedUser } = await authService.updateEmail(emailData.newEmail, emailData.password)
      onUserUpdate(updatedUser)
      setEmailData(prev => ({ ...prev, password: '' }))
      showMessage('success', t('email.success'))
    } catch (err) {
      showMessage('error', err.response?.data?.error || t('email.error'))
    } finally {
      setLoading(false)
    }
  }

  // Update password
  const handleUpdatePassword = async (e) => {
    e.preventDefault()
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showMessage('error', t('password.validation.mismatch'))
      return
    }
    if (passwordData.newPassword.length < 6) {
      showMessage('error', t('password.validation.newMin'))
      return
    }
    setLoading(true)
    try {
      await authService.updatePassword(passwordData.currentPassword, passwordData.newPassword)
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
      showMessage('success', t('password.success'))
    } catch (err) {
      showMessage('error', err.response?.data?.error || t('password.error'))
    } finally {
      setLoading(false)
    }
  }

  // Export tasks
  const handleExport = async (format) => {
    setLoading(true)
    try {
      const response = await tasksService.exportTasks(format)
      const blob = new Blob([response.data], {
        type: format === 'xml' ? 'application/xml' : 'application/json'
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `tasks-export-${new Date().toISOString().split('T')[0]}.${format}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      showMessage('success', t('tasks:export.success'))
    } catch (err) {
      showMessage('error', t('tasks:export.error'))
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const tabs = [
    { id: 'profile', label: t('tabs.profile'), icon: User },
    { id: 'email', label: t('tabs.email'), icon: Mail },
    { id: 'password', label: t('tabs.password'), icon: Lock },
    { id: 'data', label: 'Data', icon: Download },
    { id: 'api', label: 'API', icon: Key }
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('title')}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-3 text-sm font-medium transition whitespace-nowrap ${
                activeTab === tab.id
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Message */}
        {message.text && (
          <div className={`mx-4 mt-4 p-3 rounded-lg text-sm ${
            message.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800'
          }`}>
            {message.text}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('profile.firstName')}
                </label>
                <input
                  type="text"
                  value={profileData.firstName}
                  onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                  placeholder={t('profile.firstNamePlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('profile.lastName')}
                </label>
                <input
                  type="text"
                  value={profileData.lastName}
                  onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                  placeholder={t('profile.lastNamePlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('profile.username')}
                </label>
                <input
                  type="text"
                  value={user?.username || ''}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {t('profile.usernameHint')}
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Save className="h-4 w-4" />
                {t('profile.save')}
              </button>
            </form>
          )}

          {/* Email Tab */}
          {activeTab === 'email' && (
            <form onSubmit={handleUpdateEmail} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('email.new')}
                </label>
                <input
                  type="email"
                  value={emailData.newEmail}
                  onChange={(e) => setEmailData(prev => ({ ...prev, newEmail: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                  placeholder={t('email.newPlaceholder')}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('email.password')}
                </label>
                <div className="relative">
                  <input
                    type={showEmailPassword ? 'text' : 'password'}
                    value={emailData.password}
                    onChange={(e) => setEmailData(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                    placeholder={t('email.passwordPlaceholder')}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowEmailPassword(!showEmailPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showEmailPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Save className="h-4 w-4" />
                {t('email.save')}
              </button>
            </form>
          )}

          {/* Password Tab */}
          {activeTab === 'password' && (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('password.current')}
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                    placeholder={t('password.currentPlaceholder')}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('password.new')}
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                    placeholder={t('password.newPlaceholder')}
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('password.confirm')}
                </label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                  placeholder={t('password.confirmPlaceholder')}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Lock className="h-4 w-4" />
                {t('password.save')}
              </button>
            </form>
          )}

          {/* Data Tab (Export/Import) */}
          {activeTab === 'data' && (
            <div className="space-y-6">
              {/* Export Section */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                  {t('tasks:export.title')}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {t('tasks:export.title')}
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleExport('json')}
                    disabled={loading}
                    className="flex items-center justify-center gap-2 p-3 border-2 border-gray-200 dark:border-gray-600 rounded-lg hover:border-primary hover:bg-primary/5 transition disabled:opacity-50"
                  >
                    <Download className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <span className="font-medium text-gray-900 dark:text-white">JSON</span>
                  </button>

                  <button
                    onClick={() => handleExport('xml')}
                    disabled={loading}
                    className="flex items-center justify-center gap-2 p-3 border-2 border-gray-200 dark:border-gray-600 rounded-lg hover:border-primary hover:bg-primary/5 transition disabled:opacity-50"
                  >
                    <Download className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <span className="font-medium text-gray-900 dark:text-white">XML</span>
                  </button>
                </div>
              </div>

              {/* Separator */}
              <div className="border-t border-gray-200 dark:border-gray-700" />

              {/* Import Section */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                  {t('tasks:import.title')}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {t('tasks:import.selectFileDescription')}
                </p>

                <button
                  onClick={() => setShowImportModal(true)}
                  className="w-full flex items-center justify-center gap-2 p-3 bg-primary hover:bg-primary-dark text-white rounded-lg transition"
                >
                  <Upload className="h-5 w-5" />
                  <span>{t('tasks:import.selectFile')}</span>
                </button>
              </div>
            </div>
          )}

          {/* API Tab */}
          {activeTab === 'api' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('tokens.description')}
              </p>

              {user?.canCreateApiTokens ? (
                <button
                  onClick={() => setShowTokenManager(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary hover:bg-primary-dark text-white rounded-lg transition"
                >
                  <Key className="h-5 w-5" />
                  {t('tokens.title')}
                </button>
              ) : (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    {t('tokens.noAccess')}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Token Manager Modal */}
      {showTokenManager && (
        <TokenManager onClose={() => setShowTokenManager(false)} />
      )}

      {/* Import Modal */}
      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportComplete={() => {
          setShowImportModal(false)
          showMessage('success', t('tasks:import.success'))
          if (onTasksRefresh) onTasksRefresh()
        }}
      />
    </div>
  )
}
