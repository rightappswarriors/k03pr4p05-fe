// screens/InventoryScreen.tsx
// Full ERP Inventory Module:
//   - Search by name / SKU
//   - Filter: All / Low Stock / In Stock / by Category
//   - Adjust stock modal
//   - Add new item modal with cost breakdown builder
//   - Item detail modal (mirrors the old ERP item screen — but readable)

import React, { useMemo, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Filter,
  Minus,
  Package,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { inventoryItems as INITIAL_ITEMS } from '@/data/erpMockData';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CostLine {
  id: string;
  label: string; // e.g. "Purchase Cost", "Freight", "Packaging"
  amount: number;
}

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  stock: number;
  minStock: number;
  category: string;
  price: number; // selling price (retail)
  lowStock: boolean;
  // New fields for cost breakdown
  costLines?: CostLine[]; // itemized cost components
  opExPct?: number; // OpEx contribution %
  priceB?: number; // wholesale price
  priceC?: number; // special price
  vatExempt?: boolean;
}

type StockFilter = 'All' | 'Low Stock' | 'In Stock';
type CategoryFilter = 'All' | string;

const CATEGORIES = [
  'All',
  'Rice',
  'Canned',
  'Beverages',
  'Snacks',
  'Dairy',
  'Personal',
];

// ─── Cost Breakdown Builder ───────────────────────────────────────────────────
// This is what Sir Andre described — add multiple cost lines that sum to total
// contribution cost. Each line has a label and amount.

function CostBreakdownBuilder({
  lines,
  onChange,
  colors,
}: {
  lines: CostLine[];
  onChange: (lines: CostLine[]) => void;
  colors: any;
}) {
  const total = lines.reduce((s, l) => s + (l.amount || 0), 0);

  const addLine = () => {
    onChange([...lines, { id: `cl_${Date.now()}`, label: '', amount: 0 }]);
  };

  const updateLine = (id: string, field: 'label' | 'amount', value: string) => {
    onChange(
      lines.map((l) =>
        l.id === id
          ? {
              ...l,
              [field]: field === 'amount' ? parseFloat(value) || 0 : value,
            }
          : l,
      ),
    );
  };

  const removeLine = (id: string) => {
    onChange(lines.filter((l) => l.id !== id));
  };

  const s = StyleSheet.create({
    container: {
      backgroundColor: colors.background,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    line: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    labelInput: {
      flex: 1,
      fontSize: 13,
      color: colors.text,
      paddingVertical: 4,
    },
    amtInput: {
      width: 90,
      fontSize: 13,
      color: colors.text,
      textAlign: 'right',
      paddingVertical: 4,
    },
    addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10 },
    addTxt: { fontSize: 13, color: colors.primary, fontWeight: '600' },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 10,
      backgroundColor: colors.card,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    totalLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    totalAmt: { fontSize: 15, fontWeight: '800', color: colors.primary },
    hint: {
      fontSize: 11,
      color: colors.textSecondary,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
  });

  return (
    <View style={s.container}>
      <Text style={s.hint}>
        Add each cost component. They sum to the Contribution Cost.
      </Text>
      {lines.map((line, idx) => (
        <View key={line.id} style={s.line}>
          <Text
            style={{ fontSize: 12, color: colors.textSecondary, width: 20 }}
          >
            {idx + 1}
          </Text>
          <TextInput
            style={[
              s.labelInput,
              { borderBottomWidth: 1, borderBottomColor: colors.border },
            ]}
            placeholder={
              idx === 0
                ? 'Purchase Cost'
                : idx === 1
                  ? 'Freight / Delivery'
                  : 'Other cost…'
            }
            placeholderTextColor={colors.textSecondary}
            value={line.label}
            onChangeText={(v) => updateLine(line.id, 'label', v)}
          />
          <Text style={{ fontSize: 13, color: colors.textSecondary }}>₱</Text>
          <TextInput
            style={[
              s.amtInput,
              { borderBottomWidth: 1, borderBottomColor: colors.border },
            ]}
            placeholder="0.00"
            placeholderTextColor={colors.textSecondary}
            value={line.amount > 0 ? String(line.amount) : ''}
            onChangeText={(v) => updateLine(line.id, 'amount', v)}
            keyboardType="decimal-pad"
          />
          <TouchableOpacity
            onPress={() => removeLine(line.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Trash2 size={14} color={colors.error} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      ))}
      <TouchableOpacity style={s.addBtn} onPress={addLine}>
        <Plus size={14} color={colors.primary} strokeWidth={2.5} />
        <Text style={s.addTxt}>Add cost component</Text>
      </TouchableOpacity>
      {lines.length > 0 && (
        <View style={s.totalRow}>
          <Text style={s.totalLabel}>TOTAL CONTRIBUTION COST</Text>
          <Text style={s.totalAmt}>
            ₱{total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Item Detail Modal ────────────────────────────────────────────────────────

function ItemDetailModal({
  item,
  visible,
  onClose,
  onAdjustStock,
  colors,
}: {
  item: InventoryItem | null;
  visible: boolean;
  onClose: () => void;
  onAdjustStock: (id: string, delta: number) => void;
  colors: any;
}) {
  if (!item) return null;
  const [qty, setQty] = useState(0);
  const maxStock = Math.max(item.stock, item.minStock * 4, 200);
  const ratio = Math.min(item.stock / maxStock, 1);
  const barColor = item.lowStock ? colors.error : colors.success;

  const totalCost = item.costLines
    ? item.costLines.reduce((s, l) => s + l.amount, 0)
    : 0;
  const profit = item.price - totalCost;
  const margin = item.price > 0 ? (profit / item.price) * 100 : 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {/* Header */}
        <View style={[idm.header, { backgroundColor: colors.primary }]}>
          <View style={{ flex: 1 }}>
            <Text style={idm.sku}>{item.sku}</Text>
            <Text style={idm.name}>{item.name}</Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                marginTop: 4,
              }}
            >
              <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
                {item.category}
              </Text>
              {item.vatExempt && (
                <View
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    borderRadius: 4,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                  }}
                >
                  <Text
                    style={{ fontSize: 10, color: '#fff', fontWeight: '700' }}
                  >
                    VAT EXEMPT
                  </Text>
                </View>
              )}
            </View>
          </View>
          <TouchableOpacity style={idm.closeBtn} onPress={onClose}>
            <X size={16} color="#fff" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Stock level */}
          <View
            style={[
              idm.section,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[idm.sectionTitle, { color: colors.textSecondary }]}>
              STOCK LEVEL
            </Text>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingHorizontal: 14,
                paddingBottom: 8,
              }}
            >
              <View>
                <Text
                  style={{
                    fontSize: 36,
                    fontWeight: '900',
                    color: item.lowStock ? colors.error : colors.text,
                  }}
                >
                  {item.stock}
                </Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                  units on hand
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                  Min:{' '}
                  <Text style={{ fontWeight: '700', color: colors.text }}>
                    {item.minStock}
                  </Text>
                </Text>
                {item.lowStock && (
                  <View
                    style={{
                      backgroundColor: colors.error + '20',
                      borderRadius: 6,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      marginTop: 4,
                      borderWidth: 1,
                      borderColor: colors.error,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '700',
                        color: colors.error,
                      }}
                    >
                      ⚠ Reorder Now
                    </Text>
                  </View>
                )}
              </View>
            </View>
            <View
              style={{
                height: 6,
                borderRadius: 3,
                backgroundColor: colors.border,
                marginHorizontal: 14,
                marginBottom: 14,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  height: '100%',
                  width: `${ratio * 100}%`,
                  backgroundColor: barColor,
                  borderRadius: 3,
                }}
              />
            </View>

            {/* Quick adjust */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 14,
                paddingBottom: 14,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  color: colors.textSecondary,
                  fontWeight: '600',
                }}
              >
                Quick Adjust
              </Text>
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
              >
                <TouchableOpacity
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    backgroundColor: colors.error + '20',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: colors.error,
                  }}
                  onPress={() => setQty((q) => Math.max(0, q - 1))}
                >
                  <Minus size={16} color={colors.error} strokeWidth={2.5} />
                </TouchableOpacity>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: '800',
                    color: colors.text,
                    minWidth: 32,
                    textAlign: 'center',
                  }}
                >
                  {qty}
                </Text>
                <TouchableOpacity
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    backgroundColor: colors.success + '20',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: colors.success,
                  }}
                  onPress={() => setQty((q) => q + 1)}
                >
                  <Plus size={16} color={colors.success} strokeWidth={2.5} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 8,
                    backgroundColor: qty !== 0 ? colors.primary : colors.border,
                  }}
                  disabled={qty === 0}
                  onPress={() => {
                    if (qty !== 0) {
                      onAdjustStock(item.id, qty);
                      setQty(0);
                      onClose();
                    }
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '700',
                      color: qty !== 0 ? '#fff' : colors.textSecondary,
                    }}
                  >
                    {qty > 0
                      ? `+${qty} Add`
                      : qty < 0
                        ? `${qty} Remove`
                        : 'Apply'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Pricing */}
          <View
            style={[
              idm.section,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                marginTop: 12,
              },
            ]}
          >
            <Text style={[idm.sectionTitle, { color: colors.textSecondary }]}>
              PRICING
            </Text>
            {[
              ['Price A (Retail)', item.price, colors.accent],
              [
                'Price B (Wholesale)',
                item.priceB ?? item.price * 0.9,
                colors.primary,
              ],
              [
                'Price C (Special)',
                item.priceC ?? item.price * 0.85,
                colors.success,
              ],
            ].map(([label, val, color]) => (
              <View
                key={label as string}
                style={[idm.detailRow, { borderBottomColor: colors.border }]}
              >
                <Text
                  style={[idm.detailLabel, { color: colors.textSecondary }]}
                >
                  {label as string}
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '700',
                    color: color as string,
                  }}
                >
                  ₱
                  {(val as number).toLocaleString('en-PH', {
                    minimumFractionDigits: 2,
                  })}
                </Text>
              </View>
            ))}
          </View>

          {/* Cost breakdown */}
          {item.costLines && item.costLines.length > 0 && (
            <View
              style={[
                idm.section,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  marginTop: 12,
                },
              ]}
            >
              <Text style={[idm.sectionTitle, { color: colors.textSecondary }]}>
                COST BREAKDOWN
              </Text>
              {item.costLines.map((line) => (
                <View
                  key={line.id}
                  style={[idm.detailRow, { borderBottomColor: colors.border }]}
                >
                  <Text
                    style={[idm.detailLabel, { color: colors.textSecondary }]}
                  >
                    {line.label || 'Cost'}
                  </Text>
                  <Text style={[idm.detailValue, { color: colors.text }]}>
                    ₱
                    {line.amount.toLocaleString('en-PH', {
                      minimumFractionDigits: 2,
                    })}
                  </Text>
                </View>
              ))}
              <View
                style={[
                  idm.detailRow,
                  {
                    borderBottomColor: colors.border,
                    backgroundColor: colors.background,
                  },
                ]}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '700',
                    color: colors.text,
                  }}
                >
                  Total Contribution Cost
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '800',
                    color: colors.primary,
                  }}
                >
                  ₱
                  {totalCost.toLocaleString('en-PH', {
                    minimumFractionDigits: 2,
                  })}
                </Text>
              </View>
              <View
                style={[idm.detailRow, { borderBottomColor: 'transparent' }]}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '700',
                    color: colors.text,
                  }}
                >
                  Gross Profit
                </Text>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: '800',
                      color: profit >= 0 ? colors.success : colors.error,
                    }}
                  >
                    ₱
                    {profit.toLocaleString('en-PH', {
                      minimumFractionDigits: 2,
                    })}
                  </Text>
                  <Text
                    style={{
                      fontSize: 11,
                      color: profit >= 0 ? colors.success : colors.error,
                      fontWeight: '600',
                    }}
                  >
                    {margin.toFixed(1)}% margin
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* OpEx contribution */}
          {item.opExPct !== undefined && (
            <View
              style={[
                idm.section,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  marginTop: 12,
                },
              ]}
            >
              <Text style={[idm.sectionTitle, { color: colors.textSecondary }]}>
                OPEX CONTRIBUTION
              </Text>
              <View
                style={[idm.detailRow, { borderBottomColor: 'transparent' }]}
              >
                <Text
                  style={[idm.detailLabel, { color: colors.textSecondary }]}
                >
                  Contribution %
                </Text>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '800',
                    color: colors.accent,
                  }}
                >
                  {(item.opExPct * 100).toFixed(0)}%
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const idm = StyleSheet.create({
  header: {
    paddingTop: 52,
    paddingBottom: 18,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  sku: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    fontFamily: 'monospace',
    marginBottom: 3,
  },
  name: { fontSize: 18, fontWeight: '700', color: '#fff' },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    padding: 12,
    paddingBottom: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
  },
  detailLabel: { fontSize: 13, fontWeight: '500' },
  detailValue: { fontSize: 13, fontWeight: '600', textAlign: 'right' },
});

// ─── Add Item Modal ───────────────────────────────────────────────────────────

function AddItemModal({
  visible,
  onClose,
  onAdd,
  colors,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (item: InventoryItem) => void;
  colors: any;
}) {
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('Groceries');
  const [stock, setStock] = useState('0');
  const [minStock, setMinStock] = useState('10');
  const [price, setPrice] = useState('');
  const [vatExempt, setVatExempt] = useState(false);
  const [opExPct, setOpExPct] = useState('10');
  const [costLines, setCostLines] = useState<CostLine[]>([
    { id: 'cl_purchase', label: 'Purchase Cost', amount: 0 },
  ]);
  const [error, setError] = useState('');

  const totalCost = costLines.reduce((s, l) => s + l.amount, 0);

  const handleAdd = () => {
    if (!name.trim()) {
      setError('Item name is required.');
      return;
    }
    if (!price.trim()) {
      setError('Selling price is required.');
      return;
    }
    const newItem: InventoryItem = {
      id: `INV${Date.now().toString().slice(-5)}`,
      name: name.trim(),
      sku: sku.trim() || `SKU-${Date.now().toString().slice(-6)}`,
      stock: parseInt(stock) || 0,
      minStock: parseInt(minStock) || 10,
      category,
      price: parseFloat(price) || 0,
      lowStock: parseInt(stock) < parseInt(minStock),
      costLines,
      opExPct: parseFloat(opExPct) / 100 || 0.1,
      vatExempt,
    };
    onAdd(newItem);
    setName('');
    setSku('');
    setStock('0');
    setMinStock('10');
    setPrice('');
    setCostLines([{ id: 'cl_purchase', label: 'Purchase Cost', amount: 0 }]);
    setError('');
    onClose();
  };

  const s = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: 32,
      maxHeight: '94%',
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
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
      borderBottomColor: colors.border,
    },
    title: { fontSize: 16, fontWeight: '800', color: colors.text },
    label: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSecondary,
      letterSpacing: 0.8,
      marginBottom: 6,
      marginTop: 14,
    },
    input: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 11,
      fontSize: 14,
      color: colors.text,
    },
    row2: { flexDirection: 'row', gap: 10 },
    catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    catPill: {
      paddingHorizontal: 11,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    catAct: { borderColor: colors.primary, backgroundColor: colors.primary },
    vatRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.background,
      borderRadius: 10,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    addBtn: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 15,
      alignItems: 'center',
      marginTop: 20,
    },
    addTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
    errTxt: { fontSize: 12, color: colors.error, marginTop: 6 },
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={s.overlay}>
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={s.sheet}>
          <View style={s.handle} />
          <View style={s.header}>
            <Text style={s.title}>Add New Item</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={20} color={colors.textSecondary} strokeWidth={2} />
            </TouchableOpacity>
          </View>
          <ScrollView
            contentContainerStyle={{ padding: 20 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={s.label}>Item Name *</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. Ganador Rice 25kg"
              placeholderTextColor={colors.textSecondary}
              value={name}
              onChangeText={setName}
            />

            <Text style={s.label}>SKU / Item Code</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. RICE-GAN-25"
              placeholderTextColor={colors.textSecondary}
              value={sku}
              onChangeText={setSku}
              autoCapitalize="characters"
            />

            <Text style={s.label}>Category</Text>
            <View style={s.catRow}>
              {CATEGORIES.filter((c) => c !== 'All').map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[s.catPill, category === cat && s.catAct]}
                  onPress={() => setCategory(cat)}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '600',
                      color: category === cat ? '#fff' : colors.text,
                    }}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={s.row2}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Opening Stock</Text>
                <TextInput
                  style={s.input}
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                  value={stock}
                  onChangeText={setStock}
                  keyboardType="number-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Min / Reorder At</Text>
                <TextInput
                  style={s.input}
                  placeholder="10"
                  placeholderTextColor={colors.textSecondary}
                  value={minStock}
                  onChangeText={setMinStock}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <View style={s.row2}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Selling Price ₱ *</Text>
                <TextInput
                  style={s.input}
                  placeholder="0.00"
                  placeholderTextColor={colors.textSecondary}
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>OpEx Contribution %</Text>
                <TextInput
                  style={s.input}
                  placeholder="10"
                  placeholderTextColor={colors.textSecondary}
                  value={opExPct}
                  onChangeText={setOpExPct}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            {/* VAT toggle */}
            <Text style={s.label}>VAT Status</Text>
            <View style={s.vatRow}>
              <Text
                style={{ fontSize: 13, fontWeight: '600', color: colors.text }}
              >
                {vatExempt ? 'VAT Exempt' : 'VAT Inclusive (12%)'}
              </Text>
              <TouchableOpacity
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderRadius: 8,
                  backgroundColor: vatExempt
                    ? colors.accent + '20'
                    : colors.primary + '20',
                  borderWidth: 1,
                  borderColor: vatExempt ? colors.accent : colors.primary,
                }}
                onPress={() => setVatExempt((v) => !v)}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color: vatExempt ? colors.accent : colors.primary,
                  }}
                >
                  {vatExempt ? 'Exempt' : 'VAT Incl.'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Cost breakdown builder */}
            <Text style={s.label}>Cost Breakdown</Text>
            <Text
              style={{
                fontSize: 11,
                color: colors.textSecondary,
                marginBottom: 8,
              }}
            >
              Break down the contribution cost into components — purchase price,
              freight, handling, etc. These sum to the total contribution cost
              used in Item Net Summary.
            </Text>
            <CostBreakdownBuilder
              lines={costLines}
              onChange={setCostLines}
              colors={colors}
            />

            {/* Profit preview */}
            {price && totalCost > 0 && (
              <View
                style={{
                  backgroundColor: colors.background,
                  borderRadius: 10,
                  padding: 12,
                  marginTop: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ alignItems: 'center' }}>
                  <Text
                    style={{
                      fontSize: 11,
                      color: colors.textSecondary,
                      marginBottom: 2,
                    }}
                  >
                    Sell Price
                  </Text>
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: '800',
                      color: colors.accent,
                    }}
                  >
                    ₱{parseFloat(price).toLocaleString()}
                  </Text>
                </View>
                <Text
                  style={{
                    fontSize: 18,
                    color: colors.textSecondary,
                    alignSelf: 'center',
                  }}
                >
                  −
                </Text>
                <View style={{ alignItems: 'center' }}>
                  <Text
                    style={{
                      fontSize: 11,
                      color: colors.textSecondary,
                      marginBottom: 2,
                    }}
                  >
                    Contrib. Cost
                  </Text>
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: '800',
                      color: colors.error,
                    }}
                  >
                    ₱{totalCost.toLocaleString()}
                  </Text>
                </View>
                <Text
                  style={{
                    fontSize: 18,
                    color: colors.textSecondary,
                    alignSelf: 'center',
                  }}
                >
                  =
                </Text>
                <View style={{ alignItems: 'center' }}>
                  <Text
                    style={{
                      fontSize: 11,
                      color: colors.textSecondary,
                      marginBottom: 2,
                    }}
                  >
                    Gross Profit
                  </Text>
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: '800',
                      color:
                        parseFloat(price) - totalCost >= 0
                          ? colors.success
                          : colors.error,
                    }}
                  >
                    ₱{(parseFloat(price) - totalCost).toLocaleString()}
                  </Text>
                </View>
              </View>
            )}

            {error ? <Text style={s.errTxt}>{error}</Text> : null}

            <TouchableOpacity
              style={s.addBtn}
              onPress={handleAdd}
              activeOpacity={0.85}
            >
              <Text style={s.addTxt}>Add to Inventory</Text>
            </TouchableOpacity>
            <View style={{ height: 8 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function InventoryScreen() {
  const { colors } = useTheme();
  const { width } = Dimensions.get('window');
  const isTablet = width >= 768;

  const [items, setItems] = useState<InventoryItem[]>(
    INITIAL_ITEMS as InventoryItem[],
  );
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<StockFilter>('All');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('All');
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [addVisible, setAddVisible] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q);
      const matchStock =
        stockFilter === 'All' ||
        (stockFilter === 'Low Stock' ? item.lowStock : !item.lowStock);
      const matchCategory =
        categoryFilter === 'All' || item.category === categoryFilter;
      return matchSearch && matchStock && matchCategory;
    });
  }, [items, search, stockFilter, categoryFilter]);

  const lowStockCount = filtered.filter((i) => i.lowStock).length;

  const handleAdjustStock = (id: string, delta: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const newStock = Math.max(0, item.stock + delta);
        return { ...item, stock: newStock, lowStock: newStock < item.minStock };
      }),
    );
  };

  const handleAddItem = (item: InventoryItem) => {
    setItems((prev) => [item, ...prev]);
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { padding: 16, paddingBottom: 0 },
    alertBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.error + '18',
      borderRadius: 10,
      padding: 12,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.error + '44',
    },
    alertText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.error,
      flex: 1,
    },
    toolbar: {
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 16,
      paddingBottom: 10,
      alignItems: 'center',
    },
    searchBox: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.card,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    searchInput: { flex: 1, fontSize: 13, color: colors.text },
    iconBtn: {
      width: 38,
      height: 38,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card,
    },
    addBtn: {
      width: 38,
      height: 38,
      borderRadius: 10,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    filterPanel: {
      marginHorizontal: 16,
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 10,
    },
    filterLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.textSecondary,
      letterSpacing: 0.8,
      marginBottom: 4,
    },
    pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    pill: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pillActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primary,
    },
    pillText: { fontSize: 12, fontWeight: '600', color: colors.text },
    pillTextAct: { color: '#fff' },
    listContent: { padding: 16, paddingTop: 0, gap: 10, paddingBottom: 40 },
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardLow: { borderColor: colors.error, borderWidth: 1.5 },
    topRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 8,
    },
    productName: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
      flex: 1,
      marginRight: 8,
    },
    sku: {
      fontSize: 11,
      color: colors.textSecondary,
      fontFamily: 'monospace',
      letterSpacing: 0.4,
    },
    stockRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    stockLabel: { fontSize: 12, color: colors.textSecondary },
    stockValue: { fontSize: 20, fontWeight: '900' },
    stockBar: {
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      marginTop: 8,
      overflow: 'hidden',
    },
    metaRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
    metaCard: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 10,
      padding: 10,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    metaValue: { fontSize: 18, fontWeight: '800', color: colors.text },
    metaLabel: {
      fontSize: 10,
      color: colors.textSecondary,
      marginTop: 2,
      textAlign: 'center',
    },
    resultCount: {
      fontSize: 11,
      color: colors.textSecondary,
      paddingHorizontal: 16,
      paddingBottom: 6,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {/* Meta cards */}
        <View style={styles.metaRow}>
          <View style={styles.metaCard}>
            <Text style={styles.metaValue}>{filtered.length}</Text>
            <Text style={styles.metaLabel}>Items</Text>
          </View>
          <View style={styles.metaCard}>
            <Text style={[styles.metaValue, { color: colors.error }]}>
              {lowStockCount}
            </Text>
            <Text style={styles.metaLabel}>Low Stock</Text>
          </View>
          <View style={styles.metaCard}>
            <Text style={[styles.metaValue, { color: colors.success }]}>
              {filtered.length - lowStockCount}
            </Text>
            <Text style={styles.metaLabel}>In Stock</Text>
          </View>
          <View style={styles.metaCard}>
            <Text style={[styles.metaValue, { color: colors.accent }]}>
              {
                CATEGORIES.filter((c) => c !== 'All').filter((cat) =>
                  items.some((i) => i.category === cat),
                ).length
              }
            </Text>
            <Text style={styles.metaLabel}>Categories</Text>
          </View>
        </View>

        {/* Alert banner */}
        {lowStockCount > 0 && (
          <View style={styles.alertBanner}>
            <Text style={{ fontSize: 16, marginRight: 8 }}>⚠️</Text>
            <Text style={styles.alertText}>
              {lowStockCount} item{lowStockCount > 1 ? 's' : ''} below reorder
              threshold — restocking required
            </Text>
          </View>
        )}
      </View>

      {/* Toolbar */}
      <View style={styles.toolbar}>
        <View style={styles.searchBox}>
          <Search size={13} color={colors.textSecondary} strokeWidth={2} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, SKU, category…"
            placeholderTextColor={colors.textSecondary}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <X size={13} color={colors.textSecondary} strokeWidth={2} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[
            styles.iconBtn,
            filterOpen && {
              backgroundColor: colors.primary,
              borderColor: colors.primary,
            },
          ]}
          onPress={() => setFilterOpen((v) => !v)}
        >
          <Filter
            size={16}
            color={filterOpen ? '#fff' : colors.textSecondary}
            strokeWidth={2}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setAddVisible(true)}
        >
          <Plus size={18} color="#fff" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {/* Filter panel */}
      {filterOpen && (
        <View style={styles.filterPanel}>
          <View>
            <Text style={styles.filterLabel}>STOCK STATUS</Text>
            <View style={styles.pillRow}>
              {(['All', 'In Stock', 'Low Stock'] as StockFilter[]).map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.pill, stockFilter === s && styles.pillActive]}
                  onPress={() => setStockFilter(s)}
                >
                  <Text
                    style={[
                      styles.pillText,
                      stockFilter === s && styles.pillTextAct,
                    ]}
                  >
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View>
            <Text style={styles.filterLabel}>CATEGORY</Text>
            <View style={styles.pillRow}>
              {CATEGORIES.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.pill,
                    categoryFilter === c && styles.pillActive,
                  ]}
                  onPress={() => setCategoryFilter(c)}
                >
                  <Text
                    style={[
                      styles.pillText,
                      categoryFilter === c && styles.pillTextAct,
                    ]}
                  >
                    {c}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      )}

      <Text style={styles.resultCount}>
        {filtered.length} item{filtered.length !== 1 ? 's' : ''}
        {stockFilter !== 'All' ? ` · ${stockFilter}` : ''}
        {categoryFilter !== 'All' ? ` · ${categoryFilter}` : ''}
      </Text>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          filtered.length === 0 && { flex: 1 },
        ]}
        showsVerticalScrollIndicator={false}
        numColumns={isTablet ? 2 : 1}
        key={isTablet ? 'tablet' : 'mobile'}
        columnWrapperStyle={isTablet ? { gap: 10 } : undefined}
        ListEmptyComponent={
          <View style={{ flex: 1, alignItems: 'center', paddingTop: 60 }}>
            <Package size={48} color={colors.border} strokeWidth={1} />
            <Text
              style={{
                fontSize: 14,
                color: colors.textSecondary,
                marginTop: 12,
              }}
            >
              No items found
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const maxStock = Math.max(item.stock, item.minStock * 4, 200);
          const ratio = Math.min(item.stock / maxStock, 1);
          const barColor = item.lowStock ? colors.error : colors.success;
          const hasCosts = item.costLines && item.costLines.length > 0;
          const totalCost = hasCosts
            ? item.costLines!.reduce((s, l) => s + l.amount, 0)
            : 0;

          return (
            <TouchableOpacity
              style={[
                styles.card,
                item.lowStock && styles.cardLow,
                isTablet && { flex: 1 },
              ]}
              onPress={() => {
                setSelectedItem(item);
                setDetailVisible(true);
              }}
              activeOpacity={0.82}
            >
              <View style={styles.topRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.productName}>{item.name}</Text>
                  <Text style={styles.sku}>{item.sku}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <View
                    style={{
                      backgroundColor: item.lowStock
                        ? colors.error + '20'
                        : colors.success + '20',
                      borderRadius: 20,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderWidth: 1,
                      borderColor: item.lowStock
                        ? colors.error
                        : colors.success,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '700',
                        color: item.lowStock ? colors.error : colors.success,
                      }}
                    >
                      {item.lowStock ? 'Low Stock' : 'In Stock'}
                    </Text>
                  </View>
                  {hasCosts && (
                    <Text style={{ fontSize: 10, color: colors.textSecondary }}>
                      Contrib: ₱{totalCost.toLocaleString()}
                    </Text>
                  )}
                </View>
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <View>
                  <Text style={styles.sku}>{item.category}</Text>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '700',
                      color: colors.accent,
                      marginTop: 2,
                    }}
                  >
                    ₱{item.price.toLocaleString()}{' '}
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '400',
                        color: colors.textSecondary,
                      }}
                    >
                      retail
                    </Text>
                  </Text>
                </View>
                <View style={styles.stockRow}>
                  <Text style={styles.stockLabel}>Units:</Text>
                  <Text
                    style={[
                      styles.stockValue,
                      { color: item.lowStock ? colors.error : colors.text },
                    ]}
                  >
                    {item.stock}
                  </Text>
                </View>
              </View>
              <View style={styles.stockBar}>
                <View
                  style={{
                    height: '100%',
                    width: `${ratio * 100}%`,
                    backgroundColor: barColor,
                    borderRadius: 2,
                  }}
                />
              </View>
            </TouchableOpacity>
          );
        }}
      />

      <ItemDetailModal
        item={selectedItem}
        visible={detailVisible}
        onClose={() => setDetailVisible(false)}
        onAdjustStock={handleAdjustStock}
        colors={colors}
      />
      <AddItemModal
        visible={addVisible}
        onClose={() => setAddVisible(false)}
        onAdd={handleAddItem}
        colors={colors}
      />
    </View>
  );
}
