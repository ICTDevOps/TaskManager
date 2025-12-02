import { createContext, useContext, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { authService } from '../services/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const { i18n } = useTranslation()

  // Sync language when user changes
  const syncLanguage = (userLanguage) => {
    if (userLanguage && userLanguage !== i18n.language) {
      i18n.changeLanguage(userLanguage)
      localStorage.setItem('language', userLanguage)
    }
  }

  useEffect(() => {
    const token = localStorage.getItem('token')
    const storedUser = localStorage.getItem('user')

    if (token && storedUser) {
      const parsedUser = JSON.parse(storedUser)
      setUser(parsedUser)
      // Sync language from stored user
      if (parsedUser.language) {
        syncLanguage(parsedUser.language)
      }
      // Verify token is still valid
      authService.getMe()
        .then(data => {
          setUser(data.user)
          // Sync language from server
          if (data.user.language) {
            syncLanguage(data.user.language)
          }
        })
        .catch(() => {
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          setUser(null)
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email, password) => {
    const data = await authService.login(email, password)
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.user))
    setUser(data.user)
    // Sync language after login
    if (data.user.language) {
      syncLanguage(data.user.language)
    }
    return data
  }

  const register = async (formData) => {
    const data = await authService.register(formData)
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.user))
    setUser(data.user)
    // Sync language after register (will use default 'fr')
    if (data.user.language) {
      syncLanguage(data.user.language)
    }
    return data
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  const updateUser = (updatedUser) => {
    localStorage.setItem('user', JSON.stringify(updatedUser))
    setUser(updatedUser)
    // Sync language if changed
    if (updatedUser.language) {
      syncLanguage(updatedUser.language)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
