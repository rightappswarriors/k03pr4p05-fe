import React from 'react';
import POSScreen from '../../components/pos/Pos';
import { CartProvider } from '@/contexts/POSContext';
import { Platform } from 'react-native';
import RootView from '@/components/ui/RootView';
import { DisplayProvider } from '@/contexts/DisplayContext';
export default React.memo(function MainScreen() {
  return (
    <DisplayProvider>
      <CartProvider>
        {Platform.OS !== 'web' ? (
          <RootView style={{ flex: 1 }}>
            <POSScreen />
          </RootView>
        ) : (
          <POSScreen />
        )}
      </CartProvider>
    </DisplayProvider>
  );
});
