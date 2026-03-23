// screens/SalesScreen.tsx
// ERP Sales Module — search, filter, order detail modal, add order, status update

import React, { useMemo, useState } from 'react';
import {
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Filter, Plus, Search, X } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { salesOrders as INITIAL_ORDERS } from '@/data/erpMockData';

// ─── Types ────────────────────────────────────────────────────────────────────

type OrderStatus =
  | 'Completed'
  | 'Processing'
  | 'Pending'
  | 'Shipped'
  | 'Cancelled';
type DateFilter = 'All' | 'Today' | 'This Week' | 'This Month';

interface SalesOrder {
  id: string;
  customer: string;
  product: string;
  qty: number;
  total: number;
  status: OrderStatus;
  date: string;
  outlet: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<OrderStatus, string> = {
  Completed: '#10B981',
  Processing: '#3B82F6',
  Pending: '#F59E0B',
  Shipped: '#8B5CF6',
  Cancelled: '#EF4444',
};

const ALL_STATUSES: OrderStatus[] = [
  'Completed',
  'Processing',
  'Pending',
  'Shipped',
  'Cancelled',
];
const DATE_FILTERS: DateFilter[] = ['All', 'Today', 'This Week', 'This Month'];

function isWithinRange(dateStr: string, filter: DateFilter): boolean {
  if (filter === 'All') return true;
  const d = new Date(dateStr);
  const now = new Date();
  if (filter === 'Today') {
    return d.toDateString() === now.toDateString();
  }
  if (filter === 'This Week') {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    start.setHours(0, 0, 0, 0);
    return d >= start;
  }
  if (filter === 'This Month') {
    return (
      d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    );
  }
  return true;
}

// ─── Order Detail Modal ───────────────────────────────────────────────────────

function OrderDetailModal({
  order,
  visible,
  onClose,
  onUpdateStatus,
  colors,
}: {
  order: SalesOrder | null;
  visible: boolean;
  onClose: () => void;
  onUpdateStatus: (id: string, status: OrderStatus) => void;
  colors: any;
}) {
  if (!order) return null;
  const sc = STATUS_COLORS[order.status];
  const vatRate = 0.12;
  const net = order.total / 1.12;
  const vat = order.total - net;

  const nextStatus: Record<OrderStatus, OrderStatus | null> = {
    Pending: 'Processing',
    Processing: 'Shipped',
    Shipped: 'Completed',
    Completed: null,
    Cancelled: null,
  };
  const next = nextStatus[order.status];

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
        <View style={[odm.header, { backgroundColor: colors.primary }]}>
          <View>
            <Text style={odm.headerTxn}>{order.id}</Text>
            <Text style={odm.headerCustomer}>{order.customer}</Text>
          </View>
          <TouchableOpacity style={odm.closeBtn} onPress={onClose}>
            <X size={16} color="#fff" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Status badge */}
          <View
            style={[
              odm.statusRow,
              { backgroundColor: sc + '18', borderColor: sc },
            ]}
          >
            <View style={[odm.statusDot, { backgroundColor: sc }]} />
            <Text style={[odm.statusText, { color: sc }]}>{order.status}</Text>
          </View>

          {/* Order info */}
          <View
            style={[
              odm.section,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[odm.sectionTitle, { color: colors.textSecondary }]}>
              ORDER DETAILS
            </Text>
            {[
              ['Outlet', order.outlet],
              [
                'Date',
                new Date(order.date).toLocaleDateString('en-PH', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                }),
              ],
              ['Product', order.product],
              ['Quantity', String(order.qty)],
            ].map(([label, value]) => (
              <View
                key={label}
                style={[odm.detailRow, { borderBottomColor: colors.border }]}
              >
                <Text
                  style={[odm.detailLabel, { color: colors.textSecondary }]}
                >
                  {label}
                </Text>
                <Text style={[odm.detailValue, { color: colors.text }]}>
                  {value}
                </Text>
              </View>
            ))}
          </View>

          {/* Financial breakdown */}
          <View
            style={[
              odm.section,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                marginTop: 12,
              },
            ]}
          >
            <Text style={[odm.sectionTitle, { color: colors.textSecondary }]}>
              FINANCIAL BREAKDOWN
            </Text>
            <View style={[odm.detailRow, { borderBottomColor: colors.border }]}>
              <Text style={[odm.detailLabel, { color: colors.textSecondary }]}>
                Net Amount
              </Text>
              <Text style={[odm.detailValue, { color: colors.text }]}>
                ₱{net.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </Text>
            </View>
            <View style={[odm.detailRow, { borderBottomColor: colors.border }]}>
              <Text style={[odm.detailLabel, { color: colors.textSecondary }]}>
                VAT (12%)
              </Text>
              <Text style={[odm.detailValue, { color: colors.accent }]}>
                ₱{vat.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </Text>
            </View>
            <View style={[odm.detailRow, { borderBottomColor: 'transparent' }]}>
              <Text
                style={[
                  odm.detailLabel,
                  { color: colors.text, fontWeight: '700' },
                ]}
              >
                Total Amount
              </Text>
              <Text
                style={[
                  odm.detailValue,
                  { color: colors.accent, fontSize: 18, fontWeight: '800' },
                ]}
              >
                ₱{order.total.toLocaleString()}
              </Text>
            </View>
          </View>

          {/* Status update */}
          {next && (
            <TouchableOpacity
              style={[odm.updateBtn, { backgroundColor: STATUS_COLORS[next] }]}
              onPress={() => {
                onUpdateStatus(order.id, next);
                onClose();
              }}
              activeOpacity={0.85}
            >
              <Text style={odm.updateBtnText}>Move to: {next}</Text>
            </TouchableOpacity>
          )}
          {order.status !== 'Cancelled' && order.status !== 'Completed' && (
            <TouchableOpacity
              style={[
                odm.updateBtn,
                { backgroundColor: '#EF4444', marginTop: 8 },
              ]}
              onPress={() => {
                onUpdateStatus(order.id, 'Cancelled');
                onClose();
              }}
              activeOpacity={0.85}
            >
              <Text style={odm.updateBtnText}>Cancel Order</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const odm = StyleSheet.create({
  header: {
    backgroundColor: '#1B3A6B',
    paddingTop: 52,
    paddingBottom: 18,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTxn: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    fontFamily: 'monospace',
    marginBottom: 3,
  },
  headerCustomer: { fontSize: 18, fontWeight: '700', color: '#fff' },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 13, fontWeight: '700' },
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
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  updateBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  updateBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

// ─── Add Order Modal ──────────────────────────────────────────────────────────

const OUTLET_OPTIONS = ['Main Branch', 'Cebu Branch', 'Davao Branch'];
const PRODUCT_OPTIONS = [
  'Ganador Rice 25kg',
  'NFA Rice 25kg',
  'Century Tuna Flakes',
  'Sprite 1.5L',
  'Bear Brand 300g',
  'Lucky Me Pancit Canton',
  'Nescafe 3in1 100s',
  'Chippy BBQ 22g',
];

function AddOrderModal({
  visible,
  onClose,
  onAdd,
  colors,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (order: SalesOrder) => void;
  colors: any;
}) {
  const [customer, setCustomer] = useState('');
  const [product, setProduct] = useState('');
  const [qty, setQty] = useState('1');
  const [price, setPrice] = useState('');
  const [outlet, setOutlet] = useState(OUTLET_OPTIONS[0]);
  const [showProd, setShowProd] = useState(false);
  const [error, setError] = useState('');

  const handleAdd = () => {
    if (!customer.trim()) {
      setError('Customer name is required.');
      return;
    }
    if (!product.trim()) {
      setError('Please select a product.');
      return;
    }
    if (!price.trim() || isNaN(parseFloat(price))) {
      setError('Enter a valid price.');
      return;
    }
    const total = parseFloat(price) * parseInt(qty || '1', 10);
    const newOrder: SalesOrder = {
      id: `ORD-${Date.now().toString().slice(-6)}`,
      customer: customer.trim(),
      product: product.trim(),
      qty: parseInt(qty || '1', 10),
      total,
      status: 'Pending',
      date: new Date().toISOString().slice(0, 10),
      outlet,
    };
    onAdd(newOrder);
    setCustomer('');
    setProduct('');
    setQty('1');
    setPrice('');
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
    prodBtn: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 11,
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    prodTxt: { fontSize: 14 },
    prodList: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      marginTop: 4,
      overflow: 'hidden',
    },
    prodItem: {
      paddingHorizontal: 14,
      paddingVertical: 11,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
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
    outRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 2 },
    outPill: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 20,
      borderWidth: 1,
    },
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={s.sheet}>
              <View style={s.handle} />
              <View style={s.header}>
                <Text style={s.title}>New Sales Order</Text>
                <TouchableOpacity onPress={onClose}>
                  <X size={20} color={colors.textSecondary} strokeWidth={2} />
                </TouchableOpacity>
              </View>
              <ScrollView
                contentContainerStyle={{ padding: 20 }}
                keyboardShouldPersistTaps="handled"
              >
                <Text style={s.label}>Customer Name</Text>
                <TextInput
                  style={s.input}
                  placeholder="e.g. Maria Santos"
                  placeholderTextColor={colors.textSecondary}
                  value={customer}
                  onChangeText={setCustomer}
                />

                <Text style={s.label}>Outlet</Text>
                <View style={s.outRow}>
                  {OUTLET_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      style={[
                        s.outPill,
                        {
                          borderColor:
                            outlet === opt ? colors.primary : colors.border,
                          backgroundColor:
                            outlet === opt ? colors.primary : 'transparent',
                        },
                      ]}
                      onPress={() => setOutlet(opt)}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '600',
                          color: outlet === opt ? '#fff' : colors.text,
                        }}
                      >
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={s.label}>Product</Text>
                <TouchableOpacity
                  style={s.prodBtn}
                  onPress={() => setShowProd((v) => !v)}
                >
                  <Text
                    style={[
                      s.prodTxt,
                      { color: product ? colors.text : colors.textSecondary },
                    ]}
                  >
                    {product || 'Select product…'}
                  </Text>
                  <Text style={{ color: colors.textSecondary }}>▾</Text>
                </TouchableOpacity>
                {showProd && (
                  <View style={s.prodList}>
                    {PRODUCT_OPTIONS.map((p) => (
                      <TouchableOpacity
                        key={p}
                        style={s.prodItem}
                        onPress={() => {
                          setProduct(p);
                          setShowProd(false);
                        }}
                      >
                        <Text style={{ fontSize: 13, color: colors.text }}>
                          {p}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <View style={s.row2}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.label}>Quantity</Text>
                    <TextInput
                      style={s.input}
                      placeholder="1"
                      placeholderTextColor={colors.textSecondary}
                      value={qty}
                      onChangeText={setQty}
                      keyboardType="number-pad"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.label}>Unit Price (₱)</Text>
                    <TextInput
                      style={s.input}
                      placeholder="0.00"
                      placeholderTextColor={colors.textSecondary}
                      value={price}
                      onChangeText={setPrice}
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>

                {price && qty ? (
                  <View
                    style={{
                      backgroundColor: colors.background,
                      borderRadius: 8,
                      padding: 10,
                      marginTop: 8,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                      Total:{' '}
                      <Text
                        style={{
                          fontWeight: '800',
                          color: colors.accent,
                          fontSize: 14,
                        }}
                      >
                        ₱
                        {(
                          parseFloat(price || '0') * parseInt(qty || '1', 10)
                        ).toLocaleString()}
                      </Text>
                    </Text>
                  </View>
                ) : null}

                {error ? <Text style={s.errTxt}>{error}</Text> : null}

                <TouchableOpacity
                  style={s.addBtn}
                  onPress={handleAdd}
                  activeOpacity={0.85}
                >
                  <Text style={s.addTxt}>Add Order</Text>
                </TouchableOpacity>
                <View style={{ height: 8 }} />
              </ScrollView>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function SalesScreen() {
  const { colors } = useTheme();
  const { width } = Dimensions.get('window');
  const isTablet = width >= 768;

  const [orders, setOrders] = useState<SalesOrder[]>(
    INITIAL_ORDERS as SalesOrder[],
  );
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'All'>('All');
  const [dateFilter, setDateFilter] = useState<DateFilter>('All');
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [addVisible, setAddVisible] = useState(false);

  // ── Filtered data ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      const matchSearch =
        !q ||
        o.customer.toLowerCase().includes(q) ||
        o.id.toLowerCase().includes(q) ||
        o.product.toLowerCase().includes(q);
      const matchStatus = statusFilter === 'All' || o.status === statusFilter;
      const matchDate = isWithinRange(o.date, dateFilter);
      return matchSearch && matchStatus && matchDate;
    });
  }, [orders, search, statusFilter, dateFilter]);

  // ── Stats from filtered ────────────────────────────────────────────────────
  const totalRevenue = filtered.reduce((a, o) => a + o.total, 0);
  const completedCount = filtered.filter(
    (o) => o.status === 'Completed',
  ).length;
  const pendingCount = filtered.filter((o) => o.status === 'Pending').length;

  const handleUpdateStatus = (id: string, status: OrderStatus) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
  };

  const handleAddOrder = (order: SalesOrder) => {
    setOrders((prev) => [order, ...prev]);
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { padding: 16, paddingBottom: 0 },
    metaRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
    metaCard: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 10,
      padding: 12,
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
    cardRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 8,
    },
    orderId: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.primary,
      letterSpacing: 0.4,
      marginBottom: 2,
      fontFamily: 'monospace',
    },
    customerName: { fontSize: 15, fontWeight: '700', color: colors.text },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    badgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
    divider: { height: 1, backgroundColor: colors.border, marginVertical: 8 },
    chipsRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
    chip: {
      backgroundColor: colors.background,
      borderRadius: 6,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipLabel: {
      fontSize: 9,
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
      marginBottom: 1,
    },
    chipValue: { fontSize: 12, fontWeight: '700', color: colors.text },
    emptyWrap: { flex: 1, alignItems: 'center', paddingTop: 60 },
    emptyText: { fontSize: 14, color: colors.textSecondary, marginTop: 12 },
    resultCount: {
      fontSize: 11,
      color: colors.textSecondary,
      paddingHorizontal: 16,
      paddingBottom: 6,
    },
  });

  return (
    <View style={styles.container}>
      {/* Meta cards — update live with filters */}
      <View style={styles.header}>
        <View style={styles.metaRow}>
          <View style={styles.metaCard}>
            <Text style={styles.metaValue}>{filtered.length}</Text>
            <Text style={styles.metaLabel}>Orders</Text>
          </View>
          <View style={styles.metaCard}>
            <Text style={[styles.metaValue, { color: colors.success }]}>
              {completedCount}
            </Text>
            <Text style={styles.metaLabel}>Completed</Text>
          </View>
          <View style={styles.metaCard}>
            <Text style={[styles.metaValue, { color: colors.warning }]}>
              {pendingCount}
            </Text>
            <Text style={styles.metaLabel}>Pending</Text>
          </View>
          <View style={styles.metaCard}>
            <Text style={[styles.metaValue, { color: colors.accent }]}>
              ₱
              {totalRevenue >= 1000
                ? `${(totalRevenue / 1000).toFixed(0)}K`
                : totalRevenue}
            </Text>
            <Text style={styles.metaLabel}>Revenue</Text>
          </View>
        </View>
      </View>

      {/* Toolbar */}
      <View style={styles.toolbar}>
        <View style={styles.searchBox}>
          <Search size={13} color={colors.textSecondary} strokeWidth={2} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search orders, customer, product…"
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
            <Text style={styles.filterLabel}>STATUS</Text>
            <View style={styles.pillRow}>
              {(['All', ...ALL_STATUSES] as (OrderStatus | 'All')[]).map(
                (s) => (
                  <TouchableOpacity
                    key={s}
                    style={[
                      styles.pill,
                      statusFilter === s && styles.pillActive,
                    ]}
                    onPress={() => setStatusFilter(s)}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        statusFilter === s && styles.pillTextAct,
                      ]}
                    >
                      {s}
                    </Text>
                  </TouchableOpacity>
                ),
              )}
            </View>
          </View>
          <View>
            <Text style={styles.filterLabel}>DATE RANGE</Text>
            <View style={styles.pillRow}>
              {DATE_FILTERS.map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[styles.pill, dateFilter === d && styles.pillActive]}
                  onPress={() => setDateFilter(d)}
                >
                  <Text
                    style={[
                      styles.pillText,
                      dateFilter === d && styles.pillTextAct,
                    ]}
                  >
                    {d}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* Result count */}
      <Text style={styles.resultCount}>
        {filtered.length} order{filtered.length !== 1 ? 's' : ''}
        {search ? ` matching "${search}"` : ''}
        {statusFilter !== 'All' ? ` · ${statusFilter}` : ''}
        {dateFilter !== 'All' ? ` · ${dateFilter}` : ''}
      </Text>

      {/* Order list */}
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
          <View style={styles.emptyWrap}>
            <Text style={{ fontSize: 36 }}>📋</Text>
            <Text style={styles.emptyText}>No orders found</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, isTablet && { flex: 1 }]}
            onPress={() => {
              setSelectedOrder(item);
              setDetailVisible(true);
            }}
            activeOpacity={0.82}
          >
            <View style={styles.cardRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.orderId}>{item.id}</Text>
                <Text style={styles.customerName}>{item.customer}</Text>
                <Text
                  style={{
                    fontSize: 11,
                    color: colors.textSecondary,
                    marginTop: 2,
                  }}
                >
                  {item.outlet}
                </Text>
              </View>
              <View
                style={[
                  styles.badge,
                  { backgroundColor: STATUS_COLORS[item.status] ?? '#6B7280' },
                ]}
              >
                <Text style={styles.badgeText}>{item.status}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.chipsRow}>
              <View style={styles.chip}>
                <Text style={styles.chipLabel}>Product</Text>
                <Text style={styles.chipValue} numberOfLines={1}>
                  {item.product}
                </Text>
              </View>
              <View style={styles.chip}>
                <Text style={styles.chipLabel}>Qty</Text>
                <Text style={styles.chipValue}>{item.qty}</Text>
              </View>
              <View style={styles.chip}>
                <Text style={styles.chipLabel}>Total</Text>
                <Text style={[styles.chipValue, { color: colors.accent }]}>
                  ₱{item.total.toLocaleString()}
                </Text>
              </View>
              <View style={styles.chip}>
                <Text style={styles.chipLabel}>Date</Text>
                <Text style={styles.chipValue}>
                  {new Date(item.date).toLocaleDateString('en-PH', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Modals */}
      <OrderDetailModal
        order={selectedOrder}
        visible={detailVisible}
        onClose={() => setDetailVisible(false)}
        onUpdateStatus={handleUpdateStatus}
        colors={colors}
      />
      <AddOrderModal
        visible={addVisible}
        onClose={() => setAddVisible(false)}
        onAdd={handleAddOrder}
        colors={colors}
      />
    </View>
  );
}
