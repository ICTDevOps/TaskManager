import { useState, useRef, useEffect } from 'react';
import { ChevronDown, User, Users, Star } from 'lucide-react';

export default function ContextSelector({
  currentContext,
  onContextChange,
  delegationsReceived = [],
  pendingCount = 0,
  defaultContext = 'self',
  onSetDefaultContext
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getDisplayName = (user) => {
    if (user.firstName || user.lastName) {
      return `${user.firstName || ''} ${user.lastName || ''}`.trim();
    }
    return user.username;
  };

  // Filtrer uniquement les délégations acceptées
  const acceptedDelegations = delegationsReceived.filter(d => d.status === 'accepted');

  const getCurrentLabel = () => {
    if (!currentContext || currentContext === 'self') {
      return 'Mes tâches';
    }
    const delegation = acceptedDelegations.find(d => d.owner.id === currentContext);
    if (delegation) {
      return `Tâches de ${getDisplayName(delegation.owner)}`;
    }
    return 'Mes tâches';
  };

  const handleSelect = (context) => {
    onContextChange(context);
    setIsOpen(false);
  };

  const handleSetDefault = (e, context) => {
    e.stopPropagation();
    if (onSetDefaultContext) {
      onSetDefaultContext(context);
    }
  };

  const isDefault = (context) => {
    return defaultContext === context;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
      >
        {currentContext && currentContext !== 'self' ? (
          <Users className="h-4 w-4 text-blue-500" />
        ) : (
          <User className="h-4 w-4 text-gray-500" />
        )}
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {getCurrentLabel()}
        </span>
        {isDefault(currentContext) && (
          <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
        )}
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        {pendingCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {pendingCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 overflow-hidden">
          {/* Mes tâches */}
          <div
            className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition ${
              (!currentContext || currentContext === 'self') ? 'bg-primary/10' : ''
            }`}
          >
            <button
              onClick={() => handleSelect('self')}
              className="flex items-center gap-3 flex-1 text-left"
            >
              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                <User className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Mes tâches</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Vos tâches personnelles</p>
              </div>
            </button>
            <button
              onClick={(e) => handleSetDefault(e, 'self')}
              className={`p-1.5 rounded-full transition ${
                isDefault('self')
                  ? 'text-yellow-500'
                  : 'text-gray-300 dark:text-gray-600 hover:text-yellow-400'
              }`}
              title={isDefault('self') ? 'Contexte par défaut' : 'Définir comme défaut'}
            >
              <Star className={`h-4 w-4 ${isDefault('self') ? 'fill-yellow-500' : ''}`} />
            </button>
            {(!currentContext || currentContext === 'self') && (
              <div className="w-2 h-2 rounded-full bg-primary"></div>
            )}
          </div>

          {/* Séparateur si des délégations existent */}
          {acceptedDelegations.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700">
              <p className="px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50">
                Tâches déléguées
              </p>
            </div>
          )}

          {/* Liste des owners dont on gère les tâches */}
          {acceptedDelegations.map(delegation => (
            <div
              key={delegation.id}
              className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition ${
                currentContext === delegation.owner.id ? 'bg-primary/10' : ''
              }`}
            >
              <button
                onClick={() => handleSelect(delegation.owner.id)}
                className="flex items-center gap-3 flex-1 text-left min-w-0"
              >
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                    {(delegation.owner.firstName?.[0] || delegation.owner.username[0]).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {getDisplayName(delegation.owner)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    @{delegation.owner.username}
                  </p>
                </div>
              </button>
              <button
                onClick={(e) => handleSetDefault(e, delegation.owner.id)}
                className={`p-1.5 rounded-full transition flex-shrink-0 ${
                  isDefault(delegation.owner.id)
                    ? 'text-yellow-500'
                    : 'text-gray-300 dark:text-gray-600 hover:text-yellow-400'
                }`}
                title={isDefault(delegation.owner.id) ? 'Contexte par défaut' : 'Définir comme défaut'}
              >
                <Star className={`h-4 w-4 ${isDefault(delegation.owner.id) ? 'fill-yellow-500' : ''}`} />
              </button>
              {currentContext === delegation.owner.id && (
                <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0"></div>
              )}
            </div>
          ))}

          {/* Message si pas de délégations */}
          {acceptedDelegations.length === 0 && (
            <div className="px-4 py-3 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Aucune tâche déléguée
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
