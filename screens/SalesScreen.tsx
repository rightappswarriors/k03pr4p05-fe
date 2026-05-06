// screens/SalesScreen.tsx
// ERP Sales Module — SalesOrder fulfillment: Ordered → Processing → Shipped → Received

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  CheckCircle2,
  ChevronRight,
  Filter,
  MapPin,
  Package,
  Plus,
  RefreshCcw,
  Search,
  Truck,
  X,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import {
  SalesOrderService,
  type Branch,
  type DeliveryInput,
  type InventoryItemForSales,
  type OutletForSales,
  type SalesOrder,
  type SalesOrderItemInput,
  type SalesOrderStatus,
} from '@/services/salesOrder.service';

// ─── Constants ────────────────────────────────────────────────────────────────

type DateFilter = 'All' | 'Today' | 'This Week' | 'This Month';

const STATUS_COLORS: Record<SalesOrderStatus, string> = {
  ORDERED: '#F59E0B',
  PROCESSING: '#3B82F6',
  SHIPPED: '#8B5CF6',
  RECEIVED: '#10B981',
  CANCELLED: '#EF4444',
};

const STATUS_LABELS: Record<SalesOrderStatus, string> = {
  ORDERED: 'Ordered',
  PROCESSING: 'Processing',
  SHIPPED: 'Shipped',
  RECEIVED: 'Received',
  CANCELLED: 'Cancelled',
};

const ALL_STATUSES: SalesOrderStatus[] = [
  'ORDERED',
  'PROCESSING',
  'SHIPPED',
  'RECEIVED',
  'CANCELLED',
];

const DATE_FILTERS: DateFilter[] = ['All', 'Today', 'This Week', 'This Month'];

function isWithinRange(dateStr: string, filter: DateFilter): boolean {
  if (filter === 'All') return true;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  const now = new Date();
  if (filter === 'Today') return d.toDateString() === now.toDateString();
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

function formatSalesDate(
  value: string | undefined | null,
  options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  },
  fallback = 'Unknown date',
) {
  if (!value) return fallback;
  const date = new Date(value);
  if (isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString('en-PH', options);
}

// ─── Shared Modal Styles ──────────────────────────────────────────────────────
// All modals are centered — no bottom sheets

function makeModalStyles(colors: any) {
  const { width, height } = Dimensions.get('window');
  const modalWidth = Math.min(width - 48, 560);

  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    sheet: {
      backgroundColor: colors.surface ?? colors.card,
      borderRadius: 16,
      width: modalWidth,
      maxHeight: height * 0.88,
      overflow: 'hidden',
      // Shadow for depth
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 24,
      elevation: 12,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
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
    submitBtn: {
      borderRadius: 12,
      paddingVertical: 15,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 8,
    },
    submitBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
    qtyButton: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    qtyButtonText: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.text,
    },
  });
}

// ─── Delivery Form Modal ──────────────────────────────────────────────────────

function DeliveryFormModal({
  visible,
  orderId,
  orderNumber,
  onClose,
  onSubmit,
  colors,
  submitting,
}: {
  visible: boolean;
  orderId: string;
  orderNumber: string;
  onClose: () => void;
  onSubmit: (id: string, delivery: DeliveryInput) => Promise<void>;
  colors: any;
  submitting: boolean;
}) {
  const [address, setAddress] = useState('');
  const [courierName, setCourierName] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [estimatedDate, setEstimatedDate] = useState('');
  const [error, setError] = useState('');

  const s = makeModalStyles(colors);

  const reset = () => {
    setAddress('');
    setCourierName('');
    setTrackingNumber('');
    setContactPerson('');
    setContactNumber('');
    setNotes('');
    setEstimatedDate('');
    setError('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!address.trim()) {
      setError('Delivery address is required.');
      return;
    }
    if (!courierName.trim()) {
      setError('Courier name is required.');
      return;
    }
    if (!trackingNumber.trim()) {
      setError('Tracking number is required.');
      return;
    }
    if (!contactPerson.trim()) {
      setError('Contact person is required.');
      return;
    }
    if (!contactNumber.trim()) {
      setError('Contact number is required.');
      return;
    }
    if (!courierName.trim()) {
      setError('Courier name is required.');
      return;
    }
    setError('');
    await onSubmit(orderId, {
      address: address.trim(),
      courierName: courierName.trim() || undefined,
      trackingNumber: trackingNumber.trim() || undefined,
      contactPerson: contactPerson.trim() || undefined,
      contactNumber: contactNumber.trim() || undefined,
      notes: notes.trim() || undefined,
      estimatedDate: estimatedDate.trim() || undefined,
    });
    reset();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={s.overlay}>
          {/* Backdrop dismiss */}
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={handleClose}
          />
          <View style={s.sheet}>
            {/* Header */}
            <View style={s.header}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    backgroundColor: STATUS_COLORS.SHIPPED + '20',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Truck size={16} color={STATUS_COLORS.SHIPPED} strokeWidth={2} />
                </View>
                <View>
                  <Text style={s.title}>Delivery Details</Text>
                  <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                    {orderNumber}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={handleClose}>
                <X size={20} color={colors.textSecondary} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={{ padding: 20, paddingBottom: 32 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={s.label}>DELIVERY ADDRESS *</Text>
              <TextInput
                style={[s.input, { minHeight: 72, textAlignVertical: 'top' }]}
                placeholder="Street, City, Province, ZIP"
                placeholderTextColor={colors.textSecondary}
                value={address}
                onChangeText={setAddress}
                multiline
                numberOfLines={3}
              />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>COURIER / CARRIER</Text>
                  <TextInput
                    style={s.input}
                    placeholder="e.g. LBC, J&T"
                    placeholderTextColor={colors.textSecondary}
                    value={courierName}
                    onChangeText={setCourierName}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>TRACKING NUMBER</Text>
                  <TextInput
                    style={s.input}
                    placeholder="Optional"
                    placeholderTextColor={colors.textSecondary}
                    value={trackingNumber}
                    onChangeText={setTrackingNumber}
                    autoCapitalize="characters"
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>CONTACT PERSON</Text>
                  <TextInput
                    style={s.input}
                    placeholder="Name"
                    placeholderTextColor={colors.textSecondary}
                    value={contactPerson}
                    onChangeText={setContactPerson}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>CONTACT NUMBER</Text>
                  <TextInput
                    style={s.input}
                    placeholder="09XX XXX XXXX"
                    placeholderTextColor={colors.textSecondary}
                    value={contactNumber}
                    onChangeText={setContactNumber}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              <Text style={s.label}>ESTIMATED DELIVERY DATE</Text>
              <TextInput
                style={s.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textSecondary}
                value={estimatedDate}
                onChangeText={setEstimatedDate}
              />

              <Text style={s.label}>NOTES</Text>
              <TextInput
                style={[s.input, { minHeight: 60, textAlignVertical: 'top' }]}
                placeholder="Special instructions, landmarks, etc."
                placeholderTextColor={colors.textSecondary}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
              />

              {error ? (
                <Text style={{ fontSize: 12, color: colors.error, marginTop: 8 }}>
                  {error}
                </Text>
              ) : null}

              <TouchableOpacity
                style={[
                  s.submitBtn,
                  { backgroundColor: STATUS_COLORS.SHIPPED, marginTop: 20 },
                  submitting && { opacity: 0.7 },
                ]}
                onPress={handleSubmit}
                disabled={submitting}
                activeOpacity={0.85}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={s.submitBtnText}>Ship Order</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Order Detail Modal ───────────────────────────────────────────────────────

function OrderDetailModal({
  order,
  visible,
  onClose,
  onProcess,
  onShip,
  onReceive,
  onCancel,
  colors,
  actionLoading,
}: {
  order: SalesOrder | null;
  visible: boolean;
  onClose: () => void;
  onProcess: (id: string) => Promise<void>;
  onShip: (id: string) => void;
  onReceive: (id: string) => Promise<void>;
  onCancel: (id: string) => Promise<void>;
  colors: any;
  actionLoading: boolean;
}) {
  const [showVatPerItem, setShowVatPerItem] = useState(false);

  if (!order) return null;

  const { height } = Dimensions.get('window');
  const sc = STATUS_COLORS[order.status];
  const canCancel = ['ORDERED', 'PROCESSING'].includes(order.status);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={odm.overlay}>
        {/* Backdrop dismiss */}
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={[odm.sheet, { maxHeight: height * 0.88 }]}>
          {/* Header */}
          <View style={[odm.header, { backgroundColor: colors.primary }]}>
            <View style={{ flex: 1 }}>
              <Text style={odm.headerTxn}>{order.orderNumber}</Text>
              <Text style={odm.headerCustomer}>{order.customer}</Text>
              {order.outlet && (
                <Text style={odm.headerOutlet}>
                  {order.branch?.name} · {order.outlet.name}
                </Text>
              )}
            </View>
            <TouchableOpacity style={odm.closeBtn} onPress={onClose}>
              <X size={16} color="#fff" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Status + date row */}
            <View
              style={[
                odm.statusRow,
                { backgroundColor: sc + '18', borderColor: sc },
              ]}
            >
              <View style={[odm.statusDot, { backgroundColor: sc }]} />
              <Text style={[odm.statusText, { color: sc }]}>
                {STATUS_LABELS[order.status]}
              </Text>
              <Text
                style={{
                  fontSize: 11,
                  color: colors.textSecondary,
                  marginLeft: 'auto',
                }}
              >
                {formatSalesDate(order.date)}
              </Text>
            </View>

            {/* Order Items — column layout */}
            <View
              style={[
                odm.section,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  marginBottom: 12,
                },
              ]}
            >
              <Text style={[odm.sectionTitle, { color: colors.textSecondary }]}>
                ORDER ITEMS
              </Text>
              {order.items.map((item, i) => (
                <View
                  key={item.id}
                  style={[
                    odm.itemRow,
                    {
                      borderBottomColor:
                        i < order.items.length - 1
                          ? colors.border
                          : 'transparent',
                    },
                  ]}
                >
                  {/* Item name */}
                  <Text style={[odm.itemName, { color: colors.text }]}>
                    {item.item?.name ?? `Item #${item.itemId}`}
                  </Text>
                  {/* Qty × price row */}
                  <View style={odm.itemMeta}>
                    <Text style={[odm.itemQty, { color: colors.textSecondary }]}>
                      {item.quantity} {item.unitName ?? 'pc'} × ₱
                      {item.unitPrice.toLocaleString('en-PH', {
                        minimumFractionDigits: 2,
                      })}
                    </Text>
                    <Text style={[odm.itemTotal, { color: colors.accent }]}>
                      ₱
                      {item.totalPrice.toLocaleString('en-PH', {
                        minimumFractionDigits: 2,
                      })}
                    </Text>
                  </View>
                  {/* VAT per item if enabled */}
                  {showVatPerItem && item.item?.vatExempt === false && (
                    <View style={{ marginTop: 4 }}>
                      <Text style={{ fontSize: 12, color: colors.accent, fontWeight: '600' }}>
                        VAT (12%): ₱
                        {((item.totalPrice - (item.discountAmount ?? 0)) * 0.12).toLocaleString('en-PH', {
                          minimumFractionDigits: 2,
                        })}
                      </Text>
                    </View>
                  )}
                  {/* Discount info if applied */}
                  {item.discountQuantity && item.discountQuantity > 0 ? (
                    <View style={{ marginTop: 6, gap: 4 }}>
                      <Text style={{ fontSize: 12, color: '#10B981', fontWeight: '600' }}>
                        {item.discountQuantity} of {item.quantity} discounted @{' '}
                        {((item.discountRate ?? 0) * 100).toFixed(0)}%
                      </Text>
                      <Text style={{ fontSize: 12, color: '#10B981', fontWeight: '600' }}>
                        Discount: -₱
                        {(item.discountAmount ?? 0).toLocaleString('en-PH', {
                          minimumFractionDigits: 2,
                        })}
                      </Text>
                    </View>
                  ) : null}
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
                  marginBottom: 12,
                },
              ]}
            >
              <Text style={[odm.sectionTitle, { color: colors.textSecondary }]}>
                FINANCIAL BREAKDOWN
              </Text>
              <View style={[odm.detailRow, { borderBottomColor: colors.border }]}>
                <Text style={[odm.detailLabel, { color: colors.textSecondary }]}>
                  Subtotal
                </Text>
                <Text style={[odm.detailValue, { color: colors.text }]}>
                  ₱
                  {order.subtotal.toLocaleString('en-PH', {
                    minimumFractionDigits: 2,
                  })}
                </Text>
              </View>
              {order.discountAmount > 0 && (
                <View
                  style={[odm.detailRow, { borderBottomColor: colors.border }]}
                >
                  <Text style={[odm.detailLabel, { color: colors.textSecondary }]}>
                    Discount ({(order.discountRate * 100).toFixed(0)}%)
                  </Text>
                  <Text style={[odm.detailValue, { color: '#EF4444' }]}>
                    -₱
                    {order.discountAmount.toLocaleString('en-PH', {
                      minimumFractionDigits: 2,
                    })}
                  </Text>
                </View>
              )}
              {order.vatAmount > 0 && (
                <View
                  style={[odm.detailRow, { borderBottomColor: colors.border }]}
                >
                  <Text style={[odm.detailLabel, { color: colors.textSecondary }]}>
                    VAT ({(order.vatRate * 100).toFixed(0)}%)
                  </Text>
                  <Text style={[odm.detailValue, { color: colors.accent }]}>
                    ₱
                    {order.vatAmount.toLocaleString('en-PH', {
                      minimumFractionDigits: 2,
                    })}
                  </Text>
                </View>
              )}
              <View style={[odm.detailRow, { borderBottomColor: 'transparent' }]}>
                <Text
                  style={[odm.detailLabel, { color: colors.text, fontWeight: '700' }]}
                >
                  Total
                </Text>
                <Text
                  style={[
                    odm.detailValue,
                    { color: colors.accent, fontSize: 18, fontWeight: '800' },
                  ]}
                >
                  ₱
                  {order.total.toLocaleString('en-PH', {
                    minimumFractionDigits: 2,
                  })}
                </Text>
              </View>
              <View style={[odm.detailRow, { borderBottomColor: 'transparent', marginTop: 8 }]}>
                <Text style={[odm.detailLabel, { color: colors.textSecondary }]}>
                  Show VAT per Item
                </Text>
                <Switch
                  value={showVatPerItem}
                  onValueChange={setShowVatPerItem}
                  trackColor={{ false: colors.border, true: colors.accent + '40' }}
                  thumbColor={showVatPerItem ? colors.accent : colors.textSecondary}
                />
              </View>
            </View>

            {/* Delivery info */}
            {order.delivery && (
              <View
                style={[
                  odm.section,
                  {
                    backgroundColor: STATUS_COLORS.SHIPPED + '0C',
                    borderColor: STATUS_COLORS.SHIPPED + '40',
                    marginBottom: 12,
                  },
                ]}
              >
                <Text style={[odm.sectionTitle, { color: STATUS_COLORS.SHIPPED }]}>
                  DELIVERY INFO
                </Text>
                {[
                  ['Address', order.delivery.address],
                  ['Courier', order.delivery.courierName],
                  ['Tracking #', order.delivery.trackingNumber],
                  ['Contact', order.delivery.contactPerson],
                  ['Phone', order.delivery.contactNumber],
                  ['Est. Date', order.delivery.estimatedDate],
                  [
                    'Shipped At',
                    order.delivery.shippedAt
                      ? formatSalesDate(order.delivery.shippedAt)
                      : null,
                  ],
                  [
                    'Received At',
                    order.delivery.receivedAt
                      ? formatSalesDate(order.delivery.receivedAt)
                      : null,
                  ],
                ]
                  .filter(([, v]) => !!v)
                  .map(([label, value]) => (
                    <View
                      key={label}
                      style={[
                        odm.detailRow,
                        { borderBottomColor: STATUS_COLORS.SHIPPED + '20' },
                      ]}
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
                {order.delivery.notes ? (
                  <View style={{ padding: 12, paddingTop: 4 }}>
                    <Text
                      style={{
                        fontSize: 11,
                        color: colors.textSecondary,
                        fontStyle: 'italic',
                      }}
                    >
                      {order.delivery.notes}
                    </Text>
                  </View>
                ) : null}
              </View>
            )}

            {/* Action buttons */}
            {order.status === 'ORDERED' && (
              <TouchableOpacity
                style={[
                  odm.actionBtn,
                  { backgroundColor: STATUS_COLORS.PROCESSING },
                ]}
                onPress={() => onProcess(order.id)}
                disabled={actionLoading}
                activeOpacity={0.85}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={odm.actionBtnText}>Move to Processing</Text>
                )}
              </TouchableOpacity>
            )}

            {order.status === 'PROCESSING' && (
              <TouchableOpacity
                style={[odm.actionBtn, { backgroundColor: STATUS_COLORS.SHIPPED }]}
                onPress={() => onShip(order.id)}
                disabled={actionLoading}
                activeOpacity={0.85}
              >
                <Truck size={16} color="#fff" strokeWidth={2} />
                <Text style={odm.actionBtnText}>Enter Delivery & Ship</Text>
              </TouchableOpacity>
            )}

            {order.status === 'SHIPPED' && (
              <TouchableOpacity
                style={[
                  odm.actionBtn,
                  { backgroundColor: STATUS_COLORS.RECEIVED },
                ]}
                onPress={() => onReceive(order.id)}
                disabled={actionLoading}
                activeOpacity={0.85}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <CheckCircle2 size={16} color="#fff" strokeWidth={2} />
                    <Text style={odm.actionBtnText}>Mark as Received</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {canCancel && (
              <TouchableOpacity
                style={[odm.actionBtn, { backgroundColor: '#EF4444', marginTop: 8 }]}
                onPress={() => onCancel(order.id)}
                disabled={actionLoading}
                activeOpacity={0.85}
              >
                <Text style={odm.actionBtnText}>Cancel Order</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const odm = StyleSheet.create({
  // ── Centered modal overlay ────────────────────────────────────────────────
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  sheet: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 560,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTxn: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
    fontFamily: 'monospace',
    marginBottom: 3,
    letterSpacing: 0.5,
  },
  headerCustomer: { fontSize: 17, fontWeight: '700', color: '#fff' },
  headerOutlet: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 3 },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
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
    marginBottom: 12,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 13, fontWeight: '700' },
  section: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 0,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    padding: 12,
    paddingBottom: 8,
  },
  // ── Column item layout ────────────────────────────────────────────────────
  itemRow: {
    flexDirection: 'column',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 4,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '700',
  },
  itemMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemQty: {
    fontSize: 12,
  },
  itemTotal: {
    fontSize: 13,
    fontWeight: '700',
  },
  // ── Financial rows ────────────────────────────────────────────────────────
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  detailLabel: { fontSize: 13, fontWeight: '500', color: '#6B7280' },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  actionBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  actionBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

// ─── Cart Item type for AddOrderModal ─────────────────────────────────────────

interface CartEntry {
  inventoryItem: InventoryItemForSales;
  selectedUnitId?: number;
  selectedUnitName?: string;
  unitPrice: number;
  quantity: number;
  discountQuantity?: number;
  discountRate?: number;
  discountAmount?: number;
}

// ─── Persisted Form State ─────────────────────────────────────────────────────

interface PersistedFormState {
  customer: string;
  selectedBranchId: number | null;
  selectedOutlet: OutletForSales | null;
  cart: CartEntry[];
}

// ─── Add Order Modal ──────────────────────────────────────────────────────────

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
  const s = makeModalStyles(colors);

  const persistedStateRef = useRef<PersistedFormState>({
    customer: '',
    selectedBranchId: null,
    selectedOutlet: null,
    cart: [],
  });

  const [step, setStep] = useState<'form' | 'products'>('form');
  const [customer, setCustomer] = useState(persistedStateRef.current.customer);
  const [discountModalVisible, setDiscountModalVisible] = useState(false);
  const [discountModalItemId, setDiscountModalItemId] = useState<number | null>(null);
  const [discountModalQty, setDiscountModalQty] = useState(0);
  const [discountModalRate, setDiscountModalRate] = useState(0);
  const [discountModalOption, setDiscountModalOption] = useState<string>('');

  const [branches, setBranches] = useState<Branch[]>([]);
  const [outlets, setOutlets] = useState<OutletForSales[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(
    persistedStateRef.current.selectedBranchId,
  );
  const [selectedOutlet, setSelectedOutlet] = useState<OutletForSales | null>(
    persistedStateRef.current.selectedOutlet,
  );
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [loadingOutlets, setLoadingOutlets] = useState(false);

  const [cart, setCart] = useState<CartEntry[]>(persistedStateRef.current.cart);
  const [inventoryItems, setInventoryItems] = useState<InventoryItemForSales[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [skip, setSkip] = useState(0);
  const [prodQuery, setProdQuery] = useState('');

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setLoadingBranches(true);
    SalesOrderService.getBranches()
      .then(setBranches)
      .finally(() => setLoadingBranches(false));
  }, [visible]);

  useEffect(() => {
    if (!selectedBranchId) {
      setOutlets([]);
      return;
    }
    setLoadingOutlets(true);
    SalesOrderService.getOutletsByBranch(selectedBranchId)
      .then(setOutlets)
      .finally(() => setLoadingOutlets(false));
  }, [selectedBranchId]);

  const loadInventory = useCallback(
    async (
      outletId: number | null,
      search: string,
      skipVal: number,
      take: number = 20,
      append: boolean = false,
    ) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoadingItems(true);
      }
      try {
        const result = await SalesOrderService.searchInventoryItems({
          outletId,
          search: search.trim() || undefined,
          skip: skipVal,
          take,
        });
        if (append) {
          setInventoryItems((prev) => [...prev, ...result.items]);
        } else {
          setInventoryItems(result.items);
        }
        setHasMore(result.hasMore);
        setSkip(skipVal + result.items.length);
      } catch (err) {
        console.warn('Failed to load inventory items', err);
      } finally {
        setLoadingItems(false);
        setLoadingMore(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (loadingBranches || loadingOutlets) return;
    setSkip(0);
    setInventoryItems([]);
    loadInventory(selectedOutlet?.id ?? null, prodQuery, 0);
  }, [selectedOutlet?.id, prodQuery]);

  const prevOutletIdRef = useRef<number | null>(null);
  useEffect(() => {
    if (selectedOutlet?.id !== prevOutletIdRef.current) {
      if (prevOutletIdRef.current !== null) {
        setCart([]);
      }
      prevOutletIdRef.current = selectedOutlet?.id ?? null;
    }
  }, [selectedOutlet]);

  const subtotal = useMemo(
    () => cart.reduce((sum, e) => sum + e.unitPrice * e.quantity, 0),
    [cart],
  );

  const outletDiscountOptions = selectedOutlet?.outletPromos ?? [];
  const defaultOutletDiscountRate =
    outletDiscountOptions?.[0]?.discount != null
      ? outletDiscountOptions[0].discount / 100
      : 0;

  const totalItemDiscount = useMemo(
    () => cart.reduce((sum, e) => sum + (e.discountAmount ?? 0), 0),
    [cart],
  );
  const orderDiscountRate = subtotal > 0 ? totalItemDiscount / subtotal : 0;
  const afterDiscount = subtotal - totalItemDiscount;

  const vatableSubtotal = useMemo(() => {
    return cart.reduce((sum, e) => {
      const isVatExempt = e.inventoryItem.item.vatExempt === true;
      if (isVatExempt) return sum;
      const lineTotal = e.unitPrice * e.quantity;
      const lineDiscount = e.discountAmount ?? 0;
      return sum + lineTotal - lineDiscount;
    }, 0);
  }, [cart]);

  const vatRate = selectedOutlet?.vatType?.rate
    ? selectedOutlet.vatType.rate / 100
    : selectedOutlet?.isVatRegistered
      ? 0.12
      : 0;
  const vatAmount = vatableSubtotal * vatRate;
  const total = afterDiscount + vatAmount;

  const filteredItems = inventoryItems;

  const updateQty = useCallback((itemId: number, qty: number) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((e) => e.inventoryItem.itemId !== itemId));
    } else {
      setCart((prev) =>
        prev.map((e) => {
          if (e.inventoryItem.itemId !== itemId) return e;
          const updatedQty = qty;
          const clampedDiscountQty = Math.min(
            e.discountQuantity ?? 0,
            updatedQty,
          );
          const discountRate = e.discountRate ?? 0;
          return {
            ...e,
            quantity: updatedQty,
            discountQuantity: clampedDiscountQty,
            discountAmount: Number(
              (clampedDiscountQty * e.unitPrice * discountRate).toFixed(2),
            ),
          };
        }),
      );
    }
  }, []);

  const addOrIncrement = useCallback((inv: InventoryItemForSales) => {
    setCart((prev) => {
      const existing = prev.find((e) => e.inventoryItem.itemId === inv.itemId);
      if (existing) {
        return prev.map((e) =>
          e.inventoryItem.itemId === inv.itemId
            ? { ...e, quantity: e.quantity + 1 }
            : e,
        );
      }
      const defaultUnit = inv.units?.find((u) => u.isDefault) || inv.units?.[0];
      return [
        ...prev,
        {
          inventoryItem: inv,
          selectedUnitId: defaultUnit?.id,
          selectedUnitName: defaultUnit?.unitLabel ?? defaultUnit?.unitName,
          unitPrice: defaultUnit?.price ?? inv.price,
          quantity: 1,
          discountQuantity: 0,
          discountRate: 0,
          discountAmount: 0,
        },
      ];
    });
  }, []);

  const openDiscountModal = useCallback(
    (itemId: number) => {
      const entry = cart.find((e) => e.inventoryItem.itemId === itemId);
      if (!entry) return;
      setDiscountModalItemId(itemId);
      setDiscountModalQty(entry.discountQuantity ?? 0);
      setDiscountModalRate(
        (entry.discountRate ?? defaultOutletDiscountRate) || 0,
      );
      setDiscountModalOption(
        entry.discountRate != null && entry.discountRate > 0
          ? `${Math.round((entry.discountRate ?? 0) * 100)}%`
          : outletDiscountOptions?.[0]
            ? `${outletDiscountOptions[0].discount}%`
            : '',
      );
      setDiscountModalVisible(true);
    },
    [cart, defaultOutletDiscountRate, outletDiscountOptions],
  );

  const applyDiscountToCartItem = useCallback(
    (itemId: number, quantity: number, rate: number) => {
      setCart((prev) =>
        prev.map((e) => {
          if (e.inventoryItem.itemId !== itemId) return e;
          const qty = Math.min(Math.max(quantity, 0), e.quantity);
          const discountAmount = Number((qty * e.unitPrice * rate).toFixed(2));
          return {
            ...e,
            discountQuantity: qty,
            discountRate: rate,
            discountAmount,
          };
        }),
      );
      setDiscountModalVisible(false);
      setDiscountModalItemId(null);
    },
    [],
  );

  const handleAdd = async () => {
    if (!customer.trim() || customer.trim().length < 2) {
      setError('Enter a valid customer name (at least 2 characters).');
      return;
    }
    if (!selectedBranchId) {
      setError('Please select a branch.');
      return;
    }
    if (!selectedOutlet) {
      setError('Please select an outlet.');
      return;
    }
    if (cart.length === 0) {
      setError('Add at least one product to the order.');
      return;
    }
    setError('');
    setSubmitting(true);

    try {
      const items: SalesOrderItemInput[] = cart.map((e) => ({
        itemId: e.inventoryItem.itemId,
        quantity: e.quantity,
        unitPrice: e.unitPrice,
        unitId: e.selectedUnitId,
        unitName: e.selectedUnitName,
        discountQuantity: e.discountQuantity ?? 0,
        discountRate: e.discountRate ?? 0,
        discountAmount: e.discountAmount ?? 0,
      }));

      const created = await SalesOrderService.createSalesOrder({
        customer: customer.trim(),
        outletId: selectedOutlet.id,
        branchId: selectedBranchId,
        items,
        subtotal,
        discountAmount: totalItemDiscount,
        discountRate: orderDiscountRate,
        vatAmount,
        vatRate,
        total,
        outletPromoId:
          totalItemDiscount > 0 ? outletDiscountOptions[0]?.id : undefined,
      });

      onAdd(created);
      persistedStateRef.current = {
        customer: '',
        selectedBranchId: null,
        selectedOutlet: null,
        cart: [],
      };
      resetForm();
      onClose();
    } catch (err: any) {
      setError(err?.message ?? 'Failed to create order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setCustomer('');
    setSelectedBranchId(null);
    setSelectedOutlet(null);
    setCart([]);
    setProdQuery('');
    setStep('form');
    setError('');
  };

  const handleClose = () => {
    persistedStateRef.current = {
      customer,
      selectedBranchId,
      selectedOutlet,
      cart,
    };
    onClose();
  };

  useEffect(() => {
    if (visible) {
      setCustomer(persistedStateRef.current.customer);
      setSelectedBranchId(persistedStateRef.current.selectedBranchId);
      setSelectedOutlet(persistedStateRef.current.selectedOutlet);
      setCart(persistedStateRef.current.cart);
    }
  }, [visible]);

  const selectedDiscountCartItem = discountModalItemId
    ? cart.find((e) => e.inventoryItem.itemId === discountModalItemId) ?? null
    : null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={s.overlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={handleClose}
          />
          <View style={s.sheet}>
            {/* Header */}
            <View style={s.header}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {step === 'products' && (
                  <TouchableOpacity
                    onPress={() => setStep('form')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <ChevronRight
                      size={20}
                      color={colors.textSecondary}
                      strokeWidth={2}
                      style={{ transform: [{ rotate: '180deg' }] }}
                    />
                  </TouchableOpacity>
                )}
                <Text style={s.title}>
                  {step === 'form' ? 'New Sales Order' : 'Select Products'}
                </Text>
              </View>
              {step === 'form' && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <TouchableOpacity
                    onPress={resetForm}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <RefreshCcw size={20} color={colors.textSecondary} strokeWidth={2} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleClose}>
                    <X size={20} color={colors.textSecondary} strokeWidth={2} />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* ── STEP: FORM ─────────────────────────────────────────────── */}
            {step === 'form' && (
              <ScrollView
                contentContainerStyle={{ padding: 20, paddingBottom: 32 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <Text style={s.label}>CUSTOMER NAME *</Text>
                <TextInput
                  style={s.input}
                  placeholder="e.g. Maria Santos"
                  placeholderTextColor={colors.textSecondary}
                  value={customer}
                  onChangeText={setCustomer}
                />

                <Text style={s.label}>BRANCH *</Text>
                {loadingBranches ? (
                  <ActivityIndicator
                    size="small"
                    color={colors.primary}
                    style={{ marginTop: 8 }}
                  />
                ) : (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {branches.map((b) => {
                      const active = selectedBranchId === b.id;
                      return (
                        <TouchableOpacity
                          key={b.id}
                          onPress={() => {
                            setSelectedBranchId(b.id);
                            setSelectedOutlet(null);
                          }}
                          style={{
                            paddingHorizontal: 14,
                            paddingVertical: 8,
                            borderRadius: 20,
                            borderWidth: 1,
                            borderColor: active ? colors.primary : colors.border,
                            backgroundColor: active ? colors.primary : 'transparent',
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 13,
                              fontWeight: '600',
                              color: active ? '#fff' : colors.text,
                            }}
                          >
                            {b.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                {selectedBranchId && (
                  <>
                    <Text style={s.label}>OUTLET *</Text>
                    {loadingOutlets ? (
                      <ActivityIndicator
                        size="small"
                        color={colors.primary}
                        style={{ marginTop: 8 }}
                      />
                    ) : outlets.length === 0 ? (
                      <Text
                        style={{
                          fontSize: 13,
                          color: colors.textSecondary,
                          marginTop: 4,
                        }}
                      >
                        No active outlets for this branch.
                      </Text>
                    ) : (
                      <View style={{ gap: 6 }}>
                        {outlets.map((o) => {
                          const active = selectedOutlet?.id === o.id;
                          return (
                            <TouchableOpacity
                              key={o.id}
                              onPress={() => setSelectedOutlet(o)}
                              style={{
                                borderRadius: 10,
                                borderWidth: 1,
                                borderColor: active ? colors.primary : colors.border,
                                backgroundColor: active
                                  ? colors.primary + '10'
                                  : colors.background,
                                padding: 12,
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 10,
                              }}
                            >
                              <View
                                style={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: 14,
                                  backgroundColor: active ? colors.primary : colors.border,
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <MapPin size={13} color="#fff" strokeWidth={2} />
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text
                                  style={{
                                    fontSize: 14,
                                    fontWeight: '700',
                                    color: active ? colors.primary : colors.text,
                                  }}
                                >
                                  {o.name}
                                </Text>
                                <Text
                                  style={{
                                    fontSize: 11,
                                    color: colors.textSecondary,
                                    marginTop: 1,
                                  }}
                                  numberOfLines={1}
                                >
                                  {o.address}
                                </Text>
                              </View>
                              {o.outletPromos?.length > 0 && (
                                <View
                                  style={{
                                    backgroundColor: '#10B981' + '20',
                                    borderRadius: 6,
                                    paddingHorizontal: 8,
                                    paddingVertical: 3,
                                  }}
                                >
                                  <Text
                                    style={{
                                      fontSize: 11,
                                      fontWeight: '700',
                                      color: '#10B981',
                                    }}
                                  >
                                    {o.outletPromos[0].discount}% off
                                  </Text>
                                </View>
                              )}
                              {active && (
                                <CheckCircle2
                                  size={18}
                                  color={colors.primary}
                                  strokeWidth={2}
                                />
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </>
                )}

                {outletDiscountOptions.length > 0 && (
                  <View
                    style={{
                      backgroundColor: colors.background,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: colors.border,
                      padding: 12,
                      marginTop: 14,
                      gap: 6,
                    }}
                  >
                    <Text
                      style={{ fontSize: 13, fontWeight: '700', color: colors.text }}
                    >
                      Discount options are applied per selected item.
                    </Text>
                    <Text
                      style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}
                    >
                      Available: {outletDiscountOptions[0].discount}% off — {outletDiscountOptions[0].promoType?.name}
                    </Text>
                  </View>
                )}

                {selectedOutlet && (
                  <View
                    style={{
                      backgroundColor: colors.background,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: colors.border,
                      padding: 12,
                      marginTop: 14,
                      gap: 6,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: '700',
                        color: colors.textSecondary,
                        letterSpacing: 0.8,
                        marginBottom: 4,
                      }}
                    >
                      VAT RULES
                    </Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 12, color: colors.textSecondary }}>VAT</Text>
                      <Text
                        style={{ fontSize: 12, fontWeight: '700', color: colors.accent }}
                      >
                        {selectedOutlet.vatType
                          ? `${selectedOutlet.vatType.rate}% (${selectedOutlet.vatType.name})`
                          : selectedOutlet.isVatRegistered
                            ? '12% (Standard)'
                            : 'Not VAT registered'}
                      </Text>
                    </View>
                    <Text
                      style={{ fontSize: 10, color: colors.textSecondary, fontStyle: 'italic' }}
                    >
                      VAT only applied to non-exempt items
                    </Text>
                  </View>
                )}

                <Text style={s.label}>PRODUCTS *</Text>
                <TouchableOpacity
                  onPress={() => {
                    setError('');
                    setStep('products');
                  }}
                  style={{
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: cart.length > 0 ? colors.primary : colors.border,
                    backgroundColor:
                      cart.length > 0 ? colors.primary + '08' : colors.background,
                    padding: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                  }}
                  activeOpacity={0.8}
                >
                  <Package
                    size={18}
                    color={cart.length > 0 ? colors.primary : colors.textSecondary}
                    strokeWidth={2}
                  />
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 14,
                      color: cart.length > 0 ? colors.primary : colors.textSecondary,
                      fontWeight: cart.length > 0 ? '600' : '400',
                    }}
                  >
                    {cart.length > 0
                      ? `${cart.length} item${cart.length > 1 ? 's' : ''} selected`
                      : 'Tap to select products…'}
                  </Text>
                  <ChevronRight
                    size={16}
                    color={cart.length > 0 ? colors.primary : colors.textSecondary}
                    strokeWidth={2}
                  />
                </TouchableOpacity>

                {cart.length > 0 && (
                  <View
                    style={{
                      marginTop: 10,
                      backgroundColor: colors.background,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: colors.border,
                      overflow: 'hidden',
                    }}
                  >
                    {cart.map((e, i) => (
                      <View
                        key={e.inventoryItem.itemId}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                          borderBottomWidth: i < cart.length - 1 ? 1 : 0,
                          borderBottomColor: colors.border,
                        }}
                      >
                        <View style={{ flex: 1, gap: 4 }}>
                          <Text
                            style={{
                              fontSize: 13,
                              color: colors.text,
                              fontWeight: '600',
                            }}
                            numberOfLines={1}
                          >
                            {e.inventoryItem.item.name}
                          </Text>
                          {e.discountQuantity && e.discountQuantity > 0 ? (
                            <Text
                              style={{
                                fontSize: 11,
                                color: '#10B981',
                                marginTop: 2,
                              }}
                            >
                              {e.discountQuantity} of {e.quantity} discounted @
                              {(e.discountRate ?? 0) * 100}%
                            </Text>
                          ) : null}
                          <TouchableOpacity
                            onPress={() => openDiscountModal(e.inventoryItem.itemId)}
                            style={{
                              marginTop: 4,
                              paddingHorizontal: 10,
                              paddingVertical: 6,
                              borderRadius: 8,
                              borderWidth: 1,
                              borderColor: colors.primary,
                              backgroundColor: colors.primary + '10',
                              alignSelf: 'flex-start',
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 12,
                                fontWeight: '700',
                                color: colors.primary,
                              }}
                            >
                              {e.discountQuantity && e.discountQuantity > 0
                                ? 'Edit discount'
                                : 'Apply discount'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <TouchableOpacity
                            onPress={() =>
                              updateQty(e.inventoryItem.itemId, e.quantity - 1)
                            }
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: 12,
                              backgroundColor: colors.border,
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Text
                              style={{ fontSize: 14, color: colors.text, fontWeight: '700' }}
                            >
                              −
                            </Text>
                          </TouchableOpacity>
                          <Text
                            style={{
                              fontSize: 13,
                              fontWeight: '700',
                              color: colors.text,
                              minWidth: 20,
                              textAlign: 'center',
                            }}
                          >
                            {e.quantity}
                          </Text>
                          <TouchableOpacity
                            onPress={() =>
                              updateQty(e.inventoryItem.itemId, e.quantity + 1)
                            }
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: 12,
                              backgroundColor: colors.primary,
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Text
                              style={{ fontSize: 14, color: '#fff', fontWeight: '700' }}
                            >
                              +
                            </Text>
                          </TouchableOpacity>
                          <Text
                            style={{
                              fontSize: 12,
                              color: colors.accent,
                              fontWeight: '700',
                              minWidth: 64,
                              textAlign: 'right',
                            }}
                          >
                            ₱
                            {(e.unitPrice * e.quantity).toLocaleString('en-PH', {
                              minimumFractionDigits: 2,
                            })}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {discountModalVisible && selectedDiscountCartItem ? (
                  <Modal
                    visible
                    transparent
                    animationType="fade"
                    onRequestClose={() => setDiscountModalVisible(false)}
                  >
                    <View style={s.overlay}>
                      <TouchableOpacity
                        style={StyleSheet.absoluteFillObject}
                        activeOpacity={1}
                        onPress={() => setDiscountModalVisible(false)}
                      />
                      <View
                        style={{
                          width: Math.min(Dimensions.get('window').width - 48, 560),
                          maxWidth: 560,
                          backgroundColor: colors.card,
                          borderRadius: 16,
                          padding: 18,
                          alignSelf: 'center',
                          shadowColor: '#000',
                          shadowOpacity: 0.18,
                          shadowRadius: 12,
                          elevation: 8,
                        }}
                      >
                        <View
                          style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 12,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 16,
                              fontWeight: '700',
                              color: colors.text,
                            }}
                          >
                            Discount for {selectedDiscountCartItem.inventoryItem.item.name}
                          </Text>
                          <TouchableOpacity
                            onPress={() => setDiscountModalVisible(false)}
                          >
                            <X size={20} color={colors.textSecondary} />
                          </TouchableOpacity>
                        </View>

                        <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>
                          Quantity to discount (max {selectedDiscountCartItem.quantity})
                        </Text>

                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 12,
                            marginBottom: 12,
                          }}
                        >
                          <TouchableOpacity
                            onPress={() =>
                              setDiscountModalQty((prev) =>
                                Math.max(0, prev - 1),
                              )
                            }
                            style={s.qtyButton}
                          >
                            <Text style={s.qtyButtonText}>−</Text>
                          </TouchableOpacity>
                          <TextInput
                            value={String(discountModalQty)}
                            onChangeText={(text) => {
                              const num = Number(text);
                              if (!Number.isNaN(num)) {
                                setDiscountModalQty(
                                  Math.min(Math.max(0, num), selectedDiscountCartItem.quantity),
                                );
                              }
                            }}
                            keyboardType="number-pad"
                            style={{
                              width: 80,
                              height: 40,
                              borderWidth: 1,
                              borderColor: colors.border,
                              borderRadius: 8,
                              paddingHorizontal: 12,
                              fontSize: 18,
                              fontWeight: '700',
                              color: colors.text,
                              textAlign: 'center',
                            }}
                          />
                          <TouchableOpacity
                            onPress={() =>
                              setDiscountModalQty((prev) =>
                                Math.min(selectedDiscountCartItem.quantity, prev + 1),
                              )
                            }
                            style={s.qtyButton}
                          >
                            <Text style={s.qtyButtonText}>+</Text>
                          </TouchableOpacity>
                        </View>

                        <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>
                          Discount rate
                        </Text>

                        <View style={{ gap: 8, marginBottom: 12 }}>
                          {outletDiscountOptions?.slice(0, 3).map((option) => (
                            <TouchableOpacity
                              key={option.id}
                              onPress={() => {
                                setDiscountModalRate(option.discount / 100);
                                setDiscountModalOption(`${option.discount}%`);
                              }}
                              style={{
                                padding: 10,
                                borderRadius: 10,
                                borderWidth: 1,
                                borderColor:
                                  discountModalOption === `${option.discount}%`
                                    ? colors.primary
                                    : colors.border,
                                backgroundColor:
                                  discountModalOption === `${option.discount}%`
                                    ? colors.primary + '10'
                                    : colors.background,
                              }}
                            >
                              <Text
                                style={{
                                  color:
                                    discountModalOption === `${option.discount}%`
                                      ? colors.primary
                                      : colors.text,
                                  fontWeight: '700',
                                }}
                              >
                                {option.discount}% off — {option.promoType?.name}
                              </Text>
                            </TouchableOpacity>
                          ))}

                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 8,
                              borderWidth: 1,
                              borderColor: colors.border,
                              borderRadius: 10,
                              paddingHorizontal: 10,
                            }}
                          >
                            <TextInput
                              value={discountModalOption}
                              onChangeText={(text) => {
                                setDiscountModalOption(text);
                                const value = Number(text.replace('%', '').trim());
                                if (!Number.isNaN(value)) {
                                  setDiscountModalRate(value / 100);
                                }
                              }}
                              keyboardType="numeric"
                              placeholder="Custom %"
                              placeholderTextColor={colors.textSecondary}
                              style={{
                                flex: 1,
                                color: colors.text,
                                minHeight: 40,
                              }}
                            />
                            <Text style={{ color: colors.textSecondary }}>%</Text>
                          </View>
                        </View>

                        <View style={{ flexDirection: 'row', gap: 10 }}>
                          <TouchableOpacity
                            onPress={() => setDiscountModalVisible(false)}
                            style={{
                              flex: 1,
                              paddingVertical: 12,
                              borderRadius: 10,
                              backgroundColor: colors.border,
                              alignItems: 'center',
                            }}
                          >
                            <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>
                              Cancel
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() =>
                              applyDiscountToCartItem(
                                selectedDiscountCartItem.inventoryItem.itemId,
                                discountModalQty,
                                discountModalRate,
                              )
                            }
                            style={{
                              flex: 1,
                              paddingVertical: 12,
                              borderRadius: 10,
                              backgroundColor: colors.primary,
                              alignItems: 'center',
                            }}
                          >
                            <Text style={{ color: '#fff', fontWeight: '700' }}>
                              Apply
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </Modal>
                ) : null}

                {cart.length > 0 && (
                  <View
                    style={{
                      marginTop: 10,
                      backgroundColor: colors.card,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: colors.border,
                      padding: 12,
                      gap: 6,
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                        Subtotal
                      </Text>
                      <Text style={{ fontSize: 13, color: colors.text, fontWeight: '600' }}>
                        ₱
                        {subtotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </Text>
                    </View>
                    {totalItemDiscount > 0 && (
                      <View
                        style={{ flexDirection: 'row', justifyContent: 'space-between' }}
                      >
                        <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                          Discount ({(orderDiscountRate * 100).toFixed(0)}%)
                        </Text>
                        <Text style={{ fontSize: 13, color: '#EF4444', fontWeight: '600' }}>
                          -₱
                          {totalItemDiscount.toLocaleString('en-PH', {
                            minimumFractionDigits: 2,
                          })}
                        </Text>
                      </View>
                    )}
                    {vatAmount > 0 && (
                      <View
                        style={{ flexDirection: 'row', justifyContent: 'space-between' }}
                      >
                        <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                          VAT ({(vatRate * 100).toFixed(0)}%)
                        </Text>
                        <Text style={{ fontSize: 13, color: colors.accent, fontWeight: '600' }}>
                          ₱
                          {vatAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </Text>
                      </View>
                    )}
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        borderTopWidth: 1,
                        borderTopColor: colors.border,
                        paddingTop: 8,
                        marginTop: 4,
                      }}
                    >
                      <Text style={{ fontSize: 14, color: colors.text, fontWeight: '700' }}>
                        Total
                      </Text>
                      <Text style={{ fontSize: 16, color: colors.accent, fontWeight: '800' }}>
                        ₱{total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </Text>
                    </View>
                  </View>
                )}

                {error ? (
                  <Text style={{ fontSize: 12, color: colors.error, marginTop: 8 }}>
                    {error}
                  </Text>
                ) : null}

                <TouchableOpacity
                  style={[
                    s.submitBtn,
                    { backgroundColor: colors.primary, marginTop: 20 },
                    submitting && { opacity: 0.7 },
                  ]}
                  onPress={handleAdd}
                  disabled={submitting}
                  activeOpacity={0.85}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={s.submitBtnText}>Place Order</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}

            {/* ── STEP: PRODUCTS ────────────────────────────────────────── */}
            {step === 'products' && (
              <View style={{ flex: 1 }}>
                <View
                  style={{
                    paddingHorizontal: 20,
                    paddingVertical: 10,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                      backgroundColor: colors.background,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: colors.border,
                      paddingHorizontal: 12,
                      paddingVertical: 9,
                    }}
                  >
                    <Search size={14} color={colors.textSecondary} strokeWidth={2} />
                    <TextInput
                      style={{ flex: 1, fontSize: 14, color: colors.text }}
                      placeholder="Search products…"
                      placeholderTextColor={colors.textSecondary}
                      value={prodQuery}
                      onChangeText={setProdQuery}
                      autoFocus
                    />
                    {prodQuery.length > 0 && (
                      <TouchableOpacity onPress={() => setProdQuery('')}>
                        <X size={13} color={colors.textSecondary} strokeWidth={2} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {loadingItems ? (
                  <View
                    style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}
                  >
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                      Loading products…
                    </Text>
                  </View>
                ) : filteredItems.length === 0 ? (
                  <View
                    style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  >
                    <Text style={{ fontSize: 24 }}>📦</Text>
                    <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                      {prodQuery ? `No results for "${prodQuery}"` : 'No items available'}
                    </Text>
                  </View>
                ) : (
                  <FlatList
                    data={filteredItems}
                    keyExtractor={(item) => String(item.id)}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 32 }}
                    onEndReached={() => {
                      if (hasMore && !loadingMore && !loadingItems) {
                        loadInventory(selectedOutlet?.id ?? null, prodQuery, skip);
                      }
                    }}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={() =>
                      loadingMore ? (
                        <View style={{ padding: 16, alignItems: 'center' }}>
                          <ActivityIndicator size="small" color={colors.primary} />
                          <Text
                            style={{ color: colors.textSecondary, fontSize: 12, marginTop: 8 }}
                          >
                            Loading more items…
                          </Text>
                        </View>
                      ) : hasMore ? (
                        <View style={{ padding: 16, alignItems: 'center' }}>
                          <TouchableOpacity
                            onPress={() =>
                              loadInventory(selectedOutlet?.id ?? null, prodQuery, skip)
                            }
                            style={{
                              backgroundColor: colors.primary,
                              borderRadius: 8,
                              paddingVertical: 10,
                              paddingHorizontal: 20,
                            }}
                          >
                            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>
                              Load More
                            </Text>
                          </TouchableOpacity>
                        </View>
                      ) : null
                    }
                    renderItem={({ item: inv }) => {
                      const inCart = cart.find(
                        (e) => e.inventoryItem.itemId === inv.itemId,
                      );
                      const outletName = (inv as any).inventory?.outlet?.name;
                      const isVatExempt = inv.item.vatExempt === true;

                      return (
                        <View
                          style={{
                            backgroundColor: inCart
                              ? colors.primary + '0F'
                              : colors.card,
                            borderRadius: 10,
                            borderWidth: 1,
                            borderColor: inCart ? colors.primary : colors.border,
                            padding: 12,
                            gap: 8,
                          }}
                        >
                          <View
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
                          >
                            <View
                              style={{
                                width: 40,
                                height: 40,
                                borderRadius: 10,
                                backgroundColor: inCart
                                  ? colors.primary
                                  : colors.background,
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              {inCart ? (
                                <CheckCircle2 size={20} color="#fff" strokeWidth={2} />
                              ) : (
                                <Package
                                  size={18}
                                  color={colors.textSecondary}
                                  strokeWidth={1.5}
                                />
                              )}
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text
                                style={{
                                  fontSize: 14,
                                  fontWeight: '700',
                                  color: inCart ? colors.primary : colors.text,
                                }}
                                numberOfLines={1}
                              >
                                {inv.item.name}
                              </Text>
                              <View
                                style={{
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  gap: 6,
                                  marginTop: 2,
                                }}
                              >
                                <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                                  Stock: {inv.quantity}
                                </Text>
                                {outletName && !selectedOutlet && (
                                  <>
                                    <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                                      •
                                    </Text>
                                    <Text
                                      style={{
                                        fontSize: 10,
                                        color: colors.primary,
                                        fontWeight: '600',
                                      }}
                                    >
                                      {outletName}
                                    </Text>
                                  </>
                                )}
                                {isVatExempt && (
                                  <>
                                    <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                                      •
                                    </Text>
                                    <Text
                                      style={{
                                        fontSize: 10,
                                        color: '#10B981',
                                        fontWeight: '600',
                                      }}
                                    >
                                      VAT-Exempt
                                    </Text>
                                  </>
                                )}
                              </View>
                              <Text
                                style={{
                                  fontSize: 12,
                                  color: colors.accent,
                                  fontWeight: '700',
                                  marginTop: 2,
                                }}
                              >
                                ₱
                                {inv.price.toLocaleString('en-PH', {
                                  minimumFractionDigits: 2,
                                })}
                              </Text>
                            </View>

                            {!inCart && (
                              <TouchableOpacity
                                onPress={() => addOrIncrement(inv)}
                                style={{
                                  backgroundColor: colors.primary,
                                  borderRadius: 8,
                                  paddingVertical: 8,
                                  alignItems: 'center',
                                  marginTop: 4,
                                  paddingHorizontal: 4,
                                }}
                                activeOpacity={0.8}
                              >
                                <Plus color={'#fff'} />
                              </TouchableOpacity>
                            )}
                          </View>

                          {inCart && (
                            <View
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 8,
                                paddingTop: 8,
                                borderTopWidth: 1,
                                borderTopColor: colors.border,
                              }}
                            >
                              <TouchableOpacity
                                onPress={() =>
                                  updateQty(inv.itemId, inCart.quantity - 1)
                                }
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: 8,
                                  backgroundColor: colors.border,
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <Text
                                  style={{
                                    fontSize: 16,
                                    color: colors.text,
                                    fontWeight: '700',
                                  }}
                                >
                                  −
                                </Text>
                              </TouchableOpacity>
                              <TextInput
                                style={{
                                  flex: 1,
                                  textAlign: 'center',
                                  fontSize: 15,
                                  fontWeight: '700',
                                  color: colors.text,
                                  backgroundColor: colors.background,
                                  borderRadius: 8,
                                  borderWidth: 1,
                                  borderColor: colors.border,
                                  paddingVertical: 6,
                                }}
                                value={String(inCart.quantity)}
                                onChangeText={(text) => {
                                  const num = parseFloat(text);
                                  if (!isNaN(num) && num >= 0) {
                                    updateQty(inv.itemId, num);
                                  }
                                }}
                                keyboardType="numeric"
                              />
                              <TouchableOpacity
                                onPress={() =>
                                  updateQty(inv.itemId, inCart.quantity + 1)
                                }
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: 8,
                                  backgroundColor: colors.primary,
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <Text
                                  style={{
                                    fontSize: 16,
                                    color: '#fff',
                                    fontWeight: '700',
                                  }}
                                >
                                  +
                                </Text>
                              </TouchableOpacity>
                              <Text
                                style={{
                                  fontSize: 14,
                                  color: colors.accent,
                                  fontWeight: '700',
                                  minWidth: 80,
                                  textAlign: 'right',
                                }}
                              >
                                ₱
                                {(inCart.unitPrice * inCart.quantity).toLocaleString(
                                  'en-PH',
                                  { minimumFractionDigits: 2 },
                                )}
                              </Text>
                            </View>
                          )}
                        </View>
                      );
                    }}
                  />
                )}

                {/* Done button */}
                <View
                  style={{
                    padding: 16,
                    borderTopWidth: 1,
                    borderTopColor: colors.border,
                    backgroundColor: colors.card,
                  }}
                >
                  <TouchableOpacity
                    style={[
                      s.submitBtn,
                      {
                        backgroundColor:
                          cart.length > 0 ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setStep('form')}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[
                        s.submitBtnText,
                        { color: cart.length > 0 ? '#fff' : colors.textSecondary },
                      ]}
                    >
                      {cart.length > 0
                        ? `Done — ${cart.length} item${cart.length > 1 ? 's' : ''} selected`
                        : 'Select items to continue'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function SalesScreen() {
  const { colors } = useTheme();
  const { width } = Dimensions.get('window');
  const isTablet = width >= 768;

  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<SalesOrderStatus | 'All'>('All');
  const [dateFilter, setDateFilter] = useState<DateFilter>('All');
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [addVisible, setAddVisible] = useState(false);
  const [deliveryOrderId, setDeliveryOrderId] = useState('');
  const [deliveryOrderNumber, setDeliveryOrderNumber] = useState('');
  const [deliveryVisible, setDeliveryVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const loadOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const data = await SalesOrderService.getSalesOrders();
      setOrders(data);
    } catch (err) {
      console.warn('Failed to load sales orders', err);
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      const matchSearch =
        !q ||
        o.customer.toLowerCase().includes(q) ||
        o.orderNumber.toLowerCase().includes(q) ||
        o.outlet?.name.toLowerCase().includes(q);
      const matchStatus = statusFilter === 'All' || o.status === statusFilter;
      const matchDate = isWithinRange(o.date, dateFilter);
      return matchSearch && matchStatus && matchDate;
    });
  }, [orders, search, statusFilter, dateFilter]);

  const receivedOrders = filtered.filter((o) => o.status === 'RECEIVED');
  const totalRevenue = receivedOrders.reduce((a, o) => a + o.total, 0);
  const completedCount = receivedOrders.length;
  const pendingCount = filtered.filter((o) => o.status === 'ORDERED').length;

  const patchOrder = (updated: SalesOrder) => {
    setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    if (selectedOrder?.id === updated.id) setSelectedOrder(updated);
  };

  const handleProcess = async (id: string) => {
    setActionLoading(true);
    try {
      const updated = await SalesOrderService.processSalesOrder(id);
      patchOrder(updated);
      setDetailVisible(false);
    } catch (err: any) {
      console.error('processSalesOrder error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleShip = (id: string) => {
    const order = orders.find((o) => o.id === id);
    if (!order) return;
    setDeliveryOrderId(id);
    setDeliveryOrderNumber(order.orderNumber);
    setDetailVisible(false);
    setDeliveryVisible(true);
  };

  const handleDeliverySubmit = async (id: string, delivery: DeliveryInput) => {
    setActionLoading(true);
    try {
      const updated = await SalesOrderService.shipSalesOrder(id, delivery);
      patchOrder(updated);
      setDeliveryVisible(false);
    } catch (err: any) {
      console.error('shipSalesOrder error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReceive = async (id: string) => {
    setActionLoading(true);
    try {
      const updated = await SalesOrderService.receiveSalesOrder(id);
      patchOrder(updated);
      setDetailVisible(false);
    } catch (err: any) {
      console.error('receiveSalesOrder error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async (id: string) => {
    setActionLoading(true);
    try {
      const updated = await SalesOrderService.cancelSalesOrder(id);
      patchOrder(updated);
      // Give user a moment to see the status change before closing modal
      setTimeout(() => {
        setDetailVisible(false);
      }, 500);
    } catch (err: any) {
      console.error('cancelSalesOrder error:', err);
      setActionLoading(false);
    }
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
    pillActive: { borderColor: colors.primary, backgroundColor: colors.primary },
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

  if (loadingOrders) {
    return (
      <View
        style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 12, color: colors.textSecondary }}>
          Loading sales orders…
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.metaRow}>
          <View style={styles.metaCard}>
            <Text style={styles.metaValue}>{filtered.length}</Text>
            <Text style={styles.metaLabel}>Orders</Text>
          </View>
          <View style={styles.metaCard}>
            <Text style={[styles.metaValue, { color: STATUS_COLORS.RECEIVED }]}>
              {completedCount}
            </Text>
            <Text style={styles.metaLabel}>Received</Text>
          </View>
          <View style={styles.metaCard}>
            <Text style={[styles.metaValue, { color: STATUS_COLORS.ORDERED }]}>
              {pendingCount}
            </Text>
            <Text style={styles.metaLabel}>Pending</Text>
          </View>
          <View style={styles.metaCard}>
            <Text style={[styles.metaValue, { color: colors.accent }]}>
              ₱
              {totalRevenue >= 1_000_000
                ? `${(totalRevenue / 1_000_000).toFixed(1)}M`
                : totalRevenue >= 100_000
                  ? `${(totalRevenue / 100_000).toFixed(0)}K`
                  : totalRevenue.toFixed(0)}
            </Text>
            <Text style={styles.metaLabel}>Sales Revenue</Text>
          </View>
        </View>
      </View>

      <View style={styles.toolbar}>
        <View style={styles.searchBox}>
          <Search size={13} color={colors.textSecondary} strokeWidth={2} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search orders, customer, outlet…"
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
        <TouchableOpacity style={styles.addBtn} onPress={() => setAddVisible(true)}>
          <Plus size={18} color="#fff" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {filterOpen && (
        <View style={styles.filterPanel}>
          <View>
            <Text style={styles.filterLabel}>STATUS</Text>
            <View style={styles.pillRow}>
              {(['All', ...ALL_STATUSES] as (SalesOrderStatus | 'All')[]).map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.pill, statusFilter === s && styles.pillActive]}
                  onPress={() => setStatusFilter(s)}
                >
                  <Text
                    style={[
                      styles.pillText,
                      statusFilter === s && styles.pillTextAct,
                    ]}
                  >
                    {s === 'All' ? 'All' : STATUS_LABELS[s]}
                  </Text>
                </TouchableOpacity>
              ))}
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
                    style={[styles.pillText, dateFilter === d && styles.pillTextAct]}
                  >
                    {d}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      )}

      <Text style={styles.resultCount}>
        {filtered.length} order{filtered.length !== 1 ? 's' : ''}
        {search ? ` matching "${search}"` : ''}
        {statusFilter !== 'All' ? ` · ${STATUS_LABELS[statusFilter as SalesOrderStatus]}` : ''}
        {dateFilter !== 'All' ? ` · ${dateFilter}` : ''}
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
        {...(isTablet && { columnWrapperStyle: { gap: 10 } })}
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
                <Text style={styles.orderId}>{item.orderNumber}</Text>
                <Text style={styles.customerName}>{item.customer}</Text>
                {item.outlet && (
                  <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                    {item.branch?.name} · {item.outlet.name}
                  </Text>
                )}
              </View>
              <View
                style={[
                  styles.badge,
                  { backgroundColor: STATUS_COLORS[item.status] ?? '#6B7280' },
                ]}
              >
                <Text style={styles.badgeText}>{STATUS_LABELS[item.status]}</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 3, marginBottom: 8 }}>
              {ALL_STATUSES.filter((s) => s !== 'CANCELLED').map((s) => {
                const idx = ['ORDERED', 'PROCESSING', 'SHIPPED', 'RECEIVED'].indexOf(s);
                const curIdx = [
                  'ORDERED',
                  'PROCESSING',
                  'SHIPPED',
                  'RECEIVED',
                ].indexOf(item.status);
                const active = item.status !== 'CANCELLED' && idx <= curIdx;
                return (
                  <View
                    key={s}
                    style={{
                      flex: 1,
                      height: 3,
                      borderRadius: 2,
                      backgroundColor: active ? STATUS_COLORS[s] : colors.border,
                    }}
                  />
                );
              })}
            </View>

            <View style={styles.divider} />
            <View style={styles.chipsRow}>
              <View style={styles.chip}>
                <Text style={styles.chipLabel}>Items</Text>
                <Text style={styles.chipValue}>{item.items?.length ?? 0}</Text>
              </View>
              <View style={styles.chip}>
                <Text style={styles.chipLabel}>Total</Text>
                <Text style={[styles.chipValue, { color: colors.accent }]}>
                  ₱
                  {item.total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </Text>
              </View>
              <View style={styles.chip}>
                <Text style={styles.chipLabel}>Date</Text>
                <Text style={styles.chipValue}>
                  {formatSalesDate(item.date, { month: 'short', day: 'numeric' })}
                </Text>
              </View>
              {item.delivery?.trackingNumber && (
                <View style={styles.chip}>
                  <Text style={styles.chipLabel}>Tracking</Text>
                  <Text style={styles.chipValue} numberOfLines={1}>
                    {item.delivery.trackingNumber}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        )}
      />

      <OrderDetailModal
        order={selectedOrder}
        visible={detailVisible}
        onClose={() => setDetailVisible(false)}
        onProcess={handleProcess}
        onShip={handleShip}
        onReceive={handleReceive}
        onCancel={handleCancel}
        colors={colors}
        actionLoading={actionLoading}
      />

      <DeliveryFormModal
        visible={deliveryVisible}
        orderId={deliveryOrderId}
        orderNumber={deliveryOrderNumber}
        onClose={() => setDeliveryVisible(false)}
        onSubmit={handleDeliverySubmit}
        colors={colors}
        submitting={actionLoading}
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