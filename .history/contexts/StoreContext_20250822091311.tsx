
import { Category, Item } from '@/types';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import http from '@/services/httpServices'
import { useAuth } from '@/contexts/AuthContext'
import { mockCategories, mockItems } from '@/data/mockData';
// Define the shape of the context value.
interface StoreContextType {
     items: Item[];
     setItems: React.Dispatch<React.SetStateAction<Item[]>>;
     loading: boolean;
}

// Create the Context with a default value.
const StoreContext = createContext<StoreContextType | undefined>(undefined);

// Create the Provider component that fetches the data.
export const StoreProvider = ({ children }: { children: ReactNode }) => {
     const [items, setItems] = useState<Item[]>([]);
     const [categories, setCategories] = useState<Category[]>([])
     const [loading, setLoading] = useState(true);
     const { isAuthenticated } = useAuth()
     useEffect(() => {
          setTimeout(() => {
               setItems(mockItems);
               setCategories(mockCategories);
               setLoading(false);
             }, 1500);
          // Simulate API loading
          //if (isAuthenticated) {
          //     fetchStoreItems();
          //} else {
          //     setItems([])
          //}
     }, [isAuthenticated]);
     const fetchStoreItems = async () => {

          try {
               const response = await http.get('/stores/')

               const data = response.data;
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
