// screens/MasterFileScreen.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
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
  AtSign,
  BookOpen,
  ChevronRight,
  Edit2,
  FolderOpen,
  LayoutGrid,
  PhilippinePeso,
  Plus,
  Search,
  Tag,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import {
  MasterItem,
  TableKey,
  useMasterFile,
} from '@/contexts/MasterFileContext';
import { TABLE_CONFIG } from '@/utils/masterfileTable';
import { PositionService } from '@/services/positionService';
import { AdminService } from '@/services/ManagerService';
import { useResponsiveGrid } from '@/hooks/useResponsiveGrid';

// ─── Table meta ───────────────────────────────────────────────────────────────

interface TableMeta {
  key: TableKey;
  label: string;
  description: string;
  icon: React.FC<{ size: number; color: string; strokeWidth?: number }>;
  hasColor: boolean;
  placeholder: string;
  accent: string;
}

const TABLES: TableMeta[] = [
  {
    key: 'itemCategories',
    label: 'Item Categories',
    description: 'Product groupings used in Inventory',
    icon: FolderOpen,
    hasColor: false,
    accent: '#E87722',
    placeholder: 'e.g. Frozen Foods',
  },
  {
    key: 'promoTypes',
    label: 'Promo Types',
    description: 'Discount types used on POS — Senior, PWD, Promo, etc.',
    icon: Tag, // import Tag from lucide-react-native
    hasColor: false,
    accent: '#F43F5E',
    placeholder: 'e.g. Senior Citizen',
  },
  {
    key: 'vatTypes',
    label: 'VAT Types',
    description: 'Used in Inventory + Dashboard entry modal',
    icon: PhilippinePeso,
    hasColor: false,
    accent: '#10B981',
    placeholder: 'e.g. Zero-Rated',
  },
  {
    key: 'departments',
    label: 'Departments',
    description: 'Used in HR — filter pills + Add Employee',
    icon: LayoutGrid,
    hasColor: true,
    accent: '#3B82F6',
    placeholder: 'e.g. Logistics',
  },
  {
    key: 'contacts',
    label: 'Contacts',
    description:
      'Global or branch-specific email contacts for Restock Scheduling',
    icon: AtSign,
    hasColor: false,
    accent: '#0EA5E9',
    placeholder: 'e.g. Main Supplier Cebu',
  },
  
  {
    key: 'centers',
    label: 'Centers',
    description: 'Used in Dashboard journal entry',
    icon: BookOpen,
    hasColor: false,
    accent: '#06B6D4',
    placeholder: 'e.g. Iriga Outlet',
  },
  {
    key: 'positions',
    label: 'Positions',
    description: 'RBAC positions with permissions used in HR',
    icon: UserCheck,
    hasColor: false,
    accent: '#6366F1',
    placeholder: 'e.g. Manager',
  },
  {
    key: 'subCenters',
    label: 'Sub-Centers',
    description: 'Used in Dashboard journal entry',
    icon: BookOpen,
    hasColor: false,
    accent: '#F59E0B',
    placeholder: 'e.g. Collections',
  },
  {
    key: 'accountTitles',
    label: 'Account Titles',
    description: 'Used in Dashboard entry + Budget module',
    icon: BookOpen,
    hasColor: false,
    accent: '#1B3A6B',
    placeholder: 'e.g. Transportation Allowance',
  },
  
];

const DEPT_COLORS = [
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#06B6D4',
  '#8B5CF6',
  '#EC4899',
  '#EF4444',
  '#78716C',
  '#14B8A6',
  '#F97316',
  '#6366F1',
  '#84CC16',
];

type PermissionRow = {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
};
type PermissionTemplateKey = 'Admin' | 'Staff' | 'Viewer';
type PageItem = { id: string; key: string; label: string };

const PERMISSION_TEMPLATES: Record<PermissionTemplateKey, PermissionRow> = {
  Admin: { canView: true, canCreate: true, canEdit: true, canDelete: true },
  Staff: { canView: true, canCreate: true, canEdit: true, canDelete: false },
  Viewer: { canView: true, canCreate: false, canEdit: false, canDelete: false },
};

const PERMISSION_COLUMNS = [
  { key: 'canView', label: 'View' },
  { key: 'canCreate', label: 'Create' },
  { key: 'canEdit', label: 'Edit' },
  { key: 'canDelete', label: 'Delete' },
] as const;

interface BranchOption {
  id: number;
  name: string;
  address: string;
  isActive: boolean;
}

// ─── Branch Selector Modal ────────────────────────────────────────────────────

function BranchSelectorModal({
  visible,
  onClose,
  onSelect,
  colors,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (branch: BranchOption) => void;
  colors: any;
}) {
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async (q = '') => {
    setLoading(true);
    try {
      setBranches(await AdminService.getBranchesMinimal(q));
    } catch (e) {
      console.error('Failed to load branches', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!visible) return;
    setSearch('');
    load('');
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => load(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search, visible]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: Platform.OS === 'ios' ? 56 : 20,
            paddingBottom: 16,
            paddingHorizontal: 20,
            backgroundColor: '#0EA5E9',
          }}
        >
          <TouchableOpacity onPress={onClose}>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15 }}>
              Cancel
            </Text>
          </TouchableOpacity>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
            Select Branch
          </Text>
          <View style={{ width: 60 }} />
        </View>
        <View style={{ padding: 12 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              backgroundColor: colors.surface,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: colors.border,
              paddingHorizontal: 12,
              paddingVertical: 10,
            }}
          >
            <Search size={14} color={colors.textSecondary} strokeWidth={2} />
            <TextInput
              style={{ flex: 1, fontSize: 14, color: colors.text }}
              placeholder="Search branch…"
              placeholderTextColor={colors.textSecondary}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <X size={14} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
        {loading ? (
          <View
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
          >
            <ActivityIndicator color="#0EA5E9" />
          </View>
        ) : branches.length === 0 ? (
          <View
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ color: colors.textSecondary }}>
              No branches found.
            </Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 40 }}
          >
            {branches.map((b) => (
              <TouchableOpacity
                key={b.id}
                style={{
                  padding: 14,
                  borderRadius: 12,
                  marginBottom: 8,
                  backgroundColor: colors.card,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
                onPress={() => {
                  onSelect(b);
                  onClose();
                }}
              >
                <View
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                >
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: b.isActive ? '#10B981' : colors.border,
                    }}
                  />
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: '700',
                      color: colors.text,
                      flex: 1,
                    }}
                    numberOfLines={1}
                  >
                    {b.name}
                  </Text>
                  {!b.isActive && (
                    <View
                      style={{
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 6,
                        backgroundColor: colors.border,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: '700',
                          color: colors.textSecondary,
                        }}
                      >
                        INACTIVE
                      </Text>
                    </View>
                  )}
                </View>
                <Text
                  style={{
                    fontSize: 12,
                    color: colors.textSecondary,
                    marginTop: 4,
                    marginLeft: 16,
                  }}
                >
                  {b.address}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

// ─── Contact Form Modal (full page sheet) ────────────────────────────────────

function ContactFormModal({
  visible,
  onClose,
  onSave,
  existing,
  colors,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (item: MasterItem, extra: Record<string, any>) => void;
  existing: MasterItem | null;
  colors: any;
}) {
  const ACCENT = '#0EA5E9';

  const [scope, setScope] = useState<'global' | 'branch'>('global');
  const [branch, setBranch] = useState<BranchOption | null>(null);
  const [label, setLabel] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [position, setPosition] = useState('');
  const [department, setDepartment] = useState('');
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState('');
  const [branchOpen, setBranchOpen] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const ex = existing as any;
    setScope(ex?.branchId ? 'branch' : 'global');
    setBranch(ex?.branch ?? null);
    setLabel(ex?.label ?? '');
    setFullName(ex?.fullName ?? ex?.name ?? '');
    setEmail(ex?.email ?? '');
    setPhone(ex?.phone ?? '');
    setPosition(ex?.position ?? '');
    setDepartment(ex?.department ?? '');
    setNotes(ex?.notes ?? '');
    setIsActive(ex?.isActive !== false);
    setError('');
  }, [visible, existing]);

  const handleSave = () => {
    if (!label.trim()) {
      setError('Label is required.');
      return;
    }
    if (!email.trim()) {
      setError('Email address is required.');
      return;
    }
    if (scope === 'branch' && !branch) {
      setError('Select a branch.');
      return;
    }
    onSave(
      { id: existing?.id ?? `mf_${Date.now()}`, label: label.trim() },
      {
        branchId: scope === 'branch' ? branch!.id : null,
        fullName: fullName.trim() || null,
        email: email.trim(),
        phone: phone.trim() || null,
        position: position.trim() || null,
        department: department.trim() || null,
        notes: notes.trim() || null,
        isActive,
      },
    );
    onClose();
  };

  const inputStyle = {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14 as const,
    color: colors.text,
  };
  const FL = ({
    t,
    req,
    hint,
  }: {
    t: string;
    req?: boolean;
    hint?: string;
  }) => (
    <View style={{ marginBottom: 4 }}>
      <Text
        style={{
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 0.8,
          color: colors.textSecondary,
          marginBottom: hint ? 2 : 6,
        }}
      >
        {t}
        {req ? ' *' : ''}
      </Text>
      {hint ? (
        <Text
          style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 6 }}
        >
          {hint}
        </Text>
      ) : null}
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, backgroundColor: colors.background }}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: Platform.OS === 'ios' ? 56 : 20,
            paddingBottom: 16,
            paddingHorizontal: 20,
            backgroundColor: ACCENT,
          }}
        >
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 15 }}>
              Cancel
            </Text>
          </TouchableOpacity>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>
            {existing ? 'Edit Contact' : 'Add Contact'}
          </Text>
          <AtSign size={20} color="rgba(255,255,255,0.75)" strokeWidth={2} />
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Scope ── */}
          <FL
            t="SCOPE"
            hint="Global = all branches · Branch-specific = one branch only"
          />
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
            {(['global', 'branch'] as const).map((opt) => (
              <TouchableOpacity
                key={opt}
                onPress={() => {
                  setScope(opt);
                  if (opt === 'global') setBranch(null);
                }}
                style={{
                  flex: 1,
                  paddingVertical: 11,
                  borderRadius: 10,
                  borderWidth: 1.5,
                  alignItems: 'center',
                  borderColor: scope === opt ? ACCENT : colors.border,
                  backgroundColor:
                    scope === opt ? ACCENT + '18' : colors.surface,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '700',
                    color: scope === opt ? ACCENT : colors.textSecondary,
                  }}
                >
                  {opt === 'global' ? '🌐  Global' : '🏢  Branch-specific'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Branch picker ── */}
          {scope === 'branch' && (
            <View style={{ marginBottom: 20 }}>
              <FL t="BRANCH" req />
              <TouchableOpacity
                onPress={() => setBranchOpen(true)}
                style={[
                  inputStyle,
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    borderColor: branch ? ACCENT : colors.error + '80',
                  },
                ]}
              >
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    flexShrink: 0,
                    backgroundColor: branch?.isActive
                      ? '#10B981'
                      : colors.border,
                  }}
                />
                <Text
                  style={{
                    flex: 1,
                    fontSize: 14,
                    color: branch ? colors.text : colors.textSecondary,
                  }}
                  numberOfLines={1}
                >
                  {branch ? branch.name : 'Tap to select a branch…'}
                </Text>
                {branch ? (
                  <TouchableOpacity
                    onPress={() => setBranch(null)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <X size={14} color={colors.textSecondary} />
                  </TouchableOpacity>
                ) : (
                  <ChevronRight size={14} color={colors.textSecondary} />
                )}
              </TouchableOpacity>
              {branch && (
                <Text
                  style={{
                    fontSize: 11,
                    color: colors.textSecondary,
                    marginTop: 4,
                  }}
                >
                  {branch.address}
                </Text>
              )}
            </View>
          )}

          {/* ── Divider ── */}
          <View
            style={{
              height: 1,
              backgroundColor: colors.border,
              marginBottom: 20,
            }}
          />

          {/* ── Label ── */}
          <View style={{ marginBottom: 16 }}>
            <FL
              t="LABEL"
              req
              hint='Short display name, e.g. "Main Supplier – Cebu"'
            />
            <TextInput
              style={inputStyle}
              placeholder="e.g. Main Supplier Cebu"
              placeholderTextColor={colors.textSecondary}
              value={label}
              onChangeText={setLabel}
              returnKeyType="next"
            />
          </View>

          {/* ── Full name ── */}
          <View style={{ marginBottom: 16 }}>
            <FL t="FULL NAME" />
            <TextInput
              style={inputStyle}
              placeholder="e.g. Juan dela Cruz"
              placeholderTextColor={colors.textSecondary}
              value={fullName}
              onChangeText={setFullName}
              returnKeyType="next"
            />
          </View>

          {/* ── Email ── */}
          <View style={{ marginBottom: 16 }}>
            <FL t="EMAIL ADDRESS" req />
            <TextInput
              style={inputStyle}
              placeholder="supplier@example.com"
              placeholderTextColor={colors.textSecondary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="next"
            />
          </View>

          {/* ── Phone ── */}
          <View style={{ marginBottom: 16 }}>
            <FL t="PHONE" />
            <TextInput
              style={inputStyle}
              placeholder="+63 912 345 6789"
              placeholderTextColor={colors.textSecondary}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              returnKeyType="next"
            />
          </View>

          {/* ── Position & Department ── */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
            <View style={{ flex: 1 }}>
              <FL t="POSITION" />
              <TextInput
                style={inputStyle}
                placeholder="e.g. Purchasing Mgr"
                placeholderTextColor={colors.textSecondary}
                value={position}
                onChangeText={setPosition}
                returnKeyType="next"
              />
            </View>
            <View style={{ flex: 1 }}>
              <FL t="DEPARTMENT" />
              <TextInput
                style={inputStyle}
                placeholder="e.g. Logistics"
                placeholderTextColor={colors.textSecondary}
                value={department}
                onChangeText={setDepartment}
                returnKeyType="next"
              />
            </View>
          </View>

          {/* ── Notes ── */}
          <View style={{ marginBottom: 16 }}>
            <FL t="NOTES" />
            <TextInput
              style={[
                inputStyle,
                { minHeight: 80, textAlignVertical: 'top', paddingTop: 12 },
              ]}
              placeholder="Any additional notes…"
              placeholderTextColor={colors.textSecondary}
              value={notes}
              onChangeText={setNotes}
              multiline
            />
          </View>

          {/* ── isActive ── */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: colors.surface,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: colors.border,
              paddingHorizontal: 14,
              paddingVertical: 12,
              marginBottom: 16,
            }}
          >
            <View>
              <Text
                style={{ fontSize: 14, fontWeight: '600', color: colors.text }}
              >
                Active
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: colors.textSecondary,
                  marginTop: 2,
                }}
              >
                Inactive contacts won't appear in pickers
              </Text>
            </View>
            <Switch
              value={isActive}
              onValueChange={setIsActive}
              trackColor={{ false: colors.border, true: ACCENT + '80' }}
              thumbColor={isActive ? ACCENT : colors.textSecondary}
            />
          </View>

          {/* ── Error ── */}
          {error ? (
            <View
              style={{
                backgroundColor: '#EF444415',
                borderWidth: 1,
                borderColor: '#EF4444',
                borderRadius: 10,
                padding: 12,
                marginBottom: 12,
              }}
            >
              <Text style={{ fontSize: 13, color: '#EF4444' }}>{error}</Text>
            </View>
          ) : null}

          {/* ── Save ── */}
          <TouchableOpacity
            style={{
              backgroundColor: ACCENT,
              borderRadius: 12,
              paddingVertical: 15,
              alignItems: 'center',
            }}
            onPress={handleSave}
            activeOpacity={0.85}
          >
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
              {existing ? 'Save Changes' : 'Add Contact'}
            </Text>
          </TouchableOpacity>
        </ScrollView>

        <BranchSelectorModal
          visible={branchOpen}
          onClose={() => setBranchOpen(false)}
          onSelect={(b) => setBranch(b)}
          colors={colors}
        />
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Generic ItemModal (all non-contact tables) ───────────────────────────────

function ItemModal({
  visible,
  onClose,
  onSave,
  existing,
  meta,
  colors,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (item: MasterItem, extra?: Record<string, any>) => void;
  existing: MasterItem | null;
  meta: TableMeta;
  colors: any;
}) {
  const [label, setLabel] = useState('');
  const [color, setColor] = useState(DEPT_COLORS[0]);
  const [error, setError] = useState('');
  const [extraValues, setExtraValues] = useState<Record<string, string>>({});
  const [template, setTemplate] = useState<
    'Admin' | 'Staff' | 'Viewer' | 'Custom'
  >('Staff');
  const [pages, setPages] = useState<PageItem[]>([]);
  const [permissions, setPermissions] = useState<Record<string, PermissionRow>>(
    {},
  );
  const config = TABLE_CONFIG.find((t) => t.key === meta.key);

  React.useEffect(() => {
    if (!visible) return;
    setLabel(existing?.label ?? '');
    setColor(existing?.color ?? DEPT_COLORS[0]);
    setError('');
    setExtraValues(
      Object.fromEntries(
        config?.extraFields?.map((f) => [
          f.key,
          String((existing as any)?.[f.key] ?? ''),
        ]) ?? [],
      ),
    );
    if (meta.key === 'positions') setTemplate(existing ? 'Custom' : 'Staff');
  }, [visible, existing]);

  React.useEffect(() => {
    if (!visible || meta.key !== 'positions') return;
    let active = true;
    const run = async () => {
      try {
        const rawPages = await PositionService.getPages();
        if (!active) return;
        const normalized: PageItem[] = rawPages.map((p: any) => ({
          id: String(p.id),
          key: p.key,
          label: p.label,
        }));
        setPages(normalized);
        const ep = (existing as any)?.permissions?.reduce(
          (acc: any, perm: any) => ({
            ...acc,
            [perm.pageId]: {
              canView: perm.canView,
              canCreate: perm.canCreate,
              canEdit: perm.canEdit,
              canDelete: perm.canDelete,
            },
          }),
          {},
        );
        const sel = ep && Object.keys(ep).length > 0 ? 'Custom' : template;
        setTemplate(sel as any);
        setPermissions(
          Object.fromEntries(
            normalized.map((p): [string, PermissionRow] => [
              p.id,
              ep?.[p.id] ??
                (sel === 'Custom'
                  ? {
                      canView: true,
                      canCreate: false,
                      canEdit: false,
                      canDelete: false,
                    }
                  : PERMISSION_TEMPLATES[sel as PermissionTemplateKey]),
            ]),
          ),
        );
      } catch {
        console.warn('Failed to load permission pages');
      }
    };
    run();
    return () => {
      active = false;
    };
  }, [visible, meta.key, existing]);

  const handleSave = () => {
    if (!label.trim()) {
      setError('Name is required.');
      return;
    }
    let extra: Record<string, any> | undefined = config?.extraFields
      ? Object.fromEntries(
          config.extraFields.map((f) => [
            f.key,
            f.type === 'number'
              ? parseFloat(extraValues[f.key] ?? '0')
              : (extraValues[f.key] ?? ''),
          ]),
        )
      : undefined;
    if (meta.key === 'positions')
      extra = {
        ...(extra ?? {}),
        permissions: Object.entries(permissions).map(([pageId, perm]) => ({
          pageId,
          ...perm,
        })),
      };
    onSave(
      {
        id: existing?.id ?? `mf_${Date.now()}`,
        label: label.trim(),
        ...(meta.hasColor ? { color } : {}),
      },
      extra,
    );
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={im.overlay}
      >
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={1}
          onPress={onClose}
        />
        <View
          style={[
            im.sheet,
            {
              backgroundColor: colors.surface,
              maxHeight: meta.key === 'positions' ? '90%' : '75%',
            },
          ]}
        >
          <View style={[im.handle, { backgroundColor: colors.border }]} />
          <View style={[im.header, { borderBottomColor: colors.border }]}>
            <Text style={[im.title, { color: colors.text }]}>
              {existing
                ? `Edit ${meta.label.replace(/s$/, '')}`
                : `Add to ${meta.label}`}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={20} color={colors.textSecondary} strokeWidth={2} />
            </TouchableOpacity>
          </View>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={im.body}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={[im.fieldLabel, { color: colors.textSecondary }]}>
              NAME *
            </Text>
            <TextInput
              style={[
                im.input,
                {
                  color: colors.text,
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                },
              ]}
              placeholder={meta.placeholder}
              placeholderTextColor={colors.textSecondary}
              value={label}
              onChangeText={setLabel}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
            {config?.extraFields?.map((field) => (
              <View key={field.key} style={{ marginTop: 4 }}>
                <Text style={[im.fieldLabel, { color: colors.textSecondary }]}>
                  {field.label.toUpperCase()} *
                </Text>
                <TextInput
                  style={[
                    im.input,
                    {
                      color: colors.text,
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                    },
                  ]}
                  placeholder={field.placeholder}
                  placeholderTextColor={colors.textSecondary}
                  value={extraValues[field.key] ?? ''}
                  onChangeText={(v) =>
                    setExtraValues((prev) => ({ ...prev, [field.key]: v }))
                  }
                  keyboardType={
                    field.type === 'number' ? 'decimal-pad' : 'default'
                  }
                />
              </View>
            ))}
            {meta.key === 'positions' && (
              <>
                <Text
                  style={[
                    im.fieldLabel,
                    { color: colors.textSecondary, marginTop: 16 },
                  ]}
                >
                  STARTER TEMPLATE
                </Text>
                <View style={im.templateRow}>
                  {(['Admin', 'Staff', 'Viewer', 'Custom'] as const).map(
                    (opt) => (
                      <TouchableOpacity
                        key={opt}
                        style={[
                          im.templateButton,
                          template === opt && im.templateButtonActive,
                        ]}
                        onPress={() => {
                          setTemplate(opt);
                          if (opt !== 'Custom')
                            setPermissions(
                              Object.fromEntries(
                                pages.map((p): [string, PermissionRow] => [
                                  p.id,
                                  PERMISSION_TEMPLATES[
                                    opt as PermissionTemplateKey
                                  ],
                                ]),
                              ),
                            );
                        }}
                      >
                        <Text
                          style={[
                            im.templateLabel,
                            template === opt && { color: '#fff' },
                          ]}
                        >
                          {opt}
                        </Text>
                      </TouchableOpacity>
                    ),
                  )}
                </View>
                <Text
                  style={[
                    im.fieldLabel,
                    { color: colors.textSecondary, marginTop: 16 },
                  ]}
                >
                  PERMISSION MATRIX
                </Text>
                <View
                  style={[
                    im.matrixRow,
                    { borderBottomWidth: 1, borderBottomColor: colors.border },
                  ]}
                >
                  <Text
                    style={[
                      im.matrixPageLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Page
                  </Text>
                  {PERMISSION_COLUMNS.map((col) => (
                    <Text
                      key={col.key}
                      style={[im.matrixHeader, { color: colors.textSecondary }]}
                    >
                      {col.label}
                    </Text>
                  ))}
                </View>
                {pages.map((page) => {
                  const row = permissions[page.id] ?? {
                    canView: false,
                    canCreate: false,
                    canEdit: false,
                    canDelete: false,
                  };
                  return (
                    <View key={page.id} style={im.matrixRow}>
                      <Text
                        style={[im.matrixPageLabel, { color: colors.text }]}
                      >
                        {page.label}
                      </Text>
                      {PERMISSION_COLUMNS.map((col) => (
                        <TouchableOpacity
                          key={col.key}
                          style={[
                            im.matrixCell,
                            row[col.key] && im.checkboxActive,
                          ]}
                          onPress={() =>
                            setPermissions((prev) => ({
                              ...prev,
                              [page.id]: { ...row, [col.key]: !row[col.key] },
                            }))
                          }
                        >
                          <Text
                            style={[
                              im.matrixText,
                              row[col.key] && { color: '#fff' },
                            ]}
                          >
                            {row[col.key] ? '✓' : ''}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  );
                })}
              </>
            )}
            {meta.hasColor && (
              <>
                <Text
                  style={[
                    im.fieldLabel,
                    { color: colors.textSecondary, marginTop: 16 },
                  ]}
                >
                  BADGE COLOR
                </Text>
                <View style={im.colorGrid}>
                  {DEPT_COLORS.map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[
                        im.swatch,
                        { backgroundColor: c },
                        color === c && im.swatchActive,
                      ]}
                      onPress={() => setColor(c)}
                    >
                      {color === c && (
                        <Text
                          style={{
                            color: '#fff',
                            fontSize: 13,
                            fontWeight: '800',
                          }}
                        >
                          ✓
                        </Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    marginTop: 10,
                  }}
                >
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: color,
                    }}
                  />
                  <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                    Preview badge color
                  </Text>
                </View>
              </>
            )}
            {error ? (
              <Text style={[im.error, { color: colors.error }]}>{error}</Text>
            ) : null}
            <TouchableOpacity
              style={[im.saveBtn, { backgroundColor: meta.accent }]}
              onPress={handleSave}
              activeOpacity={0.85}
            >
              <Text style={im.saveTxt}>
                {existing ? 'Save Changes' : 'Add Entry'}
              </Text>
            </TouchableOpacity>
            <View style={{ height: 20 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const im = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20 },
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
  body: { padding: 20 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
  },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchActive: { borderWidth: 3, borderColor: 'rgba(0,0,0,0.2)' },
  templateRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },
  templateButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: 'transparent',
  },
  templateButtonActive: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  templateLabel: { fontSize: 13, fontWeight: '700', color: '#4B5563' },
  matrixRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  matrixHeader: {
    width: 70,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
  },
  matrixPageLabel: { flex: 1, fontSize: 13, fontWeight: '500' },
  matrixCell: {
    width: 56,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  checkboxActive: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  matrixText: { fontSize: 13, fontWeight: '700', color: '#374151' },
  error: { fontSize: 12, marginTop: 8 },
  saveBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  saveTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

// ─── Delete Confirm ───────────────────────────────────────────────────────────

function DeleteConfirm({
  visible,
  label,
  onCancel,
  onConfirm,
  colors,
}: {
  visible: boolean;
  label: string;
  onCancel: () => void;
  onConfirm: () => void;
  colors: any;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={dc.backdrop}>
        <View style={[dc.card, { backgroundColor: colors.surface }]}>
          <View style={[dc.icon, { backgroundColor: colors.error + '18' }]}>
            <Trash2 size={26} color={colors.error} strokeWidth={1.5} />
          </View>
          <Text style={[dc.title, { color: colors.text }]}>Delete Entry?</Text>
          <Text style={[dc.sub, { color: colors.textSecondary }]}>{label}</Text>
          <View style={dc.row}>
            <TouchableOpacity
              style={[dc.btn, { borderColor: colors.border }]}
              onPress={onCancel}
            >
              <Text style={[dc.btnTxt, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                dc.btn,
                { backgroundColor: colors.error, borderColor: colors.error },
              ]}
              onPress={onConfirm}
            >
              <Text style={[dc.btnTxt, { color: '#fff' }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const dc = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 40,
  },
  card: { borderRadius: 16, padding: 24, alignItems: 'center' },
  icon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: { fontSize: 17, fontWeight: '800', marginBottom: 8 },
  sub: { fontSize: 13, textAlign: 'center', marginBottom: 24, color: '#666' },
  row: { flexDirection: 'row', gap: 12, width: '100%' },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  btnTxt: { fontSize: 14, fontWeight: '700' },
});

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonPulse({ style, colors }: { style: any; colors: any }) {
  const anim = React.useRef(new Animated.Value(0.35)).current;
  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0.35,
          duration: 650,
          useNativeDriver: true,
        }),
      ]),
    ).start();
    return () => anim.stopAnimation();
  }, [anim]);
  return (
    <Animated.View
      style={[
        { backgroundColor: colors.border, borderRadius: 6, opacity: anim },
        style,
      ]}
    />
  );
}

function SkeletonRow({ colors, hasColor }: { colors: any; hasColor: boolean }) {
  const w = [160, 120, 200, 140, 100, 180][Math.floor(Math.random() * 6)];
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 14,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      {hasColor && (
        <SkeletonPulse
          colors={colors}
          style={{ width: 14, height: 14, borderRadius: 7, marginRight: 10 }}
        />
      )}
      <SkeletonPulse
        colors={colors}
        style={{ flex: 1, height: 14, borderRadius: 4, maxWidth: w }}
      />
      <View style={{ flexDirection: 'row', gap: 8, marginLeft: 8 }}>
        <SkeletonPulse
          colors={colors}
          style={{ width: 32, height: 32, borderRadius: 8 }}
        />
        <SkeletonPulse
          colors={colors}
          style={{ width: 32, height: 32, borderRadius: 8 }}
        />
      </View>
    </View>
  );
}

// ─── Contact Row ──────────────────────────────────────────────────────────────

function ContactRow({
  item,
  colors,
  onEdit,
  onDelete,
}: {
  item: MasterItem;
  colors: any;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const ex = item as any;
  const isGlobal = !ex.branchId;
  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 14,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            marginRight: 10,
            marginTop: 5,
            flexShrink: 0,
            backgroundColor: isGlobal ? '#0EA5E9' : '#10B981',
          }}
        />
        <View style={{ flex: 1 }}>
          <Text
            style={{ fontSize: 15, fontWeight: '700', color: colors.text }}
            numberOfLines={1}
          >
            {item.label}
          </Text>
          {ex.email && (
            <Text
              style={{
                fontSize: 12,
                color: colors.textSecondary,
                marginTop: 2,
              }}
              numberOfLines={1}
            >
              {ex.email}
            </Text>
          )}
          {ex.phone && (
            <Text
              style={{
                fontSize: 12,
                color: colors.textSecondary,
                marginTop: 1,
              }}
              numberOfLines={1}
            >
              {ex.phone}
            </Text>
          )}
          {ex.position && (
            <Text
              style={{
                fontSize: 11,
                color: colors.textSecondary,
                marginTop: 1,
              }}
              numberOfLines={1}
            >
              {ex.position}
            </Text>
          )}
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <View
            style={{
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 6,
              backgroundColor: (isGlobal ? '#0EA5E9' : '#10B981') + '18',
            }}
          >
            <Text
              style={{
                fontSize: 10,
                fontWeight: '800',
                color: isGlobal ? '#0EA5E9' : '#10B981',
              }}
            >
              {isGlobal ? 'GLOBAL' : 'BRANCH'}
            </Text>
          </View>
          {ex.isActive === false && (
            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 6,
                backgroundColor: colors.border,
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: '800',
                  color: colors.textSecondary,
                }}
              >
                INACTIVE
              </Text>
            </View>
          )}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
            <TouchableOpacity
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onPress={onEdit}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Edit2 size={13} color={colors.primary} strokeWidth={2} />
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onPress={onDelete}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Trash2 size={13} color={colors.error} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Table Detail Screen ──────────────────────────────────────────────────────

function TableDetailScreen({
  meta,
  onBack,
  colors,
}: {
  meta: TableMeta;
  onBack: () => void;
  colors: any;
}) {
  const mf = useMasterFile();
  const [serviceItems, setServiceItems] = useState<MasterItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const contextItems = mf[meta.key] as MasterItem[];
  const items = serviceItems.length > 0 ? serviceItems : contextItems;
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<MasterItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MasterItem | null>(null);
  const isContacts = meta.key === 'contacts';

  const reloadItems = async () => {
    const config = TABLE_CONFIG.find((t) => t.key === meta.key);
    if (config) {
      const raw = await config.service.getAll();
      setServiceItems(raw.map(config.toItem));
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const config = TABLE_CONFIG.find((t) => t.key === meta.key);
        if (config?.service.getAll) {
          const raw = await config.service.getAll();
          setServiceItems(raw.map(config.toItem));
        } else setServiceItems(contextItems);
      } catch (e) {
        console.error(`Failed to load ${meta.label}:`, e);
        setServiceItems(contextItems);
      } finally {
        setLoadingItems(false);
      }
    })();
  }, [meta.key]);

  const doSearch = React.useCallback(() => {
    if (query.trim() === search) return;
    setSearching(true);
    const t = setTimeout(() => {
      setSearch(query.trim());
      setSearching(false);
    }, 800);
    return () => clearTimeout(t);
  }, [query, search]);

  const handleClear = () => {
    setQuery('');
    if (search !== '') {
      setSearching(true);
      setTimeout(() => {
        setSearch('');
        setSearching(false);
      }, 500);
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return q ? items.filter((i) => i.label.toLowerCase().includes(q)) : items;
  }, [items, search]);

  const handleSave = async (item: MasterItem, extra?: Record<string, any>) => {
    const config = TABLE_CONFIG.find((t) => t.key === meta.key);
    try {
      if (config) {
        if (editingItem) {
          await config.service.update?.(
            Number(editingItem.id),
            item.label,
            extra,
          );
          if (meta.key === 'positions' && extra?.permissions)
            await PositionService.setPermissions(
              editingItem.id,
              extra.permissions,
            );
        } else {
          const created = await config.service.create?.(item.label, extra);
          if (meta.key === 'positions' && created?.id && extra?.permissions)
            await PositionService.setPermissions(
              String(created.id),
              extra.permissions,
            );
        }
        await reloadItems();
      } else {
        if (editingItem) mf.updateItem(meta.key as TableKey, item);
        else mf.addItem(meta.key as TableKey, item);
      }
    } catch (e) {
      console.error(`Failed to save ${meta.label}:`, e);
    }
  };

  const isLoading = loadingItems || searching;

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    headerBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 12,
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerInfo: { flex: 1 },
    headerTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
    headerDesc: { fontSize: 11, color: colors.textSecondary, marginTop: 1 },
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: meta.accent,
    },
    addBtnTxt: { fontSize: 13, fontWeight: '700', color: '#fff' },
    searchOuter: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginHorizontal: 12,
      marginTop: 12,
      marginBottom: 6,
    },
    searchBox: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.card,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    searchInput: { flex: 1, fontSize: 13, color: colors.text },
    searchBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 10,
      backgroundColor: searching ? colors.border : meta.accent,
    },
    searchBtnTxt: { fontSize: 13, fontWeight: '700', color: '#fff' },
    countTxt: {
      fontSize: 11,
      color: colors.textSecondary,
      paddingHorizontal: 14,
      paddingBottom: 6,
    },
    listContent: { paddingHorizontal: 12, paddingBottom: 40 },
    itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 14,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    colorDot: {
      width: 14,
      height: 14,
      borderRadius: 7,
      marginRight: 10,
      flexShrink: 0,
    },
    itemLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
    actions: { flexDirection: 'row', gap: 8 },
    actionBtn: {
      width: 32,
      height: 32,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    globalBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      marginLeft: 8,
      backgroundColor: colors.primary + '18',
    },
    globalBadgeTxt: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.primary,
      letterSpacing: 0.5,
    },
    emptyWrap: { alignItems: 'center', paddingTop: 60 },
    emptyIcon: { fontSize: 40, marginBottom: 12 },
    emptyTxt: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      paddingHorizontal: 32,
    },
    emptyBtn: {
      marginTop: 16,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: meta.accent,
    },
    emptyBtnTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },
    skeletonWrap: { paddingHorizontal: 12, paddingTop: 4 },
  });

  return (
    <View style={s.container}>
      <View style={s.headerBar}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 16, color: colors.text }}>‹</Text>
        </TouchableOpacity>
        <View style={s.headerInfo}>
          <Text style={s.headerTitle}>{meta.label}</Text>
          <Text style={s.headerDesc}>{meta.description}</Text>
        </View>
        <TouchableOpacity
          style={s.addBtn}
          onPress={() => {
            setEditingItem(null);
            setModalVisible(true);
          }}
          activeOpacity={0.85}
        >
          <Plus size={14} color="#fff" strokeWidth={2.5} />
          <Text style={s.addBtnTxt}>Add</Text>
        </TouchableOpacity>
      </View>

      <View style={s.searchOuter}>
        <View style={s.searchBox}>
          <Search size={13} color={colors.textSecondary} strokeWidth={2} />
          <TextInput
            style={s.searchInput}
            placeholder={`Search ${meta.label.toLowerCase()}…`}
            placeholderTextColor={colors.textSecondary}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            onSubmitEditing={doSearch}
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={handleClear}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={13} color={colors.textSecondary} strokeWidth={2} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={s.searchBtn}
          onPress={doSearch}
          disabled={searching}
          activeOpacity={0.85}
        >
          <Search size={14} color="#fff" strokeWidth={2.5} />
          <Text style={s.searchBtnTxt}>
            {searching ? 'Searching…' : 'Search'}
          </Text>
        </TouchableOpacity>
      </View>

      {!isLoading && (
        <Text style={s.countTxt}>
          {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}
          {search ? ` matching "${search}"` : ''}
        </Text>
      )}

      {/* Contacts legend */}
      {isContacts && !isLoading && filtered.length > 0 && (
        <View
          style={{
            flexDirection: 'row',
            gap: 16,
            paddingHorizontal: 14,
            paddingBottom: 8,
          }}
        >
          {[
            { color: '#0EA5E9', label: 'Global' },
            { color: '#10B981', label: 'Branch-specific' },
          ].map((l) => (
            <View
              key={l.label}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}
            >
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: l.color,
                }}
              />
              <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                {l.label}
              </Text>
            </View>
          ))}
        </View>
      )}

      {isLoading ? (
        <View style={s.skeletonWrap}>
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonRow key={i} colors={colors} hasColor={meta.hasColor} />
          ))}
        </View>
      ) : filtered.length === 0 ? (
        <View style={s.emptyWrap}>
          <Text style={s.emptyIcon}>{isContacts ? '📇' : '📋'}</Text>
          <Text style={s.emptyTxt}>
            {search
              ? `No entries matching "${search}"`
              : `No ${meta.label.toLowerCase()} yet.`}
          </Text>
          {!search && (
            <TouchableOpacity
              style={s.emptyBtn}
              onPress={() => {
                setEditingItem(null);
                setModalVisible(true);
              }}
            >
              <Text style={s.emptyBtnTxt}>Add First Entry</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
        >
          {filtered.map((item) =>
            isContacts ? (
              <ContactRow
                key={item.id}
                item={item}
                colors={colors}
                onEdit={() => {
                  setEditingItem(item);
                  setModalVisible(true);
                }}
                onDelete={() => setDeleteTarget(item)}
              />
            ) : (
              <View key={item.id} style={s.itemRow}>
                {meta.hasColor && item.color && (
                  <View style={[s.colorDot, { backgroundColor: item.color }]} />
                )}
                <Text style={s.itemLabel} numberOfLines={1}>
                  {item.label}
                </Text>
                {item.isGlobal ? (
                  <View style={s.globalBadge}>
                    <Text style={s.globalBadgeTxt}>Global</Text>
                  </View>
                ) : (
                  <View style={s.actions}>
                    <TouchableOpacity
                      style={s.actionBtn}
                      onPress={() => {
                        setEditingItem(item);
                        setModalVisible(true);
                      }}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Edit2 size={13} color={colors.primary} strokeWidth={2} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={s.actionBtn}
                      onPress={() => setDeleteTarget(item)}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Trash2 size={13} color={colors.error} strokeWidth={2} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ),
          )}
        </ScrollView>
      )}

      {/* Contacts → full page sheet; everything else → bottom sheet */}
      {isContacts ? (
        <ContactFormModal
          visible={modalVisible}
          onClose={() => {
            setModalVisible(false);
            setEditingItem(null);
          }}
          onSave={handleSave}
          existing={editingItem}
          colors={colors}
        />
      ) : (
        <ItemModal
          visible={modalVisible}
          onClose={() => {
            setModalVisible(false);
            setEditingItem(null);
          }}
          onSave={handleSave}
          existing={editingItem}
          meta={meta}
          colors={colors}
        />
      )}

      <DeleteConfirm
        visible={!!deleteTarget}
        label={deleteTarget?.label ?? ''}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) {
            if ((deleteTarget as any).isGlobal) return;
            const id = String(deleteTarget.id);
            if (!id || id === 'NaN' || id === 'undefined') {
              setDeleteTarget(null);
              return;
            }
            const config = TABLE_CONFIG.find((t) => t.key === meta.key);
            try {
              if (config) {
                await config.service.delete?.(id);
                await reloadItems();
              } else mf.deleteItem(meta.key as TableKey, id);
            } catch (e) {
              console.error(`Failed to delete ${meta.label}:`, e);
            }
          }
          setDeleteTarget(null);
        }}
        colors={colors}
      />
    </View>
  );
}

// ─── Master File Home ─────────────────────────────────────────────────────────

function MasterFileHome({
  onSelect,
  colors,
}: {
  onSelect: (meta: TableMeta) => void;
  colors: any;
}) {
  const mf = useMasterFile();
  const { cols, screenPadding } = useResponsiveGrid();

  // Use 2-col grid on tablet+, 1-col on phone
  const gridCols = cols >= 2 ? 2 : 1;
  const isGrid = gridCols > 1;

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: {
      padding: screenPadding,
      paddingBottom: 40,
    },
    pageLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSecondary,
      letterSpacing: 1.2,
      marginBottom: 4,
    },
    pageDesc: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 19,
      marginBottom: 20,
    },
    // ── Grid container ────────────────────────────────────────────────
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginHorizontal: isGrid ? -6 : 0,
    },
    // ── Each grid cell ────────────────────────────────────────────────
    cell: {
      width: isGrid ? '50%' : '100%',
      paddingHorizontal: isGrid ? 6 : 0,
      marginBottom: 12,
    },
    // ── Card (fills the cell) ─────────────────────────────────────────
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      flex: 1,
    },
    iconWrap: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
      flexShrink: 0,
    },
    info: { flex: 1 },
    cardTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 3,
    },
    cardDesc: { fontSize: 12, color: colors.textSecondary, lineHeight: 17 },
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
      marginLeft: 12,
    },
    badgeCount: { fontSize: 12, fontWeight: '700' },
  });

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={s.pageLabel}>MASTER FILE</Text>
      <Text style={s.pageDesc}>
        Reference data used across all ERP modules. Tap a category to view,
        search, add, or edit entries.
      </Text>

      {/* ── Grid wrapper ── */}
      <View style={s.grid}>
        {TABLES.map((meta) => {
          const count = (mf[meta.key] as MasterItem[]).length;
          const Icon = meta.icon;
          return (
            <View key={meta.key} style={s.cell}>
              <TouchableOpacity
                style={s.card}
                onPress={() => onSelect(meta)}
                activeOpacity={0.8}
              >
                <View
                  style={[s.iconWrap, { backgroundColor: meta.accent + '1A' }]}
                >
                  <Icon size={20} color={meta.accent} strokeWidth={2} />
                </View>
                <View style={s.info}>
                  <Text style={s.cardTitle}>{meta.label}</Text>
                  <Text style={s.cardDesc}>{meta.description}</Text>
                </View>
                <View
                  style={[s.badge, { backgroundColor: meta.accent + '1A' }]}
                >
                  <Text style={[s.badgeCount, { color: meta.accent }]}>
                    {count}
                  </Text>
                </View>
                <ChevronRight
                  size={16}
                  color={colors.textSecondary}
                  strokeWidth={2}
                  style={{ marginLeft: 4 }}
                />
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export default function MasterFileScreen() {
  const { colors } = useTheme();
  const [activeMeta, setActiveMeta] = useState<TableMeta | null>(null);
  if (activeMeta)
    return (
      <TableDetailScreen
        meta={activeMeta}
        onBack={() => setActiveMeta(null)}
        colors={colors}
      />
    );
  return (
    <MasterFileHome onSelect={(meta) => setActiveMeta(meta)} colors={colors} />
  );
}
