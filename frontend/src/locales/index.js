import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// French translations
import frCommon from './fr/common.json'
import frAuth from './fr/auth.json'
import frTasks from './fr/tasks.json'
import frCategories from './fr/categories.json'
import frSettings from './fr/settings.json'
import frAdmin from './fr/admin.json'
import frActivity from './fr/activity.json'
import frDelegation from './fr/delegation.json'
import frTokens from './fr/tokens.json'

// English translations
import enCommon from './en/common.json'
import enAuth from './en/auth.json'
import enTasks from './en/tasks.json'
import enCategories from './en/categories.json'
import enSettings from './en/settings.json'
import enAdmin from './en/admin.json'
import enActivity from './en/activity.json'
import enDelegation from './en/delegation.json'
import enTokens from './en/tokens.json'

const resources = {
  fr: {
    common: frCommon,
    auth: frAuth,
    tasks: frTasks,
    categories: frCategories,
    settings: frSettings,
    admin: frAdmin,
    activity: frActivity,
    delegation: frDelegation,
    tokens: frTokens
  },
  en: {
    common: enCommon,
    auth: enAuth,
    tasks: enTasks,
    categories: enCategories,
    settings: enSettings,
    admin: enAdmin,
    activity: enActivity,
    delegation: enDelegation,
    tokens: enTokens
  }
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'fr',
    supportedLngs: ['fr', 'en'],
    load: 'languageOnly',
    defaultNS: 'common',
    ns: ['common', 'auth', 'tasks', 'categories', 'settings', 'admin', 'activity', 'delegation', 'tokens'],
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'language'
    },
    interpolation: {
      escapeValue: false
    }
  })

export default i18n
