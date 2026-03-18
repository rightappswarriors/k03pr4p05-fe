import { CartItem, Category, Item, Outlet } from '@/types';
import { AuthService } from '@/services/authService';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { Dimensions } from 'react-native';
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
// Breakpoints for responsive design
const DESKTOP_BREAKPOINT = 1024;

import {
  //AUTH_TOKEN_KEY, API_BASE_URL, secureStorage,
  getGraphQLClient,
} from '@/utils/constants';
import { gql } from 'graphql-request';
import { useAuth } from './AuthContext';

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
const POSContext = createContext<POSContextType | null>(null);

interface CartProviderProps {
  children: ReactNode; // 👈 tells TS this component accepts any valid React children
}
export const CartProvider = ({ children }: CartProviderProps) => {
  const [storedItems, setItems] = useState<Item[]>([]);
  const [outlet, setOutlet] = useState<Outlet>();
  const [categories, setCategories] = useState<Category[]>([]);
  const { isAuthenticated, user } = useAuth();
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const getItems = async () => {
      if (
        user?.role === 'CASHIER' ||
        user?.role === 'MANAGER' ||
        user?.role === 'STAFF'
      ) {
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
              hasKey
              outletType
              items {
                id
                price
                item {
                  id
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
        `;
        try {
          const { accessToken } = await AuthService.getTokens();
          const client = await getGraphQLClient();
          const response = (await client.request(
            GETOUTLETITEM_MUTATION,
            {},
            {
              Authorization: `Bearer ${accessToken}`,
            },
          )) as any;
          const {
            id,
            branchId,
            items,
            name,
            phone,
            code,
            isActive,
            address,
            governmentTax,
            hasKey,
            serviceCharge,
            discountOptions,
          } = response.getOutletItems;
          setOutlet({
            id: id,
            name: name,
            phone: phone,
            branchId: branchId,
            governmentTax: governmentTax,
            serviceCharge: serviceCharge,
            hasKey: hasKey,
            code: code,
            address: address,
            isActive: isActive,
            discountOption: discountOptions,
          });
          console.log('Items:', items);
          setItems(
            items.map((itemField: any) => ({
              id: itemField.item.id.toString(),
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
                ? itemField.item.color.map((c: any) => c.name).join(', ')
                : itemField.item.color,
            })),
          );

          console.log('ITEMS SET:', storedItems);
          const derivedCategories: Category[] = [];
          const seenIds = new Set<string>();

          items.forEach((itemField: any) => {
            const catId = itemField.item.categoryId?.toString();
            const brand = itemField.item.brand?.trim() || 'Unbranded';
            const colorName = Array.isArray(itemField.item.color)
              ? itemField.item.color[0]?.name || ''
              : itemField.item.color || '';

            if (catId && !seenIds.has(catId)) {
              seenIds.add(catId);
              derivedCategories.push({
                id: catId,
                name: brand, // ✅ A-Z sorts by this
                color: colorName, // ✅ Color tab uses this
                brand: brand, // ✅ Brand tab uses this
              });
            }
          });

          setCategories(derivedCategories);
        } catch (error) {
          console.error('Error getting Outlet items:', error);
          throw new Error('Error getting Outlet items');
        } finally {
          setLoading(false);
        }
      } else {
      }
    };
    getItems();

    //
    //setTimeout(() => {
    //  setItems(mockItems);
    //  setCategories(mockCategories);
    //  setLoading(false);
    //}, 1500);
  }, [isAuthenticated]);

  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const [sidebarOpen, setSidebarOpen] = useState(
    screenWidth >= DESKTOP_BREAKPOINT,
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
            : cartItem,
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
      prev.map((item) => (item.id === id ? { ...item, quantity } : item)),
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
    <POSContext.Provider
      value={{
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
      }}
    >
      {children}
    </POSContext.Provider>
  );
};

export const usePOS = () => {
  const context = useContext(POSContext);
  if (!context) throw new Error('usePOS must be used within CartProvider');
  return context;
};
