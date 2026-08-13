// screens/admin/SubscriptionManagementScreen.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  AlertCircle,
  Building2,
  Calendar,
  Check,
  ChevronDown,
  Clock,
  Crown,
  Filter,
  MoreVertical,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  X,
  Zap,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import {
  AdminSubscriptionService,
  OrgSubscription,
  SubscriptionList,
  SubscriptionPlan,
} from '@/services/AdminSubscriptionService';

// ─── Constants ────────────────────────────────────────────────────────────────

// ─── Plan meta ────────────────────────────────────────────────────────────────

type PlanMeta = {
  label: string;
  color: string;
  bg: string;
  icon: React.FC<{ size: number; color: string; strokeWidth?: number }>;
};

const PLAN_META: Record<SubscriptionPlan, PlanMeta> = {
  BASIC: { label: 'Basic', color: '#6B7280', bg: '#F3F4F6', icon: Shield },
  GOLD:  { label: 'Gold',  color: '#D97706', bg: '#FEF3C7', icon: Crown  },
};
const EXTEND_OPTIONS = [7, 14, 30, 90, 180, 365];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null) {
  if (!iso) return 'No expiry';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function isExpired(iso: string | null) {
  if (!iso) return false;
  return new Date(iso) < new Date();
}

function isExpiringSoon(iso: string | null, days = 7) {
  if (!iso) return false;
  const diff = new Date(iso).getTime() - Date.now();
  return diff > 0 && diff < days * 86_400_000;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PlanBadge({ plan }: { plan: SubscriptionPlan }) {
  const meta = PLAN_META[plan];
  const Icon = meta.icon;
  return (
    <View style={[styles.planBadge, { backgroundColor: meta.bg }]}>
      <Icon size={11} color={meta.color} strokeWidth={2.5} />
      <Text style={[styles.planBadgeTx, { color: meta.color }]}>{meta.label}</Text>
    </View>
  );
}

function StatusDot({ expiresAt }: { expiresAt: string | null }) {
  const expired = isExpired(expiresAt);
  const soon    = isExpiringSoon(expiresAt);
  const color   = expired ? '#EF4444' : soon ? '#F59E0B' : '#10B981';
  const label   = expired ? 'Expired' : soon ? 'Expiring soon' : 'Active';
  return (
    <View style={styles.statusRow}>
      <View style={[styles.statusDot, { backgroundColor: color }]} />
      <Text style={[styles.statusTx, { color }]}>{label}</Text>
    </View>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

interface CardProps {
  item: OrgSubscription;
  colors: any;
  onAction: (item: OrgSubscription, action: 'edit' | 'extend' | 'delete') => void;
}

function SubscriptionCard({ item, colors, onAction }: CardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuAnim = useRef(new Animated.Value(0)).current;

  const toggleMenu = useCallback(() => {
    const toValue = menuOpen ? 0 : 1;
    setMenuOpen(!menuOpen);
    Animated.spring(menuAnim, { toValue, useNativeDriver: true, tension: 120, friction: 8 }).start();
  }, [menuOpen, menuAnim]);

  const menuScale = menuAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] });
  const menuOpacity = menuAnim;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* Card header */}
      <View style={styles.cardHeader}>
        <View style={[styles.orgAvatar, { backgroundColor: '#7C3AED' + '22' }]}>
          <Building2 size={18} color="#7C3AED" strokeWidth={2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.orgName, { color: colors.text }]} numberOfLines={1}>
            {item.org.name}
          </Text>
          <Text style={[styles.orgEmail, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.org.email ?? '—'}
          </Text>
        </View>

        {/* 3-dot menu */}
        <TouchableOpacity onPress={toggleMenu} style={styles.menuBtn} activeOpacity={0.7}>
          <MoreVertical size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Dropdown menu */}
      {menuOpen && (
        <Pressable style={StyleSheet.absoluteFill} onPress={toggleMenu}>
          <Animated.View
            style={[
              styles.dropdown,
              { backgroundColor: colors.surface, borderColor: colors.border },
              { opacity: menuOpacity, transform: [{ scale: menuScale }] },
            ]}
          >
            {[
              { label: 'Edit Plan',     icon: Zap,      action: 'edit'   as const },
              { label: 'Extend Expiry', icon: Clock,    action: 'extend' as const },
              { label: 'Delete',        icon: Trash2,   action: 'delete' as const, danger: true },
            ].map((opt) => {
              const Icon = opt.icon;
              return (
                <TouchableOpacity
                  key={opt.action}
                  style={styles.dropdownItem}
                  onPress={() => { toggleMenu(); onAction(item, opt.action); }}
                  activeOpacity={0.7}
                >
                  <Icon size={14} color={opt.danger ? '#EF4444' : colors.text} strokeWidth={2} />
                  <Text style={[styles.dropdownTx, { color: opt.danger ? '#EF4444' : colors.text }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </Animated.View>
        </Pressable>
      )}

      {/* Card body */}
      <View style={styles.cardBody}>
        <View style={styles.cardRow}>
          <PlanBadge plan={item.plan} />
          <StatusDot expiresAt={item.expiresAt} />
        </View>
        <View style={[styles.cardRow, { marginTop: 10 }]}>
          <View style={styles.metaItem}>
            <Calendar size={12} color={colors.textSecondary} strokeWidth={2} />
            <Text style={[styles.metaTx, { color: colors.textSecondary }]}>
              Expires: {formatDate(item.expiresAt)}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Clock size={12} color={colors.textSecondary} strokeWidth={2} />
            <Text style={[styles.metaTx, { color: colors.textSecondary }]}>
              Created: {formatDate(item.createdAt)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

interface EditModalProps {
  visible: boolean;
  item: OrgSubscription | null;
  colors: any;
  onClose: () => void;
  onSave: (orgId: number, plan: SubscriptionPlan, expiresAt: string | null) => Promise<void>;
}

function EditModal({ visible, item, colors, onClose, onSave }: EditModalProps) {
  const [plan, setPlan]           = useState<SubscriptionPlan>('BASIC');
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading]     = useState(false);

  useEffect(() => {
    if (item) {
      setPlan(item.plan);
      setExpiresAt(item.expiresAt ? item.expiresAt.slice(0, 10) : '');
    }
  }, [item]);

  const handleSave = async () => {
    if (!item) return;
    setLoading(true);
    try {
      await onSave(item.orgId, plan, expiresAt || null);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={[styles.modalCard, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Subscription</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ padding: 20 }} showsVerticalScrollIndicator={false}>
            {/* Org info */}
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Organization</Text>
            <Text style={[styles.fieldValue, { color: colors.text }]}>{item?.org.name}</Text>

            {/* Plan picker */}
            <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 16 }]}>Plan</Text>
            <View style={styles.planRow}>
              {(Object.keys(PLAN_META) as SubscriptionPlan[]).map((p) => {
                const meta = PLAN_META[p];
                const Icon = meta.icon;
                const active = plan === p;
                return (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.planOption,
                      { borderColor: active ? meta.color : colors.border },
                      active && { backgroundColor: meta.bg },
                    ]}
                    onPress={() => setPlan(p)}
                    activeOpacity={0.75}
                  >
                    <Icon size={16} color={active ? meta.color : colors.textSecondary} strokeWidth={2} />
                    <Text style={[styles.planOptionTx, { color: active ? meta.color : colors.text }]}>
                      {meta.label}
                    </Text>
                    {active && <Check size={14} color={meta.color} strokeWidth={2.5} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Expiry date */}
            <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 16 }]}>
              Expiry Date (YYYY-MM-DD, leave blank = no expiry)
            </Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
              value={expiresAt}
              onChangeText={setExpiresAt}
              placeholder="e.g. 2025-12-31"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numbers-and-punctuation"
            />
          </ScrollView>

          {/* Footer */}
          <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
            <TouchableOpacity style={[styles.btn, { borderColor: colors.border }]} onPress={onClose}>
              <Text style={{ color: colors.text, fontWeight: '600', fontSize: 14 }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary]}
              onPress={handleSave}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.btnPrimaryTx}>Save Changes</Text>
              }
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Extend Modal ─────────────────────────────────────────────────────────────

interface ExtendModalProps {
  visible: boolean;
  item: OrgSubscription | null;
  colors: any;
  onClose: () => void;
  onExtend: (orgId: number, days: number) => Promise<void>;
}

function ExtendModal({ visible, item, colors, onClose, onExtend }: ExtendModalProps) {
  const [days, setDays]       = useState(30);
  const [loading, setLoading] = useState(false);

  const handleExtend = async () => {
    if (!item) return;
    setLoading(true);
    try {
      await onExtend(item.orgId, days);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={[styles.modalCard, { backgroundColor: colors.surface }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Extend Subscription</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={{ padding: 20 }}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Organization</Text>
            <Text style={[styles.fieldValue, { color: colors.text }]}>{item?.org.name}</Text>

            <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 16 }]}>
              Extend by
            </Text>
            <View style={styles.daysGrid}>
              {EXTEND_OPTIONS.map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[
                    styles.dayChip,
                    { borderColor: colors.border },
                    days === d && styles.dayChipActive,
                  ]}
                  onPress={() => setDays(d)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.dayChipTx, { color: days === d ? '#fff' : colors.text }]}>
                    {d}d
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={[styles.extendInfo, { backgroundColor: '#7C3AED' + '11', borderColor: '#7C3AED' + '33' }]}>
              <RefreshCw size={14} color="#7C3AED" strokeWidth={2} />
              <Text style={[styles.extendInfoTx, { color: '#7C3AED' }]}>
                Extends from current expiry (or today if already expired)
              </Text>
            </View>
          </View>

          <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
            <TouchableOpacity style={[styles.btn, { borderColor: colors.border }]} onPress={onClose}>
              <Text style={{ color: colors.text, fontWeight: '600', fontSize: 14 }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary]}
              onPress={handleExtend}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.btnPrimaryTx}>Extend {days} Days</Text>
              }
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Create Modal ─────────────────────────────────────────────────────────────

interface CreateModalProps {
  visible: boolean;
  colors: any;
  onClose: () => void;
  onCreate: (orgId: number, plan: SubscriptionPlan, expiresAt: string | null) => Promise<void>;
}

function CreateModal({ visible, colors, onClose, onCreate }: CreateModalProps) {
  const [orgId, setOrgId]         = useState('');
  const [plan, setPlan]           = useState<SubscriptionPlan>('BASIC');
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading]     = useState(false);

  const handleCreate = async () => {
    const id = parseInt(orgId, 10);
    if (!id) return Alert.alert('Error', 'Enter a valid Org ID');
    setLoading(true);
    try {
      await onCreate(id, plan, expiresAt || null);
      setOrgId(''); setExpiresAt(''); setPlan('BASIC');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={[styles.modalCard, { backgroundColor: colors.surface }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>New Subscription</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ padding: 20 }} showsVerticalScrollIndicator={false}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Org ID</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
              value={orgId}
              onChangeText={setOrgId}
              placeholder="Organization ID"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
            />

            <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 16 }]}>Plan</Text>
            <View style={styles.planRow}>
              {(Object.keys(PLAN_META) as SubscriptionPlan[]).map((p) => {
                const meta = PLAN_META[p];
                const Icon = meta.icon;
                const active = plan === p;
                return (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.planOption,
                      { borderColor: active ? meta.color : colors.border },
                      active && { backgroundColor: meta.bg },
                    ]}
                    onPress={() => setPlan(p)}
                    activeOpacity={0.75}
                  >
                    <Icon size={16} color={active ? meta.color : colors.textSecondary} strokeWidth={2} />
                    <Text style={[styles.planOptionTx, { color: active ? meta.color : colors.text }]}>
                      {meta.label}
                    </Text>
                    {active && <Check size={14} color={meta.color} strokeWidth={2.5} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 16 }]}>
              Expiry Date (optional, YYYY-MM-DD)
            </Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
              value={expiresAt}
              onChangeText={setExpiresAt}
              placeholder="e.g. 2025-12-31"
              placeholderTextColor={colors.textSecondary}
            />
          </ScrollView>

          <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
            <TouchableOpacity style={[styles.btn, { borderColor: colors.border }]} onPress={onClose}>
              <Text style={{ color: colors.text, fontWeight: '600', fontSize: 14 }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary]}
              onPress={handleCreate}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.btnPrimaryTx}>Create</Text>
              }
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function SubscriptionManagementScreen() {
  const { colors } = useTheme();

  const [data, setData]           = useState<SubscriptionList | null>(null);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]       = useState('');
  const [planFilter, setPlanFilter] = useState<SubscriptionPlan | null>(null);
  const [page, setPage]           = useState(1);

  // Modal state
  const [editItem, setEditItem]     = useState<OrgSubscription | null>(null);
  const [extendItem, setExtendItem] = useState<OrgSubscription | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  // ── Fetch ────────────────────────────────────────────────────────────────────

  const fetchData = useCallback(async (p = 1, reset = false) => {
    try {
      const res = await AdminSubscriptionService.getAllSubscriptions({
        query:    search   || undefined,
        plan:     planFilter ?? undefined,
        page:     p,
        pageSize: 20,
      });
      setData((prev) =>
        reset || p === 1
          ? res
          : { ...res, items: [...(prev?.items ?? []), ...res.items] },
      );
      setPage(p);
    } catch (e) {
      Alert.alert('Error', 'Failed to load subscriptions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, planFilter]);

  useEffect(() => { fetchData(1, true); }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData(1, true);
  }, [fetchData]);

  const onEndReached = useCallback(() => {
    if (!data) return;
    const totalPages = Math.ceil(data.total / data.pageSize);
    if (page < totalPages) fetchData(page + 1);
  }, [data, page, fetchData]);

  // ── Actions ──────────────────────────────────────────────────────────────────

  const handleAction = useCallback(
    (item: OrgSubscription, action: 'edit' | 'extend' | 'delete') => {
      if (action === 'edit')   { setEditItem(item);   return; }
      if (action === 'extend') { setExtendItem(item); return; }
      Alert.alert(
        'Delete Subscription',
        `Remove subscription for ${item.org.name}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await AdminSubscriptionService.deleteSubscription(item.orgId);
                fetchData(1, true);
              } catch {
                Alert.alert('Error', 'Failed to delete subscription');
              }
            },
          },
        ],
      );
    },
    [fetchData],
  );

  const handleSaveEdit = useCallback(async (
    orgId: number,
    plan: SubscriptionPlan,
    expiresAt: string | null,
  ) => {
    await AdminSubscriptionService.updateSubscription({ orgId, plan, expiresAt });
    fetchData(1, true);
  }, [fetchData]);

  const handleExtend = useCallback(async (orgId: number, days: number) => {
    await AdminSubscriptionService.extendSubscription(orgId, days);
    fetchData(1, true);
  }, [fetchData]);

  const handleCreate = useCallback(async (
    orgId: number,
    plan: SubscriptionPlan,
    expiresAt: string | null,
  ) => {
    await AdminSubscriptionService.createSubscription({ orgId, plan, expiresAt });
    fetchData(1, true);
  }, [fetchData]);

  // ── Stats strip ──────────────────────────────────────────────────────────────

  const stats = React.useMemo(() => {
    const items = data?.items ?? [];
    return {
      total:   data?.total ?? 0,
      gold:    items.filter((i) => i.plan === 'GOLD').length,
      expired: items.filter((i) => isExpired(i.expiresAt)).length,
      soon:    items.filter((i) => isExpiringSoon(i.expiresAt)).length,
    };
  }, [data]);

  // ── Render ───────────────────────────────────────────────────────────────────

  const renderItem = useCallback(
    ({ item }: { item: OrgSubscription }) => (
      <SubscriptionCard item={item} colors={colors} onAction={handleAction} />
    ),
    [colors, handleAction],
  );

  const ListHeader = (
    <>
      {/* Stats strip */}
      <View style={styles.statsRow}>
        {[
          { label: 'Total',   value: stats.total,   color: '#7C3AED' },
          { label: 'Gold',    value: stats.gold,    color: '#D97706' },
          { label: 'Expired', value: stats.expired, color: '#EF4444' },
          { label: 'Soon',    value: stats.soon,    color: '#F59E0B' },
        ].map((s) => (
          <View key={s.label} style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Plan filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        {([null, 'BASIC', 'GOLD'] as (SubscriptionPlan | null)[]).map((p) => {
          const active = planFilter === p;
          const label  = p === null ? 'All Plans' : PLAN_META[p].label;
          return (
            <TouchableOpacity
              key={String(p)}
              style={[styles.filterChip, active && styles.filterChipActive, { borderColor: active ? '#7C3AED' : colors.border }]}
              onPress={() => setPlanFilter(p)}
              activeOpacity={0.75}
            >
              <Text style={[styles.filterChipTx, { color: active ? '#7C3AED' : colors.textSecondary }]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </>
  );

  const ListEmpty = !loading ? (
    <View style={styles.emptyState}>
      <AlertCircle size={40} color={colors.textSecondary} strokeWidth={1.5} />
      <Text style={[styles.emptyTx, { color: colors.textSecondary }]}>No subscriptions found</Text>
    </View>
  ) : null;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Search + Add bar */}
      <View style={[styles.toolbar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Search size={15} color={colors.textSecondary} strokeWidth={2} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            value={search}
            onChangeText={setSearch}
            placeholder="Search organizations…"
            placeholderTextColor={colors.textSecondary}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <X size={14} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setCreateOpen(true)}
          activeOpacity={0.8}
        >
          <Plus size={16} color="#fff" strokeWidth={2.5} />
          <Text style={styles.addBtnTx}>New</Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#7C3AED" />
        </View>
      ) : (
        <FlatList
          data={data?.items ?? []}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={ListEmpty}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7C3AED" />}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.3}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Modals */}
      <EditModal
        visible={!!editItem}
        item={editItem}
        colors={colors}
        onClose={() => setEditItem(null)}
        onSave={handleSaveEdit}
      />
      <ExtendModal
        visible={!!extendItem}
        item={extendItem}
        colors={colors}
        onClose={() => setExtendItem(null)}
        onExtend={handleExtend}
      />
      <CreateModal
        visible={createOpen}
        colors={colors}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreate}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:        { flex: 1 },
  loader:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
  },
  searchInput: { flex: 1, fontSize: 14 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#7C3AED',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
  },
  addBtnTx: { color: '#fff', fontWeight: '700', fontSize: 13 },

  statsRow:    { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 14 },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  statValue:   { fontSize: 20, fontWeight: '800' },
  statLabel:   { fontSize: 10, fontWeight: '600', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },

  filterScroll: { marginTop: 12 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipActive: { backgroundColor: '#7C3AED' + '18' },
  filterChipTx: { fontSize: 12, fontWeight: '600' },

  listContent: { paddingHorizontal: 16, paddingBottom: 24, gap: 10, paddingTop: 12 },

  card:        { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  cardHeader:  { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, paddingBottom: 10 },
  orgAvatar: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orgName:     { fontSize: 14, fontWeight: '700', letterSpacing: -0.2 },
  orgEmail:    { fontSize: 11, marginTop: 1 },
  menuBtn:     { padding: 6 },

  cardBody:    { paddingHorizontal: 14, paddingBottom: 14 },
  cardRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  metaItem:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaTx:      { fontSize: 11, fontWeight: '500' },

  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  planBadgeTx: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },

  statusRow:   { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statusDot:   { width: 7, height: 7, borderRadius: 4 },
  statusTx:    { fontSize: 11, fontWeight: '600' },

  dropdown: {
    position: 'absolute',
    right: 14,
    top: 42,
    width: 160,
    borderRadius: 10,
    borderWidth: 1,
    zIndex: 100,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  dropdownTx:   { fontSize: 13, fontWeight: '600' },

  emptyState:  { alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 10 },
  emptyTx:     { fontSize: 14, fontWeight: '500' },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: '#00000066',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 16,
    overflow: 'hidden',
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle:  { fontSize: 16, fontWeight: '700' },
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
  },
  fieldLabel:  { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  fieldValue:  { fontSize: 15, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 14,
  },
  planRow:     { flexDirection: 'row', gap: 10 },
  planOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderRadius: 10,
  },
  planOptionTx: { fontSize: 13, fontWeight: '700' },

  daysGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  dayChip: {
    width: 56,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
  },
  dayChipActive: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  dayChipTx:   { fontSize: 13, fontWeight: '700' },

  extendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  extendInfoTx: { fontSize: 12, fontWeight: '500', flex: 1 },

  btn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  btnPrimary:   { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  btnPrimaryTx: { color: '#fff', fontWeight: '700', fontSize: 14 },
});