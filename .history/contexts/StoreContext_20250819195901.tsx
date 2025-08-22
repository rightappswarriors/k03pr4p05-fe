import { secureStorage, API_BASE_URL, AUTH_TOKEN_KEY } from '@/services/authService';
import { Item } from '@/types';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Define the shape of the context value.
interface StoreContextType {
     items: Item[];
     setItems: () => void;
     loading: boolean;
}

// Create the Context with a default value.
const StoreContext = createContext<StoreContextType | undefined>(undefined);

// Create the Provider component that fetches the data.
export const StoreProvider = ({ children }: { children: ReactNode }) => {
     const [items, setItems] = useState<Item[]>([]);
     const [loading, setLoading] = useState(true);

     useEffect(() => {
          // Simulate API loading
          const fetchStoreItems = async () => {

               const token = await secureStorage.getItemAsync(AUTH_TOKEN_KEY);
               console.log('AUTH TOKEN: ', token)
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
                    console.log(data)
                    console.log('Data inventories', data.inventory.items)
                    setItems(data.inventory.items);

                    // Assuming the API returns both items and categories
               } catch (error) {
                    console.error('Store Item retrieval error:', error);
               } finally {
                    setLoading(false); // Stop loading regardless of success or failure
               }
          };
          fetchStoreItems();
     }, []);

     const value = { items, setItems, loading };

     return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
};

// Create a custom hook to easily consume the context.
export const useStore = () => {
     const context = useContext(StoreContext);
     if (context === undefined) {
          throw new Error('useItems must be used within an ItemsProvider');
     }
     return context;
};
