// screens/HRScreen.tsx
// Full ERP HR Module — responsive card grid + table view (mirrors InventoryScreen patterns)
// Breakpoints: desktop ≥1024, tablet ≥768, mobile <768
// AsyncStorage: persists viewMode, deptFilter, statusFilter, filterOpen

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CheckCircle2,
  ChevronDown,
  Filter,
  LayoutGrid,
  List,
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
  useMasterFile,
} from '@/contexts/MasterFileContext';

// ─── AsyncStorage Keys ────────────────────────────────────────────────────────

const STORAGE_KEYS = {
  VIEW_MODE: 'hr_view_mode',
  DEPT_FILTER: 'hr_dept_filter',
  STATUS_FILTER: 'hr_status_filter',
  FILTER_OPEN: 'hr_filter_open',
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

type EmployeeStatus = 'Active' | 'On Leave' | 'Contract';
type ViewMode = 'card' | 'table';

interface Employee {
  id: string;
  name: string;
  role?: string;
  department: string;
  status: EmployeeStatus;
  salary: number;
  hireDate: string;
  email: string;
  position?: string;
  profilePhoto?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<EmployeeStatus, { bg: string; text: string }> = {
  Active: { bg: 'rgba(16,185,129,0.14)', text: '#10B981' },
  'On Leave': { bg: 'rgba(245,158,11,0.14)', text: '#F59E0B' },
  Contract: { bg: 'rgba(139,92,246,0.14)', text: '#8B5CF6' },
};

const ALL_STATUSES: EmployeeStatus[] = ['Active', 'On Leave', 'Contract'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
    month: 'short',
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

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({
  name,
  profilePhoto,
  size,
  color,
}: {
  name: string;
  profilePhoto?: string;
  size: number;
  color: string;
}) {
  const [imgError, setImgError] = useState(false);
  const showImage = profilePhoto && !imgError;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: showImage ? 'transparent' : color,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {showImage ? (
        <Image
          source={{ uri: profilePhoto }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          onError={() => setImgError(true)}
          resizeMode="cover"
        />
      ) : (
        <Text
          style={{
            fontSize: size * 0.34,
            fontWeight: '900',
            color: '#fff',
            lineHeight: size * 0.36,
          }}
        >
          {getInitials(name)}
        </Text>
      )}
    </View>
  );
}

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
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
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
        onPress={() => { setOpen(true); setQuery(''); }}
        activeOpacity={0.75}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
          {selectedColor && (
            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: selectedColor }} />
          )}
          <Text
            style={{ fontSize: 14, color: value ? colors.text : colors.textSecondary, flex: 1 }}
            numberOfLines={1}
          >
            {value || placeholder || 'Select…'}
          </Text>
        </View>
        <ChevronDown size={16} color={colors.textSecondary} strokeWidth={2} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 24 }}
          activeOpacity={1}
          onPress={() => setOpen(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={() => { }}>
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 16,
                overflow: 'hidden',
                maxHeight: 460,
                width: '100%',
                maxWidth: 480,
                alignSelf: 'center',
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
                  style={{ fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 10 }}
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
                  <Search size={13} color={colors.textSecondary} strokeWidth={2} />
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
                      <X size={13} color={colors.textSecondary} strokeWidth={2} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              <FlatList
                data={filteredOpts}
                keyExtractor={(item, index) => `${item.label}-${index}`}
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
                        backgroundColor: isActive ? colors.primary + '12' : 'transparent',
                      }}
                      onPress={() => { onSelect(item.label); setOpen(false); }}
                      activeOpacity={0.75}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
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
                        <CheckCircle2 size={16} color={colors.primary} strokeWidth={2} />
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

// ─── Employee Detail Modal ────────────────────────────────────────────────────

function EmployeeDetailModal({
  employee,
  visible,
  onClose,
  onUpdateStatus,
  onUpdatePosition,
  deptMap,
  positions,
  colors,
}: {
  employee: Employee | null;
  visible: boolean;
  onClose: () => void;
  onUpdateStatus: (id: string, status: EmployeeStatus) => void;
  onUpdatePosition: (id: string, positionId: string) => void;
  deptMap: Record<string, string>;
  positions: MasterItem[];
  colors: any;
}) {
  if (!employee) return null;
  const deptColor = deptMap[employee.department] ?? colors.primary;
  const statusStyle = STATUS_STYLES[employee.status];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.45)',
          justifyContent: 'center',
          alignItems: 'center',
          paddingVertical: 40,
          paddingHorizontal: 24,
        }}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => { }}
          style={{ width: '100%', maxWidth: 560 }}
        >
          <View
            style={{
              borderRadius: 20,
              overflow: 'hidden',
              backgroundColor: colors.background,
              maxHeight: '90%',
            }}
          >
            {/* Header */}
            <View style={[edm.header, { backgroundColor: deptColor }]}>
              <Avatar
                name={employee.name}
                profilePhoto={employee.profilePhoto}
                size={56}
                color="rgba(255,255,255,0.25)"
              />
              <View style={{ flex: 1 }}>
                <Text style={edm.headerName}>{employee.name}</Text>
                <Text style={edm.headerRole}>{employee.role || 'No role assigned'}</Text>
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
                <View style={[edm.statusDot, { backgroundColor: statusStyle.text }]} />
                <Text style={[edm.statusText, { color: statusStyle.text }]}>
                  {employee.status}
                </Text>
              </View>

              {/* Info */}
              <View
                style={[edm.section, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <Text style={[edm.sectionTitle, { color: colors.textSecondary }]}>
                  EMPLOYEE INFORMATION
                </Text>
                {(
                  [
                    ['Email', employee.email],
                    ['Department', employee.department],
                    ['Role', employee.role],
                    ['Position', employee.position || 'No position'],
                    ['Hire Date', formatDate(employee.hireDate)],
                    ['Tenure', yearsOfService(employee.hireDate)],
                  ] as [string, string | undefined][]
                ).map(([label, value], i, arr) => (
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
                    <Text style={[edm.rowLabel, { color: colors.textSecondary }]}>{label}</Text>
                    <Text style={[edm.rowValue, { color: colors.text }]}>{value}</Text>
                  </View>
                ))}
              </View>

              {/* Salary */}
              <View
                style={[
                  edm.section,
                  { backgroundColor: colors.card, borderColor: colors.border, marginTop: 12 },
                ]}
              >
                <Text style={[edm.sectionTitle, { color: colors.textSecondary }]}>COMPENSATION</Text>
                <View style={[edm.row, { borderBottomColor: 'transparent', borderBottomWidth: 0 }]}>
                  <Text style={[edm.rowLabel, { color: colors.textSecondary }]}>Monthly Salary</Text>
                  <Text style={{ fontSize: 22, fontWeight: '900', color: colors.accent }}>
                    {formatPeso(employee.salary)}
                  </Text>
                </View>
              </View>

              {/* Position assignment */}
              <View
                style={[
                  edm.section,
                  { backgroundColor: colors.card, borderColor: colors.border, marginTop: 12 },
                ]}
              >
                <Text style={[edm.sectionTitle, { color: colors.textSecondary }]}>
                  POSITION ASSIGNMENT
                </Text>
                <View style={{ padding: 12 }}>
                  <SearchableDropdown
                    label="Assign Position"
                    value={employee.position || 'No position'}
                    options={positions.map((p) => ({ label: p.label }))}
                    onSelect={(pos) => {
                      const posItem = positions.find((p) => p.label === pos);
                      if (posItem) onUpdatePosition(employee.id, posItem.id);
                    }}
                    colors={colors}
                    placeholder="Select position…"
                  />
                </View>
              </View>

              {/* Status update */}
              <View
                style={[
                  edm.section,
                  { backgroundColor: colors.card, borderColor: colors.border, marginTop: 12 },
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
                        onPress={() => { onUpdateStatus(employee.id, s); onClose(); }}
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
        </TouchableOpacity>
      </TouchableOpacity>
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
  rowValue: { fontSize: 13, fontWeight: '600', textAlign: 'right', flex: 1, marginLeft: 16 },
  statusBtn: {
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
  },
});

// ─── Add Employee Modal ───────────────────────────────────────────────────────

function AddEmployeeModal({
  visible,
  onClose,
  onAdd,
  colors,
  deptObjects,
  roleOptions,
  positions,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (emp: Employee) => void;
  colors: any;
  deptObjects: MasterItem[];
  roleOptions: string[];
  positions: MasterItem[];
}) {
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [position, setPosition] = useState('');
  const [salary, setSalary] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<EmployeeStatus>('Active');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!name.trim() || name.trim().length < 2) {
      setError('Full name must be at least 2 characters.');
      return;
    }
    if (!/^[a-zA-ZÀ-ÿ\s.'\-]+$/.test(name.trim())) {
      setError('Full name can only contain letters, spaces, and punctuation.');
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      setError('A valid email address is required.');
      return;
    }
    if (!password.trim() || password.trim().length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    const salaryNum = parseFloat(salary);
    if (!salary.trim() || isNaN(salaryNum) || salaryNum <= 0) {
      setError('Enter a valid monthly salary greater than zero.');
      return;
    }
    if (salaryNum > 9999999) {
      setError('Salary amount seems too high. Please check.');
      return;
    }

    const departmentIdRaw = deptObjects.find((d) => d.label === department)?.id;
    const departmentId = departmentIdRaw ? Number(departmentIdRaw) : undefined;
    const positionId = positions.find((p) => p.label === position)?.id;

    setLoading(true);
    try {
      const createdUser = await HrService.createHRUser({
        fullname: name.trim(),
        email: email.trim(),
        password: password.trim(),
        departmentId,
        positionId,
      });

      const newEmployee: Employee = {
        id: String(createdUser.id),
        name: createdUser.fullname,
        department: department.trim() || 'Unassigned',
        status,
        salary: salaryNum,
        position: position.trim() || undefined,
        hireDate: createdUser.createdAt || new Date().toISOString(),
        email: createdUser.email,
        profilePhoto: createdUser.profilePhoto,
      };

      onAdd(newEmployee);
    } catch (err: any) {
      setError(err?.message || 'Failed to create employee. Please try again.');
      return;
    } finally {
      setLoading(false);
    }

    setName('');
    setDepartment('');
    setPosition('');
    setEmail('');
    setPassword('');
    setSalary('');
    setStatus('Active');
    setError('');
    onClose();
  };

  const s = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 40,
      paddingHorizontal: 24,
    },
    sheet: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      width: '100%',
      maxWidth: 520,
      maxHeight: '93%',
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
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} onPress={() => { }}>
          <View style={s.sheet}>
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
                placeholder="e.g. m.santos@company.ph"
                placeholderTextColor={colors.textSecondary}
                value={email}
                onChangeText={(v) => setEmail(v.trim())}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Text style={s.label}>PASSWORD *</Text>
              <TextInput
                style={s.input}
                placeholder="Enter a password"
                placeholderTextColor={colors.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCorrect={false}
                autoCapitalize="none"
              />

              <SearchableDropdown
                label="Department"
                value={department}
                options={deptObjects}
                onSelect={setDepartment}
                colors={colors}
                placeholder="Select department…"
              />
              <SearchableDropdown
                label="Position"
                value={position}
                options={positions.map((p) => ({ label: p.label }))}
                onSelect={setPosition}
                colors={colors}
                placeholder="Select position…"
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
                        { backgroundColor: isActive ? ss.text : ss.bg, borderColor: ss.text },
                      ]}
                      onPress={() => setStatus(st)}
                    >
                      <Text
                        style={{ fontSize: 12, fontWeight: '700', color: isActive ? '#fff' : ss.text }}
                      >
                        {st}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {error ? <Text style={s.errTxt}>{error}</Text> : null}

              <TouchableOpacity
                style={[s.addBtn, loading && { opacity: 0.7 }]}
                onPress={handleAdd}
                activeOpacity={0.85}
                disabled={loading}
              >
                <Text style={s.addTxt}>
                  {loading ? 'Creating employee…' : 'Add Employee'}
                </Text>
              </TouchableOpacity>
              <View style={{ height: 8 }} />
            </ScrollView>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Desktop Employee Card (vertical, like InventoryScreen desktop card) ──────

function DesktopEmployeeCard({
  item,
  deptMap,
  colors,
  onPress,
}: {
  item: Employee;
  deptMap: Record<string, string>;
  colors: any;
  onPress: () => void;
}) {
  const deptColor = deptMap[item.department] ?? colors.primary;
  const statusStyle = STATUS_STYLES[item.status];

  return (
    <Pressable
      // @ts-ignore
      style={({ hovered }: any) => ({
        flex: 1,
        borderRadius: 14,
        borderWidth: 1,
        overflow: 'hidden',
        backgroundColor: colors.card,
        borderColor: colors.border,
        minWidth: 0,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: hovered ? 4 : 2 },
        shadowOpacity: hovered ? 0.12 : 0.06,
        shadowRadius: hovered ? 10 : 4,
        elevation: hovered ? 6 : 2,
        transform: [{ translateY: hovered ? -2 : 0 }],
      })}
      onPress={onPress}
    >
      {/* Dept color header strip */}
      <View style={{ height: 5, backgroundColor: deptColor }} />

      {/* Avatar + name header */}
      <View
        style={{
          padding: 16,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <Avatar name={item.name} profilePhoto={item.profilePhoto} size={44} color={deptColor} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={{ fontSize: 14, fontWeight: '700', color: colors.text }}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          <Text
            style={{ fontSize: 12, color: colors.textSecondary, marginTop: 1 }}
            numberOfLines={1}
          >
            {item.role || 'No role'}
          </Text>
        </View>
        <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, flexShrink: 0 }, { backgroundColor: statusStyle.bg }]}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: statusStyle.text }} />
          <Text style={{ fontSize: 10, fontWeight: '700', color: statusStyle.text }}>
            {item.status}
          </Text>
        </View>
      </View>

      {/* Details body */}
      <View style={{ padding: 14, gap: 8 }}>
        {/* Department tag */}
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 20,
              borderWidth: 1,
              backgroundColor: deptColor + '22',
              borderColor: deptColor + '55',
            }}
          >
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: deptColor }} />
            <Text style={{ fontSize: 11, fontWeight: '600', color: deptColor }} numberOfLines={1}>
              {item.department}
            </Text>
          </View>
          {item.position && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 20,
                borderWidth: 1,
                backgroundColor: colors.primary + '18',
                borderColor: colors.primary + '40',
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '600', color: colors.primary }} numberOfLines={1}>
                {item.position}
              </Text>
            </View>
          )}
        </View>

        {/* Salary + tenure row */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
          <View>
            <Text style={{ fontSize: 10, color: colors.textSecondary, letterSpacing: 0.4, marginBottom: 2 }}>
              SALARY
            </Text>
            <Text style={{ fontSize: 14, fontWeight: '800', color: colors.accent }}>
              {formatPeso(item.salary)}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 10, color: colors.textSecondary, letterSpacing: 0.4, marginBottom: 2 }}>
              TENURE
            </Text>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>
              {yearsOfService(item.hireDate)}
            </Text>
          </View>
        </View>

        {/* Email */}
        <Text
          style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}
          numberOfLines={1}
        >
          {item.email}
        </Text>
      </View>
    </Pressable>
  );
}

// ─── Mobile/Tablet Employee Card (horizontal, original style) ─────────────────

function EmployeeCard({
  item,
  isTablet,
  deptMap,
  colors,
  onPress,
}: {
  item: Employee;
  isTablet: boolean;
  deptMap: Record<string, string>;
  colors: any;
  onPress: () => void;
}) {
  const deptColor = deptMap[item.department] ?? colors.primary;
  const statusStyle = STATUS_STYLES[item.status];

  return (
    <TouchableOpacity
      style={[
        {
          backgroundColor: colors.card,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.border,
          overflow: 'hidden',
        },
        isTablet && { flex: 1 },
      ]}
      onPress={onPress}
      activeOpacity={0.82}
    >
      <View style={{ height: 4, backgroundColor: deptColor }} />
      <View style={{ padding: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <Avatar name={item.name} profilePhoto={item.profilePhoto} size={42} color={deptColor} />
          <View style={{ flex: 1, marginLeft: 10, minWidth: 0 }}>
            <Text
              style={{ fontSize: 14, fontWeight: '700', color: colors.text }}
              numberOfLines={1}
            >
              {item.name}
            </Text>
            <Text
              style={{ fontSize: 12, color: colors.textSecondary, marginTop: 1 }}
              numberOfLines={1}
            >
              {item.role || 'No role'}
            </Text>
          </View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 20,
              flexShrink: 0,
              backgroundColor: statusStyle.bg,
            }}
          >
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: statusStyle.text }} />
            <Text style={{ fontSize: 10, fontWeight: '700', color: statusStyle.text }}>
              {item.status}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 20,
              borderWidth: 1,
              backgroundColor: deptColor + '22',
              borderColor: deptColor + '55',
              maxWidth: '60%',
            }}
          >
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: deptColor, flexShrink: 0 }} />
            <Text style={{ fontSize: 11, fontWeight: '600', color: deptColor }} numberOfLines={1}>
              {item.department}
            </Text>
          </View>
          {item.position && (
            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 20,
                borderWidth: 1,
                backgroundColor: colors.primary + '18',
                borderColor: colors.primary + '40',
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '600', color: colors.primary }} numberOfLines={1}>
                {item.position}
              </Text>
            </View>
          )}
        </View>

        {isTablet && (
          <View
            style={{
              flexDirection: 'row',
              borderTopWidth: 1,
              borderTopColor: colors.border,
              paddingTop: 10,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10, fontWeight: '600', color: colors.textSecondary, letterSpacing: 0.4, marginBottom: 2 }}>
                SALARY
              </Text>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>
                {formatPeso(item.salary)}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10, fontWeight: '600', color: colors.textSecondary, letterSpacing: 0.4, marginBottom: 2 }}>
                TENURE
              </Text>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>
                {yearsOfService(item.hireDate)}
              </Text>
            </View>
            <View style={{ flex: 2, minWidth: 0 }}>
              <Text style={{ fontSize: 10, fontWeight: '600', color: colors.textSecondary, letterSpacing: 0.4, marginBottom: 2 }}>
                EMAIL
              </Text>
              <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text }} numberOfLines={1}>
                {item.email}
              </Text>
            </View>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── Table View ───────────────────────────────────────────────────────────────

function TableView({
  data,
  onRowPress,
  deptMap,
  colors,
}: {
  data: Employee[];
  onRowPress: (emp: Employee) => void;
  deptMap: Record<string, string>;
  colors: any;
}) {
  const [sortKey, setSortKey] = useState<string>('name');
  const [sortAsc, setSortAsc] = useState(true);

  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      let av: any, bv: any;
      switch (sortKey) {
        case 'name': av = a.name; bv = b.name; break;
        case 'department': av = a.department; bv = b.department; break;
        case 'role': av = a.role ?? ''; bv = b.role ?? ''; break;
        case 'status': av = a.status; bv = b.status; break;
        case 'salary': av = a.salary; bv = b.salary; break;
        case 'hireDate': av = a.hireDate; bv = b.hireDate; break;
        default: av = a.name; bv = b.name;
      }
      if (typeof av === 'number') return sortAsc ? av - bv : bv - av;
      return sortAsc
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
  }, [data, sortKey, sortAsc]);

  const handleSort = (key: string) => {
    if (sortKey === key) setSortAsc((v) => !v);
    else { setSortKey(key); setSortAsc(true); }
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortKey !== col)
      return <Text style={{ fontSize: 10, color: colors.textSecondary, marginLeft: 3 }}>↕</Text>;
    return (
      <Text style={{ fontSize: 10, color: colors.primary, marginLeft: 3 }}>
        {sortAsc ? '↑' : '↓'}
      </Text>
    );
  };

  const COLS = [
    { key: 'name', label: 'Employee', flex: 2.2 },
    { key: 'department', label: 'Department', flex: 1.2 },
    { key: 'role', label: 'Role', flex: 1.2 },
    { key: 'status', label: 'Status', flex: 0.9 },
    { key: 'salary', label: 'Salary', flex: 1, align: 'right' as const },
    { key: 'hireDate', label: 'Hire Date', flex: 1 },
  ];

  return (
    <View style={{ flex: 1, width: '100%' }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          paddingHorizontal: 16,
          borderTopWidth: 1,
          borderBottomWidth: 2,
          borderTopColor: colors.border,
          borderBottomColor: colors.border,
          backgroundColor: colors.card,
        }}
      >
        {COLS.map((col) => (
          <TouchableOpacity
            key={col.key}
            style={{ flex: col.flex, flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 6 }}
            onPress={() => handleSort(col.key)}
            activeOpacity={0.7}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: '700',
                letterSpacing: 0.6,
                textTransform: 'uppercase',
                color: colors.textSecondary,
                textAlign: col.align ?? 'left',
              }}
            >
              {col.label}
            </Text>
            <SortIcon col={col.key} />
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        ListEmptyComponent={
          <View style={{ padding: 48, alignItems: 'center' }}>
            <Users size={36} color={colors.border} strokeWidth={1} />
            <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 10 }}>
              No employees found
            </Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const deptColor = deptMap[item.department] ?? colors.primary;
          const statusStyle = STATUS_STYLES[item.status];
          const isEven = index % 2 === 0;
          return (
            <Pressable
              // @ts-ignore
              style={({ hovered }: any) => ({
                flexDirection: 'row',
                paddingHorizontal: 16,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
                minHeight: 58,
                backgroundColor: hovered ? colors.primary + '0A' : isEven ? colors.background : colors.card + 'aa',
              })}
              onPress={() => onRowPress(item)}
            >
              {/* Employee col */}
              <View style={{ flex: 2.2, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 6 }}>
                <Avatar name={item.name} profilePhoto={item.profilePhoto} size={34} color={deptColor} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    style={{ fontSize: 13, fontWeight: '600', color: colors.text }}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.textSecondary }} numberOfLines={1}>
                    {item.email}
                  </Text>
                </View>
              </View>
              {/* Department col */}
              <View style={{ flex: 1.2, justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 6 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 5,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 20,
                    borderWidth: 1,
                    backgroundColor: deptColor + '20',
                    borderColor: deptColor + '50',
                    alignSelf: 'flex-start',
                    maxWidth: '100%',
                  }}
                >
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: deptColor, flexShrink: 0 }} />
                  <Text style={{ fontSize: 11, fontWeight: '600', color: deptColor }} numberOfLines={1}>
                    {item.department}
                  </Text>
                </View>
              </View>
              {/* Role col */}
              <View style={{ flex: 1.2, justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 6 }}>
                <Text style={{ fontSize: 13, color: colors.text }} numberOfLines={1}>
                  {item.role || '—'}
                </Text>
                {item.position && (
                  <Text style={{ fontSize: 11, color: colors.textSecondary }} numberOfLines={1}>
                    {item.position}
                  </Text>
                )}
              </View>
              {/* Status col */}
              <View style={{ flex: 0.9, justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 6 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 5,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 20,
                    alignSelf: 'flex-start',
                    backgroundColor: statusStyle.bg,
                  }}
                >
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: statusStyle.text }} />
                  <Text style={{ fontSize: 11, fontWeight: '600', color: statusStyle.text }}>
                    {item.status}
                  </Text>
                </View>
              </View>
              {/* Salary col */}
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'flex-end', paddingVertical: 10, paddingHorizontal: 6 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>
                  {formatPeso(item.salary)}
                </Text>
                <Text style={{ fontSize: 10, color: colors.textSecondary }}>/mo</Text>
              </View>
              {/* Hire Date col */}
              <View style={{ flex: 1, justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 6 }}>
                <Text style={{ fontSize: 13, color: colors.text }}>{formatDate(item.hireDate)}</Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                  {yearsOfService(item.hireDate)}
                </Text>
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function HRScreen() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const isDesktop = width >= 1024;

  // ── MasterFile context ─────────────────────────────────────────────────────
  const deptObjects = useDepartments();
  const ROLE_OPTIONS = useRoleLabels();
  const mf = useMasterFile();
  const positions = mf.positions;
  const DEPARTMENTS = ['All', ...deptObjects.map((d) => d.label)];
  const deptMap = Object.fromEntries(
    deptObjects.map((d) => [d.label, d.color ?? colors.primary]),
  ) as Record<string, string>;

  // ── State — loaded from AsyncStorage ──────────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [deptFilter, setDeptFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<EmployeeStatus | 'All'>('All');
  const [filterOpen, setFilterOpen] = useState(false);
  const [stateRestored, setStateRestored] = useState(false);

  // ── AsyncStorage restore ───────────────────────────────────────────────────
  useEffect(() => {
    const restore = async () => {
      try {
        const [vm, df, sf, fo] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.VIEW_MODE),
          AsyncStorage.getItem(STORAGE_KEYS.DEPT_FILTER),
          AsyncStorage.getItem(STORAGE_KEYS.STATUS_FILTER),
          AsyncStorage.getItem(STORAGE_KEYS.FILTER_OPEN),
        ]);
        if (vm === 'card' || vm === 'table') setViewMode(vm);
        if (df) setDeptFilter(df);
        if (sf) setStatusFilter(sf as EmployeeStatus | 'All');
        if (fo) setFilterOpen(fo === 'true');
      } catch (_) { }
      finally { setStateRestored(true); }
    };
    restore();
  }, []);

  // ── AsyncStorage persist ───────────────────────────────────────────────────
  const saveState = useCallback(
    async (vm: ViewMode, df: string, sf: EmployeeStatus | 'All', fo: boolean) => {
      try {
        await AsyncStorage.multiSet([
          [STORAGE_KEYS.VIEW_MODE, vm],
          [STORAGE_KEYS.DEPT_FILTER, df],
          [STORAGE_KEYS.STATUS_FILTER, sf],
          [STORAGE_KEYS.FILTER_OPEN, String(fo)],
        ]);
      } catch (_) { }
    },
    [],
  );

  const setViewModeP = (v: ViewMode) => {
    setViewMode(v);
    saveState(v, deptFilter, statusFilter, filterOpen);
  };
  const setDeptFilterP = (v: string) => {
    setDeptFilter(v);
    saveState(viewMode, v, statusFilter, filterOpen);
  };
  const setStatusFilterP = (v: EmployeeStatus | 'All') => {
    setStatusFilter(v);
    saveState(viewMode, deptFilter, v, filterOpen);
  };
  const setFilterOpenP = (v: boolean) => {
    setFilterOpen(v);
    saveState(viewMode, deptFilter, statusFilter, v);
  };

  // ── Employee data ──────────────────────────────────────────────────────────
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState('');
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [addVisible, setAddVisible] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoadingEmployees(true);
      try {
        const staff = await HrService.getAllStaffs();
        if (Array.isArray(staff)) {
          setEmployees(
            staff.map((u) => ({
              id: String(u.id),
              name: u.fullname || u.name || 'Unknown',
              role: u.role || 'Staff',
              department: u.department?.label || 'General',
              status: 'Active' as EmployeeStatus,
              salary: Number(u.salary || 0),
              hireDate: u.createdAt || new Date().toISOString(),
              email: u.email || 'n/a',
              profilePhoto: u.profilePhoto,
            })),
          );
        }
      } catch (err) {
        if (__DEV__) console.warn('Failed to load employees', err);
      } finally {
        setLoadingEmployees(false);
      }
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees.filter((emp) => {
      const matchSearch =
        !q ||
        emp.name.toLowerCase().includes(q) ||
        emp.role?.toLowerCase().includes(q) ||
        emp.department.toLowerCase().includes(q) ||
        emp.email.toLowerCase().includes(q);
      const matchDept = deptFilter === 'All' || emp.department === deptFilter;
      const matchStatus = statusFilter === 'All' || emp.status === statusFilter;
      return matchSearch && matchDept && matchStatus;
    });
  }, [employees, search, deptFilter, statusFilter]);

  const activeCount = filtered.filter((e) => e.status === 'Active').length;
  const onLeaveCount = filtered.filter((e) => e.status === 'On Leave').length;
  const totalSalary = filtered.reduce((s, e) => s + e.salary, 0);
  const uniqueDepts = [...new Set(filtered.map((e) => e.department))].length;

  const handleUpdatePosition = (id: string, positionId: string) => {
    setEmployees((prev) =>
      prev.map((e) =>
        e.id === id
          ? { ...e, position: positions.find((p) => p.id === positionId)?.label || 'No position' }
          : e,
      ),
    );
  };

  const handleUpdateStatus = (id: string, status: EmployeeStatus) => {
    setEmployees((prev) => prev.map((e) => (e.id === id ? { ...e, status } : e)));
  };

  const handleAddEmployee = (emp: Employee) => {
    setEmployees((prev) => [emp, ...prev]);
  };

  // ── Styles ─────────────────────────────────────────────────────────────────
  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { padding: 16, paddingBottom: 0 },
    metaRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    metaCard: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 10,
      padding: 10,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    metaValue: { fontSize: 18, fontWeight: '800', color: colors.text },
    metaLabel: { fontSize: 10, color: colors.textSecondary, marginTop: 2, textAlign: 'center' },
    salaryCard: {
      marginHorizontal: 16,
      marginBottom: 10,
      backgroundColor: colors.primary,
      borderRadius: 12,
      padding: 14,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
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
    viewToggleRow: {
      flexDirection: 'row',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    viewToggleBtn: {
      width: 36,
      height: 38,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card,
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
    pillActive: { borderColor: colors.primary, backgroundColor: colors.primary },
    pillText: { fontSize: 12, fontWeight: '600', color: colors.text },
    pillTextAct: { color: '#fff' },
    listContent: { padding: 16, paddingTop: 0, gap: 10, paddingBottom: 40 },
    resultCount: {
      fontSize: 11,
      color: colors.textSecondary,
      paddingHorizontal: 16,
      paddingBottom: 6,
    },
  });

  if (!stateRestored || loadingEmployees) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 12, color: colors.textSecondary }}>Loading staff data…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Meta summary cards */}
      <View style={styles.header}>
        <View style={styles.metaRow}>
          <View style={styles.metaCard}>
            <Text style={styles.metaValue}>{filtered.length}</Text>
            <Text style={styles.metaLabel}>Total</Text>
          </View>
          <View style={styles.metaCard}>
            <Text style={[styles.metaValue, { color: '#10B981' }]}>{activeCount}</Text>
            <Text style={styles.metaLabel}>Active</Text>
          </View>
          <View style={styles.metaCard}>
            <Text style={[styles.metaValue, { color: '#F59E0B' }]}>{onLeaveCount}</Text>
            <Text style={styles.metaLabel}>On Leave</Text>
          </View>
          <View style={styles.metaCard}>
            <Text style={styles.metaValue}>{uniqueDepts}</Text>
            <Text style={styles.metaLabel}>Depts</Text>
          </View>
        </View>
      </View>

      {/* Monthly payroll banner */}
      {filtered.length > 0 && (
        <View style={styles.salaryCard}>
          <View>
            <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: '700', letterSpacing: 0.8 }}>
              {deptFilter === 'All' ? 'TOTAL MONTHLY PAYROLL' : `${deptFilter.toUpperCase()} PAYROLL`}
            </Text>
            <Text style={{ fontSize: 20, fontWeight: '900', color: '#fff', marginTop: 2 }}>
              {formatPeso(totalSalary)}
            </Text>
          </View>
          <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>
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

        {/* View mode toggle — tablet and desktop only */}
        {(isTablet || isDesktop) && (
          <View style={styles.viewToggleRow}>
            <TouchableOpacity
              style={[
                styles.viewToggleBtn,
                viewMode === 'card' && { backgroundColor: colors.primary },
              ]}
              onPress={() => setViewModeP('card')}
            >
              <LayoutGrid
                size={15}
                color={viewMode === 'card' ? '#fff' : colors.textSecondary}
                strokeWidth={2}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.viewToggleBtn,
                viewMode === 'table' && { backgroundColor: colors.primary },
              ]}
              onPress={() => setViewModeP('table')}
            >
              <List
                size={15}
                color={viewMode === 'table' ? '#fff' : colors.textSecondary}
                strokeWidth={2}
              />
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.iconBtn,
            filterOpen && { backgroundColor: colors.primary, borderColor: colors.primary },
          ]}
          onPress={() => setFilterOpenP(!filterOpen)}
        >
          <Filter size={16} color={filterOpen ? '#fff' : colors.textSecondary} strokeWidth={2} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.addBtn} onPress={() => setAddVisible(true)}>
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
                    dept !== 'All' && deptFilter !== dept && { borderColor: deptMap[dept] ?? colors.border },
                  ]}
                  onPress={() => setDeptFilterP(dept)}
                >
                  <Text
                    style={[
                      styles.pillText,
                      deptFilter === dept && styles.pillTextAct,
                      dept !== 'All' && deptFilter !== dept && { color: deptMap[dept] ?? colors.text },
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
              {(['All', ...ALL_STATUSES] as (EmployeeStatus | 'All')[]).map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.pill, statusFilter === s && styles.pillActive]}
                  onPress={() => setStatusFilterP(s)}
                >
                  <Text style={[styles.pillText, statusFilter === s && styles.pillTextAct]}>
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
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

      {/* ── TABLE VIEW (desktop + tablet when toggled) ── */}
      {(isTablet || isDesktop) && viewMode === 'table' ? (
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          <TableView
            data={filtered}
            onRowPress={(emp) => { setSelectedEmp(emp); setDetailVisible(true); }}
            deptMap={deptMap}
            colors={colors}
          />
          <View style={{ height: 40 }} />
        </ScrollView>
      ) : (
        /* ── CARD VIEW ── */
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            isDesktop && { paddingHorizontal: 16, gap: 0 },
            filtered.length === 0 && { flex: 1 },
          ]}
          showsVerticalScrollIndicator={false}
          numColumns={isDesktop ? 3 : isTablet ? 2 : 1}
          key={isDesktop ? 'desktop-3' : isTablet ? 'tablet-2' : 'mobile-1'}
          columnWrapperStyle={
            isDesktop
              ? { gap: 12, marginBottom: 12 }
              : isTablet
                ? { gap: 10 }
                : undefined
          }
          ListEmptyComponent={
            <View style={{ flex: 1, alignItems: 'center', paddingTop: 60 }}>
              <Users size={48} color={colors.border} strokeWidth={1} />
              <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 12 }}>
                No employees found
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            if (isDesktop) {
              return (
                <DesktopEmployeeCard
                  item={item}
                  deptMap={deptMap}
                  colors={colors}
                  onPress={() => { setSelectedEmp(item); setDetailVisible(true); }}
                />
              );
            }
            return (
              <EmployeeCard
                item={item}
                isTablet={isTablet}
                deptMap={deptMap}
                colors={colors}
                onPress={() => { setSelectedEmp(item); setDetailVisible(true); }}
              />
            );
          }}
        />
      )}

      {/* Modals */}
      <EmployeeDetailModal
        employee={selectedEmp}
        visible={detailVisible}
        deptMap={deptMap}
        onClose={() => setDetailVisible(false)}
        onUpdateStatus={handleUpdateStatus}
        onUpdatePosition={handleUpdatePosition}
        positions={positions}
        colors={colors}
      />
      <AddEmployeeModal
        visible={addVisible}
        onClose={() => setAddVisible(false)}
        onAdd={handleAddEmployee}
        deptObjects={deptObjects}
        roleOptions={ROLE_OPTIONS}
        positions={positions}
        colors={colors}
      />
    </View>
  );
}