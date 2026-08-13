import React, {
  useCallback,
  useState,
  useImperativeHandle,
  forwardRef,
  useRef,
} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  TouchableWithoutFeedback,
  Dimensions,
  Platform,
} from 'react-native';

import EWalletPayment from './EWalletPayment';
import CardPayment from './CardPayment';
import { useTheme } from '@/contexts/ThemeContext';

export interface PaymentBottomSheetRef {
  open: () => void;
  close: () => void;
}

const SHEET_HEIGHT = Dimensions.get('window').height * 0.5;
const ANIMATION_DURATION = 300;

const PaymentBottomSheet = forwardRef<PaymentBottomSheetRef, {}>(({}, ref) => {
  const [visible, setVisible] = useState(false);
  const [selectedTab, setSelectedTab] = useState('ewallet');
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const { colors } = useTheme();

  const open = useCallback(() => {
    setVisible(true);
    Animated.timing(translateY, {
      toValue: 0,
      duration: ANIMATION_DURATION,
      useNativeDriver: true,
    }).start();
  }, [translateY]);

  const close = useCallback(() => {
    Animated.timing(translateY, {
      toValue: SHEET_HEIGHT,
      duration: ANIMATION_DURATION,
      useNativeDriver: true,
    }).start(() => setVisible(false));
  }, [translateY]);

  useImperativeHandle(ref, () => ({ open, close }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={close}
      statusBarTranslucent={Platform.OS === 'android'}
    >
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={close}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      {/* Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          { backgroundColor: colors.background, transform: [{ translateY }] },
        ]}
      >
        {/* Drag handle indicator */}
        <View style={styles.handleContainer}>
          <View style={styles.handle} />
        </View>

        {/* Tabs */}
        <View style={[styles.tabContainer, { borderBottomColor: colors.border }]}>
          {['ewallet', 'card'].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabButton, selectedTab === tab && styles.tabButtonActive]}
              onPress={() => setSelectedTab(tab)}
            >
              <Text
                style={[
                  styles.tabButtonText,
                  { color: colors.textSecondary },
                  selectedTab === tab && styles.tabButtonTextActive,
                ]}
              >
                {tab === 'ewallet' ? 'E-Wallet' : 'Card'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        <View style={styles.paymentMethodContainer}>
          {selectedTab === 'ewallet' ? <EWalletPayment /> : <CardPayment />}
        </View>
      </Animated.View>
    </Modal>
  );
});

export default PaymentBottomSheet;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ccc',
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    borderBottomWidth: 1,
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