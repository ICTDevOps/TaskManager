import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Calendar, Clock, Check, RotateCcw, Pencil, Trash2, AlertTriangle, Flag, Tag } from 'lucide-react'

const IMPORTANCE_STYLES = {
  low: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-400',
    key: 'low'
  },
  normal: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-700 dark:text-green-400',
    key: 'normal'
  },
  high: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-400',
    key: 'high'
  }
}

export default function TaskCard({ task, onComplete, onReopen, onEdit, onDelete }) {
  const { t, i18n } = useTranslation(['tasks'])
  const [deleting, setDeleting] = useState(false);
  const importance = IMPORTANCE_STYLES[task.importance] || IMPORTANCE_STYLES.normal;
  const isCompleted = task.status === 'completed';

  const isOverdue = task.dueDate && !isCompleted && new Date(task.dueDate) < new Date();

  const formatDate = (dateString) => {
    if (!dateString) return null
    const date = new Date(dateString)
    const locale = i18n.language === 'fr' ? 'fr-FR' : 'en-US'
    return date.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const handleDelete = async () => {
    if (!window.confirm(t('confirm.delete'))) return
    setDeleting(true)
    try {
      await onDelete(task.id)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 transition hover:shadow-md ${isCompleted ? 'opacity-75' : ''}`}>
      <div className="flex items-start gap-3">
        {/* Complete/Reopen button */}
        <button
          onClick={() => isCompleted ? onReopen(task.id) : onComplete(task.id)}
          className={`mt-1 flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition ${
            isCompleted
              ? 'bg-green-500 border-green-500 text-white'
              : 'border-gray-300 dark:border-gray-600 hover:border-primary'
          }`}
        >
          {isCompleted && <Check className="h-4 w-4" />}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className={`font-medium text-gray-900 dark:text-white ${isCompleted ? 'line-through' : ''}`}>
            {task.title}
          </h3>

          {task.description && (
            <p className={`mt-1 text-sm text-gray-600 dark:text-gray-400 ${isCompleted ? 'line-through' : ''}`}>
              {task.description}
            </p>
          )}

          {/* Meta info */}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            {/* Category badge */}
            {task.category && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-white"
                style={{ backgroundColor: task.category.color }}
              >
                <Tag className="h-3 w-3" />
                {task.category.name}
              </span>
            )}

            {/* Importance badge */}
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${importance.bg} ${importance.text}`}>
              <Flag className="h-3 w-3" />
              {t(`importance.${importance.key}`)}
            </span>

            {/* Due date */}
            {task.dueDate && (
              <span className={`inline-flex items-center gap-1 ${isOverdue ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                <Calendar className="h-4 w-4" />
                {formatDate(task.dueDate)}
                {isOverdue && <AlertTriangle className="h-4 w-4" />}
              </span>
            )}

            {/* Due time */}
            {task.dueTime && (
              <span className="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400">
                <Clock className="h-4 w-4" />
                {task.dueTime}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {isCompleted ? (
            onReopen && (
              <button
                onClick={() => onReopen(task.id)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition text-gray-500 dark:text-gray-400"
                title={t('reopen')}
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            )
          ) : (
            onEdit && (
              <button
                onClick={() => onEdit(task)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition text-gray-500 dark:text-gray-400"
                title={t('edit')}
              >
                <Pencil className="h-4 w-4" />
              </button>
            )
          )}

          {onDelete && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50"
              title={t('delete')}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
