// screens/HRScreen.tsx
// Full ERP HR Module — search, department filter, status filter,
// employee detail modal, add employee modal, edit status

import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  CheckCircle2,
  ChevronDown,
  Filter,
  Plus,
  Search,
  Users,
  X,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { HrService } from '@/services';
import {
  MasterItem,
  useDepartments,
  useRoleLabels,
} from '@/contexts/MasterFileContext';

// ─── Types ────────────────────────────────────────────────────────────────────

type EmployeeStatus = 'Active' | 'On Leave' | 'Contract';

interface Employee {
  id: string;
  name: string;
  role: string;
  department: string;
  status: EmployeeStatus;
  salary: number;
  hireDate: string;
  email: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
// DEPT_COLORS, DEPARTMENTS, ROLE_OPTIONS are now live from MasterFileContext

const STATUS_STYLES: Record<EmployeeStatus, { bg: string; text: string }> = {
  Active: { bg: 'rgba(16,185,129,0.14)', text: '#10B981' },
  'On Leave': { bg: 'rgba(245,158,11,0.14)', text: '#F59E0B' },
  Contract: { bg: 'rgba(139,92,246,0.14)', text: '#8B5CF6' },
};

const ALL_STATUSES: EmployeeStatus[] = ['Active', 'On Leave', 'Contract'];

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatPeso(n: number) {
  return '₱' + n.toLocaleString('en-PH');
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-PH', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function yearsOfService(hireDate: string) {
  const diff = Date.now() - new Date(hireDate).getTime();
  const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365));
  const months = Math.floor(
    (diff % (1000 * 60 * 60 * 24 * 365)) / (1000 * 60 * 60 * 24 * 30),
  );
  if (years === 0) return `${months}mo`;
  if (months === 0) return `${years}yr`;
  return `${years}yr ${months}mo`;
}

// ─── Employee Detail Modal ────────────────────────────────────────────────────

function EmployeeDetailModal({
  employee,
  visible,
  onClose,
  onUpdateStatus,
  deptMap,
  colors,
}: {
  employee: Employee | null;
  visible: boolean;
  onClose: () => void;
  onUpdateStatus: (id: string, status: EmployeeStatus) => void;
  deptMap: Record<string, string>;
  colors: any;
}) {
  if (!employee) return null;
  const deptColor = deptMap[employee.department] ?? colors.primary;
  const statusStyle = STATUS_STYLES[employee.status];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {/* Header — dept color */}
        <View style={[edm.header, { backgroundColor: deptColor }]}>
          <View style={edm.avatarLarge}>
            <Text style={edm.avatarText}>{getInitials(employee.name)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={edm.headerName}>{employee.name}</Text>
            <Text style={edm.headerRole}>{employee.role}</Text>
            <Text style={edm.headerDept}>
              {employee.department} · {yearsOfService(employee.hireDate)} tenure
            </Text>
          </View>
          <TouchableOpacity style={edm.closeBtn} onPress={onClose}>
            <X size={16} color="#fff" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Status badge */}
          <View style={[edm.statusRow, { backgroundColor: statusStyle.bg }]}>
            <View
              style={[edm.statusDot, { backgroundColor: statusStyle.text }]}
            />
            <Text style={[edm.statusText, { color: statusStyle.text }]}>
              {employee.status}
            </Text>
          </View>

          {/* Info section */}
          <View
            style={[
              edm.section,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[edm.sectionTitle, { color: colors.textSecondary }]}>
              EMPLOYEE INFORMATION
            </Text>
            {[
              ['Employee ID', employee.id],
              ['Email', employee.email],
              ['Department', employee.department],
              ['Role', employee.role],
              ['Hire Date', formatDate(employee.hireDate)],
              ['Tenure', yearsOfService(employee.hireDate)],
            ].map(([label, value], i, arr) => (
              <View
                key={label}
                style={[
                  edm.row,
                  {
                    borderBottomColor: colors.border,
                    borderBottomWidth: i < arr.length - 1 ? 1 : 0,
                  },
                ]}
              >
                <Text style={[edm.rowLabel, { color: colors.textSecondary }]}>
                  {label}
                </Text>
                <Text style={[edm.rowValue, { color: colors.text }]}>
                  {value}
                </Text>
              </View>
            ))}
          </View>

          {/* Salary */}
          <View
            style={[
              edm.section,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                marginTop: 12,
              },
            ]}
          >
            <Text style={[edm.sectionTitle, { color: colors.textSecondary }]}>
              COMPENSATION
            </Text>
            <View
              style={[
                edm.row,
                { borderBottomColor: 'transparent', borderBottomWidth: 0 },
              ]}
            >
              <Text style={[edm.rowLabel, { color: colors.textSecondary }]}>
                Monthly Salary
              </Text>
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: '900',
                  color: colors.accent,
                }}
              >
                {formatPeso(employee.salary)}
              </Text>
            </View>
          </View>

          {/* Status update */}
          <View
            style={[
              edm.section,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                marginTop: 12,
              },
            ]}
          >
            <Text style={[edm.sectionTitle, { color: colors.textSecondary }]}>
              UPDATE STATUS
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, padding: 12 }}>
              {ALL_STATUSES.map((s) => {
                const ss = STATUS_STYLES[s];
                const isActive = employee.status === s;
                return (
                  <TouchableOpacity
                    key={s}
                    style={[
                      edm.statusBtn,
                      {
                        backgroundColor: isActive ? ss.text : ss.bg,
                        borderColor: ss.text,
                        flex: 1,
                      },
                    ]}
                    onPress={() => {
                      onUpdateStatus(employee.id, s);
                      onClose();
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '700',
                        color: isActive ? '#fff' : ss.text,
                        textAlign: 'center',
                      }}
                    >
                      {s}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const edm = StyleSheet.create({
  header: {
    paddingTop: 52,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: '900', color: '#fff' },
  headerName: { fontSize: 18, fontWeight: '700', color: '#fff' },
  headerRole: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 1 },
  headerDept: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 13, fontWeight: '700' },
  section: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    padding: 12,
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  rowLabel: { fontSize: 13, fontWeight: '500' },
  rowValue: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  statusBtn: {
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
  },
});

// ─── Searchable Dropdown ──────────────────────────────────────────────────────

function SearchableDropdown({
  label,
  value,
  options,
  onSelect,
  colors,
  placeholder,
}: {
  label: string;
  value: string;
  options: { label: string; color?: string }[];
  onSelect: (v: string) => void;
  colors: any;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filteredOpts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? options.filter((o) => o.label.toLowerCase().includes(q))
      : options;
  }, [options, query]);

  const selectedColor = options.find((o) => o.label === value)?.color;

  return (
    <View style={{ marginBottom: 14 }}>
      <Text
        style={{
          fontSize: 11,
          fontWeight: '700',
          color: colors.textSecondary,
          marginBottom: 5,
          textTransform: 'uppercase',
          letterSpacing: 0.6,
        }}
      >
        {label}
      </Text>
      <TouchableOpacity
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 11,
          backgroundColor: colors.background,
        }}
        onPress={() => {
          setOpen(true);
          setQuery('');
        }}
        activeOpacity={0.75}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            flex: 1,
          }}
        >
          {selectedColor && (
            <View
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: selectedColor,
              }}
            />
          )}
          <Text
            style={{
              fontSize: 14,
              color: value ? colors.text : colors.textSecondary,
              flex: 1,
            }}
            numberOfLines={1}
          >
            {value || placeholder || 'Select…'}
          </Text>
        </View>
        <ChevronDown size={16} color={colors.textSecondary} strokeWidth={2} />
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.45)',
            justifyContent: 'center',
            padding: 24,
          }}
          activeOpacity={1}
          onPress={() => setOpen(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 16,
                overflow: 'hidden',
                maxHeight: 460,
              }}
            >
              <View
                style={{
                  padding: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                }}
              >
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: '700',
                    color: colors.text,
                    marginBottom: 10,
                  }}
                >
                  {label}
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: colors.background,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: colors.border,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                  }}
                >
                  <Search
                    size={13}
                    color={colors.textSecondary}
                    strokeWidth={2}
                  />
                  <TextInput
                    style={{ flex: 1, fontSize: 13, color: colors.text }}
                    placeholder={`Search ${label.toLowerCase()}…`}
                    placeholderTextColor={colors.textSecondary}
                    value={query}
                    onChangeText={setQuery}
                    autoFocus
                    autoCorrect={false}
                  />
                  {query.length > 0 && (
                    <TouchableOpacity onPress={() => setQuery('')}>
                      <X
                        size={13}
                        color={colors.textSecondary}
                        strokeWidth={2}
                      />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              <FlatList
                data={filteredOpts}
                keyExtractor={(item) => item.label}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                  <View style={{ padding: 24, alignItems: 'center' }}>
                    <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                      No results for "{query}"
                    </Text>
                  </View>
                }
                renderItem={({ item }) => {
                  const isActive = item.label === value;
                  return (
                    <TouchableOpacity
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingHorizontal: 16,
                        paddingVertical: 13,
                        borderBottomWidth: 1,
                        borderBottomColor: colors.border,
                        backgroundColor: isActive
                          ? colors.primary + '12'
                          : 'transparent',
                      }}
                      onPress={() => {
                        onSelect(item.label);
                        setOpen(false);
                      }}
                      activeOpacity={0.75}
                    >
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 10,
                          flex: 1,
                        }}
                      >
                        {item.color && (
                          <View
                            style={{
                              width: 14,
                              height: 14,
                              borderRadius: 7,
                              backgroundColor: item.color,
                              flexShrink: 0,
                            }}
                          />
                        )}
                        <Text
                          style={{
                            fontSize: 14,
                            color: isActive ? colors.primary : colors.text,
                            fontWeight: isActive ? '600' : '400',
                            flex: 1,
                          }}
                        >
                          {item.label}
                        </Text>
                      </View>
                      {isActive && (
                        <CheckCircle2
                          size={16}
                          color={colors.primary}
                          strokeWidth={2}
                        />
                      )}
                    </TouchableOpacity>
                  );
                }}
              />
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ─── Add Employee Modal ───────────────────────────────────────────────────────

function AddEmployeeModal({
  visible,
  onClose,
  onAdd,
  colors,
  deptObjects,
  roleOptions,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (emp: Employee) => void;
  colors: any;
  deptObjects: MasterItem[];
  roleOptions: string[];
}) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [department, setDepartment] = useState('');
  const [salary, setSalary] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<EmployeeStatus>('Active');
  const [error, setError] = useState('');

  const handleAdd = () => {
    // Name
    if (!name.trim() || name.trim().length < 2) {
      setError('Full name must be at least 2 characters.');
      return;
    }
    if (!/^[a-zA-ZÀ-ÿ\s.\'\-]+$/.test(name.trim())) {
      setError('Full name can only contain letters, spaces, and punctuation.');
      return;
    }

    // Role
    if (!role.trim()) {
      setError('Please select a role.');
      return;
    }

    // Department
    if (!department.trim()) {
      setError('Please select a department.');
      return;
    }

    // Email (optional but validate if filled)
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }

    // Salary
    const salaryNum = parseFloat(salary);
    if (!salary.trim() || isNaN(salaryNum) || salaryNum <= 0) {
      setError('Enter a valid monthly salary greater than zero.');
      return;
    }
    if (salaryNum > 9999999) {
      setError('Salary amount seems too high. Please check.');
      return;
    }
  };

  const s = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: 32,
      maxHeight: '93%',
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
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
    deptRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    deptPill: {
      paddingHorizontal: 11,
      paddingVertical: 7,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    statRow: { flexDirection: 'row', gap: 8 },
    statBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1.5,
      alignItems: 'center',
    },
    addBtn: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 15,
      alignItems: 'center',
      marginTop: 20,
    },
    addTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
    errTxt: { fontSize: 12, color: colors.error, marginTop: 6 },
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={s.overlay}>
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={s.sheet}>
          <View style={s.handle} />
          <View style={s.header}>
            <Text style={s.title}>Add Employee</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={20} color={colors.textSecondary} strokeWidth={2} />
            </TouchableOpacity>
          </View>
          <ScrollView
            contentContainerStyle={{ padding: 20 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={s.label}>FULL NAME *</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. Maria Santos"
              placeholderTextColor={colors.textSecondary}
              value={name}
              onChangeText={setName}
              autoCorrect={false}
            />

            <Text style={s.label}>EMAIL</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. m.santos@rightapps.ph"
              placeholderTextColor={colors.textSecondary}
              value={email}
              onChangeText={(v) => setEmail(v.trim())}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <SearchableDropdown
              label="Role"
              value={role}
              options={roleOptions.map((r: string) => ({ label: r }))}
              onSelect={setRole}
              colors={colors}
              placeholder="Select role…"
            />

            <SearchableDropdown
              label="Department"
              value={department}
              options={deptObjects}
              onSelect={setDepartment}
              colors={colors}
              placeholder="Select department…"
            />

            <Text style={s.label}>MONTHLY SALARY ₱ *</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. 25000"
              placeholderTextColor={colors.textSecondary}
              value={salary}
              onChangeText={(v) => setSalary(v.replace(/[^0-9.]/g, ''))}
              keyboardType="decimal-pad"
            />

            <Text style={s.label}>EMPLOYMENT STATUS</Text>
            <View style={s.statRow}>
              {ALL_STATUSES.map((st) => {
                const ss = STATUS_STYLES[st];
                const isActive = status === st;
                return (
                  <TouchableOpacity
                    key={st}
                    style={[
                      s.statBtn,
                      {
                        backgroundColor: isActive ? ss.text : ss.bg,
                        borderColor: ss.text,
                      },
                    ]}
                    onPress={() => setStatus(st)}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '700',
                        color: isActive ? '#fff' : ss.text,
                      }}
                    >
                      {st}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {error ? <Text style={s.errTxt}>{error}</Text> : null}

            <TouchableOpacity
              style={s.addBtn}
              onPress={handleAdd}
              activeOpacity={0.85}
            >
              <Text style={s.addTxt}>Add Employee</Text>
            </TouchableOpacity>
            <View style={{ height: 8 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Employee Card ────────────────────────────────────────────────────────────

function EmployeeCard({
  item,
  isTablet,
  isDesktop,
  onPress,
  deptMap,
  colors,
}: {
  item: Employee;
  isTablet: boolean;
  isDesktop: boolean;
  onPress: () => void;
  deptMap: Record<string, string>;
  colors: any;
}) {
  const deptColor = deptMap[item.department] ?? colors.primary;
  const statusStyle = STATUS_STYLES[item.status];

  return (
    <TouchableOpacity
      style={[
        ecard.card,
        { backgroundColor: colors.card, borderColor: colors.border },
        isTablet && { flex: 1 },
      ]}
      onPress={onPress}
      activeOpacity={0.82}
    >
      <View style={[ecard.avatar, { backgroundColor: deptColor }]}>
        <Text style={ecard.avatarText}>{getInitials(item.name)}</Text>
      </View>
      <View style={ecard.info}>
        <View style={ecard.topRow}>
          <Text style={[ecard.name, { color: colors.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          {isDesktop && (
            <Text
              style={{
                fontSize: 11,
                color: colors.textSecondary,
                fontFamily: 'monospace',
              }}
            >
              {item.id}
            </Text>
          )}
        </View>
        <Text
          style={[ecard.role, { color: colors.textSecondary }]}
          numberOfLines={1}
        >
          {item.role}
        </Text>
        {isDesktop && (
          <Text
            style={{
              fontSize: 11,
              color: colors.textSecondary,
              marginBottom: 6,
            }}
          >
            {item.email}
          </Text>
        )}
        <View style={ecard.tagsRow}>
          <View style={[ecard.deptBadge, { backgroundColor: deptColor }]}>
            <Text style={ecard.deptText}>{item.department}</Text>
          </View>
          <View
            style={[ecard.statusBadge, { backgroundColor: statusStyle.bg }]}
          >
            <Text style={[ecard.statusText, { color: statusStyle.text }]}>
              {item.status}
            </Text>
          </View>
          {isTablet && (
            <View
              style={[
                ecard.statusBadge,
                { backgroundColor: colors.background },
              ]}
            >
              <Text style={[ecard.statusText, { color: colors.textSecondary }]}>
                {formatPeso(item.salary)}/mo
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const ecard = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 0,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  avatarText: { fontSize: 15, fontWeight: '900', color: '#fff' },
  info: { flex: 1, minWidth: 0 },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  name: { fontSize: 15, fontWeight: '700', flex: 1, marginRight: 8 },
  role: { fontSize: 13, marginBottom: 6 },
  tagsRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  deptBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  deptText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '600' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function HRScreen() {
  const { colors } = useTheme();
  const { width } = Dimensions.get('window');
  const isTablet = width >= 768;
  const isDesktop = width >= 1024;

  // ── MasterFile context — live data ─────────────────────────────────────────
  const deptObjects = useDepartments();
  const ROLE_OPTIONS = useRoleLabels();
  const DEPARTMENTS = ['All', ...deptObjects.map((d) => d.label)];
  const deptMap = Object.fromEntries(
    deptObjects.map((d) => [d.label, d.color ?? colors.primary]),
  ) as Record<string, string>;

  // Responsive columns: 1 mobile, 2 tablet, 3 desktop
  const numColumns = isDesktop ? 3 : isTablet ? 2 : 1;

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState('');
  const [loadingEmployees, setLoadingEmployees] = useState(true);

  React.useEffect(() => {
    const loadEmployees = async () => {
      setLoadingEmployees(true);
      try {
        const staff = await HrService.getAllStaffs();
        if (Array.isArray(staff)) {
          setEmployees(
            staff.map((u) => ({
              id: String(u.id),
              name: u.fullname || u.name || 'Unknown',
              role: u.role || 'Staff',
              department: u.department || 'General',
              status: 'Active',
              salary: Number(u.salary || 0),
              hireDate: u.createdAt || new Date().toISOString(),
              email: u.email || 'n/a',
            })),
          );
        }
      } catch (err) {
        console.warn('Failed to load employees', err);
      } finally {
        setLoadingEmployees(false);
      }
    };

    loadEmployees();
  }, []);
  const [deptFilter, setDeptFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<EmployeeStatus | 'All'>(
    'All',
  );
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [addVisible, setAddVisible] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees.filter((emp) => {
      const matchSearch =
        !q ||
        emp.name.toLowerCase().includes(q) ||
        emp.role.toLowerCase().includes(q) ||
        emp.department.toLowerCase().includes(q) ||
        emp.email.toLowerCase().includes(q);
      const matchDept = deptFilter === 'All' || emp.department === deptFilter;
      const matchStatus = statusFilter === 'All' || emp.status === statusFilter;
      return matchSearch && matchDept && matchStatus;
    });
  }, [employees, search, deptFilter, statusFilter]);

  // Live stats from filtered data
  const activeCount = filtered.filter((e) => e.status === 'Active').length;
  const onLeaveCount = filtered.filter((e) => e.status === 'On Leave').length;
  const totalSalary = filtered.reduce((s, e) => s + e.salary, 0);
  const uniqueDepts = [...new Set(filtered.map((e) => e.department))].length;

  const handleUpdateStatus = (id: string, status: EmployeeStatus) => {
    setEmployees((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status } : e)),
    );
  };

  const handleAddEmployee = (emp: Employee) => {
    setEmployees((prev) => [emp, ...prev]);
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { padding: 16, paddingBottom: 0 },
    metaRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
    metaCard: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 10,
      padding: isTablet ? 14 : 11,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    metaValue: {
      fontSize: isDesktop ? 22 : 18,
      fontWeight: '800',
      color: colors.text,
    },
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
      gap: 12,
    },
    filterLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.textSecondary,
      letterSpacing: 0.8,
      marginBottom: 6,
    },
    pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    pill: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pillActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primary,
    },
    pillText: { fontSize: 12, fontWeight: '600', color: colors.text },
    pillTextAct: { color: '#fff' },
    listContent: { padding: 16, paddingTop: 0, gap: 10, paddingBottom: 40 },
    resultCount: {
      fontSize: 11,
      color: colors.textSecondary,
      paddingHorizontal: 16,
      paddingBottom: 6,
    },
    emptyWrap: { flex: 1, alignItems: 'center', paddingTop: 60 },
    emptyText: { fontSize: 14, color: colors.textSecondary, marginTop: 12 },
    salaryCard: {
      marginHorizontal: 16,
      marginBottom: 8,
      backgroundColor: colors.primary,
      borderRadius: 12,
      padding: 14,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
  });

  if (loadingEmployees) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 12, color: colors.textSecondary }}>
          Loading staff data...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Meta cards — update live with filters */}
      <View style={styles.header}>
        <View style={styles.metaRow}>
          <View style={styles.metaCard}>
            <Text style={styles.metaValue}>{filtered.length}</Text>
            <Text style={styles.metaLabel}>Total</Text>
          </View>
          <View style={styles.metaCard}>
            <Text style={[styles.metaValue, { color: colors.success }]}>
              {activeCount}
            </Text>
            <Text style={styles.metaLabel}>Active</Text>
          </View>
          <View style={styles.metaCard}>
            <Text style={[styles.metaValue, { color: '#F59E0B' }]}>
              {onLeaveCount}
            </Text>
            <Text style={styles.metaLabel}>On Leave</Text>
          </View>
          <View style={styles.metaCard}>
            <Text style={styles.metaValue}>{uniqueDepts}</Text>
            <Text style={styles.metaLabel}>Depts</Text>
          </View>
        </View>
      </View>

      {/* Monthly payroll summary card */}
      {filtered.length > 0 && (
        <View style={styles.salaryCard}>
          <View>
            <Text
              style={{
                fontSize: 11,
                color: 'rgba(255,255,255,0.6)',
                fontWeight: '600',
                letterSpacing: 0.5,
              }}
            >
              {deptFilter === 'All'
                ? 'TOTAL MONTHLY PAYROLL'
                : `${deptFilter.toUpperCase()} PAYROLL`}
            </Text>
            <Text
              style={{
                fontSize: 20,
                fontWeight: '900',
                color: '#fff',
                marginTop: 2,
              }}
            >
              {formatPeso(totalSalary)}
            </Text>
          </View>
          <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
            {filtered.length} employee{filtered.length !== 1 ? 's' : ''}
          </Text>
        </View>
      )}

      {/* Toolbar */}
      <View style={styles.toolbar}>
        <View style={styles.searchBox}>
          <Search size={13} color={colors.textSecondary} strokeWidth={2} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, role, department…"
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
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setAddVisible(true)}
        >
          <Plus size={18} color="#fff" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {/* Filter panel */}
      {filterOpen && (
        <View style={styles.filterPanel}>
          <View>
            <Text style={styles.filterLabel}>DEPARTMENT</Text>
            <View style={styles.pillRow}>
              {DEPARTMENTS.map((dept) => (
                <TouchableOpacity
                  key={dept}
                  style={[
                    styles.pill,
                    deptFilter === dept && styles.pillActive,
                    dept !== 'All' &&
                      deptFilter !== dept && {
                        borderColor: deptMap[dept] ?? colors.border,
                      },
                  ]}
                  onPress={() => setDeptFilter(dept)}
                >
                  <Text
                    style={[
                      styles.pillText,
                      deptFilter === dept && styles.pillTextAct,
                      dept !== 'All' &&
                        deptFilter !== dept && {
                          color: deptMap[dept] ?? colors.text,
                        },
                    ]}
                  >
                    {dept}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View>
            <Text style={styles.filterLabel}>STATUS</Text>
            <View style={styles.pillRow}>
              {(['All', ...ALL_STATUSES] as (EmployeeStatus | 'All')[]).map(
                (s) => (
                  <TouchableOpacity
                    key={s}
                    style={[
                      styles.pill,
                      statusFilter === s && styles.pillActive,
                    ]}
                    onPress={() => setStatusFilter(s)}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        statusFilter === s && styles.pillTextAct,
                      ]}
                    >
                      {s}
                    </Text>
                  </TouchableOpacity>
                ),
              )}
            </View>
          </View>
        </View>
      )}

      {/* Result count */}
      <Text style={styles.resultCount}>
        {filtered.length} employee{filtered.length !== 1 ? 's' : ''}
        {search ? ` matching "${search}"` : ''}
        {deptFilter !== 'All' ? ` · ${deptFilter}` : ''}
        {statusFilter !== 'All' ? ` · ${statusFilter}` : ''}
      </Text>

      {/* Employee list — responsive columns */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          filtered.length === 0 && { flex: 1 },
        ]}
        showsVerticalScrollIndicator={false}
        numColumns={numColumns}
        key={String(numColumns)}
        columnWrapperStyle={numColumns > 1 ? { gap: 10 } : undefined}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Users size={48} color={colors.border} strokeWidth={1} />
            <Text style={styles.emptyText}>No employees found</Text>
          </View>
        }
        renderItem={({ item }) => (
          <EmployeeCard
            item={item}
            isTablet={isTablet}
            isDesktop={isDesktop}
            deptMap={deptMap}
            colors={colors}
            onPress={() => {
              setSelectedEmp(item);
              setDetailVisible(true);
            }}
          />
        )}
      />

      {/* Modals */}
      <EmployeeDetailModal
        employee={selectedEmp}
        visible={detailVisible}
        deptMap={deptMap}
        onClose={() => setDetailVisible(false)}
        onUpdateStatus={handleUpdateStatus}
        colors={colors}
      />
      <AddEmployeeModal
        visible={addVisible}
        onClose={() => setAddVisible(false)}
        onAdd={handleAddEmployee}
        deptObjects={deptObjects}
        roleOptions={ROLE_OPTIONS}
        colors={colors}
      />
    </View>
  );
}
