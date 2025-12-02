import { useTranslation } from 'react-i18next'
import { Search, SortAsc, SortDesc, X, Tag } from 'lucide-react'

export default function FilterBar({
  status,
  setStatus,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  search,
  setSearch,
  categories = [],
  categoryId,
  setCategoryId
}) {
  const { t } = useTranslation(['tasks'])

  const STATUS_OPTIONS = [
    { value: 'all', label: t('status.all') },
    { value: 'active', label: t('status.active') },
    { value: 'completed', label: t('status.completed') }
  ]

  const SORT_OPTIONS = [
    { value: 'created_at', label: t('sort.createdAt') },
    { value: 'due_date', label: t('sort.dueDate') },
    { value: 'importance', label: t('sort.importance') },
    { value: 'title', label: t('sort.title') }
  ]
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('filter.search')}
          className="w-full pl-10 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Filters row 1: Status */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Status filter */}
        <div className="flex gap-2 flex-wrap">
          {STATUS_OPTIONS.map(option => (
            <button
              key={option.value}
              onClick={() => setStatus(option.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                status === option.value
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2 sm:ml-auto">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
          >
            {SORT_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <button
            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
            title={sortOrder === 'asc' ? t('sort.asc') : t('sort.desc')}
          >
            {sortOrder === 'asc' ? (
              <SortAsc className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            ) : (
              <SortDesc className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            )}
          </button>
        </div>
      </div>

      {/* Filters row 2: Categories */}
      {categories.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Tag className="h-4 w-4 text-gray-400" />
          <button
            onClick={() => setCategoryId('')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
              categoryId === ''
                ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {t('filter.allCategories')}
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategoryId(cat.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                categoryId === cat.id
                  ? 'text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:opacity-80'
              }`}
              style={{
                backgroundColor: categoryId === cat.id ? cat.color : `${cat.color}30`,
                borderColor: cat.color,
                borderWidth: '1px'
              }}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
