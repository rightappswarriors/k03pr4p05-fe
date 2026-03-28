// screens/(admin)/outlet-detail.tsx
// Fixed + improved:
//   - Back button → /(admin)/outlets (not branches)
//   - Outlet metrics row with date filter
//   - Edit Outlet modal
//   - Transactions: card/table toggle + pagination
//   - Map replaced with safe coordinate fallback until native rebuild

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  Animated,
} from 'react-native';
import {
  ArrowLeft,
  User,
  ShoppingCart,
  Users,
  Package,
  Plus,
  X,
  Search,
  UserPlus,
  Edit2,
  LayoutGrid,
  Table,
  TrendingUp,
  PhilippinePeso,
  ChevronLeft,
  ChevronRight,
  Check,
} from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AdminService } from '@/services/adminService';
import { InventoryService } from '@/services/inventoryService';
import { HrService } from '@/services/hrService';
import { AdminTransaction, Cashier, OutletRevenue } from '@/types';
import { DateRangeFilter, getDateRange } from '@/utils/dateHelpers';
import { useTheme } from '@/contexts/ThemeContext';
import { DropdownField } from '.';
import { formatPeso } from '@/utils/moneyHelpers';
import DateRangePickerModal from '@/components/DateRangePickerModal';
import { FILTERS } from './outlets';

type Tab = 'overview' | 'inventory' | 'staff';
type TxnView = 'card' | 'table';

const TXN_PAGE_SIZE = 10;
const DATE_FILTERS: DateRangeFilter[] = [
  'today',
  'this_week',
  'this_month',
  'custom',
];

// ─── Skeleton pulse ───────────────────────────────────────────────────────────

function SkeletonPulse({ style, colors }: { style: any; colors: any }) {
  const anim = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0.4,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <Animated.View
      style={[
        { backgroundColor: colors.border, borderRadius: 6, opacity: anim },
        style,
      ]}
    />
  );
}

// ─── Edit Outlet Modal ────────────────────────────────────────────────────────

function EditOutletModal({
  visible,
  onClose,
  outletName,
  outletId,
  colors,
}: {
  visible: boolean;
  onClose: () => void;
  outletName: string;
  outletId: string;
  colors: any;
}) {
  const [name, setName] = useState(outletName);
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [type, setType] = useState('retail');
  const [status, setStatus] = useState('open');
  const [govTax, setGovTax] = useState('');
  const [svcChg, setSvcChg] = useState('');
  const [wifiSSID, setWifiSSID] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) setName(outletName);
  }, [visible, outletName]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Outlet name is required.');
      return;
    }
    setLoading(true);
    try {
      // TODO: AdminService.updateOutlet(outletId, { name, address, phone, outletType: type, status, governmentTax: parseFloat(govTax), serviceCharge: parseFloat(svcChg), wifiSSID })
      await new Promise((r) => setTimeout(r, 600));
      onClose();
    } catch {
      setError('Failed to update outlet.');
    } finally {
      setLoading(false);
    }
  };

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
          <View style={[eom.sheet, { backgroundColor: colors.surface }]}>
            <View style={[eom.handle, { backgroundColor: colors.border }]} />
            <View style={[eom.header, { borderBottomColor: colors.border }]}>
              <Text style={[eom.title, { color: colors.text }]}>
                Edit Outlet
              </Text>
              <TouchableOpacity onPress={onClose}>
                <X size={20} color={colors.textSecondary} strokeWidth={2} />
              </TouchableOpacity>
            </View>
            <ScrollView
              contentContainerStyle={eom.body}
              keyboardShouldPersistTaps="handled"
            >
              {[
                [
                  'OUTLET NAME *',
                  name,
                  setName,
                  'e.g. Main Street Outlet',
                  false,
                ],
                ['ADDRESS', address, setAddress, 'Full address', true],
                ['PHONE', phone, setPhone, '+63 9XX XXX XXXX', false],
                ['WIFI SSID', wifiSSID, setWifiSSID, 'Network name', false],
              ].map(([label, val, setter, ph, multi]: any) => (
                <View key={label as string}>
                  <Text style={[eom.label, { color: colors.textSecondary }]}>
                    {label as string}
                  </Text>
                  <TextInput
                    style={[
                      eom.input,
                      multi && eom.textarea,
                      {
                        color: colors.text,
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                      },
                    ]}
                    placeholder={ph as string}
                    placeholderTextColor={colors.textSecondary}
                    value={val as string}
                    onChangeText={setter}
                    multiline={multi as boolean}
                    numberOfLines={multi ? 3 : 1}
                    textAlignVertical={multi ? 'top' : 'center'}
                  />
                </View>
              ))}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[eom.label, { color: colors.textSecondary }]}>
                    GOV. TAX %
                  </Text>
                  <TextInput
                    style={[
                      eom.input,
                      {
                        color: colors.text,
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                      },
                    ]}
                    placeholder="0.00"
                    placeholderTextColor={colors.textSecondary}
                    value={govTax}
                    onChangeText={setGovTax}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[eom.label, { color: colors.textSecondary }]}>
                    SERVICE CHARGE %
                  </Text>
                  <TextInput
                    style={[
                      eom.input,
                      {
                        color: colors.text,
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                      },
                    ]}
                    placeholder="0.00"
                    placeholderTextColor={colors.textSecondary}
                    value={svcChg}
                    onChangeText={setSvcChg}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
              <DropdownField
                label="Outlet Type"
                value={type}
                options={['retail', 'wholesale', 'service']}
                onSelect={setType}
                colors={colors}
              />
              <DropdownField
                label="Status"
                value={status}
                options={['open', 'closed', 'maintenance']}
                onSelect={setStatus}
                colors={colors}
              />
              {error ? (
                <Text
                  style={{ fontSize: 12, color: colors.error, marginBottom: 8 }}
                >
                  {error}
                </Text>
              ) : null}
              <TouchableOpacity
                style={[
                  eom.saveBtn,
                  {
                    backgroundColor: colors.primary,
                    opacity: loading ? 0.7 : 1,
                  },
                ]}
                onPress={handleSave}
                disabled={loading}
                activeOpacity={0.85}
              >
                <Text style={eom.saveTxt}>
                  {loading ? 'Saving…' : 'Save Changes'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const eom = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  title: { fontSize: 17, fontWeight: '800' },
  body: { padding: 20, paddingBottom: 32 },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 5,
    marginTop: 14,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    marginBottom: 4,
  },
  textarea: { minHeight: 70, paddingTop: 10 },
  saveBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  saveTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

// ─── Create / Assign Staff Modals (same as before) ────────────────────────────

function CreateStaffModal({
  visible,
  onClose,
  onCreated,
  colors,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: (staff: Cashier) => void;
  colors: any;
}) {
  const [fullname, setFullname] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('CASHIER');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!fullname.trim()) {
      setError('Full name is required.');
      return;
    }
    if (!email.trim()) {
      setError('Email is required.');
      return;
    }
    if (!username.trim()) {
      setError('Username is required.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      const mock: Cashier = {
        id: `u_${Date.now()}`,
        fullname: fullname.trim(),
        email: email.trim(),
        isActive: false,
        outletId: '',
      };
      onCreated(mock);
      setFullname('');
      setEmail('');
      setUsername('');
      setPassword('');
      setError('');
      onClose();
    } catch {
      setError('Failed to create user.');
    } finally {
      setLoading(false);
    }
  };

  const s2 = {
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end' as const,
    },
  };

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
        <View style={s2.overlay}>
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={onClose}
          />
          <View style={[csm2.sheet, { backgroundColor: colors.surface }]}>
            <View style={[csm2.handle, { backgroundColor: colors.border }]} />
            <View style={[csm2.header, { borderBottomColor: colors.border }]}>
              <Text style={[csm2.title, { color: colors.text }]}>
                Create New Staff
              </Text>
              <TouchableOpacity onPress={onClose}>
                <X size={20} color={colors.textSecondary} strokeWidth={2} />
              </TouchableOpacity>
            </View>
            <ScrollView
              contentContainerStyle={{ padding: 20 }}
              keyboardShouldPersistTaps="handled"
            >
              {[
                [
                  'FULL NAME *',
                  fullname,
                  setFullname,
                  'e.g. Maria Santos',
                  false,
                  'default',
                ],
                [
                  'EMAIL *',
                  email,
                  setEmail,
                  'm.santos@store.com',
                  false,
                  'email-address',
                ],
                [
                  'USERNAME *',
                  username,
                  setUsername,
                  'msantos',
                  false,
                  'default',
                ],
                [
                  'PASSWORD *',
                  password,
                  setPassword,
                  'Min. 6 characters',
                  false,
                  'default',
                  true,
                ],
              ].map(([label, val, setter, ph, _multi, kb, secure]: any) => (
                <View key={label as string}>
                  <Text style={[csm2.label, { color: colors.textSecondary }]}>
                    {label as string}
                  </Text>
                  <TextInput
                    style={[
                      csm2.input,
                      {
                        color: colors.text,
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                      },
                    ]}
                    placeholder={ph as string}
                    placeholderTextColor={colors.textSecondary}
                    value={val as string}
                    onChangeText={setter}
                    keyboardType={kb as any}
                    autoCapitalize="none"
                    secureTextEntry={!!secure}
                  />
                </View>
              ))}
              <DropdownField
                label="Role"
                value={role}
                options={['CASHIER', 'STAFF', 'MANAGER']}
                onSelect={setRole}
                colors={colors}
              />
              {error ? (
                <Text
                  style={{ fontSize: 12, color: colors.error, marginTop: 6 }}
                >
                  {error}
                </Text>
              ) : null}
              <TouchableOpacity
                style={[
                  csm2.btn,
                  {
                    backgroundColor: colors.primary,
                    opacity: loading ? 0.7 : 1,
                  },
                ]}
                onPress={handleCreate}
                disabled={loading}
                activeOpacity={0.85}
              >
                <Text style={csm2.btnTxt}>
                  {loading ? 'Creating…' : 'Create Staff Account'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const csm2 = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 32,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
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
  },
  title: { fontSize: 16, fontWeight: '800' },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
  },
  btn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  btnTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

function AssignStaffModal({
  visible,
  onClose,
  onAssign,
  colors,
  outletId,
}: {
  visible: boolean;
  onClose: () => void;
  onAssign: (user: Cashier) => void;
  colors: any;
  outletId: string;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Cashier[]>([]);
  const [loading, setLoading] = useState(false);

  const doSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const mock: Cashier[] = [
        {
          id: 'u1',
          fullname: 'Juan dela Cruz',
          email: 'juan@store.com',
          isActive: false,
          outletId: '',
        },
        {
          id: 'u2',
          fullname: 'Maria Santos',
          email: 'maria@store.com',
          isActive: false,
          outletId: '',
        },
        {
          id: 'u3',
          fullname: 'Pedro Reyes',
          email: 'pedro@store.com',
          isActive: false,
          outletId: '',
        },
      ].filter(
        (u) =>
          u.fullname.toLowerCase().includes(query.toLowerCase()) ||
          u.email.toLowerCase().includes(query.toLowerCase()),
      );
      setResults(mock);
    } finally {
      setLoading(false);
    }
  };

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
        <View style={[asm2.sheet, { backgroundColor: colors.surface }]}>
          <View style={[asm2.handle, { backgroundColor: colors.border }]} />
          <View style={[asm2.header, { borderBottomColor: colors.border }]}>
            <Text style={[asm2.title, { color: colors.text }]}>
              Assign Existing Staff
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={20} color={colors.textSecondary} strokeWidth={2} />
            </TouchableOpacity>
          </View>
          <View style={[asm2.searchRow, { borderBottomColor: colors.border }]}>
            <View
              style={[
                asm2.searchBox,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                },
              ]}
            >
              <Search size={13} color={colors.textSecondary} strokeWidth={2} />
              <TextInput
                style={[asm2.searchInput, { color: colors.text }]}
                placeholder="Search by name or email…"
                placeholderTextColor={colors.textSecondary}
                value={query}
                onChangeText={setQuery}
                returnKeyType="search"
                onSubmitEditing={doSearch}
                autoCorrect={false}
              />
              {query.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    setQuery('');
                    setResults([]);
                  }}
                >
                  <X size={13} color={colors.textSecondary} strokeWidth={2} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={[
                asm2.searchBtn,
                { backgroundColor: loading ? colors.border : colors.primary },
              ]}
              onPress={doSearch}
              disabled={loading}
            >
              <Search size={14} color="#fff" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={results}
            keyExtractor={(i) => i.id}
            style={{ maxHeight: 300 }}
            ListEmptyComponent={
              <View style={{ padding: 24, alignItems: 'center' }}>
                <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                  {loading
                    ? 'Searching…'
                    : query
                      ? 'No users found'
                      : 'Search to find staff'}
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[asm2.resultRow, { borderBottomColor: colors.border }]}
                onPress={() => {
                  onAssign(item);
                  onClose();
                }}
                activeOpacity={0.75}
              >
                <View
                  style={[
                    asm2.avatar,
                    { backgroundColor: colors.primary + '20' },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '700',
                      color: colors.primary,
                    }}
                  >
                    {item.fullname
                      .split(' ')
                      .map((n: string) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[asm2.resultName, { color: colors.text }]}>
                    {item.fullname}
                  </Text>
                  <Text
                    style={[asm2.resultEmail, { color: colors.textSecondary }]}
                  >
                    {item.email}
                  </Text>
                </View>
                <Text style={[asm2.assignTxt, { color: colors.primary }]}>
                  Assign
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

const asm2 = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
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
  },
  title: { fontSize: 16, fontWeight: '800' },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderBottomWidth: 1,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  searchInput: { flex: 1, fontSize: 13 },
  searchBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultName: { fontSize: 14, fontWeight: '600' },
  resultEmail: { fontSize: 12, marginTop: 1 },
  assignTxt: { fontSize: 13, fontWeight: '700' },
});

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function OutletDetailScreen() {
  const { outletId, outletName, branchName, branchId } = useLocalSearchParams<{
    outletId: string;
    outletName: string;
    branchName: string;
    branchId: string;
  }>();
  const { colors } = useTheme();

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [currentCashiers, setCurrentCashiers] = useState<Cashier[]>([]);
  const [assignedStaff, setAssignedStaff] = useState<Cashier[]>([]);
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [outletItems, setOutletItems] = useState<any[]>([]);
  const [availableItems, setAvailableItems] = useState<any[]>([]);
  const [availableStaff, setAvailableStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignItemsModal, setShowAssignItemsModal] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<string[]>([]);
  const [txnView, setTxnView] = useState<TxnView>('card');
  const [txnPage, setTxnPage] = useState(1);
  const [activeFilter, setActiveFilter] = useState<DateRangeFilter>('today');

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customStart, setCustomStart] = useState<Date | undefined>();
  const [customEnd, setCustomEnd] = useState<Date | undefined>();
  const [outletRevenue, setOutletRevenue] = useState<OutletRevenue | null>(
    null,
  );

  useEffect(() => {
    if (outletId) loadData();
  }, [outletId, activeFilter]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const { startDate, endDate } = getDateRange(activeFilter);
      const [cashiers, txns, allStaff, revenue, outletItemsData, availableItemsData, availableStaffData] = await Promise.all([
        AdminService.getCurrentCashiers(outletId),
        AdminService.getRecentTransactions(outletId, 50),
        AdminService.getCashiersByOutlet(outletId),
        AdminService.getOutletRevenue(outletId, startDate, endDate),
        AdminService.getItemsByOutlet(outletId),
        InventoryService.getItems(),
        HrService.getAllStaffs(),
      ]);
      setCurrentCashiers(cashiers);
      setTransactions(txns);
      setAssignedStaff(allStaff);
      setOutletRevenue(revenue);
      setOutletItems(outletItemsData);
      setAvailableItems(availableItemsData);
      setAvailableStaff(availableStaffData);
      setTxnPage(1);
    } finally {
      setLoading(false);
    }
  }, [outletId, activeFilter]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleAssignItems = async () => {
    try {
      await AdminService.assignItemsToOutlet(outletId, selectedItems);
      setSelectedItems([]);
      setShowAssignItemsModal(false);
      await loadData(); // Refresh data
    } catch (error) {
      console.error('Failed to assign items:', error);
    }
  };

  const handleAssignStaff = async () => {
    try {
      await AdminService.assignStaffToOutlet(outletId, selectedStaff);
      setSelectedStaff([]);
      setShowAssignModal(false);
      await loadData(); // Refresh data
    } catch (error) {
      console.error('Failed to assign staff:', error);
    }
  };

  // Pagination
  const totalPages = Math.max(
    1,
    Math.ceil(transactions.length / TXN_PAGE_SIZE),
  );
  const pagedTxns = transactions.slice(
    (txnPage - 1) * TXN_PAGE_SIZE,
    txnPage * TXN_PAGE_SIZE,
  );

  // Back → go to outlet list, not branches
  const handleBack = () => {
    if (branchId) {
      router.push({
        pathname: '/(admin)/outlets',
        params: { branchId, branchName },
      });
    } else {
      router.back();
    }
  };

  const TABS: { key: Tab; label: string; icon: any }[] = [
    { key: 'overview', label: 'Overview', icon: ShoppingCart },
    { key: 'inventory', label: 'Inventory', icon: Package },
    { key: 'staff', label: 'Staff', icon: Users },
  ];

  return (
    <SafeAreaView
      style={[st.container, { backgroundColor: colors.background }]}
    >
      {/* Header */}
      <View
        style={[
          st.header,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity
          style={[st.backBtn, { backgroundColor: colors.card }]}
          onPress={handleBack}
        >
          <ArrowLeft size={22} color={colors.text} strokeWidth={2} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[st.title, { color: colors.text }]}>{outletName}</Text>
          <Text style={[st.subtitle, { color: colors.textSecondary }]}>
            {branchName}
          </Text>
        </View>
        <TouchableOpacity
          style={[
            st.editBtn,
            { backgroundColor: colors.background, borderColor: colors.border },
          ]}
          onPress={() => setShowEditModal(true)}
          activeOpacity={0.8}
        >
          <Edit2 size={15} color={colors.primary} strokeWidth={2} />
          <Text style={[st.editBtnTxt, { color: colors.primary }]}>Edit</Text>
        </TouchableOpacity>
      </View>

      {/* Tab bar */}
      <View
        style={[
          st.tabBar,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        {TABS.map(({ key, label, icon: Icon }) => {
          const isActive = activeTab === key;
          return (
            <TouchableOpacity
              key={key}
              style={[
                st.tab,
                isActive && {
                  borderBottomColor: colors.primary,
                  borderBottomWidth: 2.5,
                },
              ]}
              onPress={() => setActiveTab(key)}
              activeOpacity={0.8}
            >
              <Icon
                size={15}
                color={isActive ? colors.primary : colors.textSecondary}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <Text
                style={[
                  st.tabLabel,
                  {
                    color: isActive ? colors.primary : colors.textSecondary,
                    fontWeight: isActive ? '700' : '500',
                  },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── OVERVIEW TAB ─────────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {/* Date filters */}
          <View style={[st.filterRow, { backgroundColor: colors.card }]}>
            {FILTERS.map((filter) => {
              const { label } = getDateRange(filter, customStart, customEnd);
              const isActive = activeFilter === filter;
              return (
                <TouchableOpacity
                  key={filter}
                  style={[
                    st.filterTab,
                    isActive && { backgroundColor: colors.primary },
                  ]}
                  onPress={() =>
                    filter === 'custom'
                      ? setShowDatePicker(true)
                      : setActiveFilter(filter)
                  }
                >
                  <Text
                    style={[
                      st.filterTabText,
                      { color: isActive ? '#fff' : colors.textSecondary },
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <DateRangePickerModal
            visible={showDatePicker}
            onClose={() => setShowDatePicker(false)}
            onApply={(s, e) => {
              setCustomStart(s);
              setCustomEnd(e);
              setActiveFilter('custom');
            }}
            initialStart={customStart}
            initialEnd={customEnd}
          />

          {/* Metrics row */}
          {loading ? (
            <View style={st.metricsRow}>
              {[1, 2, 3].map((i) => (
                <SkeletonPulse
                  key={i}
                  colors={colors}
                  style={{ flex: 1, height: 72, borderRadius: 12 }}
                />
              ))}
            </View>
          ) : (
            <View style={st.metricsRow}>
              <View style={[st.metricCard, { backgroundColor: colors.card }]}>
                <PhilippinePeso
                  size={16}
                  color={colors.success}
                  strokeWidth={2}
                />
                <Text style={[st.metricVal, { color: colors.text }]}>
                  {outletRevenue
                    ? formatPeso(outletRevenue.totalRevenue)
                    : '₱0'}
                </Text>
                <Text style={[st.metricLbl, { color: colors.textSecondary }]}>
                  Revenue
                </Text>
              </View>
              <View style={[st.metricCard, { backgroundColor: colors.card }]}>
                <TrendingUp size={16} color={colors.accent} strokeWidth={2} />
                <Text style={[st.metricVal, { color: colors.text }]}>
                  {outletRevenue?.transactionCount ?? 0}
                </Text>
                <Text style={[st.metricLbl, { color: colors.textSecondary }]}>
                  Transactions
                </Text>
              </View>
              <View style={[st.metricCard, { backgroundColor: colors.card }]}>
                <Users size={16} color={colors.primary} strokeWidth={2} />
                <Text style={[st.metricVal, { color: colors.text }]}>
                  {currentCashiers.length}
                </Text>
                <Text style={[st.metricLbl, { color: colors.textSecondary }]}>
                  Staff Active
                </Text>
              </View>
            </View>
          )}

          {/* Active cashiers */}
          <Text style={[st.sectionTitle, { color: colors.text, marginTop: 8 }]}>
            Active Cashiers
          </Text>
          {currentCashiers.length === 0 ? (
            <View style={[st.emptyCard, { backgroundColor: colors.card }]}>
              <User size={32} color={colors.textSecondary} strokeWidth={1.5} />
              <Text style={[st.emptyTxt, { color: colors.textSecondary }]}>
                No active cashiers
              </Text>
            </View>
          ) : (
            currentCashiers.map((c) => (
              <View
                key={c.id}
                style={[st.cashierCard, { backgroundColor: colors.card }]}
              >
                <User size={18} color={colors.primary} strokeWidth={2} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[st.cashierName, { color: colors.text }]}>
                    {c.fullname}
                  </Text>
                  <Text
                    style={[st.cashierEmail, { color: colors.textSecondary }]}
                  >
                    {c.email}
                  </Text>
                </View>
                <View
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}
                >
                  <View style={st.activeDot} />
                  <Text
                    style={{
                      fontSize: 12,
                      color: '#059669',
                      fontWeight: '600',
                    }}
                  >
                    Active
                  </Text>
                </View>
              </View>
            ))
          )}

          {/* Transactions header with view toggle */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 20,
              marginBottom: 10,
            }}
          >
            <Text style={[st.sectionTitle, { color: colors.text }]}>
              Transactions ({transactions.length})
            </Text>
            <View
              style={[
                st.viewToggle,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <TouchableOpacity
                style={[
                  st.toggleBtn,
                  txnView === 'card' && { backgroundColor: colors.primary },
                ]}
                onPress={() => setTxnView('card')}
              >
                <LayoutGrid
                  size={14}
                  color={txnView === 'card' ? '#fff' : colors.textSecondary}
                  strokeWidth={2}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  st.toggleBtn,
                  txnView === 'table' && { backgroundColor: colors.primary },
                ]}
                onPress={() => setTxnView('table')}
              >
                <Table
                  size={14}
                  color={txnView === 'table' ? '#fff' : colors.textSecondary}
                  strokeWidth={2}
                />
              </TouchableOpacity>
            </View>
          </View>

          {transactions.length === 0 ? (
            <View style={[st.emptyCard, { backgroundColor: colors.card }]}>
              <ShoppingCart
                size={32}
                color={colors.textSecondary}
                strokeWidth={1.5}
              />
              <Text style={[st.emptyTxt, { color: colors.textSecondary }]}>
                No transactions yet
              </Text>
            </View>
          ) : (
            <>
              {/* ── CARD VIEW ─────────────────────────────────────────────── */}
              {txnView === 'card' &&
                pagedTxns.map((txn) => (
                  <View
                    key={txn.id}
                    style={[st.txnCard, { backgroundColor: colors.card }]}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        marginBottom: 6,
                      }}
                    >
                      <Text style={[st.txnId, { color: colors.text }]}>
                        #{txn.id.toString().slice(-8).toUpperCase()}
                      </Text>
                      <Text
                        style={[st.txnTime, { color: colors.textSecondary }]}
                      >
                        {new Date(txn.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
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
                          flexDirection: 'row',
                          gap: 8,
                          alignItems: 'center',
                        }}
                      >
                        <Text
                          style={[
                            { fontSize: 13 },
                            { color: colors.textSecondary },
                          ]}
                        >
                          {txn.items.length} item
                          {txn.items.length !== 1 ? 's' : ''}
                        </Text>
                        <View
                          style={[
                            st.payBadge,
                            { backgroundColor: colors.primary + '18' },
                          ]}
                        >
                          <Text
                            style={[st.payBadgeTxt, { color: colors.primary }]}
                          >
                            {txn.paymentMethod.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      <Text style={[st.txnTotal, { color: colors.success }]}>
                        ₱{txn.total.toFixed(2)}
                      </Text>
                    </View>
                    {txn.items.slice(0, 2).map((item, i) => (
                      <Text
                        key={i}
                        style={{ fontSize: 12, color: colors.textSecondary }}
                      >
                        {item.quantity}× {item.name}
                      </Text>
                    ))}
                    {txn.items.length > 2 && (
                      <Text
                        style={{
                          fontSize: 12,
                          color: colors.textSecondary,
                          fontStyle: 'italic',
                        }}
                      >
                        +{txn.items.length - 2} more
                      </Text>
                    )}
                  </View>
                ))}

              {/* ── TABLE VIEW ────────────────────────────────────────────── */}
              {txnView === 'table' && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View>
                    {/* Header */}
                    <View
                      style={{
                        flexDirection: 'row',
                        backgroundColor: colors.primary,
                      }}
                    >
                      {['ID', 'Time', 'Items', 'Method', 'Total'].map(
                        (h, i) => (
                          <View
                            key={h}
                            style={[
                              st.thCell,
                              i === 4 && { alignItems: 'flex-end' as const },
                            ]}
                          >
                            <Text
                              style={{
                                fontSize: 11,
                                fontWeight: '700',
                                color: '#fff',
                                textTransform: 'uppercase',
                                letterSpacing: 0.5,
                              }}
                            >
                              {h}
                            </Text>
                          </View>
                        ),
                      )}
                    </View>
                    {/* Rows */}
                    {pagedTxns.map((txn, idx) => (
                      <View
                        key={txn.id}
                        style={{
                          flexDirection: 'row',
                          backgroundColor:
                            idx % 2 === 0 ? colors.card : colors.background,
                          borderBottomWidth: 1,
                          borderBottomColor: colors.border,
                        }}
                      >
                        <View style={st.tdCell}>
                          <Text
                            style={{
                              fontSize: 11,
                              color: colors.primary,
                              fontFamily: 'monospace',
                            }}
                          >
                            #{txn.id.toString().slice(-6)}
                          </Text>
                        </View>
                        <View style={st.tdCell}>
                          <Text
                            style={{
                              fontSize: 12,
                              color: colors.textSecondary,
                            }}
                          >
                            {new Date(txn.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </Text>
                        </View>
                        <View style={st.tdCell}>
                          <Text style={{ fontSize: 12, color: colors.text }}>
                            {txn.items.length}
                          </Text>
                        </View>
                        <View style={st.tdCell}>
                          <Text
                            style={{
                              fontSize: 11,
                              color: colors.primary,
                              fontWeight: '600',
                            }}
                          >
                            {txn.paymentMethod.toUpperCase()}
                          </Text>
                        </View>
                        <View
                          style={[
                            st.tdCell,
                            { alignItems: 'flex-end' as const },
                          ]}
                        >
                          <Text
                            style={{
                              fontSize: 13,
                              fontWeight: '700',
                              color: colors.success,
                            }}
                          >
                            ₱{txn.total.toFixed(2)}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <View
                  style={[st.pagination, { borderTopColor: colors.border }]}
                >
                  <TouchableOpacity
                    style={[
                      st.pageBtn,
                      {
                        borderColor: colors.border,
                        opacity: txnPage <= 1 ? 0.4 : 1,
                      },
                    ]}
                    onPress={() => setTxnPage((p) => Math.max(1, p - 1))}
                    disabled={txnPage <= 1}
                  >
                    <ChevronLeft
                      size={16}
                      color={colors.text}
                      strokeWidth={2}
                    />
                  </TouchableOpacity>
                  <Text style={[st.pageInfo, { color: colors.textSecondary }]}>
                    {txnPage} / {totalPages} · {transactions.length} total
                  </Text>
                  <TouchableOpacity
                    style={[
                      st.pageBtn,
                      {
                        borderColor: colors.border,
                        opacity: txnPage >= totalPages ? 0.4 : 1,
                      },
                    ]}
                    onPress={() =>
                      setTxnPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={txnPage >= totalPages}
                  >
                    <ChevronRight
                      size={16}
                      color={colors.text}
                      strokeWidth={2}
                    />
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}

      {/* ── INVENTORY TAB ────────────────────────────────────────────────────── */}
      {activeTab === 'inventory' && (
        <View style={{ flex: 1 }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 16,
              paddingBottom: 8,
            }}
          >
            <Text style={[st.sectionTitle, { color: colors.text }]}>
              {outletItems.length} Items Assigned
            </Text>
            <TouchableOpacity
              style={[st.addBtn, { backgroundColor: colors.primary }]}
              onPress={() => setShowAssignItemsModal(true)}
              activeOpacity={0.85}
            >
              <Plus size={14} color="#fff" strokeWidth={2.5} />
              <Text style={st.addBtnTxt}>Assign Items</Text>
            </TouchableOpacity>
          </View>
          {outletItems.length === 0 ? (
            <View
              style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
            >
              <Package size={48} color={colors.border} strokeWidth={1} />
              <Text
                style={[
                  st.emptyTxt,
                  { color: colors.textSecondary, marginTop: 12 },
                ]}
              >
                No items assigned
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: colors.textSecondary,
                  marginTop: 4,
                }}
              >
                Tap Assign Items to add items to this outlet
              </Text>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={{
                padding: 16,
                paddingTop: 4,
                paddingBottom: 40,
              }}
            >
              {outletItems.map((item) => (
                <View
                  key={item.id}
                  style={[st.itemCard, { backgroundColor: colors.card }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[st.itemName, { color: colors.text }]}>
                      {item.name}
                    </Text>
                    <Text style={[st.itemDetail, { color: colors.textSecondary }]}>
                      Stock: {item.quantity} | Price: {formatPeso(item.price)}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      {/* ── STAFF TAB ────────────────────────────────────────────────────────── */}
      {activeTab === 'staff' && (
        <View style={{ flex: 1 }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 16,
              paddingBottom: 8,
            }}
          >
            <Text style={[st.sectionTitle, { color: colors.text }]}>
              {assignedStaff.length} Staff Assigned
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                style={[st.addBtn, { backgroundColor: colors.primary }]}
                onPress={() => setShowAssignModal(true)}
                activeOpacity={0.85}
              >
                <Plus size={14} color="#fff" strokeWidth={2.5} />
                <Text style={st.addBtnTxt}>Assign Staff</Text>
              </TouchableOpacity>
            </View>
          </View>
          <ScrollView
            contentContainerStyle={{
              padding: 16,
              paddingTop: 4,
              paddingBottom: 40,
            }}
          >
            {assignedStaff.length === 0 ? (
              <View style={[st.emptyCard, { backgroundColor: colors.card }]}>
                <Users
                  size={36}
                  color={colors.textSecondary}
                  strokeWidth={1.5}
                />
                <Text style={[st.emptyTxt, { color: colors.textSecondary }]}>
                  No staff assigned
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: colors.textSecondary,
                    marginTop: 4,
                    textAlign: 'center',
                  }}
                >
                  Tap Assign to add existing users or New to create a staff
                  account
                </Text>
              </View>
            ) : (
              assignedStaff.map((staff) => {
                const isPresent = currentCashiers.some(
                  (c) => c.id === staff.id,
                );
                return (
                  <View
                    key={staff.id}
                    style={[
                      st.staffRow,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <View
                      style={[
                        st.staffAvatar,
                        { backgroundColor: colors.primary + '20' },
                      ]}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: '700',
                          color: colors.primary,
                        }}
                      >
                        {staff.fullname
                          .split(' ')
                          .map((n: string) => n[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2)}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[st.staffName, { color: colors.text }]}>
                        {staff.fullname}
                      </Text>
                      <Text
                        style={[st.staffEmail, { color: colors.textSecondary }]}
                      >
                        {staff.email}
                      </Text>
                    </View>
                    {isPresent && (
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                          marginRight: 10,
                        }}
                      >
                        <View
                          style={[
                            st.activeDot,
                            { backgroundColor: colors.success },
                          ]}
                        />
                        <Text
                          style={{
                            fontSize: 11,
                            color: colors.success,
                            fontWeight: '600',
                          }}
                        >
                          Active
                        </Text>
                      </View>
                    )}
                    <TouchableOpacity
                      onPress={() =>
                        setAssignedStaff((prev) =>
                          prev.filter((s) => s.id !== staff.id),
                        )
                      }
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <X size={16} color={colors.error} strokeWidth={2} />
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      )}

      <AssignStaffModal
        visible={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        onAssign={(user) =>
          setAssignedStaff((prev) =>
            prev.find((s) => s.id === user.id) ? prev : [...prev, user],
          )
        }
        colors={colors}
        outletId={outletId}
      />
      <CreateStaffModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={(user) => setAssignedStaff((prev) => [...prev, user])}
        colors={colors}
      />
      <EditOutletModal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        outletName={outletName ?? ''}
        outletId={outletId ?? ''}
        colors={colors}
      />

      {/* Assign Items Modal */}
      <Modal visible={showAssignItemsModal} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setShowAssignItemsModal(false)} />
          <View style={[st.modalSheet, { backgroundColor: colors.surface }]}>
            <View style={[st.modalHandle, { backgroundColor: colors.border }]} />
            <View style={[st.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[st.modalTitle, { color: colors.text }]}>Assign Items to Outlet</Text>
              <TouchableOpacity onPress={() => setShowAssignItemsModal(false)}>
                <X size={20} color={colors.textSecondary} strokeWidth={2} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={st.modalBody}>
              {availableItems.map((item) => {
                const isSelected = selectedItems.includes(item.id.toString());
                const isAssigned = outletItems.some(oi => oi.id === item.id);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[st.itemRow, { backgroundColor: colors.card, opacity: isAssigned ? 0.5 : 1 }]}
                    onPress={() => {
                      if (isAssigned) return;
                      setSelectedItems(prev =>
                        isSelected
                          ? prev.filter(id => id !== item.id.toString())
                          : [...prev, item.id.toString()]
                      );
                    }}
                    disabled={isAssigned}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[st.itemName, { color: colors.text }]}>{item.name}</Text>
                      <Text style={[st.itemDetail, { color: colors.textSecondary }]}>
                        {formatPeso(item.price)}
                      </Text>
                    </View>
                    {isAssigned ? (
                      <Text style={[st.assignedText, { color: colors.success }]}>Assigned</Text>
                    ) : (
                      <View style={[st.checkbox, isSelected && { backgroundColor: colors.primary }]}>
                        {isSelected && <Check size={16} color="#fff" strokeWidth={3} />}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <View style={[st.modalFooter, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[st.modalBtn, st.modalCancelBtn, { borderColor: colors.border }]}
                onPress={() => {
                  setSelectedItems([]);
                  setShowAssignItemsModal(false);
                }}
              >
                <Text style={[st.modalBtnText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[st.modalBtn, st.modalConfirmBtn, { backgroundColor: colors.primary }]}
                onPress={handleAssignItems}
                disabled={selectedItems.length === 0}
              >
                <Text style={[st.modalBtnText, { color: '#fff' }]}>
                  Assign {selectedItems.length} Items
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Assign Staff Modal */}
      <Modal visible={showAssignModal} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setShowAssignModal(false)} />
          <View style={[st.modalSheet, { backgroundColor: colors.surface }]}>
            <View style={[st.modalHandle, { backgroundColor: colors.border }]} />
            <View style={[st.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[st.modalTitle, { color: colors.text }]}>Assign Staff to Outlet</Text>
              <TouchableOpacity onPress={() => setShowAssignModal(false)}>
                <X size={20} color={colors.textSecondary} strokeWidth={2} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={st.modalBody}>
              {availableStaff.map((staff) => {
                const isSelected = selectedStaff.includes(staff.id.toString());
                const isAssigned = assignedStaff.some(as => as.id === staff.id);
                return (
                  <TouchableOpacity
                    key={staff.id}
                    style={[st.staffRow, { backgroundColor: colors.card, opacity: isAssigned ? 0.5 : 1 }]}
                    onPress={() => {
                      if (isAssigned) return;
                      setSelectedStaff(prev =>
                        isSelected
                          ? prev.filter(id => id !== staff.id.toString())
                          : [...prev, staff.id.toString()]
                      );
                    }}
                    disabled={isAssigned}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[st.staffName, { color: colors.text }]}>{staff.fullname}</Text>
                      <Text style={[st.staffDetail, { color: colors.textSecondary }]}>{staff.email}</Text>
                    </View>
                    {isAssigned ? (
                      <Text style={[st.assignedText, { color: colors.success }]}>Assigned</Text>
                    ) : (
                      <View style={[st.checkbox, isSelected && { backgroundColor: colors.primary }]}>
                        {isSelected && <Check size={16} color="#fff" strokeWidth={3} />}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <View style={[st.modalFooter, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[st.modalBtn, st.modalCancelBtn, { borderColor: colors.border }]}
                onPress={() => {
                  setSelectedStaff([]);
                  setShowAssignModal(false);
                }}
              >
                <Text style={[st.modalBtnText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[st.modalBtn, st.modalConfirmBtn, { backgroundColor: colors.primary }]}
                onPress={handleAssignStaff}
                disabled={selectedStaff.length === 0}
              >
                <Text style={[st.modalBtnText, { color: '#fff' }]}>
                  Assign {selectedStaff.length} Staff
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { fontSize: 17, fontWeight: '800' },
  subtitle: { fontSize: 12, marginTop: 1 },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  editBtnTxt: { fontSize: 13, fontWeight: '600' },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
  },
  tabLabel: { fontSize: 13 },
  filterRow: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
    gap: 3,
    marginBottom: 12,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  
  filterTabText: { fontSize: 11, fontWeight: '600' },
  metricsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  metricCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  metricVal: { fontSize: 15, fontWeight: '800' },
  metricLbl: { fontSize: 10, textAlign: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 8 },
  emptyCard: { borderRadius: 12, padding: 28, alignItems: 'center' },
  emptyTxt: { fontSize: 14, fontWeight: '600', marginTop: 8 },
  cashierCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  cashierName: { fontSize: 15, fontWeight: '700' },
  cashierEmail: { fontSize: 12, marginTop: 1 },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#059669',
  },
  viewToggle: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
    padding: 2,
    gap: 2,
  },
  toggleBtn: {
    width: 32,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  txnCard: { borderRadius: 12, padding: 14, marginBottom: 8 },
  txnId: { fontSize: 13, fontWeight: '700' },
  txnTime: { fontSize: 12 },
  txnTotal: { fontSize: 15, fontWeight: '800' },
  payBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  payBadgeTxt: { fontSize: 10, fontWeight: '600' },
  thCell: { width: 100, padding: 10 },
  tdCell: { width: 100, paddingHorizontal: 10, paddingVertical: 10 },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    marginTop: 8,
  },
  pageBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageInfo: { fontSize: 12 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addBtnTxt: { fontSize: 13, fontWeight: '700', color: '#fff' },
  staffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
  },
  staffAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  staffName: { fontSize: 14, fontWeight: '700' },
  staffEmail: { fontSize: 12, marginTop: 1 },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
  },
  itemName: { fontSize: 14, fontWeight: '700' },
  itemDetail: { fontSize: 12, marginTop: 1 },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: { fontSize: 11, fontWeight: '600' },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
  modalTitle: { fontSize: 17, fontWeight: '800' },
  modalBody: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 },
  modalFooter: { flexDirection: 'row', padding: 20, borderTopWidth: 1, gap: 12 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  modalCancelBtn: { borderWidth: 1, backgroundColor: 'transparent' },
  modalConfirmBtn: {},
  modalBtnText: { fontSize: 15, fontWeight: '700' },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  assignedText: { fontSize: 12, fontWeight: '600' },
});
