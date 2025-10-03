
import { CartItem, Category, Item, Outlet } from '@/types';
import { AuthService } from '@/services/authService'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Dimensions } from 'react-native';
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
// Breakpoints for responsive design
const DESKTOP_BREAKPOINT = 1024;

import { //AUTH_TOKEN_KEY, API_BASE_URL, secureStorage, 
  getGraphQLClient
} from '@/utils/constants'
import { mockCategories, mockItems } from '@/data/mockData';
import { gql } from 'graphql-request'
import { useAuth } from './AuthContext';
import http from '@/services/httpServices';
import { formatGraphQLError } from '@/utils/errorFormatter';


interface POSContextType {
  outlet: Outlet | undefined;
  setItems: (items: Item[]) => void;
  setCategories: (categories: Category[]) => void;
  filteredItems: Item[];
  handleScanPress: () => void;
  handleItemFound: (item: Item) => void;
  clearCart: () => void;
  updateQuantity: (id: string, quantity: number) => void;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (categoryId: string | null) => void;
  removeFromCart: (id: string) => void;
  setSidebarOpen: (open: boolean) => void;
  searchQuery: string;
  selectedCategory: string | null;
  addToCart: (item: Item, quantity?: number) => void;
  sidebarOpen: boolean;
  cartItems: CartItem[];
  scannerVisible: boolean;
  screenDimensions: { width: number; height: number };
  categories: Category[];
  loading: boolean;
  items: Item[];
  setScannerVisible: (visible: boolean) => void;
}
const POSContext = createContext<POSContextType | null>(null)

interface CartProviderProps {
  children: ReactNode;  // 👈 tells TS this component accepts any valid React children
}
export const CartProvider = ({ children }: CartProviderProps) => {
  const [storedItems, setItems] = useState<Item[]>([]);
  const [outlet, setOutlet] = useState<Outlet>()
  const [categories, setCategories] = useState<Category[]>([])
  const { isAuthenticated, user } = useAuth()
  useEffect(() => {
    console.log('Getting items')
    const getItems = async () => {
      console.log("User role:", user?.role)
      if (user?.role === "CASHIER" || user?.role === "MANAGER" || user?.role === "STAFF") {
        const GETOUTLETITEM_MUTATION = gql`
          query GetOutletItems {
  getOutletItems {
    id
    name
    address
    code
    governmentTax
    serviceCharge
    phone
    outletType
    items {
      id
      price
      item {
        name
        image
        description
        barcode
        brand
        categoryId
        color {
          name
          id
        }
      }
    }
    }
  }
        `
        try {
          const { accessToken } = await AuthService.getTokens()
          const client = await getGraphQLClient()
          const response = (await client.request(GETOUTLETITEM_MUTATION, {},
            {
              Authorization: `Bearer ${accessToken}`
            }
          )) as any
          console.log("Success getting responses:\n", response.getOutletItems)
          const { id, branchId, items, name, phone, code, isActive, address, governmentTax, serviceCharge } = response.getOutletItems
          setOutlet({
            id: id,
            name: name,
            phone: phone,
            branchId: branchId,
            governmentTax: governmentTax,
            serviceCharge: serviceCharge,
            code: code,
            address: address,
            isActive: isActive,
          })
          console.log("Items:", items)
          setItems(
            items.map((itemField: any) => ({
              id: itemField.id.toString(),
              name: itemField.item.name,
              price: itemField.price,
              image: itemField.item.image,
              categoryId: itemField.item.categoryId?.toString(),
              barcode: itemField.item.barcode,
              description: itemField.item.description,
              brand: itemField.item.brand,
              vatable: itemField.item.vatable,
              // If color is an array, you can join into a string or adjust type
              color: Array.isArray(itemField.item.color)
                ? itemField.item.color.map((c: any) => c.name).join(", ")
                : itemField.item.color,
            }))
          );
        } catch (error) {
          console.error("Error getting Outlet items:", error)
          throw new Error("Error getting Outlet items");
        }
      } else {

      }
    }
    getItems()
    
    console.log("ITEMS SET:", storedItems)
    //
    //setTimeout(() => {
    //  setItems(mockItems);
    //  setCategories(mockCategories);
    //  setLoading(false);
    //}, 1500);


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


  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(
    screenWidth >= DESKTOP_BREAKPOINT
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [screenDimensions, setScreenDimensions] = useState({
    width: screenWidth,
    height: screenHeight,
  });

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenDimensions({ width: window.width, height: window.height });

      // Auto-open sidebar on desktop, auto-close on mobile
      if (window.width >= DESKTOP_BREAKPOINT) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    });

    return () => subscription?.remove();
  }, []);


  const addToCart = (item: Item, quantity: number = 1) => {
    setCartItems((prev) => {
      const existingItem = prev.find((cartItem) => cartItem.id === item.id);
      if (existingItem) {
        return prev.map((cartItem) =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + quantity }
            : cartItem
        );
      }
      return [...prev, { ...item, quantity }];
    });
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }
    setCartItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity } : item))
    );
  };

  const removeFromCart = (id: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Remove all cart items
  const clearCart = () => {
    setCartItems([]);
  };

  const filteredItems = storedItems.filter((item) => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    const matchesSearch =
      normalizedSearch === '' ||
      item.name.toLowerCase().includes(normalizedSearch) ||
      item.barcode?.includes(normalizedSearch);

    const matchesCategory =
      !selectedCategory || item.categoryId === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const handleScanPress = () => {
    setScannerVisible(true);
  };

  const handleItemFound = (item: Item) => {
    addToCart(item, 1);
    setScannerVisible(false);
  };
  return (
    <POSContext.Provider value={{
      outlet,
      setItems,
      setCategories,
      filteredItems,
      handleScanPress,
      handleItemFound,
      clearCart,
      updateQuantity,
      setSearchQuery,
      setSelectedCategory,
      removeFromCart,
      setSidebarOpen,
      searchQuery,
      selectedCategory,
      addToCart,
      sidebarOpen,
      cartItems,
      scannerVisible,
      screenDimensions,
      categories,
      loading,
      items: storedItems,
      setScannerVisible,
    }}>{children}</POSContext.Provider>)
}


export const usePOS = () => {
  const context = useContext(POSContext)
  if (!context) throw new Error("usePOS must be used within CartProvider")
  return context
};