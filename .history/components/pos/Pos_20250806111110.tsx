import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { CartSidebar } from '@/components/pos/CartSidebar';
import { ItemBrowser } from '@/components/pos/ItemBrowser';
import { BarcodeScanner } from '@/components/pos/BarcodeScanner';
import { mockItems, mockCategories } from '@/data/mockData';
import type { CartItem, Item, Category } from '@/types';
import { useTheme } from '@/contexts/ThemeContext'
import { useResponsive } from '@/hooks/useResponsive'

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
// Breakpoints for responsive design
const DESKTOP_BREAKPOINT = 1024

export default function POSScreen() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(screenWidth >= DESKTOP_BREAKPOINT);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [screenDimensions, setScreenDimensions] = useState({ width: screenWidth, height: screenHeight });
  const { colors } = useTheme()
  const { 
    isMobile,
    isTablet,
    isDesktop, } = useResponsive()
  // Listen for screen dimension changes
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

  


  useEffect(() => {
    // Simulate API loading
    setTimeout(() => {
      setItems(mockItems);
      setCategories(mockCategories);
      setLoading(false);
    }, 1500);
  }, []);

  const addToCart = (item: Item, quantity: number = 1) => {
    setCartItems(prev => {
      const existingItem = prev.find(cartItem => cartItem.id === item.id);
      if (existingItem) {
        return prev.map(cartItem =>
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
    setCartItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, quantity } : item
      )
    );
  };

  const removeFromCart = (id: string) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
  };

  // Remove all cart items
  const clearCart = () => {
    setCartItems([]);
  };

  const filteredItems = items.filter(item => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    const matchesSearch =
      normalizedSearch === '' ||
      item.name.toLowerCase().includes(normalizedSearch) ||
      item.barcode?.includes(normalizedSearch);

    const matchesCategory = !selectedCategory || item.categoryId === selectedCategory;

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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.card}]}>
      <StatusBar style="light" backgroundColor={colors.background} />
      <View style={[styles.mainContent, isDesktop && styles.desktopLayout, { backgroundColor: colors.card,}]}>
        <CartSidebar
          items={cartItems}
          isOpen={sidebarOpen}
          onUpdateQuantity={updateQuantity}
          onRemoveItem={removeFromCart}
          onClearCart={clearCart}
          onClose={() => { if (!isDesktop) setSidebarOpen(false) }}
          isDesktop={isDesktop}
          screenWidth={screenDimensions.width}
        />
        <ItemBrowser
          items={filteredItems}
          categories={categories}
          loading={loading}
          searchQuery={searchQuery}
          selectedCategory={selectedCategory}
          onSearchChange={setSearchQuery}
          onCategorySelect={setSelectedCategory}
          onAddToCart={addToCart}
          cartItemsCount={cartItems.length}
          onToggleCart={() => setSidebarOpen(!sidebarOpen)}
          onScanPress={handleScanPress}
          isDesktop={isDesktop}
          style={
            isDesktop ? {
              width: '70%'
            } : undefined
          }
        />


        <BarcodeScanner
          visible={scannerVisible}
          items={items}
          onClose={() => setScannerVisible(false)}
          onItemFound={handleItemFound}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mainContent: {
    flex: 1,
  },
  desktopLayout: {
    flexDirection: 'row',
  },
});