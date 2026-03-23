// screens/OrderManagement.tsx
// POSVine Terminal — Kompra Order Management
// React Native — mock data, swap apiFetch calls when backend is ready

import React, { useState, useRef, useCallback } from 'react';
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
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

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
  customerNote?: string;
  rating?: number;
  review?: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_ORDERS: KompraOrder[] = [
  {
    id: 1,
    txNum: 'EKU-20260317-0041',
    customerName: 'Maria Santos',
    customerPhone: '09991234567',
    address: '123 Rizal St, Talisay, Cebu',
    lat: 10.2445,
    lng: 123.8494,
    paymentMethod: 'gcash',
    paymentStatus: 'paid',
    items: [
      {
        id: 1,
        name: 'Ganador Rice 25kg',
        quantity: 2,
        unit: 'sack',
        price: 1200,
        checked: false,
      },
      {
        id: 2,
        name: 'Century Tuna Flakes',
        quantity: 5,
        unit: 'can',
        price: 38,
        checked: false,
      },
      {
        id: 3,
        name: 'Lucky Me Pancit Canton',
        quantity: 3,
        unit: 'pack',
        price: 15,
        checked: false,
      },
    ],
    subtotal: 2595,
    deliveryFee: 50,
    total: 2645,
    status: 'pending',
    placedAt: '2026-03-17T08:14:00Z',
    customerNote: 'Please pack the rice separately',
  },
  {
    id: 2,
    txNum: 'EKU-20260317-0042',
    customerName: 'Juan dela Cruz',
    customerPhone: '09181234567',
    address: '456 Mabini Ave, Minglanilla, Cebu',
    lat: 10.2349,
    lng: 123.8012,
    paymentMethod: 'cash_on_delivery',
    paymentStatus: 'unpaid',
    items: [
      {
        id: 4,
        name: 'Sprite 1.5L',
        quantity: 6,
        unit: 'bottle',
        price: 55,
        checked: false,
      },
      {
        id: 5,
        name: 'Chippy BBQ',
        quantity: 4,
        unit: 'pack',
        price: 27,
        checked: false,
      },
      {
        id: 6,
        name: 'Bear Brand Milk',
        quantity: 2,
        unit: 'can',
        price: 185,
        checked: false,
      },
    ],
    subtotal: 1070,
    deliveryFee: 65,
    total: 1135,
    status: 'pending',
    placedAt: '2026-03-17T08:31:00Z',
  },
  {
    id: 3,
    txNum: 'EKU-20260317-0039',
    customerName: 'Ana Reyes',
    customerPhone: '09561234567',
    address: '789 Osmeña Blvd, Cebu City',
    lat: 10.3157,
    lng: 123.8854,
    paymentMethod: 'card',
    paymentStatus: 'paid',
    items: [
      {
        id: 7,
        name: 'Nescafe 3in1',
        quantity: 10,
        unit: 'sachet',
        price: 8,
        checked: true,
      },
      {
        id: 8,
        name: 'Skyflakes Crackers',
        quantity: 3,
        unit: 'pack',
        price: 32,
        checked: true,
      },
    ],
    subtotal: 176,
    deliveryFee: 45,
    total: 221,
    status: 'in_delivery',
    placedAt: '2026-03-17T07:45:00Z',
    packedAt: '2026-03-17T08:05:00Z',
    riderName: 'Pedro Gomez',
  },
  {
    id: 4,
    txNum: 'EKU-20260317-0038',
    customerName: 'Rosa Gonzales',
    customerPhone: '09771234567',
    address: '321 Colon St, Cebu City',
    lat: 10.2945,
    lng: 123.8967,
    paymentMethod: 'gcash',
    paymentStatus: 'paid',
    items: [
      {
        id: 9,
        name: 'Milo 300g',
        quantity: 2,
        unit: 'pack',
        price: 125,
        checked: true,
      },
      {
        id: 10,
        name: 'Quickchow Oatmeal',
        quantity: 5,
        unit: 'sachet',
        price: 12,
        checked: true,
      },
    ],
    subtotal: 310,
    deliveryFee: 50,
    total: 360,
    status: 'received',
    placedAt: '2026-03-17T06:30:00Z',
    packedAt: '2026-03-17T06:55:00Z',
    deliveredAt: '2026-03-17T07:40:00Z',
    riderName: 'Carlo Bautista',
    rating: 5,
    review: 'Very fast delivery! Items were packed neatly.',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatTime(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-PH', {
    hour: '2-digit',
    minute: '2-digit',
  });
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
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          borderRadius: 12,
          padding: 12,
          marginBottom: 6,
          borderWidth: 1,
          backgroundColor: item.checked
            ? colors.success + '18'
            : colors.surface,
          borderColor: item.checked ? colors.success : colors.border,
        },
      ]}
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
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800' }}>
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
          style={{ fontSize: 12, color: colors.textSecondary, marginTop: 1 }}
        >
          {item.quantity} {item.unit} · ₱
          {(item.price * item.quantity).toLocaleString()}
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

// ─── Rider Name Modal (replaces Alert.prompt — cross-platform fix) ─────────────

function RiderNameModal({
  visible,
  onConfirm,
  onCancel,
  colors,
}: {
  visible: boolean;
  onConfirm: (name: string) => void;
  onCancel: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const [name, setName] = useState('');

  const handleConfirm = () => {
    onConfirm(name.trim() || 'Rider');
    setName('');
  };

  const handleCancel = () => {
    setName('');
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
            Rider Name
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: colors.textSecondary,
              marginBottom: 16,
            }}
          >
            Enter the rider or delivery person's name
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Pedro Gomez"
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
              marginBottom: 20,
            }}
            autoFocus
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
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>
                Confirm
              </Text>
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

  const pmConfig: Record<
    PaymentMethod,
    { label: string; color: string; bg: string }
  > = {
    cash_on_delivery: {
      label: 'Cash on Delivery',
      color: colors.success,
      bg: colors.success + '18',
    },
    gcash: { label: 'GCash', color: '#007AFF', bg: '#EBF5FF' },
    paymaya: { label: 'PayMaya', color: '#5B2D8E', bg: '#F3EBF9' },
    card: { label: 'Card', color: colors.primary, bg: colors.primary + '18' },
    qrph: { label: 'QR PH', color: colors.accent, bg: colors.accent + '18' },
  };
  const pm = pmConfig[order.paymentMethod];

  return (
    <TouchableOpacity
      style={{
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
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
            {order.customerName}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <View
            style={{
              backgroundColor: pm.bg,
              borderRadius: 8,
              paddingHorizontal: 8,
              paddingVertical: 3,
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '700', color: pm.color }}>
              {pm.label}
            </Text>
          </View>
          <Text style={{ fontSize: 11, color: colors.textSecondary }}>
            {timeAgo(order.placedAt)}
          </Text>
        </View>
      </View>

      <Text
        style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 8 }}
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
            style={{ fontSize: 15, fontWeight: '700', color: colors.primary }}
          >
            ₱{order.total.toLocaleString()}
          </Text>
        </Text>
        {order.status === 'confirmed' || order.status === 'preparing' ? (
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
              {order.items.filter((i) => i.checked).length}/{order.items.length}{' '}
              packed
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
              style={{ fontSize: 12, fontWeight: '600', color: colors.accent }}
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
              style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}
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
              style={{ fontSize: 12, fontWeight: '600', color: colors.success }}
            >
              {'⭐'.repeat(order.rating)}
            </Text>
          </View>
        ) : null}
      </View>

      {showBadge && (
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
    <View
      style={{ flexDirection: 'row', gap: 12, marginBottom: last ? 0 : 16 }}
    >
      <View style={{ alignItems: 'center' }}>
        <View
          style={{
            width: 12,
            height: 12,
            borderRadius: 6,
            backgroundColor: done ? colors.success : colors.border,
            borderWidth: 2,
            borderColor: done ? colors.success : colors.border,
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
            color: done ? colors.text : colors.textSecondary,
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
  ) => void;
}) {
  const { colors } = useTheme();
  const [order, setOrder] = useState<KompraOrder | null>(initialOrder);
  // FIX: cross-platform rider name input instead of Alert.prompt
  const [riderModalVisible, setRiderModalVisible] = useState(false);

  // Sync when initialOrder changes (also picks up parent state changes when modal re-opens)
  React.useEffect(() => {
    setOrder(initialOrder);
  }, [initialOrder]);

  if (!order) return null;

  const pmConfig: Record<
    PaymentMethod,
    { label: string; color: string; bg: string }
  > = {
    cash_on_delivery: {
      label: 'Cash on Delivery',
      color: colors.success,
      bg: colors.success + '18',
    },
    gcash: { label: 'GCash', color: '#007AFF', bg: '#EBF5FF' },
    paymaya: { label: 'PayMaya', color: '#5B2D8E', bg: '#F3EBF9' },
    card: { label: 'Card', color: colors.primary, bg: colors.primary + '18' },
    qrph: { label: 'QR PH', color: colors.accent, bg: colors.accent + '18' },
  };
  const pm = pmConfig[order.paymentMethod];

  const allChecked = order.items.every((i) => i.checked);
  const checkedCount = order.items.filter((i) => i.checked).length;

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

  const handleConfirm = () => {
    const updated: KompraOrder = { ...order, status: 'confirmed' };
    setOrder(updated);
    onStatusChange(order.id, 'confirmed');
  };

  const handleDonePacking = () => {
    if (!allChecked) {
      Alert.alert(
        'Not yet',
        'Please check all items before marking as packed.',
      );
      return;
    }
    const packedAt = new Date().toISOString();
    const updated: KompraOrder = { ...order, status: 'packed', packedAt };
    setOrder(updated);
    // FIX: propagate to parent so In Progress tab shows the order with correct status
    onStatusChange(order.id, 'packed', { packedAt, items: order.items });
  };

  // FIX: replaced Alert.prompt (iOS-only) with a cross-platform Modal
  const handleOutForDelivery = () => {
    setRiderModalVisible(true);
  };

  const confirmRider = (riderName: string) => {
    setRiderModalVisible(false);
    const updated: KompraOrder = { ...order, status: 'in_delivery', riderName };
    setOrder(updated);
    onStatusChange(order.id, 'in_delivery', { riderName });
  };

  const handleDelivered = () => {
    Alert.alert(
      'Mark as Delivered?',
      'Confirm the order has been successfully delivered to the customer.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delivered',
          style: 'default',
          onPress: () => {
            const deliveredAt = new Date().toISOString();
            const updated: KompraOrder = {
              ...order,
              status: 'received',
              deliveredAt,
            };
            setOrder(updated);
            onStatusChange(order.id, 'received', { deliveredAt });
            onClose();
          },
        },
      ],
    );
  };

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <StatusBar barStyle="light-content" />

          {/* Header */}
          <View
            style={{
              backgroundColor: colors.primary,
              paddingTop: 52,
              paddingBottom: 18,
              paddingHorizontal: 20,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
            }}
          >
            <View>
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
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff' }}>
                {order.customerName} · {order.customerPhone}
              </Text>
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
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>
                ✕
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            {/* Payment + status */}
            <View
              style={{
                flexDirection: 'row',
                gap: 8,
                paddingHorizontal: 16,
                paddingTop: 16,
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
                  style={{ fontSize: 13, fontWeight: '700', color: pm.color }}
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
            </View>

            {/* Address */}
            <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '700',
                  color: colors.textSecondary,
                  letterSpacing: 0.8,
                  marginBottom: 10,
                }}
              >
                DELIVERY ADDRESS
              </Text>
              <View
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 12,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text
                  style={{ fontSize: 14, color: colors.text, lineHeight: 20 }}
                >
                  {order.address}
                </Text>
                <Text
                  style={{
                    fontSize: 11,
                    color: colors.textSecondary,
                    fontFamily: 'monospace',
                    marginTop: 4,
                  }}
                >
                  {order.lat.toFixed(4)}, {order.lng.toFixed(4)}
                </Text>
              </View>
            </View>

            {/* Customer note */}
            {order.customerNote && (
              <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '700',
                    color: colors.textSecondary,
                    letterSpacing: 0.8,
                    marginBottom: 10,
                  }}
                >
                  CUSTOMER NOTE
                </Text>
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
                    style={{ fontSize: 14, color: colors.text, lineHeight: 20 }}
                  >
                    {order.customerNote}
                  </Text>
                </View>
              </View>
            )}

            {/* Items checklist */}
            <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 10,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '700',
                    color: colors.textSecondary,
                    letterSpacing: 0.8,
                  }}
                >
                  ITEMS TO PACK
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color: allChecked ? colors.success : colors.warning,
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
                    order.status !== 'confirmed' && order.status !== 'preparing'
                  }
                  colors={colors}
                />
              ))}
            </View>

            {/* Order summary */}
            <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '700',
                  color: colors.textSecondary,
                  letterSpacing: 0.8,
                  marginBottom: 10,
                }}
              >
                ORDER SUMMARY
              </Text>
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
                  <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                    Subtotal
                  </Text>
                  <Text style={{ fontSize: 13, color: colors.text }}>
                    ₱{order.subtotal.toLocaleString()}
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                  }}
                >
                  <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                    Delivery fee
                  </Text>
                  <Text style={{ fontSize: 13, color: colors.text }}>
                    ₱{order.deliveryFee.toLocaleString()}
                  </Text>
                </View>
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
                      color: colors.primary,
                    }}
                  >
                    Total
                  </Text>
                  <Text
                    style={{
                      fontSize: 17,
                      fontWeight: '800',
                      color: colors.primary,
                    }}
                  >
                    ₱{order.total.toLocaleString()}
                  </Text>
                </View>
              </View>
            </View>

            {/* Timeline */}
            <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '700',
                  color: colors.textSecondary,
                  letterSpacing: 0.8,
                  marginBottom: 10,
                }}
              >
                TIMELINE
              </Text>
              <View style={{ paddingLeft: 4 }}>
                <TimelineRow
                  label="Order placed"
                  time={formatTime(order.placedAt)}
                  done
                  colors={colors}
                />
                <TimelineRow
                  label="Packed"
                  time={formatTime(order.packedAt)}
                  done={!!order.packedAt}
                  colors={colors}
                />
                <TimelineRow
                  label="Out for delivery"
                  time={order.riderName ?? '—'}
                  done={
                    order.status === 'in_delivery' ||
                    order.status === 'received'
                  }
                  colors={colors}
                />
                <TimelineRow
                  label="Delivered"
                  time={formatTime(order.deliveredAt)}
                  done={order.status === 'received'}
                  last
                  colors={colors}
                />
              </View>
            </View>

            {/* Review */}
            {order.rating && (
              <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '700',
                    color: colors.textSecondary,
                    letterSpacing: 0.8,
                    marginBottom: 10,
                  }}
                >
                  CUSTOMER REVIEW
                </Text>
                <View
                  style={{
                    backgroundColor: colors.success + '18',
                    borderRadius: 12,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: colors.success,
                  }}
                >
                  <Text style={{ fontSize: 20, marginBottom: 4 }}>
                    {'⭐'.repeat(order.rating)}
                  </Text>
                  {order.review && (
                    <Text
                      style={{
                        fontSize: 14,
                        color: colors.text,
                        lineHeight: 20,
                      }}
                    >
                      {order.review}
                    </Text>
                  )}
                </View>
              </View>
            )}

            <View style={{ height: 120 }} />
          </ScrollView>

          {/* Action button */}
          <View
            style={{
              padding: 16,
              paddingBottom: 32,
              backgroundColor: colors.surface,
              borderTopWidth: 1,
              borderTopColor: colors.border,
            }}
          >
            {order.status === 'pending' && (
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
                  style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}
                >
                  ✓ Accept Order
                </Text>
              </TouchableOpacity>
            )}
            {(order.status === 'confirmed' || order.status === 'preparing') && (
              <TouchableOpacity
                style={{
                  backgroundColor: allChecked ? colors.accent : '#CBD5E1',
                  borderRadius: 14,
                  paddingVertical: 15,
                  alignItems: 'center',
                }}
                onPress={handleDonePacking}
              >
                <Text
                  style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}
                >
                  {allChecked
                    ? '📦  Done Packing — Assign Rider'
                    : `Check all items (${checkedCount}/${order.items.length})`}
                </Text>
              </TouchableOpacity>
            )}
            {order.status === 'packed' && (
              <TouchableOpacity
                style={{
                  backgroundColor: colors.primaryLight ?? colors.primary,
                  borderRadius: 14,
                  paddingVertical: 15,
                  alignItems: 'center',
                }}
                onPress={handleOutForDelivery}
              >
                <Text
                  style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}
                >
                  🛵 Out for Delivery
                </Text>
              </TouchableOpacity>
            )}
            {order.status === 'in_delivery' && (
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
                  style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}
                >
                  ✓ Mark as Delivered
                </Text>
              </TouchableOpacity>
            )}
            {order.status === 'received' && (
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
            )}
          </View>
        </View>
      </Modal>

      {/* FIX: cross-platform rider name input */}
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

function NewOrderBanner({
  order,
  onView,
}: {
  order: KompraOrder;
  onView: () => void;
}) {
  const { colors } = useTheme();
  const slide = useRef(new Animated.Value(-120)).current;

  React.useEffect(() => {
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
        <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>
          New Kompra Order!
        </Text>
        <Text
          style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 1 }}
        >
          {order.customerName} · ₱{order.total.toLocaleString()}
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
        <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>
          View
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function OrderManagement() {
  const { colors, theme } = useTheme();
  const [orders, setOrders] = useState<KompraOrder[]>(MOCK_ORDERS);
  const [activeTab, setActiveTab] = useState<0 | 1 | 2>(0);
  const [selectedOrder, setSelected] = useState<KompraOrder | null>(null);
  const [modalVisible, setModal] = useState(false);
  const [newOrderBanner, setBanner] = useState<KompraOrder | null>(null);

  // FIX: onStatusChange also syncs items (for packed items checklist state)
  const handleStatusChange = useCallback(
    (id: number, status: OrderStatus, updates?: Partial<KompraOrder>) => {
      setOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, status, ...updates } : o)),
      );
      // TODO: call real API
    },
    [],
  );

  // FIX: always read the latest order from state when opening modal
  const openOrder = (order: KompraOrder) => {
    const latest = orders.find((o) => o.id === order.id) ?? order;
    setSelected(latest);
    setModal(true);
  };

  const newOrders = orders.filter(
    (o) =>
      o.status === 'pending' ||
      o.status === 'confirmed' ||
      o.status === 'preparing',
  );
  const processedOrders = orders.filter(
    (o) => o.status === 'packed' || o.status === 'in_delivery',
  );
  const deliveredOrders = orders.filter((o) => o.status === 'received');

  const tabs = [
    { label: 'New Orders', count: newOrders.length, data: newOrders },
    {
      label: 'In Progress',
      count: processedOrders.length,
      data: processedOrders,
    },
    {
      label: 'Delivered',
      count: deliveredOrders.length,
      data: deliveredOrders,
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* Header */}
      <View
        style={{
          backgroundColor: colors.primary,
          paddingTop: 15,
          paddingBottom: 16,
          paddingHorizontal: 20,
        }}
      >
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
          style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}
        >
          Today ·{' '}
          {new Date().toLocaleDateString('en-PH', {
            month: 'short',
            day: 'numeric',
          })}
        </Text>
      </View>

      {/* Tabs */}
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
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
              borderBottomColor:
                activeTab === i ? colors.accent : 'transparent',
            }}
            onPress={() => setActiveTab(i as 0 | 1 | 2)}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: activeTab === i ? '700' : '500',
                color: activeTab === i ? colors.text : colors.textSecondary,
              }}
            >
              {tab.label}
            </Text>
            {tab.count > 0 && (
              <View
                style={{
                  backgroundColor:
                    activeTab === i ? colors.accent : colors.border,
                  borderRadius: 10,
                  paddingHorizontal: 6,
                  paddingVertical: 1,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '700',
                    color: activeTab === i ? '#fff' : colors.textSecondary,
                  }}
                >
                  {tab.count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Order list */}
      <FlatList
        data={tabs[activeTab].data}
        keyExtractor={(o) => String(o.id)}
        contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: 40 }}
        renderItem={({ item }) => (
          <OrderCard
            order={item}
            onPress={() => openOrder(item)}
            showBadge={item.status === 'pending'}
          />
        )}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 80, gap: 10 }}>
            <Text style={{ fontSize: 48 }}>
              {activeTab === 0 ? '🎉' : activeTab === 1 ? '📦' : '✅'}
            </Text>
            <Text
              style={{
                fontSize: 15,
                color: colors.textSecondary,
                fontWeight: '500',
              }}
            >
              {activeTab === 0
                ? 'No new orders'
                : activeTab === 1
                  ? 'Nothing in progress'
                  : 'No deliveries yet today'}
            </Text>
          </View>
        }
      />

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
