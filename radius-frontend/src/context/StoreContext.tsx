//radius-frontend/src/context/StoreContext.tsx
import { createContext, useEffect, ReactNode } from 'react'

type StoreContextType = {
}

export const StoreContext = createContext<StoreContextType | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {

    useEffect(() => {
    }, [])

    return (
        <StoreContext.Provider value={{}}>
            {children}
        </StoreContext.Provider>
    )
}
