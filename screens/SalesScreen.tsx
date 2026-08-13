import React, { useCallback, useEffect, useRef, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  Calendar,
  ChevronDown,
  Eye,
  FileText,
  Package,
  Plus,
  Printer,
  RefreshCcw,
  Search,
  Truck,
  X,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import ScPwdCustomerForm from '@/components/ScPwdCustomerForm';
import DateRangePickerModal from '@/components/DateRangePickerModal';
import { formatShortDate } from '@/utils/dateHelpers';
import {
  computeSalesOrderTotals,
  type ExtraCharge as TotalsExtraCharge,
} from '@/hooks/calculateTotal';
import { PrinterService } from '@/services/printerService';
import {
  SalesOrderService,
  type Branch,
  type CustomerType,
  type DiscountType,
  type InventoryItemForSales,
  type OrderMode,
  type OutletForSales,
  type SalesOrder,
  type SalesOrderItemInput,
  type SalesOrderStatus,
  type ScPwdCustomerInput,
  type DiscountStatus,
} from '@/services/salesOrder.service';
import type { CartItem } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// Breakpoints
// ─────────────────────────────────────────────────────────────────────────────
const BP_TABLET = 768;
const BP_DESKTOP = 1024;

function useBreakpoint() {
  const { width } = useWindowDimensions();
  return {
    isMobile: width < BP_TABLET,
    isTablet: width >= BP_TABLET && width < BP_DESKTOP,
    isDesktop: width >= BP_DESKTOP,
    width,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type DateFilter = 'All' | 'Today' | 'This Week' | 'Custom Range';
type StatusFilter = 'All' | SalesOrderStatus;
type ModeFilter = 'All' | OrderMode;
type PrintAction = 'none' | 'receipt' | 'invoice';

interface CartEntry {
  key: string;
  item: InventoryItemForSales;
  quantity: number;
}

interface ChargeDraft extends TotalsExtraCharge {
  key: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const STATUSES: SalesOrderStatus[] = [
  'PENDING', 'PROCESSING', 'READY_FOR_PICKUP',
  'OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED',
];

const STATUS_LABELS: Record<SalesOrderStatus, string> = {
  PENDING: 'Pending',
  PROCESSING: 'Processing',
  READY_FOR_PICKUP: 'Ready for Pick-up',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  COMPLETED: 'Completed',
  RECEIVED: 'Completed',
  ORDERED: 'Ordered',
  SHIPPED: 'Out for Delivery',
  CANCELLED: 'Cancelled',
};

const STATUS_COLORS: Record<SalesOrderStatus, string> = {
  PENDING: '#6B7280',
  PROCESSING: '#D97706',
  READY_FOR_PICKUP: '#0D9488',
  OUT_FOR_DELIVERY: '#2563EB',
  COMPLETED: '#059669',
  RECEIVED: '#059669',
  ORDERED: '#D97706',
  SHIPPED: '#2563EB',
  CANCELLED: '#DC2626',
};

const STATUS_BG: Record<SalesOrderStatus, string> = {
  PENDING: '#F3F4F6',
  PROCESSING: '#FEF3C7',
  READY_FOR_PICKUP: '#CCFBF1',
  OUT_FOR_DELIVERY: '#DBEAFE',
  COMPLETED: '#D1FAE5',
  RECEIVED: '#D1FAE5',
  ORDERED: '#FEF3C7',
  SHIPPED: '#DBEAFE',
  CANCELLED: '#FEE2E2',
};

const MODE_LABELS: Record<OrderMode, string> = {
  WALK_IN: 'Walk-in',
  PICK_UP: 'Pick-up',
  DELIVERY: 'Delivery',
};

const MODE_COLORS: Record<OrderMode, string> = {
  WALK_IN: '#059669',
  PICK_UP: '#D97706',
  DELIVERY: '#7C3AED',
};

const MODE_BG: Record<OrderMode, string> = {
  WALK_IN: '#D1FAE5',
  PICK_UP: '#FEF3C7',
  DELIVERY: '#EDE9FE',
};

const MODE_DESCRIPTIONS: Record<OrderMode, string> = {
  WALK_IN: 'Customer is present and will take items now. Order moves straight to Processing.',
  PICK_UP: 'Customer will collect their order later. Requires customer name and contact number.',
  DELIVERY: "Order will be delivered to customer's address. Requires delivery address and contact number.",
};

const GOVERNMENT_ID_PATTERN = /^[a-z0-9]{4,32}$/i;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function money(value?: number | null) {
  return `₱${Number(value ?? 0).toFixed(2)}`;
}

function dateRange(filter: DateFilter, customStart: Date | null, customEnd: Date | null) {
  if (filter === 'All') return {};
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);
  if (filter === 'Today') {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (filter === 'This Week') {
    start.setDate(now.getDate() - now.getDay());
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else {
    return {
      startDate: customStart?.toISOString() ?? undefined,
      endDate: customEnd?.toISOString() ?? undefined,
    };
  }
  return { startDate: start.toISOString(), endDate: end.toISOString() };
}

function itemName(item: SalesOrder['items'][number]) {
  return item.isCustomItem
    ? (item.customItemName ?? 'Custom Item')
    : (item.item?.name ?? `Item #${item.itemId}`);
}

function cartToCartItem(entry: CartEntry): CartItem {
  return {
    id: String(entry.item.itemId),
    name: entry.item.item.name,
    price: entry.item.price,
    priceAtSale: entry.item.price,
    quantity: entry.quantity,
    image: entry.item.item.image,
    vatExempt: entry.item.item.vatExempt,
    isVatExempt: entry.item.item.isVatExempt,
    isBNPC: entry.item.item.isBNPC,
    hasSeniorDiscountVATExempt: entry.item.item.hasSeniorDiscountVATExempt,
    vatRate: entry.item.item?.vatType?.rate ?? entry.item.item?.vatRate ?? 0,
  };
}

function nextStatuses(order: SalesOrder) {
  if (order.status === 'COMPLETED' || order.status === 'CANCELLED') return [];
  const nextByMode: Record<OrderMode, Partial<Record<SalesOrderStatus, SalesOrderStatus>>> = {
    WALK_IN: { PROCESSING: 'COMPLETED' },
    PICK_UP: { PENDING: 'PROCESSING', PROCESSING: 'READY_FOR_PICKUP', READY_FOR_PICKUP: 'COMPLETED' },
    DELIVERY: { PENDING: 'PROCESSING', PROCESSING: 'OUT_FOR_DELIVERY', OUT_FOR_DELIVERY: 'COMPLETED' },
  };
  const next = nextByMode[order.orderMode][order.status];
  return next ? [next, 'CANCELLED' as SalesOrderStatus] : ['CANCELLED' as SalesOrderStatus];
}

// ─────────────────────────────────────────────────────────────────────────────
// StatusBadge
// ─────────────────────────────────────────────────────────────────────────────
function StatusBadge({ status, size = 'md' }: { status: SalesOrderStatus; size?: 'sm' | 'md' }) {
  const ph = size === 'sm' ? 6 : 9;
  const pv = size === 'sm' ? 2 : 4;
  const fs = size === 'sm' ? 10 : 11;
  return (
    <View style={{
      backgroundColor: STATUS_BG[status] ?? '#F3F4F6',
      borderRadius: 99,
      paddingHorizontal: ph,
      paddingVertical: pv,
      alignSelf: 'flex-start',
    }}>
      <Text style={{ color: STATUS_COLORS[status] ?? '#374151', fontSize: fs, fontWeight: '700' }}>
        {STATUS_LABELS[status]}
      </Text>
    </View>
  );
}

function ModeBadge({ mode, size = 'md' }: { mode: OrderMode; size?: 'sm' | 'md' }) {
  const ph = size === 'sm' ? 6 : 9;
  const pv = size === 'sm' ? 2 : 4;
  const fs = size === 'sm' ? 10 : 11;
  return (
    <View style={{
      backgroundColor: MODE_BG[mode],
      borderRadius: 99,
      paddingHorizontal: ph,
      paddingVertical: pv,
      alignSelf: 'flex-start',
    }}>
      <Text style={{ color: MODE_COLORS[mode], fontSize: fs, fontWeight: '600' }}>
        {MODE_LABELS[mode]}
      </Text>
    </View>
  );
}

function ScPwdBadge({ type }: { type: CustomerType }) {
  if (type === 'REGULAR') return null;
  return (
    <View style={{
      backgroundColor: '#F5F3FF',
      borderRadius: 99,
      paddingHorizontal: 7,
      paddingVertical: 2,
      alignSelf: 'flex-start',
    }}>
      <Text style={{ color: '#6D28D9', fontSize: 10, fontWeight: '700' }}>
        {type === 'PWD' ? 'PWD' : 'SC'}
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Pill (kept for backward compat in modals)
// ─────────────────────────────────────────────────────────────────────────────
function Pill({ label, active, onPress, color }: {
  label: string; active?: boolean; onPress?: () => void; color?: string;
}) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      style={[styles.pill, {
        borderColor: color ?? colors.border,
        backgroundColor: active ? (color ?? colors.primary) : colors.card,
      }]}
    >
      <Text style={[styles.pillText, { color: active ? '#fff' : (color ?? colors.text) }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// StatusModal — unchanged
// ─────────────────────────────────────────────────────────────────────────────
function StatusModal({ order, onClose, onUpdated }: {
  order: SalesOrder | null; onClose: () => void; onUpdated: (order: SalesOrder) => void;
}) {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  if (!order) return null;
  const options = nextStatuses(order);

  const confirmCancel = async () => {
    if (Platform.OS === 'web' || typeof window !== 'undefined') {
      return Promise.resolve(window.confirm(
        'Cancel order?\n\nAre you sure you want to cancel this order? This cannot be undone.',
      ));
    }
    return new Promise<boolean>((resolve) => {
      Alert.alert('Cancel order?', 'Are you sure you want to cancel this order? This cannot be undone.', [
        { text: 'Keep Order', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Cancel Order', style: 'destructive', onPress: () => resolve(true) },
      ]);
    });
  };

  const update = async (status: SalesOrderStatus) => {
    if (status === 'CANCELLED') {
      const confirmed = await confirmCancel();
      if (!confirmed) return;
    }
    setLoading(true);
    try {
      const updated = status === 'CANCELLED'
        ? await SalesOrderService.cancelSalesOrder(order.id)
        : await SalesOrderService.updateSalesOrderStatus(order.id, status);
      onUpdated(updated);
      onClose();
    } catch (error: unknown) {
      Alert.alert('Unable to update order', error instanceof Error ? error.message : 'Something went wrong while updating the order.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.card }]}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={[styles.title, { color: colors.text }]}>{order.orderNumber}</Text>
              <Text style={{ color: colors.textSecondary }}>
                {MODE_LABELS[order.orderMode]} · {STATUS_LABELS[order.status]}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose}><X color={colors.textSecondary} /></TouchableOpacity>
          </View>
          <View style={{ gap: 10 }}>
            {options.map((status) => (
              <TouchableOpacity
                key={status}
                disabled={loading}
                onPress={() => update(status)}
                style={[styles.primaryButton, { backgroundColor: STATUS_COLORS[status] }]}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.primaryButtonText}>{status === 'CANCELLED' ? 'Cancel Order' : STATUS_LABELS[status]}</Text>
                }
              </TouchableOpacity>
            ))}
            {options.length === 0 && (
              <Text style={{ color: colors.textSecondary }}>No further status actions are available.</Text>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TotalLine — unchanged
// ─────────────────────────────────────────────────────────────────────────────
function TotalLine({ label, value, prefix = '', strong }: {
  label: string; value: number; prefix?: string; strong?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.rowBetween}>
      <Text style={[{ color: colors.text }, strong && styles.strong]}>{label}</Text>
      <Text style={[{ color: colors.text }, strong && styles.grand]}>{prefix}{money(value)}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DetailModal — unchanged
// ─────────────────────────────────────────────────────────────────────────────
function DetailModal({ order, onClose }: { order: SalesOrder | null; onClose: () => void }) {
  const { colors } = useTheme();
  if (!order) return null;
  const isScPwd = order.customerType !== 'REGULAR';
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, styles.largeSheet, { backgroundColor: colors.card }]}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={[styles.title, { color: colors.text }]}>{order.orderNumber}</Text>
              <Text style={{ color: colors.textSecondary }}>
                {new Date(order.date).toLocaleString('en-PH')} · {MODE_LABELS[order.orderMode]} · {STATUS_LABELS[order.status]}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose}><X color={colors.textSecondary} /></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ gap: 14, paddingBottom: 16 }}>
            {order.orderMode !== 'WALK_IN' && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Customer</Text>
                <Text style={{ color: colors.text }}>Name: {order.customerName || 'Walk-in Customer'}</Text>
                <Text style={{ color: colors.text }}>Contact: {order.customerContact || '-'}</Text>
                {order.orderMode === 'DELIVERY' && (
                  <>
                    <Text style={{ color: colors.text }}>Address: {order.deliveryAddress}</Text>
                    {order.deliveryNotes ? <Text style={{ color: colors.text }}>Notes: {order.deliveryNotes}</Text> : null}
                  </>
                )}
              </View>
            )}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Items</Text>
              {order.items.map((line) => (
                <View key={line.id} style={styles.rowBetween}>
                  <Text style={[styles.flexText, { color: colors.text }]}>
                    {itemName(line)} · {line.quantity} x {money(line.unitPrice)}
                  </Text>
                  <Text style={{ color: colors.text, fontWeight: '700' }}>{money(line.totalPrice)}</Text>
                </View>
              ))}
            </View>
            {order.extraCharges.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Extra Charges</Text>
                {order.extraCharges.map((charge) => (
                  <View key={charge.id} style={styles.rowBetween}>
                    <Text style={{ color: colors.text }}>{charge.label}</Text>
                    <Text style={{ color: colors.text, fontWeight: '700' }}>{money(charge.amount)}</Text>
                  </View>
                ))}
              </View>
            )}
            {isScPwd && order.scPwdCustomer && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>SC/PWD Customer</Text>
                <Text style={{ color: colors.text }}>{order.scPwdCustomer.fullName}</Text>
                <Text style={{ color: colors.text }}>{order.scPwdCustomer.idType}: {order.scPwdCustomer.idNumber}</Text>
                {order.scPwdCustomer.isRepresentative
                  ? <Text style={{ color: colors.text }}>Representative: {order.scPwdCustomer.representativeName}</Text>
                  : null}
              </View>
            )}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Totals</Text>
              <TotalLine label="Gross Sales (VAT Included)" value={order.subtotal} />
              {order.extraChargesTotal > 0 && <TotalLine label="Extra Charges" value={order.extraChargesTotal} prefix="+" />}
              {isScPwd ? <TotalLine label="VAT Exempt Sale" value={order.vatExemptSale} /> : null}
              <TotalLine label="VATable Sale" value={Math.max(0, order.subtotal - order.vatExemptSale - order.vatAmount)} />
              <TotalLine label="VAT (12%)" value={order.vatAmount} />
              {order.discountAmount > 0 && <TotalLine label={`Discount (${order.discountType})`} value={order.discountAmount} prefix="-" />}
              <TotalLine label="GRAND TOTAL" value={order.grandTotal} strong />
            </View>
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => PrinterService.printSalesOrderReceipt(order)}>
                <Printer size={16} color={colors.primary} />
                <Text style={[styles.secondaryText, { color: colors.primary }]}>Print Receipt</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => PrinterService.printSalesOrderInvoice(order)}>
                <FileText size={16} color={colors.primary} />
                <Text style={[styles.secondaryText, { color: colors.primary }]}>Print Invoice</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CreateOrderModal — unchanged from original
// ─────────────────────────────────────────────────────────────────────────────
function CreateOrderModal({ visible, onClose, onCreated }: {
  visible: boolean; onClose: () => void; onCreated: (order: SalesOrder) => void;
}) {
  const { colors } = useTheme();
  const [orderMode, setOrderMode] = useState<OrderMode>('WALK_IN');
  const [customerName, setCustomerName] = useState('');
  const [customerContact, setCustomerContact] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [outlets, setOutlets] = useState<OutletForSales[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [selectedOutlet, setSelectedOutlet] = useState<OutletForSales | null>(null);
  const [branchPickerOpen, setBranchPickerOpen] = useState(false);
  const [customItemOpen, setCustomItemOpen] = useState(false);
  const [customItemName, setCustomItemName] = useState('');
  const [customItemPrice, setCustomItemPrice] = useState('');
  const [customItemQuantity, setCustomItemQuantity] = useState('1');
  const [customItemVatExempt, setCustomItemVatExempt] = useState(false);
  const [items, setItems] = useState<InventoryItemForSales[]>([]);
  const [cart, setCart] = useState<CartEntry[]>([]);
  const [search, setSearch] = useState('');
  const [itemPickerOpen, setItemPickerOpen] = useState(false);
  const [charges, setCharges] = useState<ChargeDraft[]>([]);
  const [customerType, setCustomerType] = useState<CustomerType>('REGULAR');
  const [discountType, setDiscountType] = useState<DiscountType>('NONE');
  const [discountStatus, setDiscountStatus] = useState<DiscountStatus | null>(null);
  const [discountStatusError, setDiscountStatusError] = useState<string | null>(null);
  const [isLoadingDiscountStatus, setIsLoadingDiscountStatus] = useState(false);
  const [applyBnpcDiscount, setApplyBnpcDiscount] = useState(true);
  const [scPwdData, setScPwdData] = useState<ScPwdCustomerInput>({ fullName: '', idNumber: '', idType: 'OSCA' });
  const [totalPax, setTotalPax] = useState(1);
  const [scPwdPax, setScPwdPax] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const loadItems = useCallback(async () => {
    const result = await SalesOrderService.searchInventoryItems({
      outletId: selectedOutlet?.id ?? null,
      branchId: selectedOutlet?.id ? null : (selectedBranchId ?? null),
      search,
      take: 50,
    });
    setItems(result.items);
  }, [search, selectedOutlet?.id, selectedBranchId]);

  useEffect(() => {
    if (!visible) return;
    SalesOrderService.getBranches().then(setBranches);
    loadItems();
  }, [visible, loadItems]);

  useEffect(() => {
    if (!selectedBranchId) { setOutlets([]); setSelectedOutlet(null); return; }
    SalesOrderService.getOutletsByBranch(selectedBranchId).then(setOutlets);
  }, [selectedBranchId]);

  useEffect(() => {
    if (customerType === 'REGULAR') { setApplyBnpcDiscount(false); setDiscountType('NONE'); return; }
    const baseType = customerType === 'PWD' ? 'PWD' : 'SENIOR_CITIZEN';
    const bnpcType = customerType === 'PWD' ? 'BNPC_PWD' : 'BNPC_SENIOR_CITIZEN';
    const capRemaining = discountStatus?.capRemaining ?? 0;
    if (discountStatus && capRemaining <= 0 && applyBnpcDiscount) {
      setApplyBnpcDiscount(false); setDiscountType(baseType); return;
    }
    if (applyBnpcDiscount && capRemaining > 0) { setDiscountType(bnpcType); }
    else { setDiscountType(baseType); }
  }, [customerType, discountStatus, applyBnpcDiscount]);

  useEffect(() => {
    if (visible) loadItems();
  }, [selectedOutlet?.id, selectedBranchId, visible, loadItems]);

  useEffect(() => {
    const oscaGovId = scPwdData.idNumber?.trim().toUpperCase();
    if (customerType === 'REGULAR' || !oscaGovId || !GOVERNMENT_ID_PATTERN.test(oscaGovId)) {
      setDiscountStatus(null); setDiscountStatusError(null); setIsLoadingDiscountStatus(false); return;
    }
    let active = true;
    setIsLoadingDiscountStatus(true); setDiscountStatusError(null);
    SalesOrderService.getDiscountStatus(undefined, oscaGovId)
      .then((status) => { if (!active) return; setDiscountStatus(status); })
      .catch((error) => { if (!active) return; setDiscountStatus(null); setDiscountStatusError(error?.message || 'Unable to load BNPC status'); })
      .finally(() => { if (!active) return; setIsLoadingDiscountStatus(false); });
    return () => { active = false; };
  }, [customerType, scPwdData.idNumber]);

  const cartItems = cart.map(cartToCartItem);
  const normalizeBnpcUsage = () => {
    if (!discountStatus) return { bnpcDiscountUsed: undefined, bnpcEligibleAmountUsed: undefined, bnpcCapManuallyReached: undefined };
    try {
      const lastReset = discountStatus.lastResetDate ? new Date(discountStatus.lastResetDate) : null;
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay()); weekStart.setHours(0, 0, 0, 0);
      if (lastReset && lastReset >= weekStart) {
        return { bnpcDiscountUsed: discountStatus.weeklyCapUsed ?? 0, bnpcEligibleAmountUsed: discountStatus.eligibleAmountUsed ?? 0, bnpcCapManuallyReached: discountStatus.capManuallyReached ?? false };
      }
    } catch (err) { if (__DEV__) console.warn('Failed to parse discountStatus.lastResetDate', err); }
    return { bnpcDiscountUsed: 0, bnpcEligibleAmountUsed: 0, bnpcCapManuallyReached: false };
  };
  const { bnpcDiscountUsed, bnpcEligibleAmountUsed, bnpcCapManuallyReached } = normalizeBnpcUsage();
  const BNPC_WEEKLY_DISCOUNT_CAP = 125;
  const capRemainingNormalized = Math.max(0, BNPC_WEEKLY_DISCOUNT_CAP - (bnpcDiscountUsed ?? 0));
  const totals = computeSalesOrderTotals({
    items: cartItems, extraCharges: charges, automaticDiscounts: true,
    scPwdParams: customerType === 'REGULAR' ? undefined : {
      customerType, discountType, totalPax, scPwdPax, isVatRegistered: true,
      bnpcDiscountUsed, bnpcEligibleAmountUsed, bnpcCapManuallyReached, disableBnpc: !applyBnpcDiscount,
    },
  });

  const addItem = (item: InventoryItemForSales) => {
    setCart((prev) => {
      const existing = prev.find((e) => e.item.itemId === item.itemId);
      if (existing) return prev.map((e) => e.item.itemId === item.itemId ? { ...e, quantity: e.quantity + 1 } : e);
      return [...prev, { key: String(item.itemId), item, quantity: 1 }];
    });
  };

  const addCustomItem = () => {
    const nextErrors: Record<string, string> = {};
    const name = customItemName.trim();
    const price = Number(customItemPrice);
    const quantity = Number(customItemQuantity);
    if (!name) nextErrors.customItemName = 'Custom item name is required.';
    if (!Number.isFinite(price) || price <= 0) nextErrors.customItemPrice = 'Price must be greater than 0.';
    if (!Number.isFinite(quantity) || quantity <= 0) nextErrors.customItemQuantity = 'Quantity must be greater than 0.';
    if (Object.keys(nextErrors).length > 0) { setErrors((prev) => ({ ...prev, ...nextErrors })); return; }
    const customId = -Date.now();
    const customItem: InventoryItemForSales = {
      id: customId, itemId: customId, price, quantity,
      item: { id: customId, name, image: undefined, sellingPrice: price, barcode: '', description: undefined, vatExempt: customItemVatExempt, isVatExempt: customItemVatExempt, isBNPC: false, hasSeniorDiscountVATExempt: customItemVatExempt, vatRate: 0.12 },
      units: [], inventory: { id: 0, outlet: { id: 0, name: 'Custom Item', code: 'CUSTOM' } },
    };
    setCart((prev) => [...prev, { key: `custom-${customId}`, item: customItem, quantity }]);
    setCustomItemOpen(false); setCustomItemName(''); setCustomItemPrice(''); setCustomItemQuantity('1'); setCustomItemVatExempt(false);
  };

  const updateQty = (key: string, quantity: number) => {
    setCart((prev) => quantity <= 0 ? prev.filter((e) => e.key !== key) : prev.map((e) => e.key === key ? { ...e, quantity } : e));
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (cart.length === 0) next.items = 'Add at least one item.';
    if (orderMode === 'PICK_UP' && !customerName.trim()) next.customerName = 'Customer name is required.';
    if (orderMode === 'PICK_UP' && !customerContact.trim()) next.customerContact = 'Contact number is required.';
    if (orderMode === 'DELIVERY' && !customerContact.trim()) next.customerContact = 'Contact number is required.';
    if (orderMode === 'DELIVERY' && !deliveryAddress.trim()) next.deliveryAddress = 'Delivery address is required.';
    if (customerType !== 'REGULAR') {
      if (!scPwdData.fullName.trim()) next.scPwdName = 'SC/PWD full name is required.';
      if (!scPwdData.idNumber.trim()) next.scPwdId = 'SC/PWD ID number is required.';
      else if (!GOVERNMENT_ID_PATTERN.test(scPwdData.idNumber.trim())) next.scPwdId = 'OSCA/government ID must be 4-32 alphanumeric characters.';
    }
    charges.forEach((charge, index) => {
      if (!charge.label.trim()) next[`chargeLabel${index}`] = 'Label is required.';
      if (!Number.isFinite(Number(charge.amount)) || Number(charge.amount) <= 0) next[`chargeAmount${index}`] = 'Amount must be greater than 0.';
    });
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const reset = () => {
    setOrderMode('WALK_IN'); setCustomerName(''); setCustomerContact(''); setDeliveryAddress(''); setDeliveryNotes('');
    setSelectedBranchId(null); setSelectedOutlet(null); setOutlets([]); setBranchPickerOpen(false);
    setCustomItemOpen(false); setCustomItemName(''); setCustomItemPrice(''); setCustomItemQuantity('1'); setCustomItemVatExempt(false);
    setCart([]); setCharges([]); setCustomerType('REGULAR'); setDiscountType('NONE');
    setScPwdData({ fullName: '', idNumber: '', idType: 'OSCA' }); setTotalPax(1); setScPwdPax(1); setErrors({});
  };

  const save = async (print: PrintAction) => {
    if (!validate()) return;
    setSaving(true);
    try {
      const orderItems: SalesOrderItemInput[] = cart.map((entry) => {
        const isCustom = entry.item.itemId < 0;
        const computedLine = totals.itemBreakdown.find((line) => line.id === String(entry.item.itemId));
        return {
          itemId: isCustom ? undefined : entry.item.itemId,
          quantity: entry.quantity, unitPrice: entry.item.price,
          isCustomItem: isCustom, customItemName: isCustom ? entry.item.item.name : undefined,
          discountQuantity: computedLine?.discountAmount ? entry.quantity : 0,
          discountRate: computedLine?.discountRate ?? 0, discountAmount: computedLine?.discountAmount ?? 0,
          discountType: (computedLine?.discountType ?? 'NONE') as DiscountType,
          vatExempt: Boolean(entry.item.item.vatExempt || entry.item.item.isVatExempt),
          hasSeniorDiscountVATExempt: Boolean(entry.item.item.hasSeniorDiscountVATExempt || entry.item.item.vatExempt || entry.item.item.isVatExempt),
        };
      });
      const created = await SalesOrderService.createSalesOrder({
        orderMode, customer: customerName.trim() || 'Walk-in Customer',
        customerName: customerName.trim() || undefined, customerContact: customerContact.trim() || undefined,
        branchId: selectedBranchId ?? undefined, outletId: selectedOutlet?.id,
        items: orderItems, customerType,
        scPwdCustomerInput: customerType === 'REGULAR' ? undefined : { ...scPwdData, customerType },
        discountType: customerType === 'REGULAR' ? 'NONE' : discountType,
        totalPax, scPwdPax,
        extraCharges: charges.map(({ label, amount }) => ({ label: label.trim(), amount: Number(amount) })),
        deliveryAddress: deliveryAddress.trim() || undefined, deliveryNotes: deliveryNotes.trim() || undefined,
        subtotal: totals.subtotal, discountAmount: totals.discountAmount,
        vatAmount: totals.vatAmount, total: totals.grandTotal, vatRate: 0.12,
      });
      onCreated(created);
      if (print === 'receipt') await PrinterService.printSalesOrderReceipt(created);
      if (print === 'invoice') await PrinterService.printSalesOrderInvoice(created);
      reset(); onClose();
    } finally { setSaving(false); }
  };

  const attemptClose = () => { setBranchPickerOpen(false); setCustomItemOpen(false); reset(); onClose(); };

  function ErrorText({ text }: { text: string }) {
    return <Text style={styles.errorText}>{text}</Text>;
  }

  function field(c: any, error?: string) {
    return { borderWidth: 1, borderColor: error ? '#EF4444' : c.border, backgroundColor: c.background, color: c.text, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 10 };
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={attemptClose}>
      <View style={styles.createOverlay}>
        <View style={[styles.createSheet, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { paddingHorizontal: 16, borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
            <Text style={[styles.title, { color: colors.text }]}>New Sales Order</Text>
            <TouchableOpacity onPress={attemptClose}><X color={colors.textSecondary} /></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 18, paddingBottom: 32 }}>
            <FormSection title="Order Type">
              <Text style={{ color: colors.textSecondary }}>How is the customer receiving this order?</Text>
              <View style={styles.modeRow}>
                {(['WALK_IN', 'PICK_UP', 'DELIVERY'] as OrderMode[]).map((mode) => (
                  <TouchableOpacity key={mode} onPress={() => setOrderMode(mode)}
                    style={[styles.modeButton, { borderColor: MODE_COLORS[mode], backgroundColor: orderMode === mode ? MODE_COLORS[mode] : colors.card }]}>
                    <Text style={{ color: orderMode === mode ? '#fff' : MODE_COLORS[mode], fontWeight: '800' }}>
                      {mode === 'WALK_IN' ? '🏪 ' : mode === 'PICK_UP' ? '📦 ' : '🚚 '}{MODE_LABELS[mode]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={{ color: colors.textSecondary }}>{MODE_DESCRIPTIONS[orderMode]}</Text>
              {orderMode !== 'WALK_IN' && (<>
                <TextInput style={field(colors, errors.customerName)} placeholder="Customer Name" placeholderTextColor={colors.textSecondary} value={customerName} onChangeText={setCustomerName} />
                {errors.customerName ? <ErrorText text={errors.customerName} /> : null}
              </>)}
              {orderMode !== 'WALK_IN' && (<>
                <TextInput style={field(colors, errors.customerContact)} placeholder="Contact Number" placeholderTextColor={colors.textSecondary} value={customerContact} onChangeText={setCustomerContact} keyboardType="phone-pad" />
                {errors.customerContact ? <ErrorText text={errors.customerContact} /> : null}
              </>)}
              {orderMode === 'DELIVERY' && (<>
                <TextInput style={[field(colors, errors.deliveryAddress), styles.textArea]} placeholder="Delivery Address" placeholderTextColor={colors.textSecondary} value={deliveryAddress} onChangeText={setDeliveryAddress} multiline />
                {errors.deliveryAddress ? <ErrorText text={errors.deliveryAddress} /> : null}
                <TextInput style={[field(colors), styles.textArea]} placeholder="e.g. Leave at gate, call on arrival" placeholderTextColor={colors.textSecondary} value={deliveryNotes} onChangeText={setDeliveryNotes} multiline />
              </>)}
            </FormSection>

            <FormSection title="Branch & Outlet (Optional)">
              <Text style={{ color: colors.textSecondary }}>Select a branch or outlet to scope available items. Leave both empty to show organization-wide items.</Text>
              <View style={{ gap: 10, paddingTop: 10 }}>
                <TouchableOpacity onPress={() => setBranchPickerOpen(true)} style={[styles.secondaryButton, { borderColor: colors.primary, alignSelf: 'flex-start' }]}>
                  <Text style={[styles.secondaryText, { color: colors.primary }]}>Choose Branch / Outlet</Text>
                </TouchableOpacity>
                <Text style={{ color: colors.text, fontWeight: '700' }}>
                  {selectedBranchId ? `Branch: ${branches.find((b) => b.id === selectedBranchId)?.name ?? 'Selected branch'}` : 'Branch: All branches'}
                </Text>
                <Text style={{ color: colors.textSecondary }}>{selectedOutlet ? `Outlet: ${selectedOutlet.name}` : 'Outlet: All outlets'}</Text>
              </View>
            </FormSection>

            <Modal visible={branchPickerOpen} transparent animationType="fade" onRequestClose={() => setBranchPickerOpen(false)}>
              <View style={styles.overlay}>
                <View style={[styles.itemPickerSheet, { backgroundColor: colors.card }]}>
                  <View style={styles.modalHeader}>
                    <View>
                      <Text style={[styles.title, { color: colors.text }]}>Choose Branch / Outlet</Text>
                      <Text style={{ color: colors.textSecondary }}>Select the branch first, then pick an outlet.</Text>
                    </View>
                    <TouchableOpacity onPress={() => setBranchPickerOpen(false)}><X color={colors.textSecondary} /></TouchableOpacity>
                  </View>
                  <ScrollView contentContainerStyle={{ gap: 12, padding: 16 }}>
                    <TouchableOpacity onPress={() => { setSelectedBranchId(null); setSelectedOutlet(null); setBranchPickerOpen(false); }}
                      style={[styles.choiceCard, { borderColor: colors.border, backgroundColor: colors.background }]}>
                      <Text style={[styles.choiceTitle, { color: colors.text }]}>All Branches</Text>
                      <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Show all organization items</Text>
                    </TouchableOpacity>
                    {branches.map((branch) => (
                      <TouchableOpacity key={branch.id} onPress={() => { setSelectedBranchId(branch.id); setSelectedOutlet(null); setBranchPickerOpen(false); }}
                        style={[styles.choiceCard, { borderColor: colors.border, backgroundColor: colors.background }]}>
                        <Text style={[styles.choiceTitle, { color: colors.text }]}>{branch.name}</Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 12 }} numberOfLines={1}>{branch.address}</Text>
                      </TouchableOpacity>
                    ))}
                    {selectedBranchId ? (
                      <View style={{ gap: 8, marginTop: 16 }}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Outlets in branch</Text>
                        <TouchableOpacity onPress={() => { setSelectedOutlet(null); setBranchPickerOpen(false); }}
                          style={[styles.choiceCard, { borderColor: colors.border, backgroundColor: colors.background }]}>
                          <Text style={[styles.choiceTitle, { color: colors.text }]}>All Outlets</Text>
                          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Show items for the selected branch</Text>
                        </TouchableOpacity>
                        {outlets.map((outlet) => (
                          <TouchableOpacity key={outlet.id} onPress={() => { setSelectedOutlet(outlet); setBranchPickerOpen(false); }}
                            style={[styles.choiceCard, { borderColor: colors.border, backgroundColor: colors.background }]}>
                            <Text style={[styles.choiceTitle, { color: colors.text }]}>{outlet.name}</Text>
                            <Text style={{ color: colors.textSecondary, fontSize: 12 }} numberOfLines={1}>{outlet.address}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    ) : null}
                  </ScrollView>
                </View>
              </View>
            </Modal>

            <FormSection title="Items">
              <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                <TouchableOpacity style={[styles.secondaryButton, { borderColor: colors.primary, alignSelf: 'flex-start' }]} onPress={() => { setItemPickerOpen(true); loadItems(); }}>
                  <Search size={16} color={colors.primary} /><Text style={[styles.secondaryText, { color: colors.primary }]}>Select Items</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.secondaryButton, { borderColor: colors.primary, alignSelf: 'flex-start' }]} onPress={() => setCustomItemOpen(true)}>
                  <Plus size={16} color={colors.primary} /><Text style={[styles.secondaryText, { color: colors.primary }]}>Add Custom Item</Text>
                </TouchableOpacity>
              </View>
              {errors.items ? <ErrorText text={errors.items} /> : null}
              {cart.map((entry) => (
                <View key={entry.key} style={[styles.itemLine, { borderColor: colors.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontWeight: '700' }}>{entry.item.item.name}</Text>
                    <Text style={{ color: colors.textSecondary }}>{money(entry.item.price)} · {money(entry.item.price * entry.quantity)}</Text>
                  </View>
                  <TouchableOpacity onPress={() => updateQty(entry.key, entry.quantity - 1)} style={styles.qtyBtn}><Text>-</Text></TouchableOpacity>
                  <Text style={{ color: colors.text, width: 28, textAlign: 'center' }}>{entry.quantity}</Text>
                  <TouchableOpacity onPress={() => updateQty(entry.key, entry.quantity + 1)} style={styles.qtyBtn}><Text>+</Text></TouchableOpacity>
                </View>
              ))}
              <Text style={{ color: colors.text, fontWeight: '800' }}>Subtotal: {money(totals.subtotal)}</Text>
            </FormSection>

            <FormSection title="Extra Charges (Optional)">
              {charges.map((charge, index) => (
                <View key={charge.key} style={{ gap: 6 }}>
                  <View style={styles.chargeRow}>
                    <TextInput style={[field(colors, errors[`chargeLabel${index}`]), { flex: 1 }]} placeholder="Delivery Fee" placeholderTextColor={colors.textSecondary} value={charge.label}
                      onChangeText={(label) => setCharges((prev) => prev.map((c) => c.key === charge.key ? { ...c, label } : c))} />
                    <TextInput style={[field(colors, errors[`chargeAmount${index}`]), { width: 110 }]} placeholder="₱ Amount" placeholderTextColor={colors.textSecondary} value={String(charge.amount)}
                      onChangeText={(amount) => setCharges((prev) => prev.map((c) => c.key === charge.key ? { ...c, amount: Number(amount) || 0 } : c))} keyboardType="decimal-pad" />
                    <TouchableOpacity onPress={() => setCharges((prev) => prev.filter((c) => c.key !== charge.key))}><X color="#EF4444" /></TouchableOpacity>
                  </View>
                  {errors[`chargeLabel${index}`] ? <ErrorText text={errors[`chargeLabel${index}`]} /> : null}
                  {errors[`chargeAmount${index}`] ? <ErrorText text={errors[`chargeAmount${index}`]} /> : null}
                </View>
              ))}
              <TouchableOpacity style={[styles.secondaryButton, { borderColor: colors.primary }]}
                onPress={() => setCharges((prev) => [...prev, { key: String(Date.now()), label: '', amount: 0 }])}>
                <Plus size={16} color={colors.primary} /><Text style={[styles.secondaryText, { color: colors.primary }]}>Add Extra Charge</Text>
              </TouchableOpacity>
              {charges.length > 0 && <Text style={{ color: colors.text, fontWeight: '800' }}>Extra Charges Total: {money(totals.extraChargesTotal)}</Text>}
            </FormSection>

            <FormSection title="Customer Type & Discount">
              <ScPwdCustomerForm
                customerType={customerType} onCustomerTypeChange={setCustomerType}
                scPwdData={scPwdData} onScPwdDataChange={setScPwdData}
                discountType={discountType} onDiscountTypeChange={setDiscountType}
                showDiscountSelector={false} totalPax={totalPax} scPwdPax={scPwdPax}
                onPaxChange={(nextTotal, nextScPwd) => { setTotalPax(Math.max(1, nextTotal)); setScPwdPax(Math.min(Math.max(1, nextScPwd), Math.max(1, nextTotal))); }}
              />
              {customerType !== 'REGULAR' && (
                <View style={styles.discountToggleRow}>
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.discountToggleLabel, { color: colors.text }]}>Apply 5% BNPC Discount</Text>
                  </View>
                  <Switch value={applyBnpcDiscount} onValueChange={setApplyBnpcDiscount} disabled={discountStatus?.capRemaining === 0} />
                </View>
              )}
              {customerType !== 'REGULAR' && <Text style={[styles.discountStatusText, { color: colors.textSecondary }]}>Toggle off to disable BNPC discount even when weekly cap remains.</Text>}
              {customerType !== 'REGULAR' && (
                <Text style={[styles.discountStatusText, { color: discountStatus?.capRemaining === 0 ? '#B91C1C' : '#047857' }]}>
                  {isLoadingDiscountStatus ? 'Checking BNPC weekly status…'
                    : discountStatus ? (discountStatus.capRemaining > 0 ? `BNPC discount remaining: ₱${discountStatus.capRemaining.toFixed(2)} this week.` : 'BNPC discount capped. Only 20% VAT-exempt medical discount applies.')
                      : discountStatusError ? discountStatusError : 'Enter a valid OSCA ID to load BNPC weekly status.'}
                </Text>
              )}
              {errors.scPwdName ? <ErrorText text={errors.scPwdName} /> : null}
              {errors.scPwdId ? <ErrorText text={errors.scPwdId} /> : null}
            </FormSection>

            <FormSection title="Order Summary">
              <TotalLine label="Gross Sales (VAT Included)" value={totals.subtotal} />
              {totals.extraChargesTotal > 0 && <TotalLine label="Extra Charges" value={totals.extraChargesTotal} prefix="+" />}
              {customerType !== 'REGULAR' ? <TotalLine label="VAT Exempt Sale" value={totals.vatExemptSale} /> : null}
              <TotalLine label="VATable Sale" value={totals.vatableSale ?? Math.max(0, totals.subtotal - totals.vatExemptSale - totals.vatAmount)} />
              <TotalLine label="VAT (12%)" value={totals.vatAmount} />
              {totals.discountAmount > 0 && <TotalLine label="Automatic item discounts" value={totals.discountAmount} prefix="-" />}
              {totals.bnpcCapReached && <Text style={[styles.capNotice, { color: '#047857', borderColor: '#10B981' }]}>BNPC cap reached - applying 20% VAT-exempt discount.</Text>}
              <TotalLine label="GRAND TOTAL" value={totals.grandTotal} strong />
            </FormSection>

            <View style={styles.footerActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={attemptClose}><Text>Cancel</Text></TouchableOpacity>
              {(['none', 'receipt', 'invoice'] as PrintAction[]).map((action) => (
                <TouchableOpacity key={action} disabled={saving} style={[styles.primaryButton, { backgroundColor: colors.primary, flex: 1 }]} onPress={() => save(action)}>
                  {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>{action === 'none' ? 'Save Order' : action === 'receipt' ? 'Save & Print Receipt' : 'Save & Print Invoice'}</Text>}
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <Modal visible={itemPickerOpen} transparent animationType="fade" onRequestClose={() => setItemPickerOpen(false)}>
            <View style={styles.overlay}>
              <View style={[styles.itemPickerSheet, { backgroundColor: colors.card }]}>
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={[styles.title, { color: colors.text }]}>Select Items</Text>
                    <Text style={{ color: colors.textSecondary }}>{selectedOutlet ? selectedOutlet.name : 'All organization items'}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setItemPickerOpen(false)}><X color={colors.textSecondary} /></TouchableOpacity>
                </View>
                <View style={[styles.searchBox, { borderColor: colors.border, backgroundColor: colors.background }]}>
                  <Search size={16} color={colors.textSecondary} />
                  <TextInput style={{ flex: 1, color: colors.text }} placeholder="Search items" placeholderTextColor={colors.textSecondary} value={search} onChangeText={setSearch} onSubmitEditing={loadItems} />
                  <TouchableOpacity onPress={loadItems}><RefreshCcw size={16} color={colors.primary} /></TouchableOpacity>
                </View>
                <FlatList data={items} keyExtractor={(item) => String(item.id)} contentContainerStyle={{ gap: 8, paddingBottom: 16 }}
                  ListEmptyComponent={<Text style={{ color: colors.textSecondary, textAlign: 'center', padding: 24 }}>No items found.</Text>}
                  renderItem={({ item }) => (
                    <TouchableOpacity onPress={() => addItem(item)} style={[styles.pickerItemRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
                      <Package size={18} color={colors.primary} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontWeight: '800' }}>{item.item.name}</Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                          Stock: {item.quantity ?? 0}{item.inventory?.outlet?.name ? ` · ${item.inventory.outlet.name}` : ''}
                          {item.item.vatRate && <Text style={{ color: colors.success, fontWeight: 'bold', backgroundColor: colors.surface, borderRadius: 4, padding: 4 }}>Vat Inclusive</Text>}
                        </Text>
                      </View>
                      <Text style={{ color: colors.accent, fontWeight: '900' }}>{money(item.price)}</Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            </View>
          </Modal>

          <Modal visible={customItemOpen} transparent animationType="fade" onRequestClose={() => setCustomItemOpen(false)}>
            <View style={styles.overlay}>
              <View style={[styles.itemPickerSheet, { backgroundColor: colors.card }]}>
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={[styles.title, { color: colors.text }]}>Add Custom Item</Text>
                    <Text style={{ color: colors.textSecondary }}>Enter a custom order item and price for this sales order.</Text>
                  </View>
                  <TouchableOpacity onPress={() => setCustomItemOpen(false)}><X color={colors.textSecondary} /></TouchableOpacity>
                </View>
                <ScrollView contentContainerStyle={{ gap: 12, padding: 16 }}>
                  <TextInput style={field(colors, errors.customItemName)} placeholder="Item name" placeholderTextColor={colors.textSecondary} value={customItemName} onChangeText={setCustomItemName} />
                  {errors.customItemName ? <ErrorText text={errors.customItemName} /> : null}
                  <TextInput style={field(colors, errors.customItemPrice)} placeholder="Unit price" placeholderTextColor={colors.textSecondary} value={customItemPrice} onChangeText={setCustomItemPrice} keyboardType="decimal-pad" />
                  {errors.customItemPrice ? <ErrorText text={errors.customItemPrice} /> : null}
                  <TextInput style={field(colors, errors.customItemQuantity)} placeholder="Quantity" placeholderTextColor={colors.textSecondary} value={customItemQuantity} onChangeText={setCustomItemQuantity} keyboardType="decimal-pad" />
                  {errors.customItemQuantity ? <ErrorText text={errors.customItemQuantity} /> : null}
                  <TouchableOpacity style={[styles.secondaryButton, { borderColor: colors.primary }]} onPress={() => setCustomItemVatExempt((prev) => !prev)}>
                    <Text style={[styles.secondaryText, { color: colors.primary }]}>VAT Exempt: {customItemVatExempt ? 'Yes' : 'No'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.primary }]} onPress={addCustomItem}>
                    <Text style={styles.primaryButtonText}>Add Item</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </View>
          </Modal>
        </View>
      </View>
    </Modal>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      {children}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FilterDropdown — updated to use inline positioning (no Modal) for cleaner UX
// ─────────────────────────────────────────────────────────────────────────────
interface DropdownOption { label: string; value: string; color?: string; }

function FilterDropdown({ label, value, accentColor, options, onSelect }: {
  label: string; value: string; accentColor: string;
  options: DropdownOption[]; onSelect: (value: string) => void;
}) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<View>(null);
  const { isMobile } = useBreakpoint();

  const openMenu = () => {
    if (Platform.OS === 'web' && triggerRef.current) {
      // @ts-ignore — web only
      const rect = (triggerRef.current as any).getBoundingClientRect?.();
      if (rect) {
        setMenuPos({ top: rect.bottom + 4, left: rect.left });
      }
    }
    setOpen(true);
  };

  const menu = open && menuPos && (
    <View
      style={{
        position: 'fixed' as any,
        top: menuPos.top,
        left: menuPos.left,
        minWidth: 220,
        zIndex: 99999,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 99999,
      }}
    >
      <Text style={[styles.dropdownMenuLabel, { color: colors.textSecondary }]}>{label}</Text>
      {options.map((opt, i) => {
        const isActive = opt.label === value || opt.value === value;
        const dotColor = opt.color ?? accentColor;
        return (
          <TouchableOpacity
            key={opt.value}
            onPress={() => { onSelect(opt.value); setOpen(false); }}
            style={[
              styles.dropdownItem,
              isActive && { backgroundColor: dotColor + '18' },
              i < options.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
            ]}
          >
            <View style={[styles.dropdownItemDot, { backgroundColor: isActive ? dotColor : 'transparent', borderColor: dotColor }]} />
            <Text style={[styles.dropdownItemText, { color: isActive ? dotColor : colors.text }, isActive && { fontWeight: '800' }]}>
              {opt.label}
            </Text>
            {isActive && (
              <View style={[styles.dropdownCheck, { backgroundColor: dotColor }]}>
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900' }}>✓</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <View style={[styles.dropdownWrapper, { maxWidth: isMobile ? 80 : 100, minWidth: isMobile ? 80 : 100 }]}>
      <TouchableOpacity
        ref={triggerRef}
        onPress={openMenu}
        style={[styles.dropdownTrigger, { borderColor: accentColor, backgroundColor: colors.card }]}
        activeOpacity={0.8}
      >
        <View style={[styles.dropdownDot, { backgroundColor: accentColor }]} />
        <Text style={[styles.dropdownTriggerText, { color: colors.text, fontSize: isMobile ? 10 : 12 }]} numberOfLines={1}>
          {value}
        </Text>
        <ChevronDown size={14} color={accentColor} />
      </TouchableOpacity>

      {open && (
        <Pressable
          style={{ position: 'fixed' as any, top: 0, left: 0, right: 0, bottom: 0, zIndex: 99998 }}
          onPress={() => setOpen(false)}
        />
      )}

      {/* Portal the menu to document.body so it escapes all stacking contexts */}
      {Platform.OS === 'web' && open && menu
        ? createPortal(menu, document.body)
        : menu}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Desktop Table Row
// ─────────────────────────────────────────────────────────────────────────────
const TableRow = React.memo(({ item, index, colors, onView, onUpdateStatus, onPrintReceipt, onPrintInvoice }: {
  item: SalesOrder; index: number; colors: any;
  onView: (o: SalesOrder) => void; onUpdateStatus: (o: SalesOrder) => void;
  onPrintReceipt: (o: SalesOrder) => void; onPrintInvoice: (o: SalesOrder) => void;
}) => {
  const [hovered, setHovered] = useState(false);
  const rowBg = hovered ? (colors.hover ?? '#F1F5F9') : index % 2 === 0 ? colors.card : (colors.surface ?? colors.background);

  return (
    <Pressable
      // @ts-ignore
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={[styles.tableRow, { backgroundColor: rowBg, borderBottomColor: colors.border }]}
    >
      {/* Order # */}
      <View style={[styles.tableCell, { flex: 1.1, minWidth: 110 }]}>
        <Text style={[styles.orderNumberCell, { color: colors.primary }]}>{item.orderNumber}</Text>
      </View>
      {/* Customer */}
      <View style={[styles.tableCell, { flex: 1.8, minWidth: 140 }]}>
        <Text style={[styles.customerCell, { color: colors.text }]} numberOfLines={1}>
          {item.customerName || item.customer || 'Walk-in Customer'}
        </Text>
        {item.customerType !== 'REGULAR' && (
          <View style={{ marginTop: 3 }}>
            <ScPwdBadge type={item.customerType as CustomerType} />
          </View>
        )}
      </View>
      {/* Date */}
      <View style={[styles.tableCell, { flex: 1.4, minWidth: 130 }]}>
        <Text style={[styles.dateCellText, { color: colors.textSecondary }]}>
          {new Date(item.date).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
        </Text>
      </View>
      {/* Status */}
      <View style={[styles.tableCell, { flex: 1.4, minWidth: 130 }]}>
        <StatusBadge status={item.status} />
      </View>
      {/* Mode */}
      <View style={[styles.tableCell, { flex: 0.9, minWidth: 90 }]}>
        <ModeBadge mode={item.orderMode} />
      </View>
      {/* Items */}
      <View style={[styles.tableCell, { flex: 0.5, minWidth: 50, alignItems: 'center' }]}>
        <Text style={[styles.dateCellText, { color: colors.textSecondary }]}>{item.items?.length ?? 0}</Text>
      </View>
      {/* Amount */}
      <View style={[styles.tableCell, { flex: 1.1, minWidth: 100, alignItems: 'flex-end' }]}>
        <Text style={[styles.amountCell, { color: colors.accent ?? '#059669' }]}>
          {money(item.grandTotal || item.total)}
        </Text>
      </View>
      {/* Actions */}
      <View style={[styles.tableCell, { flex: 1.6, minWidth: 200, alignItems: 'flex-end' }]}>
        <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <TouchableOpacity onPress={() => onView(item)} style={[styles.tableActionBtn, { borderColor: colors.primary, backgroundColor: colors.primary + '15' }]}>
            <Eye size={13} color={colors.primary} />
            <Text style={[styles.tableActionText, { color: colors.primary }]}>View</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onUpdateStatus(item)} style={[styles.tableActionBtn, { borderColor: colors.border }]}>
            <RefreshCcw size={13} color={colors.textSecondary} />
            <Text style={[styles.tableActionText, { color: colors.textSecondary }]}>Status</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onPrintReceipt(item)} style={[styles.tableActionBtn, { borderColor: colors.border }]}>
            <Printer size={13} color={colors.textSecondary} />
            <Text style={[styles.tableActionText, { color: colors.textSecondary }]}>Receipt</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onPrintInvoice(item)} style={[styles.tableActionBtn, { borderColor: colors.border }]}>
            <FileText size={13} color={colors.textSecondary} />
            <Text style={[styles.tableActionText, { color: colors.textSecondary }]}>Invoice</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Pressable>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Mobile / Tablet Card
// ─────────────────────────────────────────────────────────────────────────────
const OrderCard = React.memo(({ item, isTablet, colors, onView, onUpdateStatus, onPrintReceipt, onPrintInvoice }: {
  item: SalesOrder; isTablet: boolean; colors: any;
  onView: (o: SalesOrder) => void; onUpdateStatus: (o: SalesOrder) => void;
  onPrintReceipt: (o: SalesOrder) => void; onPrintInvoice: (o: SalesOrder) => void;
}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  if (isTablet) {
    return (
      <View style={[styles.tabletCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Text style={[styles.cardCustomerName, { color: colors.text }]} numberOfLines={1}>
              {item.customerName || item.customer || 'Walk-in Customer'}
            </Text>
            <ScPwdBadge type={item.customerType as CustomerType} />
          </View>
          <Text style={[styles.cardOrderNumber, { color: colors.primary }]}>{item.orderNumber}</Text>
          <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
            {new Date(item.date).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })} · {item.items?.length ?? 0} item(s)
          </Text>
          <View style={{ flexDirection: 'row', gap: 5, flexWrap: 'wrap', marginTop: 2 }}>
            <StatusBadge status={item.status} />
            <ModeBadge mode={item.orderMode} />
          </View>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 10, justifyContent: 'space-between' }}>
          <Text style={[styles.cardAmount, { color: colors.accent ?? '#059669' }]}>
            {money(item.grandTotal || item.total)}
          </Text>
          <View style={{ flexDirection: 'row', gap: 5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <TouchableOpacity onPress={() => onView(item)} style={[styles.tableActionBtn, { borderColor: colors.primary, backgroundColor: colors.primary + '15' }]}>
              <Eye size={13} color={colors.primary} />
              <Text style={[styles.tableActionText, { color: colors.primary }]}>View</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onUpdateStatus(item)} style={[styles.tableActionBtn, { borderColor: colors.border }]}>
              <RefreshCcw size={13} color={colors.textSecondary} />
              <Text style={[styles.tableActionText, { color: colors.textSecondary }]}>Status</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onPrintReceipt(item)} style={[styles.tableActionBtn, { borderColor: colors.border }]}>
              <Printer size={13} color={colors.textSecondary} />
              <Text style={[styles.tableActionText, { color: colors.textSecondary }]}>Receipt</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onPrintInvoice(item)} style={[styles.tableActionBtn, { borderColor: colors.border }]}>
              <FileText size={13} color={colors.textSecondary} />
              <Text style={[styles.tableActionText, { color: colors.textSecondary }]}>Invoice</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Mobile
  return (
    <View style={[styles.mobileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardCustomerName, { color: colors.text }]} numberOfLines={1}>
            {item.customerName || item.customer || 'Walk-in Customer'}
          </Text>
          <Text style={[styles.cardOrderNumber, { color: colors.primary }]}>{item.orderNumber}</Text>
        </View>
        <Text style={[styles.cardAmount, { color: colors.accent ?? '#059669' }]}>
          {money(item.grandTotal || item.total)}
        </Text>
      </View>
      <Text style={[styles.cardMeta, { color: colors.textSecondary, marginTop: 2 }]}>
        {new Date(item.date).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })} · {item.items?.length ?? 0} item(s)
      </Text>
      <View style={{ flexDirection: 'row', gap: 5, flexWrap: 'wrap', marginTop: 6 }}>
        <StatusBadge status={item.status} size="sm" />
        <ModeBadge mode={item.orderMode} size="sm" />
        <ScPwdBadge type={item.customerType as CustomerType} />
      </View>
      <View style={{ borderTopWidth: 1, borderTopColor: colors.border, marginTop: 10, paddingTop: 8, flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
        <TouchableOpacity onPress={() => onView(item)} style={[styles.tableActionBtn, { borderColor: colors.primary, backgroundColor: colors.primary + '15' }]}>
          <Eye size={13} color={colors.primary} />
          <Text style={[styles.tableActionText, { color: colors.primary }]}>View</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onUpdateStatus(item)} style={[styles.tableActionBtn, { borderColor: colors.border }]}>
          <RefreshCcw size={13} color={colors.textSecondary} />
          <Text style={[styles.tableActionText, { color: colors.textSecondary }]}>Status</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onPrintReceipt(item)} style={[styles.tableActionBtn, { borderColor: colors.border }]}>
          <Printer size={13} color={colors.textSecondary} />
          <Text style={[styles.tableActionText, { color: colors.textSecondary }]}>Receipt</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onPrintInvoice(item)} style={[styles.tableActionBtn, { borderColor: colors.border }]}>
          <FileText size={13} color={colors.textSecondary} />
          <Text style={[styles.tableActionText, { color: colors.textSecondary }]}>Invoice</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Main SalesScreen
// ─────────────────────────────────────────────────────────────────────────────
export default function SalesScreen() {
  const { colors } = useTheme();
  const { isMobile, isTablet, isDesktop } = useBreakpoint();

  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [modeFilter, setModeFilter] = useState<ModeFilter>('All');
  const [dateFilter, setDateFilter] = useState<DateFilter>('All');
  const [customStart, setCustomStart] = useState<Date | null>(null);
  const [customEnd, setCustomEnd] = useState<Date | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [statusOrder, setStatusOrder] = useState<SalesOrder | null>(null);
  const [detailOrder, setDetailOrder] = useState<SalesOrder | null>(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    const range = dateRange(dateFilter, customStart, customEnd);
    try {
      const result = await SalesOrderService.getSalesOrders({
        status: statusFilter === 'All' ? undefined : statusFilter,
        orderMode: modeFilter === 'All' ? undefined : modeFilter,
        startDate: range.startDate,
        endDate: range.endDate,
        customerName: query || undefined,
      });
      setOrders(result);
    } finally {
      setLoading(false);
    }
  }, [customEnd, customStart, dateFilter, modeFilter, query, statusFilter]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return orders.filter((order) => {
      if (!term) return true;
      return (
        order.orderNumber.toLowerCase().includes(term) ||
        (order.customerName ?? order.customer ?? '').toLowerCase().includes(term)
      );
    });
  }, [orders, query]);

  const patch = (order: SalesOrder) => {
    setOrders((prev) => prev.map((e) => (e.id === order.id ? order : e)));
    setDetailOrder((current) => (current?.id === order.id ? order : current));
  };

  const handleView = useCallback((o: SalesOrder) => setDetailOrder(o), []);
  const handleUpdateStatus = useCallback((o: SalesOrder) => setStatusOrder(o), []);
  const handlePrintReceipt = useCallback((o: SalesOrder) => PrinterService.printSalesOrderReceipt(o), []);
  const handlePrintInvoice = useCallback((o: SalesOrder) => PrinterService.printSalesOrderInvoice(o), []);

  const renderCard = useCallback(({ item, index }: { item: SalesOrder; index: number }) => {
    if (isDesktop) {
      return (
        <TableRow
          item={item} index={index} colors={colors}
          onView={handleView} onUpdateStatus={handleUpdateStatus}
          onPrintReceipt={handlePrintReceipt} onPrintInvoice={handlePrintInvoice}
        />
      );
    }
    return (
      <OrderCard
        item={item} isTablet={isTablet} colors={colors}
        onView={handleView} onUpdateStatus={handleUpdateStatus}
        onPrintReceipt={handlePrintReceipt} onPrintInvoice={handlePrintInvoice}
      />
    );
  }, [isDesktop, isTablet, colors, handleView, handleUpdateStatus, handlePrintReceipt, handlePrintInvoice]);

  return (
    <View style={[styles.fullScreen, { backgroundColor: colors.background }]}>
      {/* ── Toolbar: Search + Filters + New Order ── */}
      <View style={[styles.topBar, { flexDirection: isMobile ? 'column' : 'row', gap: 8 }]}>
        {/* Row 1: search (always full width) */}
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', flex: 1 }}>
          <View style={[
            styles.searchBox,
            { borderColor: colors.border, backgroundColor: colors.card, flex: 1 },
            isTablet && { maxWidth: 600 },  // ← raise from 380 to whatever you want
          ]}>
            <Search size={16} color={colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search by order # or customer name"
              placeholderTextColor={colors.textSecondary}
              value={query}
              onChangeText={setQuery}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')}>
                <X size={14} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Row 2: filters (+ new-order button on mobile) */}
        <View style={[styles.dropdownRow, { flexWrap: 'wrap' }]}>
          <FilterDropdown
            label="Status"
            value={statusFilter === 'All' ? 'Status' : STATUS_LABELS[statusFilter as SalesOrderStatus]}
            accentColor={statusFilter === 'All' ? colors.primary : STATUS_COLORS[statusFilter as SalesOrderStatus]}
            options={[{ label: 'All Statuses', value: 'All' }, ...STATUSES.map((s) => ({ label: STATUS_LABELS[s], value: s, color: STATUS_COLORS[s] }))]}
            onSelect={(v) => setStatusFilter(v as StatusFilter)}
          />
          <FilterDropdown
            label="Mode"
            value={modeFilter === 'All' ? 'Modes' : MODE_LABELS[modeFilter as OrderMode]}
            accentColor={modeFilter === 'All' ? colors.primary : MODE_COLORS[modeFilter as OrderMode]}
            options={[{ label: 'All Modes', value: 'All' }, ...(['WALK_IN', 'PICK_UP', 'DELIVERY'] as OrderMode[]).map((m) => ({ label: MODE_LABELS[m], value: m, color: MODE_COLORS[m] }))]}
            onSelect={(v) => setModeFilter(v as ModeFilter)}
          />
          <FilterDropdown
            label="Date"
            value={dateFilter === 'Custom Range' && customStart && customEnd
              ? `${formatShortDate(customStart)} → ${formatShortDate(customEnd)}`
              : dateFilter === 'All' ? 'Date' : dateFilter}
            accentColor={colors.primary}
            options={[
              { label: 'Any Date', value: 'All' },
              { label: 'Today', value: 'Today' },
              { label: 'This Week', value: 'This Week' },
              { label: 'Custom Range…', value: 'Custom Range' },
            ]}
            onSelect={(v) => { setDateFilter(v as DateFilter); if (v === 'Custom Range') setDatePickerOpen(true); }}
          />

          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: colors.primary, marginLeft: 'auto' as any }]}
            onPress={() => setCreateOpen(true)}
          >
            <Plus color="#fff" />
          </TouchableOpacity>


        </View>
      </View>

      {/* Custom date range picker */}
      <DateRangePickerModal
        visible={datePickerOpen}
        onClose={() => setDatePickerOpen(false)}
        initialStart={customStart ?? undefined}
        initialEnd={customEnd ?? undefined}
        onApply={(start, end) => { setCustomStart(start); setCustomEnd(end); setDateFilter('Custom Range'); }}
      />

      {/* ── Order list / table ── */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
          <Text style={{ color: colors.textSecondary, marginTop: 8 }}>Loading sales orders…</Text>
        </View>
      ) : (
        <>
          {/* Desktop table header — rendered outside FlatList so it's sticky */}
          {isDesktop && (
            <View style={[styles.tableHeader, { backgroundColor: colors.background, borderBottomColor: colors.border, borderTopColor: colors.border }]}>
              <View style={{ flex: 1.1, minWidth: 110 }}><Text style={[styles.tableHeaderText, { color: colors.textSecondary }]}>ORDER #</Text></View>
              <View style={{ flex: 1.8, minWidth: 140 }}><Text style={[styles.tableHeaderText, { color: colors.textSecondary }]}>CUSTOMER</Text></View>
              <View style={{ flex: 1.4, minWidth: 130 }}><Text style={[styles.tableHeaderText, { color: colors.textSecondary }]}>DATE</Text></View>
              <View style={{ flex: 1.4, minWidth: 130 }}><Text style={[styles.tableHeaderText, { color: colors.textSecondary }]}>STATUS</Text></View>
              <View style={{ flex: 0.9, minWidth: 90 }}><Text style={[styles.tableHeaderText, { color: colors.textSecondary }]}>MODE</Text></View>
              <View style={{ flex: 0.5, minWidth: 50, alignItems: 'center' }}><Text style={[styles.tableHeaderText, { color: colors.textSecondary }]}>ITEMS</Text></View>
              <View style={{ flex: 1.1, minWidth: 100, alignItems: 'flex-end' }}><Text style={[styles.tableHeaderText, { color: colors.textSecondary }]}>AMOUNT</Text></View>
              <View style={{ flex: 1.6, minWidth: 200, alignItems: 'flex-end' }}><Text style={[styles.tableHeaderText, { color: colors.textSecondary }]}>ACTIONS</Text></View>
            </View>
          )}

          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            renderItem={renderCard}
            contentContainerStyle={isDesktop
              ? { paddingBottom: 40 }
              : { padding: isMobile ? 12 : 16, gap: isMobile ? 8 : 10, paddingBottom: 40 }
            }
            style={isDesktop ? { flex: 1 } : { flex: 1 }}
            ListEmptyComponent={
              <View style={styles.center}>
                <Text style={{ fontSize: 36, marginBottom: 8 }}>📄</Text>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>No orders found</Text>
                <Text style={{ color: colors.textSecondary, marginTop: 4 }}>Try adjusting filters or create a new order.</Text>
              </View>
            }
            maxToRenderPerBatch={15}
            windowSize={10}
          />
        </>
      )}
      {isMobile && (
        <TouchableOpacity
          onPress={() => setCreateOpen(true)}
          style={[
            styles.fab,
            { backgroundColor: colors.primary }
          ]}
        >
          <Plus size={24} color="#fff" />
        </TouchableOpacity>
      )}
      <CreateOrderModal
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(order) => setOrders((prev) => [order, ...prev])}
      />
      <StatusModal order={statusOrder} onClose={() => setStatusOrder(null)} onUpdated={patch} />
      <DetailModal order={detailOrder} onClose={() => setDetailOrder(null)} />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  fullScreen: { flex: 1 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,

    width: 60,
    height: 60,
    borderRadius: 30,

    justifyContent: 'center',
    alignItems: 'center',

    zIndex: 99999,
    elevation: 20,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  // ── Toolbar ──
  topBar: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'transparent', // overridden by theme via backgroundColor
  },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderRadius: 8, paddingHorizontal: 10,
    minHeight: 40, flex: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    ...(Platform.OS === 'web'
      ? ({ outlineStyle: 'none' } as any)
      : {}),
  },
  iconButton: {
    width: 40, height: 40, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },

  // ── Filter dropdown row ──
  dropdownRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    zIndex: 5000,
  },
  dropdownWrapper: {
    position: 'relative',
    minWidth: 100,
    zIndex: 5001,
  },
  dropdownTrigger: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 7,
  },
  dropdownDot: { width: 7, height: 7, borderRadius: 4, flexShrink: 0 },
  dropdownTriggerText: { flex: 1, fontSize: 12, fontWeight: '700' },
  dropdownMenuInline: {
    position: 'absolute',
    top: 44,
    left: 0,

    minWidth: 220,

    zIndex: 99999,
    elevation: 99999,

    borderWidth: 1,
    borderRadius: 10,

    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  dropdownMenuLabel: {
    fontSize: 10, fontWeight: '700', letterSpacing: 0.8,
    textTransform: 'uppercase', paddingHorizontal: 12, paddingVertical: 9,
  },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 11 },
  dropdownItemDot: { width: 9, height: 9, borderRadius: 5, borderWidth: 1.5, flexShrink: 0 },
  dropdownItemText: { flex: 1, fontSize: 13, fontWeight: '500' },
  dropdownCheck: { width: 17, height: 17, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },

  // ── Desktop table ──
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  tableHeaderText: {
    fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    cursor: 'default',
  },
  tableCell: { paddingHorizontal: 4 },
  orderNumberCell: {
    fontSize: 12, fontWeight: '700',
    fontFamily: Platform.select({ web: 'monospace', default: undefined }),
  },
  customerCell: { fontSize: 13, fontWeight: '700' },
  dateCellText: { fontSize: 12 },
  amountCell: { fontSize: 14, fontWeight: '800' },
  tableActionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  tableActionText: { fontSize: 11, fontWeight: '600' },

  // ── Tablet card ──
  tabletCard: {
    borderWidth: 1, borderRadius: 10,
    padding: 16, flexDirection: 'row',
    alignItems: 'flex-start', gap: 14,
  },

  // ── Mobile card ──
  mobileCard: {
    borderWidth: 1, borderRadius: 10, padding: 14,
  },

  cardCustomerName: { fontSize: 15, fontWeight: '800' },
  cardOrderNumber: { fontSize: 11, fontWeight: '600', fontFamily: Platform.select({ web: 'monospace', default: undefined }) },
  cardMeta: { fontSize: 12 },
  cardAmount: { fontSize: 17, fontWeight: '900' },
  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, padding: 40,
  },

  pill: {
    borderWidth: 1, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6,
    minHeight: 34, alignSelf: 'flex-start', justifyContent: 'center',
  },
  pillText: { fontSize: 12, fontWeight: '800' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 18 },
  createOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 18 },
  createSheet: {
    width: '80%', maxWidth: 980,
    minWidth: Math.min(Dimensions.get('window').width - 32, 360),
    maxHeight: '92%', borderRadius: 12, overflow: 'hidden',
  },
  sheet: { borderRadius: 12, padding: 16, maxHeight: 670, gap: 14, maxWidth: 700, alignSelf: 'center' },
  itemPickerSheet: { width: '80%', maxWidth: 860, maxHeight: '82%', alignSelf: 'center', borderRadius: 12, padding: 16, gap: 12 },
  largeSheet: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingBottom: 10 },
  title: { fontSize: 18, fontWeight: '900' },
  section: { borderWidth: 1, borderRadius: 10, padding: 12, gap: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '900' },
  primaryButton: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { color: '#fff', fontWeight: '800', textAlign: 'center' },
  secondaryButton: { borderWidth: 1, borderRadius: 10, padding: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  secondaryText: { fontWeight: '800' },
  cancelButton: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, padding: 12, alignItems: 'center', justifyContent: 'center' },
  modeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  modeButton: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12 },
  textArea: { minHeight: 74, textAlignVertical: 'top' },
  itemLine: { borderWidth: 1, borderRadius: 10, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E5E7EB' },
  pickerItemRow: { borderWidth: 1, borderRadius: 10, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  choiceCard: { borderWidth: 1, borderRadius: 10, padding: 10, minWidth: 150, maxWidth: 220 },
  choiceTitle: { fontSize: 13, fontWeight: '900' },
  chargeRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  footerActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  errorText: { color: '#EF4444', fontSize: 12, fontWeight: '700' },
  capNotice: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 12, fontWeight: '800' },
  discountToggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, paddingVertical: 10 },
  discountToggleLabel: { flex: 1, fontSize: 14, fontWeight: '700' },
  discountStatusText: { marginTop: -5, fontSize: 12, lineHeight: 18 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  flexText: { flex: 1 },
  strong: { fontWeight: '900' },
  grand: { fontSize: 18, fontWeight: '900' },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});