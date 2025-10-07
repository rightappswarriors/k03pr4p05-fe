import React, { useRef, useEffect, useState } from 'react';
// import our event bus
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  Image,
} from 'react-native';
import { CustomCheckbox } from "@/components/pos/checkbox/CustomCheckbox"
import { PaymentBottomSheetRef } from "@/types"
import { X, Printer, PhilippinePeso, CreditCard } from 'lucide-react-native';
import type { DiscountType } from '@/types';
import { useTheme } from '@/contexts/ThemeContext'
import { usePOS } from '@/contexts/POSContext';
import { calculateTotal } from '@/hooks/calculateTotal'
import { outletData } from '@/data/mockData';
import DiscountModal from './DiscountModal';
import PaymentBottomSheet from '@/components/pos/paymentMethod/PaymentBottomSheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuth} from "@/contexts/AuthContext"
import { ReceiptService } from '@/services/paymentService';
import useNetworkStatus from '@/hooks/useNetworkStatus';
interface ReceiptModalProps {
  visible: boolean;
  onClose: () => void;
  onPrintReceipt: (receiptData: any) => void;
  onOrderPlaced?: () => void; // ✅ New prop
}


export function ReceiptModal({ visible, onClose, onOrderPlaced }: ReceiptModalProps) {
  const paymentSheetRef = useRef<PaymentBottomSheetRef>(null);
  const isConnected = useNetworkStatus();

  <TouchableOpacity
    disabled={!isConnected} // disable button if offline
    onPress={() => paymentSheetRef.current?.open()}
  >
    <Text>
      {isConnected ? "Payment Method" : "Offline: Payment Disabled"}
    </Text>
  </TouchableOpacity>

  const {
    cartItems: items,
    clearCart,
    outlet,
  } = usePOS()
  const { colors, } = useTheme()
  const [cashReceived, setCashReceived] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [discountOption, setDiscountOption] = useState<DiscountType>('NONE')
  const [isDiscounted, setIsDiscounted] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  useEffect(() => {
    if (!isDiscounted) {
      setDiscountOption('NONE')
    }
  }, [isDiscounted])
  const {
    total,
    subtotal,
    vatAmount,
    discount,
    discountRate
  } = calculateTotal(items, outletData, { type: discountOption })
  const { user} = useAuth()
  const cashAmount = parseFloat(cashReceived) || 0;
  const change = cashAmount - total;
  if (!user || !outlet ) {
    throw new Error("No user or outlet")
  }
  const handlePrintReceipt = () => {
    setIsProcessing(true);
    ReceiptService.processAndPrintReceipt({
      items,
      cashReceived: parseFloat(cashReceived) || 0,
      paymentMethod: "CASH",
      discountOption,
      onSuccess: () => {
        setIsProcessing(false);
        onOrderPlaced?.();
        clearCart();
        handleClose();
      },
      onFail: () => setIsProcessing(false),
      outlet,
      user
    });
  };

  const resetForm = () => {
    setCashReceived('');
    setIsProcessing(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };


  return (
    <>
      <Modal visible={visible} animationType="slide" transparent
        onRequestClose={() => {  // Android back button
          onClose();
        }}
      >
        <GestureHandlerRootView style={styles.modalContainer}>
          <View style={styles.overlay}>
            <TouchableOpacity
              style={StyleSheet.absoluteFillObject}
              activeOpacity={1}
              onPress={() => {   // tap outside to close
                onClose();
              }}
            />
            <View style={[styles.modal, { backgroundColor: colors.card }]}>
              {/* Header */}
              <View style={[styles.header, { borderColor: colors.border }]}>
                <View style={styles.headerLeft}>
                  <Image
                    source={{ uri: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop' }}
                    style={styles.logo}
                  />
                  <View>
                    <Text style={[styles.outletName, { color: colors.text }]}>TechStore Pro</Text>
                    <Text style={[styles.receiptTitle, { color: colors.textSecondary }]}>Receipt Summary {outletData.isVatRegistered ? 'Vat-Registered' : 'Non-Vat'}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                  <X size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Receipt Content */}
              <ScrollView style={[styles.content, { borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Items Purchased</Text>
                {items.map((data) => (
                  <View key={data.id} style={styles.itemRow}>
                    <View style={styles.itemInfo}>
                      <Text style={[styles.itemName, { color: colors.text }]}>{data.name}</Text>
                      <Text style={[styles.itemDetails, { color: colors.textSecondary }]}>
                        {data.quantity} × ₱{data.price.toFixed(2)}
                      </Text>
                    </View>
                    <Text style={[styles.itemTotal, { color: colors.text }]}>
                      ₱{(data.price * data.quantity).toFixed(2)}
                    </Text>
                  </View>
                ))}
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
              </ScrollView>
              {/* Footer */}
              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={[styles.section, styles.paymentSection]}>
                <View style={[styles.section, { borderColor: colors.border }]}>
                  <View style={styles.totalRow}>
                    <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Subtotal:</Text>
                    <Text style={[styles.totalValue, { color: colors.text }]}>₱{subtotal.toFixed(2)}</Text>
                  </View>
                  {outletData.isVatRegistered && (discountOption === 'PROMO' || discountOption === "NONE") &&
                    (
                      <>
                        <View style={styles.totalRow}>
                          <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>VAT Amount({outletData.VatPercent ? outletData.VatPercent * 100 : '0'}%):</Text>
                          <Text style={[styles.totalValue, { color: colors.text }]}>₱{vatAmount.toFixed(2)}</Text>
                        </View>
                      </>
                    )
                  }
                  {isDiscounted &&
                    <View style={styles.totalRow}>
                      <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Discount {discountOption} ({discountRate * 100}%):</Text>
                      <Text style={[styles.totalValue, { color: colors.text }]}>₱{discount.toFixed(2)}</Text>
                    </View>
                  }
                  <View style={[styles.totalRow, styles.grandTotalRow, { borderColor: colors.border }]}>
                    <Text style={[styles.grandTotalLabel, { color: colors.text }]}>Total (VAT Included):</Text>
                    <Text style={[styles.grandTotalValue, { color: colors.text }]}>₱{total.toFixed(2)}</Text>
                  </View>
                </View>
                <View className="flex flex-col align-center justify-between">
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Payment</Text>
                  <View className="flex flex-row justify-between align-center">
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <CustomCheckbox
                        label="Apply Discount"
                        checked={isDiscounted}
                        onPress={() => {
                          if (!isDiscounted) {
                            setIsDiscounted(!isDiscounted);
                          } setIsVisible(!isVisible)
                        }}
                        colors={colors}
                      />

                      <Text style={{ color: colors.text }}>Apply Discount</Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <TouchableOpacity
                        className="flex-row justitfy-center align-center gap-1"

                        disabled={!isConnected} // 👈 disable touch if offline
                        onPress={() => paymentSheetRef.current?.open()} // 👈 open bottom sheet
                      >
                        <Text style={[{ color: colors.text }, !isConnected ? { color: colors.warning } : { color: colors.primary }]}>
                          {isConnected ? "Payment Method" : "Offline"}
                        </Text>
                        <CreditCard size={24} color={!isConnected ? colors.warning : colors.primary} />
                      </TouchableOpacity>
                    </View>
                    <DiscountModal
                      isVisible={isVisible}
                      onClose={() => setIsVisible(false)}
                      isDiscounted={isDiscounted}
                      setIsDiscounted={() => setIsDiscounted(!isDiscounted)}
                      discountOption={discountOption}
                      setDiscountOption={setDiscountOption}
                    />
                  </View>
                </View>
                <View style={[styles.cashInputContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <PhilippinePeso size={20} color="#6B7280" />
                  <TextInput
                    style={[styles.cashInput, { color: colors.text }]}
                    placeholder="Enter cash received"
                    placeholderTextColor="#9CA3AF"
                    value={cashReceived}
                    onChangeText={setCashReceived}
                    keyboardType="numeric"
                    selectTextOnFocus
                  />
                </View>

                {cashAmount > 0 && (
                  <View style={[styles.changeSection, { backgroundColor: colors.background }]}>
                    <View style={styles.totalRow}>
                      <Text style={[styles.totalLabel, { color: colors.text }]}>Cash Received:</Text>
                      <Text style={[styles.totalValue, { color: colors.text }]}>₱{cashAmount.toFixed(2)}</Text>
                    </View>
                    <View style={[styles.totalRow, styles.changeRow, { borderColor: colors.border }]}>
                      <Text style={[styles.changeLabel, { color: colors.text }]}>Change:</Text>
                      <Text style={[
                        styles.changeValue,
                        { color: change >= 0 ? '#10B981' : '#EF4444' }
                      ]}>
                        {change < 0 ? 'Insuficient Cash' : `₱${Math.abs(change).toFixed(2)}`}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
              <View style={[styles.footer, { borderColor: colors.border }]}>
                <TouchableOpacity onPress={handleClose} style={[styles.cancelButton, { backgroundColor: colors.background }]}>
                  <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handlePrintReceipt}
                  style={[
                    styles.printButton,
                    (cashAmount < total || isProcessing) && styles.disabledButton
                  ]}
                  disabled={cashAmount < total || isProcessing}
                >
                  <Printer size={20} color="white" />
                  <Text style={styles.printButtonText}>
                    {isProcessing ? 'Processing...' : 'Print Receipt'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <PaymentBottomSheet ref={paymentSheetRef} />
        </GestureHandlerRootView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // This makes the background dark and transparent
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    height: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  outletName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  receiptTitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 3,
  },
  paymentSection: {
    paddingHorizontal: 20,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 2,
  },
  itemDetails: {
    fontSize: 12,
    color: '#6B7280',
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  totalLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  grandTotalRow: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginTop: 8,
  },
  grandTotalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  grandTotalValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#3B82F6',
  },
  cashInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 16,
  },
  cashInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    marginLeft: 8,
  },
  changeSection: {
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    padding: 12,
  },
  changeRow: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#D1FAE5',
    marginTop: 8,
  },
  changeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  changeValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 5,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  printButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
    gap: 8,
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
  },
  printButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});