// screens/(admin)/add-inventory-item.tsx
// Search item catalog → configure price, qty, units → add to outlet inventory

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  ArrowLeft,
  Search,
  Plus,
  Trash2,
  X,
  Info,
} from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { InventoryService } from '@/services/inventoryService';

import { GlobalCategoryPickerModal } from '@/components/GlobalCategoryPickerModal';
import { CatalogItem, UnitLine } from '@/types';
import { CatalogSearchModal } from '@/components/CatalogSearchModal';
// ─── Types ─────────────────────────────────────────────────────────────────────



// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function AddInventoryItemScreen() {
  const { outletId, outletName, branchName, branchId, inventoryItemId } =
    useLocalSearchParams<{
      outletId: string;
      outletName: string;
      branchName: string;
      branchId: string;
      inventoryItemId?: string;
    }>();

  const isEditMode = !!inventoryItemId;

  useEffect(() => {
    if (!inventoryItemId) return;
    InventoryService.getInventoryItemById(Number(inventoryItemId)).then(
      (data) => {
        if (!data) return;

        // Prefill item
        setSelectedItem({
          id: data.item.id.toString(),
          name: data.item.name,
          barcode: data.item.barcode,
          brand: data.item.brand,
          sellingPrice: data.item.sellingPrice?.toString() ?? '',
          stock: data.item.stock,
          costLines: data.item.costLines ?? [],
        });

        // Prefill base fields
        setBasePrice(data.price.toString());
        setBaseQty(data.quantity.toString());

        // Prefill category
        if (data.category) {
          setSelectedCategoryId(data.category.id);
          setSelectedCategoryName(data.category.name);
        }

        // Prefill units
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
      },
    );
  }, [inventoryItemId]);
  const { colors } = useTheme();

  const [catalogOpen, setCatalogOpen] = useState(false);

  const [tooltipVisible, setTooltipVisible] = useState<string | null>(null);
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    null,
  );
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

  const updateUnit = (
    id: string,
    field: keyof UnitLine,
    value: string | boolean,
  ) => {
    setUnits((prev) =>
      prev.map((u) => (u.id === id ? { ...u, [field]: value } : u)),
    );
  };

  const removeUnit = (id: string) =>
    setUnits((prev) => prev.filter((u) => u.id !== id));

  const setDefaultUnit = (id: string) =>
    setUnits((prev) => prev.map((u) => ({ ...u, isDefault: u.id === id })));
  const resetForm = () => {
    setSelectedItem(null);
    setSelectedCategoryId(null);
    setDisplayToKompraph(false);
    setBasePrice('');
    setBaseQty('0');
    setOpExPct('10');
    setUnits([
      {
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
      },
    ]);
    setError('');
    setSuccess(false);
  };
  const handleSave = async () => {
    if (!selectedItem) {
      setError('Please select an item from the catalog.');
      return;
    }
    if (!basePrice.trim()) {
      setError('Base price is required.');
      return;
    }
    if (units.some((u) => !u.unitName.trim())) {
      setError('All unit names are required.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        itemId: Number(selectedItem.id),
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
        await InventoryService.updateOutletItem(
          Number(inventoryItemId),
          updatePayload,
        );
      } else {
        await InventoryService.addItemToOutletWithUnits(
          Number(outletId),
          payload,
        );
      }
      setSuccess(true);
      setTimeout(() => {
        resetForm();
        router.push({
          pathname: '/(erp)/outlet-detail',
          params: {
            outletId,
            outletName,
            branchName,
            branchId,
          },
        });
      }, 1500);
    } catch (error: any) {
      setError(error.message || 'Failed to add item. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const fieldLabel = (txt: string) => (
    <Text style={[ais.label, { color: colors.textSecondary }]}>{txt}</Text>
  );

  return (
    <SafeAreaView
      style={[ais.container, { backgroundColor: colors.background }]}
    >
      {/* Header */}
      <View
        style={[
          ais.header,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity
          style={[ais.backBtn, { backgroundColor: colors.card }]}
          onPress={() =>
            router.push({
              pathname: '/(erp)/outlet-detail',
              params: {
                outletId,
                outletName,
                branchName,
                branchId,
              },
            })
          } // when pressed back to outlet-detail to which outlet this tab was pressed. with the outletId
        >
          <ArrowLeft size={22} color={colors.text} strokeWidth={2} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[ais.title, { color: colors.text }]}>
            {isEditMode ? 'Edit Inventory Item' : 'Add Inventory Item'}
          </Text>
          <Text style={[ais.subtitle, { color: colors.textSecondary }]}>
            {outletName}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={ais.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Item picker */}
          {fieldLabel('ITEM FROM CATALOG *')}
          <TouchableOpacity
            style={[
              ais.itemPicker,
              {
                backgroundColor: colors.card,
                borderColor: selectedItem ? colors.primary : colors.border,
              },
            ]}
            onPress={() => setCatalogOpen(true)}
            activeOpacity={0.82}
          >
            {selectedItem ? (
              <View style={{ flex: 1 }}>
                <Text style={[ais.itemPickerName, { color: colors.text }]}>
                  {selectedItem.name}
                </Text>
                <Text
                  style={[ais.itemPickerMeta, { color: colors.textSecondary }]}
                >
                  {selectedItem.brand ? `${selectedItem.brand} · ` : ''}
                  {selectedItem.barcode}
                </Text>
              </View>
            ) : (
              <View
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Search
                  size={16}
                  color={colors.textSecondary}
                  strokeWidth={2}
                />
                <Text style={{ fontSize: 14, color: colors.textSecondary }}>
                  Search item catalog…
                </Text>
              </View>
            )}
            {selectedItem ? (
              <TouchableOpacity onPress={() => setSelectedItem(null)}>
                <X size={16} color={colors.error} strokeWidth={2} />
              </TouchableOpacity>
            ) : (
              <Text style={{ color: colors.textSecondary }}>›</Text>
            )}
          </TouchableOpacity>
          {/* Item Info Card */}
          {selectedItem && (
            <View
              style={[
                ais.infoCard,
                {
                  backgroundColor:
                    parseFloat(basePrice || '0') >=
                    parseFloat(selectedItem.sellingPrice || '0')
                      ? colors.success + '20'
                      : colors.error + '20',
                  borderColor:
                    parseFloat(basePrice || '0') >=
                    parseFloat(selectedItem.sellingPrice || '0')
                      ? colors.success
                      : colors.error,
                },
              ]}
            >
              <Text style={[ais.infoCardTitle, { color: colors.text }]}>
                Item Details
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                }}
              >
                <Text
                  style={[ais.infoCardLabel, { color: colors.textSecondary }]}
                >
                  Selling Price:
                </Text>
                <Text style={[ais.infoCardValue, { color: colors.text }]}>
                  ₱{parseFloat(selectedItem.sellingPrice || '0').toFixed(2)}
                </Text>
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                }}
              >
                <Text
                  style={[ais.infoCardLabel, { color: colors.textSecondary }]}
                >
                  Available Stock:
                </Text>
                <Text style={[ais.infoCardValue, { color: colors.text }]}>
                  {selectedItem.stock || 0}
                </Text>
              </View>
            </View>
          )}
          {/* Category Search */}
          {fieldLabel('CATEGORY (Global)')}
          <TouchableOpacity
            style={[
              ais.itemPicker,
              {
                backgroundColor: colors.card,
                borderColor: selectedCategoryId
                  ? colors.primary
                  : colors.border,
              },
            ]}
            onPress={() => setCategoryPickerVisible(true)}
            activeOpacity={0.82}
          >
            <View
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Search size={16} color={colors.textSecondary} strokeWidth={2} />
              <Text
                style={{
                  fontSize: 14,
                  color: selectedCategoryName
                    ? colors.text
                    : colors.textSecondary,
                }}
              >
                {selectedCategoryName || 'Select global category…'}
              </Text>
            </View>
            {selectedCategoryId ? (
              <TouchableOpacity
                onPress={() => {
                  setSelectedCategoryId(null);
                  setSelectedCategoryName('');
                }}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <X size={14} color={colors.error} strokeWidth={2} />
              </TouchableOpacity>
            ) : (
              <Text style={{ color: colors.textSecondary }}>›</Text>
            )}
          </TouchableOpacity>
          {/* Display to Kompra.ph Switch */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 16,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={[ais.label, { color: colors.text }]}>
                Display to Kompra.ph
              </Text>
              <Text style={[ais.hint, { color: colors.textSecondary }]}>
                Note: This will need to be approved by the admin.
              </Text>
            </View>
            <TouchableOpacity
              style={[
                ais.switch,
                {
                  backgroundColor: displayToKompraph
                    ? colors.primary
                    : colors.border,
                },
              ]}
              onPress={() => setDisplayToKompraph(!displayToKompraph)}
              activeOpacity={0.8}
            >
              <View
                style={[
                  ais.switchThumb,
                  { transform: [{ translateX: displayToKompraph ? 20 : 0 }] },
                ]}
              />
            </TouchableOpacity>
          </View>
          {/* Base price + qty */}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              {fieldLabel('BASE PRICE ₱ *')}
              <TextInput
                style={[
                  ais.input,
                  {
                    color: colors.text,
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="0.00"
                placeholderTextColor={colors.textSecondary}
                value={basePrice}
                onChangeText={setBasePrice}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={{ flex: 1 }}>
              {fieldLabel('OPENING QTY')}
              <TextInput
                style={[
                  ais.input,
                  {
                    color: colors.text,
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
                value={baseQty}
                onChangeText={(text) => {
                  const num = parseInt(text) || 0;
                  const maxStock = selectedItem?.stock || 0;
                  if (num <= maxStock) {
                    setBaseQty(text);
                  } else {
                    setBaseQty(maxStock.toString());
                  }
                }}
                keyboardType="number-pad"
              />
            </View>
          </View>
          {fieldLabel('OPEX CONTRIBUTION %')}
          <TextInput
            style={[
              ais.input,
              {
                color: colors.text,
                backgroundColor: colors.background,
                borderColor: colors.border,
                width: '40%',
              },
            ]}
            placeholder="10"
            placeholderTextColor={colors.textSecondary}
            value={opExPct}
            onChangeText={setOpExPct}
            keyboardType="decimal-pad"
          />
          {/* Units section */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 8,
              marginBottom: 10,
            }}
          >
            <Text style={[ais.sectionTitle, { color: colors.text }]}>
              Selling Units
            </Text>
            <TouchableOpacity
              style={[
                ais.addUnitBtn,
                {
                  backgroundColor: colors.primary + '18',
                  borderColor: colors.primary,
                },
              ]}
              onPress={addUnit}
            >
              <Plus size={13} color={colors.primary} strokeWidth={2.5} />
              <Text style={[ais.addUnitTxt, { color: colors.primary }]}>
                Add Unit
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={[ais.hint, { color: colors.textSecondary }]}>
            Define how this item is sold — by piece, box, pack, etc. Each unit
            has its own price and quantity tracking.
          </Text>
          {units.map((unit, idx) => (
            <View
              key={unit.id}
              style={[
                ais.unitCard,
                {
                  backgroundColor: colors.card,
                  borderColor: unit.isDefault ? colors.primary : colors.border,
                },
              ]}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 10,
                }}
              >
                <View
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '700',
                      color: colors.textSecondary,
                    }}
                  >
                    Unit {idx + 1}
                  </Text>
                  {unit.isDefault && (
                    <View
                      style={{
                        backgroundColor: colors.primary,
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 10,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: '700',
                          color: '#fff',
                        }}
                      >
                        DEFAULT
                      </Text>
                    </View>
                  )}
                  {/** I want to add the allowDecimal checkbox place it to the right and a hint what is this like (!) tooltip */}
                  {/* Right side of unit header — allowDecimal toggle + tooltip */}
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    {/* Tooltip trigger */}
                    <TouchableOpacity
                      onPress={() =>
                        setTooltipVisible(
                          tooltipVisible === unit.id ? null : unit.id,
                        )
                      }
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Info
                        size={14}
                        color={colors.textSecondary}
                        strokeWidth={2}
                      />
                    </TouchableOpacity>

                    {/* Allow Decimal label + checkbox */}
                    <TouchableOpacity
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                      }}
                      onPress={() =>
                        setUnits((prev) =>
                          prev.map((u) =>
                            u.id === unit.id
                              ? { ...u, allowDecimal: !u.allowDecimal }
                              : u,
                          ),
                        )
                      }
                      activeOpacity={0.7}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          color: colors.textSecondary,
                          fontWeight: '500',
                        }}
                      >
                        Decimal qty
                      </Text>
                      {/* Checkbox */}
                      <View
                        style={[
                          {
                            width: 20,
                            height: 20,
                            borderRadius: 5,
                            borderWidth: 1.5,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderColor: unit.allowDecimal
                              ? colors.primary
                              : colors.border,
                            backgroundColor: unit.allowDecimal
                              ? colors.primary
                              : 'transparent',
                          },
                        ]}
                      >
                        {unit.allowDecimal && (
                          <Text
                            style={{
                              color: '#fff',
                              fontSize: 13,
                              fontWeight: '700',
                              lineHeight: 16,
                            }}
                          >
                            ✓
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  </View>

                  {/* Tooltip — renders below the header row */}
                  {tooltipVisible === unit.id && (
                    <View
                      style={[
                        {
                          marginTop: 8,
                          padding: 10,
                          borderRadius: 8,
                          backgroundColor: colors.background,
                          borderWidth: 1,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          color: colors.textSecondary,
                          lineHeight: 18,
                        }}
                      >
                        <Text style={{ fontWeight: '700', color: colors.text }}>
                          Decimal quantity
                        </Text>{' '}
                        allows selling fractional amounts like 1.5 kg or 0.75
                        liters.{'\n'}
                        Enable this for weight-based units (kg, gram, liter).
                        {'\n'}
                        Leave off for countable units (piece, dozen, box).
                      </Text>
                    </View>
                  )}
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {!unit.isDefault && (
                    <TouchableOpacity
                      onPress={() => setDefaultUnit(unit.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          color: colors.primary,
                          fontWeight: '600',
                        }}
                      >
                        Set Default
                      </Text>
                    </TouchableOpacity>
                  )}
                  {units.length > 1 && (
                    <TouchableOpacity
                      onPress={() => removeUnit(unit.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Trash2 size={15} color={colors.error} strokeWidth={2} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[ais.unitLabel, { color: colors.textSecondary }]}
                  >
                    Unit Name
                  </Text>
                  <TextInput
                    style={[
                      ais.unitInput,
                      {
                        color: colors.text,
                        borderColor: colors.border,
                        backgroundColor: colors.background,
                      },
                    ]}
                    placeholder="piece / box / pack"
                    placeholderTextColor={colors.textSecondary}
                    value={unit.unitName}
                    onChangeText={(v) => updateUnit(unit.id, 'unitName', v)}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[ais.unitLabel, { color: colors.textSecondary }]}
                  >
                    Display Label
                  </Text>
                  <TextInput
                    style={[
                      ais.unitInput,
                      {
                        color: colors.text,
                        borderColor: colors.border,
                        backgroundColor: colors.background,
                      },
                    ]}
                    placeholder="e.g. Box of 12"
                    placeholderTextColor={colors.textSecondary}
                    value={unit.unitLabel}
                    onChangeText={(v) => updateUnit(unit.id, 'unitLabel', v)}
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[ais.unitLabel, { color: colors.textSecondary }]}
                  >
                    Price ₱
                  </Text>
                  <TextInput
                    style={[
                      ais.unitInput,
                      {
                        color: colors.text,
                        borderColor: colors.border,
                        backgroundColor: colors.background,
                      },
                    ]}
                    placeholder={basePrice || '0.00'}
                    placeholderTextColor={colors.textSecondary}
                    value={unit.price}
                    onChangeText={(v) => updateUnit(unit.id, 'price', v)}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[ais.unitLabel, { color: colors.textSecondary }]}
                  >
                    Conv. Factor
                  </Text>
                  <TextInput
                    style={[
                      ais.unitInput,
                      {
                        color: colors.text,
                        borderColor: colors.border,
                        backgroundColor: colors.background,
                      },
                    ]}
                    placeholder="1"
                    placeholderTextColor={colors.textSecondary}
                    value={unit.conversionFactor}
                    onChangeText={(v) =>
                      updateUnit(unit.id, 'conversionFactor', v)
                    }
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[ais.unitLabel, { color: colors.textSecondary }]}
                  >
                    Opening Qty
                  </Text>
                  <TextInput
                    style={[
                      ais.unitInput,
                      {
                        color: colors.text,
                        borderColor: colors.border,
                        backgroundColor: colors.background,
                      },
                    ]}
                    placeholder="0"
                    placeholderTextColor={colors.textSecondary}
                    value={unit.quantity}
                    onChangeText={(v) => updateUnit(unit.id, 'quantity', v)}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[ais.unitLabel, { color: colors.textSecondary }]}
                  >
                    Reorder At
                  </Text>
                  <TextInput
                    style={[
                      ais.unitInput,
                      {
                        color: colors.text,
                        borderColor: colors.border,
                        backgroundColor: colors.background,
                      },
                    ]}
                    placeholder="10"
                    placeholderTextColor={colors.textSecondary}
                    value={unit.reorderPoint}
                    onChangeText={(v) => updateUnit(unit.id, 'reorderPoint', v)}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <Text style={[ais.unitLabel, { color: colors.textSecondary }]}>
                Barcode (optional)
              </Text>
              <TextInput
                style={[
                  ais.unitInput,
                  {
                    color: colors.text,
                    borderColor: colors.border,
                    backgroundColor: colors.background,
                  },
                ]}
                placeholder="Scan or type barcode"
                placeholderTextColor={colors.textSecondary}
                value={unit.barcode}
                onChangeText={(v) => updateUnit(unit.id, 'barcode', v)}
              />
            </View>
          ))}
          {/* Live profit preview */}
          {basePrice && units[0]?.price && (
            <View
              style={[
                ais.preview,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={[ais.previewTitle, { color: colors.textSecondary }]}>
                PRICE PREVIEW
              </Text>
              {units
                .filter((u) => u.price)
                .map((u) => (
                  <View
                    key={u.id}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      marginTop: 6,
                    }}
                  >
                    <Text style={{ fontSize: 13, color: colors.text }}>
                      {u.unitLabel || u.unitName || 'Unit'}
                    </Text>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '700',
                        color: colors.accent,
                      }}
                    >
                      ₱{parseFloat(u.price || '0').toLocaleString()}
                    </Text>
                  </View>
                ))}
            </View>
          )}
          {error ? (
            <Text style={[ais.errTxt, { color: colors.error }]}>{error}</Text>
          ) : null}
          {success ? (
            <View
              style={[
                ais.successBanner,
                { backgroundColor: colors.success + '18' },
              ]}
            >
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: '700',
                  color: colors.success,
                }}
              >
                ✓ Item added successfully!
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[
                ais.saveBtn,
                { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 },
              ]}
              onPress={handleSave}
              disabled={saving || success}
              activeOpacity={0.85}
            >
              <Text style={ais.saveTxt}>
                {saving
                  ? isEditMode
                    ? 'Saving…'
                    : 'Adding…'
                  : isEditMode
                    ? 'Save Changes'
                    : 'Add to Outlet Inventory'}
              </Text>
            </TouchableOpacity>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <CatalogSearchModal
        visible={catalogOpen}
        onClose={() => setCatalogOpen(false)}
        onSelect={(item) => {
          setSelectedItem(item);
          if (!basePrice) setBasePrice('');
        }}
        colors={colors}
      />

      <GlobalCategoryPickerModal
        visible={categoryPickerVisible}
        onClose={() => setCategoryPickerVisible(false)}
        onSelect={(category) => setSelectedCategoryId(category)}
        colors={colors}
        selectedId={null}
      />
    </SafeAreaView>
  );
}

const ais = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { fontSize: 18, fontWeight: '800' },
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
  switch: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
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
  successBanner: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  saveBtn: { borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  saveTxt: { fontSize: 15, fontWeight: '800', color: '#fff' },
});
