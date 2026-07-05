import { createContext, useState, useEffect, ReactNode } from 'react'
import { getToken, saveToken, deleteToken } from '@/utils/token'

type AuthContextType = {
    token: string | null
    isAuthenticated: boolean
    isLoading: boolean
    login: (token: string) => Promise<void>
    logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [token, setToken] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        getToken().then(t => {
            setToken(t)
            setIsLoading(false)
        })
    }, [])

    async function login(t: string) {
        await saveToken(t)
        setToken(t)
    }

    async function logout() {
        await deleteToken()
        setToken(null)
    }

    return (
        <AuthContext.Provider value={{
            token,
            isAuthenticated: !!token,
            isLoading,
            login,
            logout,
        }}>
            {children}
        </AuthContext.Provider>
    )
}
