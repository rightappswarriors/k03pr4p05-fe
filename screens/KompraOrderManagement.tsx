// screens/OrderManagement.tsx
// POSVine Terminal — Kompra Order Management
//
// Rewrite notes:
// - FIX: safeParseDate guards all date rendering; no more NaN / "Invalid Date"
//   display. timeAgo and formatTime both use it.
// - FIX: actionLoading is reset inside useEffect([initialOrder]) so it can
//   never get stuck true when a new order is opened after a failed action.
// - FIX: BNPC / SC-PWD Customer section rendered in OrderDetailModal when
//   order.customerType !== 'REGULAR'. Data flows from backend via scPwdCustomer
//   relation (now included in kompraOrderManagementInclude on the server).
// - FIX: Extra charges section rendered when order.extraCharges is non-empty.
// - FIX: ORDER SUMMARY uses grandTotal and shows VAT / discount breakdown lines.
// - FEAT: LocationMapPreview component — Google Maps embed on web, react-native-maps
//   on mobile, coordinate fallback on either when unavailable.
// - STYLE: OrderDetailModal uses fade + transparent + centered overlay with
//   maxWidth: 560 so it looks correct on tablet / desktop web.

import React, { useState, useRef, useCallback, useEffect } from 'react';
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
import { useTheme } from '@/contexts/ThemeContext';
import {
  KompraCOrderService,
  type KompraCOrder,
} from '@/services/kompraCOrderService';
import type { CustomerType, DiscountType } from '@/services/salesOrder.service';
import { formatDateTime, timeAgo } from '@/utils/dateHelpers';

const { width } = Dimensions.get('window');

// ─── Types ────────────────────────────────────────────────────────────────────

type PaymentMethod = 'cash_on_delivery' | 'gcash' | 'paymaya' | 'card' | 'qrph';
type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'packed'
  | 'in_delivery'
  | 'received';

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
  createdAt?: string
  cancelledAt?: string;
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

// FIX: Safe date parser — prevents NaN propagation from invalid ISO strings
// that can come from the backend (null, undefined, empty string, malformed).
function hasTrackingEvent(order: KompraCOrder, event: string): boolean {
  return order.tracking?.some((row) => row.event === event) ?? false;
}

// Maps a backend KompraCOrder (from GraphQL) to the UI KompraOrder shape.
// All number coercions guard against null/undefined from nullable DB fields.
function mapBackendOrder(order: KompraCOrder): KompraOrder {
  const deliveryFee =
    order.fees?.find((fee) => fee.type === 'delivery')?.amount ??
    Math.max(0, Number(order.total ?? 0) - Number(order.subtotal ?? 0));

  // packedAt is derived from the outlet_preparing tracking event timestamp
  const packedAt = order.tracking?.find(
    (row) => row.event === 'outlet_preparing',
  )?.statusAt;

  // UI-only 'packed' status: backend stores 'preparing' + outlet_preparing event
  const uiStatus: OrderStatus =
    order.status === 'preparing' && hasTrackingEvent(order, 'outlet_preparing')
      ? 'packed'
      : (order.status as OrderStatus);

  // Map non-delivery fees into UI ExtraCharge objects for display
  const extraCharges = (order.fees ?? [])
    .filter((fee) => fee.type !== 'delivery')
    .map((fee) => ({
      id: String(fee.id),
      label: fee.label,
      amount: Number(fee.amount ?? 0),
    }));
  const extraChargesTotal = extraCharges.reduce((sum, c) => sum + c.amount, 0);

  // Map scPwdCustomer from backend relation (now included via kompraOrderManagementInclude)
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
        uiStatus === 'received',
      image: item.item?.image ?? undefined,
    })),
    subtotal: Number(order.subtotal ?? 0),
    deliveryFee: Number(deliveryFee ?? 0),
    total: Number(order.total ?? 0),
    status: uiStatus,
    // FIX: createdAt is always a valid ISO string from GraphQL DateTime scalar
    createdAt: order.createdAt,
    packedAt: order.packedAt,
    deliveredAt: order.deliveredAt ?? undefined,
    riderName: order.courier?.name ?? order.riderName ?? undefined,
    riderPhone: order.courier?.phone ?? order.riderPhone ?? undefined,
    customerNote: order.customerNote ?? undefined,
    // BNPC / SC-PWD fields
    customerType: order.customerType,
    discountType: order.discountType,
    scPwdCustomer,
    scPwdPax: order.scPwdPax,
    totalPax: order.totalPax,
    extraCharges: extraCharges.length > 0 ? extraCharges : undefined,
    extraChargesTotal,
    vatExemptSale: order.vatExemptSale != null ? Number(order.vatExemptSale) : undefined,
    discountAmount: order.discountAmount != null ? Number(order.discountAmount) : undefined,
    vatAmount: order.vatAmount != null ? Number(order.vatAmount) : undefined,
    grandTotal: order.grandTotal != null ? Number(order.grandTotal) : Number(order.total ?? 0),
  };
}

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
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800' }}>✓</Text>
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
        <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 1 }}>
          {item.quantity} {item.unit} · ₱{(item.price * item.quantity).toLocaleString()}
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
// Cross-platform replacement for Alert.prompt (iOS-only).

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
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 6 }}>
            Assign Rider
          </Text>
          <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 16 }}>
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
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.textSecondary }}>
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
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Order Card (list view) ───────────────────────────────────────────────────

function OrderCard({
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

  const pmConfig: Record<PaymentMethod, { label: string; color: string; bg: string }> = {
    cash_on_delivery: { label: 'Cash on Delivery', color: colors.success, bg: colors.success + '18' },
    gcash: { label: 'GCash', color: '#007AFF', bg: '#EBF5FF' },
    paymaya: { label: 'PayMaya', color: '#5B2D8E', bg: '#F3EBF9' },
    card: { label: 'Card', color: colors.primary, bg: colors.primary + '18' },
    qrph: { label: 'QR PH', color: colors.accent, bg: colors.accent + '18' },
  };
  const pm = pmConfig[order.paymentMethod];
  const { width: windowWidth } = useWindowDimensions();
  const isMultiCol = windowWidth >= 768;

  return (
    <TouchableOpacity
      style={{
        flex: 1,
        maxWidth: isMultiCol ? '50%' : undefined,
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
        position: 'relative',
      }}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, color: colors.textSecondary, fontFamily: 'monospace', marginBottom: 2 }}>
            {order.txNum}
          </Text>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
            {order.customerName}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <View style={{ backgroundColor: pm.bg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: pm.color }}>{pm.label}</Text>
          </View>
          {/* FIX: timeAgo now handles null/undefined/invalid dates */}
          <Text style={{ fontSize: 11, color: colors.textSecondary }}>{timeAgo(order.createdAt)}</Text>
        </View>
      </View>

      <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 8 }} numberOfLines={1}>
        📍 {order.address}
      </Text>

      <View style={{ gap: 2, marginBottom: 10 }}>
        {order.items.slice(0, 2).map((item) => (
          <Text key={item.id} style={{ fontSize: 12, color: colors.textSecondary }} numberOfLines={1}>
            · {item.quantity}× {item.name}
          </Text>
        ))}
        {order.items.length > 2 && (
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>
            · +{order.items.length - 2} more items
          </Text>
        )}
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 13, color: colors.textSecondary }}>
          Total:{' '}
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.primary }}>
            ₱{(order.grandTotal ?? order.total).toLocaleString()}
          </Text>
        </Text>

        {(order.status === 'confirmed' || order.status === 'preparing') ? (
          <View style={{ borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, backgroundColor: allChecked ? colors.success + '18' : colors.warning + '18' }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: allChecked ? colors.success : colors.warning }}>
              {order.items.filter((i) => i.checked).length}/{order.items.length} packed
            </Text>
          </View>
        ) : order.status === 'packed' ? (
          <View style={{ borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, backgroundColor: colors.accent + '18' }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.accent }}>📦 Ready</Text>
          </View>
        ) : order.status === 'in_delivery' ? (
          <View style={{ borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, backgroundColor: colors.primary + '18' }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>
              🛵 {order.riderName ?? 'Delivering…'}
            </Text>
          </View>
        ) : order.rating ? (
          <View style={{ borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, backgroundColor: colors.success + '18' }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.success }}>
              {'⭐'.repeat(order.rating)}
            </Text>
          </View>
        ) : null}
      </View>

      {/* SC/PWD badge on card */}
      {order.customerType && order.customerType !== 'REGULAR' && (
        <View style={{ position: 'absolute', top: 12, left: 12, backgroundColor: '#7C3AED', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
          <Text style={{ fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 0.5 }}>
            {order.customerType === 'PWD' ? 'PWD' : 'SC'}
          </Text>
        </View>
      )}

      {showBadge && (
        <View style={{ position: 'absolute', bottom: 12, right: 12, backgroundColor: colors.accent, borderRadius: 4, paddingHorizontal: 7, paddingVertical: 2 }}>
          <Text style={{ fontSize: 10, fontWeight: '800', color: '#fff', letterSpacing: 0.5 }}>NEW</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Location Map Preview ─────────────────────────────────────────────────────
// Web: Google Maps Embed iframe. Mobile: react-native-maps if installed.
// Falls back to coordinate text on either platform if unavailable.

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
    lat != null && lng != null && isFinite(lat) && isFinite(lng) && lat !== 0 && lng !== 0;

  if (!validCoords) {
    return (
      <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', minHeight: 80 }}>
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
      <View style={{ backgroundColor: colors.surface, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
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
          <View style={{ height: 80, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
              📍 {address ?? `${lat?.toFixed(4)}, ${lng?.toFixed(4)}`}
            </Text>
          </View>
        )}
        {address ? (
          <View style={{ padding: 10 }}>
            <Text style={{ color: colors.textSecondary, fontSize: 12 }} numberOfLines={1}>{address}</Text>
          </View>
        ) : null}
      </View>
    );
  }

  // Mobile: try react-native-maps
  const [MapView, Marker] = React.useMemo(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Maps = require('react-native-maps');
      return [Maps.default ?? Maps.MapView, Maps.Marker ?? Maps.default?.Marker];
    } catch {
      return [null, null];
    }
  }, []);

  if (MapView && Marker) {
    return (
      <View style={{ backgroundColor: colors.surface, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, height: 180 }}>
        <MapView
          style={{ flex: 1 }}
          initialRegion={{ latitude: lat, longitude: lng, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
          scrollEnabled={false}
          zoomEnabled={false}
        >
          <Marker coordinate={{ latitude: lat, longitude: lng }} />
        </MapView>
        {address ? (
          <View style={{ padding: 10 }}>
            <Text style={{ color: colors.textSecondary, fontSize: 12 }} numberOfLines={1}>{address}</Text>
          </View>
        ) : null}
      </View>
    );
  }

  // Fallback: plain coordinate display
  return (
    <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border }}>
      <Text style={{ color: colors.textSecondary, fontSize: 11, marginBottom: 4 }}>Coordinates</Text>
      <Text style={{ color: colors.text, fontFamily: 'monospace', fontSize: 13 }}>
        {lat.toFixed(6)}, {lng.toFixed(6)}
      </Text>
      {address ? (
        <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 6 }} numberOfLines={2}>{address}</Text>
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
  colors,
}: {
  label: string;
  time: string;
  done: boolean;
  last?: boolean;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 12, marginBottom: last ? 0 : 16 }}>
      <View style={{ alignItems: 'center' }}>
        <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: done ? colors.success : colors.border, borderWidth: 2, borderColor: done ? colors.success : colors.border }} />
        {!last && (
          <View style={{ width: 2, flex: 1, minHeight: 20, backgroundColor: done ? colors.success : colors.border, marginTop: 2, marginBottom: 2, alignSelf: 'center' }} />
        )}
      </View>
      <View style={{ flex: 1, paddingBottom: last ? 0 : 4 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: done ? colors.text : colors.textSecondary }}>{label}</Text>
        <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 1 }}>{time}</Text>
      </View>
    </View>
  );
}

// ─── Section Header helper ────────────────────────────────────────────────────

function SectionHeader({ title, colors }: { title: string; colors: ReturnType<typeof useTheme>['colors'] }) {
  return (
    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary, letterSpacing: 0.8, marginBottom: 10 }}>
      {title}
    </Text>
  );
}

// ─── Order Detail Modal ───────────────────────────────────────────────────────

function OrderDetailModal({
  order: initialOrder,
  visible,
  onClose,
  onStatusChange,
}: {
  order: KompraOrder | null;
  visible: boolean;
  onClose: () => void;
  onStatusChange: (
    id: number,
    status: OrderStatus,
    updates?: Partial<KompraOrder>,
  ) => Promise<KompraOrder>;
}) {
  const { colors } = useTheme();
  const [order, setOrder] = useState<KompraOrder | null>(initialOrder);
  const [riderModalVisible, setRiderModalVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // FIX: Reset both the order state AND actionLoading whenever a new order is
  // opened. This prevents actionLoading from being stuck true if a previous
  // action threw an error before the modal was closed and re-opened.
  useEffect(() => {
    setOrder(initialOrder);
    setActionLoading(false);
  }, [initialOrder]);

  if (!order) return null;

  const pmConfig: Record<PaymentMethod, { label: string; color: string; bg: string }> = {
    cash_on_delivery: { label: 'Cash on Delivery', color: colors.success, bg: colors.success + '18' },
    gcash: { label: 'GCash', color: '#007AFF', bg: '#EBF5FF' },
    paymaya: { label: 'PayMaya', color: '#5B2D8E', bg: '#F3EBF9' },
    card: { label: 'Card', color: colors.primary, bg: colors.primary + '18' },
    qrph: { label: 'QR PH', color: colors.accent, bg: colors.accent + '18' },
  };
  const pm = pmConfig[order.paymentMethod];

  const allChecked = order.items.every((i) => i.checked);
  const checkedCount = order.items.filter((i) => i.checked).length;
  const hasDiscount = Boolean(order.discountAmount && order.discountAmount > 0);
  const isScPwd = Boolean(order.customerType && order.customerType !== 'REGULAR');

  const toggleItem = (itemId: number) => {
    if (order.status !== 'confirmed' && order.status !== 'preparing') return;
    setOrder((prev) =>
      prev
        ? { ...prev, items: prev.items.map((i) => (i.id === itemId ? { ...i, checked: !i.checked } : i)) }
        : prev,
    );
  };

  const persistStatus = async (status: OrderStatus, updates?: Partial<KompraOrder>) => {
    if (!order) return null;
    // FIX: Guard duplicate taps, but log a warning instead of silently returning
    if (actionLoading) {
      console.warn('[Kompra] persistStatus: action already in progress for', status);
      return null;
    }
    setActionLoading(true);
    try {
      const updated = await onStatusChange(order.id, status, updates);
      setOrder(updated);
      return updated;
    } catch (error) {
      Alert.alert('Update failed', error instanceof Error ? error.message : 'Please try again.');
      return null;
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirm = () => { void persistStatus('confirmed'); };

  const handleDonePacking = () => {
    if (!allChecked) {
      Alert.alert('Not yet', 'Please check all items before marking as packed.');
      return;
    }
    void persistStatus('packed', { items: order.items });
  };

  const handleOutForDelivery = () => { setRiderModalVisible(true); };

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
      const confirmed = window.confirm(
        'Confirm the order has been successfully delivered to the customer.'
      );

      if (confirmed) {
        confirmDelivery();
      }
    } else {
      Alert.alert(
        'Mark as Delivered?',
        'Confirm the order has been successfully delivered to the customer.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delivered',
            onPress: confirmDelivery,
          },
        ]
      );
    }
  };

  return (
    <>
      {/* STYLE: fade + transparent + centered overlay with maxWidth constraint */}
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
                backgroundColor: colors.primary,
                paddingTop: 18,
                paddingBottom: 18,
                paddingHorizontal: 20,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
            >
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace', marginBottom: 3 }}>
                  {order.txNum}
                </Text>
                <Text style={{ fontSize: 17, fontWeight: '700', color: '#fff' }} numberOfLines={1}>
                  {order.customerName}
                </Text>
                {order.customerPhone ? (
                  <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
                    {order.customerPhone}
                  </Text>
                ) : null}
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>

              {/* Payment + payment status badges */}
              <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 16, flexWrap: 'wrap' }}>
                <View style={{ backgroundColor: pm.bg, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: pm.color }}>{pm.label}</Text>
                </View>
                <View
                  style={{
                    backgroundColor: order.paymentStatus === 'paid' ? colors.success + '18' : colors.warning + '18',
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: order.paymentStatus === 'paid' ? colors.success : colors.warning }}>
                    {order.paymentStatus === 'paid' ? '✓ Paid' : '⏳ Collect on delivery'}
                  </Text>
                </View>
                {isScPwd && (
                  <View style={{ backgroundColor: '#7C3AED18', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#7C3AED' }}>
                      {order.customerType === 'PWD' ? 'PWD Discount' : 'Senior Citizen Discount'}
                    </Text>
                  </View>
                )}
              </View>

              {/* Delivery location + map */}
              <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
                <SectionHeader title="DELIVERY LOCATION" colors={colors} />
                <LocationMapPreview lat={order.lat} lng={order.lng} address={order.address} colors={colors} />
              </View>

              {/* Customer note */}
              {order.customerNote ? (
                <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
                  <SectionHeader title="CUSTOMER NOTE" colors={colors} />
                  <View style={{ backgroundColor: colors.warning + '18', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.warning }}>
                    <Text style={{ fontSize: 14, color: colors.text, lineHeight: 20 }}>{order.customerNote}</Text>
                  </View>
                </View>
              ) : null}

              {/* Items checklist */}
              <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <SectionHeader title="ITEMS TO PACK" colors={colors} />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: allChecked ? colors.success : colors.warning }}>
                    {checkedCount}/{order.items.length} checked
                  </Text>
                </View>
                {order.items.map((item) => (
                  <ItemCheckRow
                    key={item.id}
                    item={item}
                    onToggle={() => toggleItem(item.id)}
                    locked={order.status !== 'confirmed' && order.status !== 'preparing'}
                    colors={colors}
                  />
                ))}
              </View>

              {/* ── SC/PWD Customer & BNPC Discount section ───────────────────
                  Shown when customerType is SENIOR_CITIZEN or PWD.
                  Data comes from the scPwdCustomer relation now included in
                  kompraOrderManagementInclude on the backend. */}
              {isScPwd && (
                <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
                  <SectionHeader title="SC / PWD CUSTOMER" colors={colors} />
                  <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#7C3AED44', gap: 8 }}>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 13, color: colors.textSecondary }}>Customer Type</Text>
                      <Text style={{ fontSize: 13, color: '#7C3AED', fontWeight: '700' }}>
                        {order.customerType === 'PWD' ? 'Person with Disability' : 'Senior Citizen'}
                      </Text>
                    </View>

                    {order.discountType && order.discountType !== 'NONE' && (
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 13, color: colors.textSecondary }}>Discount Type</Text>
                        <Text style={{ fontSize: 13, color: colors.text, fontWeight: '600' }}>
                          {order.discountType.replace('BNPC_', 'BNPC ').replace('_', ' ')}
                        </Text>
                      </View>
                    )}

                    {order.scPwdCustomer ? (
                      <>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={{ fontSize: 13, color: colors.textSecondary }}>Name</Text>
                          <Text style={{ fontSize: 13, color: colors.text, fontWeight: '600', flex: 1, textAlign: 'right', marginLeft: 12 }} numberOfLines={1}>
                            {order.scPwdCustomer.fullName}
                          </Text>
                        </View>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                            {order.scPwdCustomer.idType === 'OSCA' ? 'OSCA ID' : order.scPwdCustomer.idType === 'PWD' ? 'PWD ID' : 'Gov. ID'}
                          </Text>
                          <Text style={{ fontSize: 13, color: colors.text, fontFamily: 'monospace' }}>
                            {order.scPwdCustomer.idNumber}
                          </Text>
                        </View>

                        {order.scPwdCustomer.isRepresentative && order.scPwdCustomer.representativeName ? (
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ fontSize: 13, color: colors.textSecondary }}>Representative</Text>
                            <Text style={{ fontSize: 13, color: colors.text }}>{order.scPwdCustomer.representativeName}</Text>
                          </View>
                        ) : null}
                      </>
                    ) : null}

                    {order.totalPax && order.totalPax > 1 ? (
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 13, color: colors.textSecondary }}>Pax (Total / SC-PWD)</Text>
                        <Text style={{ fontSize: 13, color: colors.text }}>
                          {order.totalPax} / {order.scPwdPax ?? 1}
                        </Text>
                      </View>
                    ) : null}

                    {order.vatExemptSale && order.vatExemptSale > 0 ? (
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 13, color: colors.textSecondary }}>VAT Exempt Sale</Text>
                        <Text style={{ fontSize: 13, color: colors.text }}>₱{order.vatExemptSale.toLocaleString()}</Text>
                      </View>
                    ) : null}

                    {hasDiscount ? (
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#7C3AED22', paddingTop: 8, marginTop: 2 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.success }}>Discount Applied</Text>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: colors.success }}>
                          -₱{(order.discountAmount ?? 0).toLocaleString()}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              )}

              {/* ── Extra Charges section ──────────────────────────────────────
                  Shown when non-delivery fees exist (e.g. packaging, handling).
                  These come from KompraCOrderFee rows mapped in mapBackendOrder. */}
              {order.extraCharges && order.extraCharges.length > 0 ? (
                <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
                  <SectionHeader title="EXTRA CHARGES" colors={colors} />
                  <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border, gap: 8 }}>
                    {order.extraCharges.map((charge) => (
                      <View key={charge.id} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 13, color: colors.textSecondary }}>{charge.label}</Text>
                        <Text style={{ fontSize: 13, color: colors.text, fontWeight: '600' }}>
                          ₱{Number(charge.amount).toLocaleString()}
                        </Text>
                      </View>
                    ))}
                    {(order.extraChargesTotal ?? 0) > 0 ? (
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, marginTop: 2 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>Total Extra</Text>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>
                          +₱{(order.extraChargesTotal ?? 0).toLocaleString()}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              ) : null}

              {/* ── Order Summary ──────────────────────────────────────────────
                  Shows full VAT/discount breakdown matching SalesScreen style.
                  Uses grandTotal as the final amount (includes delivery + extras). */}
              <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
                <SectionHeader title="ORDER SUMMARY" colors={colors} />
                <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border, gap: 8 }}>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 13, color: colors.textSecondary }}>Gross Sales (VAT Incl.)</Text>
                    <Text style={{ fontSize: 13, color: colors.text }}>₱{order.subtotal.toLocaleString()}</Text>
                  </View>

                  {order.deliveryFee > 0 ? (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 13, color: colors.textSecondary }}>Delivery fee</Text>
                      <Text style={{ fontSize: 13, color: colors.text }}>₱{order.deliveryFee.toLocaleString()}</Text>
                    </View>
                  ) : null}

                  {(order.extraChargesTotal ?? 0) > 0 ? (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 13, color: colors.textSecondary }}>Extra charges</Text>
                      <Text style={{ fontSize: 13, color: colors.text }}>+₱{(order.extraChargesTotal ?? 0).toLocaleString()}</Text>
                    </View>
                  ) : null}

                  {isScPwd && order.vatExemptSale && order.vatExemptSale > 0 ? (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 13, color: colors.textSecondary }}>VAT Exempt Sale</Text>
                      <Text style={{ fontSize: 13, color: colors.text }}>₱{order.vatExemptSale.toLocaleString()}</Text>
                    </View>
                  ) : null}

                  {order.vatAmount != null ? (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 13, color: colors.textSecondary }}>VAT (12%)</Text>
                      <Text style={{ fontSize: 13, color: colors.text }}>₱{Number(order.vatAmount).toLocaleString()}</Text>
                    </View>
                  ) : null}

                  {hasDiscount ? (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                        Discount ({order.discountType?.replace('BNPC_', 'BNPC ').replace('_', ' ') ?? ''})
                      </Text>
                      <Text style={{ fontSize: 13, color: colors.success, fontWeight: '600' }}>
                        -₱{(order.discountAmount ?? 0).toLocaleString()}
                      </Text>
                    </View>
                  ) : null}

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, marginTop: 2 }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: colors.primary }}>Grand Total</Text>
                    <Text style={{ fontSize: 17, fontWeight: '800', color: colors.primary }}>
                      ₱{(order.grandTotal ?? order.total).toLocaleString()}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Timeline */}
              <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
                <SectionHeader title="TIMELINE" colors={colors} />
                <View style={{ paddingLeft: 4 }}>
                  {/* FIX: formatTime now uses safeParseDate — no more "Invalid Date" */}
                  <TimelineRow label="Order placed" time={`${formatDateTime(order.createdAt)} ${order.createdAt && timeAgo(order.createdAt)}`} done colors={colors} />
                  <TimelineRow label="Packed" time={`${formatDateTime(order.packedAt)} ${order.packedAt && timeAgo(order.packedAt)}`} done={!!order.packedAt} colors={colors} />
                  <TimelineRow
                    label="Out for delivery"
                    time={order.riderName ? `Rider: ${order.riderName}` : '—'}
                    done={order.status === 'in_delivery' || order.status === 'received'}
                    colors={colors}
                  />
                  <TimelineRow
                    label="Delivered"
                    time={`${formatDateTime(order.deliveredAt)} ${order.deliveredAt && timeAgo(order.deliveredAt)}`}
                    done={order.status === 'received'}
                    last
                    colors={colors}
                  />
                </View>
              </View>

              {/* Customer review */}
              {order.rating ? (
                <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
                  <SectionHeader title="CUSTOMER REVIEW" colors={colors} />
                  <View style={{ backgroundColor: colors.success + '18', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.success }}>
                    <Text style={{ fontSize: 20, marginBottom: 4 }}>{'⭐'.repeat(order.rating)}</Text>
                    {order.review ? (
                      <Text style={{ fontSize: 14, color: colors.text, lineHeight: 20 }}>{order.review}</Text>
                    ) : null}
                  </View>
                </View>
              ) : null}

              <View style={{ height: 120 }} />
            </ScrollView>

            {/* Action button */}
            <View style={{ padding: 16, paddingBottom: Platform.OS === 'ios' ? 28 : 16, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border }}>
              {actionLoading ? (
                <View style={{ borderRadius: 14, paddingVertical: 15, alignItems: 'center', backgroundColor: colors.border }}>
                  <ActivityIndicator color={colors.primary} />
                </View>
              ) : order.status === 'pending' ? (
                <TouchableOpacity
                  style={{ backgroundColor: colors.accent, borderRadius: 14, paddingVertical: 15, alignItems: 'center' }}
                  onPress={handleConfirm}
                >
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>✓ Accept Order</Text>
                </TouchableOpacity>
              ) : order.status === 'confirmed' || order.status === 'preparing' ? (
                <TouchableOpacity
                  style={{ backgroundColor: allChecked ? colors.accent : '#CBD5E1', borderRadius: 14, paddingVertical: 15, alignItems: 'center' }}
                  onPress={handleDonePacking}
                  disabled={!allChecked}
                >
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>
                    {allChecked
                      ? '📦  Done Packing — Assign Rider'
                      : `Check all items (${checkedCount}/${order.items.length})`}
                  </Text>
                </TouchableOpacity>
              ) : order.status === 'packed' ? (
                <TouchableOpacity
                  style={{ backgroundColor: colors.primaryLight ?? colors.primary, borderRadius: 14, paddingVertical: 15, alignItems: 'center' }}
                  onPress={handleOutForDelivery}
                >
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>🛵 Out for Delivery</Text>
                </TouchableOpacity>
              ) : order.status === 'in_delivery' ? (
                <TouchableOpacity
                  style={{ backgroundColor: colors.success, borderRadius: 14, paddingVertical: 15, alignItems: 'center' }}
                  onPress={handleDelivered}
                >
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>✓ Mark as Delivered</Text>
                </TouchableOpacity>
              ) : order.status === 'received' ? (
                <View style={{ backgroundColor: colors.success + '18', borderRadius: 14, paddingVertical: 15, alignItems: 'center' }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: colors.success }}>✓ Order Completed</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      </Modal>

      {/* Rider name input modal */}
      <RiderNameModal
        visible={riderModalVisible}
        onConfirm={confirmRider}
        onCancel={() => setRiderModalVisible(false)}
        colors={colors}
      />
    </>
  );
}

// ─── New Order Notification Banner ───────────────────────────────────────────

function NewOrderBanner({ order, onView }: { order: KompraOrder; onView: () => void }) {
  const { colors } = useTheme();
  const slide = useRef(new Animated.Value(-120)).current;

  useEffect(() => {
    Animated.spring(slide, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }).start();
    const t = setTimeout(() => {
      Animated.timing(slide, { toValue: -120, useNativeDriver: true, duration: 300 }).start();
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
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent }} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>New Kompra Order!</Text>
        <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 1 }}>
          {order.customerName} · ₱{(order.grandTotal ?? order.total).toLocaleString()}
        </Text>
      </View>
      <TouchableOpacity
        style={{ backgroundColor: colors.accent, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 }}
        onPress={onView}
      >
        <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>View</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function OrderManagement() {
  const { width: windowWidth } = useWindowDimensions();
  const numCols = windowWidth >= 768 ? 2 : 1
  const { colors } = useTheme();
  const [orders, setOrders] = useState<KompraOrder[]>([]);
  const [activeTab, setActiveTab] = useState<0 | 1 | 2>(0);
  const [selectedOrder, setSelected] = useState<KompraOrder | null>(null);
  const [modalVisible, setModal] = useState(false);
  const [newOrderBanner, setBanner] = useState<KompraOrder | null>(null);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Syncs the orders list and keeps selectedOrder up to date if it's open
  const syncOrders = useCallback((nextOrders: KompraOrder[]) => {
    setOrders(nextOrders);
    setSelected((current) =>
      current ? (nextOrders.find((o) => o.id === current.id) ?? current) : current,
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
        const backendOrders = await KompraCOrderService.getKompraCOrdersForManagement({
          status: ['pending', 'confirmed', 'preparing', 'in_delivery', 'received'],
          take: 100,
        });
        syncOrders(backendOrders.map(mapBackendOrder));
      } catch (error) {
        Alert.alert(
          'Unable to load orders',
          error instanceof Error ? error.message : 'Please try again.',
        );
        // Fall back to mock data during development if backend is unavailable

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

  // All status changes go through the backend and replace local state with the
  // server response — including all joined customer, courier, fee, and tracking data.
  const handleStatusChange = useCallback(
    async (id: number, status: OrderStatus, updates?: Partial<KompraOrder>) => {
      let backendOrder: KompraCOrder;

      if (status === 'confirmed') {
        backendOrder = await KompraCOrderService.confirmKompraOrder(id);
      } else if (status === 'packed') {
        backendOrder = await KompraCOrderService.markKompraOrderPacked(id);
      } else if (status === 'in_delivery') {
        backendOrder = await KompraCOrderService.assignKompraOrderRider(
          id,
          updates?.riderName ?? 'Rider',
          updates?.riderPhone,
        );
      } else if (status === 'received') {
        backendOrder = await KompraCOrderService.markKompraOrderDelivered(id);
      } else {
        throw new Error(`Unsupported status update: ${status}`);
      }

      const updatedOrder = mapBackendOrder(backendOrder);

      setOrders((prev) => prev.map((o) => (o.id === id ? updatedOrder : o)));
      setSelected((current) => (current?.id === id ? updatedOrder : current));

      return updatedOrder;
    },
    [],
  );

  const openOrder = (order: KompraOrder) => {
    // Always read the freshest copy from state before opening
    const latest = orders.find((o) => o.id === order.id) ?? order;
    setSelected(latest);
    setModal(true);
  };

  const newOrders = orders.filter(
    (o) => o.status === 'pending' || o.status === 'confirmed' || o.status === 'preparing',
  );
  const processedOrders = orders.filter(
    (o) => o.status === 'packed' || o.status === 'in_delivery',
  );
  const deliveredOrders = orders.filter((o) => o.status === 'received');

  const tabs = [
    { label: 'New Orders', count: newOrders.length, data: newOrders },
    { label: 'In Progress', count: processedOrders.length, data: processedOrders },
    { label: 'Delivered', count: deliveredOrders.length, data: deliveredOrders },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* Header */}
      <View style={{ backgroundColor: colors.primary, paddingTop: 15, paddingBottom: 16, paddingHorizontal: 20 }}>
        <Text style={{ fontSize: 22, fontWeight: '700', color: '#fff', letterSpacing: -0.3 }}>
          Kompra Orders
        </Text>
        <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>
          Today ·{' '}
          {new Date().toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
        </Text>
      </View>

      {/* Tabs */}
      <View style={{ flexDirection: 'row', backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        {tabs.map((tab, i) => (
          <TouchableOpacity
            key={tab.label}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              paddingVertical: 13,
              borderBottomWidth: 2,
              borderBottomColor: activeTab === i ? colors.accent : 'transparent',
            }}
            onPress={() => setActiveTab(i as 0 | 1 | 2)}
          >
            <Text style={{ fontSize: 13, fontWeight: activeTab === i ? '700' : '500', color: activeTab === i ? colors.text : colors.textSecondary }}>
              {tab.label}
            </Text>
            {tab.count > 0 && (
              <View style={{ backgroundColor: activeTab === i ? colors.accent : colors.border, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: activeTab === i ? '#fff' : colors.textSecondary }}>
                  {tab.count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {loadingOrders && !refreshing && (
        <View style={{ paddingTop: 32, alignItems: 'center', gap: 10 }}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={{ fontSize: 13, color: colors.textSecondary }}>Loading Kompra orders…</Text>
        </View>
      )}

      {/* Order list */}
      {!loadingOrders && (
        <FlatList
          data={tabs[activeTab].data}
          keyExtractor={(o) => String(o.id)}
          numColumns={numCols}
          key={numCols}
          columnWrapperStyle={
            numCols === 2
              ? { gap: 10, paddingHorizontal: 12 }
              : undefined
          }
          contentContainerStyle={{
            paddingTop: 12,
            paddingBottom: 40,
            gap: 10,
            // remove padding here when 2-col — columnWrapperStyle handles it
            paddingHorizontal: numCols === 1 ? 12 : 0,
          }}

          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void loadOrders(true)}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item }) => (
            <OrderCard order={item} onPress={() => openOrder(item)} showBadge={item.status === 'pending'} />
          )}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 80, gap: 10 }}>
              <Text style={{ fontSize: 48 }}>
                {activeTab === 0 ? '🎉' : activeTab === 1 ? '📦' : '✅'}
              </Text>
              <Text style={{ fontSize: 15, color: colors.textSecondary, fontWeight: '500' }}>
                {activeTab === 0
                  ? 'No new orders'
                  : activeTab === 1
                    ? 'Nothing in progress'
                    : 'No deliveries yet today'}
              </Text>
            </View>
          }
        />
      )}

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
      />
    </View>
  );
}