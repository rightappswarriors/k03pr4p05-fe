// components/AddInventoryItemModal.tsx
// Centered modal version of add-inventory-item screen

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  X,
  Search,
  Plus,
  Trash2,
  Info,
} from 'lucide-react-native';

import { useTheme } from '@/contexts/ThemeContext';
import { InventoryService } from '@/services/inventoryService';
import { GlobalCategoryPickerModal } from '@/components/GlobalCategoryPickerModal';
import { CatalogItem, UnitLine } from '@/types';
import { CatalogSearchModal } from '@/components/CatalogSearchModal';

type FieldErrors = Record<string, string>;

interface AddInventoryItemModalProps {
  visible: boolean;
  onClose: () => void;
  outletId: string;
  outletName: string;
  branchName: string;
  branchId: string;
  inventoryItemId?: string;
}
export default function AddInventoryItemModal({
  visible,
  onClose,
  outletId,
  outletName,
  branchName,
  branchId,
  inventoryItemId,
}: AddInventoryItemModalProps) {
  const isEditMode = !!inventoryItemId;

  // ─── State ──────────────────────────────────────────────────────────────────
  const { colors } = useTheme();
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState<string | null>(null);
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedCategoryName, setSelectedCategoryName] = useState('');
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
  const [displayToKompraph, setDisplayToKompraph] = useState(false);
  const [basePrice, setBasePrice] = useState('');
  const [baseQty, setBaseQty] = useState('0');
  const [opExPct, setOpExPct] = useState('10');
  const [units, setUnits] = useState<UnitLine[]>([
    {
      id: 'u1',
      unitName: 'piece',
      unitLabel: 'Piece',
      price: '',
      quantity: '0',
      conversionFactor: '1',
      barcode: '',
      allowDecimal: false,
      isDefault: true,
      reorderPoint: '10',
    },
  ]);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // ─── Prefill on edit ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!visible) {
      resetForm();
      return;
    }
    if (!inventoryItemId) return;
    resetForm();
    InventoryService.getInventoryItemById(Number(inventoryItemId)).then((data) => {

      if (!data) return;
      if (__DEV__) console.log('Prefill data:', data);
      setSelectedItem({
        id: data.item.id.toString(),
        name: data.item.name,
        barcode: data.item.barcode,
        brand: data.item.brand,
        sellingPrice: data.item.sellingPrice?.toString() ?? '',
        stock: data.item.stock,
        remainingStock: data.item.remainingStock,
        maxAllocatable: data.item.maxAllocatable,
        costLines: data.item.costLines ?? [],
      });
      setBasePrice(data.price.toString());
      setBaseQty(data.quantity.toString());
      if (data.category) {
        setSelectedCategoryId(data.category.id);
        setSelectedCategoryName(data.category.name);
      }
      if (data.units && data.units.length > 0) {
        setUnits(
          data.units.map((u: any) => ({
            id: u.id.toString(),
            unitName: u.unitName,
            unitLabel: u.unitLabel,
            price: u.price.toString(),
            quantity: u.quantity.toString(),
            conversionFactor: u.conversionFactor.toString(),
            barcode: u.barcode ?? '',
            isDefault: u.isDefault,
            allowDecimal: u.allowDecimal,
            reorderPoint: u.reorderPoint?.toString() ?? '0',
          })),
        );
      }
    });
  }, [visible, inventoryItemId]);

  // Reset when modal closes

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const clearFieldError = (key: string) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const fieldError = (key: string) =>
    fieldErrors[key] ? (
      <Text style={[s.fieldErrTxt, { color: colors.error }]}>
        {fieldErrors[key]}
      </Text>
    ) : null;

  const fieldBorder = (key: string, fallback: string) =>
    fieldErrors[key] ? colors.error : fallback;

  const hasUnitError = (id: string) =>
    Object.keys(fieldErrors).some((key) => key.startsWith(`unit.${id}.`));

  const fieldLabel = (txt: string) => (
    <Text style={[s.label, { color: colors.textSecondary }]}>{txt}</Text>
  );

  // ─── Validation ─────────────────────────────────────────────────────────────

  const validateForm = () => {
    const nextErrors: FieldErrors = {};
    const price = Number(basePrice);
    const qty = Number(baseQty || 0);
    const maxStock = Number(
      selectedItem?.maxAllocatable ?? selectedItem?.remainingStock ?? selectedItem?.stock ?? 0
    );
    if (!selectedItem) nextErrors.item = 'Please select an item from the catalog.';
    if (!basePrice.trim()) {
      nextErrors.basePrice = 'Base price is required.';
    } else if (!Number.isFinite(price) || price <= 0) {
      nextErrors.basePrice = 'Enter a valid base price.';
    }
    if (baseQty.trim() && (!Number.isFinite(qty) || qty < 0)) {
      nextErrors.baseQty = 'Opening quantity cannot be negative.';
    } else if (selectedItem && qty > maxStock) {
      nextErrors.baseQty = `Opening quantity cannot exceed ${maxStock}.`;
    }

    units.forEach((unit, idx) => {
      const label = `Unit ${idx + 1}`;
      const unitPrice = unit.price.trim() ? Number(unit.price) : price;
      const unitQty = Number(unit.quantity || 0);
      const conversionFactor = Number(unit.conversionFactor || 0);
      const reorderPoint = Number(unit.reorderPoint || 0);
      if (!unit.unitName.trim()) nextErrors[`unit.${unit.id}.unitName`] = `${label} name is required.`;
      if (!Number.isFinite(unitPrice) || unitPrice <= 0) nextErrors[`unit.${unit.id}.price`] = `${label} price must be valid.`;
      if (!Number.isFinite(unitQty) || unitQty < 0) nextErrors[`unit.${unit.id}.quantity`] = `${label} quantity cannot be negative.`;
      if (!Number.isFinite(conversionFactor) || conversionFactor <= 0) nextErrors[`unit.${unit.id}.conversionFactor`] = `${label} conversion factor must be greater than zero.`;
      if (!Number.isFinite(reorderPoint) || reorderPoint < 0) nextErrors[`unit.${unit.id}.reorderPoint`] = `${label} reorder point cannot be negative.`;
    });

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  // ─── Unit actions ───────────────────────────────────────────────────────────

  const addUnit = () =>
    setUnits((prev) => [
      ...prev,
      {
        id: `u_${Date.now()}`,
        unitName: '',
        unitLabel: '',
        price: '',
        quantity: '0',
        conversionFactor: '1',
        barcode: '',
        isDefault: false,
        allowDecimal: false,
        reorderPoint: '0',
      },
    ]);

  const updateUnit = (id: string, field: keyof UnitLine, value: string | boolean) => {
    clearFieldError(`unit.${id}.${field}`);
    setUnits((prev) => prev.map((u) => (u.id === id ? { ...u, [field]: value } : u)));
  };

  const removeUnit = (id: string) =>
    setUnits((prev) => prev.filter((u) => u.id !== id));

  const setDefaultUnit = (id: string) =>
    setUnits((prev) => prev.map((u) => ({ ...u, isDefault: u.id === id })));

  const resetForm = () => {
    setSelectedItem(null);
    setSelectedCategoryId(null);
    setSelectedCategoryName('');
    setDisplayToKompraph(false);
    setBasePrice('');
    setBaseQty('0');
    setOpExPct('10');
    setUnits([{
      id: 'u1',
      unitName: 'piece',
      unitLabel: 'Piece',
      price: '',
      quantity: '0',
      conversionFactor: '1',
      barcode: '',
      isDefault: true,
      reorderPoint: '10',
      allowDecimal: false,
    }]);
    setError('');
    setFieldErrors({});
    setSuccess(false);
    setTooltipVisible(null);
  };

  // ─── Save ───────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    setError('');
    if (!validateForm()) {
      setError('Please fix the highlighted fields.');
      return;
    }
    const itemToSave = selectedItem;
    if (!itemToSave) return;
    setSaving(true);
    try {
      const payload = {
        itemId: Number(itemToSave.id),
        price: parseFloat(basePrice),
        quantity: parseInt(baseQty) || 0,
        categoryId: selectedCategoryId ?? undefined,
        units: units.map((u) => ({
          unitName: u.unitName,
          unitLabel: u.unitLabel,
          price: parseFloat(u.price || basePrice),
          quantity: parseFloat(u.quantity) || 0,
          conversionFactor: parseFloat(u.conversionFactor) || 1,
          baseUnit: 'piece',
          barcode: u.barcode || undefined,
          isDefault: u.isDefault,
          allowDecimal: u.allowDecimal,
          minOrderQty: parseFloat(u.reorderPoint) || 0,
          maxOrderQty: undefined,
          reorderPoint: parseFloat(u.reorderPoint) || 0,
        })),
      };

      if (isEditMode) {
        const { itemId, ...updatePayload } = payload;
        await InventoryService.updateOutletItem(Number(inventoryItemId), updatePayload);
      } else {
        await InventoryService.addItemToOutletWithUnits(Number(outletId), payload);
      }

      setSuccess(true);
      setTimeout(() => {
        resetForm();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to add item. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <View style={s.backdrop}>
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={onClose}
        />

        {/* Card */}
        <View style={[s.card, { backgroundColor: colors.background }]}>

          {/* Header */}
          <View style={[s.header, {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
          }]}>
            <TouchableOpacity
              style={[s.closeBtn, { backgroundColor: colors.card }]}
              onPress={onClose}
            >
              <X size={20} color={colors.text} strokeWidth={2} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={[s.title, { color: colors.text }]}>
                {isEditMode ? 'Edit Inventory Item' : 'Add Inventory Item'}
              </Text>
              <Text style={[s.subtitle, { color: colors.textSecondary }]}>
                {outletName}
              </Text>
            </View>
          </View>

          {/* Body */}
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <ScrollView
              contentContainerStyle={s.body}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >

              {/* ── Item picker ── */}
              {fieldLabel('ITEM FROM CATALOG *')}
              <TouchableOpacity
                style={[s.itemPicker, {
                  backgroundColor: colors.card,
                  borderColor: fieldBorder('item', selectedItem ? colors.primary : colors.border),
                }]}
                onPress={() => setCatalogOpen(true)}
                activeOpacity={0.82}
                disabled={isEditMode}
              >
                {selectedItem ? (
                  <View style={{ flex: 1 }}>
                    <Text style={[s.itemPickerName, { color: colors.text }]}>
                      {selectedItem.name}
                    </Text>
                    <Text style={[s.itemPickerMeta, { color: colors.textSecondary }]}>
                      {selectedItem.brand ? `${selectedItem.brand} · ` : ''}
                      {selectedItem.barcode}
                    </Text>
                  </View>
                ) : (
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Search size={16} color={colors.textSecondary} strokeWidth={2} />
                    <Text style={{ fontSize: 14, color: colors.textSecondary }}>
                      Search item catalog…
                    </Text>
                  </View>
                )}
                {!isEditMode && (
                  selectedItem ? (
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedItem(null);
                        clearFieldError('item');
                      }}
                    >
                      <X size={16} color={colors.error} strokeWidth={2} />
                    </TouchableOpacity>
                  ) : (
                    <Text style={{ color: colors.textSecondary }}>›</Text>
                  )
                )}
              </TouchableOpacity>
              {fieldError('item')}

              {/* ── Item info card ── */}
              {selectedItem && (
                <View style={[s.infoCard, {
                  backgroundColor: parseFloat(basePrice || '0') >= parseFloat(selectedItem.sellingPrice || '0')
                    ? colors.success + '20' : colors.error + '20',
                  borderColor: parseFloat(basePrice || '0') >= parseFloat(selectedItem.sellingPrice || '0')
                    ? colors.success : colors.error,
                }]}>
                  <Text style={[s.infoCardTitle, { color: colors.text }]}>Item Details</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={[s.infoCardLabel, { color: colors.textSecondary }]}>Selling Price:</Text>
                    <Text style={[s.infoCardValue, { color: colors.text }]}>
                      ₱{parseFloat(selectedItem.sellingPrice || '0').toFixed(2)}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={[s.infoCardLabel, { color: colors.textSecondary }]}>Available Stock:</Text>
                    <Text style={[s.infoCardValue, { color: colors.text }]}>
                      {selectedItem.remainingStock || 0}
                    </Text>
                  </View>
                </View>
              )}

              {/* ── Category ── */}
              {fieldLabel('CATEGORY (Global)')}
              <TouchableOpacity
                style={[s.itemPicker, {
                  backgroundColor: colors.card,
                  borderColor: selectedCategoryId ? colors.primary : colors.border,
                }]}
                onPress={() => setCategoryPickerVisible(true)}
                activeOpacity={0.82}
              >
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Search size={16} color={colors.textSecondary} strokeWidth={2} />
                  <Text style={{ fontSize: 14, color: selectedCategoryName ? colors.text : colors.textSecondary }}>
                    {selectedCategoryName || 'Select global category…'}
                  </Text>
                </View>
                {selectedCategoryId ? (
                  <TouchableOpacity
                    onPress={() => { setSelectedCategoryId(null); setSelectedCategoryName(''); }}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <X size={14} color={colors.error} strokeWidth={2} />
                  </TouchableOpacity>
                ) : (
                  <Text style={{ color: colors.textSecondary }}>›</Text>
                )}
              </TouchableOpacity>

              {/* ── Display to Kompra.ph ── */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.label, { color: colors.text }]}>Display to Kompra.ph</Text>
                  <Text style={[s.hint, { color: colors.textSecondary }]}>
                    Note: This will need to be approved by the admin.
                  </Text>
                </View>
                <TouchableOpacity
                  style={[s.switch, { backgroundColor: displayToKompraph ? colors.primary : colors.border }]}
                  onPress={() => setDisplayToKompraph(!displayToKompraph)}
                  activeOpacity={0.8}
                >
                  <View style={[s.switchThumb, { transform: [{ translateX: displayToKompraph ? 20 : 0 }] }]} />
                </TouchableOpacity>
              </View>

              {/* ── Base price + qty ── */}
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  {fieldLabel('BASE PRICE ₱ *')}
                  <TextInput
                    style={[s.input, {
                      color: colors.text,
                      backgroundColor: colors.background,
                      borderColor: fieldBorder('basePrice', colors.border),
                    }]}
                    placeholder="0.00"
                    placeholderTextColor={colors.textSecondary}
                    value={basePrice}
                    onChangeText={(text) => { setBasePrice(text); clearFieldError('basePrice'); }}
                    keyboardType="decimal-pad"
                  />
                  {fieldError('basePrice')}
                </View>
                <View style={{ flex: 1 }}>
                  {fieldLabel('OPENING QTY')}
                  <TextInput
                    style={[s.input, {
                      color: colors.text,
                      backgroundColor: colors.background,
                      borderColor: fieldBorder('baseQty', colors.border),
                    }]}
                    placeholder="0"
                    placeholderTextColor={colors.textSecondary}
                    value={baseQty}
                    onChangeText={(text) => {
                      const num = parseInt(text) || 0;
                      const maxStock = selectedItem?.stock || 0;
                      setBaseQty(num <= maxStock ? text : maxStock.toString());
                      clearFieldError('baseQty');
                    }}
                    keyboardType="number-pad"
                  />
                  {fieldError('baseQty')}
                </View>
              </View>

              {/* ── OpEx ── */}
              {fieldLabel('OPEX CONTRIBUTION %')}
              <TextInput
                style={[s.input, {
                  color: colors.text,
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  width: '40%',
                }]}
                placeholder="10"
                placeholderTextColor={colors.textSecondary}
                value={opExPct}
                onChangeText={setOpExPct}
                keyboardType="decimal-pad"
              />

              {/* ── Units header ── */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 10 }}>
                <Text style={[s.sectionTitle, { color: colors.text }]}>Selling Units</Text>
                <TouchableOpacity
                  style={[s.addUnitBtn, { backgroundColor: colors.primary + '18', borderColor: colors.primary }]}
                  onPress={addUnit}
                >
                  <Plus size={13} color={colors.primary} strokeWidth={2.5} />
                  <Text style={[s.addUnitTxt, { color: colors.primary }]}>Add Unit</Text>
                </TouchableOpacity>
              </View>
              <Text style={[s.hint, { color: colors.textSecondary }]}>
                Define how this item is sold — by piece, box, pack, etc. Each unit has its own price and quantity tracking.
              </Text>

              {/* ── Unit cards ── */}
              {units.map((unit, idx) => (
                <View
                  key={unit.id}
                  style={[s.unitCard, {
                    backgroundColor: colors.card,
                    borderColor: hasUnitError(unit.id) ? colors.error : unit.isDefault ? colors.primary : colors.border,
                  }]}
                >
                  {/* Unit card header */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, flexWrap: 'wrap' }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textSecondary }}>
                        Unit {idx + 1}
                      </Text>
                      {unit.isDefault && (
                        <View style={{ backgroundColor: colors.primary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                          <Text style={{ fontSize: 10, fontWeight: '700', color: '#fff' }}>DEFAULT</Text>
                        </View>
                      )}
                      {/* Tooltip + decimal checkbox */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <TouchableOpacity
                          onPress={() => setTooltipVisible(tooltipVisible === unit.id ? null : unit.id)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Info size={14} color={colors.textSecondary} strokeWidth={2} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                          onPress={() => setUnits((prev) => prev.map((u) => u.id === unit.id ? { ...u, allowDecimal: !u.allowDecimal } : u))}
                          activeOpacity={0.7}
                        >
                          <Text style={{ fontSize: 12, color: colors.textSecondary, fontWeight: '500' }}>
                            Decimal qty
                          </Text>
                          <View style={{
                            width: 20, height: 20, borderRadius: 5, borderWidth: 1.5,
                            alignItems: 'center', justifyContent: 'center',
                            borderColor: unit.allowDecimal ? colors.primary : colors.border,
                            backgroundColor: unit.allowDecimal ? colors.primary : 'transparent',
                          }}>
                            {unit.allowDecimal && (
                              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', lineHeight: 16 }}>✓</Text>
                            )}
                          </View>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Set default / remove */}
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {!unit.isDefault && (
                        <TouchableOpacity onPress={() => setDefaultUnit(unit.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '600' }}>Set Default</Text>
                        </TouchableOpacity>
                      )}
                      {units.length > 1 && (
                        <TouchableOpacity onPress={() => removeUnit(unit.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <Trash2 size={15} color={colors.error} strokeWidth={2} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  {/* Tooltip */}
                  {tooltipVisible === unit.id && (
                    <View style={{ marginBottom: 10, padding: 10, borderRadius: 8, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }}>
                      <Text style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 18 }}>
                        <Text style={{ fontWeight: '700', color: colors.text }}>Decimal quantity</Text>
                        {' '}allows selling fractional amounts like 1.5 kg or 0.75 liters.{'\n'}
                        Enable this for weight-based units (kg, gram, liter).{'\n'}
                        Leave off for countable units (piece, dozen, box).
                      </Text>
                    </View>
                  )}

                  {/* Unit Name + Label */}
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.unitLabel, { color: colors.textSecondary }]}>Unit Name</Text>
                      <TextInput
                        style={[s.unitInput, { color: colors.text, borderColor: fieldBorder(`unit.${unit.id}.unitName`, colors.border), backgroundColor: colors.background }]}
                        placeholder="piece / box / pack"
                        placeholderTextColor={colors.textSecondary}
                        value={unit.unitName}
                        onChangeText={(v) => updateUnit(unit.id, 'unitName', v)}
                      />
                      {fieldError(`unit.${unit.id}.unitName`)}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.unitLabel, { color: colors.textSecondary }]}>Display Label</Text>
                      <TextInput
                        style={[s.unitInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                        placeholder="e.g. Box of 12"
                        placeholderTextColor={colors.textSecondary}
                        value={unit.unitLabel}
                        onChangeText={(v) => updateUnit(unit.id, 'unitLabel', v)}
                      />
                    </View>
                  </View>

                  {/* Price + Conv Factor */}
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.unitLabel, { color: colors.textSecondary }]}>Price ₱</Text>
                      <TextInput
                        style={[s.unitInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                        placeholder={basePrice || '0.00'}
                        placeholderTextColor={colors.textSecondary}
                        value={unit.price}
                        onChangeText={(v) => updateUnit(unit.id, 'price', v)}
                        keyboardType="decimal-pad"
                      />
                      {fieldError(`unit.${unit.id}.price`)}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.unitLabel, { color: colors.textSecondary }]}>Conv. Factor</Text>
                      <TextInput
                        style={[s.unitInput, { color: colors.text, borderColor: fieldBorder(`unit.${unit.id}.conversionFactor`, colors.border), backgroundColor: colors.background }]}
                        placeholder="1"
                        placeholderTextColor={colors.textSecondary}
                        value={unit.conversionFactor}
                        onChangeText={(v) => updateUnit(unit.id, 'conversionFactor', v)}
                        keyboardType="decimal-pad"
                      />
                      {fieldError(`unit.${unit.id}.conversionFactor`)}
                    </View>
                  </View>

                  {/* Opening Qty + Reorder */}
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.unitLabel, { color: colors.textSecondary }]}>Opening Qty</Text>
                      <TextInput
                        style={[s.unitInput, { color: colors.text, borderColor: fieldBorder(`unit.${unit.id}.quantity`, colors.border), backgroundColor: colors.background }]}
                        placeholder="0"
                        placeholderTextColor={colors.textSecondary}
                        value={unit.quantity}
                        onChangeText={(v) => updateUnit(unit.id, 'quantity', v)}
                        keyboardType="decimal-pad"
                      />
                      {fieldError(`unit.${unit.id}.quantity`)}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.unitLabel, { color: colors.textSecondary }]}>Reorder At</Text>
                      <TextInput
                        style={[s.unitInput, { color: colors.text, borderColor: fieldBorder(`unit.${unit.id}.reorderPoint`, colors.border), backgroundColor: colors.background }]}
                        placeholder="10"
                        placeholderTextColor={colors.textSecondary}
                        value={unit.reorderPoint}
                        onChangeText={(v) => updateUnit(unit.id, 'reorderPoint', v)}
                        keyboardType="decimal-pad"
                      />
                      {fieldError(`unit.${unit.id}.reorderPoint`)}
                    </View>
                  </View>

                  {/* Barcode */}
                  <Text style={[s.unitLabel, { color: colors.textSecondary }]}>Barcode (optional)</Text>
                  <TextInput
                    style={[s.unitInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                    placeholder="Scan or type barcode"
                    placeholderTextColor={colors.textSecondary}
                    value={unit.barcode}
                    onChangeText={(v) => updateUnit(unit.id, 'barcode', v)}
                  />
                </View>
              ))}

              {/* ── Price preview ── */}
              {basePrice && units[0]?.price && (
                <View style={[s.preview, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[s.previewTitle, { color: colors.textSecondary }]}>PRICE PREVIEW</Text>
                  {units.filter((u) => u.price).map((u) => (
                    <View key={u.id} style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                      <Text style={{ fontSize: 13, color: colors.text }}>{u.unitLabel || u.unitName || 'Unit'}</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.accent }}>
                        ₱{parseFloat(u.price || '0').toLocaleString()}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {/* ── Error / Success / Save ── */}
              {error ? <Text style={[s.errTxt, { color: colors.error }]}>{error}</Text> : null}
              {success ? (
                <View style={[s.successBanner, { backgroundColor: colors.success + '18' }]}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: colors.success }}>
                    ✓ Item {isEditMode ? 'updated' : 'added'} successfully!
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={[s.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]}
                  onPress={handleSave}
                  disabled={saving || success}
                  activeOpacity={0.85}
                >
                  <Text style={s.saveTxt}>
                    {saving
                      ? isEditMode ? 'Saving…' : 'Adding…'
                      : isEditMode ? 'Save Changes' : 'Add to Outlet Inventory'}
                  </Text>
                </TouchableOpacity>
              )}
              <View style={{ height: 40 }} />

            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </View>

      {/* Sub-modals rendered outside the card so they can cover full screen */}
      <CatalogSearchModal
        visible={catalogOpen}
        onClose={() => setCatalogOpen(false)}
        onSelect={(item) => {
          setSelectedItem(item);
          clearFieldError('item');
          if (!basePrice) setBasePrice('');
        }}
        colors={colors}
      />
      <GlobalCategoryPickerModal
        visible={categoryPickerVisible}
        onClose={() => setCategoryPickerVisible(false)}
        onSelect={(id, name) => {
          setSelectedCategoryId(id);
          setSelectedCategoryName(name);
        }}
        colors={colors}
        selectedId={selectedCategoryId}
      />
    </Modal>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 640,
    maxHeight: '92%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { fontSize: 17, fontWeight: '800' },
  subtitle: { fontSize: 12, marginTop: 1 },
  body: { padding: 16, paddingBottom: 40 },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    marginBottom: 14,
  },
  itemPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  infoCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    marginBottom: 12,
  },
  infoCardTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  infoCardLabel: { fontSize: 12 },
  infoCardValue: { fontSize: 12, fontWeight: '600' },
  switch: { width: 44, height: 24, borderRadius: 12, padding: 2 },
  switchThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
  itemPickerName: { fontSize: 14, fontWeight: '700' },
  itemPickerMeta: { fontSize: 11, marginTop: 2 },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  hint: { fontSize: 12, lineHeight: 17, marginBottom: 12 },
  addUnitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  addUnitTxt: { fontSize: 12, fontWeight: '700' },
  unitCard: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 12 },
  unitLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 5,
    marginTop: 10,
  },
  unitInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
  },
  preview: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 14 },
  previewTitle: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  errTxt: { fontSize: 12, marginBottom: 8 },
  fieldErrTxt: { fontSize: 11, fontWeight: '600', marginTop: -8, marginBottom: 10 },
  successBanner: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  saveBtn: { borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  saveTxt: { fontSize: 15, fontWeight: '800', color: '#fff' },
});