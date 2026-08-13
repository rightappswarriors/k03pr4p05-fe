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
    roleLoaded: boolean
    switchRole: (role: AppRole) => Promise<void>
    toggleRole: () => Promise<void>
}

const ActiveRoleContext = createContext<ActiveRoleContextType | undefined>(undefined)

export function ActiveRoleProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth()
    const getDefaultRole = (roles: AppRole[]): AppRole => {
        if (roles.includes('SELLER')) return 'SELLER';
        if (roles.includes('SUPPLIER')) return 'SUPPLIER';

        return 'SELLER';
    };

    const orgRoles: AppRole[] =
        ((user?.org?.roles ?? []) as AppRole[]);

    const [activeRole, setActiveRoleState] = useState<AppRole>(
        getDefaultRole(orgRoles)
    );
    const [roleLoaded, setRoleLoaded] = useState(false)
    const availableRoles: AppRole[] =
        orgRoles.length > 0 ? orgRoles : ['SELLER']
    const canSwitchToSupplier = availableRoles.includes('SUPPLIER')

    useEffect(() => {
        const defaultRole = getDefaultRole(orgRoles);

        const load = async () => {
            try {
                const stored = await AsyncStorage.getItem(STORAGE_KEY)

                if (
                    stored === 'SELLER' &&
                    orgRoles.includes('SELLER')
                ) {
                    setActiveRoleState('SELLER');
                } else if (
                    stored === 'SUPPLIER' &&
                    orgRoles.includes('SUPPLIER')
                ) {
                    setActiveRoleState('SUPPLIER');
                } else {
                    // No valid stored role, use the organization's default.
                    setActiveRoleState(defaultRole);
                }
            } catch {
                setActiveRoleState(defaultRole);
            } finally {
                setRoleLoaded(true);
            }
        }
        load()
    }, [user?.org?.roles])

    const switchRole = async (role: AppRole) => {
        if (!availableRoles.includes(role)) return
        setActiveRoleState(role)
        try {
            await AsyncStorage.setItem(STORAGE_KEY, role)
        } catch { }
    }

    const toggleRole = async () => {
        if (!availableRoles.includes('SELLER') || !availableRoles.includes('SUPPLIER')) return
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
                roleLoaded,
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
