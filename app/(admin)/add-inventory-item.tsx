// screens/(admin)/add-inventory-item.tsx
// Search item catalog → configure price, qty, units → add to outlet inventory

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  ArrowLeft,
  Search,
  Package,
  Plus,
  Trash2,
  X,
} from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface CatalogItem {
  id: string;
  name: string;
  barcode: string;
  brand?: string;
  category?: string;
  image?: string;
}

interface UnitLine {
  id: string;
  unitName: string; // e.g. "box", "piece", "pack"
  unitLabel: string; // display label e.g. "Box of 12"
  price: string;
  quantity: string;
  conversionFactor: string; // how many base units in this unit
  barcode: string;
  isDefault: boolean;
  reorderPoint: string;
}

// ─── Mock catalog search ───────────────────────────────────────────────────────

const MOCK_CATALOG: CatalogItem[] = [
  {
    id: 'i1',
    name: 'Ganador Rice 25kg',
    barcode: '4800045678901',
    brand: 'Ganador',
    category: 'Rice',
  },
  {
    id: 'i2',
    name: 'Century Tuna Flakes',
    barcode: '4800012345678',
    brand: 'Century',
    category: 'Canned',
  },
  {
    id: 'i3',
    name: 'Nescafe 3in1 100s',
    barcode: '4800087654321',
    brand: 'Nestle',
    category: 'Beverages',
  },
  {
    id: 'i4',
    name: 'Tide Powder 1kg',
    barcode: '4800011223344',
    brand: 'P&G',
    category: 'Household',
  },
  {
    id: 'i5',
    name: 'Chippy BBQ 22g',
    barcode: '4800099887766',
    brand: 'Jack & Jill',
    category: 'Snacks',
  },
  {
    id: 'i6',
    name: 'Bear Brand 300g',
    barcode: '4800055443322',
    brand: 'Nestle',
    category: 'Dairy',
  },
  {
    id: 'i7',
    name: 'Sprite 1.5L',
    barcode: '4800024681357',
    brand: 'Coca-Cola',
    category: 'Beverages',
  },
  {
    id: 'i8',
    name: 'Lucky Me Pancit Canton',
    barcode: '4800077665544',
    brand: 'Monde',
    category: 'Noodles',
  },
];

async function searchCatalog(q: string): Promise<CatalogItem[]> {
  return new Promise((resolve) =>
    setTimeout(() => {
      const query = q.toLowerCase();
      resolve(
        MOCK_CATALOG.filter(
          (i) =>
            i.name.toLowerCase().includes(query) ||
            i.barcode.includes(query) ||
            (i.brand ?? '').toLowerCase().includes(query) ||
            (i.category ?? '').toLowerCase().includes(query),
        ),
      );
    }, 800),
  );
}

// ─── Catalog Search Modal ──────────────────────────────────────────────────────

function CatalogSearchModal({
  visible,
  onClose,
  onSelect,
  colors,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (item: CatalogItem) => void;
  colors: any;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Show full catalog on open — no need to search for the first load
  React.useEffect(() => {
    if (visible && !hasSearched) {
      setResults(MOCK_CATALOG);
    }
    if (!visible) {
      // Reset when closed so next open shows full list again
      setQuery('');
      setResults([]);
      setHasSearched(false);
    }
  }, [visible]);

  const doSearch = async () => {
    const q = query.trim();
    setLoading(true);
    setHasSearched(true);
    const res = await searchCatalog(q || ''); // empty string returns all
    setResults(res);
    setLoading(false);
  };

  const handleClear = () => {
    setQuery('');
    setResults(MOCK_CATALOG);
    setHasSearched(false);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'flex-end',
        }}
      >
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={[csm.sheet, { backgroundColor: colors.surface }]}>
          <View style={[csm.handle, { backgroundColor: colors.border }]} />
          <View style={[csm.header, { borderBottomColor: colors.border }]}>
            <Text style={[csm.title, { color: colors.text }]}>
              Search Item Catalog
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={20} color={colors.textSecondary} strokeWidth={2} />
            </TouchableOpacity>
          </View>
          {/* Search row */}
          <View style={[csm.searchRow, { borderBottomColor: colors.border }]}>
            <View
              style={[
                csm.searchBox,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                },
              ]}
            >
              <Search size={13} color={colors.textSecondary} strokeWidth={2} />
              <TextInput
                style={[csm.searchInput, { color: colors.text }]}
                placeholder="Search by name, barcode, brand…"
                placeholderTextColor={colors.textSecondary}
                value={query}
                onChangeText={setQuery}
                returnKeyType="search"
                onSubmitEditing={doSearch}
                autoCorrect={false}
              />
              {query.length > 0 && (
                <TouchableOpacity
                  onPress={handleClear}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <X size={13} color={colors.textSecondary} strokeWidth={2} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={[
                csm.searchBtn,
                { backgroundColor: loading ? colors.border : colors.primary },
              ]}
              onPress={doSearch}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Search size={13} color="#fff" strokeWidth={2.5} />
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff' }}>
                {loading ? '…' : 'Search'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Loading state — shown above FlatList so it's always visible */}
          {loading && (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                Searching catalog…
              </Text>
            </View>
          )}

          {!loading && (
            <FlatList
              data={results}
              keyExtractor={(i) => i.id}
              style={{ maxHeight: 320 }}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <View style={{ padding: 28, alignItems: 'center' }}>
                  <Package size={32} color={colors.border} strokeWidth={1.5} />
                  <Text
                    style={{
                      fontSize: 13,
                      color: colors.textSecondary,
                      marginTop: 10,
                    }}
                  >
                    {query
                      ? `No items found for "${query}"`
                      : 'No catalog items available.'}
                  </Text>
                </View>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[csm.resultRow, { borderBottomColor: colors.border }]}
                  onPress={() => {
                    onSelect(item);
                    onClose();
                  }}
                  activeOpacity={0.75}
                >
                  <View
                    style={[
                      csm.icon,
                      { backgroundColor: colors.primary + '18' },
                    ]}
                  >
                    <Package size={16} color={colors.primary} strokeWidth={2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[csm.itemName, { color: colors.text }]}>
                      {item.name}
                    </Text>
                    <Text
                      style={[csm.itemMeta, { color: colors.textSecondary }]}
                    >
                      {item.brand ? `${item.brand} · ` : ''}
                      {item.category} · {item.barcode}
                    </Text>
                  </View>
                  <Text style={[csm.selectTxt, { color: colors.primary }]}>
                    Select
                  </Text>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const csm = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  title: { fontSize: 16, fontWeight: '800' },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderBottomWidth: 1,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  searchInput: { flex: 1, fontSize: 13 },
  searchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    justifyContent: 'center',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemName: { fontSize: 14, fontWeight: '600' },
  itemMeta: { fontSize: 11, marginTop: 2 },
  selectTxt: { fontSize: 13, fontWeight: '700' },
});

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function AddInventoryItemScreen() {
  const { outletId, outletName } = useLocalSearchParams<{
    outletId: string;
    outletName: string;
  }>();
  const { colors } = useTheme();

  const [catalogOpen, setCatalogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
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
      // TODO: AdminService.addItemToOutlet({
      //   outletId, itemId: selectedItem.id,
      //   price: parseFloat(basePrice), quantity: parseInt(baseQty),
      //   units: units.map(u => ({ unitName: u.unitName, unitLabel: u.unitLabel, price: parseFloat(u.price || basePrice), quantity: parseFloat(u.quantity), conversionFactor: parseFloat(u.conversionFactor), isDefault: u.isDefault, barcode: u.barcode || undefined, reorderPoint: parseFloat(u.reorderPoint) }))
      // })
      await new Promise((r) => setTimeout(r, 1000)); // simulate
      setSuccess(true);
      setTimeout(() => router.back(), 1500);
    } catch {
      setError('Failed to add item. Please try again.');
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
          onPress={() => router.back()}
        >
          <ArrowLeft size={22} color={colors.text} strokeWidth={2} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[ais.title, { color: colors.text }]}>
            Add Inventory Item
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
                onChangeText={setBaseQty}
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
                {saving ? 'Adding…' : 'Add to Outlet Inventory'}
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
