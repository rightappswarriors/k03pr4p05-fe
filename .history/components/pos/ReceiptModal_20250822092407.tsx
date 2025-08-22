import React, { useState } from 'react';
 // import our event bus
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { X, Printer, PhilippinePeso } from 'lucide-react-native';
import type { CartItem } from '@/types';
import { useTheme } from '@/contexts/ThemeContext'
import { TransactionService } from '@/services/orderService';


interface ReceiptModalProps {
  visible: boolean;
  items: CartItem[];
  onClose: () => void;
  onPrintReceipt: (receiptData: any) => void;
  onOrderPlaced?: () => void; // ✅ New prop
}

export function ReceiptModal({ visible, items, onClose, onPrintReceipt, onOrderPlaced }: ReceiptModalProps) {
  const { colors } = useTheme()
  const [cashReceived, setCashReceived] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.08; // 8% tax
  const total = subtotal + tax;
  const cashAmount = parseFloat(cashReceived) || 0;
  const change = cashAmount - total;

  const handlePrintReceipt = async () => {
    if (cashAmount < total) {
      Alert.alert('Insufficient Cash', 'Cash received is less than the total amount.');
      return;
    }

    setIsProcessing(true);
    await TransactionService.createOrder(
      items,
      'cash', // payment method
      cashAmount // cash received
    );
    onOrderPlaced?.();

    const receiptData = {
      store: {
        name: 'POSVINE Pro',
        logo: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
        address: '123 Tech Street, Digital City, DC 12345',
        phone: '(555) 123-4567',
      },
      transaction: {
        id: `TXN-${Date.now()}`,
        date: new Date().toISOString(),
        timestamp: new Date().toLocaleString(),
        cashier: 'POS System',
      },
      items: items.map(data => ({
        id: data.id,
        name: data.name,
        price: data.price,
        quantity: data.quantity,
        subtotal: data.price * data.quantity,
        barcode: data.barcode,
      })),
      totals: {
        subtotal: parseFloat(subtotal.toFixed(2)),
        tax: parseFloat(tax.toFixed(2)),
        total: parseFloat(total.toFixed(2)),
        cashReceived: parseFloat(cashAmount.toFixed(2)),
        change: parseFloat(change.toFixed(2)),
      },
      payment: {
        method: 'Cash',
        status: 'Completed',
      },
    };

    // Simulate printing delay
    setTimeout(() => {
      setIsProcessing(false);
      onPrintReceipt(receiptData);
      Alert.alert(
        'Receipt Printed',
        'Transaction completed successfully!',
        [{ text: 'OK', onPress: onClose }]
      );
    }, 2000);
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
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: colors.card}]}>
          {/* Header */}
          <View style={[styles.header,  { borderColor: colors.border}]}>
            <View style={styles.headerLeft}>
              <Image
                source={{ uri: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop' }}
                style={styles.logo}
              />
              <View>
                <Text style={[styles.storeName, { color: colors.text}]}>TechStore Pro</Text>
                <Text style={[styles.receiptTitle, { color: colors.textSecondary}]}>Receipt Summary</Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Receipt Content */}
          <ScrollView style={[styles.content, { borderColor: colors.border}]} showsVerticalScrollIndicator={false}>
            <View style={[styles.section]}>
              <Text style={[styles.sectionTitle, { color: colors.text}]}>Items Purchased</Text>
              {items.map((data) => (
                <View key={data.id} style={styles.itemRow}>
                  <View style={styles.itemInfo}>
                    <Text style={[styles.itemName, { color: colors.text}]}>{data.name}</Text>
                    <Text style={[styles.itemDetails, { color: colors.textSecondary}]}>
                      {data.quantity} × ₱{data.price.toFixed(2)}
                    </Text>
                  </View>
                  <Text style={[styles.itemTotal, { color: colors.text}]}>
                  ₱{(data.price * data.quantity).toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>

            <View style={[styles.divider, {backgroundColor: colors.border}]} />

            <View style={[styles.section, {borderColor: colors.border}]}>
              <View style={styles.totalRow}>
                <Text style={[styles.totalLabel, { color: colors.textSecondary}]}>Subtotal:</Text>
                <Text style={[styles.totalValue, { color: colors.text}]}>₱{subtotal.toFixed(2)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={[styles.totalLabel, { color: colors.textSecondary}]}>Tax (8%):</Text>
                <Text style={[styles.totalValue, { color: colors.text}]}>₱{tax.toFixed(2)}</Text>
              </View>
              <View style={[styles.totalRow, styles.grandTotalRow, { borderColor: colors.border}]}>
                <Text style={[styles.grandTotalLabel, { color: colors.text}]}>Total:</Text>
                <Text style={[styles.grandTotalValue, { color: colors.text}]}>₱{total.toFixed(2)}</Text>
              </View>
            </View>

            
          </ScrollView>

          {/* Footer */}
          <View style={[styles.divider, {backgroundColor: colors.border}]} />

            <View style={[styles.section, styles.paymentSection]}>
              <Text style={[styles.sectionTitle, { color: colors.text}]}>Payment</Text>
              <View style={[styles.cashInputContainer, {backgroundColor: colors.background, borderColor: colors.border}]}>
                <PhilippinePeso size={20} color="#6B7280" />
                <TextInput
                  style={[styles.cashInput, { color: colors.text}]}
                  placeholder="Enter cash received"
                  placeholderTextColor="#9CA3AF"
                  value={cashReceived}
                  onChangeText={setCashReceived}
                  keyboardType="numeric"
                  selectTextOnFocus
                />
              </View>
              
              {cashAmount > 0 && (
                <View style={[styles.changeSection, {backgroundColor: colors.background}]}>
                  <View style={styles.totalRow}>
                    <Text style={[styles.totalLabel, { color: colors.text}]}>Cash Received:</Text>
                    <Text style={[styles.totalValue, { color: colors.text}]}>₱{cashAmount.toFixed(2)}</Text>
                  </View>
                  <View style={[styles.totalRow, styles.changeRow,  { borderColor: colors.border}]}>
                    <Text style={[styles.changeLabel, { color: colors.text}]}>Change:</Text>
                    <Text style={[
                      styles.changeValue,
                      { color: change >= 0 ? '#10B981' : '#EF4444' }
                    ]}>
                      {change < 0?'Insuficient Cash':`${Math.abs(change).toFixed(2)}`}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          <View style={[styles.footer, {borderColor: colors.border}]}>
            <TouchableOpacity onPress={handleClose} style={[styles.cancelButton, { backgroundColor: colors.background}]}>
              <Text style={[styles.cancelButtonText, { color: colors.textSecondary}]}>Cancel</Text>
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
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  storeName: {
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
    marginBottom: 20,
  },
  paymentSection: {
    padding: 20,

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
    padding: 20,
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