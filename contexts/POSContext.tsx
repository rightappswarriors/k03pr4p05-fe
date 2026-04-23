import { CartItem, Category, Item, ItemUnit, Outlet } from '@/types';
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
  addToCart: (item: Item, quantity?: number, unit?: ItemUnit) => void;
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
      if (!user || !isAuthenticated) {
        setLoading(false);
        return;
      }

      // Staff users in attendance mode may not be assigned to an outlet,
      // so do not attempt to fetch outlet items for them.
      const assignment = await AuthService.getMyOutletAssignment();
      if (!assignment) {
        // Not assigned to any outlet — skip fetching (attendance-only staff)
        setLoading(false);
        return;
      }

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
            bannerImage
            hasKey
            outletType
            isVatRegistered
            vatZeroSale
            tin
            ptu
            bir
            vatType {
              id
              name
              rate
            }
            outletPromos {
              id
              promoTypeId
              discount
              isActive
              promoType {
                id
                name
                description
              }
            }
            items {
              id
              price
              quantity
              units {
                id
                unitName
                unitLabel
                price
                quantity
                conversionFactor
                baseUnit
                isDefault
                barcode
              }
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

        const outletData = response?.getOutletItems;
        if (!outletData) {
          console.warn(
            'No outlet items returned; skipping POS inventory setup.',
          );
          setLoading(false);
          return;
        }

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
          bannerImage,
        } = outletData;

        const discountOption: Record<string, number> = {};
        outletData.outletPromos?.forEach((p: any) => {
          if (p.isActive) {
            discountOption[p.promoType.name.toUpperCase().replace(/\s+/g, '_')] =
              typeof p.discount === 'number' ? p.discount / 100 : 0;
          }
        });
        // Defaults for senior/pwd
        discountOption['SENIOR'] = discountOption['SENIOR'] ?? 0.20;
        discountOption['PWD'] = discountOption['PWD'] ?? 0.20;

        setOutlet({
          id: outletData.id,
          name: outletData.name,
          phone: outletData.phone,
          bannerImage: outletData.bannerImage,
          branchId: outletData.branchId,
          governmentTax: outletData.governmentTax,
          serviceCharge: outletData.serviceCharge,
          hasKey: outletData.hasKey,
          code: outletData.code,
          address: outletData.address,
          isActive: outletData.isActive,
          isVatRegistered: outletData.isVatRegistered,
          vatZeroSale: outletData.vatZeroSale,
          tin: outletData.tin,
          ptu: outletData.ptu,
          bir: outletData.bir,
          vatType: outletData.vatType,
          status: outletData.status ?? 'open',
          vatTypeId: outletData.vatTypeId,
          outletPromos: outletData.outletPromos,
          discountOption,
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
            color: Array.isArray(itemField.item.color)
              ? itemField.item.color.map((c: any) => c.name).join(', ')
              : itemField.item.color,
            units: itemField.units ?? [], // ← new
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
      } finally {
        setLoading(false);
      }
    };
    getItems();

    //
    //setTimeout(() => {
    //  setItems(mockItems);
    //  setCategories(mockCategories);
    //  setLoading(false);
    //}, 1500);
  }, [isAuthenticated, user]);

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

  const addToCart = (
    item: Item,
    quantity: number = 1,
    unit?: ItemUnit, // ← new optional param
  ) => {
    const priceAtSale = unit ? unit.price : item.price;
    const cartKey = unit ? `${item.id}_${unit.id}` : item.id;
    // ↑ allows same item in different units as separate cart rows

    setCartItems((prev) => {
      const existingItem = prev.find((c) => c.id === cartKey);
      if (existingItem) {
        return prev.map((c) =>
          c.id === cartKey ? { ...c, quantity: c.quantity + quantity } : c,
        );
      }
      return [
        ...prev,
        {
          ...item,
          id: cartKey,
          quantity,
          unitId: unit?.id,
          unitName: unit?.unitName,
          unitLabel: unit?.unitLabel,
          priceAtSale,
        },
      ];
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
