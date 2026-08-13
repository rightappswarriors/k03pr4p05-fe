// components/pos/QuantityModal.tsx — full replacement

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Image,
  ScrollView,
} from 'react-native';
import { Minus, Plus, X, Package } from 'lucide-react-native';
import type { Item, ItemUnit } from '@/types';
import { useTheme } from '@/contexts/ThemeContext';
import { useResponsive } from '@/hooks/useResponsive';

interface QuantityModalProps {
  visible: boolean;
  item: Item | null;
  onAddToCart: (quantity: number, unit?: ItemUnit) => void;
  onClose: () => void;
}

// Units that require weight input instead of whole number qty
const WEIGHT_UNITS = ['kg', 'gram', 'g', 'grams', 'kilo', 'kilos'];
const isWeightUnit = (unitName: string) =>
  WEIGHT_UNITS.includes(unitName.toLowerCase());

export function QuantityModal({
  visible,
  item,
  onAddToCart,
  onClose,
}: QuantityModalProps) {
  const { colors } = useTheme();
  const { isDesktop, isTablet } = useResponsive();

  const hasUnits = (item?.units?.length ?? 0) > 0;

  // Selected unit — default to the isDefault one, or first
  const [selectedUnit, setSelectedUnit] = useState<ItemUnit | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [weightInput, setWeightInput] = useState('');

  // Reset state when item changes or modal opens
  useEffect(() => {
    if (!visible || !item) return;
    setQuantity(1);
    setWeightInput('');
    if (item.units && item.units.length > 0) {
      const defaultUnit =
        item.units.find((u) => u.isDefault) ?? item.units[0];
      setSelectedUnit(defaultUnit);
    } else {
      setSelectedUnit(null);
    }
  }, [visible, item]);

  if (!item) return null;

  const isWeight = selectedUnit ? isWeightUnit(selectedUnit.unitName) : false;
  const activePrice = selectedUnit ? selectedUnit.price : item.price;
  const parsedWeight = parseFloat(weightInput) || 0;
  const total = isWeight
    ? activePrice * parsedWeight
    : activePrice * quantity;

  const handleQuantityChange = (val: number) => {
    if (val >= 1) setQuantity(val);
  };

  const handleConfirm = () => {
    if (isWeight) {
      if (parsedWeight <= 0) return; // don't add 0 weight
      onAddToCart(parsedWeight, selectedUnit ?? undefined);
    } else {
      onAddToCart(quantity, selectedUnit ?? undefined);
    }
    onClose();
  };

  const noImage = !item.image;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.modal,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text }]}>
              Add to Cart
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={[
              styles.content,
              { backgroundColor: colors.background },
            ]}
            keyboardShouldPersistTaps="handled"
          >
            {/* Item image */}
            {noImage ? (
              <View
                style={[
                  styles.image,
                  {
                    backgroundColor: colors.border,
                    alignItems: 'center',
                    justifyContent: 'center',
                  },
                ]}
              >
                <Package
                  size={40}
                  color={colors.textSecondary}
                  strokeWidth={1.5}
                />
              </View>
            ) : (
              <Image
                source={{ uri: item.image }}
                style={styles.image}
                resizeMode="cover"
                defaultSource={require('@/assets/images/placeholder.png')}
              />
            )}

            <Text style={[styles.itemName, { color: colors.text }]}>
              {item.name}
            </Text>

            {/* Base price — shown when no unit selected */}
            {!selectedUnit && (
              <Text style={[styles.itemPrice, { color: colors.accent }]}>
                ₱{item.price.toFixed(2)}
              </Text>
            )}

            {/* ── UNIT SELECTOR ────────────────────────────────────── */}
            {hasUnits && (
              <View style={styles.unitSection}>
                <Text
                  style={[styles.sectionLabel, { color: colors.textSecondary }]}
                >
                  SELECT UNIT
                </Text>
                <View style={styles.unitRow}>
                  {item.units!.map((unit) => {
                    const isSelected = selectedUnit?.id === unit.id;
                    return (
                      <TouchableOpacity
                        key={unit.id}
                        onPress={() => {
                          setSelectedUnit(unit);
                          setQuantity(1);
                          setWeightInput('');
                        }}
                        style={[
                          styles.unitChip,
                          {
                            backgroundColor: isSelected
                              ? colors.accent
                              : colors.card,
                            borderColor: isSelected
                              ? colors.accent
                              : colors.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.unitChipLabel,
                            {
                              color: isSelected ? '#fff' : colors.text,
                              fontWeight: isSelected ? '700' : '500',
                            },
                          ]}
                        >
                          {unit.unitLabel}
                        </Text>
                        <Text
                          style={[
                            styles.unitChipPrice,
                            {
                              color: isSelected
                                ? 'rgba(255,255,255,0.85)'
                                : colors.textSecondary,
                            },
                          ]}
                        >
                          ₱{unit.price.toFixed(2)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* ── WEIGHT INPUT (kg/gram units) ──────────────────────── */}
            {isWeight && (
              <View style={styles.inputSection}>
                <Text
                  style={[styles.sectionLabel, { color: colors.textSecondary }]}
                >
                  ENTER WEIGHT
                </Text>
                <View
                  style={[
                    styles.weightRow,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                >
                  <TextInput
                    style={[
                      styles.weightInput,
                      { color: colors.text },
                      (isDesktop || isTablet) && ({ outlineStyle: 'none' } as any),
                    ]}
                    textAlign='center'
                    value={weightInput}
                    onChangeText={(t) => {
                      // allow digits and one decimal point only
                      if (/^\d*\.?\d*$/.test(t)) setWeightInput(t);
                    }}
                    placeholder="0.000"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="decimal-pad"
                    selectTextOnFocus
                    autoFocus
                  />
                  <Text
                    style={[styles.weightUnit, { color: colors.textSecondary }]}
                  >
                    {selectedUnit?.unitName}
                  </Text>
                </View>
                {parsedWeight > 0 && (
                  <Text
                    style={[styles.weightHint, { color: colors.textSecondary }]}
                  >
                    {parsedWeight.toFixed(3)} {selectedUnit?.unitName} ×
                    ₱{activePrice.toFixed(2)} / {selectedUnit?.unitName}
                  </Text>
                )}
              </View>
            )}

            {/* ── QUANTITY PICKER (non-weight units or no units) ────── */}
            {!isWeight && (
              <View style={styles.inputSection}>
                <Text
                  style={[styles.sectionLabel, { color: colors.textSecondary }]}
                >
                  QUANTITY
                </Text>
                <View style={styles.quantityControls}>
                  <TouchableOpacity
                    onPress={() => handleQuantityChange(quantity - 1)}
                    style={[
                      styles.qtyButton,
                      { backgroundColor: colors.card },
                    ]}
                  >
                    <Minus size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <TextInput
                    style={[
                      styles.qtyInput,
                      {
                        backgroundColor: colors.card,
                        color: colors.text,
                        borderColor: colors.border,
                      },
                      (isDesktop || isTablet) && ({ outlineStyle: 'none' } as any),
                    ]}
                    value={quantity.toString()}
                    onChangeText={(t) => {
                      const n = parseInt(t) || 1;
                      handleQuantityChange(n);
                    }}
                    keyboardType="numeric"
                    selectTextOnFocus
                  />
                  <TouchableOpacity
                    onPress={() => handleQuantityChange(quantity + 1)}
                    style={[
                      styles.qtyButton,
                      { backgroundColor: colors.card },
                    ]}
                  >
                    <Plus size={20} color={colors.text} />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ── TOTAL ─────────────────────────────────────────────── */}
            <View
              style={[styles.totalRow, { borderTopColor: colors.border }]}
            >
              <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>
                Total
              </Text>
              <Text style={[styles.totalAmount, { color: colors.accent }]}>
                ₱{total.toFixed(2)}
              </Text>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.cancelBtn, { borderColor: colors.border }]}
            >
              <Text style={[styles.cancelTxt, { color: colors.textSecondary }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleConfirm}
              disabled={isWeight && parsedWeight <= 0}
              style={[
                styles.addBtn,
                {
                  backgroundColor:
                    isWeight && parsedWeight <= 0
                      ? colors.border
                      : colors.accent,
                },
              ]}
            >
              <Text style={styles.addTxt}>Add to Cart</Text>
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    borderRadius: 16,
    width: '100%',
    maxWidth: 420,
    maxHeight: '90%',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
  },
  title: { fontSize: 17, fontWeight: '800' },
  closeButton: { padding: 4 },
  content: {
    padding: 20,
    alignItems: 'center',
  },
  image: {
    width: 110,
    height: 110,
    borderRadius: 12,
    marginBottom: 14,
    backgroundColor: '#F3F4F6',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  unitSection: {
    width: '100%',
    marginBottom: 20,
  },
  unitRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  unitChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    minWidth: 80,
  },
  unitChipLabel: { fontSize: 13 },
  unitChipPrice: { fontSize: 11, marginTop: 2 },
  inputSection: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    width: '90%',
    gap: 8,
  },
  weightInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: '700',
    paddingVertical: 10,
  },
  weightUnit: {
    fontSize: 16,
    fontWeight: '600',
  },
  weightHint: {
    fontSize: 12,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  qtyButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyInput: {
    width: 64,
    height: 44,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    borderRadius: 10,
    borderWidth: 1.5,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingTop: 16,
    marginTop: 4,
    borderTopWidth: 1,
  },
  totalLabel: { fontSize: 15 },
  totalAmount: { fontSize: 22, fontWeight: '800' },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 10,
    borderTopWidth: 1,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
  },
  cancelTxt: { fontSize: 15, fontWeight: '600' },
  addBtn: {
    flex: 2,
    paddingVertical: 13,
    alignItems: 'center',
    borderRadius: 10,
  },
  addTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
});