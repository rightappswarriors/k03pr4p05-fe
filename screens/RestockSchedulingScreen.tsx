// screens/RestockSchedulerScreen.tsx
// Business owner restock scheduler — create, edit, delete scheduled restock orders.
// Cycles: each cycle is one specific firing with its own items, qty, and supplier.
// Features: cycle calendar view, multi-item selection per cycle, recurrence envelope.

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
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '@/contexts/ThemeContext';
import { InventoryService } from '@/services/inventoryService';
import { AdminService } from '@/services/ManagerService';
import { graphQLRequest } from '@/services/apiClient';
import { gql } from 'graphql-request';
import { TimeSelector } from '@/components/RestockDatePickerModal';
import type { Recurrence } from '@/components/RestockDatePickerModal';
import RestockDatePickerModal, {
  type ScheduleResult,
  DAY_SHORT,
} from '@/components/RestockDatePickerModal';
import { AtSign, PackagePlus, X } from 'lucide-react-native';

import ContactPickerModal from '@/components/ContactPickerModal';
import { AuthService } from '@/services/authService';
import { getGraphQLClient } from '@/utils/constants';
import { useAuth } from '@/contexts/AuthContext';

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
      branchId
      outletId
      address
      latitude
      longitude
      branch {
        id
        name
        address
      }
      outlet {
        id
        name
        address
        latitude
        longitude
      }
      scheduleItems {
        id
        itemId
        quantity
        item {
          id
          name
          barcode
          stock
          minQuantity
        }
      }
      cycles {
        id
        scheduleId
        orgId
        branchId
        outletId
        address
        latitude
        longitude
        scheduledAt
        emailRecipient
        emailSubject
        emailBody
        isActive
        firedAt
        createdAt
        cycleItems {
          id
          itemId
          quantity
          item {
            id
            name
            barcode
            stock
            minQuantity
          }
        }
         supplierOrders {         
          id
          status
          supplierEmail
          items {
            id
            itemId
            requestedQty
            deliveredQty
            confirmedQty
          }
        }
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
      emailRecipient
      isActive
      branchId
      outletId
      address
      latitude
      longitude
      scheduleItems {
        id
        itemId
        quantity
        item {
          id
          name
        }
      }
      branch {
        id
        name
        address
      }
      outlet {
        id
        name
        address
        latitude
        longitude
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
      emailRecipient
      isActive
      branchId
      outletId
      address
      latitude
      longitude
      branch {
        id
        name
        address
      }
      outlet {
        id
        name
        address
        latitude
        longitude
      }
    }
  }
`;

const DELETE_RESTOCK_SCHEDULE = gql`
  mutation DeleteRestockSchedule($id: Int!) {
    deleteRestockSchedule(id: $id) {
      id
    }
  }
`;

const CREATE_RESTOCK_CYCLE = gql`
  mutation CreateRestockCycle($data: RestockCycleInput!) {
    createRestockCycle(data: $data) {
      id
      scheduleId
      orgId
      branchId
      outletId
      address
      latitude
      longitude
      scheduledAt
      emailRecipient
      isActive
      firedAt
      cycleItems {
        id
        itemId
        quantity
        item {
          id
          name
        }
      }
    }
  }
`;

const UPDATE_RESTOCK_CYCLE = gql`
  mutation UpdateRestockCycle($id: Int!, $data: RestockCycleInput!) {
    updateRestockCycle(id: $id, data: $data) {
      id
      scheduleId
      orgId
      branchId
      outletId
      address
      latitude
      longitude
      scheduledAt
      emailRecipient
      isActive
      firedAt
      cycleItems {
        id
        itemId
        quantity
        item {
          id
          name
        }
      }
    }
  }
`;

const DELETE_RESTOCK_CYCLE = gql`
  mutation DeleteRestockCycle($id: Int!) {
    deleteRestockCycle(id: $id) {
      id
    }
  }
`;

const TOGGLE_RESTOCK_CYCLE = gql`
  mutation ToggleRestockCycle($id: Int!) {
    toggleRestockCycle(id: $id) {
      id
      isActive
    }
  }
`;

// ─── Types ────────────────────────────────────────────────────────────────────

interface CycleItem {
  id: number;
  itemId: number;
  quantity: number;
  item: {
    id: number;
    name: string;
    barcode: string;
    stock: number;
    minQuantity: number;
  };
}

interface Branch {
  id: number;
  name: string;
  address: string;
  isActive: boolean;
}

interface Outlet {
  id: number;
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
  status: string;
}
interface SupplierOrderItem {
  id: number;
  itemId: number;
  requestedQty: number;
  deliveredQty?: number;
  confirmedQty?: number;
}
interface SupplierOrder {
  id: number;
  status: 'pending' | 'acknowledged' | 'sent' | 'delivered' | 'cancelled';
  supplierEmail: string;
  items: SupplierOrderItem[];
}
interface Cycle {
  id: number;
  scheduleId: number;
  orgId: number;
  branchId?: number;
  outletId?: number;
  branch?: Branch;
  outlet?: Outlet;
  address?: string;
  latitude?: number;
  longitude?: number;
  scheduledAt: string;
  emailRecipient: string;
  emailSubject?: string;
  emailBody?: string;
  isActive: boolean;
  firedAt?: string;
  createdAt: string;
  cycleItems: CycleItem[];
  supplierOrders: SupplierOrder[];  // ← add this
}

interface ScheduleItem {
  itemId: number;
  quantity: number;
  item: {
    id: number;
    name: string;
    barcode: string;
    stock: number;
    minQuantity: number;
  };
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
  branchId?: number;
  outletId?: number;
  address?: string;
  latitude?: number;
  longitude?: number;
  branch?: Branch;
  outlet?: Outlet;
  scheduleItems: ScheduleItem[];
  cycles: Cycle[];
}

interface OrgItem {
  id: number;
  name: string;
  barcode: string;
  stock: number;
  minQuantity: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function formatRecurrence(schedule: Schedule): string {
  switch (schedule.recurrence) {
    case 'once':
      return `Once · ${new Date(schedule.startDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    case 'daily':
      return `Daily at ${schedule.timeOfDay}`;
    case 'weekly':
      return `Every ${DAY_SHORT[schedule.dayOfWeek ?? 0]} at ${schedule.timeOfDay}`;
    case 'monthly':
      return `Monthly on day ${schedule.dayOfMonth} at ${schedule.timeOfDay}`;
    case 'custom':
      return `Custom · ${new Date(schedule.startDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })} at ${schedule.timeOfDay}`;
    default:
      return schedule.recurrence;
  }
}

function formatCycleDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatCycleTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-PH', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function scheduleToPrismaInput(result: ScheduleResult) {
  const to24h = (hour: number, minute: number, period: 'AM' | 'PM') => {
    let h = hour % 12;
    if (period === 'PM') h += 12;
    return `${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  };
  switch (result.recurrence) {
    case 'once': {
      const date = result.onceDate ?? new Date();
      const h = result.onceHour ?? (new Date().getHours() % 12 || 12);
      const m = result.onceMinute ?? 0;
      const p =
        result.oncePeriod ?? (new Date().getHours() >= 12 ? 'PM' : 'AM');
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
      return {
        recurrence: 'daily',
        startDate: first?.date.toISOString() ?? new Date().toISOString(),
        endDate: last?.date.toISOString() ?? null,
        timeOfDay: first
          ? to24h(first.hour, first.minute, first.period)
          : '09:00',
        customTimes: days.map((d) => ({
          date: d.date.toISOString(),
          timeOfDay: to24h(d.hour, d.minute, d.period),
        })),
      };
    }
    case 'weekly':
      return {
        recurrence: 'weekly',
        startDate:
          result.weeklyStartDate?.toISOString() ?? new Date().toISOString(),
        endDate: result.weeklyEndDate?.toISOString() ?? null,
        timeOfDay: to24h(
          result.weeklyHour ?? 9,
          result.weeklyMinute ?? 0,
          result.weeklyPeriod ?? 'AM',
        ),
        dayOfWeek: result.weeklyDayOfWeek ?? 1,
      };
    case 'monthly':
      return {
        recurrence: 'monthly',
        startDate:
          result.monthlyStartDate?.toISOString() ?? new Date().toISOString(),
        endDate: result.monthlyEndDate?.toISOString() ?? null,
        timeOfDay: to24h(
          result.monthlyHour ?? 9,
          result.monthlyMinute ?? 0,
          result.monthlyPeriod ?? 'AM',
        ),
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
        timeOfDay: first
          ? to24h(first.hour, first.minute, first.period)
          : '09:00',
        customTimes: days.map((d) => ({
          date: d.date.toISOString(),
          timeOfDay: to24h(d.hour, d.minute, d.period),
        })),
      };
    }
    default:
      throw new Error(`Unknown recurrence: ${result.recurrence}`);
  }
}
function getStockStatus(stock: number, minQuantity: number) {
  if (stock <= 0) {
    return { level: 'critical', label: 'No Stock', color: '#EF4444' };
  }

  // If minQuantity is 0 or not set, use a fallback threshold of 10
  const threshold = minQuantity > 0 ? minQuantity : 10;

  if (stock <= threshold) {
    return { level: 'low', label: 'Low', color: '#EF4444' };
  }
  if (stock <= threshold * 1.5) {
    return { level: 'warning', label: 'Low Stock', color: '#F59E0B' };
  }
  return { level: 'ok', label: 'OK', color: '#22C55E' };
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
  const [localSelected, setLocalSelected] = useState<
    { itemId: number; quantity: number }[]
  >([]);
  const [search, setSearch] = useState('');
  const s = useStyles(colors);

  useEffect(() => {
    if (visible) setLocalSelected(selectedItems);
  }, [visible, selectedItems]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return orgItems.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.barcode?.toLowerCase().includes(q),
    );
  }, [orgItems, search]);

  const toggle = (item: OrgItem) => {
    setLocalSelected((prev) => {
      if (prev.some((s) => s.itemId === item.id))
        return prev.filter((s) => s.itemId !== item.id);
      return [...prev, { itemId: item.id, quantity: item.minQuantity || 1 }];
    });
  };

  const updateQty = (itemId: number, qty: string) => {
    const n = parseFloat(qty) || 0;
    setLocalSelected((prev) =>
      prev.map((s) => (s.itemId === itemId ? { ...s, quantity: n } : s)),
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={[s.modalHeader, { backgroundColor: colors.primary }]}>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15 }}>
              Cancel
            </Text>
          </TouchableOpacity>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
            Select Items
          </Text>
          <TouchableOpacity
            onPress={() => {
              onConfirm(localSelected);
              onClose();
            }}
          >
            <Text
              style={{ color: colors.accent, fontSize: 15, fontWeight: '700' }}
            >
              Done ({localSelected.length})
            </Text>
          </TouchableOpacity>
        </View>
        <View style={{ padding: 12 }}>
          <View style={s.searchBox}>
            <Text style={{ fontSize: 14, color: colors.textSecondary }}>
              🔍
            </Text>
            <TextInput
              style={{
                flex: 1,
                fontSize: 14,
                color: colors.text,
                marginLeft: 8,
              }}
              placeholder="Search items..."
              placeholderTextColor={colors.textSecondary}
              value={search}
              onChangeText={setSearch}
            />
          </View>
        </View>
        <FlatList
          data={filtered}
          keyExtractor={(i) => String(i.id)}
          contentContainerStyle={{ padding: 12, paddingTop: 0 }}
          renderItem={({ item }) => {
            const sel = localSelected.find((s) => s.itemId === item.id);
            const selected = !!sel;
            const stockStatus = getStockStatus(
              item.stock,
              item.minQuantity || 1,
            );
            const isLow =
              stockStatus.level === 'low' || stockStatus.level === 'critical';
            const isWarning = stockStatus.level === 'warning';

            // Border color priority: selected (primary) > low (red) > warning (yellow) > default
            const borderColor = selected
              ? colors.primary
              : isLow
                ? '#EF4444'
                : isWarning
                  ? '#F59E0B'
                  : colors.border;

            const borderWidth = selected || isLow || isWarning ? 1.5 : 1;

            const backgroundColor = selected
              ? colors.primary + '10'
              : isLow
                ? '#EF444408'
                : isWarning
                  ? '#F59E0B08'
                  : colors.card;

            return (
              <View
                style={[
                  s.itemPickerRow,
                  {
                    borderColor,
                    borderWidth,
                    backgroundColor,
                  },
                ]}
              >
                <TouchableOpacity
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                  }}
                  onPress={() => toggle(item)}
                >
                  <View
                    style={[
                      s.checkbox,
                      selected && {
                        backgroundColor: colors.primary,
                        borderColor: colors.primary,
                      },
                    ]}
                  >
                    {selected && (
                      <Text style={{ color: '#fff', fontSize: 12 }}>✓</Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: colors.text,
                      }}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        marginTop: 2,
                      }}
                    >
                      <Text
                        style={{ fontSize: 11, color: colors.textSecondary }}
                      >
                        Stock: {item.stock} · Min: {item.minQuantity}
                      </Text>
                      {/* Stock badge — only show if not OK */}
                      {stockStatus.level !== 'ok' && (
                        <View
                          style={{
                            paddingHorizontal: 6,
                            paddingVertical: 1,
                            borderRadius: 20,
                            borderWidth: 1,
                            borderColor: stockStatus.color,
                            backgroundColor: stockStatus.color + '15',
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 10,
                              fontWeight: '600',
                              color: stockStatus.color,
                            }}
                          >
                            {stockStatus.label}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
                {selected && (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                      Qty:
                    </Text>
                    <TextInput
                      style={[
                        s.qtyInput,
                        { color: colors.text, borderColor: colors.border },
                      ]}
                      value={sel.quantity > 0 ? String(sel.quantity) : ''}
                      onChangeText={(v) => updateQty(item.id, v)}
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

// ─── Branch / Outlet Pickers ─────────────────────────────────────────────────

function BranchPickerModal({
  visible,
  onClose,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (branch: Branch) => void;
}) {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const loadBranches = async (query = '') => {
    setLoading(true);
    try {
      const branchList = await AdminService.getBranchesMinimal(query);
      setBranches(branchList);
    } catch (e) {
      console.error('Failed to load branches', e);
      setBranches([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!visible) return;
    setSearch('');
    loadBranches('');
  }, [visible]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!visible) return;
      loadBranches(search.trim());
    }, 300);
    return () => clearTimeout(timeout);
  }, [search, visible]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={[styles.modalHeader, { backgroundColor: colors.primary }]}>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ color: 'rgba(255,255,255,0.7)' }}>Close</Text>
          </TouchableOpacity>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
            Select Branch
          </Text>
          <View style={{ width: 48 }} />
        </View>
        <View style={{ padding: 12 }}>
          <TextInput
            style={[styles.input, { marginBottom: 10 }]}
            placeholder="Search branch name or address"
            placeholderTextColor={colors.textSecondary}
            value={search}
            onChangeText={setSearch}
          />
          <View style={{ minHeight: 180 }}>
            {loading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <View
                  key={idx}
                  style={{
                    height: 48,
                    borderRadius: 10,
                    backgroundColor: colors.border,
                    marginBottom: 8,
                  }}
                />
              ))
            ) : branches.length === 0 ? (
              <Text
                style={{ textAlign: 'center', color: colors.textSecondary }}
              >
                No branches found.
              </Text>
            ) : (
              branches.map((branch) => (
                <TouchableOpacity
                  key={branch.id}
                  style={{
                    padding: 12,
                    borderBottomWidth: 1,
                    borderColor: colors.border,
                  }}
                  onPress={() => {
                    onSelect(branch);
                    onClose();
                  }}
                >
                  <Text style={{ fontWeight: '700', color: colors.text }}>
                    {branch.name}
                  </Text>
                  <Text style={{ color: colors.textSecondary }}>
                    {branch.address}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function OutletPickerModal({
  visible,
  branchId,
  onClose,
  onSelect,
}: {
  visible: boolean;
  branchId?: number;
  onClose: () => void;
  onSelect: (outlet: Outlet) => void;
}) {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const loadOutlets = async (query = '') => {
    if (!branchId) return;
    setLoading(true);
    try {
      const outletList = await AdminService.getOutletsByBranchMinimal(
        String(branchId),
        query,
      );
      setOutlets(outletList);
    } catch (e) {
      console.error('Failed to load outlets', e);
      setOutlets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!visible || !branchId) return;
    setSearch('');
    loadOutlets('');
  }, [visible, branchId]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!visible || !branchId) return;
      loadOutlets(search.trim());
    }, 300);
    return () => clearTimeout(timeout);
  }, [search, visible, branchId]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={[styles.modalHeader, { backgroundColor: colors.primary }]}>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ color: 'rgba(255,255,255,0.7)' }}>Close</Text>
          </TouchableOpacity>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
            Select Outlet
          </Text>
          <View style={{ width: 48 }} />
        </View>
        <View style={{ padding: 12 }}>
          {branchId ? (
            <>
              <TextInput
                style={[styles.input, { marginBottom: 10 }]}
                placeholder="Search outlet name or address"
                placeholderTextColor={colors.textSecondary}
                value={search}
                onChangeText={setSearch}
              />
              <View style={{ minHeight: 180 }}>
                {loading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <View
                      key={idx}
                      style={{
                        height: 48,
                        borderRadius: 10,
                        backgroundColor: colors.border,
                        marginBottom: 8,
                      }}
                    />
                  ))
                ) : outlets.length === 0 ? (
                  <Text
                    style={{ textAlign: 'center', color: colors.textSecondary }}
                  >
                    No outlets found for this branch.
                  </Text>
                ) : (
                  outlets.map((outlet) => (
                    <TouchableOpacity
                      key={outlet.id}
                      style={{
                        padding: 12,
                        borderBottomWidth: 1,
                        borderColor: colors.border,
                      }}
                      onPress={() => {
                        onSelect(outlet);
                        onClose();
                      }}
                    >
                      <Text style={{ fontWeight: '700', color: colors.text }}>
                        {outlet.name}
                      </Text>
                      <Text style={{ color: colors.textSecondary }}>
                        {outlet.address}
                      </Text>
                      <Text
                        style={{ color: colors.textSecondary, fontSize: 12 }}
                      >
                        {outlet.latitude}, {outlet.longitude}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            </>
          ) : (
            <View style={{ padding: 16 }}>
              <Text style={{ color: colors.textSecondary }}>
                Select a branch first.
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── Cycle Form Modal ─────────────────────────────────────────────────────────
// Per-cycle: pick a date+time, items, and optionally override the supplier.

function CycleFormModal({
  visible,
  onClose,
  onSave,
  orgItems,
  editing,
  defaultEmail,
  scheduleId,
  colors,
  schedule,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  orgItems: OrgItem[];
  editing: Cycle | null;
  defaultEmail: string;
  scheduleId: number;
  colors: any;
  schedule?: Schedule;
}) {
  const s = useStyles(colors);
  const [date, setDate] = useState(new Date());
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);
  const [period, setPeriod] = useState<'AM' | 'PM'>('AM');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [branchPickerOpen, setBranchPickerOpen] = useState(false);
  const [outletPickerOpen, setOutletPickerOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [selectedOutlet, setSelectedOutlet] = useState<Outlet | null>(null);
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [selectedItems, setSelectedItems] = useState<
    { itemId: number; quantity: number }[]
  >([]);
  const [contactPickerOpen, setContactPickerOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [itemPickerOpen, setItemPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function midnight(d: Date) {
    const m = new Date(d);
    m.setHours(0, 0, 0, 0);
    return m;
  }

  const getInitialDate = (): Date => {
    if (editing) {
      return midnight(new Date(editing.scheduledAt));
    }

    const now = new Date();
    // For new cycles, calculate based on schedule's dayOfWeek (if weekly/monthly)
    if (schedule) {
      const today = midnight(now);

      if (
        schedule.recurrence === 'weekly' &&
        schedule.dayOfWeek !== undefined
      ) {
        // Find the next occurrence of the selected day of week
        const currentDow = today.getDay();
        const targetDow = schedule.dayOfWeek;
        let daysUntil = targetDow - currentDow;
        if (daysUntil < 0) daysUntil += 7;

        const nextDate = new Date(today);
        nextDate.setDate(nextDate.getDate() + daysUntil);
        return nextDate;
      }
    }

    return midnight(now);
  };

  useEffect(() => {
    if (!visible) return;
    if (editing) {
      const d = new Date(editing.scheduledAt);
      setDate(midnight(d));
      const rawHour = d.getHours();
      const p: 'AM' | 'PM' = rawHour >= 12 ? 'PM' : 'AM';
      setHour(rawHour % 12 || 12);
      setMinute(d.getMinutes());
      setPeriod(p);
      setEmailRecipient(editing.emailRecipient);
      setEmailSubject(editing.emailSubject || '');
      setEmailBody(editing.emailBody || '');
      setSelectedBranch(editing.branch || null);
      setSelectedOutlet(editing.outlet || null);
      setAddress(editing.address ?? editing.outlet?.address ?? '');
      setLatitude(
        editing.latitude != null
          ? String(editing.latitude)
          : editing.outlet?.latitude != null
            ? String(editing.outlet.latitude)
            : '',
      );
      setLongitude(
        editing.longitude != null
          ? String(editing.longitude)
          : editing.outlet?.longitude != null
            ? String(editing.outlet.longitude)
            : '',
      );
      setSelectedItems(
        editing.cycleItems.map((ci) => ({
          itemId: ci.itemId,
          quantity: ci.quantity,
        })),
      );
    } else {
      const now = new Date();
      const initialDate = getInitialDate();
      setDate(initialDate);
      const rawHour = now.getHours();
      setHour(rawHour % 12 || 12);
      setMinute(0);
      setPeriod(rawHour >= 12 ? 'PM' : 'AM');
      setEmailRecipient(defaultEmail);
      setEmailSubject('');
      setEmailBody('');
      setSelectedBranch(schedule?.branch || null);
      setSelectedOutlet(schedule?.outlet || null);
      setAddress(schedule?.address || schedule?.outlet?.address || '');
      setLatitude(
        schedule?.latitude != null
          ? String(schedule.latitude)
          : schedule?.outlet?.latitude != null
            ? String(schedule.outlet.latitude)
            : '',
      );
      setLongitude(
        schedule?.longitude != null
          ? String(schedule.longitude)
          : schedule?.outlet?.longitude != null
            ? String(schedule.outlet.longitude)
            : '',
      );
      setSelectedItems([]);
    }
    setError('');
  }, [visible, editing, defaultEmail, schedule]);

  const scheduledAtISO = useMemo(() => {
    let h = hour % 12;
    if (period === 'PM') h += 12;
    const d = new Date(date);
    d.setHours(h, minute, 0, 0);
    return d.toISOString();
  }, [date, hour, minute, period]);

  const isPast = new Date(scheduledAtISO) <= new Date();

  const handleSave = async () => {
    if (!emailRecipient.trim()) {
      setError('Supplier email is required.');
      return;
    }
    if (selectedItems.length === 0) {
      setError('Select at least one item.');
      return;
    }
    if (selectedItems.some((i) => i.quantity <= 0)) {
      setError('All items must have quantity > 0.');
      return;
    }
    if (isPast && !editing?.firedAt) {
      setError('Scheduled time must be in the future.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave({
        scheduleId,
        scheduledAt: scheduledAtISO,
        branchId: selectedBranch?.id ?? null,
        outletId: selectedOutlet?.id ?? null,
        address: address.trim() || null,
        latitude: latitude ? Number(latitude) : null,
        longitude: longitude ? Number(longitude) : null,
        emailRecipient: emailRecipient.trim(),
        emailSubject: emailSubject.trim() || null,
        emailBody: emailBody.trim() || null,
        items: selectedItems,
      });
      onClose();
    } catch (e: any) {
      setError(e.message || 'Failed to save cycle.');
    } finally {
      setSaving(false);
    }
  };

  const selectedItemDetails = selectedItems
    .map((si) => ({ ...si, item: orgItems.find((o) => o.id === si.itemId) }))
    .filter((si) => si.item);

  const isFired = !!editing?.firedAt;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={[s.modalHeader, { backgroundColor: colors.primary }]}>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15 }}>
              Cancel
            </Text>
          </TouchableOpacity>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
            {isFired ? 'View Cycle' : editing ? 'Edit Cycle' : 'Add Cycle'}
          </Text>
          <PackagePlus color={colors.text} />
          {isFired && <View style={{ width: 48 }} />}
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
          keyboardShouldPersistTaps="handled"
        >
          {isFired && (
            <View
              style={{
                backgroundColor: '#D1FAE510',
                borderWidth: 1,
                borderColor: '#065F4630',
                borderRadius: 12,
                padding: 12,
                marginBottom: 16,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Text style={{ fontSize: 18 }}>✅</Text>
              <Text
                style={{ fontSize: 13, color: colors.text, fontWeight: '600' }}
              >
                This cycle already fired on {formatCycleDate(editing!.firedAt!)}
              </Text>
            </View>
          )}

          {/* ── Date picker ── */}
          <Text style={s.sectionLabel}>Date & Time</Text>
          <TouchableOpacity
            style={[
              s.dateBtn,
              {
                marginBottom: 14,
                borderColor: isPast && !isFired ? colors.error : colors.border,
              },
            ]}
            onPress={() => !isFired && setShowDatePicker(true)}
          >
            <Text
              style={{ fontSize: 15, fontWeight: '600', color: colors.text }}
            >
              {date.toLocaleDateString('en-PH', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
            <Text style={{ fontSize: 11, color: colors.textSecondary }}>
              {date.toLocaleDateString('en-PH', { weekday: 'long' })}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              minimumDate={midnight(new Date())}
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              onChange={(_, d) => {
                setShowDatePicker(Platform.OS === 'ios');
                if (d) setDate(midnight(d));
              }}
            />
          )}

          {!isFired && (
            <TouchableOpacity
              style={{
                backgroundColor: colors.accent + '15',
                borderWidth: 1,
                borderColor: colors.accent + '40',
                borderRadius: 10,
                padding: 12,
                marginBottom: 14,
                alignItems: 'center',
              }}
              onPress={() => {
                const nextDate = new Date(date);
                if (schedule?.recurrence === 'weekly') {
                  nextDate.setDate(nextDate.getDate() + 7);
                } else if (schedule?.recurrence === 'daily') {
                  nextDate.setDate(nextDate.getDate() + 1);
                } else if (schedule?.recurrence === 'monthly') {
                  nextDate.setDate(nextDate.getDate() + 30);
                }

                // Don't go over end date if set
                if (schedule?.endDate) {
                  const endDate = new Date(schedule.endDate);
                  endDate.setHours(23, 59, 59, 999);
                  if (nextDate > endDate) {
                    setError('Cannot schedule beyond the end date.');
                    return;
                  }
                }

                setDate(midnight(nextDate));
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '700',
                  color: colors.accent,
                }}
              >
                📅 Schedule Next Week
              </Text>
            </TouchableOpacity>
          )}

          {!isFired && (
            <View style={{ marginBottom: 16 }}>
              <Text style={s.label}>Time to send</Text>
              <TimeSelector
                hour={hour}
                minute={minute}
                period={period}
                onChange={(h, m, p) => {
                  setHour(h);
                  setMinute(m);
                  setPeriod(p);
                }}
                colors={colors}
              />
              {isPast && (
                <Text
                  style={{ fontSize: 12, color: colors.error, marginTop: 6 }}
                >
                  ⚠ This time is in the past
                </Text>
              )}
            </View>
          )}

          {isFired && (
            <View
              style={{
                marginBottom: 16,
                padding: 12,
                backgroundColor: colors.surface,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                Fired at
              </Text>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: '700',
                  color: colors.text,
                  marginTop: 2,
                }}
              >
                {formatCycleDate(editing!.scheduledAt)} at{' '}
                {formatCycleTime(editing!.scheduledAt)}
              </Text>
            </View>
          )}

          <View
            style={{
              height: 1,
              backgroundColor: colors.border,
              marginVertical: 8,
            }}
          />

          {/* ── Supplier ── */}
          <View style={s.formGroup}>
            <Text style={s.label}>Supplier email *</Text>
            <TouchableOpacity
              style={[
                s.input,
                {
                  justifyContent: 'center',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                },
                isFired && { opacity: 0.6 },
                emailRecipient ? { borderColor: '#0EA5E9' } : {},
              ]}
              onPress={() => !isFired && setContactPickerOpen(true)}
              disabled={isFired}
            >
              <AtSign
                size={14}
                color={emailRecipient ? '#0EA5E9' : colors.textSecondary}
                strokeWidth={2}
              />
              <Text
                style={{
                  flex: 1,
                  fontSize: 14,
                  color: emailRecipient ? colors.text : colors.textSecondary,
                }}
                numberOfLines={1}
              >
                {emailRecipient
                  ? selectedContact
                    ? `${selectedContact.label} · ${emailRecipient}`
                    : emailRecipient
                  : 'Tap to choose or type email…'}
              </Text>
              {!isFired && emailRecipient ? (
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    setEmailRecipient('');
                    setSelectedContact(null);
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <X size={14} color={colors.textSecondary} strokeWidth={2} />
                </TouchableOpacity>
              ) : null}
            </TouchableOpacity>
          </View>

          <ContactPickerModal
            visible={contactPickerOpen}
            onClose={() => setContactPickerOpen(false)}
            onConfirm={(email, contact) => {
              setEmailRecipient(email);
              setSelectedContact(contact ?? null);
            }}
            defaultEmail={emailRecipient}
            branchId={selectedBranch?.id ?? null}
            orgId={1} // TODO: replace with real orgId from auth context
            colors={colors}
          />
          <View style={s.formGroup}>
            <Text style={s.label}>Email subject (optional)</Text>
            <TextInput
              style={[
                s.input,
                { color: colors.text },
                isFired && { opacity: 0.6 },
              ]}
              placeholder="Re-order for Week 1"
              placeholderTextColor={colors.textSecondary}
              value={emailSubject}
              onChangeText={setEmailSubject}
              editable={!isFired}
            />
          </View>
          <View style={s.formGroup}>
            <Text style={s.label}>Message to supplier (optional)</Text>
            <TextInput
              style={[
                s.input,
                {
                  color: colors.text,
                  minHeight: 80,
                  textAlignVertical: 'top',
                  paddingTop: 12,
                },
                isFired && { opacity: 0.6 },
              ]}
              placeholder="Please deliver to main branch..."
              placeholderTextColor={colors.textSecondary}
              value={emailBody}
              onChangeText={setEmailBody}
              multiline
              editable={!isFired}
            />
          </View>

          <View
            style={{
              height: 1,
              backgroundColor: colors.border,
              marginVertical: 8,
            }}
          />

          <Text style={[s.sectionLabel, { marginTop: 10 }]}>Location</Text>
          <View style={s.formGroup}>
            <Text style={s.label}>Branch</Text>
            <TouchableOpacity
              style={[s.input, { justifyContent: 'center' }]}
              onPress={() => setBranchPickerOpen(true)}
              disabled={isFired}
            >
              <Text
                style={{
                  color: selectedBranch ? colors.text : colors.textSecondary,
                }}
              >
                {selectedBranch
                  ? `${selectedBranch.name} · ${selectedBranch.address}`
                  : 'Select branch'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={s.formGroup}>
            <Text style={s.label}>Outlet</Text>
            <TouchableOpacity
              style={[
                s.input,
                { justifyContent: 'center', opacity: selectedBranch ? 1 : 0.6 },
              ]}
              onPress={() => selectedBranch && setOutletPickerOpen(true)}
              disabled={!selectedBranch || isFired}
            >
              <Text
                style={{
                  color: selectedOutlet ? colors.text : colors.textSecondary,
                }}
              >
                {selectedOutlet
                  ? `${selectedOutlet.name} · ${selectedOutlet.address}`
                  : 'Select outlet'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={s.formGroup}>
            <Text style={s.label}>Address</Text>
            <TextInput
              style={[s.input, { color: colors.text }]}
              placeholder="Delivery address"
              placeholderTextColor={colors.textSecondary}
              value={address}
              onChangeText={setAddress}
              editable={!isFired}
            />
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Latitude</Text>
              <TextInput
                style={[s.input, { color: colors.text }]}
                placeholder="0.000000"
                placeholderTextColor={colors.textSecondary}
                value={latitude}
                onChangeText={setLatitude}
                keyboardType="numeric"
                editable={!isFired}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Longitude</Text>
              <TextInput
                style={[s.input, { color: colors.text }]}
                placeholder="0.000000"
                placeholderTextColor={colors.textSecondary}
                value={longitude}
                onChangeText={setLongitude}
                keyboardType="numeric"
                editable={!isFired}
              />
            </View>
          </View>

          <BranchPickerModal
            visible={branchPickerOpen}
            onClose={() => setBranchPickerOpen(false)}
            onSelect={(branch) => {
              setSelectedBranch(branch);
              setSelectedOutlet(null);
              setAddress(branch.address || '');
              setLatitude('');
              setLongitude('');
            }}
          />
          <OutletPickerModal
            visible={outletPickerOpen}
            branchId={selectedBranch?.id}
            onClose={() => setOutletPickerOpen(false)}
            onSelect={(outlet) => {
              setSelectedOutlet(outlet);
              setAddress(outlet.address);
              setLatitude(
                outlet.latitude != null ? String(outlet.latitude) : '',
              );
              setLongitude(
                outlet.longitude != null ? String(outlet.longitude) : '',
              );
            }}
          />

          {/* ── Items ── */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 10,
              marginTop: 8,
            }}
          >
            <Text style={s.sectionLabel}>Items for this Cycle</Text>
            {!isFired && (
              <TouchableOpacity
                style={[s.addItemBtn, { borderColor: colors.primary }]}
                onPress={() => setItemPickerOpen(true)}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '700',
                    color: colors.primary,
                  }}
                >
                  + Select Items
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {selectedItemDetails.length === 0 ? (
            <TouchableOpacity
              style={[s.emptyItemsBox, { borderColor: colors.border }]}
              onPress={() => !isFired && setItemPickerOpen(true)}
              disabled={isFired}
            >
              <Text
                style={{
                  fontSize: 13,
                  color: colors.textSecondary,
                  textAlign: 'center',
                }}
              >
                {isFired
                  ? 'No items recorded'
                  : 'Tap to select items to restock'}
              </Text>
            </TouchableOpacity>
          ) : (
            selectedItemDetails.map(({ itemId, quantity, item }) => (
              <View
                key={itemId}
                style={[s.selectedItemRow, { borderColor: colors.border }]}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '600',
                      color: colors.text,
                    }}
                  >
                    {item!.name}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                    Stock: {item!.stock} · Min: {item!.minQuantity}
                  </Text>
                </View>
                <View
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                >
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                    Qty:
                  </Text>
                  {isFired ? (
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '700',
                        color: colors.text,
                        minWidth: 40,
                        textAlign: 'center',
                      }}
                    >
                      {quantity}
                    </Text>
                  ) : (
                    <TextInput
                      style={[
                        s.qtyInput,
                        { color: colors.text, borderColor: colors.border },
                      ]}
                      value={quantity > 0 ? String(quantity) : ''}
                      onChangeText={(v) => {
                        const n = parseFloat(v) || 0;
                        setSelectedItems((prev) =>
                          prev.map((s) =>
                            s.itemId === itemId ? { ...s, quantity: n } : s,
                          ),
                        );
                      }}
                      keyboardType="decimal-pad"
                    />
                  )}
                  {!isFired && (
                    <TouchableOpacity
                      onPress={() =>
                        setSelectedItems((prev) =>
                          prev.filter((s) => s.itemId !== itemId),
                        )
                      }
                      style={{ padding: 4 }}
                    >
                      <Text style={{ fontSize: 16, color: colors.error }}>
                        ✕
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))
          )}

          {error ? (
            <View
              style={[
                s.errorBox,
                {
                  borderColor: colors.error,
                  backgroundColor: colors.error + '15',
                },
              ]}
            >
              <Text style={{ fontSize: 13, color: colors.error }}>{error}</Text>
            </View>
          ) : null}

          {!isFired && (
            <TouchableOpacity
              style={[
                s.saveBtn,
                { backgroundColor: colors.primary },
                saving && { opacity: 0.7 },
              ]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text
                  style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}
                >
                  {editing ? 'Update Cycle' : 'Add Cycle'}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </ScrollView>

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

// ─── Schedule Form Modal (unchanged, envelope only) ───────────────────────────

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
  orgItems: OrgItem[];
  editing: Schedule | null;
  colors: any;
}) {
  const s = useStyles(colors);
  const [recurrence, setRecurrence] = useState<Recurrence>('weekly');
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [scheduleResult, setScheduleResult] = useState<ScheduleResult | null>(
    null,
  );
  const [branchPickerOpen, setBranchPickerOpen] = useState(false);
  const [outletPickerOpen, setOutletPickerOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [selectedOutlet, setSelectedOutlet] = useState<Outlet | null>(null);
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [emailRecipient, setEmailRecipient] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [selectedItems, setSelectedItems] = useState<
    { itemId: number; quantity: number }[]
  >([]);
  const [itemPickerOpen, setItemPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [contactPickerOpen, setContactPickerOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  useEffect(() => {
    if (!visible) return;
    if (editing) {
      setRecurrence(editing.recurrence as Recurrence);
      setEmailRecipient(editing.emailRecipient || '');
      setEmailSubject(editing.emailSubject || '');
      setEmailBody(editing.emailBody || '');
      setSelectedItems(
        editing.scheduleItems.map((si) => ({
          itemId: si.itemId,
          quantity: si.quantity,
        })),
      );
      setSelectedBranch(editing.branch || null);
      setSelectedOutlet(editing.outlet || null);
      setAddress(editing.address || editing.outlet?.address || '');
      setLatitude(
        editing.latitude != null
          ? String(editing.latitude)
          : editing.outlet?.latitude != null
            ? String(editing.outlet.latitude)
            : '',
      );
      setLongitude(
        editing.longitude != null
          ? String(editing.longitude)
          : editing.outlet?.longitude != null
            ? String(editing.outlet.longitude)
            : '',
      );
      setScheduleResult(null);
    } else {
      setSelectedBranch(null);
      setSelectedOutlet(null);
      setAddress('');
      setLatitude('');
      setLongitude('');
      setRecurrence('weekly');
      setEmailRecipient('');
      setEmailSubject('');
      setEmailBody('');
      setSelectedItems([]);
      setScheduleResult(null);
    }
    setError('');
  }, [visible, editing]);

  const scheduleSummary = useMemo(() => {
    if (!scheduleResult)
      return editing
        ? `${editing.recurrence} · tap to change`
        : 'Tap to set recurrence';
    const r = scheduleResult;
    switch (r.recurrence) {
      case 'once':
        return r.onceDate
          ? `${r.onceDate.toLocaleDateString()} at ${r.onceHour}:${String(r.onceMinute ?? 0).padStart(2, '0')} ${r.oncePeriod}`
          : 'Send immediately';
      case 'daily':
        return `${r.dailyDays?.length ?? 0} days scheduled`;
      case 'weekly':
        return `Every ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][r.weeklyDayOfWeek ?? 0]}`;
      case 'monthly':
        return `Monthly on day ${r.monthlyDayOfMonth}`;
      case 'custom':
        return `${r.customDays?.length ?? 0} custom dates`;
      default:
        return '';
    }
  }, [scheduleResult, editing]);

  const RECURRENCE_OPTIONS: { key: Recurrence; label: string }[] = [
    { key: 'once', label: 'Once' },
    { key: 'daily', label: 'Daily' },
    { key: 'weekly', label: 'Weekly' },
    { key: 'monthly', label: 'Monthly' },
    { key: 'custom', label: 'Custom' },
  ];

  const handleSave = async () => {
    if (!emailRecipient.trim()) {
      setError('Default supplier email is required.');
      return;
    }
    // if I edit the schedule but not the cycle, it will setError, but I want to get past this error I'm only changing the schedule pattern and the default supplier email, not the cycle item delivery. Fix this please.
    if (selectedItems.length === 0 && editing?.scheduleItems.length === 0) {
      setError('Select at least one default item.');
      return;
    }
    if (!scheduleResult && !editing) {
      setError('Set the recurrence pattern.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const datePayload = scheduleResult
        ? scheduleToPrismaInput(scheduleResult)
        : {
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
        branchId: selectedBranch?.id ?? null,
        outletId: selectedOutlet?.id ?? null,
        address: address.trim() || null,
        latitude: latitude ? Number(latitude) : null,
        longitude: longitude ? Number(longitude) : null,
        emailRecipient: emailRecipient.trim(),
        emailSubject: emailSubject.trim() || null,
        emailBody: emailBody.trim() || null,
      });
      onClose();
    } catch (e: any) {
      setError(e.message || 'Failed to save schedule.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={[s.modalHeader, { backgroundColor: colors.primary }]}>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15 }}>
              Cancel
            </Text>
          </TouchableOpacity>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
            {editing ? 'Edit Schedule' : 'New Re-order Schedule'}
          </Text>
          <PackagePlus color={colors.text} />
        </View>
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Info banner */}
          <View
            style={{
              backgroundColor: colors.primary + '12',
              borderWidth: 1,
              borderColor: colors.primary + '30',
              borderRadius: 12,
              padding: 12,
              marginBottom: 16,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: colors.primary,
                marginBottom: 4,
              }}
            >
              📋 SCHEDULE = TEMPLATE
            </Text>
            <Text style={{ fontSize: 12, color: colors.text, lineHeight: 18 }}>
              The schedule is your default template. After saving, add
              individual Cycles — each cycle can have different items,
              quantities, and a different supplier.
            </Text>
          </View>

          <Text style={s.sectionLabel}>Recurrence Pattern</Text>
          <View
            style={{
              flexDirection: 'row',
              gap: 8,
              marginBottom: 14,
              flexWrap: 'wrap',
            }}
          >
            {RECURRENCE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={[
                  s.recurrencePill,
                  recurrence === opt.key && {
                    backgroundColor: colors.primary,
                    borderColor: colors.primary,
                  },
                ]}
                onPress={() => {
                  setRecurrence(opt.key);
                  setScheduleResult(null);
                }}
              >
                <Text
                  style={[
                    { fontSize: 13, fontWeight: '700', color: colors.text },
                    recurrence === opt.key && { color: '#fff' },
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

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
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: scheduleResult ? colors.text : colors.textSecondary,
                }}
              >
                {scheduleSummary}
              </Text>
              <Text
                style={{
                  fontSize: 11,
                  color: colors.textSecondary,
                  marginTop: 2,
                }}
              >
                Tap to {scheduleResult ? 'change' : 'set'} schedule
              </Text>
            </View>
            <Text style={{ fontSize: 18, color: colors.primary }}>›</Text>
          </TouchableOpacity>

          <View
            style={{
              height: 1,
              backgroundColor: colors.border,
              marginVertical: 4,
            }}
          />
          <Text style={[s.sectionLabel, { marginTop: 12 }]}>
            Default Supplier
          </Text>
          <View style={s.formGroup}>
            <Text style={s.label}>Default supplier email *</Text>
            <TouchableOpacity
              style={[
                s.input,
                {
                  justifyContent: 'center',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                },
                emailRecipient ? { borderColor: '#0EA5E9' } : {},
              ]}
              onPress={() => setContactPickerOpen(true)}
            >
              <AtSign
                size={14}
                color={emailRecipient ? '#0EA5E9' : colors.textSecondary}
                strokeWidth={2}
              />
              <Text
                style={{
                  flex: 1,
                  fontSize: 14,
                  color: emailRecipient ? colors.text : colors.textSecondary,
                }}
                numberOfLines={1}
              >
                {emailRecipient
                  ? selectedContact
                    ? `${selectedContact.label} · ${emailRecipient}`
                    : emailRecipient
                  : 'Tap to choose or type email…'}
              </Text>
              {emailRecipient ? (
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    setEmailRecipient('');
                    setSelectedContact(null);
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <X size={14} color={colors.textSecondary} strokeWidth={2} />
                </TouchableOpacity>
              ) : null}
            </TouchableOpacity>
          </View>

          <ContactPickerModal
            visible={contactPickerOpen}
            onClose={() => setContactPickerOpen(false)}
            onConfirm={(email, contact) => {
              setEmailRecipient(email);
              setSelectedContact(contact ?? null);
            }}
            defaultEmail={emailRecipient}
            branchId={selectedBranch?.id ?? null}
            orgId={1} // TODO: replace with real orgId from auth context
            colors={colors}
          />

          <Text style={[s.sectionLabel, { marginTop: 12 }]}>
            Location (Default)
          </Text>
          <View style={s.formGroup}>
            <Text style={s.label}>Branch</Text>
            <TouchableOpacity
              style={[s.input, { justifyContent: 'center' }]}
              onPress={() => setBranchPickerOpen(true)}
            >
              <Text
                style={{
                  color: selectedBranch ? colors.text : colors.textSecondary,
                }}
              >
                {selectedBranch
                  ? `${selectedBranch.name} · ${selectedBranch.address}`
                  : 'Select branch'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={s.formGroup}>
            <Text style={s.label}>Outlet</Text>
            <TouchableOpacity
              style={[
                s.input,
                { justifyContent: 'center', opacity: selectedBranch ? 1 : 0.6 },
              ]}
              onPress={() => selectedBranch && setOutletPickerOpen(true)}
              disabled={!selectedBranch}
            >
              <Text
                style={{
                  color: selectedOutlet ? colors.text : colors.textSecondary,
                }}
              >
                {selectedOutlet
                  ? `${selectedOutlet.name} · ${selectedOutlet.address}`
                  : 'Select outlet'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={s.formGroup}>
            <Text style={s.label}>Address</Text>
            <TextInput
              style={[s.input, { color: colors.text }]}
              placeholder="Delivery address"
              placeholderTextColor={colors.textSecondary}
              value={address}
              onChangeText={setAddress}
            />
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Latitude</Text>
              <TextInput
                style={[s.input, { color: colors.text }]}
                placeholder="0.000000"
                placeholderTextColor={colors.textSecondary}
                value={latitude}
                onChangeText={setLatitude}
                keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Longitude</Text>
              <TextInput
                style={[s.input, { color: colors.text }]}
                placeholder="0.000000"
                placeholderTextColor={colors.textSecondary}
                value={longitude}
                onChangeText={setLongitude}
                keyboardType="numeric"
              />
            </View>
          </View>

          <BranchPickerModal
            visible={branchPickerOpen}
            onClose={() => setBranchPickerOpen(false)}
            onSelect={(branch) => {
              setSelectedBranch(branch);
              setSelectedOutlet(null);
              setAddress(branch.address || '');
              setLatitude('');
              setLongitude('');
            }}
          />
          <OutletPickerModal
            visible={outletPickerOpen}
            branchId={selectedBranch?.id}
            onClose={() => setOutletPickerOpen(false)}
            onSelect={(outlet) => {
              setSelectedOutlet(outlet);
              setAddress(outlet.address);
              setLatitude(
                outlet.latitude != null ? String(outlet.latitude) : '',
              );
              setLongitude(
                outlet.longitude != null ? String(outlet.longitude) : '',
              );
            }}
          />

          {error ? (
            <View
              style={[
                s.errorBox,
                {
                  borderColor: colors.error,
                  backgroundColor: colors.error + '15',
                },
              ]}
            >
              <Text style={{ fontSize: 13, color: colors.error }}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[
              s.saveBtn,
              { backgroundColor: colors.primary },
              saving && { opacity: 0.7 },
            ]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
                {editing ? 'Update Schedule' : 'Create Schedule'}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>

        <RestockDatePickerModal
          visible={datePickerOpen}
          recurrence={recurrence}
          onClose={() => setDatePickerOpen(false)}
          onConfirm={(result) => {
            setScheduleResult(result);
            setDatePickerOpen(false);
          }}
        />
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

function MarkReceivedModal({
  visible,
  cycle,
  onClose,
  onSaved,
  colors,
}: {
  visible: boolean;
  cycle: Cycle | null;
  onClose: () => void;
  onSaved: () => void;
  colors: any;
}) {
  const [quantities, setQuantities] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    if (!cycle) return;
    const initial: Record<number, string> = {};
    cycle.cycleItems.forEach((ci) => {
      initial[ci.id] = String(ci.quantity);
    });
    setQuantities(initial);
  }, [cycle]);

  const handleSave = async () => {
    if (!cycle) return;
    const supplierOrder = cycle.supplierOrders?.[0];
    if (!supplierOrder) {
      setError('No supplier order found for this cycle');
      return;
    }
    setSaving(true);
    try {
      const MUTATION = gql`
        mutation ReceivePurchaseOrder(
          $supplierOrderId: Int!
          $items: [ReceivePurchaseOrderItemInput!]!
        ) {
          receivePurchaseOrder(
            supplierOrderId: $supplierOrderId
            items: $items
          ) {
            id
            status
          }
        }
      `;
      const { accessToken } = await AuthService.getTokens();
      const client = await getGraphQLClient();
      await client.request(
        MUTATION,
        {
          supplierOrderId: supplierOrder.id,
          items: supplierOrder.items.map((item: any) => ({
            supplierOrderItemId: item.id,
            confirmedQty: parseFloat(quantities[item.id] || '0'),
          })),
        },
        { Authorization: `Bearer ${accessToken}` },
      );

      onSaved();
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Failed to mark as received');
    } finally {
      setSaving(false);
    }
  };

  if (!cycle) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'flex-end',
        }}
      >
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={1}
          onPress={onClose}
        />
        <View
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            maxHeight: '80%',
          }}
        >
          <View
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: colors.border,
              alignSelf: 'center',
              marginTop: 12,
            }}
          />
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 20,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <Text
              style={{ fontSize: 16, fontWeight: '800', color: colors.text }}
            >
              Mark as Received
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={20} color={colors.textSecondary} strokeWidth={2} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <Text
              style={{
                fontSize: 13,
                color: colors.textSecondary,
                marginBottom: 16,
              }}
            >
              Confirm the actual quantities received from the supplier.
            </Text>
            {cycle.cycleItems.map((ci) => (
              <View key={ci.id} style={{ marginBottom: 14 }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: colors.text,
                    marginBottom: 6,
                  }}
                >
                  {ci.item.name}
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                    Requested: {ci.quantity}
                  </Text>
                  <TextInput
                    style={{
                      flex: 1,
                      borderWidth: 1,
                      borderRadius: 8,
                      borderColor: colors.border,
                      backgroundColor: colors.background,
                      color: colors.text,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      fontSize: 14,
                    }}
                    placeholder="Confirmed qty"
                    placeholderTextColor={colors.textSecondary}
                    value={quantities[ci.id] ?? ''}
                    onChangeText={(v) =>
                      setQuantities((prev) => ({ ...prev, [ci.id]: v }))
                    }
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
            ))}
            {error ? (
              <Text
                style={{ fontSize: 12, color: colors.error, marginBottom: 8 }}
              >
                {error}
              </Text>
            ) : null}
            <TouchableOpacity
              style={{
                backgroundColor: colors.primary,
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: 'center',
                opacity: saving ? 0.7 : 1,
              }}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
                {saving ? 'Saving…' : 'Confirm Receipt'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
// ─── Cycle Calendar Strip ─────────────────────────────────────────────────────
// A horizontal scrollable list of cycles for a schedule.

function CycleCalendarStrip({
  schedule,
  onAddCycle,
  onEditCycle,
  onDeleteCycle,
  onToggleCycle,
  onMarkReceived,
  colors,
}: {
  schedule: Schedule;
  onAddCycle: () => void;
  onEditCycle: (cycle: Cycle) => void;
  onMarkReceived: (cycle: Cycle) => void;
  onDeleteCycle: (cycle: Cycle) => void;
  onToggleCycle: (cycle: Cycle) => void;
  colors: any;
}) {
  const sorted = [...schedule.cycles].sort(
    (a, b) =>
      new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
  );

  return (
    <View style={{ marginTop: 10 }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
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
          CYCLES ({sorted.length})
        </Text>
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            backgroundColor: colors.accent + '18',
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderWidth: 1,
            borderColor: colors.accent + '40',
          }}
          onPress={onAddCycle}
        >
          <Text
            style={{ fontSize: 13, color: colors.accent, fontWeight: '700' }}
          >
            + Add Cycle
          </Text>
        </TouchableOpacity>
      </View>

      {sorted.length === 0 ? (
        <TouchableOpacity
          style={{
            borderWidth: 1.5,
            borderStyle: 'dashed',
            borderColor: colors.border,
            borderRadius: 12,
            padding: 16,
            alignItems: 'center',
          }}
          onPress={onAddCycle}
        >
          <Text
            style={{
              fontSize: 12,
              color: colors.textSecondary,
              textAlign: 'center',
            }}
          >
            No cycles yet. Tap + Add Cycle to schedule a specific order.
          </Text>
        </TouchableOpacity>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {sorted.map((cycle, idx) => {
            const fired = !!cycle.firedAt;
            const past = !fired && new Date(cycle.scheduledAt) < new Date();
            const d = new Date(cycle.scheduledAt);
            const month = MONTHS_SHORT[d.getMonth()];
            const day = d.getDate();
            const time = d.toLocaleTimeString('en-PH', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            });

            const borderColor = fired
              ? '#10B981'
              : past
                ? colors.error
                : cycle.isActive
                  ? colors.primary
                  : colors.border;

            return (
              <TouchableOpacity
                key={cycle.id}
                onPress={() => onEditCycle(cycle)}
                style={{
                  width: 110,
                  backgroundColor: colors.surface,
                  borderRadius: 12,
                  borderWidth: 1.5,
                  borderColor,
                  padding: 10,
                  opacity: cycle.isActive ? 1 : 0.55,
                }}
              >
                {/* Status dot */}
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 6,
                  }}
                >
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: fired
                        ? '#10B981'
                        : past
                          ? colors.error
                          : cycle.isActive
                            ? colors.primary
                            : colors.textSecondary,
                    }}
                  />
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      onDeleteCycle(cycle);
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                      ✕
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Date */}
                <Text
                  style={{
                    fontSize: 11,
                    color: colors.textSecondary,
                    fontWeight: '600',
                  }}
                >
                  {month}
                </Text>
                <Text
                  style={{
                    fontSize: 22,
                    fontWeight: '900',
                    color: fired ? '#10B981' : colors.text,
                    lineHeight: 26,
                  }}
                >
                  {day}
                </Text>
                <Text
                  style={{
                    fontSize: 10,
                    color: colors.textSecondary,
                    marginBottom: 6,
                  }}
                >
                  {time}
                </Text>

                {/* Items summary */}
                <Text
                  style={{ fontSize: 10, color: colors.textSecondary }}
                  numberOfLines={2}
                >
                  {cycle.cycleItems.length === 0
                    ? 'No items'
                    : cycle.cycleItems
                        .slice(0, 2)
                        .map((ci) => ci.item.name)
                        .join(', ') +
                      (cycle.cycleItems.length > 2
                        ? ` +${cycle.cycleItems.length - 2}`
                        : '')}
                </Text>

                {/* Fired badge */}
                {fired && (
                  <View
                    style={{
                      marginTop: 6,
                      backgroundColor: '#10B98120',
                      borderRadius: 6,
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      alignSelf: 'flex-start',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 9,
                        fontWeight: '800',
                        color: '#10B981',
                      }}
                    >
                      SENT
                    </Text>
                    {fired &&
                      !cycle.supplierOrders?.find(
                        (o) => o.status === 'delivered',
                      ) && (
                        <TouchableOpacity
                          style={{
                            marginTop: 6,
                            backgroundColor: colors.primary + '18',
                            borderRadius: 6,
                            paddingHorizontal: 6,
                            paddingVertical: 3,
                            borderWidth: 1,
                            borderColor: colors.primary,
                          }}
                          onPress={(e) => {
                            e.stopPropagation();
                            onMarkReceived(cycle);
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 9,
                              fontWeight: '800',
                              color: colors.primary,
                            }}
                          >
                            RECEIVE
                          </Text>
                        </TouchableOpacity>
                      )}
                  </View>
                )}
                {!fired && past && (
                  <View
                    style={{
                      marginTop: 6,
                      backgroundColor: colors.error + '20',
                      borderRadius: 6,
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      alignSelf: 'flex-start',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 9,
                        fontWeight: '800',
                        color: colors.error,
                      }}
                    >
                      MISSED
                    </Text>
                  </View>
                )}
                {!fired && !past && !cycle.isActive && (
                  <View
                    style={{
                      marginTop: 6,
                      backgroundColor: colors.border,
                      borderRadius: 6,
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      alignSelf: 'flex-start',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 9,
                        fontWeight: '800',
                        color: colors.textSecondary,
                      }}
                    >
                      PAUSED
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}

          {/* Add new cycle button at end of strip */}
          <TouchableOpacity
            onPress={onAddCycle}
            style={{
              width: 110,
              height: '100%',
              minHeight: 120,
              backgroundColor: colors.surface,
              borderRadius: 12,
              borderWidth: 1.5,
              borderStyle: 'dashed',
              borderColor: colors.accent + '60',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
            }}
          >
            <Text style={{ fontSize: 24, color: colors.accent }}>+</Text>
            <Text
              style={{
                fontSize: 10,
                color: colors.accent,
                fontWeight: '700',
                textAlign: 'center',
              }}
            >
              Add Cycle
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

// ─── Schedule Card ─────────────────────────────────────────────────────────────

function ScheduleCard({
  schedule,
  onEdit,
  onDelete,
  onAddCycle,
  onEditCycle,
  onMarkReceived,
  onDeleteCycle,
  onToggleCycle,
  colors,
}: {
  schedule: Schedule;
  onEdit: () => void;
  onDelete: () => void;
  onAddCycle: () => void;
  onEditCycle: (cycle: Cycle) => void;
  onMarkReceived: (cycle: Cycle) => void;
  onDeleteCycle: (cycle: Cycle) => void;
  onToggleCycle: (cycle: Cycle) => void;
  colors: any;
}) {
  const s = useStyles(colors);
  const [expanded, setExpanded] = useState(true);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const recurrenceColor: Record<Recurrence, string> = {
    once: colors.textSecondary,
    daily: colors.primary,
    weekly: colors.accent,
    monthly: '#10B981',
    custom: '#8B5CF6',
  };

  const activeCycles = schedule.cycles.filter(
    (c) => c.isActive && !c.firedAt,
  ).length;
  const firedCycles = schedule.cycles.filter((c) => c.firedAt).length;

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }]}>
      <View style={[s.card, !schedule.isActive && { opacity: 0.55 }]}>
        {/* Top row */}
        <Pressable
          onPress={() => setExpanded((e) => !e)}
          onPressIn={() =>
            Animated.spring(scaleAnim, {
              toValue: 0.98,
              useNativeDriver: true,
              speed: 50,
            }).start()
          }
          onPressOut={() =>
            Animated.spring(scaleAnim, {
              toValue: 1,
              useNativeDriver: true,
              speed: 50,
            }).start()
          }
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: 10,
            }}
          >
            <View style={{ flex: 1, marginRight: 8 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 4,
                }}
              >
                <View
                  style={[
                    s.recurrenceBadge,
                    {
                      backgroundColor:
                        recurrenceColor[schedule.recurrence] + '20',
                      borderColor: recurrenceColor[schedule.recurrence],
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '700',
                      color: recurrenceColor[schedule.recurrence],
                    }}
                  >
                    {schedule.recurrence.toUpperCase()}
                  </Text>
                </View>
                {!schedule.isActive && (
                  <View
                    style={[
                      s.recurrenceBadge,
                      {
                        backgroundColor: colors.border,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '700',
                        color: colors.textSecondary,
                      }}
                    >
                      PAUSED
                    </Text>
                  </View>
                )}
              </View>
              <Text
                style={{ fontSize: 14, fontWeight: '700', color: colors.text }}
              >
                {formatRecurrence(schedule)}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: colors.textSecondary,
                  marginTop: 2,
                }}
              >
                Default → {schedule.emailRecipient}
              </Text>
            </View>
            <View
              style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}
            >
              <TouchableOpacity
                style={[s.iconBtn, { borderColor: colors.border }]}
                onPress={onEdit}
              >
                <Text style={{ fontSize: 13 }}>✏️</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  s.iconBtn,
                  {
                    borderColor: colors.error + '60',
                    backgroundColor: colors.error + '10',
                  },
                ]}
                onPress={onDelete}
              >
                <Text style={{ fontSize: 13 }}>🗑</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Cycle stats */}
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 4 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                backgroundColor: colors.primary + '12',
                borderRadius: 8,
                paddingHorizontal: 8,
                paddingVertical: 3,
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '700',
                  color: colors.primary,
                }}
              >
                {activeCycles} upcoming
              </Text>
            </View>
            {firedCycles > 0 && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  backgroundColor: '#10B98112',
                  borderRadius: 8,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                }}
              >
                <Text
                  style={{ fontSize: 11, fontWeight: '700', color: '#10B981' }}
                >
                  {firedCycles} sent
                </Text>
              </View>
            )}
            <View style={{ flex: 1 }} />
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>
              {expanded ? '▲' : '▼'}
            </Text>
          </View>
        </Pressable>

        {/* Cycle calendar (collapsible) */}
        {expanded && (
          <CycleCalendarStrip
            onMarkReceived={onMarkReceived}
            schedule={schedule}
            onAddCycle={onAddCycle}
            onEditCycle={onEditCycle}
            onDeleteCycle={onDeleteCycle}
            onToggleCycle={onToggleCycle}
            colors={colors}
          />
        )}

        {/* Footer */}
        {schedule.lastTriggeredAt && (
          <View
            style={{
              marginTop: 10,
              paddingTop: 10,
              borderTopWidth: 1,
              borderTopColor: colors.border,
            }}
          >
            <Text style={{ fontSize: 11, color: colors.textSecondary }}>
              Last sent:{' '}
              {new Date(schedule.lastTriggeredAt).toLocaleDateString('en-PH', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

// ─── Shared Styles ─────────────────────────────────────────────────────────────

function useStyles(colors: any) {
  return useMemo(
    () =>
      StyleSheet.create({
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
        dateBtn: {
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderRadius: 10,
          paddingHorizontal: 14,
          paddingVertical: 12,
        },
      }),
    [colors],
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function RestockSchedulerScreen() {
  const { colors } = useTheme();
  const s = useStyles(colors);

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [orgItems, setOrgItems] = useState<OrgItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Schedule form
  const [scheduleFormVisible, setScheduleFormVisible] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [markReceivedCycle, setMarkReceivedCycle] = useState<Cycle | null>(
    null,
  );

  // Pass to ScheduleCard → CycleCalendarStrip → cycle cards

  // Cycle form
  const [cycleFormVisible, setCycleFormVisible] = useState(false);
  const [cycleFormSchedule, setCycleFormSchedule] = useState<Schedule | null>(
    null,
  );
  const [editingCycle, setEditingCycle] = useState<Cycle | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [schedulesRes, itemsRes] = await Promise.all([
        graphQLRequest<{ getRestockSchedules: Schedule[] }>(
          GET_RESTOCK_SCHEDULES,
        ),
        InventoryService.getOrgItems('', 200),
      ]);
      setSchedules(schedulesRes.getRestockSchedules || []);
      setOrgItems(
        (itemsRes || []).map((it: any) => ({
          id: it.id,
          name: it.name,
          barcode: it.barcode || '',
          stock: Number(it.stock || 0),
          minQuantity: Number(it.minQuantity || 0),
        })),
      );
    } catch (e) {
      console.error('Failed to load restock data', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ── Schedule handlers ──

  const handleCreateSchedule = () => {
    setEditingSchedule(null);
    setScheduleFormVisible(true);
  };
  const handleEditSchedule = (s: Schedule) => {
    setEditingSchedule(s);
    setScheduleFormVisible(true);
  };

  const handleSaveSchedule = async (data: any) => {
    if (editingSchedule) {
      await graphQLRequest(UPDATE_RESTOCK_SCHEDULE, {
        id: editingSchedule.id,
        data,
      });
    } else {
      await graphQLRequest(CREATE_RESTOCK_SCHEDULE, { data });
    }
    await load();
  };

  const handleDeleteSchedule = (schedule: Schedule) => {
    Alert.alert(
      'Delete Schedule',
      `Remove this ${schedule.recurrence} restock schedule and all ${schedule.cycles.length} cycle(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await graphQLRequest(DELETE_RESTOCK_SCHEDULE, {
                id: schedule.id,
              });
              setSchedules((prev) => prev.filter((s) => s.id !== schedule.id));
            } catch {
              Alert.alert('Error', 'Failed to delete schedule.');
            }
          },
        },
      ],
    );
  };

  // ── Cycle handlers ──

  const handleAddCycle = (schedule: Schedule) => {
    setCycleFormSchedule(schedule);
    setEditingCycle(null);
    setCycleFormVisible(true);
  };

  const handleEditCycle = (schedule: Schedule, cycle: Cycle) => {
    setCycleFormSchedule(schedule);
    setEditingCycle(cycle);
    setCycleFormVisible(true);
  };

  const handleSaveCycle = async (data: any) => {
    if (editingCycle) {
      await graphQLRequest(UPDATE_RESTOCK_CYCLE, { id: editingCycle.id, data });
    } else {
      await graphQLRequest(CREATE_RESTOCK_CYCLE, { data });
    }
    await load();
  };

  const handleDeleteCycle = (cycle: Cycle) => {
    Alert.alert(
      'Delete Cycle',
      `Remove cycle scheduled for ${formatCycleDate(cycle.scheduledAt)}?${cycle.firedAt ? ' (already fired)' : ''}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await graphQLRequest(DELETE_RESTOCK_CYCLE, { id: cycle.id });
              await load();
            } catch {
              Alert.alert('Error', 'Failed to delete cycle.');
            }
          },
        },
      ],
    );
  };

  const handleToggleCycle = async (cycle: Cycle) => {
    try {
      await graphQLRequest(TOGGLE_RESTOCK_CYCLE, { id: cycle.id });
      await load();
    } catch {
      Alert.alert('Error', 'Failed to toggle cycle.');
    }
  };

  const activeSchedules = schedules.filter((s) => s.isActive).length;
  const totalCycles = schedules.reduce((sum, s) => sum + s.cycles.length, 0);
  const pendingCycles = schedules.reduce(
    (sum, s) => sum + s.cycles.filter((c) => !c.firedAt && c.isActive).length,
    0,
  );

  if (loading) {
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
        <Text
          style={{ marginTop: 12, color: colors.textSecondary, fontSize: 14 }}
        >
          Loading schedules...
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: colors.primary,
          paddingTop: Platform.OS === 'ios' ? 56 : 20,
          paddingBottom: 20,
          paddingHorizontal: 20,
        }}
      >
        <Text
          style={{
            color: 'rgba(255,255,255,0.7)',
            fontSize: 12,
            fontWeight: '600',
            letterSpacing: 1,
            marginBottom: 4,
          }}
        >
          INVENTORY MANAGEMENT
        </Text>
        <Text
          style={{
            color: '#fff',
            fontSize: 22,
            fontWeight: '800',
            marginBottom: 16,
          }}
        >
          Restock Scheduler
        </Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {[
            { label: 'Schedules', value: schedules.length, color: '#fff' },
            { label: 'Active', value: activeSchedules, color: '#6EE7B7' },
            { label: 'Pending Cycles', value: pendingCycles, color: '#FDE68A' },
          ].map((stat) => (
            <View
              key={stat.label}
              style={{
                flex: 1,
                backgroundColor: 'rgba(255,255,255,0.12)',
                borderRadius: 10,
                padding: 10,
                alignItems: 'center',
              }}
            >
              <Text
                style={{ fontSize: 20, fontWeight: '900', color: stat.color }}
              >
                {stat.value}
              </Text>
              <Text
                style={{
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.6)',
                  marginTop: 2,
                }}
              >
                {stat.label}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <FlatList
        data={schedules}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <Text style={{ fontSize: 40 }}>📦</Text>
            <Text
              style={{
                fontSize: 16,
                fontWeight: '700',
                color: colors.text,
                marginTop: 12,
              }}
            >
              No schedules yet
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: colors.textSecondary,
                marginTop: 4,
                textAlign: 'center',
              }}
            >
              Create a schedule, then add cycles — each cycle orders different
              items from different suppliers.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <ScheduleCard
            schedule={item}
            onMarkReceived={(cycle) => setMarkReceivedCycle(cycle)}
            onEdit={() => handleEditSchedule(item)}
            onDelete={() => handleDeleteSchedule(item)}
            onAddCycle={() => handleAddCycle(item)}
            onEditCycle={(cycle) => handleEditCycle(item, cycle)}
            onDeleteCycle={handleDeleteCycle}
            onToggleCycle={handleToggleCycle}
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
        onPress={handleCreateSchedule}
      >
        <Text
          style={{ color: '#fff', fontSize: 28, lineHeight: 32, marginTop: -2 }}
        >
          +
        </Text>
      </TouchableOpacity>

      {/* Schedule form modal */}
      <ScheduleFormModal
        visible={scheduleFormVisible}
        onClose={() => setScheduleFormVisible(false)}
        onSave={handleSaveSchedule}
        orgItems={orgItems}
        editing={editingSchedule}
        colors={colors}
      />
      <MarkReceivedModal
        visible={!!markReceivedCycle}
        cycle={markReceivedCycle}
        onClose={() => setMarkReceivedCycle(null)}
        onSaved={load}
        colors={colors}
      />
      {/* Cycle form modal */}
      <CycleFormModal
        visible={cycleFormVisible}
        onClose={() => setCycleFormVisible(false)}
        onSave={handleSaveCycle}
        orgItems={orgItems}
        editing={editingCycle}
        defaultEmail={cycleFormSchedule?.emailRecipient ?? ''}
        scheduleId={cycleFormSchedule?.id ?? 0}
        schedule={cycleFormSchedule ?? undefined}
        colors={colors}
      />
    </View>
  );
}
