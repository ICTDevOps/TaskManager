import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Key,
  Plus,
  Trash2,
  Copy,
  Check,
  AlertCircle,
  Clock,
  Activity,
  Eye,
  EyeOff,
  Shield,
  Ban
} from 'lucide-react'
import { getTokens, createToken, deleteToken, revokeToken } from '../services/tokens'

export default function TokenManager({ onClose }) {
  const { t, i18n } = useTranslation(['tokens'])
  const [tokens, setTokens] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // État pour la création de token
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newTokenName, setNewTokenName] = useState('')
  const [newTokenExpiry, setNewTokenExpiry] = useState('never')
  const [newTokenPermissions, setNewTokenPermissions] = useState({
    canReadTasks: true,
    canCreateTasks: false,
    canUpdateTasks: false,
    canDeleteTasks: false,
    canReadCategories: true,
    canCreateCategories: false
  })
  const [creating, setCreating] = useState(false)

  // Token nouvellement créé (affiché une seule fois)
  const [newlyCreatedToken, setNewlyCreatedToken] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    loadTokens()
  }, [])

  const loadTokens = async () => {
    try {
      setLoading(true)
      const data = await getTokens()
      setTokens(data.tokens || [])
    } catch (err) {
      setError(err.response?.data?.error || t('messages.loadError'))
    } finally {
      setLoading(false)
    }
  }

  const handleCreateToken = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!newTokenName.trim()) {
      setError(t('form.nameRequired'))
      return
    }

    try {
      setCreating(true)
      const expiresIn = newTokenExpiry === 'never' ? null : parseInt(newTokenExpiry)

      const data = await createToken({
        name: newTokenName.trim(),
        expiresIn,
        permissions: newTokenPermissions
      })

      setNewlyCreatedToken(data.token)
      setTokens(prev => [data.tokenInfo, ...prev])
      setShowCreateForm(false)
      setNewTokenName('')
      setNewTokenExpiry('never')
      setNewTokenPermissions({
        canReadTasks: true,
        canCreateTasks: false,
        canUpdateTasks: false,
        canDeleteTasks: false,
        canReadCategories: true,
        canCreateCategories: false
      })
    } catch (err) {
      setError(err.response?.data?.error || t('messages.createError'))
    } finally {
      setCreating(false)
    }
  }

  const handleCopyToken = async () => {
    if (newlyCreatedToken) {
      await navigator.clipboard.writeText(newlyCreatedToken)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleDeleteToken = async (id, name) => {
    if (!confirm(t('confirm.delete', { name }))) return

    try {
      await deleteToken(id)
      setTokens(prev => prev.filter(t => t.id !== id))
      setSuccess(t('messages.deleted'))
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.error || t('messages.deleteError'))
    }
  }

  const handleRevokeToken = async (id, name) => {
    if (!confirm(t('confirm.revoke', { name }))) return

    try {
      await revokeToken(id)
      setTokens(prev => prev.map(t => t.id === id ? { ...t, isActive: false } : t))
      setSuccess(t('messages.revoked'))
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.error || t('messages.revokeError'))
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return t('dates.never')
    const locale = i18n.language === 'fr' ? 'fr-FR' : 'en-US'
    return new Date(dateString).toLocaleDateString(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getPermissionsList = (token) => {
    const perms = []
    if (token.canReadTasks) perms.push(t('permissions.read'))
    if (token.canCreateTasks) perms.push(t('permissions.create'))
    if (token.canUpdateTasks) perms.push(t('permissions.update'))
    if (token.canDeleteTasks) perms.push(t('permissions.delete'))
    return perms.join(', ') || t('permissions.none')
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose}></div>

        <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Key className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {t('title')}
              </h2>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
              <span className="sr-only">{t('close')}</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Messages */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-600 dark:text-green-400">
                <Check className="h-5 w-5 flex-shrink-0" />
                <span>{success}</span>
              </div>
            )}

            {/* Token nouvellement créé */}
            {newlyCreatedToken && (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                      {t('created.title')}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <code className="flex-1 px-3 py-2 bg-white dark:bg-gray-900 rounded border border-yellow-300 dark:border-yellow-700 text-sm font-mono text-gray-900 dark:text-gray-100 break-all">
                        {newlyCreatedToken}
                      </code>
                      <button
                        onClick={handleCopyToken}
                        className="p-2 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-900/50 rounded"
                      >
                        {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                      </button>
                    </div>
                    <button
                      onClick={() => setNewlyCreatedToken(null)}
                      className="mt-2 text-sm text-yellow-600 dark:text-yellow-400 hover:underline"
                    >
                      {t('created.copied')}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Bouton créer */}
            {!showCreateForm && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition"
              >
                <Plus className="h-4 w-4" />
                {t('createButton')}
              </button>
            )}

            {/* Formulaire de création */}
            {showCreateForm && (
              <form onSubmit={handleCreateToken} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-4">
                <h3 className="font-medium text-gray-900 dark:text-white">{t('newToken')}</h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('form.name')}
                  </label>
                  <input
                    type="text"
                    value={newTokenName}
                    onChange={(e) => setNewTokenName(e.target.value)}
                    placeholder={t('form.namePlaceholder')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('form.expiration')}
                  </label>
                  <select
                    value={newTokenExpiry}
                    onChange={(e) => setNewTokenExpiry(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="never">{t('expiry.never')}</option>
                    <option value="7">{t('expiry.7days')}</option>
                    <option value="30">{t('expiry.30days')}</option>
                    <option value="90">{t('expiry.90days')}</option>
                    <option value="365">{t('expiry.1year')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('form.permissions')}
                  </label>
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{t('form.tasks')}</p>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={newTokenPermissions.canReadTasks}
                        onChange={(e) => setNewTokenPermissions(p => ({ ...p, canReadTasks: e.target.checked }))}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{t('permissions.readTasks')}</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={newTokenPermissions.canCreateTasks}
                        onChange={(e) => setNewTokenPermissions(p => ({ ...p, canCreateTasks: e.target.checked }))}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{t('permissions.createTasks')}</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={newTokenPermissions.canUpdateTasks}
                        onChange={(e) => setNewTokenPermissions(p => ({ ...p, canUpdateTasks: e.target.checked }))}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{t('permissions.updateTasks')}</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={newTokenPermissions.canDeleteTasks}
                        onChange={(e) => setNewTokenPermissions(p => ({ ...p, canDeleteTasks: e.target.checked }))}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{t('permissions.deleteTasks')}</span>
                    </label>

                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 mb-2">{t('form.categories')}</p>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={newTokenPermissions.canReadCategories}
                        onChange={(e) => setNewTokenPermissions(p => ({ ...p, canReadCategories: e.target.checked }))}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{t('permissions.readCategories')}</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={newTokenPermissions.canCreateCategories}
                        onChange={(e) => setNewTokenPermissions(p => ({ ...p, canCreateCategories: e.target.checked }))}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{t('permissions.createCategories')}</span>
                    </label>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition disabled:opacity-50"
                  >
                    {creating ? t('form.creating') : t('form.create')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                  >
                    {t('form.cancel')}
                  </button>
                </div>
              </form>
            )}

            {/* Liste des tokens */}
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900 dark:text-white">
                {t('myTokens', { count: tokens.length, max: 10 })}
              </h3>

              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                </div>
              ) : tokens.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                  {t('noTokens')}
                </p>
              ) : (
                <div className="space-y-3">
                  {tokens.map((token) => (
                    <div
                      key={token.id}
                      className={`p-4 border rounded-lg ${
                        token.isActive
                          ? 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                          : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 dark:text-white">
                              {token.name}
                            </span>
                            {!token.isActive && (
                              <span className="px-2 py-0.5 text-xs bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 rounded">
                                {t('status.revoked')}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 font-mono mt-1">
                            {token.tokenPrefix}
                          </p>

                          <div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                              <Shield className="h-3 w-3" />
                              {getPermissionsList(token)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {t('dates.createdAt', { date: formatDate(token.createdAt) })}
                            </span>
                            {token.lastUsedAt && (
                              <span className="flex items-center gap-1">
                                <Activity className="h-3 w-3" />
                                {t('dates.lastUsedAt', { date: formatDate(token.lastUsedAt) })}
                              </span>
                            )}
                            {token.expiresAt && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {t('dates.expiresAt', { date: formatDate(token.expiresAt) })}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {token.isActive && (
                            <button
                              onClick={() => handleRevokeToken(token.id, token.name)}
                              className="p-2 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded"
                              title={t('actions.revoke')}
                            >
                              <Ban className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteToken(token.id, token.name)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                            title={t('actions.delete')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Info MCP */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                {t('info.title')}
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
                {t('info.description')}
              </p>
              <div className="text-xs text-blue-600 dark:text-blue-400 font-mono space-y-1">
                <p><strong>{t('info.apiRest')}</strong> Authorization: Bearer pat_xxxx</p>
                <p><strong>{t('info.mcpSse')}</strong> /mcp/sse avec header Authorization</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
