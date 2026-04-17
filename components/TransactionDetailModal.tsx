// ─── FILE: components/TransactionDetailModal.tsx ─────────────────────────────
//
// Drop this file in your components/ folder.
// Import and use in outlet-detail.tsx (see usage instructions at the bottom).

import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { X, User, ShoppingBag, CreditCard, Receipt, Clock, Package } from 'lucide-react-native';
import { AdminService } from '@/services/ManagerService';
import { AdminTransaction } from '@/types';
import { formatPeso } from '@/utils/moneyHelpers';

// ── Status badge colours ───────────────────────────────────────────────────────
const STATUS_COLOR: Record<string, string> = {
  completed: '#059669',
  pending:   '#d97706',
  cancelled: '#dc2626',
};
const METHOD_LABEL: Record<string, string> = {
  cash:    'Cash',
  card:    'Card',
  digital: 'Digital',
  gcash:   'GCash',
  maya:    'Maya',
};

// ── Props ──────────────────────────────────────────────────────────────────────
interface Props {
  transactionId: string | null;    // null = hidden
  onClose: () => void;
  colors: any;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function TransactionDetailModal({ transactionId, onClose, colors }: Props) {
  const [txn, setTxn]       = useState<AdminTransaction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]    = useState('');

  useEffect(() => {
    if (!transactionId) { setTxn(null); setError(''); return; }
    setLoading(true);
    setError('');
    AdminService.getTransactionById(transactionId)
      .then((data) => {
        if (data) setTxn(data);
        else setError('Transaction not found.');
      })
      .catch(() => setError('Failed to load transaction.'))
      .finally(() => setLoading(false));
  }, [transactionId]);

  const statusColor  = txn ? (STATUS_COLOR[txn.status] ?? '#6b7280') : '#6b7280';
  const methodLabel  = txn ? (METHOD_LABEL[txn.paymentMethod] ?? txn.paymentMethod.toUpperCase()) : '';

  return (
    <Modal
      visible={!!transactionId}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={td.overlay}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />

        <View style={{ alignItems: 'center', width: '100%' }}>
          <View style={[td.sheet, { backgroundColor: colors.surface, maxWidth: 600, width: '100%' }]}>
            {/* Drag handle */}
            <View style={[td.handle, { backgroundColor: colors.border }]} />

            {/* Header */}
            <View style={[td.header, { borderBottomColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[td.headerTitle, { color: colors.text }]}>
                  Transaction Details
                </Text>
                {txn && (
                  <Text style={[td.headerSub, { color: colors.textSecondary }]}>
                    #{txn.id.toString().padStart(8, '0').toUpperCase()}
                  </Text>
                )}
              </View>
              {txn && (
                <View style={[td.statusBadge, { backgroundColor: statusColor + '20', borderColor: statusColor }]}>
                  <View style={[td.statusDot, { backgroundColor: statusColor }]} />
                  <Text style={[td.statusTxt, { color: statusColor }]}>
                    {txn.status.charAt(0).toUpperCase() + txn.status.slice(1)}
                  </Text>
                </View>
              )}
              <TouchableOpacity onPress={onClose} style={{ marginLeft: 10 }}>
                <X size={20} color={colors.textSecondary} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            {/* Body */}
            <ScrollView contentContainerStyle={td.body} showsVerticalScrollIndicator={false}>
              {loading && (
                <View style={{ paddingVertical: 48, alignItems: 'center' }}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={[td.loadTxt, { color: colors.textSecondary }]}>Loading…</Text>
                </View>
              )}

              {!!error && !loading && (
                <View style={{ paddingVertical: 32, alignItems: 'center' }}>
                  <Receipt size={36} color={colors.textSecondary} strokeWidth={1.5} />
                  <Text style={[td.errorTxt, { color: colors.error }]}>{error}</Text>
                </View>
              )}

              {txn && !loading && (
                <>
                  {/* ── Meta row ── */}
                  <View style={[td.metaRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <MetaItem
                      icon={<Clock size={14} color={colors.textSecondary} strokeWidth={2} />}
                      label="Date & Time"
                      value={new Date(txn.createdAt).toLocaleString([], {
                        year:   'numeric',
                        month:  'short',
                        day:    'numeric',
                        hour:   '2-digit',
                        minute: '2-digit',
                      })}
                      colors={colors}
                    />
                    <View style={[td.metaDivider, { backgroundColor: colors.border }]} />
                    <MetaItem
                      icon={<CreditCard size={14} color={colors.textSecondary} strokeWidth={2} />}
                      label="Payment"
                      value={methodLabel}
                      colors={colors}
                    />
                    <View style={[td.metaDivider, { backgroundColor: colors.border }]} />
                    <MetaItem
                      icon={<User size={14} color={colors.textSecondary} strokeWidth={2} />}
                      label="Cashier"
                      value={(txn as any).cashier?.fullname ?? `#${txn.cashierId}`}
                      colors={colors}
                    />
                  </View>

                  {/* ── Customer details (if any) ── */}
                  {(txn as any).customerDetails && (
                    <View style={[td.section, { borderColor: colors.border }]}>
                      <SectionHeader icon={<User size={14} color={colors.primary} strokeWidth={2} />} label="Customer" colors={colors} />
                      <View style={[td.infoBox, { backgroundColor: colors.card }]}>
                        {(txn as any).customerDetails.name && (
                          <InfoRow label="Name"    value={(txn as any).customerDetails.name}   colors={colors} />
                        )}
                        {(txn as any).customerDetails.address && (
                          <InfoRow label="Address" value={(txn as any).customerDetails.address} colors={colors} />
                        )}
                        {(txn as any).customerDetails.tin && (
                          <InfoRow label="TIN"     value={(txn as any).customerDetails.tin}    colors={colors} />
                        )}
                      </View>
                    </View>
                  )}

                  {/* ── Items ── */}
                  <View style={[td.section, { borderColor: colors.border }]}>
                    <SectionHeader
                      icon={<ShoppingBag size={14} color={colors.primary} strokeWidth={2} />}
                      label={`Items (${txn.items.length})`}
                      colors={colors}
                    />
                    {txn.items.map((item, idx) => (
                      <View
                        key={item.id ?? idx}
                        style={[
                          td.itemRow,
                          { borderBottomColor: colors.border },
                          idx === txn.items.length - 1 && { borderBottomWidth: 0 },
                        ]}
                      >
                        {/* Thumbnail */}
                        {(item as any).image ? (
                          <Image
                            source={{ uri: (item as any).image }}
                            style={[td.thumb, { backgroundColor: colors.border }]}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={[td.thumbPlaceholder, { backgroundColor: colors.primary + '18' }]}>
                            <Package size={16} color={colors.primary} strokeWidth={2} />
                          </View>
                        )}
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={[td.itemName, { color: colors.text }]}>{item.name}</Text>
                          <Text style={[td.itemUnit, { color: colors.textSecondary }]}>
                            {item.quantity} {(item as any).unitLabel || (item as any).stockLabel || 'pcs'}
                            {(item as any).unitName ? ` · ${(item as any).unitName}` : ''}
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={[td.itemTotal, { color: colors.text }]}>
                            {formatPeso(item.price * item.quantity)}
                          </Text>
                          <Text style={[td.itemUnit, { color: colors.textSecondary }]}>
                            @ {formatPeso(item.price)}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>

                  {/* ── Totals ── */}
                  <View style={[td.section, { borderColor: colors.border }]}>
                    <SectionHeader
                      icon={<Receipt size={14} color={colors.primary} strokeWidth={2} />}
                      label="Summary"
                      colors={colors}
                    />
                    <View style={[td.totalsBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <TotalRow label="Subtotal" value={formatPeso(txn.subtotal)} colors={colors} />
                      <TotalRow label="VAT"      value={formatPeso(txn.tax ?? (txn as any).vatAmount ?? 0)} colors={colors} />
                      {(txn as any).cashReceived != null && (
                        <TotalRow label="Cash Received" value={formatPeso((txn as any).cashReceived)} colors={colors} />
                      )}
                      {(txn as any).change != null && (
                        <TotalRow label="Change" value={formatPeso((txn as any).change)} colors={colors} />
                      )}
                      <View style={[td.totalDivider, { backgroundColor: colors.border }]} />
                      <View style={td.grandRow}>
                        <Text style={[td.grandLabel, { color: colors.text }]}>Total</Text>
                        <Text style={[td.grandValue, { color: colors.success }]}>
                          {formatPeso(txn.total)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionHeader({ icon, label, colors }: { icon: React.ReactNode; label: string; colors: any }) {
  return (
    <View style={td.sectionHeader}>
      {icon}
      <Text style={[td.sectionLabel, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

function MetaItem({ icon, label, value, colors }: { icon: React.ReactNode; label: string; value: string; colors: any }) {
  return (
    <View style={td.metaItem}>
      {icon}
      <Text style={[td.metaLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[td.metaValue, { color: colors.text }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function InfoRow({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={td.infoRow}>
      <Text style={[td.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[td.infoValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

function TotalRow({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={td.totalRow}>
      <Text style={[td.totalLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[td.totalValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const td = StyleSheet.create({
  overlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet:     { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%', paddingBottom: 32 },
  handle:    { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  header:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 17, fontWeight: '800' },
  headerSub:   { fontSize: 11, marginTop: 1, fontFamily: 'monospace' },

  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  statusDot:   { width: 7, height: 7, borderRadius: 4 },
  statusTxt:   { fontSize: 12, fontWeight: '700' },

  body: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 20 },

  loadTxt:  { marginTop: 10, fontSize: 14 },
  errorTxt: { marginTop: 10, fontSize: 14, fontWeight: '600' },

  // Meta row
  metaRow:     { flexDirection: 'row', borderRadius: 14, borderWidth: 1, overflow: 'hidden', marginBottom: 14 },
  metaItem:    { flex: 1, padding: 12, gap: 4, alignItems: 'center' },
  metaDivider: { width: 1 },
  metaLabel:   { fontSize: 10, fontWeight: '600', letterSpacing: 0.5 },
  metaValue:   { fontSize: 12, fontWeight: '700', textAlign: 'center' },

  // Section
  section:       { marginBottom: 14 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  sectionLabel:  { fontSize: 14, fontWeight: '800' },

  // Customer info box
  infoBox: { borderRadius: 12, overflow: 'hidden' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10 },
  infoLabel: { fontSize: 12, fontWeight: '600' },
  infoValue: { fontSize: 12, textAlign: 'right', flex: 1, marginLeft: 10 },

  // Items
  itemRow:         { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  thumb:           { width: 40, height: 40, borderRadius: 8 },
  thumbPlaceholder: { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  itemName:  { fontSize: 14, fontWeight: '700' },
  itemUnit:  { fontSize: 11, marginTop: 2 },
  itemTotal: { fontSize: 14, fontWeight: '700' },

  // Totals
  totalsBox:    { borderRadius: 14, borderWidth: 1, padding: 14 },
  totalRow:     { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  totalLabel:   { fontSize: 13 },
  totalValue:   { fontSize: 13, fontWeight: '600' },
  totalDivider: { height: 1, marginVertical: 8 },
  grandRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  grandLabel:   { fontSize: 16, fontWeight: '800' },
  grandValue:   { fontSize: 20, fontWeight: '900' },
});

// ─────────────────────────────────────────────────────────────────────────────
// USAGE IN outlet-detail.tsx
// ─────────────────────────────────────────────────────────────────────────────
//
// 1. Import at the top:
//    import TransactionDetailModal from '@/components/TransactionDetailModal';
//
// 2. Add state:
//    const [selectedTxnId, setSelectedTxnId] = useState<string | null>(null);
//
// 3. Make every transaction card/row tappable (wrap existing card in TouchableOpacity):
//
//    CARD VIEW — replace the outer <View key={txn.id} style={[st.txnCard, ...]}>
//    with:
//      <TouchableOpacity
//        key={txn.id}
//        style={[st.txnCard, { backgroundColor: colors.card }]}
//        onPress={() => setSelectedTxnId(txn.id)}
//        activeOpacity={0.8}
//      >
//        ...existing card content...
//      </TouchableOpacity>
//
//    TABLE VIEW — wrap each data row similarly:
//      <TouchableOpacity
//        key={txn.id}
//        style={{ flexDirection: 'row', ... }}
//        onPress={() => setSelectedTxnId(txn.id)}
//        activeOpacity={0.75}
//      >
//        ...existing row cells...
//      </TouchableOpacity>
//
// 4. Add the modal before </SafeAreaView>:
//    <TransactionDetailModal
//      transactionId={selectedTxnId}
//      onClose={() => setSelectedTxnId(null)}
//      colors={colors}
//    />