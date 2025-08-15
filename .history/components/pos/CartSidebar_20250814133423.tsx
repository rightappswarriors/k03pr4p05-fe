import { styles } from '@/styles/cartSidebarStyle'
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  Animated,
  Dimensions,
} from 'react-native';
import { Trash2, ShoppingCart, CreditCard, X } from 'lucide-react-native';
import { ReceiptModal } from './ReceiptModal';
import type { CartItem } from '@/types';
import { useTheme } from '@/contexts/ThemeContext'
import { useTransactionSync } from '@/hooks/useTransactionSync';
const { width: screenWidth } = Dimensions.get('window');
const DESKTOP_BREAKPOINT = 1024;

interface CartSidebarProps {
  items: CartItem[];
  isOpen: boolean;

  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemoveItem: (id: string) => void;
  onClearCart: () => void;
  onClose: () => void;

  isDesktop?: boolean;
  screenWidth?: number;
}

export function CartSidebar({
  items,
  isOpen,

  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onClose,

  isDesktop = false,
  screenWidth: currentScreenWidth = screenWidth,
}: CartSidebarProps) {
  const SIDEBAR_WIDTH = isDesktop
    ? currentScreenWidth * 0.3  // 30% on desktop
    : currentScreenWidth * 0.8; // 80% on mobile
  const { colors } = useTheme()
  const slideAnim = useRef(new Animated.Value(isOpen ? 0 : -SIDEBAR_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(isOpen ? 1 : 0)).current;
  const [receiptModalVisible, setReceiptModalVisible] = React.useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { transactions, loading } = useTransactionSync({ refreshTrigger });

  useEffect(() => {
    let toValue: number;

    if (isDesktop) {
      // On desktop, sidebar is always visible, just positioned
      toValue = 0;
    } else {
      // On mobile, slide in/out based on position
      toValue = isOpen ? 0 : -SIDEBAR_WIDTH;
    }

    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: (isOpen && !isDesktop) ? 0.5 : 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isOpen]);

  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleCheckout = () => {
    if (items.length === 0) {
      Alert.alert('Cart Empty', 'Please add items to cart before checkout.');
      return;
    }
    setReceiptModalVisible(true);
  };

  const handlePrintReceipt = (receiptData: any) => {
    console.log('Receipt Data:', JSON.stringify(receiptData, null, 2));
    // Here you would typically send the receipt data to a printer or save it
    onClearCart();
    setReceiptModalVisible(false);
    onClose();
  };

  if (!isOpen && !isDesktop) return null;

  return (
    <>
      {/* Overlay */}
      {!isDesktop && (
        <Animated.View
          style={[
            styles.overlay,
            { opacity: overlayOpacity }
          ]}
        >
          <TouchableOpacity
            style={styles.overlayTouchable}
            onPress={onClose}
            activeOpacity={1}
          />
        </Animated.View>
      )}

      {/* Sidebar */}
      <Animated.View
        style={[
          isDesktop ? [styles.desktopSidebar, { borderColor: colors.border }] : styles.mobileSidebar,
          {
            width: SIDEBAR_WIDTH,
            transform: isDesktop ? [] : [{
              translateX: slideAnim
            }],
          },
        ]}

      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.surface, borderColor: colors.border }]} >
          {!isDesktop && (
            <TouchableOpacity onPress={onClose} style={[styles.closeButton, { backgroundColor: colors.surface }]}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          )}
          <View style={styles.headerCenter}>
            <Image
              source={{ uri: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop' }}
              style={styles.logo}
            />
            {/* Brand Name */}
            <Text style={[styles.companyName, { color: colors.text }]}>POS Vine</Text>
          </View>

        </View>

        {/* Cart Items */}
        <ScrollView style={[styles.itemsList, { backgroundColor: colors.background, borderBottomColor: colors.border }]} showsVerticalScrollIndicator={false}>
          {items.length === 0 ? (
            <View style={styles.emptyCart}>
              <ShoppingCart size={48} color={colors.text} />
              <Text style={[styles.emptyText, { color: colors.text }]}>Cart is empty</Text>
              <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>Add items to get started</Text>
            </View>
          ) : (
            items.map((item) => (
              <View key={item.id} style={[styles.cartItem, { borderColor: colors.border }]}>
                <Image source={{ uri: item.image }} style={styles.itemImage} />
                <View style={styles.itemDetails}>
                  <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={2}>{item.name}</Text>
                  <Text style={[styles.itemPrice, { color: colors.text }]}>${item.price.toFixed(2)}</Text>
                  <View style={styles.quantityContainer}>
                    <TouchableOpacity
                      onPress={() => onUpdateQuantity(item.id, item.quantity - 1)}
                      style={[styles.quantityButton, { backgroundColor: colors.card }]}
                    >
                      <Text style={[styles.quantityButtonText, { color: colors.textSecondary }]}>-</Text>
                    </TouchableOpacity>
                    <TextInput
                      style={[styles.quantityInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.textSecondary }, , isDesktop && {outline: 'none'}, , isTablet && {outline: 'none'}]}
                      value={item.quantity.toString()}
                      onChangeText={(text) => {
                        const num = parseInt(text) || 0;
                        onUpdateQuantity(item.id, num);
                      }}
                      keyboardType="numeric"
                      selectTextOnFocus
                    />
                    <TouchableOpacity
                      onPress={() => onUpdateQuantity(item.id, item.quantity + 1)}
                      style={[styles.quantityButton, { backgroundColor: colors.card }]}
                    >
                      <Text style={[styles.quantityButtonText, { color: colors.textSecondary }]}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.itemRight}>
                  <Text style={[styles.subtotal, { color: colors.text }]}>${(item.price * item.quantity).toFixed(2)}</Text>
                  <TouchableOpacity
                    onPress={() => onRemoveItem(item.id)}
                    style={styles.removeButton}
                  >
                    <Trash2 size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.totalContainer}>
            <Text style={[styles.totalLabel, { color: colors.text }]}>Total</Text>
            <Text style={styles.totalAmount}>₱ {total.toFixed(2)}</Text>
          </View>
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              onPress={onClearCart}
              style={[styles.actionButton, styles.clearButton, { backgroundColor: colors.card, borderColor: colors.border }]}
              disabled={items.length === 0}
            >
              <Trash2 size={18} color={items.length === 0 ? '#9CA3AF' : '#EF4444'} />
              <Text style={[styles.actionButtonText, { color: items.length === 0 ? '#9CA3AF' : '#EF4444' }]}>
                Clear
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleCheckout}
              style={[styles.actionButton, styles.checkoutButton]}
              disabled={items.length === 0}
            >
              <CreditCard size={18} color="white" />
              <Text style={styles.checkoutButtonText}>Checkout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      <ReceiptModal
        visible={receiptModalVisible}
        items={items}
        onClose={() => setReceiptModalVisible(false)}
        onPrintReceipt={handlePrintReceipt}
        onOrderPlaced={() => setRefreshTrigger(prev => prev + 1)} // ✅ Triggers reload
      />
    </>
  );
}

