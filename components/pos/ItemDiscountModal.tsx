// components/pos/ItemDiscountModal.tsx
import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { X, Minus, Plus, Percent } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { Outlet } from '@/types';

interface ItemDiscountModalProps {
  visible: boolean;
  onClose: () => void;
  item: {
    id: string;
    name: string;
    price: number;
    priceAtSale?: number;
    quantity: number;
    discountAmount?: number;
    discountQuantity?: number;
    discountRate?: number;
  };
  outlet: Outlet;
  onApply: (discountData: {
    discountAmount: number;
    discountQuantity: number;
    discountRate: number;
  }) => void;
}

export function ItemDiscountModal({
  visible,
  onClose,
  item,
  outlet,
  onApply,
}: ItemDiscountModalProps) {
  const { colors } = useTheme();
  
  // Discount type: 'none' | 'percentage' | 'fixed' | outlet promo names
  const [discountType, setDiscountType] = useState<string>('none');
  const [discountedQty, setDiscountedQty] = useState<number>(0);
  const [customPercent, setCustomPercent] = useState<string>('');
  const [fixedAmount, setFixedAmount] = useState<string>('');

  const basePrice = item.priceAtSale ?? item.price;
  const parsedCustomPercent = parseFloat(customPercent);
  const isCustomPercentValid =
    discountType !== 'percentage' ||
    (!Number.isNaN(parsedCustomPercent) && parsedCustomPercent >= 0 && parsedCustomPercent <= 100);

  const sanitizePercentInput = (value: string) => {
    const sanitized = value.replace(/[^0-9.]/g, '');
    setCustomPercent(sanitized);
  };

  // Initialize with existing discount if any
  useEffect(() => {
    if (item.discountAmount && item.discountAmount > 0) {
      setDiscountedQty(item.discountQuantity ?? item.quantity);
      if (item.discountRate) {
        setDiscountType('percentage');
        setCustomPercent((item.discountRate * 100).toFixed(0));
      } else {
        setDiscountType('fixed');
        setFixedAmount(item.discountAmount.toFixed(2));
      }
    } else {
      setDiscountedQty(item.quantity);
      setDiscountType('none');
    }
  }, [item]);

  // Get available discount options from outlet
  const discountOptions = outlet.discountOption
    ? Object.entries(outlet.discountOption)
        .filter(([key]) => !['SENIOR', 'PWD'].includes(key)) // Exclude SC/PWD
        .map(([key, value]) => ({
          key,
          label: key.replace(/_/g, ' '),
          rate: value as number,
        }))
    : [];

  const handleQtyChange = (delta: number) => {
    const newQty = Math.max(0, Math.min(item.quantity, discountedQty + delta));
    setDiscountedQty(newQty);
  };

  const calculateDiscount = () => {
    if (discountType === 'none' || discountedQty === 0) {
      return { amount: 0, qty: 0, rate: 0 };
    }

    let rate = 0;
    let amount = 0;
    const percentValue = Number.isFinite(parsedCustomPercent) ? parsedCustomPercent : 0;

    if (discountType === 'percentage') {
      rate = isCustomPercentValid ? percentValue / 100 : 0;
      amount = basePrice * rate * discountedQty;
    } else if (discountType === 'fixed') {
      amount = parseFloat(fixedAmount) || 0;
      rate = amount / (basePrice * discountedQty);
    } else {
      // Outlet promo
      const promo = discountOptions.find((d) => d.key === discountType);
      rate = promo?.rate ?? 0;
      amount = basePrice * rate * discountedQty;
    }

    return { amount, qty: discountedQty, rate };
  };

  const discount = calculateDiscount();

  const handleApply = () => {
    if (discountType === 'percentage' && !isCustomPercentValid) {
      return;
    }

    if (discountType === 'none') {
      onApply({ discountAmount: 0, discountQuantity: 0, discountRate: 0 });
    } else {
      onApply({
        discountAmount: discount.amount,
        discountQuantity: discount.qty,
        discountRate: discount.rate,
      });
    }
    onClose();
  };

  const handleRemove = () => {
    onApply({ discountAmount: 0, discountQuantity: 0, discountRate: 0 });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={onClose}
        />
        <View
          style={[
            styles.modal,
            {
              backgroundColor: colors.card,
              maxWidth: Math.min(Dimensions.get('window').width - 48, 500),
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.text }]}>
                Discount: {item.name}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Price: ₱{basePrice.toFixed(2)} × {item.quantity}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Quantity Selector */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.text }]}>
                Discount Quantity
              </Text>
              <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
                How many items get the discount?
              </Text>
              
              <View style={styles.qtyRow}>
                <TouchableOpacity
                  onPress={() => handleQtyChange(-1)}
                  style={[
                    styles.qtyBtn,
                    { borderColor: colors.border, backgroundColor: colors.background },
                  ]}
                  disabled={discountedQty === 0}
                >
                  <Minus
                    size={20}
                    color={discountedQty === 0 ? colors.textSecondary : colors.text}
                  />
                </TouchableOpacity>

                <View style={[styles.qtyDisplay, { borderColor: colors.border }]}>
                  <Text style={[styles.qtyText, { color: colors.text }]}>
                    {discountedQty.toFixed(2)}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => handleQtyChange(1)}
                  style={[
                    styles.qtyBtn,
                    { borderColor: colors.border, backgroundColor: colors.background },
                  ]}
                  disabled={discountedQty >= item.quantity}
                >
                  <Plus
                    size={20}
                    color={
                      discountedQty >= item.quantity ? colors.textSecondary : colors.text
                    }
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={() => setDiscountedQty(item.quantity)}
                style={[styles.allBtn, { backgroundColor: colors.primary + '20' }]}
              >
                <Text style={[styles.allBtnText, { color: colors.primary }]}>
                  Apply to all {item.quantity}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Discount Type Selector */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.text }]}>
                Discount Type
              </Text>

              {/* None */}
              <TouchableOpacity
                onPress={() => setDiscountType('none')}
                style={[
                  styles.discountOption,
                  {
                    borderColor: discountType === 'none' ? colors.primary : colors.border,
                    backgroundColor:
                      discountType === 'none' ? colors.primary + '10' : colors.background,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.discountLabel,
                    {
                      color: discountType === 'none' ? colors.primary : colors.text,
                      fontWeight: discountType === 'none' ? '700' : '600',
                    },
                  ]}
                >
                  No Discount
                </Text>
              </TouchableOpacity>

              {/* Outlet Promos */}
              {discountOptions.map((promo) => (
                <TouchableOpacity
                  key={promo.key}
                  onPress={() => setDiscountType(promo.key)}
                  style={[
                    styles.discountOption,
                    {
                      borderColor:
                        discountType === promo.key ? colors.primary : colors.border,
                      backgroundColor:
                        discountType === promo.key
                          ? colors.primary + '10'
                          : colors.background,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.discountLabel,
                      {
                        color: discountType === promo.key ? colors.primary : colors.text,
                        fontWeight: discountType === promo.key ? '700' : '600',
                      },
                    ]}
                  >
                    {promo.label} ({(promo.rate * 100).toFixed(0)}%)
                  </Text>
                </TouchableOpacity>
              ))}

              {/* Custom Percentage */}
              <TouchableOpacity
                onPress={() => setDiscountType('percentage')}
                style={[
                  styles.discountOption,
                  {
                    borderColor:
                      discountType === 'percentage' ? colors.primary : colors.border,
                    backgroundColor:
                      discountType === 'percentage'
                        ? colors.primary + '10'
                        : colors.background,
                  },
                ]}
              >
                <Percent
                  size={18}
                  color={discountType === 'percentage' ? colors.primary : colors.text}
                />
                <Text
                  style={[
                    styles.discountLabel,
                    {
                      color: discountType === 'percentage' ? colors.primary : colors.text,
                      fontWeight: discountType === 'percentage' ? '700' : '600',
                    },
                  ]}
                >
                  Custom Percentage
                </Text>
              </TouchableOpacity>

              {discountType === 'percentage' && (
                <>
                  <View style={[styles.inputRow, { borderColor: colors.border }]}> 
                    <TextInput
                      value={customPercent}
                      onChangeText={sanitizePercentInput}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor={colors.textSecondary}
                      style={[styles.input, { color: colors.text }]}
                    />
                    <Text style={[styles.inputSuffix, { color: colors.textSecondary }]}> 
                      %
                    </Text>
                  </View>
                  {!isCustomPercentValid && (
                    <Text style={[styles.errorText, { color: '#EF4444', marginTop: 8 }]}> 
                      Percentage must be between 0 and 100.
                    </Text>
                  )}
                </>
              )}

              {/* Fixed Amount */}
              <TouchableOpacity
                onPress={() => setDiscountType('fixed')}
                style={[
                  styles.discountOption,
                  {
                    borderColor: discountType === 'fixed' ? colors.primary : colors.border,
                    backgroundColor:
                      discountType === 'fixed' ? colors.primary + '10' : colors.background,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.discountLabel,
                    {
                      color: discountType === 'fixed' ? colors.primary : colors.text,
                      fontWeight: discountType === 'fixed' ? '700' : '600',
                    },
                  ]}
                >
                  Fixed Amount
                </Text>
              </TouchableOpacity>

              {discountType === 'fixed' && (
                <View style={[styles.inputRow, { borderColor: colors.border }]}>
                  <Text style={[styles.inputPrefix, { color: colors.textSecondary }]}>
                    ₱
                  </Text>
                  <TextInput
                    value={fixedAmount}
                    onChangeText={setFixedAmount}
                    keyboardType="numeric"
                    placeholder="0.00"
                    placeholderTextColor={colors.textSecondary}
                    style={[styles.input, { color: colors.text }]}
                  />
                </View>
              )}
            </View>

            {/* Preview */}
            {discountType !== 'none' && discountedQty > 0 && (
              <View
                style={[
                  styles.preview,
                  { backgroundColor: colors.background, borderColor: colors.border },
                ]}
              >
                <View style={styles.previewRow}>
                  <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>
                    Discounted Items:
                  </Text>
                  <Text style={[styles.previewValue, { color: colors.text }]}>
                    {discountedQty.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.previewRow}>
                  <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>
                    Discount Rate:
                  </Text>
                  <Text style={[styles.previewValue, { color: colors.text }]}>
                    {(discount.rate * 100).toFixed(2)}%
                  </Text>
                </View>
                <View style={styles.previewRow}>
                  <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>
                    Total Discount:
                  </Text>
                  <Text style={[styles.previewValue, { color: '#EF4444' }]}>
                    -₱{discount.amount.toFixed(2)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.previewRow,
                    styles.previewTotal,
                    { borderTopColor: colors.border },
                  ]}
                >
                  <Text style={[styles.previewLabel, { color: colors.text, fontWeight: '700' }]}>
                    New Subtotal:
                  </Text>
                  <Text style={[styles.previewValue, { color: colors.accent, fontWeight: '700' }]}>
                    ₱{((basePrice * item.quantity) - discount.amount).toFixed(2)}
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            {item.discountAmount && item.discountAmount > 0 && (
              <TouchableOpacity
                onPress={handleRemove}
                style={[styles.removeBtn, { backgroundColor: '#EF4444' }]}
              >
                <Text style={styles.removeBtnText}>Remove Discount</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={handleApply}
              disabled={discountType === 'percentage' && !isCustomPercentValid}
              style={[
                styles.applyBtn,
                {
                  backgroundColor:
                    discountType === 'percentage' && !isCustomPercentValid
                      ? colors.border
                      : colors.primary,
                },
              ]}
            >
              <Text style={styles.applyBtnText}>
                {discountType === 'none' ? 'Clear Discount' : 'Apply Discount'}
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
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modal: {
    borderRadius: 16,
    width: '100%',
    maxHeight: '90%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
  },
  closeBtn: {
    padding: 4,
    marginLeft: 8,
  },
  body: {
    paddingHorizontal: 20,
    maxHeight: 500,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 12,
    marginBottom: 12,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  qtyBtn: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyDisplay: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    fontSize: 16,
    fontWeight: '600',
  },
  allBtn: {
    marginTop: 8,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  allBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  discountOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  discountLabel: {
    fontSize: 14,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  inputPrefix: {
    fontSize: 16,
    marginRight: 8,
  },
  inputSuffix: {
    fontSize: 16,
    marginLeft: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
  preview: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  previewTotal: {
    paddingTop: 12,
    marginTop: 4,
    borderTopWidth: 1,
    marginBottom: 0,
  },
  previewLabel: {
    fontSize: 13,
  },
  previewValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 10,
    borderTopWidth: 1,
  },
  removeBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  removeBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  applyBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  applyBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});