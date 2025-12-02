import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, History, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { activityService } from '../services/activity';

export default function ActivityLogPanel({ isOpen, onClose, currentOwnerId = null }) {
  const { t, i18n } = useTranslation(['activity']);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [filter, setFilter] = useState('all'); // all, tasks, categories

  useEffect(() => {
    if (isOpen) {
      loadLogs();
    }
  }, [isOpen, pagination.page, filter, currentOwnerId]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: 20
      };
      if (currentOwnerId && currentOwnerId !== 'self') {
        params.ownerId = currentOwnerId;
      }

      const data = await activityService.getActivityLog(params);

      let filteredLogs = data.logs;
      if (filter === 'tasks') {
        filteredLogs = data.logs.filter(log => log.entityType === 'task');
      } else if (filter === 'categories') {
        filteredLogs = data.logs.filter(log => log.entityType === 'category');
      }

      setLogs(filteredLogs);
      setPagination(prev => ({
        ...prev,
        totalPages: data.pagination.totalPages,
        total: data.pagination.total
      }));
    } catch (err) {
      console.error('Erreur chargement journal:', err);
    } finally {
      setLoading(false);
    }
  };

  const getActionLabel = (action) => {
    return t(`actions.${action}`, { defaultValue: action });
  };

  const getActionIcon = (action) => {
    if (action.includes('created')) return '➕';
    if (action.includes('updated')) return '✏️';
    if (action.includes('deleted')) return '🗑️';
    if (action.includes('completed')) return '✅';
    if (action.includes('reopened')) return '🔄';
    return '📋';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const diffMinutes = Math.floor(diff / 60000);
    const diffHours = Math.floor(diff / 3600000);
    const diffDays = Math.floor(diff / 86400000);
    const locale = i18n.language === 'fr' ? 'fr-FR' : 'en-US';

    if (diffMinutes < 1) return t('dates.justNow');
    if (diffMinutes < 60) return t('dates.minutesAgo', { count: diffMinutes });
    if (diffHours < 24) return t('dates.hoursAgo', { count: diffHours });
    if (diffDays < 7) return t('dates.daysAgo', { count: diffDays });

    return date.toLocaleDateString(locale, {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActorName = (log) => {
    if (log.isOwnAction) return t('actors.you');
    const actor = log.actor;
    if (actor.firstName || actor.lastName) {
      return `${actor.firstName || ''} ${actor.lastName || ''}`.trim();
    }
    return actor.username;
  };

  const getTargetOwnerName = (log) => {
    if (!log.targetOwner) return null;
    const target = log.targetOwner;
    if (target.firstName || target.lastName) {
      return `${target.firstName || ''} ${target.lastName || ''}`.trim();
    }
    return target.username;
  };

  const groupLogsByDate = (logs) => {
    const groups = {};
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    const locale = i18n.language === 'fr' ? 'fr-FR' : 'en-US';

    logs.forEach(log => {
      const logDate = new Date(log.createdAt).toDateString();
      let groupKey;

      if (logDate === today) {
        groupKey = t('dates.today');
      } else if (logDate === yesterday) {
        groupKey = t('dates.yesterday');
      } else {
        groupKey = new Date(log.createdAt).toLocaleDateString(locale, {
          weekday: 'long',
          day: 'numeric',
          month: 'long'
        });
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(log);
    });

    return groups;
  };

  if (!isOpen) return null;

  const groupedLogs = groupLogsByDate(logs);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('title')}</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Filtres */}
        <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex gap-2">
          <button
            onClick={() => { setFilter('all'); setPagination(p => ({ ...p, page: 1 })); }}
            className={`px-3 py-1 text-sm rounded-full transition ${
              filter === 'all'
                ? 'bg-primary text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {t('filters.all')}
          </button>
          <button
            onClick={() => { setFilter('tasks'); setPagination(p => ({ ...p, page: 1 })); }}
            className={`px-3 py-1 text-sm rounded-full transition ${
              filter === 'tasks'
                ? 'bg-primary text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {t('filters.tasks')}
          </button>
          <button
            onClick={() => { setFilter('categories'); setPagination(p => ({ ...p, page: 1 })); }}
            className={`px-3 py-1 text-sm rounded-full transition ${
              filter === 'categories'
                ? 'bg-primary text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {t('filters.categories')}
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8">
              <History className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">{t('noActivity')}</p>
            </div>
          ) : (
            <div className="p-4">
              {Object.entries(groupedLogs).map(([date, logsGroup]) => (
                <div key={date} className="mb-4">
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    {date}
                  </h3>
                  <div className="space-y-2">
                    {logsGroup.map(log => (
                      <div
                        key={log.id}
                        className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                      >
                        <span className="text-lg">{getActionIcon(log.action)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 dark:text-white">
                            <span className={`font-medium ${log.isOwnAction ? 'text-primary' : 'text-blue-600 dark:text-blue-400'}`}>
                              {getActorName(log)}
                            </span>
                            {' '}{getActionLabel(log.action)}{' '}
                            <span className="font-medium">"{log.entityTitle}"</span>
                            {log.targetOwner && (
                              <span className="text-gray-500 dark:text-gray-400">
                                {' '}{t('actors.forOwner', { name: '' })}<span className="font-medium text-blue-600 dark:text-blue-400">{getTargetOwnerName(log)}</span>
                              </span>
                            )}
                          </p>
                          {log.details && (
                            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                              {Object.entries(log.details).map(([key, value]) => (
                                <span key={key} className="mr-2">
                                  {key}: {value.old} → {value.new}
                                </span>
                              ))}
                            </div>
                          )}
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            {formatDate(log.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('pagination.page', { current: pagination.page, total: pagination.totalPages })}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPagination(p => ({ ...p, page: Math.max(1, p.page - 1) }))}
                disabled={pagination.page === 1}
                className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-5 w-5 text-gray-500" />
              </button>
              <button
                onClick={() => setPagination(p => ({ ...p, page: Math.min(p.totalPages, p.page + 1) }))}
                disabled={pagination.page === pagination.totalPages}
                className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-5 w-5 text-gray-500" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
