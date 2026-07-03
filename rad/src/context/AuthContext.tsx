import { createContext, useState, useEffect, ReactNode } from 'react'
import { getToken, saveToken, deleteToken } from '@/utils/token'

type AuthContextType = {
    token: string | null
    isAuthenticated: boolean
    login: (token: string) => Promise<void>
    logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [token, setToken] = useState<string | null>(null)

    useEffect(() => {
        getToken().then(t => setToken(t))
    }, [])

    async function login(token: string) {
        await saveToken(token)
        setToken(token)
    }

    async function logout() {
        await deleteToken()
        setToken(null)
    }

    return (
        <AuthContext.Provider value={{ token, isAuthenticated: !!token, login, logout }}>
            {children}
        </AuthContext.Provider>
    )
}
