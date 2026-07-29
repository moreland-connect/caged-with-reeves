import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { login as loginRequest, signup as signupRequest, logout as logoutRequest, getSession } from '../service/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSession()
      .then((data) => setUser(data.authenticated ? data.username : null))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (username, password) => {
    const data = await loginRequest(username, password)
    setUser(data.username)
  }, [])

  const signup = useCallback(async (username, password) => {
    const data = await signupRequest(username, password)
    setUser(data.username)
  }, [])

  const logout = useCallback(async () => {
    await logoutRequest()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
