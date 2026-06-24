import React, { createContext, useContext, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAuth } from '@/contexts/AuthContext'

export type AppRole = 'SELLER' | 'SUPPLIER'

const STORAGE_KEY = 'activeAppRole'

interface ActiveRoleContextType {
    activeRole: AppRole
    isSupplier: boolean
    availableRoles: AppRole[]
    canSwitchToSupplier: boolean
    switchRole: (role: AppRole) => Promise<void>
    toggleRole: () => Promise<void>
}

const ActiveRoleContext = createContext<ActiveRoleContextType | undefined>(undefined)

export function ActiveRoleProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth()
    const [activeRole, setActiveRoleState] = useState<AppRole>('SELLER')

    const orgRoles: AppRole[] = ((user as any)?.org?.roles ?? ['SELLER']) as AppRole[]
    const availableRoles: AppRole[] =
        orgRoles.length > 0 ? orgRoles : ['SELLER']
    const canSwitchToSupplier = availableRoles.includes('SUPPLIER')

    useEffect(() => {
        const load = async () => {
            try {
                const stored = await AsyncStorage.getItem(STORAGE_KEY)
                if (stored === 'SUPPLIER' && canSwitchToSupplier) {
                    setActiveRoleState('SUPPLIER')
                } else {
                    setActiveRoleState('SELLER')
                }
            } catch {
                setActiveRoleState('SELLER')
            }
        }
        load()
    }, [canSwitchToSupplier])

    const switchRole = async (role: AppRole) => {
        if (role === 'SUPPLIER' && !canSwitchToSupplier) return
        setActiveRoleState(role)
        try {
            await AsyncStorage.setItem(STORAGE_KEY, role)
        } catch { }
    }

    const toggleRole = async () => {
        const next = activeRole === 'SELLER' ? 'SUPPLIER' : 'SELLER'
        await switchRole(next)
    }

    return (
        <ActiveRoleContext.Provider
            value={{
                activeRole,
                isSupplier: activeRole === 'SUPPLIER',
                availableRoles,
                canSwitchToSupplier,
                switchRole,
                toggleRole,
            }}
        >
            {children}
        </ActiveRoleContext.Provider>
    )
}

export function useActiveRole() {
    const ctx = useContext(ActiveRoleContext)
    if (!ctx) throw new Error('useActiveRole must be used inside ActiveRoleProvider')
    return ctx
}
