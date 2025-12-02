import { useTranslation } from 'react-i18next'
import { Globe } from 'lucide-react'

const languages = [
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'en', name: 'English', flag: '🇬🇧' }
]

export default function LanguageSelector({ className = '', showLabel = false, onChange }) {
  const { i18n } = useTranslation()

  const handleChange = (e) => {
    const newLang = e.target.value
    i18n.changeLanguage(newLang)
    localStorage.setItem('language', newLang)
    if (onChange) {
      onChange(newLang)
    }
  }

  const currentLang = languages.find(l => l.code === i18n.language) || languages[0]

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showLabel && (
        <Globe className="h-4 w-4 text-gray-500 dark:text-gray-400" />
      )}
      <select
        value={i18n.language}
        onChange={handleChange}
        className="bg-transparent border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 cursor-pointer"
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.flag} {lang.name}
          </option>
        ))}
      </select>
    </div>
  )
}
