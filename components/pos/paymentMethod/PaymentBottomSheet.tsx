import React, { useCallback, useMemo, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';

import EWalletPayment from './EWalletPayment';
import CardPayment from './CardPayment';
import { useTheme } from '@/contexts/ThemeContext';

export interface PaymentBottomSheetRef {
  open: () => void;
  close: () => void;
}

const PaymentBottomSheet = forwardRef<PaymentBottomSheetRef, {}>(({}, ref) => {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['50%', '50%'], []);
  const [selectedTab, setSelectedTab] = useState('ewallet');
  const { colors } = useTheme()
  const handleOpenPress = useCallback(() => {
    bottomSheetRef.current?.expand();
  }, []);

  const handleClosePress = useCallback(() => {
    bottomSheetRef.current?.close();
  }, []);

  useImperativeHandle(ref, () => ({
    open: handleOpenPress,
    close: handleClosePress,
  }));

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1} // Start hidden
      snapPoints={snapPoints}
      enablePanDownToClose={true}
      backgroundStyle={[styles.bottomSheetBackground, {backgroundColor: colors.background}]}
      handleIndicatorStyle={{ backgroundColor: '#ccc' }}
    >
      <BottomSheetView style={styles.bottomSheetContent}>
        <View style={[styles.tabContainer, { borderBottomColor: colors.border}]}>
          <TouchableOpacity
            style={[styles.tabButton, selectedTab === 'ewallet' && styles.tabButtonActive]}
            onPress={() => setSelectedTab('ewallet')}
          >
            <Text style={[{color: colors.textSecondary}, styles.tabButtonText, selectedTab === 'ewallet' && styles.tabButtonTextActive]}>
              E-Wallet
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, selectedTab === 'card' && styles.tabButtonActive]}
            onPress={() => setSelectedTab('card')}
          >
            <Text style={[{color: colors.textSecondary},styles.tabButtonText, selectedTab === 'card' && styles.tabButtonTextActive]}>
              Card
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.paymentMethodContainer}>
          {selectedTab === 'ewallet' ? <EWalletPayment /> : <CardPayment />}
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
});

export default PaymentBottomSheet;

const styles = StyleSheet.create({
  bottomSheetBackground: {
    borderRadius: 20,
  },
  bottomSheetContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
  },
  tabButtonActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#007bff',
  },
  tabButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  tabButtonTextActive: {
    color: '#007bff',
  },
  paymentMethodContainer: {
    flex: 1,
    paddingVertical: 10,
  },
});