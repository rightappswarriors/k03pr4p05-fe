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
import  usePOS  from '@/hooks/usePOS'
import type { CartItem, Item, Category } from '@/types';
import { useTheme } from '@/contexts/ThemeContext'
import { useResponsive } from '@/hooks/useResponsive'

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
// Breakpoints for responsive design
const DESKTOP_BREAKPOINT = 1024

export default function POSScreen() {
 const { colors } = useTheme()
 const { cartItems} = usePOS()
 const { isDesktop} = useResponsive()

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