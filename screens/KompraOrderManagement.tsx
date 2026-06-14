// screens/OrderManagement.tsx
// POSVine Terminal — Kompra Order Management
//
// Changes in this rewrite:
// - FEAT: Cancel Order button visible for non-terminal statuses (pending / confirmed / preparing / packed)
//   Opens a CancelOrderModal with an optional Reason (cancelNote) text input.
//   Web uses window.confirm-style inline confirmation; mobile uses Alert.
//   On confirm → cancelKompraOrder mutation → order moves to 'cancelled' tab.
// - FEAT: Cancelled tab (4th tab) shows cancelled orders with cancelledAt + cancelNote.
// - FIX: Timeline now shows "Packed" row using order.packedAt timestamp.
// - FIX: safeParseDate guards all date rendering (no NaN / "Invalid Date").
// - FIX: actionLoading reset in useEffect([initialOrder]) so it can't get stuck.
// - FIX: SC/PWD section, extra charges, grand total breakdown all preserved.
// - STYLE: CancelOrderModal uses same fade+transparent overlay as OrderDetailModal.

import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  memo,
  useMemo,
} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Modal,
  Animated,
  StatusBar,
  Dimensions,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/contexts/ThemeContext';
import {
  KompraCOrderService,
  type KompraCOrder,
} from '@/services/kompraCOrderService';
import type { CustomerType, DiscountType } from '@/services/salesOrder.service';
import { formatDateTime, timeAgo } from '@/utils/dateHelpers';
import { useErrorModal } from '@/hooks/errorModalHook';
import { ErrorModal } from '@/components/ErrorModal';
import { showErrorCSS } from 'react-native-svg/lib/typescript/deprecated';

const { width } = Dimensions.get('window');
const VIEW_MODE_KEY = 'orders-view-mode';

// ─── Types ────────────────────────────────────────────────────────────────────

type ViewMode = 'card' | 'table';
type SortKey = 'txNum' | 'customerName' | 'grandTotal' | 'createdAt';
type SortDir = 'asc' | 'desc';

type PaymentMethod =
  | 'cash_on_delivery'
  | 'gcash'
  | 'paymaya'
  | 'card'
  | 'qrph';

type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'packed'
  | 'in_delivery'
  | 'received'
  | 'cancelled';

interface OrderItem {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  price: number;
  checked: boolean;
  image?: string;
}

interface ExtraCharge {
  id: string;
  label: string;
  amount: number;
}

interface ScPwdInfo {
  id: string;
  fullName: string;
  idNumber: string;
  idType: string;
  customerType: CustomerType;
  isRepresentative?: boolean;
  representativeName?: string;
}

interface KompraOrder {
  id: number;
  txNum: string;
  customerName: string;
  customerPhone: string;
  address: string;
  lat: number;
  lng: number;
  paymentMethod: PaymentMethod;
  paymentStatus: 'unpaid' | 'paid';
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: OrderStatus;
  placedAt: string;
  packedAt?: string;
  deliveredAt?: string;
  riderName?: string;
  riderPhone?: string;
  customerNote?: string;
  rating?: number;
  review?: string;
  createdAt?: string;
  cancelledAt?: string;
  cancelNote?: string;
  // BNPC / SC-PWD fields
  customerType?: CustomerType;
  discountType?: DiscountType;
  scPwdCustomer?: ScPwdInfo;
  scPwdPax?: number;
  totalPax?: number;
  extraCharges?: ExtraCharge[];
  extraChargesTotal?: number;
  vatExemptSale?: number;
  discountAmount?: number;
  vatAmount?: number;
  grandTotal?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hasTrackingEvent(order: KompraCOrder, event: string): boolean {
  return order.tracking?.some((row) => row.event === event) ?? false;
}

function mapBackendOrder(order: KompraCOrder): KompraOrder {
  const deliveryFee =
    order.fees?.find((fee) => fee.type === 'delivery')?.amount ??
    Math.max(0, Number(order.total ?? 0) - Number(order.subtotal ?? 0));

  const packedAt = order.packedAt
    ?? order.tracking?.find((row) => row.event === 'outlet_preparing')?.statusAt;

  let uiStatus: OrderStatus;
  if (order.status === 'cancelled') {
    uiStatus = 'cancelled';
  } else if (
    order.status === 'preparing' &&
    hasTrackingEvent(order, 'outlet_preparing')
  ) {
    uiStatus = 'packed';
  } else {
    uiStatus = order.status as OrderStatus;
  }

  const extraCharges = (order.fees ?? [])
    .filter((fee) => fee.type !== 'delivery')
    .map((fee) => ({
      id: String(fee.id),
      label: fee.label,
      amount: Number(fee.amount ?? 0),
    }));
  const extraChargesTotal = extraCharges.reduce((sum, c) => sum + c.amount, 0);

  const scPwdCustomer = order.scPwdCustomer
    ? {
      id: order.scPwdCustomer.id,
      fullName: order.scPwdCustomer.fullName,
      idNumber: order.scPwdCustomer.idNumber,
      idType: order.scPwdCustomer.idType,
      customerType: order.scPwdCustomer.customerType,
      isRepresentative: order.scPwdCustomer.isRepresentative,
      representativeName: order.scPwdCustomer.representativeName,
    }
    : undefined;

  return {
    id: order.id,
    txNum: order.transactionNumber,
    customerName: order.customer?.fullname ?? 'Kompra Customer',
    customerPhone: order.customer?.phone ?? '',
    address: order.deliveryAddress?.address ?? 'No delivery address',
    lat: order.deliveryAddress?.latitude ?? 0,
    lng: order.deliveryAddress?.longitude ?? 0,
    paymentMethod: order.paymentMethod as PaymentMethod,
    paymentStatus: order.paymentStatus === 'paid' ? 'paid' : 'unpaid',
    items: (order.items ?? []).map((item) => ({
      id: item.id,
      name: item.item?.name ?? `Item #${item.itemId}`,
      quantity: item.quantity,
      unit: item.unit?.unitName ?? item.inventoryItem?.baseUnit ?? 'unit',
      price: Number(item.priceSnapshot ?? 0),
      checked:
        uiStatus === 'packed' ||
        uiStatus === 'in_delivery' ||
        uiStatus === 'received' ||
        uiStatus === 'cancelled',
      image: item.item?.image ?? undefined,
    })),
    subtotal: Number(order.subtotal ?? 0),
    deliveryFee: Number(deliveryFee ?? 0),
    total: Number(order.total ?? 0),
    status: uiStatus,
    createdAt: order.createdAt,
    packedAt: packedAt ?? undefined,
    deliveredAt: order.deliveredAt ?? undefined,
    riderName: order.courier?.name ?? order.riderName ?? undefined,
    riderPhone: order.courier?.phone ?? order.riderPhone ?? undefined,
    customerNote: order.customerNote ?? undefined,
    cancelledAt: order.cancelledAt ?? undefined,
    cancelNote: order.cancelNote ?? undefined,
    customerType: order.customerType,
    discountType: order.discountType,
    scPwdCustomer,
    scPwdPax: order.scPwdPax,
    totalPax: order.totalPax,
    extraCharges: extraCharges.length > 0 ? extraCharges : undefined,
    extraChargesTotal,
    vatExemptSale:
      order.vatExemptSale != null ? Number(order.vatExemptSale) : undefined,
    discountAmount:
      order.discountAmount != null ? Number(order.discountAmount) : undefined,
    vatAmount:
      order.vatAmount != null ? Number(order.vatAmount) : undefined,
    grandTotal:
      order.grandTotal != null
        ? Number(order.grandTotal)
        : Number(order.total ?? 0),
  };
}

// ─── Status badge config ──────────────────────────────────────────────────────

function getStatusBadge(status: OrderStatus) {
  const map: Record<
    OrderStatus,
    { label: string; color: string; bg: string }
  > = {
    pending: { label: 'NEW', color: '#D97706', bg: '#FEF3C7' },
    confirmed: { label: 'CONFIRMED', color: '#2563EB', bg: '#DBEAFE' },
    preparing: { label: 'PREPARING', color: '#7C3AED', bg: '#EDE9FE' },
    packed: { label: 'PACKED', color: '#0891B2', bg: '#CFFAFE' },
    in_delivery: { label: 'IN TRANSIT', color: '#059669', bg: '#D1FAE5' },
    received: { label: 'DELIVERED', color: '#16A34A', bg: '#DCFCE7' },
    cancelled: { label: 'CANCELLED', color: '#DC2626', bg: '#FEE2E2' },
  };
  return (
    map[status] ?? {
      label: status.toUpperCase(),
      color: '#6B7280',
      bg: '#F3F4F6',
    }
  );
}

const PM_CONFIG: Record<
  PaymentMethod,
  { label: string; color: string; bg: string }
> = {
  cash_on_delivery: {
    label: 'Cash on Delivery',
    color: '#16A34A',
    bg: '#DCFCE7',
  },
  gcash: { label: 'GCash', color: '#007AFF', bg: '#EBF5FF' },
  paymaya: { label: 'PayMaya', color: '#5B2D8E', bg: '#F3EBF9' },
  card: { label: 'Card', color: '#0F172A', bg: '#F1F5F9' },
  qrph: { label: 'QR PH', color: '#D97706', bg: '#FEF3C7' },
};

const CANCELLABLE_STATUSES: OrderStatus[] = [
  'pending',
  'confirmed',
  'preparing',
  'packed',
];

// ─── Item Check Row ───────────────────────────────────────────────────────────

function ItemCheckRow({
  item,
  onToggle,
  locked,
  colors,
}: {
  item: OrderItem;
  onToggle: () => void;
  locked: boolean;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <TouchableOpacity
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderRadius: 12,
        padding: 12,
        marginBottom: 6,
        borderWidth: 1,
        backgroundColor: item.checked ? colors.success + '18' : colors.surface,
        borderColor: item.checked ? colors.success : colors.border,
      }}
      onPress={locked ? undefined : onToggle}
      activeOpacity={locked ? 1 : 0.7}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 6,
          borderWidth: 2,
          borderColor: item.checked ? colors.success : colors.border,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: item.checked ? colors.success : 'transparent',
        }}
      >
        {item.checked && (
          <Text
            style={{ color: '#fff', fontSize: 13, fontWeight: '800' }}
          >
            ✓
          </Text>
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 14,
            fontWeight: '600',
            color: item.checked ? colors.success : colors.text,
            textDecorationLine: item.checked ? 'line-through' : 'none',
          }}
        >
          {item.name}
        </Text>
        <Text
          style={{
            fontSize: 12,
            color: colors.textSecondary,
            marginTop: 1,
          }}
        >
          {item.quantity} {item.unit} ·{' '}
          ₱{(item.price * item.quantity).toLocaleString()}
        </Text>
      </View>
      <Text
        style={{
          fontSize: 13,
          fontWeight: '600',
          color: item.checked ? colors.success : colors.primary,
        }}
      >
        ₱{item.price.toLocaleString()}/{item.unit}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Rider Name Modal ─────────────────────────────────────────────────────────

function RiderNameModal({
  visible,
  onConfirm,
  onCancel,
  colors,
}: {
  visible: boolean;
  onConfirm: (name: string, phone?: string) => void;
  onCancel: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const handleConfirm = () => {
    onConfirm(name.trim() || 'Rider', phone.trim() || undefined);
    setName('');
    setPhone('');
  };

  const handleCancel = () => {
    setName('');
    setPhone('');
    onCancel();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0,0,0,0.5)',
        }}
      >
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 16,
            padding: 24,
            width: width - 64,
            maxWidth: 440,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.2,
            shadowRadius: 16,
            elevation: 10,
          }}
        >
          <Text
            style={{
              fontSize: 17,
              fontWeight: '700',
              color: colors.text,
              marginBottom: 6,
            }}
          >
            Assign Rider
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: colors.textSecondary,
              marginBottom: 16,
            }}
          >
            Enter the rider or delivery person's details
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Rider name (e.g. Pedro Gomez)"
            placeholderTextColor={colors.textSecondary}
            style={{
              backgroundColor: colors.background,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: colors.border,
              paddingHorizontal: 14,
              paddingVertical: 12,
              fontSize: 15,
              color: colors.text,
              marginBottom: 12,
            }}
            autoFocus
            returnKeyType="next"
          />
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="Rider phone (optional)"
            placeholderTextColor={colors.textSecondary}
            keyboardType="phone-pad"
            style={{
              backgroundColor: colors.background,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: colors.border,
              paddingHorizontal: 14,
              paddingVertical: 12,
              fontSize: 15,
              color: colors.text,
              marginBottom: 20,
            }}
            returnKeyType="done"
            onSubmitEditing={handleConfirm}
          />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              onPress={handleCancel}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: '600',
                  color: colors.textSecondary,
                }}
              >
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleConfirm}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 10,
                backgroundColor: colors.primary,
                alignItems: 'center',
              }}
            >
              <Text
                style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}
              >
                Confirm
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Cancel Order Modal ───────────────────────────────────────────────────────

function CancelOrderModal({
  visible,
  orderTxNum,
  onConfirm,
  onCancel,
  loading,
  colors,
}: {
  visible: boolean;
  orderTxNum: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  loading: boolean;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    onConfirm(reason.trim());
  };

  const handleCancel = () => {
    setReason('');
    onCancel();
  };

  // Reset reason each time modal opens
  useEffect(() => {
    if (!visible) setReason('');
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0,0,0,0.55)',
          paddingHorizontal: 16,
        }}
      >
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 20,
            padding: 24,
            width: '100%',
            maxWidth: 480,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.25,
            shadowRadius: 20,
            elevation: 12,
          }}
        >
          {/* Icon + title */}
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                backgroundColor: '#FEE2E2',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12,
              }}
            >
              <Text style={{ fontSize: 24 }}>✕</Text>
            </View>
            <Text
              style={{
                fontSize: 18,
                fontWeight: '700',
                color: colors.text,
                textAlign: 'center',
              }}
            >
              Cancel Order
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: colors.textSecondary,
                marginTop: 4,
                textAlign: 'center',
                fontFamily: 'monospace',
              }}
            >
              {orderTxNum}
            </Text>
          </View>

          <View
            style={{
              backgroundColor: '#FEF2F2',
              borderRadius: 10,
              padding: 12,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: '#FECACA',
            }}
          >
            <Text
              style={{
                fontSize: 13,
                color: '#B91C1C',
                lineHeight: 18,
                textAlign: 'center',
              }}
            >
              This action cannot be undone. Inventory will be
              automatically restored.
            </Text>
          </View>

          {/* Reason / cancelNote field */}
          <Text
            style={{
              fontSize: 13,
              fontWeight: '600',
              color: colors.textSecondary,
              marginBottom: 6,
            }}
          >
            Reason{' '}
            <Text style={{ fontWeight: '400', color: colors.textSecondary }}>
              (optional)
            </Text>
          </Text>
          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder="e.g. Customer requested cancellation, out of stock…"
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={3}
            style={{
              backgroundColor: colors.background,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: colors.border,
              paddingHorizontal: 14,
              paddingVertical: 12,
              fontSize: 14,
              color: colors.text,
              marginBottom: 20,
              minHeight: 80,
              textAlignVertical: 'top',
            }}
          />

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              onPress={handleCancel}
              disabled={loading}
              style={{
                flex: 1,
                paddingVertical: 13,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: 'center',
                opacity: loading ? 0.5 : 1,
              }}
            >
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: '600',
                  color: colors.textSecondary,
                }}
              >
                Keep Order
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleConfirm}
              disabled={loading}
              style={{
                flex: 1,
                paddingVertical: 13,
                borderRadius: 12,
                backgroundColor: loading ? '#FCA5A5' : '#DC2626',
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text
                  style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}
                >
                  Cancel Order
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Order Card (list view) ───────────────────────────────────────────────────

const OrderCard = memo(function OrderCard({
  order,
  onPress,
  showBadge,
}: {
  order: KompraOrder;
  onPress: () => void;
  showBadge?: boolean;
}) {
  const { colors } = useTheme();
  const allChecked = order.items.every((i) => i.checked);
  const pm = PM_CONFIG[order.paymentMethod];
  const { width: windowWidth } = useWindowDimensions();
  const colMaxWidth =
    windowWidth >= 1024
      ? '33.33%'
      : windowWidth >= 768
        ? '50%'
        : undefined;
  const badge = getStatusBadge(order.status);
  const isCancelled = order.status === 'cancelled';

  return (
    <TouchableOpacity
      style={{
        flex: 1,
        maxWidth: colMaxWidth,
        backgroundColor: isCancelled
          ? '#FFF5F5'
          : colors.card,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: isCancelled ? '#FECACA' : colors.border,
        position: 'relative',
        opacity: isCancelled ? 0.85 : 1,
      }}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginBottom: 8,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 11,
              color: colors.textSecondary,
              fontFamily: 'monospace',
              marginBottom: 2,
            }}
          >
            {order.txNum}
          </Text>
          <Text
            style={{
              fontSize: 16,
              fontWeight: '700',
              color: isCancelled ? '#9CA3AF' : colors.text,
              textDecorationLine: isCancelled ? 'line-through' : 'none',
            }}
          >
            {order.customerName}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <View
            style={{
              backgroundColor: badge.bg,
              borderRadius: 8,
              paddingHorizontal: 8,
              paddingVertical: 3,
            }}
          >
            <Text
              style={{
                fontSize: 10,
                fontWeight: '800',
                color: badge.color,
                letterSpacing: 0.3,
              }}
            >
              {badge.label}
            </Text>
          </View>
          <View
            style={{
              backgroundColor: pm.bg,
              borderRadius: 8,
              paddingHorizontal: 8,
              paddingVertical: 3,
            }}
          >
            <Text
              style={{ fontSize: 11, fontWeight: '700', color: pm.color }}
            >
              {pm.label}
            </Text>
          </View>
          <Text style={{ fontSize: 11, color: colors.textSecondary }}>
            {timeAgo(order.createdAt)}
          </Text>
        </View>
      </View>

      <Text
        style={{
          fontSize: 12,
          color: colors.textSecondary,
          marginBottom: 8,
        }}
        numberOfLines={1}
      >
        📍 {order.address}
      </Text>

      <View style={{ gap: 2, marginBottom: 10 }}>
        {order.items.slice(0, 2).map((item) => (
          <Text
            key={item.id}
            style={{ fontSize: 12, color: colors.textSecondary }}
            numberOfLines={1}
          >
            · {item.quantity}× {item.name}
          </Text>
        ))}
        {order.items.length > 2 && (
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>
            · +{order.items.length - 2} more items
          </Text>
        )}
      </View>

      {/* Cancel note snippet if cancelled */}
      {isCancelled && order.cancelNote ? (
        <View
          style={{
            backgroundColor: '#FEE2E2',
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 6,
            marginBottom: 10,
          }}
        >
          <Text
            style={{ fontSize: 11, color: '#B91C1C' }}
            numberOfLines={2}
          >
            Reason: {order.cancelNote}
          </Text>
        </View>
      ) : null}

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text style={{ fontSize: 13, color: colors.textSecondary }}>
          Total:{' '}
          <Text
            style={{
              fontSize: 15,
              fontWeight: '700',
              color: isCancelled ? '#9CA3AF' : colors.primary,
              textDecorationLine: isCancelled ? 'line-through' : 'none',
            }}
          >
            ₱{(order.grandTotal ?? order.total).toLocaleString()}
          </Text>
        </Text>

        {!isCancelled &&
          (order.status === 'confirmed' || order.status === 'preparing' ? (
            <View
              style={{
                borderRadius: 20,
                paddingHorizontal: 10,
                paddingVertical: 3,
                backgroundColor: allChecked
                  ? colors.success + '18'
                  : colors.warning + '18',
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: allChecked ? colors.success : colors.warning,
                }}
              >
                {order.items.filter((i) => i.checked).length}/
                {order.items.length} packed
              </Text>
            </View>
          ) : order.status === 'packed' ? (
            <View
              style={{
                borderRadius: 20,
                paddingHorizontal: 10,
                paddingVertical: 3,
                backgroundColor: colors.accent + '18',
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: colors.accent,
                }}
              >
                📦 Ready
              </Text>
            </View>
          ) : order.status === 'in_delivery' ? (
            <View
              style={{
                borderRadius: 20,
                paddingHorizontal: 10,
                paddingVertical: 3,
                backgroundColor: colors.primary + '18',
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: colors.primary,
                }}
              >
                🛵 {order.riderName ?? 'Delivering…'}
              </Text>
            </View>
          ) : order.rating ? (
            <View
              style={{
                borderRadius: 20,
                paddingHorizontal: 10,
                paddingVertical: 3,
                backgroundColor: colors.success + '18',
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: colors.success,
                }}
              >
                {'⭐'.repeat(order.rating)}
              </Text>
            </View>
          ) : null)}
      </View>

      {order.customerType && order.customerType !== 'REGULAR' && (
        <View
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            backgroundColor: '#7C3AED',
            borderRadius: 4,
            paddingHorizontal: 6,
            paddingVertical: 2,
          }}
        >
          <Text
            style={{
              fontSize: 9,
              fontWeight: '800',
              color: '#fff',
              letterSpacing: 0.5,
            }}
          >
            {order.customerType === 'PWD' ? 'PWD' : 'SC'}
          </Text>
        </View>
      )}

      {showBadge && !isCancelled && (
        <View
          style={{
            position: 'absolute',
            bottom: 12,
            right: 12,
            backgroundColor: colors.accent,
            borderRadius: 4,
            paddingHorizontal: 7,
            paddingVertical: 2,
          }}
        >
          <Text
            style={{
              fontSize: 10,
              fontWeight: '800',
              color: '#fff',
              letterSpacing: 0.5,
            }}
          >
            NEW
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
});

// ─── Location Map Preview ─────────────────────────────────────────────────────

function LocationMapPreview({
  lat,
  lng,
  address,
  colors,
}: {
  lat?: number;
  lng?: number;
  address?: string;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const [mapError, setMapError] = useState(false);
  const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  const validCoords =
    lat != null &&
    lng != null &&
    isFinite(lat) &&
    isFinite(lng) &&
    lat !== 0 &&
    lng !== 0;

  if (!validCoords) {
    return (
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: 12,
          padding: 16,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 80,
        }}
      >
        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
          {address ?? 'No location data available'}
        </Text>
      </View>
    );
  }

  if (Platform.OS === 'web') {
    const mapUrl = googleMapsApiKey
      ? `https://www.google.com/maps/embed/v1/place?key=${googleMapsApiKey}&q=${lat},${lng}&zoom=15`
      : null;

    return (
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: 12,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        {mapUrl && !mapError ? (
          <iframe
            src={mapUrl}
            width="100%"
            height="160"
            style={{ border: 0, display: 'block' }}
            onError={() => setMapError(true)}
            title="Delivery Location"
          />
        ) : (
          <View
            style={{
              height: 80,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.background,
            }}
          >
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
              📍{' '}
              {address ?? `${lat?.toFixed(4)}, ${lng?.toFixed(4)}`}
            </Text>
          </View>
        )}
        {address ? (
          <View style={{ padding: 10 }}>
            <Text
              style={{ color: colors.textSecondary, fontSize: 12 }}
              numberOfLines={1}
            >
              {address}
            </Text>
          </View>
        ) : null}
      </View>
    );
  }

  const [MapView, Marker] = React.useMemo(() => {
    try {
      const Maps = require('react-native-maps');
      return [
        Maps.default ?? Maps.MapView,
        Maps.Marker ?? Maps.default?.Marker,
      ];
    } catch {
      return [null, null];
    }
  }, []);

  if (MapView && Marker) {
    return (
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: 12,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: colors.border,
          height: 180,
        }}
      >
        <MapView
          style={{ flex: 1 }}
          initialRegion={{
            latitude: lat,
            longitude: lng,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          scrollEnabled={false}
          zoomEnabled={false}
        >
          <Marker coordinate={{ latitude: lat, longitude: lng }} />
        </MapView>
        {address ? (
          <View style={{ padding: 10 }}>
            <Text
              style={{ color: colors.textSecondary, fontSize: 12 }}
              numberOfLines={1}
            >
              {address}
            </Text>
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <Text
        style={{
          color: colors.textSecondary,
          fontSize: 11,
          marginBottom: 4,
        }}
      >
        Coordinates
      </Text>
      <Text
        style={{
          color: colors.text,
          fontFamily: 'monospace',
          fontSize: 13,
        }}
      >
        {lat.toFixed(6)}, {lng.toFixed(6)}
      </Text>
      {address ? (
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: 12,
            marginTop: 6,
          }}
          numberOfLines={2}
        >
          {address}
        </Text>
      ) : null}
    </View>
  );
}

// ─── Timeline Row ─────────────────────────────────────────────────────────────

function TimelineRow({
  label,
  time,
  done,
  last,
  isError,
  colors,
}: {
  label: string;
  time: string;
  done: boolean;
  last?: boolean;
  isError?: boolean;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const dotColor = isError
    ? '#DC2626'
    : done
      ? colors.success
      : colors.border;

  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 12,
        marginBottom: last ? 0 : 16,
      }}
    >
      <View style={{ alignItems: 'center' }}>
        <View
          style={{
            width: 12,
            height: 12,
            borderRadius: 6,
            backgroundColor: dotColor,
            borderWidth: 2,
            borderColor: dotColor,
          }}
        />
        {!last && (
          <View
            style={{
              width: 2,
              flex: 1,
              minHeight: 20,
              backgroundColor: done ? colors.success : colors.border,
              marginTop: 2,
              marginBottom: 2,
              alignSelf: 'center',
            }}
          />
        )}
      </View>
      <View style={{ flex: 1, paddingBottom: last ? 0 : 4 }}>
        <Text
          style={{
            fontSize: 13,
            fontWeight: '600',
            color: isError
              ? '#DC2626'
              : done
                ? colors.text
                : colors.textSecondary,
          }}
        >
          {label}
        </Text>
        <Text
          style={{ fontSize: 12, color: colors.textSecondary, marginTop: 1 }}
        >
          {time}
        </Text>
      </View>
    </View>
  );
}

// ─── Section Header helper ────────────────────────────────────────────────────

function SectionHeader({
  title,
  colors,
}: {
  title: string;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <Text
      style={{
        fontSize: 11,
        fontWeight: '700',
        color: colors.textSecondary,
        letterSpacing: 0.8,
        marginBottom: 10,
      }}
    >
      {title}
    </Text>
  );
}

// ─── View Mode Toggle Icons ───────────────────────────────────────────────────

function CardViewIcon({
  active,
  color,
}: {
  active: boolean;
  color: string;
}) {
  const opacity = active ? 1 : 0.45;
  return (
    <View style={{ width: 20, height: 20, opacity }}>
      <View style={{ flexDirection: 'row', gap: 3, marginBottom: 3 }}>
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 2,
            backgroundColor: color,
          }}
        />
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 2,
            backgroundColor: color,
          }}
        />
      </View>
      <View style={{ flexDirection: 'row', gap: 3 }}>
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 2,
            backgroundColor: color,
          }}
        />
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 2,
            backgroundColor: color,
          }}
        />
      </View>
    </View>
  );
}

function TableViewIcon({
  active,
  color,
}: {
  active: boolean;
  color: string;
}) {
  const opacity = active ? 1 : 0.45;
  return (
    <View style={{ width: 20, height: 18, opacity }}>
      <View
        style={{
          height: 4,
          backgroundColor: color,
          borderRadius: 1,
          marginBottom: 2,
        }}
      />
      <View
        style={{
          height: 3,
          backgroundColor: color,
          borderRadius: 1,
          marginBottom: 2,
        }}
      />
      <View
        style={{
          height: 3,
          backgroundColor: color,
          borderRadius: 1,
          marginBottom: 2,
        }}
      />
      <View
        style={{ height: 3, backgroundColor: color, borderRadius: 1 }}
      />
    </View>
  );
}

// ─── Table View Row (memoized) ────────────────────────────────────────────────

const TableRow = memo(function TableRow({
  order,
  onView,
  onStatusChange,
  onCancel,
  isEven,
  colors,
}: {
  order: KompraOrder;
  onView: () => void;
  onStatusChange: (
    id: number,
    status: OrderStatus,
    updates?: Partial<KompraOrder>,
  ) => Promise<KompraOrder>;
  onCancel: (order: KompraOrder) => void;
  isEven: boolean;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const [actionLoading, setActionLoading] = useState(false);
  const [riderModalVisible, setRiderModalVisible] = useState(false);
  const badge = getStatusBadge(order.status);
  const pm = PM_CONFIG[order.paymentMethod];
  const isCancelled = order.status === 'cancelled';

  const quickAction = useCallback(
    async (status: OrderStatus, updates?: Partial<KompraOrder>) => {
      if (actionLoading) return;
      setActionLoading(true);
      try {
        await onStatusChange(order.id, status, updates);
      } catch (error) {
        Alert.alert(
          'Update failed',
          error instanceof Error ? error.message : 'Please try again.',
        );
      } finally {
        setActionLoading(false);
      }
    },
    [actionLoading, onStatusChange, order.id],
  );

  const handleQuickConfirm = () => void quickAction('confirmed');
  const handleQuickPack = () => void quickAction('packed');
  const handleQuickDeliver = () => setRiderModalVisible(true);

  const confirmRider = (name: string, phone?: string) => {
    setRiderModalVisible(false);
    void quickAction('in_delivery', { riderName: name, riderPhone: phone });
  };

  const handleQuickReceived = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Mark this order as delivered?')) {
        void quickAction('received');
      }
    } else {
      Alert.alert(
        'Mark as Delivered?',
        'Confirm the order has been delivered.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delivered',
            onPress: () => void quickAction('received'),
          },
        ],
      );
    }
  };

  const allChecked = order.items.every((i) => i.checked);
  const canCancel = CANCELLABLE_STATUSES.includes(order.status);

  return (
    <>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: isCancelled
            ? '#FFF5F5'
            : isEven
              ? colors.surface
              : colors.background,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          minHeight: 52,
          opacity: isCancelled ? 0.85 : 1,
        }}
      >
        {/* Order Number */}
        <View
          style={{ width: 130, paddingHorizontal: 12, paddingVertical: 10 }}
        >
          <Text
            style={{
              fontSize: 11,
              fontFamily: 'monospace',
              color: colors.primary,
              fontWeight: '600',
            }}
            numberOfLines={1}
          >
            {order.txNum}
          </Text>
          {order.customerType && order.customerType !== 'REGULAR' && (
            <View
              style={{
                marginTop: 3,
                alignSelf: 'flex-start',
                backgroundColor: '#7C3AED',
                borderRadius: 3,
                paddingHorizontal: 4,
                paddingVertical: 1,
              }}
            >
              <Text
                style={{ fontSize: 8, fontWeight: '800', color: '#fff' }}
              >
                {order.customerType === 'PWD' ? 'PWD' : 'SC'}
              </Text>
            </View>
          )}
        </View>

        {/* Customer */}
        <View
          style={{ width: 150, paddingHorizontal: 8, paddingVertical: 10 }}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: '600',
              color: isCancelled ? '#9CA3AF' : colors.text,
              textDecorationLine: isCancelled ? 'line-through' : 'none',
            }}
            numberOfLines={1}
          >
            {order.customerName}
          </Text>
          {order.customerPhone ? (
            <Text
              style={{
                fontSize: 11,
                color: colors.textSecondary,
                marginTop: 1,
              }}
              numberOfLines={1}
            >
              {order.customerPhone}
            </Text>
          ) : null}
        </View>

        {/* Address */}
        <View
          style={{
            flex: 1,
            minWidth: 160,
            paddingHorizontal: 8,
            paddingVertical: 10,
          }}
        >
          <Text
            style={{ fontSize: 12, color: colors.textSecondary }}
            numberOfLines={2}
          >
            {order.address}
          </Text>
        </View>

        {/* Items */}
        <View
          style={{
            width: 72,
            paddingHorizontal: 8,
            paddingVertical: 10,
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              fontSize: 13,
              color: colors.text,
              fontWeight: '600',
            }}
          >
            {order.items.length}
          </Text>
          <Text style={{ fontSize: 10, color: colors.textSecondary }}>
            items
          </Text>
        </View>

        {/* Total */}
        <View
          style={{
            width: 100,
            paddingHorizontal: 8,
            paddingVertical: 10,
            alignItems: 'flex-end',
          }}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: '700',
              color: isCancelled ? '#9CA3AF' : colors.primary,
              textDecorationLine: isCancelled ? 'line-through' : 'none',
            }}
          >
            ₱{(order.grandTotal ?? order.total).toLocaleString()}
          </Text>
          {order.paymentStatus === 'paid' ? (
            <Text
              style={{
                fontSize: 10,
                color: colors.success,
                fontWeight: '600',
                marginTop: 1,
              }}
            >
              Paid
            </Text>
          ) : (
            <Text
              style={{
                fontSize: 10,
                color: colors.warning,
                fontWeight: '600',
                marginTop: 1,
              }}
            >
              COD
            </Text>
          )}
        </View>

        {/* Payment Method */}
        <View
          style={{ width: 110, paddingHorizontal: 8, paddingVertical: 10 }}
        >
          <View
            style={{
              backgroundColor: pm.bg,
              borderRadius: 6,
              paddingHorizontal: 7,
              paddingVertical: 3,
              alignSelf: 'flex-start',
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: '700',
                color: pm.color,
              }}
              numberOfLines={1}
            >
              {pm.label}
            </Text>
          </View>
        </View>

        {/* Status */}
        <View
          style={{ width: 110, paddingHorizontal: 8, paddingVertical: 10 }}
        >
          <View
            style={{
              backgroundColor: badge.bg,
              borderRadius: 6,
              paddingHorizontal: 7,
              paddingVertical: 3,
              alignSelf: 'flex-start',
            }}
          >
            <Text
              style={{
                fontSize: 10,
                fontWeight: '800',
                color: badge.color,
                letterSpacing: 0.3,
              }}
            >
              {badge.label}
            </Text>
          </View>
        </View>

        {/* Created Time */}
        <View
          style={{ width: 110, paddingHorizontal: 8, paddingVertical: 10 }}
        >
          <Text
            style={{ fontSize: 11, color: colors.textSecondary }}
            numberOfLines={1}
          >
            {timeAgo(order.createdAt)}
          </Text>
          <Text
            style={{
              fontSize: 10,
              color: colors.textSecondary,
              marginTop: 1,
            }}
            numberOfLines={1}
          >
            {formatDateTime(order.createdAt)}
          </Text>
        </View>

        {/* Actions */}
        <View
          style={{
            width: 220,
            paddingHorizontal: 8,
            paddingVertical: 8,
            flexDirection: 'row',
            gap: 5,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          {/* View Details always visible */}
          <TouchableOpacity
            onPress={onView}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 7,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: '600',
                color: colors.text,
              }}
            >
              Details
            </Text>
          </TouchableOpacity>

          {/* Quick status action */}
          {!isCancelled && (
            <>
              {actionLoading ? (
                <ActivityIndicator
                  size="small"
                  color={colors.primary}
                  style={{ width: 28 }}
                />
              ) : order.status === 'pending' ? (
                <TouchableOpacity
                  onPress={handleQuickConfirm}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 7,
                    backgroundColor: colors.accent,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '700',
                      color: '#fff',
                    }}
                  >
                    Accept
                  </Text>
                </TouchableOpacity>
              ) : order.status === 'confirmed' ||
                order.status === 'preparing' ? (
                <TouchableOpacity
                  onPress={handleQuickPack}
                  disabled={!allChecked}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 7,
                    backgroundColor: allChecked
                      ? colors.accent
                      : colors.border,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '700',
                      color: allChecked ? '#fff' : colors.textSecondary,
                    }}
                  >
                    Pack
                  </Text>
                </TouchableOpacity>
              ) : order.status === 'packed' ? (
                <TouchableOpacity
                  onPress={handleQuickDeliver}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 7,
                    backgroundColor: colors.primary,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '700',
                      color: '#fff',
                    }}
                  >
                    Dispatch
                  </Text>
                </TouchableOpacity>
              ) : order.status === 'in_delivery' ? (
                <TouchableOpacity
                  onPress={handleQuickReceived}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 7,
                    backgroundColor: colors.success,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '700',
                      color: '#fff',
                    }}
                  >
                    Delivered
                  </Text>
                </TouchableOpacity>
              ) : order.status === 'received' ? (
                <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 7,
                    backgroundColor: colors.success + '18',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '700',
                      color: colors.success,
                    }}
                  >
                    ✓ Done
                  </Text>
                </View>
              ) : null}
            </>
          )}

          {/* Cancel button for cancellable statuses */}
          {canCancel && !actionLoading && (
            <TouchableOpacity
              onPress={() => onCancel(order)}
              style={{
                paddingHorizontal: 8,
                paddingVertical: 6,
                borderRadius: 7,
                borderWidth: 1,
                borderColor: '#FECACA',
                backgroundColor: '#FFF5F5',
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '700',
                  color: '#DC2626',
                }}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <RiderNameModal
        visible={riderModalVisible}
        onConfirm={confirmRider}
        onCancel={() => setRiderModalVisible(false)}
        colors={colors}
      />
    </>
  );
});

// ─── Sortable Column Header ───────────────────────────────────────────────────

function SortableHeader({
  label,
  sortKey,
  currentKey,
  currentDir,
  onSort,
  width: colWidth,
  align = 'left',
  colors,
}: {
  label: string;
  sortKey?: SortKey;
  currentKey: SortKey | null;
  currentDir: SortDir;
  onSort: (key: SortKey) => void;
  width?: number;
  align?: 'left' | 'center' | 'right';
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const isActive = sortKey && currentKey === sortKey;
  const arrow = isActive ? (currentDir === 'asc' ? ' ↑' : ' ↓') : '';

  return (
    <TouchableOpacity
      onPress={sortKey ? () => onSort(sortKey) : undefined}
      disabled={!sortKey}
      style={{
        width: colWidth,
        paddingHorizontal: 8,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent:
          align === 'right'
            ? 'flex-end'
            : align === 'center'
              ? 'center'
              : 'flex-start',
      }}
      activeOpacity={sortKey ? 0.7 : 1}
    >
      <Text
        style={{
          fontSize: 11,
          fontWeight: '700',
          color: isActive ? colors.primary : colors.textSecondary,
          letterSpacing: 0.5,
        }}
      >
        {label.toUpperCase()}
        {arrow}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Table View ───────────────────────────────────────────────────────────────

function TableView({
  orders,
  onView,
  onStatusChange,
  onCancel,
  colors,
}: {
  orders: KompraOrder[];
  onView: (order: KompraOrder) => void;
  onStatusChange: (
    id: number,
    status: OrderStatus,
    updates?: Partial<KompraOrder>,
  ) => Promise<KompraOrder>;
  onCancel: (order: KompraOrder) => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const [sortKey, setSortKey] = useState<SortKey | null>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const handleSort = useCallback((key: SortKey) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        return key;
      }
      setSortDir('asc');
      return key;
    });
  }, []);

  const sorted = useMemo(() => {
    if (!sortKey) return orders;
    return [...orders].sort((a, b) => {
      let av: string | number = 0;
      let bv: string | number = 0;
      if (sortKey === 'txNum') {
        av = a.txNum ?? '';
        bv = b.txNum ?? '';
      } else if (sortKey === 'customerName') {
        av = a.customerName ?? '';
        bv = b.customerName ?? '';
      } else if (sortKey === 'grandTotal') {
        av = a.grandTotal ?? a.total ?? 0;
        bv = b.grandTotal ?? b.total ?? 0;
      } else if (sortKey === 'createdAt') {
        av = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        bv = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [orders, sortKey, sortDir]);

  const sortProps = {
    currentKey: sortKey,
    currentDir: sortDir,
    onSort: handleSort,
    colors,
  };

  const tableHeader = (
    <View
      key="table-header"
      style={{
        flexDirection: 'row',
        backgroundColor: colors.surface,
        borderBottomWidth: 2,
        borderBottomColor: colors.border,
      }}
    >
      <SortableHeader
        label="Order #"
        sortKey="txNum"
        width={130}
        {...sortProps}
      />
      <SortableHeader
        label="Customer"
        sortKey="customerName"
        width={150}
        {...sortProps}
      />
      <View
        style={{
          flex: 1,
          minWidth: 160,
          paddingHorizontal: 8,
          paddingVertical: 10,
        }}
      >
        <Text
          style={{
            fontSize: 11,
            fontWeight: '700',
            color: colors.textSecondary,
            letterSpacing: 0.5,
          }}
        >
          ADDRESS
        </Text>
      </View>
      <SortableHeader
        label="Items"
        width={72}
        align="center"
        currentKey={sortKey}
        currentDir={sortDir}
        onSort={handleSort}
        colors={colors}
      />
      <SortableHeader
        label="Total"
        sortKey="grandTotal"
        width={100}
        align="right"
        {...sortProps}
      />
      <View
        style={{ width: 110, paddingHorizontal: 8, paddingVertical: 10 }}
      >
        <Text
          style={{
            fontSize: 11,
            fontWeight: '700',
            color: colors.textSecondary,
            letterSpacing: 0.5,
          }}
        >
          PAYMENT
        </Text>
      </View>
      <View
        style={{ width: 110, paddingHorizontal: 8, paddingVertical: 10 }}
      >
        <Text
          style={{
            fontSize: 11,
            fontWeight: '700',
            color: colors.textSecondary,
            letterSpacing: 0.5,
          }}
        >
          STATUS
        </Text>
      </View>
      <SortableHeader
        label="Created"
        sortKey="createdAt"
        width={110}
        {...sortProps}
      />
      <View
        style={{ width: 220, paddingHorizontal: 8, paddingVertical: 10 }}
      >
        <Text
          style={{
            fontSize: 11,
            fontWeight: '700',
            color: colors.textSecondary,
            letterSpacing: 0.5,
          }}
        >
          ACTIONS
        </Text>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator
        stickyHeaderIndices={[0]}
      >
        {tableHeader}
        {sorted.length === 0 ? (
          <View
            style={{ alignItems: 'center', paddingVertical: 60 }}
          >
            <Text style={{ fontSize: 32, marginBottom: 10 }}>📋</Text>
            <Text
              style={{ fontSize: 14, color: colors.textSecondary }}
            >
              No orders in this view
            </Text>
          </View>
        ) : (
          sorted.map((order, index) => (
            <TableRow
              key={order.id}
              order={order}
              onView={() => onView(order)}
              onStatusChange={onStatusChange}
              onCancel={onCancel}
              isEven={index % 2 === 0}
              colors={colors}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

// ─── Order Detail Modal ───────────────────────────────────────────────────────

function OrderDetailModal({
  order: initialOrder,
  visible,
  onClose,
  onStatusChange,
  onCancelConfirmed,
}: {
  order: KompraOrder | null;
  visible: boolean;
  onClose: () => void;
  onStatusChange: (
    id: number,
    status: OrderStatus,
    updates?: Partial<KompraOrder>,
  ) => Promise<KompraOrder>;
  onCancelConfirmed: (updated: KompraOrder) => void;
}) {
  const { colors } = useTheme();
  const [order, setOrder] = useState<KompraOrder | null>(initialOrder);
  const [riderModalVisible, setRiderModalVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  const openCancelModal = () => setCancelModalVisible(true);

  const handleCancelConfirm = async (reason: string) => {
    if (!order) return;
    setCancelLoading(true);
    try {
      const backendOrder = await KompraCOrderService.cancelKompraOrder(
        order.id,
        'outlet',
        0,
        reason || undefined,
      );
      const updatedOrder = mapBackendOrder(backendOrder);
      setOrder(updatedOrder);
      setCancelModalVisible(false);
      onCancelConfirmed(updatedOrder);  // bubble up so the list updates
      onClose();
    } catch (error) {
      if (Platform.OS === 'web') {
        window.alert(error instanceof Error ? error.message : 'Cancel failed.');
      } else {
        Alert.alert('Cancel failed', error instanceof Error ? error.message : 'Please try again.');
      }

    } finally {
      setCancelLoading(false);
    }
  };

  const handleCancelDismiss = () => {
    if (cancelLoading) return;
    setCancelModalVisible(false);
  };
  useEffect(() => {
    setOrder(initialOrder);
    setActionLoading(false);
  }, [initialOrder]);

  if (!order) return null;

  const pm = PM_CONFIG[order.paymentMethod];
  const allChecked = order.items.every((i) => i.checked);
  const checkedCount = order.items.filter((i) => i.checked).length;
  const hasDiscount = Boolean(
    order.discountAmount && order.discountAmount > 0,
  );
  const isScPwd = Boolean(
    order.customerType && order.customerType !== 'REGULAR',
  );
  const isCancelled = order.status === 'cancelled';
  const canCancel = CANCELLABLE_STATUSES.includes(order.status);

  const toggleItem = (itemId: number) => {
    if (order.status !== 'confirmed' && order.status !== 'preparing') return;
    setOrder((prev) =>
      prev
        ? {
          ...prev,
          items: prev.items.map((i) =>
            i.id === itemId ? { ...i, checked: !i.checked } : i,
          ),
        }
        : prev,
    );
  };

  const persistStatus = async (
    status: OrderStatus,
    updates?: Partial<KompraOrder>,
  ) => {
    if (__DEV__) {
      console.log('[persistStatus] called, actionLoading:', actionLoading, 'order:', order?.id);

    }
    if (!order) return null;
    if (actionLoading) return null;
    setActionLoading(true);
    try {
      const updated = await onStatusChange(order.id, status, updates);
      setOrder(updated);
      return updated;
    } catch (error) {
      return null
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirm = () => {
    void persistStatus('confirmed');
  };
  const handleDonePacking = () => {
    if (!allChecked) {
      Alert.alert(
        'Not yet',
        'Please check all items before marking as packed.',
      );
      return;
    }
    void persistStatus('packed', { items: order.items });
  };
  const handleOutForDelivery = () => {
    setRiderModalVisible(true);
  };
  const confirmRider = (riderName: string, riderPhone?: string) => {
    setRiderModalVisible(false);
    void persistStatus('in_delivery', { riderName, riderPhone });
  };
  const handleDelivered = () => {
    const confirmDelivery = () => {
      void persistStatus('received').then((updated) => {
        if (updated) onClose();
      });
    };
    if (Platform.OS === 'web') {
      if (
        window.confirm(
          'Confirm the order has been successfully delivered to the customer.',
        )
      ) {
        confirmDelivery();
      }
    } else {
      Alert.alert(
        'Mark as Delivered?',
        'Confirm the order has been successfully delivered to the customer.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delivered', onPress: confirmDelivery },
        ],
      );
    }
  };

  return (
    <>
      <Modal visible={visible} animationType="fade" transparent>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.55)',
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 32,
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 560,
              maxHeight: '100%',
              backgroundColor: colors.background,
              borderRadius: 20,
              overflow: 'hidden',
              flex: 1,
              flexShrink: 1,
            }}
          >
            {/* Header */}
            <View
              style={{
                backgroundColor: isCancelled ? '#DC2626' : colors.primary,
                paddingTop: 18,
                paddingBottom: 18,
                paddingHorizontal: 20,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
            >
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text
                  style={{
                    fontSize: 11,
                    color: 'rgba(255,255,255,0.6)',
                    fontFamily: 'monospace',
                    marginBottom: 3,
                  }}
                >
                  {order.txNum}
                </Text>
                <Text
                  style={{
                    fontSize: 17,
                    fontWeight: '700',
                    color: '#fff',
                    textDecorationLine: isCancelled
                      ? 'line-through'
                      : 'none',
                  }}
                  numberOfLines={1}
                >
                  {order.customerName}
                </Text>
                {order.customerPhone ? (
                  <Text
                    style={{
                      fontSize: 13,
                      color: 'rgba(255,255,255,0.7)',
                      marginTop: 2,
                    }}
                  >
                    {order.customerPhone}
                  </Text>
                ) : null}
                {isCancelled && (
                  <View
                    style={{
                      marginTop: 6,
                      backgroundColor: 'rgba(255,255,255,0.18)',
                      borderRadius: 6,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      alignSelf: 'flex-start',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '800',
                        color: '#fff',
                        letterSpacing: 0.5,
                      }}
                    >
                      ORDER CANCELLED
                    </Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={{
                    color: '#fff',
                    fontSize: 14,
                    fontWeight: '700',
                  }}
                >
                  ✕
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={false}
            >
              {/* Payment + status badges */}
              <View
                style={{
                  flexDirection: 'row',
                  gap: 8,
                  paddingHorizontal: 16,
                  paddingTop: 16,
                  flexWrap: 'wrap',
                }}
              >
                <View
                  style={{
                    backgroundColor: pm.bg,
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '700',
                      color: pm.color,
                    }}
                  >
                    {pm.label}
                  </Text>
                </View>
                <View
                  style={{
                    backgroundColor:
                      order.paymentStatus === 'paid'
                        ? colors.success + '18'
                        : colors.warning + '18',
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '700',
                      color:
                        order.paymentStatus === 'paid'
                          ? colors.success
                          : colors.warning,
                    }}
                  >
                    {order.paymentStatus === 'paid'
                      ? '✓ Paid'
                      : '⏳ Collect on delivery'}
                  </Text>
                </View>
                {isScPwd && (
                  <View
                    style={{
                      backgroundColor: '#7C3AED18',
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '700',
                        color: '#7C3AED',
                      }}
                    >
                      {order.customerType === 'PWD'
                        ? 'PWD Discount'
                        : 'Senior Citizen Discount'}
                    </Text>
                  </View>
                )}
              </View>

              {/* Cancellation info box */}
              {isCancelled && (
                <View
                  style={{ paddingHorizontal: 16, marginTop: 16 }}
                >
                  <View
                    style={{
                      backgroundColor: '#FEF2F2',
                      borderRadius: 12,
                      padding: 14,
                      borderWidth: 1,
                      borderColor: '#FECACA',
                      gap: 8,
                    }}
                  >
                    {order.cancelledAt ? (
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 13,
                            color: '#B91C1C',
                            fontWeight: '600',
                          }}
                        >
                          Cancelled at
                        </Text>
                        <Text
                          style={{
                            fontSize: 13,
                            color: '#B91C1C',
                          }}
                        >
                          {formatDateTime(order.cancelledAt)}
                        </Text>
                      </View>
                    ) : null}
                    {order.cancelNote ? (
                      <View>
                        <Text
                          style={{
                            fontSize: 13,
                            color: '#B91C1C',
                            fontWeight: '600',
                            marginBottom: 4,
                          }}
                        >
                          Reason
                        </Text>
                        <Text
                          style={{
                            fontSize: 13,
                            color: '#7F1D1D',
                            lineHeight: 18,
                          }}
                        >
                          {order.cancelNote}
                        </Text>
                      </View>
                    ) : (
                      <Text
                        style={{
                          fontSize: 13,
                          color: '#B91C1C',
                          fontStyle: 'italic',
                        }}
                      >
                        No reason provided
                      </Text>
                    )}
                  </View>
                </View>
              )}

              {/* Delivery location + map */}
              <View
                style={{ paddingHorizontal: 16, marginTop: 20 }}
              >
                <SectionHeader
                  title="DELIVERY LOCATION"
                  colors={colors}
                />
                <LocationMapPreview
                  lat={order.lat}
                  lng={order.lng}
                  address={order.address}
                  colors={colors}
                />
              </View>

              {/* Customer note */}
              {order.customerNote ? (
                <View
                  style={{ paddingHorizontal: 16, marginTop: 16 }}
                >
                  <SectionHeader
                    title="CUSTOMER NOTE"
                    colors={colors}
                  />
                  <View
                    style={{
                      backgroundColor: colors.warning + '18',
                      borderRadius: 12,
                      padding: 12,
                      borderWidth: 1,
                      borderColor: colors.warning,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        color: colors.text,
                        lineHeight: 20,
                      }}
                    >
                      {order.customerNote}
                    </Text>
                  </View>
                </View>
              ) : null}

              {/* Items checklist */}
              <View
                style={{ paddingHorizontal: 16, marginTop: 20 }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 10,
                  }}
                >
                  <SectionHeader
                    title="ITEMS TO PACK"
                    colors={colors}
                  />
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: allChecked
                        ? colors.success
                        : colors.warning,
                    }}
                  >
                    {checkedCount}/{order.items.length} checked
                  </Text>
                </View>
                {order.items.map((item) => (
                  <ItemCheckRow
                    key={item.id}
                    item={item}
                    onToggle={() => toggleItem(item.id)}
                    locked={
                      order.status !== 'confirmed' &&
                      order.status !== 'preparing'
                    }
                    colors={colors}
                  />
                ))}
              </View>

              {/* SC/PWD Customer & BNPC Discount section */}
              {isScPwd && (
                <View
                  style={{ paddingHorizontal: 16, marginTop: 20 }}
                >
                  <SectionHeader
                    title="SC / PWD CUSTOMER"
                    colors={colors}
                  />
                  <View
                    style={{
                      backgroundColor: colors.surface,
                      borderRadius: 12,
                      padding: 14,
                      borderWidth: 1,
                      borderColor: '#7C3AED44',
                      gap: 8,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          color: colors.textSecondary,
                        }}
                      >
                        Customer Type
                      </Text>
                      <Text
                        style={{
                          fontSize: 13,
                          color: '#7C3AED',
                          fontWeight: '700',
                        }}
                      >
                        {order.customerType === 'PWD'
                          ? 'Person with Disability'
                          : 'Senior Citizen'}
                      </Text>
                    </View>
                    {order.discountType &&
                      order.discountType !== 'NONE' && (
                        <View
                          style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 13,
                              color: colors.textSecondary,
                            }}
                          >
                            Discount Type
                          </Text>
                          <Text
                            style={{
                              fontSize: 13,
                              color: colors.text,
                              fontWeight: '600',
                            }}
                          >
                            {order.discountType
                              .replace('BNPC_', 'BNPC ')
                              .replace('_', ' ')}
                          </Text>
                        </View>
                      )}
                    {order.scPwdCustomer ? (
                      <>
                        <View
                          style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 13,
                              color: colors.textSecondary,
                            }}
                          >
                            Name
                          </Text>
                          <Text
                            style={{
                              fontSize: 13,
                              color: colors.text,
                              fontWeight: '600',
                              flex: 1,
                              textAlign: 'right',
                              marginLeft: 12,
                            }}
                            numberOfLines={1}
                          >
                            {order.scPwdCustomer.fullName}
                          </Text>
                        </View>
                        <View
                          style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 13,
                              color: colors.textSecondary,
                            }}
                          >
                            {order.scPwdCustomer.idType === 'OSCA'
                              ? 'OSCA ID'
                              : order.scPwdCustomer.idType === 'PWD'
                                ? 'PWD ID'
                                : 'Gov. ID'}
                          </Text>
                          <Text
                            style={{
                              fontSize: 13,
                              color: colors.text,
                              fontFamily: 'monospace',
                            }}
                          >
                            {order.scPwdCustomer.idNumber}
                          </Text>
                        </View>
                        {order.scPwdCustomer.isRepresentative &&
                          order.scPwdCustomer.representativeName ? (
                          <View
                            style={{
                              flexDirection: 'row',
                              justifyContent: 'space-between',
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 13,
                                color: colors.textSecondary,
                              }}
                            >
                              Representative
                            </Text>
                            <Text
                              style={{
                                fontSize: 13,
                                color: colors.text,
                              }}
                            >
                              {order.scPwdCustomer.representativeName}
                            </Text>
                          </View>
                        ) : null}
                      </>
                    ) : null}
                    {order.totalPax && order.totalPax > 1 ? (
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 13,
                            color: colors.textSecondary,
                          }}
                        >
                          Pax (Total / SC-PWD)
                        </Text>
                        <Text
                          style={{
                            fontSize: 13,
                            color: colors.text,
                          }}
                        >
                          {order.totalPax} / {order.scPwdPax ?? 1}
                        </Text>
                      </View>
                    ) : null}
                    {order.vatExemptSale && order.vatExemptSale > 0 ? (
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 13,
                            color: colors.textSecondary,
                          }}
                        >
                          VAT Exempt Sale
                        </Text>
                        <Text
                          style={{
                            fontSize: 13,
                            color: colors.text,
                          }}
                        >
                          ₱{order.vatExemptSale.toLocaleString()}
                        </Text>
                      </View>
                    ) : null}
                    {hasDiscount ? (
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          borderTopWidth: 1,
                          borderTopColor: '#7C3AED22',
                          paddingTop: 8,
                          marginTop: 2,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: '700',
                            color: colors.success,
                          }}
                        >
                          Discount Applied
                        </Text>
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: '800',
                            color: colors.success,
                          }}
                        >
                          -₱
                          {(order.discountAmount ?? 0).toLocaleString()}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              )}

              {/* Extra Charges section */}
              {order.extraCharges && order.extraCharges.length > 0 ? (
                <View
                  style={{ paddingHorizontal: 16, marginTop: 20 }}
                >
                  <SectionHeader
                    title="EXTRA CHARGES"
                    colors={colors}
                  />
                  <View
                    style={{
                      backgroundColor: colors.surface,
                      borderRadius: 12,
                      padding: 14,
                      borderWidth: 1,
                      borderColor: colors.border,
                      gap: 8,
                    }}
                  >
                    {order.extraCharges.map((charge) => (
                      <View
                        key={charge.id}
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 13,
                            color: colors.textSecondary,
                          }}
                        >
                          {charge.label}
                        </Text>
                        <Text
                          style={{
                            fontSize: 13,
                            color: colors.text,
                            fontWeight: '600',
                          }}
                        >
                          ₱{Number(charge.amount).toLocaleString()}
                        </Text>
                      </View>
                    ))}
                    {(order.extraChargesTotal ?? 0) > 0 ? (
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          borderTopWidth: 1,
                          borderTopColor: colors.border,
                          paddingTop: 8,
                          marginTop: 2,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: '700',
                            color: colors.text,
                          }}
                        >
                          Total Extra
                        </Text>
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: '700',
                            color: colors.text,
                          }}
                        >
                          +₱
                          {(
                            order.extraChargesTotal ?? 0
                          ).toLocaleString()}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              ) : null}

              {/* Order Summary */}
              <View
                style={{ paddingHorizontal: 16, marginTop: 20 }}
              >
                <SectionHeader
                  title="ORDER SUMMARY"
                  colors={colors}
                />
                <View
                  style={{
                    backgroundColor: colors.surface,
                    borderRadius: 12,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: colors.border,
                    gap: 8,
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        color: colors.textSecondary,
                      }}
                    >
                      Gross Sales (VAT Incl.)
                    </Text>
                    <Text
                      style={{ fontSize: 13, color: colors.text }}
                    >
                      ₱{order.subtotal.toLocaleString()}
                    </Text>
                  </View>
                  {order.deliveryFee > 0 ? (
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          color: colors.textSecondary,
                        }}
                      >
                        Delivery fee
                      </Text>
                      <Text
                        style={{ fontSize: 13, color: colors.text }}
                      >
                        ₱{order.deliveryFee.toLocaleString()}
                      </Text>
                    </View>
                  ) : null}
                  {(order.extraChargesTotal ?? 0) > 0 ? (
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          color: colors.textSecondary,
                        }}
                      >
                        Extra charges
                      </Text>
                      <Text
                        style={{ fontSize: 13, color: colors.text }}
                      >
                        +₱
                        {(
                          order.extraChargesTotal ?? 0
                        ).toLocaleString()}
                      </Text>
                    </View>
                  ) : null}
                  {isScPwd &&
                    order.vatExemptSale &&
                    order.vatExemptSale > 0 ? (
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          color: colors.textSecondary,
                        }}
                      >
                        VAT Exempt Sale
                      </Text>
                      <Text
                        style={{ fontSize: 13, color: colors.text }}
                      >
                        ₱{order.vatExemptSale.toLocaleString()}
                      </Text>
                    </View>
                  ) : null}
                  {order.vatAmount != null ? (
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          color: colors.textSecondary,
                        }}
                      >
                        VAT (12%)
                      </Text>
                      <Text
                        style={{ fontSize: 13, color: colors.text }}
                      >
                        ₱{Number(order.vatAmount).toLocaleString()}
                      </Text>
                    </View>
                  ) : null}
                  {hasDiscount ? (
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          color: colors.textSecondary,
                        }}
                      >
                        Discount (
                        {order.discountType
                          ?.replace('BNPC_', 'BNPC ')
                          .replace('_', ' ') ?? ''}
                        )
                      </Text>
                      <Text
                        style={{
                          fontSize: 13,
                          color: colors.success,
                          fontWeight: '600',
                        }}
                      >
                        -₱
                        {(order.discountAmount ?? 0).toLocaleString()}
                      </Text>
                    </View>
                  ) : null}
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      borderTopWidth: 1,
                      borderTopColor: colors.border,
                      paddingTop: 8,
                      marginTop: 2,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: '700',
                        color: isCancelled ? '#9CA3AF' : colors.primary,
                        textDecorationLine: isCancelled
                          ? 'line-through'
                          : 'none',
                      }}
                    >
                      Grand Total
                    </Text>
                    <Text
                      style={{
                        fontSize: 17,
                        fontWeight: '800',
                        color: isCancelled ? '#9CA3AF' : colors.primary,
                        textDecorationLine: isCancelled
                          ? 'line-through'
                          : 'none',
                      }}
                    >
                      ₱
                      {(
                        order.grandTotal ?? order.total
                      ).toLocaleString()}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Timeline */}
              <View
                style={{ paddingHorizontal: 16, marginTop: 20 }}
              >
                <SectionHeader title="TIMELINE" colors={colors} />
                <View style={{ paddingLeft: 4 }}>
                  <TimelineRow
                    label="Order placed"
                    time={`${formatDateTime(order.createdAt)}${order.createdAt
                      ? '  ' + timeAgo(order.createdAt)
                      : ''
                      }`}
                    done
                    colors={colors}
                  />
                  <TimelineRow
                    label="Packed"
                    time={
                      order.packedAt
                        ? `${formatDateTime(order.packedAt)}  ${timeAgo(
                          order.packedAt,
                        )}`
                        : '—'
                    }
                    done={!!order.packedAt}
                    colors={colors}
                  />
                  <TimelineRow
                    label="Out for delivery"
                    time={
                      order.riderName
                        ? `Rider: ${order.riderName}`
                        : '—'
                    }
                    done={
                      order.status === 'in_delivery' ||
                      order.status === 'received'
                    }
                    colors={colors}
                  />
                  <TimelineRow
                    label="Delivered"
                    time={
                      order.deliveredAt
                        ? `${formatDateTime(
                          order.deliveredAt,
                        )}  ${timeAgo(order.deliveredAt)}`
                        : '—'
                    }
                    done={order.status === 'received'}
                    colors={colors}
                  />
                  {isCancelled && (
                    <TimelineRow
                      label="Cancelled"
                      time={
                        order.cancelledAt
                          ? `${formatDateTime(
                            order.cancelledAt,
                          )}  ${timeAgo(order.cancelledAt)}`
                          : '—'
                      }
                      done
                      last
                      isError
                      colors={colors}
                    />
                  )}
                  {!isCancelled && (
                    /* dummy last to cap the line */
                    <TimelineRow
                      label=""
                      time=""
                      done={false}
                      last
                      colors={colors}
                    />
                  )}
                </View>
              </View>

              {/* Customer review */}
              {order.rating ? (
                <View
                  style={{ paddingHorizontal: 16, marginTop: 20 }}
                >
                  <SectionHeader
                    title="CUSTOMER REVIEW"
                    colors={colors}
                  />
                  <View
                    style={{
                      backgroundColor: colors.success + '18',
                      borderRadius: 12,
                      padding: 12,
                      borderWidth: 1,
                      borderColor: colors.success,
                    }}
                  >
                    <Text
                      style={{ fontSize: 20, marginBottom: 4 }}
                    >
                      {'⭐'.repeat(order.rating)}
                    </Text>
                    {order.review ? (
                      <Text
                        style={{
                          fontSize: 14,
                          color: colors.text,
                          lineHeight: 20,
                        }}
                      >
                        {order.review}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ) : null}

              <View style={{ height: 120 }} />
            </ScrollView>

            {/* Action button / cancel button row */}
            <View
              style={{
                padding: 16,
                paddingBottom:
                  Platform.OS === 'ios' ? 28 : 16,
                backgroundColor: colors.surface,
                borderTopWidth: 1,
                borderTopColor: colors.border,
                gap: 10,
              }}
            >
              {actionLoading ? (
                <View
                  style={{
                    borderRadius: 14,
                    paddingVertical: 15,
                    alignItems: 'center',
                    backgroundColor: colors.border,
                  }}
                >
                  <ActivityIndicator color={colors.primary} />
                </View>
              ) : isCancelled ? (
                <View
                  style={{
                    borderRadius: 14,
                    paddingVertical: 15,
                    alignItems: 'center',
                    backgroundColor: '#FEE2E2',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: '700',
                      color: '#DC2626',
                    }}
                  >
                    ✕ Order Cancelled
                  </Text>
                </View>
              ) : order.status === 'pending' ? (
                <>
                  <TouchableOpacity
                    style={{
                      backgroundColor: colors.accent,
                      borderRadius: 14,
                      paddingVertical: 15,
                      alignItems: 'center',
                    }}
                    onPress={handleConfirm}
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: '700',
                        color: '#fff',
                      }}
                    >
                      ✓ Accept Order
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{
                      borderRadius: 14,
                      paddingVertical: 13,
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: '#FECACA',
                      backgroundColor: '#FFF5F5',
                    }}
                    onPress={openCancelModal}
                  >
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: '600',
                        color: '#DC2626',
                      }}
                    >
                      ✕ Cancel Order
                    </Text>
                  </TouchableOpacity>
                </>
              ) : order.status === 'confirmed' ||
                order.status === 'preparing' ? (
                <>
                  <TouchableOpacity
                    style={{
                      backgroundColor: allChecked
                        ? colors.accent
                        : '#CBD5E1',
                      borderRadius: 14,
                      paddingVertical: 15,
                      alignItems: 'center',
                    }}
                    onPress={handleDonePacking}
                    disabled={!allChecked}
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: '700',
                        color: '#fff',
                      }}
                    >
                      {allChecked
                        ? '📦  Done Packing — Assign Rider'
                        : `Check all items (${checkedCount}/${order.items.length})`}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{
                      borderRadius: 14,
                      paddingVertical: 13,
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: '#FECACA',
                      backgroundColor: '#FFF5F5',
                    }}
                    onPress={openCancelModal}
                  >
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: '600',
                        color: '#DC2626',
                      }}
                    >
                      ✕ Cancel Order
                    </Text>
                  </TouchableOpacity>
                </>
              ) : order.status === 'packed' ? (
                <>
                  <TouchableOpacity
                    style={{
                      backgroundColor:
                        colors.primaryLight ?? colors.primary,
                      borderRadius: 14,
                      paddingVertical: 15,
                      alignItems: 'center',
                    }}
                    onPress={handleOutForDelivery}
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: '700',
                        color: '#fff',
                      }}
                    >
                      🛵 Out for Delivery
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{
                      borderRadius: 14,
                      paddingVertical: 13,
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: '#FECACA',
                      backgroundColor: '#FFF5F5',
                    }}
                    onPress={openCancelModal}
                  >
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: '600',
                        color: '#DC2626',
                      }}
                    >
                      ✕ Cancel Order
                    </Text>
                  </TouchableOpacity>
                </>
              ) : order.status === 'in_delivery' ? (
                <TouchableOpacity
                  style={{
                    backgroundColor: colors.success,
                    borderRadius: 14,
                    paddingVertical: 15,
                    alignItems: 'center',
                  }}
                  onPress={handleDelivered}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: '700',
                      color: '#fff',
                    }}
                  >
                    ✓ Mark as Delivered
                  </Text>
                </TouchableOpacity>
              ) : order.status === 'received' ? (
                <View
                  style={{
                    backgroundColor: colors.success + '18',
                    borderRadius: 14,
                    paddingVertical: 15,
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: '700',
                      color: colors.success,
                    }}
                  >
                    ✓ Order Completed
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      </Modal>
      <RiderNameModal
        visible={riderModalVisible}
        onConfirm={confirmRider}
        onCancel={() => setRiderModalVisible(false)}
        colors={colors}
      />
      <CancelOrderModal
        visible={cancelModalVisible}
        orderTxNum={order?.txNum ?? ''}
        onConfirm={(reason) => void handleCancelConfirm(reason)}
        onCancel={handleCancelDismiss}
        loading={cancelLoading}
        colors={colors}
      />
    </>
  );
}

// ─── New Order Notification Banner ───────────────────────────────────────────

function NewOrderBanner({
  order,
  onView,
}: {
  order: KompraOrder;
  onView: () => void;
}) {
  const { colors } = useTheme();
  const slide = useRef(new Animated.Value(-120)).current;

  useEffect(() => {
    Animated.spring(slide, {
      toValue: 0,
      useNativeDriver: true,
      tension: 80,
      friction: 10,
    }).start();
    const t = setTimeout(() => {
      Animated.timing(slide, {
        toValue: -120,
        useNativeDriver: true,
        duration: 300,
      }).start();
    }, 8000);
    return () => clearTimeout(t);
  }, []);

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: 0,
          left: 12,
          right: 12,
          backgroundColor: colors.primary,
          borderRadius: 14,
          flexDirection: 'row',
          alignItems: 'center',
          padding: 14,
          gap: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 12,
          elevation: 8,
        },
        { transform: [{ translateY: slide }] },
      ]}
    >
      <View
        style={{
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: colors.accent,
        }}
      />
      <View style={{ flex: 1 }}>
        <Text
          style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}
        >
          New Kompra Order!
        </Text>
        <Text
          style={{
            fontSize: 12,
            color: 'rgba(255,255,255,0.7)',
            marginTop: 1,
          }}
        >
          {order.customerName} ·{' '}
          ₱{(order.grandTotal ?? order.total).toLocaleString()}
        </Text>
      </View>
      <TouchableOpacity
        style={{
          backgroundColor: colors.accent,
          borderRadius: 8,
          paddingHorizontal: 14,
          paddingVertical: 7,
        }}
        onPress={onView}
      >
        <Text
          style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}
        >
          View
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function OrderManagement() {
  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = windowWidth >= 1024;
  const numCols =
    windowWidth >= 1024 ? 3 : windowWidth >= 768 ? 2 : 1;
  const { colors } = useTheme();

  const [orders, setOrders] = useState<KompraOrder[]>([]);
  const [activeTab, setActiveTab] = useState<0 | 1 | 2 | 3>(0);
  const [selectedOrder, setSelected] = useState<KompraOrder | null>(null);
  const [modalVisible, setModal] = useState(false);
  const [newOrderBanner, setBanner] = useState<KompraOrder | null>(null);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [viewModeLoaded, setViewModeLoaded] = useState(false);
  const {
    visible: errorVisible,
    title,
    text,
    showError,
    closeError,
  } = useErrorModal();

  // ── Persist view mode ────────────────────────────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem(VIEW_MODE_KEY)
      .then((val) => {
        if (val === 'table' || val === 'card') {
          setViewMode(
            isDesktop && val === 'table' ? 'table' : 'card',
          );
        }
      })
      .catch(() => { })
      .finally(() => setViewModeLoaded(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSetViewMode = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    AsyncStorage.setItem(VIEW_MODE_KEY, mode).catch(() => { });
  }, []);

  useEffect(() => {
    if (!isDesktop && viewMode === 'table') {
      setViewMode('card');
    }
  }, [isDesktop, viewMode]);

  // ── Data ─────────────────────────────────────────────────────────────────────
  const syncOrders = useCallback((nextOrders: KompraOrder[]) => {
    setOrders(nextOrders);
    setSelected((current) =>
      current
        ? nextOrders.find((o) => o.id === current.id) ?? current
        : current,
    );
  }, []);

  const loadOrders = useCallback(
    async (showRefresh = false) => {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoadingOrders(true);
      }
      try {
        const backendOrders =
          await KompraCOrderService.getKompraCOrdersForManagement({
            status: [
              'pending',
              'confirmed',
              'preparing',
              'packed',
              'in_delivery',
              'received',
              'cancelled',
            ],
            take: 100,
          });
        syncOrders(backendOrders.map(mapBackendOrder));
      } catch (error) {
        Alert.alert(
          'Unable to load orders',
          error instanceof Error
            ? error.message
            : 'Please try again.',
        );
      } finally {
        setLoadingOrders(false);
        setRefreshing(false);
      }
    },
    [syncOrders],
  );

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const handleStatusChange = useCallback(
    async (
      id: number,
      status: OrderStatus,
      updates?: Partial<KompraOrder>,
    ) => {
      try {
        let backendOrder: KompraCOrder;

        if (status === "confirmed") {
          backendOrder =
            await KompraCOrderService.confirmKompraOrder(id);
        } else if (status === "packed") {
          backendOrder =
            await KompraCOrderService.markKompraOrderPacked(id);
        } else if (status === "in_delivery") {
          backendOrder =
            await KompraCOrderService.assignKompraOrderRider(
              id,
              updates?.riderName ?? "Rider",
              updates?.riderPhone,
            );
        } else if (status === "received") {
          backendOrder =
            await KompraCOrderService.markKompraOrderDelivered(id);
        } else {
          throw new Error(
            `Unsupported status update: ${status}`,
          );
        }

        const updatedOrder = mapBackendOrder(backendOrder);

        setOrders((prev) =>
          prev.map((o) => (o.id === id ? updatedOrder : o)),
        );

        setSelected((current) =>
          current?.id === id ? updatedOrder : current,
        );

        return updatedOrder;
      } catch (error) {
        if (__DEV__) {
          console.log('[handleStatusChange] caught error:', error)
        }
        showError(error, "Order Update Failed");
        throw error; // optional: keep propagating
      }
    },
    [showError],
  );



  const openOrder = useCallback(
    (order: KompraOrder) => {
      const latest = orders.find((o) => o.id === order.id) ?? order;
      setSelected(latest);
      setModal(true);
    },
    [orders],
  );

  const newOrders = orders.filter(
    (o) =>
      o.status === 'pending' ||
      o.status === 'confirmed' ||
      o.status === 'preparing',
  );
  const processedOrders = orders.filter(
    (o) => o.status === 'packed' || o.status === 'in_delivery',
  );
  const deliveredOrders = orders.filter(
    (o) => o.status === 'received',
  );
  const cancelledOrders = orders.filter(
    (o) => o.status === 'cancelled',
  );

  const tabs = [
    {
      label: 'New Orders',
      count: newOrders.length,
      data: newOrders,
      emptyIcon: '🎉',
      emptyText: 'No new orders',
    },
    {
      label: 'In Progress',
      count: processedOrders.length,
      data: processedOrders,
      emptyIcon: '📦',
      emptyText: 'Nothing in progress',
    },
    {
      label: 'Delivered',
      count: deliveredOrders.length,
      data: deliveredOrders,
      emptyIcon: '✅',
      emptyText: 'No deliveries yet today',
    },
    {
      label: 'Cancelled',
      count: cancelledOrders.length,
      data: cancelledOrders,
      emptyIcon: '🚫',
      emptyText: 'No cancelled orders',
    },
  ] as const;

  const activeOrders = tabs[activeTab].data as KompraOrder[];
  const cardNumCols = numCols;
  const effectiveViewMode: ViewMode = isDesktop ? viewMode : 'card';
  const handleTableCancel = useCallback((order: KompraOrder) => {
    // TableRow's onCancel is only used to open its own cancel flow —
    // but TableRow calls onCancel(order) which goes nowhere now.
    // Simplest fix: open the detail modal first, which owns CancelOrderModal:
    openOrder(order);
  }, [openOrder]);
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={colors.primary}
      />

      {/* Header */}
      <View
        style={{
          backgroundColor: colors.primary,
          paddingTop: 15,
          paddingBottom: 16,
          paddingHorizontal: 20,
          flexDirection: 'row',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
        }}
      >
        <View>
          <Text
            style={{
              fontSize: 22,
              fontWeight: '700',
              color: '#fff',
              letterSpacing: -0.3,
            }}
          >
            Kompra Orders
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: 'rgba(255,255,255,0.6)',
              marginTop: 2,
            }}
          >
            Today ·{' '}
            {new Date().toLocaleDateString('en-PH', {
              month: 'short',
              day: 'numeric',
            })}
          </Text>
        </View>

        {/* View mode toggle — desktop only */}
        {isDesktop && viewModeLoaded && (
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: 'rgba(255,255,255,0.12)',
              borderRadius: 10,
              padding: 3,
              gap: 2,
            }}
          >
            <TouchableOpacity
              onPress={() => handleSetViewMode('card')}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 7,
                borderRadius: 8,
                backgroundColor:
                  effectiveViewMode === 'card'
                    ? 'rgba(255,255,255,0.22)'
                    : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              accessibilityLabel="Card view"
            >
              <CardViewIcon
                active={effectiveViewMode === 'card'}
                color="#fff"
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleSetViewMode('table')}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 7,
                borderRadius: 8,
                backgroundColor:
                  effectiveViewMode === 'table'
                    ? 'rgba(255,255,255,0.22)'
                    : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              accessibilityLabel="Table view"
            >
              <TableViewIcon
                active={effectiveViewMode === 'table'}
                color="#fff"
              />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          flexGrow: 0,
        }}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        {tabs.map((tab, i) => (
          <TouchableOpacity
            key={tab.label}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              paddingVertical: 13,
              paddingHorizontal: 16,
              borderBottomWidth: 2,
              borderBottomColor:
                activeTab === i ? colors.accent : 'transparent',
              minWidth: 100,
            }}
            onPress={() => setActiveTab(i as 0 | 1 | 2 | 3)}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: activeTab === i ? '700' : '500',
                color:
                  activeTab === i
                    ? colors.text
                    : colors.textSecondary,
              }}
            >
              {tab.label}
            </Text>
            {tab.count > 0 && (
              <View
                style={{
                  backgroundColor:
                    activeTab === i
                      ? i === 3
                        ? '#DC2626'
                        : colors.accent
                      : colors.border,
                  borderRadius: 10,
                  paddingHorizontal: 6,
                  paddingVertical: 1,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '700',
                    color:
                      activeTab === i
                        ? '#fff'
                        : colors.textSecondary,
                  }}
                >
                  {tab.count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loadingOrders && !refreshing && (
        <View
          style={{
            paddingTop: 32,
            alignItems: 'center',
            gap: 10,
          }}
        >
          <ActivityIndicator
            color={colors.primary}
            size="large"
          />
          <Text
            style={{ fontSize: 13, color: colors.textSecondary }}
          >
            Loading Kompra orders…
          </Text>
        </View>
      )}

      {/* Order list */}
      {!loadingOrders &&
        (effectiveViewMode === 'table' ? (
          <TableView
            orders={activeOrders}
            onView={openOrder}
            onCancel={handleTableCancel}
            onStatusChange={handleStatusChange}
            colors={colors}
          />
        ) : (
          <FlatList
            data={activeOrders}
            keyExtractor={(o) => String(o.id)}
            numColumns={cardNumCols}
            key={cardNumCols}
            columnWrapperStyle={
              cardNumCols > 1
                ? { gap: 10, paddingHorizontal: 12 }
                : undefined
            }
            contentContainerStyle={{
              paddingTop: 12,
              paddingBottom: 40,
              gap: 10,
              paddingHorizontal: cardNumCols === 1 ? 12 : 0,
            }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => void loadOrders(true)}
                tintColor={colors.primary}
              />
            }
            renderItem={({ item }) => (
              <OrderCard
                order={item}
                onPress={() => openOrder(item)}
                showBadge={item.status === 'pending'}
              />
            )}
            ListEmptyComponent={
              <View
                style={{
                  alignItems: 'center',
                  paddingTop: 80,
                  gap: 10,
                }}
              >
                <Text style={{ fontSize: 48 }}>
                  {tabs[activeTab].emptyIcon}
                </Text>
                <Text
                  style={{
                    fontSize: 15,
                    color: colors.textSecondary,
                    fontWeight: '500',
                  }}
                >
                  {tabs[activeTab].emptyText}
                </Text>
              </View>
            }
          />
        ))}

      {/* New order banner */}
      {newOrderBanner && (
        <NewOrderBanner
          order={newOrderBanner}
          onView={() => {
            openOrder(newOrderBanner);
            setBanner(null);
          }}
        />
      )}

      {/* Order detail modal */}
      <OrderDetailModal
        order={selectedOrder}
        visible={modalVisible}
        onClose={() => {
          setModal(false);
          setSelected(null);
        }}
        onStatusChange={handleStatusChange}
        onCancelConfirmed={(updated) => {
          // Keep the orders list in sync
          setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
          setModal(false);
          setSelected(null);
        }}
      />
      
      <ErrorModal
        visible={errorVisible}
        title={title}
        text={text}
        onClose={closeError}
      />
    </View>
  );
}