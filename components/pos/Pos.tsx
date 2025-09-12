import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { CartSidebar } from '@/components/pos/CartSidebar';
import { ItemBrowser } from '@/components/pos/ItemBrowser';
import { BarcodeScanner } from '@/components/pos/BarcodeScanner';
import { useTheme } from '@/contexts/ThemeContext'
import { useResponsive } from '@/hooks/useResponsive'
import { usePOS } from "@/contexts/POSContext"
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
// Breakpoints for responsive design
const DESKTOP_BREAKPOINT = 1024

export default function POSScreen() {
  const { isDesktop} = useResponsive()
  const { colors } = useTheme()
  const {
    cartItems,
    setSidebarOpen,
    sidebarOpen,
    screenDimensions,
    setScannerVisible,
  } = usePOS()
  
  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.container, { backgroundColor: colors.card }]}>
      <StatusBar style="light" backgroundColor={colors.background} />
      <View style={[styles.mainContent, isDesktop && styles.desktopLayout, { backgroundColor: colors.card, }]}>
        <CartSidebar
          onClose={() => { if (!isDesktop) setSidebarOpen(false) }}
          screenWidth={screenDimensions.width}
        />
        <ItemBrowser
        
        cartItemsCount={cartItems.length}
          onToggleCart={() => setSidebarOpen(!sidebarOpen)}
          style={
            isDesktop ? {
              width: '70%'
            } : undefined
          }
        />
        <BarcodeScanner
          onClose={() => setScannerVisible(false)}
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