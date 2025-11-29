import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { CheckSquare, Sun, Moon, LogOut, ChevronDown, Tag, Settings, User, Users, History, Bell } from 'lucide-react';

export default function Header({
  stats,
  onOpenCategories,
  onOpenSettings,
  onOpenSharing,
  onOpenActivityLog,
  pendingInvitations = 0,
  currentContext,
  currentOwnerName
}) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isManagingOther = currentContext && currentContext !== 'self';

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <CheckSquare className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold text-gray-900 dark:text-white">
              Task Manager
            </span>
          </div>

          {/* Bandeau de contexte si on gère les tâches de quelqu'un d'autre */}
          {isManagingOther && currentOwnerName && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-full">
              <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm text-blue-700 dark:text-blue-300">
                Gestion des tâches de <span className="font-medium">{currentOwnerName}</span>
              </span>
            </div>
          )}

          {/* Stats - hidden on mobile, only show for own tasks */}
          {stats && !isManagingOther && (
            <div className="hidden md:flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-500 dark:text-gray-400">Actives:</span>
                <span className="font-semibold text-primary">{stats.active_tasks}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 dark:text-gray-400">Complétées:</span>
                <span className="font-semibold text-green-500">{stats.completed_tasks}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 dark:text-gray-400">Taux:</span>
                <span className="font-semibold text-gray-900 dark:text-white">{stats.completion_rate}%</span>
              </div>
            </div>
          )}

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Sharing button with notification badge */}
            <button
              onClick={onOpenSharing}
              className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              title="Partages"
            >
              <Users className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              {pendingInvitations > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {pendingInvitations}
                </span>
              )}
            </button>

            {/* Activity log button */}
            <button
              onClick={onOpenActivityLog}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              title="Journal d'activité"
            >
              <History className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </button>

            {/* Categories button */}
            <button
              onClick={onOpenCategories}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              title="Gérer les catégories"
            >
              <Tag className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </button>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              title={theme === 'light' ? 'Activer le mode sombre' : 'Activer le mode clair'}
            >
              {theme === 'light' ? (
                <Moon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              ) : (
                <Sun className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              )}
            </button>

            {/* User menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {user?.firstName?.[0] || user?.username?.[0] || 'U'}
                  </span>
                </div>
                <span className="hidden sm:block text-gray-700 dark:text-gray-300 font-medium">
                  {user?.firstName || user?.username}
                </span>
                <ChevronDown className="h-4 w-4 text-gray-500" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                  <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenSettings();
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  >
                    <User className="h-4 w-4" />
                    Paramètres du compte
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenSharing();
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  >
                    <Users className="h-4 w-4" />
                    Partages
                    {pendingInvitations > 0 && (
                      <span className="ml-auto w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                        {pendingInvitations}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenActivityLog();
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  >
                    <History className="h-4 w-4" />
                    Journal d'activité
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenCategories();
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  >
                    <Settings className="h-4 w-4" />
                    Gérer les catégories
                  </button>
                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                  >
                    <LogOut className="h-4 w-4" />
                    Déconnexion
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
