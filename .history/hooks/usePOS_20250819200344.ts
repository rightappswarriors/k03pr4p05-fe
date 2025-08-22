
import { CartItem, Category, Item } from '@/types';
import { useState, useEffect } from 'react';
import { Dimensions } from 'react-native';
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
// Breakpoints for responsive design
const DESKTOP_BREAKPOINT = 1024;
import { AUTH_TOKEN_KEY, API_BASE_URL, secureStorage } from '@/services/authService'

interface POSHooks {
  items: Item,
  setItems: () => void
}
export default function usePOS ({items, setItems}: POSHooks) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const { setItems, items} = useStore()
  const [categories, setCategories] = useState<Category[]>([]);
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
      const existingItem = prev.find((cartItem) => cartItem.item.id === item.item.id);
      if (existingItem) {
        return prev.map((cartItem) =>
          cartItem.item.id === item.item.id
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
      prev.map((item) => (item.item.id === id ? { ...item, quantity } : item))
    );
  };

  const removeFromCart = (id: string) => {
    setCartItems((prev) => prev.filter((item) => item.item.id !== id));
  };

  // Remove all cart items
  const clearCart = () => {
    setCartItems([]);
  };

  const filteredItems = items.filter((item) => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    const matchesSearch =
      normalizedSearch === '' ||
      item.item.name.toLowerCase().includes(normalizedSearch) ||
      item.item.barcode?.includes(normalizedSearch);

    const matchesCategory =
      !selectedCategory || item.item.categoryId === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const handleScanPress = () => {
    setScannerVisible(true);
  };

  const handleItemFound = (item: Item) => {
    addToCart(item, 1);
    setScannerVisible(false);
  };

  return {
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
     items,
     setScannerVisible,
  }
}
