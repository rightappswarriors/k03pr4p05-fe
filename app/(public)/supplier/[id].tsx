// screens/SupplierPortalScreen.tsx
// Accessed via the one-time link from the restock email: /supplier/:token
// Supplier enters their temp password, reviews items, fills in qty + expiry, then sends or cancels.
//
// Route params: { token: string }
// Usage with expo-router: app/supplier/[token].tsx → import SupplierPortalScreen

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { graphQLRequest } from '@/services/apiClient'; // adjust to your GQL client
import { gql } from 'graphql-request';
import { useLocalSearchParams } from 'expo-router';

// ─── GraphQL ──────────────────────────────────────────────────────────────────

const GET_SUPPLIER_ORDER = gql`
  query GetSupplierOrder($token: String!) {
    getSupplierOrder(token: $token) {
      id
      status
      supplierEmail
      userMessage
      expectedArrival
      createdAt
      items {
        id
        itemId
        requestedQty
        deliveredQty
        expiryStartDate
        expiryEndDate
        exactExpiryDate
        item {
          id
          name
          barcode
        }
      }
    }
  }
`;

const ACKNOWLEDGE_ORDER = gql`
  mutation SupplierAcknowledgeOrder($token: String!) {
    supplierAcknowledgeOrder(token: $token) {
      id
      status
    }
  }
`;

const SUBMIT_ORDER = gql`
  mutation SupplierSubmitOrder(
    $token: String!
    $action: String!
    $items: [SupplierOrderItemInput!]!
    $message: String
  ) {
    supplierSubmitOrder(
      token: $token
      action: $action
      items: $items
      message: $message
    ) {
      id
      status
      supplierMessage
    }
  }
`;

// ─── Types ────────────────────────────────────────────────────────────────────

type OrderStatus =
  | 'pending'
  | 'acknowledged'
  | 'sent'
  | 'delivered'
  | 'cancelled';

interface OrderItem {
  id: number;
  itemId: number;
  requestedQty: number;
  deliveredQty?: number;
  expiryStartDate?: string;
  expiryEndDate?: string;
  exactExpiryDate?: string;
  item: { id: number; name: string; barcode: string };
}

interface SupplierOrder {
  id: number;
  status: OrderStatus;
  supplierEmail: string;
  userMessage?: string;
  expectedArrival: string;
  createdAt: string;
  items: OrderItem[];
}

// Local state for each item the supplier fills in
interface ItemResponse {
  orderItemId: number;
  deliveredQty: string;
  expiryMode: 'exact' | 'range';
  exactExpiryDate: string;
  expiryStartDate: string;
  expiryEndDate: string;
}

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; icon: string; bg: string; text: string }
> = {
  pending: {
    label: 'Awaiting your response',
    icon: '📬',
    bg: '#FEF3C7',
    text: '#92400E',
  },
  acknowledged: {
    label: 'You have opened this order',
    icon: '👁',
    bg: '#DBEAFE',
    text: '#1E40AF',
  },
  sent: {
    label: 'Marked as dispatched',
    icon: '🚚',
    bg: '#D1FAE5',
    text: '#065F46',
  },
  delivered: {
    label: 'Confirmed by client',
    icon: '✅',
    bg: '#D1FAE5',
    text: '#065F46',
  },
  cancelled: {
    label: 'Order cancelled',
    icon: '✕',
    bg: '#FEE2E2',
    text: '#991B1B',
  },
};

function formatDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// ─── Password Gate ────────────────────────────────────────────────────────────

function PasswordGate({
  onUnlock,
  colors,
  loading,
}: {
  onUnlock: (password: string) => void;
  colors: any;
  loading: boolean;
}) {
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 8,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -8,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 6,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -6,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 60,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleSubmit = () => {
    if (!pw.trim()) {
      shake();
      setError('Enter the password from your email.');
      return;
    }
    setError('');
    onUnlock(pw.trim().toUpperCase());
  };

  const maxWidth = isTablet ? 400 : '100%';
  const paddingH = isTablet ? 40 : 24;

  return (
    <KeyboardAvoidingView
      style={{
        flex: 1,
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: paddingH,
      }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Logo area */}
      <View
        style={{
          width: isTablet ? 96 : 72,
          height: isTablet ? 96 : 72,
          borderRadius: 24,
          backgroundColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 32,
        }}
      >
        <Text style={{ fontSize: isTablet ? 44 : 32 }}>📦</Text>
      </View>

      <Text
        style={{
          fontSize: isTablet ? 28 : 22,
          fontWeight: '800',
          color: colors.text,
          marginBottom: 8,
          maxWidth,
        }}
      >
        Supplier Portal
      </Text>
      <Text
        style={{
          fontSize: isTablet ? 16 : 14,
          color: colors.textSecondary,
          textAlign: 'center',
          marginBottom: 32,
          lineHeight: 24,
          maxWidth,
        }}
      >
        Enter the one-time password{'\n'}from your restock email.
      </Text>

      <Animated.View
        style={{
          width: '100%',
          maxWidth: 420,
          transform: [{ translateX: shakeAnim }],
        }}
      >
        <TextInput
          style={{
            backgroundColor: colors.surface,
            borderWidth: 1.5,
            borderColor: error ? colors.error : colors.border,
            borderRadius: 14,
            paddingHorizontal: 20,
            paddingVertical: isTablet ? 20 : 16,
            fontSize: isTablet ? 24 : 22,
            fontWeight: '800',
            letterSpacing: 6,
            textAlign: 'center',
            color: colors.text,
            marginBottom: 8,
          }}
          placeholder="A3F9C2"
          placeholderTextColor={colors.textSecondary}
          value={pw}
          onChangeText={(v) => {
            setPw(v.toUpperCase());
            setError('');
          }}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={8}
          returnKeyType="go"
          onSubmitEditing={handleSubmit}
        />
        {error ? (
          <Text
            style={{
              fontSize: 13,
              color: colors.error,
              textAlign: 'center',
              marginBottom: 8,
            }}
          >
            {error}
          </Text>
        ) : null}
      </Animated.View>

      <TouchableOpacity
        style={{
          backgroundColor: colors.primary,
          borderRadius: 14,
          paddingVertical: isTablet ? 18 : 16,
          width: '100%',
          maxWidth: 420,
          alignItems: 'center',
          marginTop: 12,
          opacity: loading ? 0.7 : 1,
        }}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text
            style={{
              color: '#fff',
              fontSize: isTablet ? 18 : 16,
              fontWeight: '700',
            }}
          >
            Access Order
          </Text>
        )}
      </TouchableOpacity>

      <Text
        style={{
          fontSize: 12,
          color: colors.textSecondary,
          textAlign: 'center',
          marginTop: 24,
          lineHeight: 18,
          maxWidth: 420,
        }}
      >
        This portal is only accessible via the unique link sent to your email.
        The link expires after 7 days.
      </Text>
    </KeyboardAvoidingView>
  );
}

// ─── Item Response Card ───────────────────────────────────────────────────────

function ItemResponseCard({
  orderItem,
  response,
  onChange,
  colors,
  readonly,
}: {
  orderItem: OrderItem;
  response: ItemResponse;
  onChange: (updated: ItemResponse) => void;
  colors: any;
  readonly: boolean;
}) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const isDesktop = width >= 1024;
  const progress = response.deliveredQty
    ? Math.min(parseFloat(response.deliveredQty) / orderItem.requestedQty, 1)
    : 0;

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
        padding: isDesktop ? 22 : isTablet ? 18 : 16,
        marginBottom: 12,
        width: '100%',
        maxWidth: isDesktop ? 580 : 520,
        alignSelf: 'center',
      }}
    >
      {/* Item header */}
      <View
        style={{
          flexDirection: isTablet ? 'row' : 'column',
          justifyContent: 'space-between',
          alignItems: isTablet ? 'center' : 'flex-start',
          marginBottom: 12,
          gap: isTablet ? 8 : 12,
        }}
      >
        <View style={{ flex: 1, marginRight: isTablet ? 12 : 0 }}>
          <Text
            style={{
              fontSize: isDesktop ? 18 : 15,
              fontWeight: '700',
              color: colors.text,
            }}
          >
            {orderItem.item.name}
          </Text>
          <Text
            style={{
              fontSize: 11,
              color: colors.textSecondary,
              fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
            }}
          >
            {orderItem.item.barcode}
          </Text>
        </View>
        <View
          style={{
            backgroundColor: colors.primary + '15',
            borderRadius: 8,
            borderWidth: 1,
            borderColor: colors.primary + '30',
            paddingHorizontal: 12,
            paddingVertical: 6,
            alignItems: 'center',
            minWidth: 110,
          }}
        >
          <Text
            style={{
              fontSize: 10,
              color: colors.textSecondary,
              fontWeight: '600',
            }}
          >
            REQUESTED
          </Text>
          <Text
            style={{
              fontSize: isDesktop ? 18 : 16,
              fontWeight: '800',
              color: colors.primary,
            }}
          >
            {orderItem.requestedQty}
          </Text>
        </View>
      </View>

      {/* Qty fill bar */}
      {response.deliveredQty ? (
        <View style={{ marginBottom: 12 }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginBottom: 4,
            }}
          >
            <Text style={{ fontSize: 11, color: colors.textSecondary }}>
              Fill rate
            </Text>
            <Text
              style={{
                fontSize: 11,
                fontWeight: '700',
                color: progress >= 1 ? colors.success : colors.accent,
              }}
            >
              {Math.round(progress * 100)}%
            </Text>
          </View>
          <View
            style={{
              height: 4,
              backgroundColor: colors.border,
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                height: '100%',
                width: `${progress * 100}%`,
                backgroundColor: progress >= 1 ? colors.success : colors.accent,
                borderRadius: 2,
              }}
            />
          </View>
        </View>
      ) : null}

      {!readonly && (
        <>
          {/* Quantity input */}
          <View style={{ marginBottom: 14 }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                color: colors.textSecondary,
                marginBottom: 6,
              }}
            >
              Quantity you will deliver *
            </Text>
            <TextInput
              style={{
                backgroundColor: colors.background,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 10,
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontSize: 18,
                fontWeight: '700',
                color: colors.text,
                textAlign: 'center',
              }}
              placeholder={`of ${orderItem.requestedQty} requested`}
              placeholderTextColor={colors.textSecondary}
              value={response.deliveredQty}
              onChangeText={(v) => onChange({ ...response, deliveredQty: v })}
              keyboardType="decimal-pad"
            />
          </View>

          {/* Expiry mode toggle */}
          <Text
            style={{
              fontSize: 12,
              fontWeight: '600',
              color: colors.textSecondary,
              marginBottom: 8,
            }}
          >
            Expiry date
          </Text>
          <View
            style={{
              flexDirection: isTablet ? 'row' : 'column',
              gap: 8,
              marginBottom: 12,
            }}
          >
            {(['exact', 'range'] as const).map((mode) => (
              <TouchableOpacity
                key={mode}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor:
                    response.expiryMode === mode
                      ? colors.primary
                      : colors.border,
                  backgroundColor:
                    response.expiryMode === mode
                      ? colors.primary
                      : colors.surface,
                  alignItems: 'center',
                }}
                onPress={() => onChange({ ...response, expiryMode: mode })}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '600',
                    color: response.expiryMode === mode ? '#fff' : colors.text,
                  }}
                >
                  {mode === 'exact' ? 'Exact date' : 'Date range'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {response.expiryMode === 'exact' ? (
            <TextInput
              style={{
                backgroundColor: colors.background,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 10,
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontSize: 14,
                color: colors.text,
              }}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textSecondary}
              value={response.exactExpiryDate}
              onChangeText={(v) =>
                onChange({ ...response, exactExpiryDate: v })
              }
              keyboardType="numbers-and-punctuation"
            />
          ) : (
            <View
              style={{ flexDirection: isTablet ? 'row' : 'column', gap: 8 }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 11,
                    color: colors.textSecondary,
                    marginBottom: 4,
                  }}
                >
                  From
                </Text>
                <TextInput
                  style={{
                    backgroundColor: colors.background,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 11,
                    fontSize: 13,
                    color: colors.text,
                  }}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textSecondary}
                  value={response.expiryStartDate}
                  onChangeText={(v) =>
                    onChange({ ...response, expiryStartDate: v })
                  }
                  keyboardType="numbers-and-punctuation"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 11,
                    color: colors.textSecondary,
                    marginBottom: 4,
                  }}
                >
                  To
                </Text>
                <TextInput
                  style={{
                    backgroundColor: colors.background,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 11,
                    fontSize: 13,
                    color: colors.text,
                  }}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textSecondary}
                  value={response.expiryEndDate}
                  onChangeText={(v) =>
                    onChange({ ...response, expiryEndDate: v })
                  }
                  keyboardType="numbers-and-punctuation"
                />
              </View>
            </View>
          )}
        </>
      )}

      {/* Readonly view (already submitted) */}
      {readonly && orderItem.deliveredQty != null && (
        <View style={{ gap: 4, marginTop: 4 }}>
          <Text style={{ fontSize: 13, color: colors.textSecondary }}>
            Delivered:{' '}
            <Text style={{ fontWeight: '700', color: colors.text }}>
              {orderItem.deliveredQty}
            </Text>
          </Text>
          {orderItem.exactExpiryDate && (
            <Text style={{ fontSize: 13, color: colors.textSecondary }}>
              Expiry:{' '}
              <Text style={{ fontWeight: '600', color: colors.text }}>
                {formatDate(orderItem.exactExpiryDate)}
              </Text>
            </Text>
          )}
          {orderItem.expiryStartDate && orderItem.expiryEndDate && (
            <Text style={{ fontSize: 13, color: colors.textSecondary }}>
              Expiry range:{' '}
              <Text style={{ fontWeight: '600', color: colors.text }}>
                {formatDate(orderItem.expiryStartDate)} –{' '}
                {formatDate(orderItem.expiryEndDate)}
              </Text>
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  token?: string;
  id?: string;
  // Optional: if you store password server-side in Redis and validate via mutation
  // For simplicity this demo validates token existence on first load
}

export default function SupplierPortalScreen({ token, id }: Props) {
  const params = useLocalSearchParams<{ id: string }>();
  const portalToken = token ?? id ?? params.id ?? '';
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const isDesktop = width >= 1024;

  const [unlocked, setUnlocked] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [order, setOrder] = useState<SupplierOrder | null>(null);
  const [loadError, setLoadError] = useState('');
  const [responses, setResponses] = useState<ItemResponse[]>([]);
  const [supplierMessage, setSupplierMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<'sent' | 'cancelled' | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const loadOrder = useCallback(async () => {
    if (!portalToken) {
      setLoadError(
        'Invalid or missing access token. Please use the link in your email.',
      );
      return;
    }

    try {
      const res = await graphQLRequest<{ getSupplierOrder: SupplierOrder }>(
        GET_SUPPLIER_ORDER,
        { token: portalToken },
      );
      const o = res.getSupplierOrder;
      setOrder(o);
      // Initialize responses for each item
      setResponses(
        o.items.map((oi) => ({
          orderItemId: oi.id,
          deliveredQty: oi.deliveredQty != null ? String(oi.deliveredQty) : '',
          expiryMode: 'exact' as const,
          exactExpiryDate: oi.exactExpiryDate
            ? oi.exactExpiryDate.split('T')[0]
            : '',
          expiryStartDate: oi.expiryStartDate
            ? oi.expiryStartDate.split('T')[0]
            : '',
          expiryEndDate: oi.expiryEndDate ? oi.expiryEndDate.split('T')[0] : '',
        })),
      );
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
      // Acknowledge
      if (o.status === 'pending') {
        await graphQLRequest(ACKNOWLEDGE_ORDER, { token: portalToken });
      }
    } catch (e: any) {
      setLoadError(e.message || 'This link is invalid or has expired.');
    }
  }, [portalToken]);

  const handleUnlock = async (password: string) => {
    // Here you'd validate the password against your Redis store.
    // For now we fetch the order (the token itself is the primary gate).
    // In production: POST /api/supplier/verify { token, password } → JWT session
    setAuthLoading(true);
    try {
      await loadOrder();
      setUnlocked(true);
    } catch {
      setLoadError('Invalid password or expired link.');
    } finally {
      setAuthLoading(false);
    }
  };

  const updateResponse = (idx: number, updated: ItemResponse) => {
    setResponses((prev) => prev.map((r, i) => (i === idx ? updated : r)));
  };

  const canSubmit = useMemo(() => {
    if (!order) return false;
    if (order.status !== 'pending' && order.status !== 'acknowledged')
      return false;
    if (responses.length !== order.items.length) return false;

    return responses.every((r, idx) => {
      const value = parseFloat(r.deliveredQty);
      if (!Number.isNaN(value) && value > 0) return true;
      return order.items[idx]?.requestedQty > 0;
    });
  }, [order, responses]);

  const confirmAction = (title: string, message: string): Promise<boolean> => {
    if (Platform.OS === 'web' || typeof window !== 'undefined') {
      return Promise.resolve(window.confirm(`${title}\n\n${message}`));
    }

    return new Promise((resolve) => {
      Alert.alert(title, message, [
        { text: 'Back', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Confirm', style: 'default', onPress: () => resolve(true) },
      ]);
    });
  };

  const handleSubmit = async (action: 'send' | 'cancel') => {
    if (action === 'send' && !canSubmit) {
      if (Platform.OS === 'web') {
        window.alert('Please enter a delivery quantity for every item before sending.');
      } else {
        Alert.alert(
          'Missing info',
          'Please enter a delivery quantity for every item before sending.',
        );
      }
      return;
    }

    const confirmTitle =
      action === 'send' ? 'Confirm Dispatch' : 'Cancel Order';
    const confirmMsg =
      action === 'send'
        ? 'Confirm that you are dispatching this order? The client will be notified.'
        : 'Cancel this order? The client will be notified.';

    const confirmed = await confirmAction(confirmTitle, confirmMsg);
    if (!confirmed) return;

    setSubmitting(true);
    try {
      const itemsPayload = responses.map((r, idx) => {
        const provided = parseFloat(r.deliveredQty);
        const orderItem = order?.items[idx];
        const deliveredQty = !Number.isNaN(provided) && provided > 0
          ? provided
          : orderItem?.requestedQty ?? 0;

        return {
          orderItemId: r.orderItemId,
          deliveredQty,
          exactExpiryDate:
            r.expiryMode === 'exact' && r.exactExpiryDate
              ? new Date(r.exactExpiryDate + 'T00:00:00').toISOString()
              : null,
          expiryStartDate:
            r.expiryMode === 'range' && r.expiryStartDate
              ? new Date(r.expiryStartDate + 'T00:00:00').toISOString()
              : null,
          expiryEndDate:
            r.expiryMode === 'range' && r.expiryEndDate
              ? new Date(r.expiryEndDate + 'T00:00:00').toISOString()
              : null,
        };
      });

      await graphQLRequest(SUBMIT_ORDER, {
        token: portalToken,
        action,
        items: itemsPayload,
        message: supplierMessage.trim() || null,
      });

      setSubmitted(action === 'send' ? 'sent' : 'cancelled');
    } catch (e: any) {
      Alert.alert(
        'Error',
        e.message || 'Failed to submit. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success screen ──
  if (submitted) {
    const isSent = submitted === 'sent';
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: isTablet ? 40 : 32,
        }}
      >
        <View
          style={{
            width: isTablet ? 120 : 80,
            height: isTablet ? 120 : 80,
            borderRadius: isTablet ? 60 : 40,
            backgroundColor: isSent
              ? colors.success + '20'
              : colors.error + '20',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 28,
          }}
        >
          <Text style={{ fontSize: isTablet ? 56 : 36 }}>
            {isSent ? '🚚' : '✕'}
          </Text>
        </View>
        <Text
          style={{
            fontSize: isTablet ? 28 : 22,
            fontWeight: '800',
            color: colors.text,
            marginBottom: 12,
            textAlign: 'center',
          }}
        >
          {isSent ? 'Order Dispatched!' : 'Order Cancelled'}
        </Text>
        <Text
          style={{
            fontSize: isTablet ? 18 : 15,
            color: colors.textSecondary,
            textAlign: 'center',
            lineHeight: 24,
            maxWidth: 500,
          }}
        >
          {isSent
            ? 'The client has been notified that your delivery is on the way.'
            : 'The client has been notified that this order was cancelled.'}
        </Text>
      </View>
    );
  }

  // ── Error screen ──
  if (loadError && !order) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: isTablet ? 40 : 32,
        }}
      >
        <Text style={{ fontSize: isTablet ? 56 : 36, marginBottom: 20 }}>
          🔒
        </Text>
        <Text
          style={{
            fontSize: isTablet ? 24 : 18,
            fontWeight: '700',
            color: colors.text,
            marginBottom: 12,
            textAlign: 'center',
          }}
        >
          Access Denied
        </Text>
        <Text
          style={{
            fontSize: isTablet ? 16 : 14,
            color: colors.textSecondary,
            textAlign: 'center',
            lineHeight: 22,
            maxWidth: 500,
          }}
        >
          {loadError}
        </Text>
      </View>
    );
  }

  // ── Password gate ──
  if (!unlocked) {
    return (
      <PasswordGate
        onUnlock={handleUnlock}
        colors={colors}
        loading={authLoading}
      />
    );
  }

  if (!order) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const statusCfg = STATUS_CONFIG[order.status];
  const isReadonly =
    order.status === 'sent' ||
    order.status === 'delivered' ||
    order.status === 'cancelled';

  return (
    <Animated.View
      style={{ flex: 1, backgroundColor: colors.background, opacity: fadeAnim }}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View
            style={{
              backgroundColor: colors.primary,
              paddingTop: Platform.OS === 'ios' ? 56 : 28,
              paddingHorizontal: isTablet ? 32 : 20,
              paddingBottom: 24,
            }}
          >
            <Text
              style={{
                color: 'rgba(255,255,255,0.6)',
                fontSize: 11,
                fontWeight: '600',
                letterSpacing: 1,
                marginBottom: 4,
              }}
            >
              SUPPLIER PORTAL
            </Text>
            <Text
              style={{
                color: '#fff',
                fontSize: isTablet ? 24 : 20,
                fontWeight: '800',
                marginBottom: 16,
              }}
            >
              Restock Order #{order.id}
            </Text>

            {/* Order meta */}
            <View style={{ flexDirection: isTablet ? 'row' : 'row', gap: 10 }}>
              <View
                style={{
                  flex: 1,
                  backgroundColor: 'rgba(255,255,255,0.12)',
                  borderRadius: 10,
                  padding: 12,
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    color: 'rgba(255,255,255,0.6)',
                    fontSize: 10,
                    marginBottom: 2,
                  }}
                >
                  ITEMS
                </Text>
                <Text
                  style={{
                    color: '#fff',
                    fontSize: isTablet ? 22 : 18,
                    fontWeight: '800',
                  }}
                >
                  {order.items.length}
                </Text>
              </View>
              <View
                style={{
                  flex: isTablet ? 1 : 2,
                  backgroundColor: 'rgba(255,255,255,0.12)',
                  borderRadius: 10,
                  padding: 12,
                }}
              >
                <Text
                  style={{
                    color: 'rgba(255,255,255,0.6)',
                    fontSize: 10,
                    marginBottom: 2,
                  }}
                >
                  EXPECTED BY
                </Text>
                <Text
                  style={{
                    color: '#fff',
                    fontSize: isTablet ? 16 : 14,
                    fontWeight: '700',
                  }}
                >
                  {formatDate(order.expectedArrival)}
                </Text>
              </View>
            </View>
          </View>

          <View
            style={{
              padding: isTablet ? 24 : 16,
              maxWidth: isTablet ? 1200 : '100%',
              alignSelf: 'center',
              width: '100%',
            }}
          >
            {/* Status banner */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                backgroundColor: statusCfg.bg,
                borderRadius: 12,
                padding: 12,
                marginBottom: 16,
              }}
            >
              <Text style={{ fontSize: 20 }}>{statusCfg.icon}</Text>
              <Text
                style={{
                  fontSize: isTablet ? 16 : 14,
                  fontWeight: '600',
                  color: statusCfg.text,
                  flex: 1,
                }}
              >
                {statusCfg.label}
              </Text>
            </View>

            {/* Client message */}
            {order.userMessage ? (
              <View
                style={{
                  backgroundColor: colors.primary + '10',
                  borderLeftWidth: 3,
                  borderLeftColor: colors.primary,
                  borderRadius: 8,
                  padding: 14,
                  marginBottom: 16,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '700',
                    color: colors.primary,
                    letterSpacing: 0.8,
                    marginBottom: 4,
                  }}
                >
                  MESSAGE FROM CLIENT
                </Text>
                <Text
                  style={{
                    fontSize: isTablet ? 16 : 14,
                    color: colors.text,
                    lineHeight: 22,
                  }}
                >
                  {order.userMessage}
                </Text>
              </View>
            ) : null}

            {/* Items */}
            <Text
              style={{
                fontSize: 11,
                fontWeight: '700',
                color: colors.textSecondary,
                letterSpacing: 0.8,
                marginBottom: 12,
              }}
            >
              ORDER ITEMS
            </Text>

            {isTablet ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
                {order.items.map((oi, idx) => (
                  <View
                    key={oi.id}
                    style={{
                      width: isDesktop ? '32%' : '48%',
                      minWidth: isDesktop ? 280 : 300,
                      maxWidth: isDesktop ? 360 : '100%',
                    }}
                  >
                    <ItemResponseCard
                      orderItem={oi}
                      response={
                        responses[idx] ?? {
                          orderItemId: oi.id,
                          deliveredQty: '',
                          expiryMode: 'exact',
                          exactExpiryDate: '',
                          expiryStartDate: '',
                          expiryEndDate: '',
                        }
                      }
                      onChange={(updated) => updateResponse(idx, updated)}
                      colors={colors}
                      readonly={isReadonly}
                    />
                  </View>
                ))}
              </View>
            ) : (
              order.items.map((oi, idx) => (
                <ItemResponseCard
                  key={oi.id}
                  orderItem={oi}
                  response={
                    responses[idx] ?? {
                      orderItemId: oi.id,
                      deliveredQty: '',
                      expiryMode: 'exact',
                      exactExpiryDate: '',
                      expiryStartDate: '',
                      expiryEndDate: '',
                    }
                  }
                  onChange={(updated) => updateResponse(idx, updated)}
                  colors={colors}
                  readonly={isReadonly}
                />
              ))
            )}

            {/* Supplier message */}
            {!isReadonly && (
              <View style={{ marginBottom: 16, marginTop: 16 }}>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '700',
                    color: colors.textSecondary,
                    letterSpacing: 0.8,
                    marginBottom: 8,
                  }}
                >
                  YOUR MESSAGE (OPTIONAL)
                </Text>
                <TextInput
                  style={{
                    backgroundColor: colors.card,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    fontSize: isTablet ? 16 : 14,
                    color: colors.text,
                    minHeight: 100,
                    textAlignVertical: 'top',
                  }}
                  placeholder="Any notes for the client about this delivery..."
                  placeholderTextColor={colors.textSecondary}
                  value={supplierMessage}
                  onChangeText={setSupplierMessage}
                  multiline
                />
              </View>
            )}
          </View>
          {!isReadonly && (isDesktop || isTablet) && (
          <View
            style={{
              position: isDesktop ? 'relative' : 'absolute',
              bottom: isDesktop ? undefined : 0,
              left: isDesktop ? undefined : 0,
              right: isDesktop ? undefined : 0,
              padding: isDesktop ? 18 : isTablet ? 24 : 16,
              paddingBottom: isDesktop
                ? 18
                : Platform.OS === 'ios'
                  ? 32
                  : isTablet
                    ? 24
                    : 16,

              flexDirection: isTablet ? 'row' : 'column',
              gap: 12,

              // 👇 center only on desktop
              alignSelf: isDesktop ? 'center' : undefined,
              width: isDesktop ? '90%' : '100%',
              maxWidth: isDesktop ? 960 : undefined,

              // 👇 shadow for mobile floating feel
              ...(isDesktop
                ? {}
                : {
                    elevation: 10,
                    shadowColor: '#000',
                    shadowOpacity: 0.1,
                    shadowRadius: 10,
                  }),
            }}
          >
            {/* Cancel */}
            <TouchableOpacity
              style={{
                flex: 1,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: colors.error,
                paddingVertical: isTablet ? 16 : 14,
                alignItems: 'center',
                backgroundColor: colors.error + '10',
                minWidth: 120,
              }}
              onPress={() => handleSubmit('cancel')}
              disabled={submitting}
            >
              <Text
                style={{
                  fontSize: isTablet ? 16 : 14,
                  fontWeight: '700',
                  color: colors.error,
                }}
              >
                Cancel Order
              </Text>
            </TouchableOpacity>

            {/* Send */}
            <TouchableOpacity
              style={{
                flex: 2,
                borderRadius: 12,
                paddingVertical: isTablet ? 16 : 14,
                alignItems: 'center',
                backgroundColor: canSubmit ? colors.success : colors.border,
                minWidth: 160,
              }}
              onPress={() => handleSubmit('send')}
              disabled={submitting || !canSubmit}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                >
                  <Text
                    style={{
                      fontSize: isTablet ? 16 : 14,
                      fontWeight: '700',
                      color: canSubmit ? '#fff' : colors.textSecondary,
                    }}
                  >
                    Dispatch Items
                  </Text>
                  <Text style={{ fontSize: 16 }}>🚚</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}
        </ScrollView>

        {/* Action bar */}
        {!isReadonly && !isDesktop && !isTablet && (
          <View
            style={{
              position: isDesktop ? 'relative' : 'absolute',
              bottom: isDesktop ? undefined : 0,
              left: isDesktop ? undefined : 0,
              right: isDesktop ? undefined : 0,
              backgroundColor: colors.surface,
              borderTopWidth: 1,
              borderTopColor: colors.border,

              padding: isDesktop ? 18 : isTablet ? 24 : 16,
              paddingBottom: isDesktop
                ? 18
                : Platform.OS === 'ios'
                  ? 32
                  : isTablet
                    ? 24
                    : 16,

              flexDirection: isTablet ? 'row' : 'column',
              gap: 12,

              // 👇 center only on desktop
              alignSelf: isDesktop ? 'center' : undefined,
              width: isDesktop ? '90%' : '100%',
              maxWidth: isDesktop ? 960 : undefined,

              marginTop: isDesktop ? 18 : undefined,

              // 👇 shadow for mobile floating feel
              ...(isDesktop
                ? {}
                : {
                    elevation: 10,
                    shadowColor: '#000',
                    shadowOpacity: 0.1,
                    shadowRadius: 10,
                  }),
            }}
          >
            {/* Cancel */}
            <TouchableOpacity
              style={{
                flex: 1,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: colors.error,
                paddingVertical: isTablet ? 16 : 14,
                alignItems: 'center',
                backgroundColor: colors.error + '10',
                minWidth: 120,
              }}
              onPress={() => handleSubmit('cancel')}
              disabled={submitting}
            >
              <Text
                style={{
                  fontSize: isTablet ? 16 : 14,
                  fontWeight: '700',
                  color: colors.error,
                }}
              >
                Cancel Order
              </Text>
            </TouchableOpacity>

            {/* Send */}
            <TouchableOpacity
              style={{
                flex: 2,
                borderRadius: 12,
                paddingVertical: isTablet ? 16 : 14,
                alignItems: 'center',
                backgroundColor: canSubmit ? colors.success : colors.border,
                minWidth: 160,
              }}
              onPress={() => handleSubmit('send')}
              disabled={submitting || !canSubmit}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                >
                  <Text
                    style={{
                      fontSize: isTablet ? 16 : 14,
                      fontWeight: '700',
                      color: canSubmit ? '#fff' : colors.textSecondary,
                    }}
                  >
                    Dispatch Items
                  </Text>
                  <Text style={{ fontSize: 16 }}>🚚</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </Animated.View>
  );
}
