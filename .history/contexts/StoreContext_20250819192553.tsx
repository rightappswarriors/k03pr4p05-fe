import { secureStorage } from '@/services/authService';
import { Item } from '@/types';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Define the shape of the context value.
interface ItemsContextType {
    items: Item[];
    loading: boolean;
}

// Create the Context with a default value.
const ItemsContext = createContext<ItemsContextType | undefined>(undefined);
const API_BASE_URL = 'https://api.example.com';
const AUTH_TOKEN_KEY = 'auth-token';

// Create the Provider component that fetches the data.
export const ItemsProvider = ({ children }: { children: ReactNode }) => {
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStoreItems = async () => {
            const token = await secureStorage.getItemAsync(AUTH_TOKEN_KEY);
            console.log('AUTH TOKEN: ', token);
            try {
                const response = await fetch(`${API_BASE_URL}/stores/`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    console.error('Store Item retrieval error:', errorData);
                    throw new Error(errorData.error || 'Retrieval failed.');
                }
                const data = await response.json();
                console.log('Data inventories', data.inventory.items);
                setItems(data.inventory.items);
            } catch (error) {
                console.error('Store Item retrieval error:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchStoreItems();
    }, []); // Empty dependency array means this runs only once when the provider mounts.

    const value = { items, loading };

    return <ItemsContext.Provider value={value}>{children}</ItemsContext.Provider>;
};

// Create a custom hook to easily consume the context.
export const useItems = () => {
    const context = useContext(ItemsContext);
    if (context === undefined) {
        throw new Error('useItems must be used within an ItemsProvider');
    }
    return context;
};
