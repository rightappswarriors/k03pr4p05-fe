import React from 'react';
import {
  View,
  StyleSheet,

} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { CartSidebar } from '@/components/pos/CartSidebar';
import { ItemBrowser } from '@/components/pos/ItemBrowser';
import { BarcodeScanner } from '@/components/pos/BarcodeScanner';
import { useTheme } from '@/contexts/ThemeContext'
import { useResponsive } from '@/hooks/useResponsive'
import { usePOS } from "@/contexts/POSContext"
export default function POSScreen() {
  const { isDesktop, isMobile } = useResponsive()
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
        <>
          {isMobile ? (
            <> 
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
            </>
          ) : (
            <>
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
              <CartSidebar
                onClose={() => { if (!isDesktop) setSidebarOpen(false) }}
                screenWidth={screenDimensions.width}
              />
            </>
          )
          }
        </>
      </View>
    </SafeAreaView >
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