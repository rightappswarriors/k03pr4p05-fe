// screens/RestockSchedulerScreen.tsx
// Business owner restock scheduler — create, edit, delete scheduled restock orders
// Features: multi-item selection, recurrence (once/daily/weekly/monthly/custom), time picker

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { InventoryService } from '@/services/inventoryService';
import { graphQLRequest } from '@/services/apiClient'; // adjust to your GQL client
import { gql } from 'graphql-request';

import RestockDatePickerModal, {
  type Recurrence,
  type ScheduleResult,
  type DaySchedule,
  DAY_NAMES,
  DAY_SHORT,
} from '@/components/RestockDatePickerModal';
// ─── GraphQL ──────────────────────────────────────────────────────────────────

const GET_RESTOCK_SCHEDULES = gql`
  query GetRestockSchedules {
    getRestockSchedules {
      id
      orgId
      recurrence
      startDate
      endDate
      timeOfDay
      dayOfWeek
      dayOfMonth
      emailRecipient
      emailSubject
      emailBody
      customTimes
      isActive
      lastTriggeredAt
      createdAt
      scheduleItems {
        id
        itemId
        quantity
        item { id name barcode stock minQuantity }
      }
    }
  }
`;

const CREATE_RESTOCK_SCHEDULE = gql`
  mutation CreateRestockSchedule($data: RestockScheduleInput!) {
    createRestockSchedule(data: $data) {
      id
      recurrence
      startDate
      timeOfDay
      customTimes
      emailRecipient
      isActive
      scheduleItems {
        id itemId quantity
        item { id name }
      }
    }
  }
`;

const UPDATE_RESTOCK_SCHEDULE = gql`
  mutation UpdateRestockSchedule($id: Int!, $data: RestockScheduleInput!) {
    updateRestockSchedule(id: $id, data: $data) {
      id
      recurrence
      startDate
      timeOfDay
      customTimes
      emailRecipient
      isActive
    }
  }
`;

const DELETE_RESTOCK_SCHEDULE = gql`
  mutation DeleteRestockSchedule($id: Int!) {
    deleteRestockSchedule(id: $id) { id }
  }
`;

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

interface ScheduleItem {
  itemId: number;
  quantity: number;
  timeOfDay?: string;   // "HH:MM" override
  dayOfWeek?: number;   // 0-6 override
  dayOfMonth?: number;  // 1-31 override
  item: { id: number; name: string; barcode: string; stock: number; minQuantity: number };
}

interface Schedule {
  id: number;
  recurrence: Recurrence;
  startDate: string;
  endDate?: string;
  timeOfDay: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
  emailRecipient: string;
  emailSubject?: string;
  emailBody?: string;
  isActive: boolean;
  lastTriggeredAt?: string;
  createdAt: string;
  scheduleItems: ScheduleItem[];
}

interface OrgItem {
  id: number;
  name: string;
  barcode: string;
  stock: number;
  minQuantity: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRecurrence(schedule: Schedule): string {
  switch (schedule.recurrence) {
    case 'once': return `Once · ${new Date(schedule.startDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    case 'daily': return `Daily at ${schedule.timeOfDay}`;
    case 'weekly': return `Every ${DAY_SHORT[schedule.dayOfWeek ?? 0]} at ${schedule.timeOfDay}`;
    case 'monthly': return `Monthly on day ${schedule.dayOfMonth} at ${schedule.timeOfDay}`;
    case 'custom': return `Custom · ${new Date(schedule.startDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })} at ${schedule.timeOfDay}`;
    default: return schedule.recurrence;
  }
}

function statusColor(schedule: Schedule, colors: any): string {
  if (!schedule.isActive) return colors.textSecondary;
  if (schedule.recurrence === 'once' && schedule.lastTriggeredAt) return colors.success;
  return colors.success;
}


function scheduleToPrismaInput(result: ScheduleResult): {
  recurrence: string;
  startDate: string;
  endDate?: string | null;
  timeOfDay: string;
  dayOfWeek?: number | null;
  dayOfMonth?: number | null;
  customTimes?: Array<{ date: string; timeOfDay: string }>;
} {
  // Helper: convert 12h → "HH:MM" 24h string
  const to24h = (hour: number, minute: number, period: 'AM' | 'PM') => {
    let h = hour % 12;
    if (period === 'PM') h += 12;
    return `${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  };
 
  switch (result.recurrence) {
    case 'once': {
      // If onceDate is undefined → send now
      const date = result.onceDate ?? new Date();
      const h = result.onceHour ?? ((new Date().getHours() % 12) || 12);
      const m = result.onceMinute ?? 0;
      const p = result.oncePeriod ?? (new Date().getHours() >= 12 ? 'PM' : 'AM');
      return {
        recurrence: 'once',
        startDate: date.toISOString(),
        timeOfDay: to24h(h, m, p),
      };
    }
 
    case 'daily': {
      const days = result.dailyDays ?? [];
      const first = days[0];
      const last = days[days.length - 1];
      // Use the first day's time as the primary timeOfDay for the scheduler cron.
      // The per-day overrides are stored so the worker can read them.
      return {
        recurrence: 'daily',
        startDate: first?.date.toISOString() ?? new Date().toISOString(),
        endDate: last?.date.toISOString() ?? null,
        timeOfDay: first ? to24h(first.hour, first.minute, first.period) : '09:00',
        customTimes: days.map(d => ({
          date: d.date.toISOString(),
          timeOfDay: to24h(d.hour, d.minute, d.period),
        })),
      };
    }
 
    case 'weekly':
      return {
        recurrence: 'weekly',
        startDate: result.weeklyStartDate?.toISOString() ?? new Date().toISOString(),
        endDate: result.weeklyEndDate?.toISOString() ?? null,
        timeOfDay: to24h(result.weeklyHour ?? 9, result.weeklyMinute ?? 0, result.weeklyPeriod ?? 'AM'),
        dayOfWeek: result.weeklyDayOfWeek ?? 1,
      };
 
    case 'monthly':
      return {
        recurrence: 'monthly',
        startDate: result.monthlyStartDate?.toISOString() ?? new Date().toISOString(),
        endDate: result.monthlyEndDate?.toISOString() ?? null,
        timeOfDay: to24h(result.monthlyHour ?? 9, result.monthlyMinute ?? 0, result.monthlyPeriod ?? 'AM'),
        dayOfMonth: result.monthlyDayOfMonth ?? 1,
      };
 
    case 'custom': {
      const days = result.customDays ?? [];
      const first = days[0];
      const last = days[days.length - 1];
      return {
        recurrence: 'custom',
        startDate: first?.date.toISOString() ?? new Date().toISOString(),
        endDate: last?.date.toISOString() ?? null,
        timeOfDay: first ? to24h(first.hour, first.minute, first.period) : '09:00',
        customTimes: days.map(d => ({
          date: d.date.toISOString(),
          timeOfDay: to24h(d.hour, d.minute, d.period),
        })),
      };
    }
 
    default:
      throw new Error(`Unknown recurrence: ${result.recurrence}`);
  }
}
 

// ─── Item Picker Modal ────────────────────────────────────────────────────────

function ItemPickerModal({
  visible,
  onClose,
  orgItems,
  selectedItems,
  onConfirm,
  colors,
}: {
  visible: boolean;
  onClose: () => void;
  orgItems: OrgItem[];
  selectedItems: { itemId: number; quantity: number }[];
  onConfirm: (items: { itemId: number; quantity: number }[]) => void;
  colors: any;
}) {
  const [localSelected, setLocalSelected] = useState<{ itemId: number; quantity: number }[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (visible) setLocalSelected(selectedItems);
  }, [visible, selectedItems]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return orgItems.filter(i => i.name.toLowerCase().includes(q) || i.barcode?.toLowerCase().includes(q));
  }, [orgItems, search]);

  const isSelected = (id: number) => localSelected.some(s => s.itemId === id);

  const toggle = (item: OrgItem) => {
    setLocalSelected(prev => {
      if (prev.some(s => s.itemId === item.id)) return prev.filter(s => s.itemId !== item.id);
      return [...prev, { itemId: item.id, quantity: item.minQuantity || 1 }];
    });
  };

  const updateQty = (itemId: number, qty: string) => {
    const n = parseFloat(qty) || 0;
    setLocalSelected(prev => prev.map(s => s.itemId === itemId ? { ...s, quantity: n } : s));
  };

  const s = useStyles(colors);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {/* Header */}
        <View style={[s.modalHeader, { backgroundColor: colors.primary }]}>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15 }}>Cancel</Text>
          </TouchableOpacity>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Select Items</Text>
          <TouchableOpacity onPress={() => { onConfirm(localSelected); onClose(); }}>
            <Text style={{ color: colors.accent, fontSize: 15, fontWeight: '700' }}>
              Done ({localSelected.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={{ padding: 12 }}>
          <View style={[s.searchBox]}>
            <Text style={{ fontSize: 14, color: colors.textSecondary }}>🔍</Text>
            <TextInput
              style={{ flex: 1, fontSize: 14, color: colors.text, marginLeft: 8 }}
              placeholder="Search items..."
              placeholderTextColor={colors.textSecondary}
              value={search}
              onChangeText={setSearch}
            />
          </View>
        </View>

        <FlatList
          data={filtered}
          keyExtractor={i => String(i.id)}
          contentContainerStyle={{ padding: 12, paddingTop: 0 }}
          renderItem={({ item }) => {
            const sel = localSelected.find(s => s.itemId === item.id);
            const selected = !!sel;
            return (
              <View style={[
                s.itemPickerRow,
                selected && { borderColor: colors.primary, borderWidth: 1.5, backgroundColor: colors.primary + '10' }
              ]}>
                <TouchableOpacity style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }} onPress={() => toggle(item)}>
                  <View style={[s.checkbox, selected && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                    {selected && <Text style={{ color: '#fff', fontSize: 12 }}>✓</Text>}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }} numberOfLines={1}>{item.name}</Text>
                    <Text style={{ fontSize: 11, color: colors.textSecondary }}>Stock: {item.stock} · Min: {item.minQuantity}</Text>
                  </View>
                </TouchableOpacity>
                {selected && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>Qty:</Text>
                    <TextInput
                      style={[s.qtyInput, { color: colors.text, borderColor: colors.border }]}
                      value={sel.quantity > 0 ? String(sel.quantity) : ''}
                      onChangeText={v => updateQty(item.id, v)}
                      keyboardType="decimal-pad"
                    />
                  </View>
                )}
              </View>
            );
          }}
        />
      </View>
    </Modal>
  );
}

// ─── Schedule Form Modal ──────────────────────────────────────────────────────
function ScheduleFormModal({
  visible,
  onClose,
  onSave,
  orgItems,
  editing,
  colors,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  orgItems: OrgItem[];  // keep from original screen
  editing: Schedule | null;
  colors: any;
}) {
  const s = useStyles(colors); // keep from original screen
 
  const [recurrence, setRecurrence] = useState<Recurrence>('once');
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [scheduleResult, setScheduleResult] = useState<ScheduleResult | null>(null);
 
  const [emailRecipient, setEmailRecipient] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [selectedItems, setSelectedItems] = useState<{ itemId: number; quantity: number; timeOfDay?: string; dayOfWeek?: number; dayOfMonth?: number }[]>([]);
  const [itemPickerOpen, setItemPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
 
  useEffect(() => {
    if (visible) {
      if (editing) {
        setRecurrence(editing.recurrence as Recurrence);
        setEmailRecipient(editing.emailRecipient || '');
        setEmailSubject(editing.emailSubject || '');
        setEmailBody(editing.emailBody || '');
        setSelectedItems(editing.scheduleItems.map(si => ({
          itemId: si.itemId,
          quantity: si.quantity,
          timeOfDay: si.timeOfDay || undefined,
          dayOfWeek: si.dayOfWeek ?? undefined,
          dayOfMonth: si.dayOfMonth ?? undefined,
        })));
        setScheduleResult(null); // force re-pick
      } else {
        setRecurrence('once');
        setEmailRecipient('');
        setEmailSubject('');
        setEmailBody('');
        setSelectedItems([]);
        setScheduleResult(null);
      }
      setError('');
    }
  }, [visible, editing]);
 
  // Friendly summary of what was picked
  const scheduleSummary = useMemo((): string => {
    if (!scheduleResult) return editing ? `${editing.recurrence} · tap to change` : 'Tap to set date & time';
    const r = scheduleResult;
    switch (r.recurrence) {
      case 'once':
        if (!r.onceDate) return 'Send immediately';
        return `${formatDate(r.onceDate)} at ${r.onceHour}:${String(r.onceMinute ?? 0).padStart(2,'0')} ${r.oncePeriod}`;
      case 'daily':
        return `${r.dailyDays?.length ?? 0} days scheduled`;
      case 'weekly':
        return `Every ${DAY_NAMES[r.weeklyDayOfWeek ?? 0]} at ${r.weeklyHour}:${String(r.weeklyMinute ?? 0).padStart(2,'0')} ${r.weeklyPeriod}`;
      case 'monthly':
        return `Monthly on day ${r.monthlyDayOfMonth} at ${r.monthlyHour}:${String(r.monthlyMinute ?? 0).padStart(2,'0')} ${r.monthlyPeriod}`;
      case 'custom':
        return `${r.customDays?.length ?? 0} custom dates`;
      default: return '';
    }
  }, [scheduleResult, editing]);
 
  function formatDate(d: Date) {
    return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  }
 
  const handleSave = async () => {
    if (!emailRecipient.trim()) { setError('Supplier email is required.'); return; }
    if (selectedItems.length === 0) { setError('Select at least one item.'); return; }
    if (!scheduleResult && !editing) { setError('Set a date and time for the schedule.'); return; }
    if (selectedItems.some(i => i.quantity <= 0)) { setError('All items must have quantity > 0.'); return; }
 
    setSaving(true);
    setError('');
    try {
      const datePayload = scheduleResult ? scheduleToPrismaInput(scheduleResult) : {
        // Editing with no new date picked → keep existing schedule fields
        recurrence: editing!.recurrence,
        startDate: editing!.startDate,
        endDate: editing!.endDate,
        timeOfDay: editing!.timeOfDay,
        dayOfWeek: editing!.dayOfWeek,
        dayOfMonth: editing!.dayOfMonth,
      };
 
      await onSave({
        items: selectedItems,
        ...datePayload,
        emailRecipient: emailRecipient.trim(),
        emailSubject: emailSubject.trim() || null,
        emailBody: emailBody.trim() || null,
      });
      onClose();
    } catch (e: any) {
      if (process.env.EXPO_PUBLIC_ENV === 'development') 
      console.error(`Error saving schedule: ${recurrence}`, e);
      setError(e.message || 'Failed to save schedule.');
    } finally {
      setSaving(false);
    }
  };
 
  const RECURRENCE_OPTIONS: { key: Recurrence; label: string }[] = [
    { key: 'once', label: 'Once' },
    { key: 'daily', label: 'Daily' },
    { key: 'weekly', label: 'Weekly' },
    { key: 'monthly', label: 'Monthly' },
    { key: 'custom', label: 'Custom' },
  ];
 
  const updateSelectedItem = (itemId: number, updates: Partial<{ quantity: number; timeOfDay?: string; dayOfWeek?: number; dayOfMonth?: number }>) => {
    setSelectedItems(prev => prev.map(s => s.itemId === itemId ? { ...s, ...updates } : s));
  };

  const selectedItemDetails = selectedItems
    .map(si => ({ ...si, item: orgItems.find(o => o.id === si.itemId) }))
    .filter(si => si.item);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={[s.modalHeader, { backgroundColor: colors.primary }]}>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15 }}>Cancel</Text>
          </TouchableOpacity>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
            {editing ? 'Edit Schedule' : 'New Restock Schedule'}
          </Text>
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            {saving
              ? <ActivityIndicator color={colors.accent} />
              : <Text style={{ color: colors.accent, fontSize: 15, fontWeight: '700' }}>Save</Text>
            }
          </TouchableOpacity>
        </View>
 
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
 
          {/* ── Recurrence type pills ── */}
          <Text style={s.sectionLabel}>Recurrence</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            {RECURRENCE_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.key}
                style={[
                  s.recurrencePill,
                  recurrence === opt.key && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                onPress={() => { setRecurrence(opt.key); setScheduleResult(null); }}
              >
                <Text style={[
                  { fontSize: 13, fontWeight: '700', color: colors.text },
                  recurrence === opt.key && { color: '#fff' },
                ]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
 
          {/* ── Date/time selector button ── */}
          <Text style={s.sectionLabel}>Date & Time</Text>
          <TouchableOpacity
            style={{
              backgroundColor: colors.surface,
              borderWidth: scheduleResult ? 1.5 : 1,
              borderColor: scheduleResult ? colors.primary : colors.border,
              borderRadius: 12,
              padding: 14,
              marginBottom: 16,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
            onPress={() => setDatePickerOpen(true)}
          >
            <View>
              <Text style={{ fontSize: 14, fontWeight: '600', color: scheduleResult ? colors.text : colors.textSecondary }}>
                {scheduleSummary}
              </Text>
              <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                Tap to {scheduleResult ? 'change' : 'set'} schedule
              </Text>
            </View>
            <Text style={{ fontSize: 18, color: colors.primary }}>›</Text>
          </TouchableOpacity>
 
          {/* ── Divider ── */}
          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 4 }} />
 
          {/* ── Supplier details ── */}
          <Text style={[s.sectionLabel, { marginTop: 12 }]}>Supplier Details</Text>
          <View style={s.formGroup}>
            <Text style={s.label}>Supplier email *</Text>
            <TextInput
              style={[s.input, { color: colors.text }]}
              placeholder="supplier@example.com"
              placeholderTextColor={colors.textSecondary}
              value={emailRecipient}
              onChangeText={setEmailRecipient}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          <View style={s.formGroup}>
            <Text style={s.label}>Email subject</Text>
            <TextInput
              style={[s.input, { color: colors.text }]}
              placeholder="Restock order from our store"
              placeholderTextColor={colors.textSecondary}
              value={emailSubject}
              onChangeText={setEmailSubject}
            />
          </View>
          <View style={s.formGroup}>
            <Text style={s.label}>Message to supplier</Text>
            <TextInput
              style={[s.input, { color: colors.text, minHeight: 80, textAlignVertical: 'top', paddingTop: 12 }]}
              placeholder="Please deliver to our main branch..."
              placeholderTextColor={colors.textSecondary}
              value={emailBody}
              onChangeText={setEmailBody}
              multiline
            />
          </View>
 
          {/* ── Divider ── */}
          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 4 }} />
 
          {/* ── Items ── */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, marginTop: 8 }}>
            <Text style={s.sectionLabel}>Items to Restock</Text>
            <TouchableOpacity style={[s.addItemBtn, { borderColor: colors.primary }]} onPress={() => setItemPickerOpen(true)}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>+ Select Items</Text>
            </TouchableOpacity>
          </View>
 
          {selectedItemDetails.length === 0 ? (
            <TouchableOpacity style={[s.emptyItemsBox, { borderColor: colors.border }]} onPress={() => setItemPickerOpen(true)}>
              <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center' }}>Tap to select items to restock</Text>
            </TouchableOpacity>
          ) : (
            selectedItemDetails.map(({ itemId, quantity, timeOfDay, dayOfWeek, dayOfMonth, item }) => (
              <View key={itemId} style={[s.selectedItemRow, { borderColor: colors.border, paddingBottom: 10 }]}> 
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{item!.name}</Text>
                  <Text style={{ fontSize: 11, color: colors.textSecondary }}>Stock: {item!.stock} · Min: {item!.minQuantity}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>Qty:</Text>
                  <TextInput
                    style={[s.qtyInput, { color: colors.text, borderColor: colors.border }]}
                    value={quantity > 0 ? String(quantity) : ''}
                    onChangeText={v => {
                      const n = parseFloat(v) || 0;
                      updateSelectedItem(itemId, { quantity: n });
                    }}
                    keyboardType="decimal-pad"
                  />
                  <TouchableOpacity onPress={() => setSelectedItems(prev => prev.filter(s => s.itemId !== itemId))} style={{ padding: 4 }}>
                    <Text style={{ fontSize: 16, color: colors.error }}>✕</Text>
                  </TouchableOpacity>
                </View>

                {/* Per-item schedule overrides */}
                <View style={{ marginTop: 8 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary }}>Item-specific schedule (optional)</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                    <TextInput
                      style={[s.qtyInput, { flex: 1, borderColor: colors.border }]}
                      placeholder="HH:MM"
                      placeholderTextColor={colors.textSecondary}
                      value={timeOfDay || ''}
                      onChangeText={(value) => updateSelectedItem(itemId, { timeOfDay: value })}
                    />
                    <TextInput
                      style={[s.qtyInput, { flex: 0.8, borderColor: colors.border }]}
                      placeholder="Wkday(0-6)"
                      placeholderTextColor={colors.textSecondary}
                      value={dayOfWeek != null ? String(dayOfWeek) : ''}
                      onChangeText={(value) => {
                        const v = parseInt(value, 10);
                        updateSelectedItem(itemId, { dayOfWeek: Number.isNaN(v) ? undefined : v });
                      }}
                      keyboardType="numeric"
                    />
                    <TextInput
                      style={[s.qtyInput, { flex: 1, borderColor: colors.border }]}
                      placeholder="Month day"
                      placeholderTextColor={colors.textSecondary}
                      value={dayOfMonth != null ? String(dayOfMonth) : ''}
                      onChangeText={(value) => {
                        const v = parseInt(value, 10);
                        updateSelectedItem(itemId, { dayOfMonth: Number.isNaN(v) ? undefined : v });
                      }}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              </View>
            ))
          )}
 
          {error ? (
            <View style={[s.errorBox, { borderColor: colors.error, backgroundColor: colors.error + '15' }]}>
              <Text style={{ fontSize: 13, color: colors.error }}>{error}</Text>
            </View>
          ) : null}
 
          <TouchableOpacity
            style={[s.saveBtn, { backgroundColor: colors.primary }, saving && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>{editing ? 'Update Schedule' : 'Create Schedule'}</Text>
            }
          </TouchableOpacity>
        </ScrollView>
 
        {/* Date picker modal */}
        <RestockDatePickerModal
          visible={datePickerOpen}
          recurrence={recurrence}
          onClose={() => setDatePickerOpen(false)}
          onConfirm={(result) => {
            setScheduleResult(result);
            setDatePickerOpen(false);
          }}
        />
 
        {/* Item picker modal — keep exactly as before */}
        <ItemPickerModal
          visible={itemPickerOpen}
          onClose={() => setItemPickerOpen(false)}
          orgItems={orgItems}
          selectedItems={selectedItems}
          onConfirm={setSelectedItems}
          colors={colors}
        />
      </View>
    </Modal>
  );
}

// ─── Schedule Card ─────────────────────────────────────────────────────────────

function ScheduleCard({
  schedule,
  onEdit,
  onDelete,
  colors,
}: {
  schedule: Schedule;
  onEdit: () => void;
  onDelete: () => void;
  colors: any;
}) {
  const s = useStyles(colors);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const onPressIn = () => Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, speed: 50 }).start();
  const onPressOut = () => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 50 }).start();

  const recurrenceColor: Record<Recurrence, string> = {
    once: colors.textSecondary,
    daily: colors.primary,
    weekly: colors.accent,
    monthly: '#10B981',
    custom: '#8B5CF6',
  };

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }]}>
      <Pressable
        style={[s.card, !schedule.isActive && { opacity: 0.55 }]}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={onEdit}
      >
        {/* Top row */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <View style={[s.recurrenceBadge, { backgroundColor: recurrenceColor[schedule.recurrence as Recurrence] + '20', borderColor: recurrenceColor[schedule.recurrence as Recurrence] }]}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: recurrenceColor[schedule.recurrence as Recurrence] }}>
                  {schedule.recurrence.toUpperCase()}
                </Text>
              </View>
              {!schedule.isActive && (
                <View style={[s.recurrenceBadge, { backgroundColor: colors.border, borderColor: colors.border }]}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary }}>PAUSED</Text>
                </View>
              )}
            </View>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>
              {formatRecurrence(schedule)}
            </Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
              → {schedule.emailRecipient}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={[s.iconBtn, { borderColor: colors.border }]} onPress={onEdit}>
              <Text style={{ fontSize: 13 }}>✏️</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.iconBtn, { borderColor: colors.error + '60', backgroundColor: colors.error + '10' }]}
              onPress={onDelete}
            >
              <Text style={{ fontSize: 13 }}>🗑</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Items list */}
        <View style={{ gap: 4 }}>
          {schedule.scheduleItems.slice(0, 3).map(si => (
            <View key={si.itemId} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 13, color: colors.text, flex: 1 }} numberOfLines={1}>{si.item.name}</Text>
              <View style={[s.qtyBadge, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>×{si.quantity}</Text>
              </View>
            </View>
          ))}
          {schedule.scheduleItems.length > 3 && (
            <Text style={{ fontSize: 11, color: colors.textSecondary }}>
              +{schedule.scheduleItems.length - 3} more items
            </Text>
          )}
        </View>

        {/* Footer */}
        {schedule.lastTriggeredAt && (
          <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border }}>
            <Text style={{ fontSize: 11, color: colors.textSecondary }}>
              Last sent: {new Date(schedule.lastTriggeredAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

// ─── Shared Styles Factory ────────────────────────────────────────────────────

function useStyles(colors: any) {
  return useMemo(() => StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 12,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: Platform.OS === 'ios' ? 56 : 20,
      paddingBottom: 16,
      paddingHorizontal: 20,
    },
    sectionLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSecondary,
      letterSpacing: 0.8,
      marginBottom: 10,
      marginTop: 4,
    },
    label: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 6,
    },
    input: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 14,
    },
    formGroup: { marginBottom: 14 },
    recurrencePill: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    dayPill: {
      width: 42,
      height: 36,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    itemPickerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      marginBottom: 8,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    qtyInput: {
      width: 60,
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 6,
      fontSize: 14,
      textAlign: 'center',
      backgroundColor: colors.background,
    },
    selectedItemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: 10,
      padding: 12,
      marginBottom: 8,
      backgroundColor: colors.surface,
    },
    emptyItemsBox: {
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderRadius: 12,
      padding: 24,
      alignItems: 'center',
      marginBottom: 12,
    },
    addItemBtn: {
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    errorBox: {
      borderWidth: 1,
      borderRadius: 10,
      padding: 12,
      marginTop: 4,
      marginBottom: 12,
    },
    saveBtn: {
      borderRadius: 12,
      paddingVertical: 15,
      alignItems: 'center',
      marginTop: 12,
    },
    recurrenceBadge: {
      borderWidth: 1,
      borderRadius: 20,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    iconBtn: {
      width: 34,
      height: 34,
      borderRadius: 8,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    qtyBadge: {
      borderWidth: 1,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
  }), [colors]);
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function RestockSchedulerScreen() {
  const { colors } = useTheme();
  const s = useStyles(colors);

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [orgItems, setOrgItems] = useState<OrgItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [formVisible, setFormVisible] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [schedulesRes, itemsRes] = await Promise.all([
        graphQLRequest<{ getRestockSchedules: Schedule[] }>(GET_RESTOCK_SCHEDULES),
        InventoryService.getOrgItems('', 200),
      ]);
      setSchedules(schedulesRes.getRestockSchedules || []);
      setOrgItems((itemsRes || []).map((it: any) => ({
        id: it.id,
        name: it.name,
        barcode: it.barcode || '',
        stock: Number(it.stock || 0),
        minQuantity: Number(it.minQuantity || 0),
      })));
    } catch (e) {
      console.error('Failed to load restock data', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = () => { setEditingSchedule(null); setFormVisible(true); };
  const handleEdit = (s: Schedule) => { setEditingSchedule(s); setFormVisible(true); };

  const handleSave = async (data: any) => {
    if (editingSchedule) {
      await graphQLRequest(UPDATE_RESTOCK_SCHEDULE, { id: editingSchedule.id, data });
    } else {
      await graphQLRequest(CREATE_RESTOCK_SCHEDULE, { data });
    }
    await load();
  };

  const handleDelete = (schedule: Schedule) => {
    Alert.alert(
      'Delete Schedule',
      `Remove this ${schedule.recurrence} restock schedule? This will also cancel any pending BullMQ jobs.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await graphQLRequest(DELETE_RESTOCK_SCHEDULE, { id: schedule.id });
              setSchedules(prev => prev.filter(s => s.id !== schedule.id));
            } catch (e) {
              Alert.alert('Error', 'Failed to delete schedule.');
            }
          },
        },
      ]
    );
  };

  const activeCount = schedules.filter(s => s.isActive).length;

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 12, color: colors.textSecondary, fontSize: 14 }}>Loading schedules...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ backgroundColor: colors.primary, paddingTop: Platform.OS === 'ios' ? 56 : 20, paddingBottom: 20, paddingHorizontal: 20 }}>
        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600', letterSpacing: 1, marginBottom: 4 }}>
          INVENTORY MANAGEMENT
        </Text>
        <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 16 }}>Restock Scheduler</Text>

        {/* Stats row */}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {[
            { label: 'Schedules', value: schedules.length, color: '#fff' },
            { label: 'Active', value: activeCount, color: '#6EE7B7' },
            { label: 'Paused', value: schedules.length - activeCount, color: 'rgba(255,255,255,0.5)' },
          ].map(stat => (
            <View key={stat.label} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 10, padding: 10, alignItems: 'center' }}>
              <Text style={{ fontSize: 20, fontWeight: '900', color: stat.color }}>{stat.value}</Text>
              <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* List */}
      <FlatList
        data={schedules}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <Text style={{ fontSize: 40 }}>📦</Text>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 12 }}>No schedules yet</Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4, textAlign: 'center' }}>
              Create a restock schedule to automatically notify your supplier when stock runs low.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <ScheduleCard
            schedule={item}
            onEdit={() => handleEdit(item)}
            onDelete={() => handleDelete(item)}
            colors={colors}
          />
        )}
      />

      {/* FAB */}
      <TouchableOpacity
        style={{
          position: 'absolute',
          bottom: 28,
          right: 20,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: colors.accent,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: colors.accent,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.4,
          shadowRadius: 8,
          elevation: 8,
        }}
        onPress={handleCreate}
      >
        <Text style={{ color: '#fff', fontSize: 28, lineHeight: 32, marginTop: -2 }}>+</Text>
      </TouchableOpacity>

      <ScheduleFormModal
        visible={formVisible}
        onClose={() => setFormVisible(false)}
        onSave={handleSave}
        orgItems={orgItems}
        editing={editingSchedule}
        colors={colors}
      />
    </View>
  );
}