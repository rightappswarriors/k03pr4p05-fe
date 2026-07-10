// HRScreen.tsx — Enterprise HR Workspace (redesigned)
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Animated,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  Activity,
  Archive,
  BriefcaseBusiness,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  Download,
  Edit3,
  Eye,
  Filter,
  KeyRound,
  LayoutGrid,
  List,
  LogIn,
  LogOut,
  Monitor,
  MoreHorizontal,
  Plus,
  RefreshCcw,
  Search,
  Shield,
  ShieldCheck,
  ShieldOff,
  Smartphone,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  X,
  ZapOff,
} from 'lucide-react-native'
import DateRangePickerModal from '@/components/DateRangePickerModal'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import { HrService } from '@/services'
import { AuditService } from '@/services/auditService'
import { PositionService } from '@/services/positionService'
import { StatCard } from '@/screens/supplier/SupplierDashboardScreen'
import { CatalogPagination } from '@/components/supplier/catalog/CatalogPagination'

// ─── Types ────────────────────────────────────────────────────────────────────
type ViewMode = 'table' | 'cards'
type Density = 'comfortable' | 'compact'
type SortKey = 'name' | 'newest' | 'position' | 'department' | 'status'
type DrawerTab = 'overview' | 'permissions' | 'activity' | 'devices' | 'audit'
type BuilderStep = 'general' | 'permissions' | 'summary'

type PermissionRow = {
  pageId: string
  page?: { id: string; key: string; label: string } | null
  canView: boolean
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
}

type PositionRow = {
  id: string
  name: string
  description?: string | null
  color?: string | null
  permissions?: PermissionRow[]
  users?: Array<{ id: number; fullname: string }>
  createdAt?: string
  updatedAt?: string
}

type EmployeeRow = {
  id: number
  fullname?: string | null
  username?: string | null
  email?: string | null
  role?: string | null
  profilePhoto?: string | null
  createdAt?: string | null
  positionId?: string | null
  salary?: number | null
  departmentId?: number | null
  department?: { label?: string | null } | null
  position?: PositionRow | null
}

type PageRow = { id: string; key: string; label: string; sortOrder?: number }

// ─── Constants ────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'enterpriseHrWorkspace:prefs:v2'

const MODULE_GROUPS: Record<string, string> = {
  dashboard: 'Dashboard', catalog: 'Catalog', kompra: 'Catalog',
  sales: 'Operations', inventory: 'Operations', restock: 'Operations', delivery: 'Operations',
  finance: 'Finance', budget: 'Finance',
  analytics: 'Analytics',
  audit: 'Security', permission: 'Security',
  hr: 'HR',
  admin: 'Administration', settings: 'Administration', masterfile: 'Administration',
}

const MODULE_COLORS: Record<string, string> = {
  Dashboard: '#2563EB', Catalog: '#7C3AED', Operations: '#0EA5E9',
  Finance: '#16A34A', Analytics: '#F59E0B', Security: '#DC2626',
  HR: '#0891B2', Administration: '#6B7280',
}

const POSITION_COLORS = ['#2563EB', '#7C3AED', '#0EA5E9', '#16A34A', '#F59E0B', '#DC2626', '#0891B2', '#EC4899']

const defaultDateRange = () => {
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - 90)
  return { startDate: start.toISOString(), endDate: end.toISOString() }
}

const defaultPrefs = {
  viewMode: 'table' as ViewMode,
  sort: 'name' as SortKey,
  density: 'comfortable' as Density,
  status: 'ALL',
  department: 'ALL',
  position: 'ALL',
  dateRange: defaultDateRange(),
}

// ─── Utilities ────────────────────────────────────────────────────────────────
const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Never'

const formatDateTime = (value?: string | null) =>
  value ? new Date(value).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Never'

const safeName = (e: EmployeeRow) => e.fullname || e.username || e.email || `Employee ${e.id}`

function employeeStatus(e: EmployeeRow): 'Active' | 'Inactive' {
  if (e.role === 'OWNER' || e.role === 'MANAGER' || e.role === 'STAFF') return 'Active'
  return 'Inactive'
}

function getModuleFromKey(key: string): string {
  const prefix = key.split(/[._]/)[0].toLowerCase()
  return MODULE_GROUPS[prefix] ?? 'General'
}

function groupPagesByModule(pages: PageRow[]): Record<string, PageRow[]> {
  const result: Record<string, PageRow[]> = {}
  for (const page of pages) {
    const mod = getModuleFromKey(page.key)
    result[mod] = [...(result[mod] ?? []), page]
  }
  return result
}

// ─── Animations ───────────────────────────────────────────────────────────────
function useFade(delay = 0) {
  const opacity = useRef(new Animated.Value(0)).current
  const translateY = useRef(new Animated.Value(10)).current
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 280, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 280, delay, useNativeDriver: true }),
    ]).start()
  }, [delay, opacity, translateY])
  return { opacity, transform: [{ translateY }] }
}

function FadeIn({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: any }) {
  return <Animated.View style={[useFade(delay), style]}>{children}</Animated.View>
}

function useScale() {
  const scale = useRef(new Animated.Value(1)).current
  const onPressIn = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 40, bounciness: 2 }).start()
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 4 }).start()
  return { scale, onPressIn, onPressOut }
}

// ─── Shared Atoms ─────────────────────────────────────────────────────────────
function Badge({
  label, tone = '#2563EB', size = 'sm',
}: { label: string; tone?: string; size?: 'xs' | 'sm' | 'md' }) {
  const px = size === 'xs' ? 6 : size === 'md' ? 12 : 8
  const py = size === 'xs' ? 2 : size === 'md' ? 6 : 4
  const fs = size === 'xs' ? 10 : size === 'md' ? 13 : 11
  return (
    <View style={{ borderRadius: 6, paddingHorizontal: px, paddingVertical: py, backgroundColor: `${tone}1A` }}>
      <Text style={{ fontSize: fs, fontWeight: '700', color: tone }}>{label}</Text>
    </View>
  )
}

function StatusDot({ active }: { active: boolean }) {
  return (
    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: active ? '#16A34A' : '#6B7280' }} />
  )
}

function Divider() {
  const { colors } = useTheme()
  return <View style={{ height: 1, backgroundColor: colors.border }} />
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  const { colors } = useTheme()
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingVertical: 8 }}>
      <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, flexShrink: 0 }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, textAlign: 'right', flex: 1, fontFamily: mono ? Platform.OS === 'ios' ? 'Menlo' : 'monospace' : undefined }}>{value}</Text>
    </View>
  )
}

function SectionCard({ title, subtitle, children, action, padded = true }: {
  title: string; subtitle?: string; children: React.ReactNode; action?: React.ReactNode; padded?: boolean
}) {
  const { colors } = useTheme()
  return (
    <View style={{ borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden' }}>
      <View style={{ paddingHorizontal: 16, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: 14, fontWeight: '800' }}>{title}</Text>
          {subtitle ? <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '500', marginTop: 1 }}>{subtitle}</Text> : null}
        </View>
        {action}
      </View>
      <View style={padded ? { padding: 16, gap: 12 } : {}}>{children}</View>
    </View>
  )
}

function EmptyState({ icon: Icon = Users, title, message }: { icon?: any; title: string; message: string }) {
  const { colors } = useTheme()
  return (
    <View style={{ alignItems: 'center', paddingVertical: 40, gap: 10 }}>
      <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: `${colors.primary}14`, alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={22} color={colors.primary} strokeWidth={1.8} />
      </View>
      <Text style={{ color: colors.text, fontSize: 15, fontWeight: '800' }}>{title}</Text>
      <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: 'center', maxWidth: 280 }}>{message}</Text>
    </View>
  )
}

function LoadingRows() {
  const { colors } = useTheme()
  const opacity = useRef(new Animated.Value(0.3)).current
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
    ]))
    loop.start()
    return () => loop.stop()
  }, [opacity])
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {Array.from({ length: 7 }).map((_, i) => (
          <Animated.View key={i} style={{ opacity, height: 120, flexGrow: 1, flexBasis: 160, borderRadius: 16, backgroundColor: colors.surface }} />
        ))}
      </View>
      <Animated.View style={{ opacity, height: 56, borderRadius: 14, backgroundColor: colors.surface }} />
      {Array.from({ length: 6 }).map((_, i) => (
        <Animated.View key={i} style={{ opacity, height: 52, borderRadius: 10, backgroundColor: colors.surface }} />
      ))}
    </View>
  )
}

// ─── Modern Horizontal Tabs ───────────────────────────────────────────────────
function TabBar<T extends string>({
  tabs, active, onChange, scrollable = false,
}: { tabs: Array<{ key: T; label: string; icon?: any }>; active: T; onChange: (t: T) => void; scrollable?: boolean }) {
  const { colors } = useTheme()
  const indicatorX = useRef(new Animated.Value(0)).current
  const tabWidths = useRef<Record<string, number>>({})
  const tabOffsets = useRef<Record<string, number>>({})

  const animateIndicator = (key: string) => {
    const x = tabOffsets.current[key] ?? 0
    Animated.spring(indicatorX, { toValue: x, useNativeDriver: true, speed: 40, bounciness: 2 }).start()
  }

  useEffect(() => { animateIndicator(active) }, [active])

  const inner = (
    <View style={{ flexDirection: 'row', position: 'relative' }}>
      {tabs.map((tab) => {
      
        const Icon = tab.icon
        return (
          <TouchableOpacity
            key={tab.key}
            onLayout={(e) => {
              tabWidths.current[tab.key] = e.nativeEvent.layout.width
              tabOffsets.current[tab.key] = e.nativeEvent.layout.x
            }}
            onPress={() => { onChange(tab.key); animateIndicator(tab.key) }}
            style={{ paddingHorizontal: 16, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', gap: 6 }}
          >
            {Icon ? <Icon size={14} color={tab.key === active ? colors.primary : colors.textSecondary} strokeWidth={2} /> : null}
            <Text style={{ fontSize: 13, fontWeight: tab.key === active ? '800' : '600', color: tab.key === active ? colors.primary : colors.textSecondary }}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        )
      })}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, backgroundColor: colors.border }} />
      <Animated.View style={{ position: 'absolute', bottom: 0, left: 0, height: 2, width: tabWidths.current[active] ?? 60, backgroundColor: colors.primary, borderRadius: 2, transform: [{ translateX: indicatorX }] }} />
    </View>
  )

  if (scrollable) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {inner}
      </ScrollView>
    )
  }
  return inner
}

// ─── Animated Toggle Switch ───────────────────────────────────────────────────
function PermSwitch({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  const { colors } = useTheme()
  return (
    <Switch
      value={value}
      onValueChange={onChange}
      trackColor={{ false: colors.border, true: `${colors.primary}60` }}
      thumbColor={value ? colors.primary : colors.textSecondary}
      ios_backgroundColor={colors.border}
      style={{ transform: [{ scaleX: 0.82 }, { scaleY: 0.82 }] }}
    />
  )
}

// ─── Employee Avatar ──────────────────────────────────────────────────────────
const AVATAR_COLORS = ['#2563EB', '#7C3AED', '#0891B2', '#16A34A', '#DC2626', '#F59E0B', '#EC4899', '#0EA5E9']
function avatarColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

function EmployeeAvatar({ employee, size = 40 }: { employee: EmployeeRow; size?: number }) {
  const name = safeName(employee)
  const color = avatarColor(name)
  const label = name.slice(0, 2).toUpperCase()
  return (
    <View style={{ width: size, height: size, borderRadius: size / 3, backgroundColor: `${color}22`, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: `${color}33` }}>
      <Text style={{ color, fontWeight: '800', fontSize: size * 0.35 }}>{label}</Text>
    </View>
  )
}

// ─── HR Toolbar ───────────────────────────────────────────────────────────────
function HRToolbar({
  search, setSearch, prefs, setPrefs, departments, positions, onAddEmployee, onCreatePosition, onExport,
}: {
  search: string; setSearch: (v: string) => void; prefs: typeof defaultPrefs
  setPrefs: (next: Partial<typeof defaultPrefs>) => void; departments: string[]
  positions: PositionRow[]; onAddEmployee: () => void; onCreatePosition: () => void; onExport: () => void
}) {
  const { colors } = useTheme()
  const [filterOpen, setFilterOpen] = useState(false)
  const [dateOpen, setDateOpen] = useState(false)
  const btn = { height: 38, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: 11, flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6 }

  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        {/* Search */}
        <View style={{ flex: 1, minWidth: 240, height: 38, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 11 }}>
          <Search size={15} color={colors.textSecondary} />
          <TextInput value={search} onChangeText={setSearch} placeholder="Search employees, email, role…" placeholderTextColor={colors.textSecondary} style={{ flex: 1, color: colors.text, fontWeight: '600', fontSize: 13 }} />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}><X size={14} color={colors.textSecondary} /></TouchableOpacity>
          )}
        </View>
        {/* Filters */}
        <TouchableOpacity style={[btn, filterOpen && { borderColor: colors.primary, backgroundColor: `${colors.primary}10` }]} onPress={() => setFilterOpen(v => !v)}>
          <Filter size={14} color={filterOpen ? colors.primary : colors.textSecondary} />
          <Text style={{ color: filterOpen ? colors.primary : colors.text, fontWeight: '700', fontSize: 13 }}>Filters</Text>
          {(prefs.status !== 'ALL' || prefs.department !== 'ALL' || prefs.position !== 'ALL') && (
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary }} />
          )}
        </TouchableOpacity>
        {/* Date */}
        <TouchableOpacity style={btn} onPress={() => setDateOpen(true)}>
          <Calendar size={14} color={colors.textSecondary} />
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13 }}>Date Range</Text>
        </TouchableOpacity>
        {/* Export */}
        <TouchableOpacity style={btn} onPress={onExport}>
          <Download size={14} color={colors.textSecondary} />
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13 }}>Export</Text>
        </TouchableOpacity>
        {/* View Toggle */}
        <View style={{ height: 38, flexDirection: 'row', borderWidth: 1, borderColor: colors.border, borderRadius: 10, overflow: 'hidden', backgroundColor: colors.surface }}>
          <TouchableOpacity onPress={() => setPrefs({ viewMode: 'cards' })} style={{ width: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: prefs.viewMode === 'cards' ? colors.primary : 'transparent' }}>
            <LayoutGrid size={15} color={prefs.viewMode === 'cards' ? '#fff' : colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setPrefs({ viewMode: 'table' })} style={{ width: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: prefs.viewMode === 'table' ? colors.primary : 'transparent' }}>
            <List size={15} color={prefs.viewMode === 'table' ? '#fff' : colors.textSecondary} />
          </TouchableOpacity>
        </View>
        {/* Create Position */}
        <TouchableOpacity onPress={onCreatePosition} style={[btn, { borderColor: '#3B82F620', backgroundColor: '#EFF6FF' }]}>
          <ShieldCheck size={14} color="#2563EB" />
          <Text style={{ color: '#2563EB', fontWeight: '700', fontSize: 13 }}>Create Position</Text>
        </TouchableOpacity>
        {/* Add Employee */}
        <TouchableOpacity onPress={onAddEmployee} style={[btn, { backgroundColor: colors.primary, borderColor: colors.primary }]}>
          <UserPlus size={14} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Add Employee</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Chips */}
      {filterOpen && (
        <FadeIn>
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary, alignSelf: 'center', marginRight: 4 }}>STATUS</Text>
              {['ALL', 'Active', 'Inactive'].map(s => (
                <TouchableOpacity key={s} onPress={() => setPrefs({ status: s })} style={{ borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: prefs.status === s ? colors.primary : colors.border, backgroundColor: prefs.status === s ? `${colors.primary}14` : colors.surface }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: prefs.status === s ? colors.primary : colors.textSecondary }}>{s === 'ALL' ? 'All' : s}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary, alignSelf: 'center', marginRight: 4 }}>DEPT</Text>
              {['ALL', ...departments.slice(0, 8)].map(d => (
                <TouchableOpacity key={d} onPress={() => setPrefs({ department: d })} style={{ borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: prefs.department === d ? colors.primary : colors.border, backgroundColor: prefs.department === d ? `${colors.primary}14` : colors.surface }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: prefs.department === d ? colors.primary : colors.textSecondary }}>{d === 'ALL' ? 'All Departments' : d}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary, alignSelf: 'center', marginRight: 4 }}>POSITION</Text>
              <TouchableOpacity onPress={() => setPrefs({ position: 'ALL' })} style={{ borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: prefs.position === 'ALL' ? colors.primary : colors.border, backgroundColor: prefs.position === 'ALL' ? `${colors.primary}14` : colors.surface }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: prefs.position === 'ALL' ? colors.primary : colors.textSecondary }}>All</Text>
              </TouchableOpacity>
              {positions.slice(0, 8).map(p => (
                <TouchableOpacity key={p.id} onPress={() => setPrefs({ position: p.id })} style={{ borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: prefs.position === p.id ? colors.primary : colors.border, backgroundColor: prefs.position === p.id ? `${colors.primary}14` : colors.surface }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: prefs.position === p.id ? colors.primary : colors.textSecondary }}>{p.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary, alignSelf: 'center', marginRight: 4 }}>SORT</Text>
              {(['name', 'newest', 'position', 'department', 'status'] as SortKey[]).map(s => (
                <TouchableOpacity key={s} onPress={() => setPrefs({ sort: s })} style={{ borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: prefs.sort === s ? colors.primary : colors.border, backgroundColor: prefs.sort === s ? `${colors.primary}14` : colors.surface }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: prefs.sort === s ? colors.primary : colors.textSecondary }}>{s.charAt(0).toUpperCase() + s.slice(1)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </FadeIn>
      )}

      <DateRangePickerModal
        visible={dateOpen}
        onClose={() => setDateOpen(false)}
        initialStart={new Date(prefs.dateRange.startDate)}
        initialEnd={new Date(prefs.dateRange.endDate)}
        onApply={(s, e) => { setPrefs({ dateRange: { startDate: s.toISOString(), endDate: e.toISOString() } }); setDateOpen(false) }}
      />
    </View>
  )
}

// ─── Employee Table (full-width, auto-stretch) ────────────────────────────────
function EmployeeTable({ employees, onSelect }: { employees: EmployeeRow[]; onSelect: (e: EmployeeRow) => void }) {
  const { colors } = useTheme()
  const { width } = useWindowDimensions()
  const isWide = width >= 1400

  const colHeader = { fontSize: 11, fontWeight: '700' as const, color: colors.textSecondary, textTransform: 'uppercase' as const, letterSpacing: 0.5 }
  const cell = { fontSize: 13, fontWeight: '600' as const, color: colors.text }
  const cellSub = { fontSize: 12, fontWeight: '500' as const, color: colors.textSecondary }

  return (
    <View style={{ borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{ flex: 3, minWidth: 180 }}><Text style={colHeader}>Employee</Text></View>
        {isWide && <View style={{ flex: 2, minWidth: 180 }}><Text style={colHeader}>Email</Text></View>}
        <View style={{ flex: 2, minWidth: 120 }}><Text style={colHeader}>Department</Text></View>
        <View style={{ flex: 2, minWidth: 120 }}><Text style={colHeader}>Position</Text></View>
        <View style={{ width: 80 }}><Text style={colHeader}>Role</Text></View>
        <View style={{ width: 90 }}><Text style={colHeader}>Status</Text></View>
        <View style={{ width: 110 }}><Text style={colHeader}>Joined</Text></View>
        <View style={{ width: 64 }} />
      </View>
      {/* Rows */}
      {employees.map((employee, i) => {
        const status = employeeStatus(employee)
        return (
          <TouchableOpacity
            key={employee.id}
            onPress={() => onSelect(employee)}
            activeOpacity={0.7}
            style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.border }}
          >
            <View style={{ flex: 3, minWidth: 180, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <EmployeeAvatar employee={employee} size={36} />
              <View style={{ flex: 1 }}>
                <Text style={cell} numberOfLines={1}>{safeName(employee)}</Text>
                {!isWide && <Text style={cellSub} numberOfLines={1}>{employee.email ?? '—'}</Text>}
              </View>
            </View>
            {isWide && <View style={{ flex: 2, minWidth: 180 }}><Text style={cellSub} numberOfLines={1}>{employee.email ?? '—'}</Text></View>}
            <View style={{ flex: 2, minWidth: 120 }}>
              <Text style={cellSub} numberOfLines={1}>{employee.department?.label ?? 'Unassigned'}</Text>
            </View>
            <View style={{ flex: 2, minWidth: 120 }}>
              {employee.position ? (
                <Badge label={employee.position.name} tone="#7C3AED" size="xs" />
              ) : (
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>No position</Text>
              )}
            </View>
            <View style={{ width: 80 }}>
              <Badge label={employee.role ?? '—'} tone="#F59E0B" size="xs" />
            </View>
            <View style={{ width: 90, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <StatusDot active={status === 'Active'} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: status === 'Active' ? '#16A34A' : '#6B7280' }}>{status}</Text>
            </View>
            <View style={{ width: 110 }}>
              <Text style={cellSub}>{formatDate(employee.createdAt)}</Text>
            </View>
            <View style={{ width: 64, alignItems: 'center' }}>
              <ChevronRight size={16} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

// ─── Employee Card ────────────────────────────────────────────────────────────
function EmployeeCard({ employee, onSelect }: { employee: EmployeeRow; onSelect: (e: EmployeeRow) => void }) {
  const { colors } = useTheme()
  const { scale, onPressIn, onPressOut } = useScale()
  const status = employeeStatus(employee)

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        onPress={() => onSelect(employee)}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={1}
        style={{ borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 14, overflow: 'hidden' }}
      >
        <View style={{ height: 3, backgroundColor: avatarColor(safeName(employee)) }} />
        <View style={{ padding: 14, gap: 10 }}>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <EmployeeAvatar employee={employee} size={42} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: 14, fontWeight: '800' }} numberOfLines={1}>{safeName(employee)}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }} numberOfLines={1}>{employee.email ?? 'No email'}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <StatusDot active={status === 'Active'} />
              <Text style={{ fontSize: 11, fontWeight: '700', color: status === 'Active' ? '#16A34A' : '#6B7280' }}>{status}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            <Badge label={employee.department?.label ?? 'Unassigned'} tone="#2563EB" size="xs" />
            {employee.position && <Badge label={employee.position.name} tone="#7C3AED" size="xs" />}
            {employee.role && <Badge label={employee.role} tone="#F59E0B" size="xs" />}
          </View>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            <Clock size={11} color={colors.textSecondary} />
            <Text style={{ fontSize: 11, color: colors.textSecondary }}>Joined {formatDate(employee.createdAt)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  )
}

// ─── Permission Grid (for PositionBuilder) ────────────────────────────────────
const PERM_KEYS = ['canView', 'canCreate', 'canEdit', 'canDelete'] as const
const PERM_LABELS: Record<string, string> = { canView: 'View', canCreate: 'Create', canEdit: 'Edit', canDelete: 'Delete' }

function PermissionGrid({
  pages, permissions, setPermissions,
}: {
  pages: PageRow[]
  permissions: Record<string, PermissionRow>
  setPermissions: (next: Record<string, PermissionRow>) => void
}) {
  const { colors } = useTheme()
  const [query, setQuery] = useState('')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [moduleFilter, setModuleFilter] = useState('ALL')

  const filtered = pages.filter(p => `${p.key} ${p.label}`.toLowerCase().includes(query.toLowerCase()))
  const groups = useMemo(() => groupPagesByModule(filtered), [filtered])
  const modules = useMemo(() => Object.keys(groupPagesByModule(pages)), [pages])

  const filteredGroups = moduleFilter === 'ALL' ? groups : Object.fromEntries(Object.entries(groups).filter(([m]) => m === moduleFilter))

  const toggle = (pageId: string, key: typeof PERM_KEYS[number]) => {
    const cur = permissions[pageId] ?? { pageId, canView: false, canCreate: false, canEdit: false, canDelete: false }
    setPermissions({ ...permissions, [pageId]: { ...cur, [key]: !cur[key] } })
  }
  const setAll = (value: boolean) => {
    setPermissions(Object.fromEntries(pages.map(p => [p.id, { pageId: p.id, canView: value, canCreate: value, canEdit: value, canDelete: value }])))
  }
  const toggleGroup = (group: string) => {
    const next = new Set(expandedGroups)
    next.has(group) ? next.delete(group) : next.add(group)
    setExpandedGroups(next)
  }
  const expandAll = () => setExpandedGroups(new Set(Object.keys(groups)))
  const collapseAll = () => setExpandedGroups(new Set())

  return (
    <View style={{ gap: 12 }}>
      {/* Controls */}
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        <View style={{ flex: 1, minWidth: 200, height: 38, borderWidth: 1, borderColor: colors.border, borderRadius: 10, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, backgroundColor: colors.background }}>
          <Search size={13} color={colors.textSecondary} />
          <TextInput value={query} onChangeText={setQuery} placeholder="Search pages…" placeholderTextColor={colors.textSecondary} style={{ flex: 1, color: colors.text, fontSize: 13, marginLeft: 6 }} />
        </View>
        <TouchableOpacity onPress={expandAll} style={{ borderRadius: 8, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: colors.surface }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>Expand All</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={collapseAll} style={{ borderRadius: 8, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: colors.surface }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>Collapse All</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setAll(true)} style={{ borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#DCFCE7' }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#15803D' }}>Select All</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setAll(false)} style={{ borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#FEE2E2' }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#DC2626' }}>Clear All</Text>
        </TouchableOpacity>
      </View>
      {/* Module filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {['ALL', ...modules].map(m => (
            <TouchableOpacity key={m} onPress={() => setModuleFilter(m)} style={{ borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: moduleFilter === m ? (MODULE_COLORS[m] ?? colors.primary) : colors.border, backgroundColor: moduleFilter === m ? `${MODULE_COLORS[m] ?? colors.primary}14` : colors.surface }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: moduleFilter === m ? (MODULE_COLORS[m] ?? colors.primary) : colors.textSecondary }}>{m === 'ALL' ? 'All Modules' : m}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
      {/* Sticky column header */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 6 }}>
        <View style={{ flex: 1 }} />
        {PERM_KEYS.map(k => (
          <View key={k} style={{ width: 68, alignItems: 'center' }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary }}>{PERM_LABELS[k]}</Text>
          </View>
        ))}
      </View>
      {/* Groups */}
      {Object.entries(filteredGroups).map(([group, rows]) => {
        const isExpanded = expandedGroups.has(group) || query.length > 0
        const modColor = MODULE_COLORS[group] ?? '#6B7280'
        const granted = rows.reduce((n, p) => n + PERM_KEYS.filter(k => permissions[p.id]?.[k]).length, 0)
        return (
          <View key={group} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, overflow: 'hidden' }}>
            <TouchableOpacity onPress={() => toggleGroup(group)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: colors.background }}>
              <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: modColor }} />
              <Text style={{ flex: 1, color: colors.text, fontWeight: '800', fontSize: 13 }}>{group}</Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>{rows.length} pages · {granted} granted</Text>
              <ChevronDown size={15} color={colors.textSecondary} style={{ transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }} />
            </TouchableOpacity>
            {isExpanded && rows.map((page, pi) => {
              const perm = permissions[page.id] ?? { pageId: page.id, canView: false, canCreate: false, canEdit: false, canDelete: false }
              return (
                <View key={page.id} style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
                  <View style={{ flex: 1, paddingLeft: 20 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{page.label}</Text>
                    <Text style={{ fontSize: 11, color: colors.textSecondary }}>{page.key}</Text>
                  </View>
                  {PERM_KEYS.map(k => (
                    <View key={k} style={{ width: 68, alignItems: 'center' }}>
                      <PermSwitch value={!!perm[k]} onChange={() => toggle(page.id, k)} />
                    </View>
                  ))}
                </View>
              )
            })}
          </View>
        )
      })}
    </View>
  )
}

// ─── Position Builder (modal, centered, 900px max) ────────────────────────────
function PositionBuilder({
  visible, pages, position, onClose, onSaved,
}: {
  visible: boolean; pages: PageRow[]; position: PositionRow | null; onClose: () => void; onSaved: () => Promise<void>
}) {
  const { colors } = useTheme()
  const { width, height } = useWindowDimensions()
  const isMobile = width < 640
  const [step, setStep] = useState<BuilderStep>('general')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState(POSITION_COLORS[0])
  const [permissions, setPermissions] = useState<Record<string, PermissionRow>>({})
  const [saving, setSaving] = useState(false)
  const editing = Boolean(position)

  const fadeAnim = useRef(new Animated.Value(0)).current
  const scaleAnim = useRef(new Animated.Value(0.95)).current

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 4 }),
      ]).start()
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 160, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 0.95, duration: 160, useNativeDriver: true }),
      ]).start()
    }
  }, [visible])

  useEffect(() => {
    if (!visible) return
    setStep('general')
    setName(position?.name ?? '')
    setDescription(position?.description ?? '')
    setColor(position?.color ?? POSITION_COLORS[0])
    setPermissions(Object.fromEntries((position?.permissions ?? []).map(p => [p.pageId, { ...p }])))
  }, [position, visible])

  const granted = Object.values(permissions).reduce((s, p) => s + Number(p.canView) + Number(p.canCreate) + Number(p.canEdit) + Number(p.canDelete), 0)
  const affectedModules = useMemo(() => {
    const activePageIds = new Set(Object.entries(permissions).filter(([, p]) => p.canView || p.canCreate || p.canEdit || p.canDelete).map(([id]) => id))
    const activeMods = new Set<string>()
    pages.filter(p => activePageIds.has(p.id)).forEach(p => activeMods.add(getModuleFromKey(p.key)))
    return [...activeMods]
  }, [permissions, pages])

  const save = async () => {
    if (!name.trim()) return Alert.alert('Required', 'Position name is required.')
    setSaving(true)
    try {
      const saved = editing
        ? await PositionService.update(position!.id, name.trim(), description.trim())
        : await PositionService.create(name.trim(), description.trim())
      const positionId = editing ? position!.id : String(saved.id)
      await PositionService.setPermissions(positionId, Object.values(permissions).map(p => ({
        pageId: p.pageId, canView: Boolean(p.canView), canCreate: Boolean(p.canCreate), canEdit: Boolean(p.canEdit), canDelete: Boolean(p.canDelete),
      })))
      await onSaved()
      onClose()
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to save position.')
    } finally {
      setSaving(false)
    }
  }

  const steps: Array<{ key: BuilderStep; label: string }> = [
    { key: 'general', label: '1. General' },
    { key: 'permissions', label: '2. Permissions' },
    { key: 'summary', label: '3. Summary' },
  ]

  const modalContent = (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: isMobile ? 1 : scaleAnim }], flex: isMobile ? 1 : undefined, width: isMobile ? '100%' : '90%', maxWidth: isMobile ? undefined : 900, backgroundColor: colors.surface, borderRadius: isMobile ? 0 : 20, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', maxHeight: isMobile ? undefined : height * 0.9 }}>
      {/* Header */}
      <View style={{ padding: 18, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: `${color}22`, alignItems: 'center', justifyContent: 'center' }}>
          <ShieldCheck size={18} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '900' }}>{editing ? 'Edit Position' : 'Create Position'}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 1 }}>Define role permissions across all modules</Text>
        </View>
        <TouchableOpacity onPress={onClose} style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
          <X size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
      {/* Step tabs */}
      <TabBar tabs={steps} active={step} onChange={setStep} />
      {/* Content */}
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        {step === 'general' && (
          <FadeIn>
            <View style={{ gap: 14 }}>
              <View style={{ gap: 6 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary }}>POSITION NAME *</Text>
                <TextInput value={name} onChangeText={setName} placeholder="e.g. Store Manager" placeholderTextColor={colors.textSecondary} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, color: colors.text, fontSize: 14, fontWeight: '600', backgroundColor: colors.background }} />
              </View>
              <View style={{ gap: 6 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary }}>DESCRIPTION</Text>
                <TextInput value={description} onChangeText={setDescription} placeholder="What is this position responsible for?" placeholderTextColor={colors.textSecondary} multiline style={{ minHeight: 100, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, color: colors.text, fontSize: 14, textAlignVertical: 'top', backgroundColor: colors.background }} />
              </View>
              <View style={{ gap: 8 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary }}>ACCENT COLOR</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {POSITION_COLORS.map(c => (
                    <TouchableOpacity key={c} onPress={() => setColor(c)} style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: c, borderWidth: 3, borderColor: color === c ? colors.text : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                      {color === c && <Check size={14} color="#fff" strokeWidth={3} />}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </FadeIn>
        )}

        {step === 'permissions' && (
          <FadeIn>
            <PermissionGrid pages={pages} permissions={permissions} setPermissions={setPermissions} />
          </FadeIn>
        )}

        {step === 'summary' && (
          <FadeIn>
            <View style={{ gap: 14 }}>
              <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 16, gap: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: `${color}22`, alignItems: 'center', justifyContent: 'center' }}>
                    <ShieldCheck size={20} color={color} />
                  </View>
                  <View>
                    <Text style={{ color: colors.text, fontSize: 17, fontWeight: '900' }}>{name || 'Unnamed Position'}</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{description || 'No description'}</Text>
                  </View>
                </View>
                <Divider />
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  <View style={{ flex: 1, minWidth: 120, borderRadius: 10, padding: 12, backgroundColor: `${colors.primary}0F`, gap: 4 }}>
                    <Text style={{ fontSize: 22, fontWeight: '900', color: colors.primary }}>{pages.length}</Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>Total Pages</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 120, borderRadius: 10, padding: 12, backgroundColor: '#16A34A0F', gap: 4 }}>
                    <Text style={{ fontSize: 22, fontWeight: '900', color: '#16A34A' }}>{granted}</Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>Permissions Granted</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 120, borderRadius: 10, padding: 12, backgroundColor: '#F59E0B0F', gap: 4 }}>
                    <Text style={{ fontSize: 22, fontWeight: '900', color: '#F59E0B' }}>{position?.users?.length ?? 0}</Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>Users Assigned</Text>
                  </View>
                </View>
                {affectedModules.length > 0 && (
                  <View style={{ gap: 6 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary }}>AFFECTED MODULES</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {affectedModules.map(m => <Badge key={m} label={m} tone={MODULE_COLORS[m] ?? '#6B7280'} />)}
                    </View>
                  </View>
                )}
                {granted === 0 && (
                  <View style={{ flexDirection: 'row', gap: 8, backgroundColor: '#FEF3C7', borderRadius: 10, padding: 10, alignItems: 'center' }}>
                    <ZapOff size={15} color="#F59E0B" />
                    <Text style={{ fontSize: 12, color: '#92400E', fontWeight: '600' }}>No permissions granted — this role will have read-only access to nothing.</Text>
                  </View>
                )}
              </View>
            </View>
          </FadeIn>
        )}
      </ScrollView>
      {/* Footer */}
      <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {steps.map((s, i) => <View key={s.key} style={{ width: step === s.key ? 20 : 6, height: 6, borderRadius: 3, backgroundColor: step === s.key ? colors.primary : colors.border }} />)}
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {step !== 'general' && (
            <TouchableOpacity onPress={() => setStep(step === 'summary' ? 'permissions' : 'general')} style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontWeight: '700', color: colors.text }}>Back</Text>
            </TouchableOpacity>
          )}
          {step !== 'summary' ? (
            <TouchableOpacity onPress={() => setStep(step === 'general' ? 'permissions' : 'summary')} style={{ paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.primary }}>
              <Text style={{ fontWeight: '700', color: '#fff' }}>Continue</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={save} disabled={saving} style={{ paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, backgroundColor: saving ? colors.border : colors.primary }}>
              <Text style={{ fontWeight: '700', color: saving ? colors.textSecondary : '#fff' }}>{saving ? 'Saving…' : 'Save Position'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Animated.View>
  )

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={{ flex: 1, backgroundColor: 'rgba(7,17,31,0.5)', justifyContent: isMobile ? 'flex-end' : 'center', alignItems: 'center', opacity: fadeAnim }}>
        <TouchableOpacity style={{ position: 'absolute', inset: 0 }} onPress={onClose} activeOpacity={1} />
        {modalContent}
      </Animated.View>
    </Modal>
  )
}

// ─── Drawer: Overview Tab ─────────────────────────────────────────────────────
function OverviewTab({ employee, positions, onPositionSaved }: { employee: EmployeeRow; positions: PositionRow[]; onPositionSaved: () => Promise<void> }) {
  const { colors } = useTheme()
  const [positionId, setPositionId] = useState<string | null>(employee.positionId ?? null)
  const [posMenuOpen, setPosMenuOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const status = employeeStatus(employee)
  const currentPosition = positions.find(p => p.id === (positionId ?? employee.positionId))

  const assignPosition = async () => {
    setSaving(true)
    try {
      await HrService.updateUserPosition(employee.id, positionId)
      await onPositionSaved()
    } finally {
      setSaving(false)
    }
  }

  const kpis = [
    { label: 'Department', value: employee.department?.label ?? 'Unassigned', color: '#2563EB' },
    { label: 'Position', value: employee.position?.name ?? 'No position', color: '#7C3AED' },
    { label: 'Role', value: employee.role ?? '—', color: '#F59E0B' },
    { label: 'Status', value: status, color: status === 'Active' ? '#16A34A' : '#6B7280' },
  ]

  return (
    <View style={{ gap: 14 }}>
      {/* KPI Chips */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {kpis.map(k => (
          <View key={k.label} style={{ borderRadius: 10, padding: 10, flex: 1, minWidth: 100, borderWidth: 1, borderColor: `${k.color}30`, backgroundColor: `${k.color}0A` }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: k.color, textTransform: 'uppercase', marginBottom: 3 }}>{k.label}</Text>
            <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>{k.value}</Text>
          </View>
        ))}
      </View>
      {/* Profile details */}
      <SectionCard title="Profile Details">
        <InfoRow label="Full Name" value={safeName(employee)} />
        <Divider />
        <InfoRow label="Email" value={employee.email ?? '—'} mono />
        <Divider />
        <InfoRow label="Salary" value={employee.salary ? `₱${employee.salary.toLocaleString()}` : '—'} />
        <Divider />
        <InfoRow label="Member Since" value={formatDate(employee.createdAt)} />
        <Divider />
        <InfoRow label="Verification" value="Active" />
      </SectionCard>
      {/* Assign Position */}
      <SectionCard title="Assign Position" subtitle="Changes take effect immediately">
        <View style={{ gap: 10 }}>
          <TouchableOpacity onPress={() => setPosMenuOpen(v => !v)} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 11, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.background }}>
            <Text style={{ color: currentPosition ? colors.text : colors.textSecondary, fontWeight: '600', fontSize: 13 }}>{currentPosition?.name ?? 'Select a position…'}</Text>
            <ChevronDown size={15} color={colors.textSecondary} />
          </TouchableOpacity>
          {posMenuOpen && (
            <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, overflow: 'hidden', backgroundColor: colors.surface }}>
              <TouchableOpacity onPress={() => { setPositionId(null); setPosMenuOpen(false) }} style={{ padding: 11, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>— Remove position</Text>
              </TouchableOpacity>
              {positions.map(p => (
                <TouchableOpacity key={p.id} onPress={() => { setPositionId(p.id); setPosMenuOpen(false) }} style={{ padding: 11, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13 }}>{p.name}</Text>
                  {positionId === p.id && <Check size={14} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </View>
          )}
          <TouchableOpacity onPress={assignPosition} disabled={saving} style={{ alignSelf: 'flex-start', backgroundColor: saving ? colors.border : colors.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 }}>
            <Text style={{ color: saving ? colors.textSecondary : '#fff', fontWeight: '700', fontSize: 13 }}>{saving ? 'Saving…' : 'Save Position'}</Text>
          </TouchableOpacity>
        </View>
      </SectionCard>
    </View>
  )
}

// ─── Drawer: Permissions Tab ──────────────────────────────────────────────────
function PermissionsTab({ employee, position, pages, onRefresh }: { employee: EmployeeRow; position: PositionRow | null; pages: PageRow[]; onRefresh: () => Promise<void> }) {
  const { colors } = useTheme()
  const [overrides, setOverrides] = useState<Record<string, PermissionRow>>({})
  const [saving, setSaving] = useState(false)
  const [changed, setChanged] = useState(false)
  const hasPosition = Boolean(employee.positionId)

  useEffect(() => {
    if (hasPosition) return
    PositionService.getUserPermissionOverrides(employee.id).then(rows => {
      setOverrides(Object.fromEntries(rows.map(r => [r.pageId, { pageId: r.pageId, canView: !!r.canView, canCreate: !!r.canCreate, canEdit: !!r.canEdit, canDelete: !!r.canDelete }])))
    })
  }, [employee.id, hasPosition])

  const saveOverrides = async () => {
    setSaving(true)
    try {
      for (const [pageId, perm] of Object.entries(overrides)) {
        await PositionService.setUserPermissionOverride(employee.id, pageId, {
          canView: perm.canView, canCreate: perm.canCreate, canEdit: perm.canEdit, canDelete: perm.canDelete,
        })
      }
      setChanged(false)
      await onRefresh()
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to save overrides.')
    } finally {
      setSaving(false)
    }
  }

  // Mode 1: User has a position — show inherited permissions (read-only)
  if (hasPosition && position) {
    const perms = position.permissions ?? []
    const groups = groupPagesByModule(perms.map(p => ({ id: p.pageId, key: p.page?.key ?? p.pageId, label: p.page?.label ?? p.pageId })))
    return (
      <View style={{ gap: 14 }}>
        <View style={{ flexDirection: 'row', gap: 8, backgroundColor: `${colors.primary}0F`, borderRadius: 10, padding: 12, alignItems: 'center' }}>
          <Shield size={15} color={colors.primary} />
          <Text style={{ flex: 1, fontSize: 13, color: colors.text, fontWeight: '600' }}>This user inherits permissions from their assigned position.</Text>
        </View>
        <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <ShieldCheck size={16} color="#7C3AED" />
            <Text style={{ color: colors.text, fontSize: 15, fontWeight: '900' }}>{position.name}</Text>
          </View>
          {position.description && <Text style={{ fontSize: 13, color: colors.textSecondary }}>{position.description}</Text>}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            <Badge label={`${perms.length} permission rows`} tone="#7C3AED" />
            <Badge label={`${perms.filter(p => p.canView).length} pages visible`} tone="#16A34A" />
          </View>
        </View>
        {/* Permission breakdown per module */}
        {Object.entries(groups).map(([mod, rows]) => (
          <View key={mod} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, overflow: 'hidden' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, backgroundColor: colors.background }}>
              <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: MODULE_COLORS[mod] ?? '#6B7280' }} />
              <Text style={{ flex: 1, fontSize: 13, fontWeight: '800', color: colors.text }}>{mod}</Text>
            </View>
            {rows.map((pageRef, i) => {
              const perm = position.permissions?.find(p => p.pageId === pageRef.id)
              if (!perm) return null
              return (
                <View key={pageRef.id} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 9, borderTopWidth: 1, borderTopColor: colors.border }}>
                  <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: colors.text }}>{pageRef.label}</Text>
                  <View style={{ flexDirection: 'row', gap: 5 }}>
                    {PERM_KEYS.map(k => (
                      <View key={k} style={{ paddingHorizontal: 6, paddingVertical: 3, borderRadius: 5, backgroundColor: perm[k] ? '#DCFCE7' : `${colors.border}60` }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: perm[k] ? '#15803D' : colors.textSecondary }}>{PERM_LABELS[k]}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )
            })}
          </View>
        ))}
      </View>
    )
  }

  // Mode 2: No position — show full override grid
  return (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', gap: 8, backgroundColor: '#FEF3C70F', borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#F59E0B30' }}>
        <ShieldOff size={15} color="#F59E0B" />
        <Text style={{ flex: 1, fontSize: 13, color: colors.text, fontWeight: '600' }}>No position assigned. You can set per-page permission overrides for this user.</Text>
      </View>
      <PermissionGrid pages={pages} permissions={overrides} setPermissions={(next) => { setOverrides(next); setChanged(true) }} />
      {changed && (
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
          <TouchableOpacity onPress={() => { setChanged(false) }} style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ fontWeight: '700', color: colors.text }}>Discard</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={saveOverrides} disabled={saving} style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, backgroundColor: saving ? colors.border : colors.primary }}>
            <Text style={{ fontWeight: '700', color: saving ? colors.textSecondary : '#fff' }}>{saving ? 'Saving…' : 'Save Overrides'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

// ─── Drawer: Activity Tab ─────────────────────────────────────────────────────
const ACTIVITY_ICONS: Record<string, any> = {
  LOGIN: LogIn, LOGOUT: LogOut, CREATE: Plus, UPDATE: Edit3, DELETE: Trash2,
  APPROVE: UserCheck, VIEW: Eye, DEFAULT: Activity,
}
const ACTIVITY_COLORS: Record<string, string> = {
  LOGIN: '#16A34A', LOGOUT: '#6B7280', CREATE: '#2563EB', UPDATE: '#F59E0B',
  DELETE: '#DC2626', APPROVE: '#0891B2', VIEW: '#7C3AED', DEFAULT: '#6B7280',
}

function ActivityTab({ auditLogs, employeeId }: { auditLogs: any[]; employeeId: number }) {
  const { colors } = useTheme()
  const logs = auditLogs.filter(l => String(l.userId) === String(employeeId)).slice(0, 40)

  if (logs.length === 0) {
    return <EmptyState icon={Activity} title="No activity yet" message="Actions performed by this user will appear here." />
  }

  return (
    <View style={{ gap: 2 }}>
      {logs.map((log, i) => {
        const action = (log.action ?? 'DEFAULT').toUpperCase()
        const Icon = ACTIVITY_ICONS[action] ?? ACTIVITY_ICONS.DEFAULT
        const toneColor = ACTIVITY_COLORS[action] ?? ACTIVITY_COLORS.DEFAULT
        return (
          <View key={log.id ?? i} style={{ flexDirection: 'row', gap: 12, paddingVertical: 10 }}>
            {/* Timeline line */}
            <View style={{ alignItems: 'center', width: 32 }}>
              <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: `${toneColor}18`, alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={14} color={toneColor} strokeWidth={2} />
              </View>
              {i < logs.length - 1 && <View style={{ width: 1, flex: 1, backgroundColor: colors.border, marginTop: 4 }} />}
            </View>
            <View style={{ flex: 1, paddingTop: 4, paddingBottom: 10 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{log.action ?? 'Action'}</Text>
              {(log.recordType || log.recordId) && (
                <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 1 }}>{[log.recordType, log.recordId && `#${log.recordId}`, log.pageKey].filter(Boolean).join(' · ')}</Text>
              )}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 }}>
                <Clock size={11} color={colors.textSecondary} />
                <Text style={{ fontSize: 11, color: colors.textSecondary }}>{formatDateTime(log.createdAt)}</Text>
              </View>
            </View>
          </View>
        )
      })}
    </View>
  )
}

// ─── Drawer: Devices Tab ──────────────────────────────────────────────────────
function DevicesTab() {
  const { colors } = useTheme()
  // Device data is not yet captured by the backend - show placeholder UI
  const placeholderDevices = [
    { browser: 'Chrome 124', os: 'Windows 11', ip: '—', country: '—', lastSeen: 'Today', trusted: true, current: true },
  ]
  return (
    <View style={{ gap: 10 }}>
      {placeholderDevices.map((d, i) => (
        <View key={i} style={{ borderWidth: 1, borderColor: d.current ? `${colors.primary}40` : colors.border, borderRadius: 12, padding: 14, gap: 10, backgroundColor: d.current ? `${colors.primary}06` : colors.surface }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Monitor size={18} color={d.current ? colors.primary : colors.textSecondary} />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text }}>{d.browser}</Text>
                {d.current && <Badge label="Current" tone={colors.primary} size="xs" />}
                {d.trusted && <Badge label="Trusted" tone="#16A34A" size="xs" />}
              </View>
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>{d.os}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
            <InfoRow label="IP" value={d.ip} />
            <InfoRow label="Country" value={d.country} />
            <InfoRow label="Last Seen" value={d.lastSeen} />
          </View>
          {!d.current && (
            <TouchableOpacity style={{ alignSelf: 'flex-start', borderRadius: 8, borderWidth: 1, borderColor: '#DC262640', paddingHorizontal: 10, paddingVertical: 6 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#DC2626' }}>Sign Out Device</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
      <View style={{ borderRadius: 10, padding: 12, backgroundColor: `${colors.border}40`, alignItems: 'center' }}>
        <Text style={{ fontSize: 12, color: colors.textSecondary, textAlign: 'center' }}>Full device management is available in the Security Center.</Text>
      </View>
    </View>
  )
}

// ─── Drawer: Audit Tab ────────────────────────────────────────────────────────
function AuditTab({ auditLogs, employeeId }: { auditLogs: any[]; employeeId: number }) {
  const { colors } = useTheme()
  const { width } = useWindowDimensions()
  const isWide = width >= 1024
  const [query, setQuery] = useState('')
  const logs = auditLogs
    .filter(l => String(l.userId) === String(employeeId))
    .filter(l => !query || `${l.action} ${l.recordType} ${l.pageKey}`.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 50)

  return (
    <View style={{ gap: 12 }}>
      <View style={{ height: 36, borderWidth: 1, borderColor: colors.border, borderRadius: 10, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, backgroundColor: colors.background }}>
        <Search size={13} color={colors.textSecondary} />
        <TextInput value={query} onChangeText={setQuery} placeholder="Search audit events…" placeholderTextColor={colors.textSecondary} style={{ flex: 1, color: colors.text, fontSize: 13, marginLeft: 6 }} />
      </View>
      {logs.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="No audit logs" message="Audit events for this user will appear here." />
      ) : isWide ? (
        <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, overflow: 'hidden' }}>
          <View style={{ flexDirection: 'row', padding: 10, backgroundColor: colors.background }}>
            {['Date', 'Action', 'Entity', 'Old', 'New'].map(h => (
              <Text key={h} style={{ flex: 1, fontSize: 11, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase' }}>{h}</Text>
            ))}
          </View>
          {logs.map((log, i) => (
            <View key={log.id ?? i} style={{ flexDirection: 'row', padding: 10, borderTopWidth: 1, borderTopColor: colors.border }}>
              <Text style={{ flex: 1, fontSize: 12, color: colors.textSecondary }}>{formatDateTime(log.createdAt)}</Text>
              <Text style={{ flex: 1, fontSize: 12, fontWeight: '700', color: colors.text }}>{log.action}</Text>
              <Text style={{ flex: 1, fontSize: 12, color: colors.textSecondary }}>{log.recordType ?? '—'}</Text>
              <Text style={{ flex: 1, fontSize: 12, color: colors.textSecondary }} numberOfLines={1}>{log.oldValue ?? '—'}</Text>
              <Text style={{ flex: 1, fontSize: 12, color: colors.textSecondary }} numberOfLines={1}>{log.newValue ?? '—'}</Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          {logs.map((log, i) => (
            <View key={log.id ?? i} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, gap: 4 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>{log.action}</Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary }}>{formatDateTime(log.createdAt)}</Text>
              </View>
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>{[log.recordType, log.recordId && `#${log.recordId}`].filter(Boolean).join(' ')}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

// ─── Employee Drawer ──────────────────────────────────────────────────────────
const DRAWER_TABS: Array<{ key: DrawerTab; label: string; icon: any }> = [
  { key: 'overview', label: 'Overview', icon: UserCheck },
  { key: 'permissions', label: 'Permissions', icon: ShieldCheck },
  { key: 'activity', label: 'Activity', icon: Activity },
  { key: 'devices', label: 'Devices', icon: Monitor },
  { key: 'audit', label: 'Audit', icon: ShieldCheck },
]

function EmployeeDrawer({
  employee, positions, pages, auditLogs, onClose, onRefresh,
}: {
  employee: EmployeeRow | null; positions: PositionRow[]; pages: PageRow[]
  auditLogs: any[]; onClose: () => void; onRefresh: () => Promise<void>
}) {
  const { colors } = useTheme()
  const { width } = useWindowDimensions()
  const isDesktop = width >= 1024
  const drawerWidth = isDesktop ? 580 : width
  const [tab, setTab] = useState<DrawerTab>('overview')

  const slideX = useRef(new Animated.Value(drawerWidth)).current
  const fadeOverlay = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (employee) {
      setTab('overview')
      Animated.parallel([
        Animated.spring(slideX, { toValue: 0, useNativeDriver: true, speed: 30, bounciness: 3 }),
        Animated.timing(fadeOverlay, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start()
    } else {
      Animated.parallel([
        Animated.timing(slideX, { toValue: drawerWidth, duration: 220, useNativeDriver: true }),
        Animated.timing(fadeOverlay, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start()
    }
  }, [employee])

  const position = employee ? positions.find(p => p.id === employee.positionId) ?? null : null
  const status = employee ? employeeStatus(employee) : 'Inactive'

  return (
    <Modal visible={!!employee} transparent animationType="none" onRequestClose={onClose}>
      <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'flex-end' }}>
        {/* Overlay */}
        <Animated.View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(7,17,31,0.45)', opacity: fadeOverlay }}>
          <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
        </Animated.View>
        {/* Drawer */}
        <Animated.View style={{ width: drawerWidth, backgroundColor: colors.surface, borderLeftWidth: isDesktop ? 1 : 0, borderLeftColor: colors.border, transform: [{ translateX: slideX }] }}>
          {employee ? (
            <View style={{ flex: 1 }}>
              {/* Employee header */}
              <View style={{ backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <View style={{ padding: 16, flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                  <EmployeeAvatar employee={employee} size={48} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontSize: 18, fontWeight: '900' }} numberOfLines={1}>{safeName(employee)}</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 1 }} numberOfLines={1}>{employee.email ?? 'No email'}</Text>
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                      {employee.role && <Badge label={employee.role} tone="#F59E0B" size="xs" />}
                      {employee.department?.label && <Badge label={employee.department.label} tone="#2563EB" size="xs" />}
                      {employee.position?.name && <Badge label={employee.position.name} tone="#7C3AED" size="xs" />}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <StatusDot active={status === 'Active'} />
                        <Text style={{ fontSize: 11, fontWeight: '700', color: status === 'Active' ? '#16A34A' : '#6B7280' }}>{status}</Text>
                      </View>
                    </View>
                  </View>
                  <TouchableOpacity onPress={onClose} style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
                    <X size={15} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                {/* Modern tabs */}
                <TabBar tabs={DRAWER_TABS} active={tab} onChange={setTab} scrollable />
              </View>
              {/* Tab content */}
              <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
                {tab === 'overview' && (
                  <FadeIn>
                    <OverviewTab employee={employee} positions={positions} onPositionSaved={onRefresh} />
                  </FadeIn>
                )}
                {tab === 'permissions' && (
                  <FadeIn>
                    <PermissionsTab employee={employee} position={position} pages={pages} onRefresh={onRefresh} />
                  </FadeIn>
                )}
                {tab === 'activity' && (
                  <FadeIn>
                    <ActivityTab auditLogs={auditLogs} employeeId={employee.id} />
                  </FadeIn>
                )}
                {tab === 'devices' && (
                  <FadeIn>
                    <DevicesTab />
                  </FadeIn>
                )}
                {tab === 'audit' && (
                  <FadeIn>
                    <AuditTab auditLogs={auditLogs} employeeId={employee.id} />
                  </FadeIn>
                )}
              </ScrollView>
            </View>
          ) : null}
        </Animated.View>
      </View>
    </Modal>
  )
}

// ─── Add Employee Modal ───────────────────────────────────────────────────────
function AddEmployeeModal({ visible, positions, onClose, onSaved }: { visible: boolean; positions: PositionRow[]; onClose: () => void; onSaved: () => Promise<void> }) {
  const { colors } = useTheme()
  const [fullname, setFullname] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('Welcome123!')
  const [positionId, setPositionId] = useState<string | undefined>()
  const [saving, setSaving] = useState(false)
  const fadeAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: visible ? 1 : 0, duration: 200, useNativeDriver: true }).start()
  }, [visible])

  const save = async () => {
    if (!fullname.trim() || !email.trim()) return Alert.alert('Required', 'Name and email are required.')
    setSaving(true)
    try {
      await HrService.createHRUser({ fullname: fullname.trim(), email: email.trim(), password, positionId, role: 'STAFF' })
      await onSaved()
      onClose()
      setFullname(''); setEmail(''); setPositionId(undefined)
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to create employee.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={{ flex: 1, backgroundColor: 'rgba(7,17,31,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20, opacity: fadeAnim }}>
        <TouchableOpacity style={{ position: 'absolute', inset: 0 }} onPress={onClose} activeOpacity={1} />
        <View style={{ width: '100%', maxWidth: 520, backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
          <View style={{ padding: 18, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: `${colors.primary}18`, alignItems: 'center', justifyContent: 'center' }}>
              <UserPlus size={17} color={colors.primary} />
            </View>
            <Text style={{ flex: 1, color: colors.text, fontSize: 17, fontWeight: '900' }}>Add Employee</Text>
            <TouchableOpacity onPress={onClose}><X size={18} color={colors.textSecondary} /></TouchableOpacity>
          </View>
          <View style={{ padding: 18, gap: 12 }}>
            <View style={{ gap: 5 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary }}>FULL NAME *</Text>
              <TextInput value={fullname} onChangeText={setFullname} placeholder="e.g. Maria Santos" placeholderTextColor={colors.textSecondary} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 11, color: colors.text, fontSize: 13, backgroundColor: colors.background }} />
            </View>
            <View style={{ gap: 5 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary }}>EMAIL ADDRESS *</Text>
              <TextInput value={email} onChangeText={setEmail} placeholder="maria@company.com" placeholderTextColor={colors.textSecondary} autoCapitalize="none" keyboardType="email-address" style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 11, color: colors.text, fontSize: 13, backgroundColor: colors.background }} />
            </View>
            <View style={{ gap: 5 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary }}>TEMPORARY PASSWORD</Text>
              <TextInput value={password} onChangeText={setPassword} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 11, color: colors.text, fontSize: 13, backgroundColor: colors.background }} />
            </View>
            <View style={{ gap: 5 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary }}>POSITION (OPTIONAL)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {positions.map(p => (
                    <TouchableOpacity key={p.id} onPress={() => setPositionId(positionId === p.id ? undefined : p.id)} style={{ borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: positionId === p.id ? colors.primary : colors.border, backgroundColor: positionId === p.id ? `${colors.primary}14` : colors.surface }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: positionId === p.id ? colors.primary : colors.textSecondary }}>{p.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          </View>
          <View style={{ padding: 14, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', gap: 8, justifyContent: 'flex-end' }}>
            <TouchableOpacity onPress={onClose} style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontWeight: '700', color: colors.text }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={save} disabled={saving} style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: saving ? colors.border : colors.primary }}>
              <Text style={{ fontWeight: '700', color: saving ? colors.textSecondary : '#fff' }}>{saving ? 'Creating…' : 'Create Employee'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </Modal>
  )
}

// ─── Position Cards ───────────────────────────────────────────────────────────
function PositionCard({ position, onEdit, onDuplicate, onDelete, onViewUsers }: {
  position: PositionRow
  onEdit: () => void
  onDuplicate: () => void
  onDelete: () => void
  onViewUsers: () => void
}) {
  const { colors } = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)
  const toneColor = position.color ?? POSITION_COLORS[0]
  const pageCount = position.permissions?.filter(p => p.canView).length ?? 0
  const permCount = position.permissions?.length ?? 0
  const userCount = position.users?.length ?? 0

  return (
    <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 14, overflow: 'hidden', backgroundColor: colors.surface }}>
      <View style={{ height: 3, backgroundColor: toneColor }} />
      <View style={{ padding: 14, gap: 10 }}>
        {/* Title row */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
          <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: `${toneColor}18`, alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={17} color={toneColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontSize: 14, fontWeight: '900' }} numberOfLines={1}>{position.name}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }} numberOfLines={2}>{position.description || 'No description'}</Text>
          </View>
          <View style={{ position: 'relative' }}>
            <TouchableOpacity onPress={() => setMenuOpen(v => !v)} style={{ width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
              <MoreHorizontal size={15} color={colors.textSecondary} />
            </TouchableOpacity>
            {menuOpen && (
              <View style={{ position: 'absolute', top: 34, right: 0, zIndex: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 10, minWidth: 150, overflow: 'hidden' }}>
                {[
                  { label: 'Edit', icon: Edit3, color: colors.text, action: onEdit },
                  { label: 'Duplicate', icon: Copy, color: colors.text, action: onDuplicate },
                  { label: 'View Users', icon: Users, color: colors.text, action: onViewUsers },
                  { label: 'Archive', icon: Archive, color: '#F59E0B', action: () => {} },
                  { label: 'Delete', icon: Trash2, color: '#DC2626', action: onDelete },
                ].map(item => (
                  <TouchableOpacity key={item.label} onPress={() => { item.action(); setMenuOpen(false) }} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: item.label !== 'Edit' ? 1 : 0, borderTopColor: colors.border }}>
                    <item.icon size={14} color={item.color} />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: item.color }}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>
        {/* Stats */}
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          <Badge label={`${userCount} ${userCount === 1 ? 'user' : 'users'}`} tone="#2563EB" size="xs" />
          <Badge label={`${pageCount} pages`} tone="#16A34A" size="xs" />
          <Badge label={`${permCount} perms`} tone="#7C3AED" size="xs" />
        </View>
        {/* Last updated */}
        {position.updatedAt && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Clock size={10} color={colors.textSecondary} />
            <Text style={{ fontSize: 11, color: colors.textSecondary }}>Updated {formatDate(position.updatedAt)}</Text>
          </View>
        )}
        {/* Quick actions */}
        <View style={{ flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, marginTop: 2 }}>
          <TouchableOpacity onPress={onEdit} style={{ flex: 1, height: 32, borderRadius: 8, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onViewUsers} style={{ flex: 1, height: 32, borderRadius: 8, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>Users</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

// ─── Main HRScreen ────────────────────────────────────────────────────────────
export default function HRScreen() {
  const { colors } = useTheme()
  const { user } = useAuth()
  const { width } = useWindowDimensions()
  const isDesktop = width >= 1100
  const isTablet = width >= 768

  const [prefs, setPrefsState] = useState(defaultPrefs)
  const [search, setSearch] = useState('')
  const [employees, setEmployees] = useState<EmployeeRow[]>([])
  const [positions, setPositions] = useState<PositionRow[]>([])
  const [pages, setPages] = useState<PageRow[]>([])
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [selected, setSelected] = useState<EmployeeRow | null>(null)
  const [positionBuilderOpen, setPositionBuilderOpen] = useState(false)
  const [editingPosition, setEditingPosition] = useState<PositionRow | null>(null)
  const [addEmployeeOpen, setAddEmployeeOpen] = useState(false)

  const setPrefs = useCallback((next: Partial<typeof defaultPrefs>) => {
    setPrefsState(cur => {
      const merged = { ...cur, ...next }
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged)).catch(() => {})
      return merged
    })
  }, [])

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(saved => {
      if (saved) setPrefsState({ ...defaultPrefs, ...JSON.parse(saved) })
    }).catch(() => {})
  }, [])

  const load = useCallback(async () => {
    try {
      setError(null)
      const [staff, posRows, pageRows, logs] = await Promise.all([
        HrService.getAllStaffs(user?.orgId),
        PositionService.getAll(),
        PositionService.getPages((user?.org?.roles ?? ['SELLER']) as any),
        user?.orgId ? AuditService.getLogs(user.orgId, { dateFrom: prefs.dateRange.startDate, dateTo: prefs.dateRange.endDate }, { page: 1, pageSize: 200 }) : Promise.resolve([]),
      ])
      setEmployees(staff ?? [])
      setPositions(posRows ?? [])
      setPages((pageRows ?? []).map((p: any) => ({ id: String(p.id), key: p.key, label: p.label, sortOrder: p.sortOrder })))
      setAuditLogs(logs ?? [])
    } catch (e: any) {
      setError(e?.message ?? 'Unable to load HR workspace.')
    } finally {
      setLoading(false)
    }
  }, [prefs.dateRange.startDate, prefs.dateRange.endDate, user?.org?.roles, user?.orgId])

  useEffect(() => { load() }, [load])

  const refresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  const departments = useMemo(() => [...new Set(employees.map(e => e.department?.label ?? 'Unassigned'))], [employees])

  const kpis = useMemo(() => {
    const active = employees.filter(e => employeeStatus(e) === 'Active').length
    const recent = employees.filter(e => e.createdAt && Date.now() - new Date(e.createdAt).getTime() < 86400000 * 30).length
    const overrides = auditLogs.filter(l => l.recordType === 'UserPermissionOverride').length
    return { total: employees.length, active, inactive: employees.length - active, positions: positions.length, recent, overrides }
  }, [auditLogs, employees, positions.length])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let rows = employees.filter(e => {
      const hay = `${safeName(e)} ${e.email ?? ''} ${e.role ?? ''} ${e.department?.label ?? ''} ${e.position?.name ?? ''}`.toLowerCase()
      const created = e.createdAt ? new Date(e.createdAt).getTime() : 0
      const inRange = !created || (created >= new Date(prefs.dateRange.startDate).getTime() && created <= new Date(prefs.dateRange.endDate).getTime())
      return (!q || hay.includes(q))
        && (prefs.status === 'ALL' || employeeStatus(e) === prefs.status)
        && (prefs.department === 'ALL' || (e.department?.label ?? 'Unassigned') === prefs.department)
        && (prefs.position === 'ALL' || e.positionId === prefs.position)
        && inRange
    })
    rows = [...rows].sort((a, b) => {
      if (prefs.sort === 'newest') return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
      if (prefs.sort === 'department') return (a.department?.label ?? '').localeCompare(b.department?.label ?? '')
      if (prefs.sort === 'position') return (a.position?.name ?? '').localeCompare(b.position?.name ?? '')
      if (prefs.sort === 'status') return employeeStatus(a).localeCompare(employeeStatus(b))
      return safeName(a).localeCompare(safeName(b))
    })
    return rows
  }, [employees, prefs, search])

  const paged = filtered.slice((page - 1) * pageSize, page * pageSize)

  const statWidthPct = isDesktop ? '13.4%' : isTablet ? '31%' : '48%'

  const exportCsv = () => {
    const rows = filtered.map(e => [safeName(e), e.email ?? '', e.department?.label ?? '', e.position?.name ?? '', e.role ?? '', employeeStatus(e), e.createdAt ?? ''])
    const csv = [['Employee', 'Email', 'Department', 'Position', 'Role', 'Status', 'Joined'], ...rows]
      .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `hr-${new Date().toISOString().slice(0, 10)}.csv`
      a.click(); URL.revokeObjectURL(url)
    } else {
      Alert.alert('Export ready', 'CSV export is available on web.')
    }
  }

  const openCreatePosition = () => { setEditingPosition(null); setPositionBuilderOpen(true) }
  const openEditPosition = (pos: PositionRow) => { setEditingPosition(pos); setPositionBuilderOpen(true) }

  const duplicatePosition = async (pos: PositionRow) => {
    const created = await PositionService.create(`${pos.name} Copy`, pos.description ?? '')
    if (pos.permissions?.length) {
      await PositionService.setPermissions(String(created.id), pos.permissions.map(p => ({
        pageId: p.pageId, canView: p.canView, canCreate: p.canCreate, canEdit: p.canEdit, canDelete: p.canDelete,
      })))
    }
    await refresh()
  }

  const deletePosition = (pos: PositionRow) => {
    if ((pos.users?.length ?? 0) > 0) return Alert.alert('Cannot delete', 'Reassign employees before deleting this position.')
    Alert.alert('Delete position?', `This will permanently delete "${pos.name}".`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await PositionService.delete(pos.id); await refresh() } },
    ])
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
        contentContainerStyle={{ width: '100%', alignSelf: 'center', paddingHorizontal: isDesktop ? 28 : 16, paddingVertical: 20, gap: 18 }}
      >
        {/* Page header */}
        <View style={{ flexDirection: isDesktop ? 'row' : 'column', justifyContent: 'space-between', alignItems: isDesktop ? 'center' : 'flex-start', gap: 12 }}>
          <View>
            <Text style={{ color: colors.text, fontSize: isDesktop ? 28 : 22, fontWeight: '900', letterSpacing: -0.5 }}>HR Workspace</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 3 }}>Workforce management · Access control · Positions · Activity</Text>
          </View>
          <TouchableOpacity onPress={refresh} style={{ flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 8 }}>
            <RefreshCcw size={14} color={colors.textSecondary} />
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13 }}>Refresh</Text>
          </TouchableOpacity>
        </View>

        {loading ? <LoadingRows /> : error ? (
          <EmptyState icon={ZapOff} title="Unable to load HR" message={error} />
        ) : (
          <>
            {/* KPI Stats */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              <StatCard title="Total Employees" value={kpis.total} subtitle="All workforce" accent="#2563EB" icon={Users} widthPct={statWidthPct} />
              <StatCard title="Active" value={kpis.active} subtitle="Currently enabled" accent="#16A34A" icon={UserCheck} widthPct={statWidthPct} />
              <StatCard title="Inactive" value={kpis.inactive} subtitle="Needs review" accent="#6B7280" icon={Users} widthPct={statWidthPct} />
              <StatCard title="Positions" value={kpis.positions} subtitle="RBAC roles" accent="#7C3AED" icon={BriefcaseBusiness} widthPct={statWidthPct} />
              <StatCard title="Recent Hires" value={kpis.recent} subtitle="Last 30 days" accent="#0EA5E9" icon={UserPlus} widthPct={statWidthPct} />
              <StatCard title="Perm Overrides" value={kpis.overrides} subtitle="Audit events" accent="#DC2626" icon={KeyRound} widthPct={statWidthPct} />
            </View>

            {/* Toolbar */}
            <HRToolbar
              search={search} setSearch={setSearch} prefs={prefs} setPrefs={setPrefs}
              departments={departments} positions={positions}
              onAddEmployee={() => setAddEmployeeOpen(true)}
              onCreatePosition={openCreatePosition}
              onExport={exportCsv}
            />

            {/* Workforce Table / Cards */}
            <SectionCard
              title={`Workforce  ·  ${filtered.length} employees`}
              subtitle={prefs.viewMode === 'table' ? 'Click any row to open the employee details panel' : 'Tap any card to inspect details'}
              padded={false}
            >
              <View style={{ padding: 16 }}>
                {filtered.length === 0 ? (
                  <EmptyState icon={Users} title="No employees found" message="Try adjusting your filters or adding an employee." />
                ) : prefs.viewMode === 'table' ? (
                  <EmployeeTable employees={paged} onSelect={setSelected} />
                ) : (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                    {paged.map((e, i) => (
                      <FadeIn key={e.id} delay={i * 16} style={{ flexGrow: 1, flexBasis: isTablet ? 280 : '100%' as any }}>
                        <EmployeeCard employee={e} onSelect={setSelected} />
                      </FadeIn>
                    ))}
                  </View>
                )}
              </View>
              <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: 16 }}>
                <CatalogPagination
                  page={page} pageSize={pageSize} totalItems={filtered.length}
                  onPageChange={p => { setPage(p) }}
                  onPageSizeChange={s => { setPageSize(s); setPage(1) }}
                />
              </View>
            </SectionCard>

            {/* Position Management */}
            <SectionCard
              title="Position Management"
              subtitle="Define role-based permission sets and assign them to employees"
              action={
                <TouchableOpacity onPress={openCreatePosition} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 }}>
                  <Plus size={14} color="#fff" />
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>New Position</Text>
                </TouchableOpacity>
              }
            >
              {positions.length === 0 ? (
                <EmptyState icon={ShieldCheck} title="No positions yet" message="Create your first position to define employee permission sets." />
              ) : (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                  {positions.map((pos, i) => (
                    <FadeIn key={pos.id} delay={i * 20} style={{ flexGrow: 1, flexBasis: isDesktop ? 260 : isTablet ? 220 : '100%' as any }}>
                      <PositionCard
                        position={pos}
                        onEdit={() => openEditPosition(pos)}
                        onDuplicate={() => duplicatePosition(pos)}
                        onDelete={() => deletePosition(pos)}
                        onViewUsers={() => { setPrefs({ position: pos.id }) }}
                      />
                    </FadeIn>
                  ))}
                </View>
              )}
            </SectionCard>
          </>
        )}
      </ScrollView>

      {/* FAB — mobile */}
      {!isDesktop && (
        <TouchableOpacity
          onPress={() => setAddEmployeeOpen(true)}
          style={{ position: 'absolute', right: 18, bottom: 24, width: 54, height: 54, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 6 }}
        >
          <Plus size={22} color="#fff" strokeWidth={2.5} />
        </TouchableOpacity>
      )}

      <EmployeeDrawer employee={selected} positions={positions} pages={pages} auditLogs={auditLogs} onClose={() => setSelected(null)} onRefresh={refresh} />
      <PositionBuilder visible={positionBuilderOpen} pages={pages} position={editingPosition} onClose={() => setPositionBuilderOpen(false)} onSaved={refresh} />
      <AddEmployeeModal visible={addEmployeeOpen} positions={positions} onClose={() => setAddEmployeeOpen(false)} onSaved={refresh} />
    </View>
  )
}
