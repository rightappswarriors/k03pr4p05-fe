// screens/MasterFileScreen.tsx
// Master File — each sub-table is its own focused screen.
// The MasterFile "home" shows a menu of all 6 tables.
// Tapping one navigates into that table's dedicated list with search.

import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  BookOpen,
  ChevronRight,
  PhilippinePeso,
  Edit2,
  FolderOpen,
  LayoutGrid,
  Plus,
  Search,
  Trash2,
  UserCheck,
  Users,
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
    key: 'positions',
    label: 'Positions',
    description: 'RBAC positions with permissions used in HR',
    icon: UserCheck,
    hasColor: false,
    accent: '#6366F1',
    placeholder: 'e.g. Manager',
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

// ─── Add / Edit Modal ─────────────────────────────────────────────────────────
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
  onSave: (item: MasterItem, extra?: Record<string, any>) => void; // ← 2 args
  existing: MasterItem | null;
  meta: TableMeta;
  colors: any;
}) {
  const [label, setLabel] = useState('');
  const [color, setColor] = useState(DEPT_COLORS[0]);
  const [error, setError] = useState('');
  const [extraValues, setExtraValues] = useState<Record<string, string>>({});
  const [template, setTemplate] = useState<'Admin' | 'Staff' | 'Viewer' | 'Custom'>('Staff');
  const [pages, setPages] = useState<PageItem[]>([]);
  const [permissions, setPermissions] = useState<Record<string, PermissionRow>>({});

  const config = TABLE_CONFIG.find((t) => t.key === meta.key);
  React.useEffect(() => {
    if (visible) {
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
      if (meta.key === 'positions') {
        setTemplate(existing ? 'Custom' : 'Staff');
      }
    }
  }, [visible, existing, config, meta.key]);

  React.useEffect(() => {
    if (!visible || meta.key !== 'positions') return;
    let active = true;

    const loadPages = async () => {
      try {
        const rawPages = await PositionService.getPages();
        if (!active) return;
        const normalized: PageItem[] = rawPages.map((page: any) => ({
          id: String(page.id),
          key: page.key,
          label: page.label,
        }));
        setPages(normalized);

        const existingPermissions = (existing as any)?.permissions?.reduce(
          (acc: Record<string, PermissionRow>, perm: any) => ({
            ...acc,
            [perm.pageId]: {
              canView: perm.canView,
              canCreate: perm.canCreate,
              canEdit: perm.canEdit,
              canDelete: perm.canDelete,
            },
          }),
          {} as Record<string, PermissionRow>,
        );

        const selected = existingPermissions && Object.keys(existingPermissions).length > 0
          ? 'Custom'
          : template;

        setTemplate(selected as 'Admin' | 'Staff' | 'Viewer' | 'Custom');

        setPermissions(
          Object.fromEntries(
            normalized.map((page: PageItem): [string, PermissionRow] => [
              page.id,
              existingPermissions?.[page.id] ??
                (selected === 'Custom'
                  ? {
                      canView: true,
                      canCreate: false,
                      canEdit: false,
                      canDelete: false,
                    }
                  : PERMISSION_TEMPLATES[selected as PermissionTemplateKey]),
            ]),
          ) as Record<string, PermissionRow>,
        );
      } catch (error) {
        console.warn('Failed to load permission pages', error);
      }
    };

    loadPages();
    return () => {
      active = false;
    };
  }, [visible, meta.key, existing, template]);

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
              ? parseFloat(extraValues[f.key] ?? '0') // ✅ send raw number, NO /100
              : (extraValues[f.key] ?? ''),
          ]),
        )
      : undefined;

    if (meta.key === 'positions') {
      extra = {
        ...(extra ?? {}),
        permissions: Object.entries(permissions).map(([pageId, perm]) => ({
          pageId,
          ...perm,
        })),
      };
    }

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
      <View style={im.overlay}>
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={[im.sheet, { backgroundColor: colors.surface }]}>
          <View style={[im.handle, { backgroundColor: colors.border }]} />
          <View style={[im.header, { borderBottomColor: colors.border }]}>
            <Text style={[im.title, { color: colors.text }]}>
              {existing
                ? `Edit ${meta.label.replace(/s$/, '').replace(/ \/ Positions/, '')}`
                : `Add to ${meta.label}`}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={20} color={colors.textSecondary} strokeWidth={2} />
            </TouchableOpacity>
          </View>
          <View style={im.body}>
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
              <View key={field.key}>
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
                <Text style={[im.fieldLabel, { color: colors.textSecondary, marginTop: 16 }]}>STARTER TEMPLATE</Text>
                <View style={im.templateRow}>
                  {(['Admin', 'Staff', 'Viewer', 'Custom'] as const).map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        im.templateButton,
                        template === option && im.templateButtonActive,
                      ]}
                      onPress={() => {
                        setTemplate(option);
                        if (option !== 'Custom') {
                          setPermissions(
                            Object.fromEntries(
                              pages.map((page: PageItem): [string, PermissionRow] => [
                                page.id,
                                PERMISSION_TEMPLATES[option as PermissionTemplateKey],
                              ]),
                            ) as Record<string, PermissionRow>,
                          );
                        }
                      }}
                    >
                      <Text
                        style={[
                          im.templateLabel,
                          template === option && { color: '#fff' },
                        ]}
                      >
                        {option}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[im.fieldLabel, { color: colors.textSecondary, marginTop: 16 }]}>PERMISSION MATRIX</Text>
                <View style={[im.matrixRow, { borderBottomWidth: 1, borderBottomColor: colors.border }]}> 
                  <Text style={[im.matrixPageLabel, { color: colors.textSecondary }]}>Page</Text>
                  {PERMISSION_COLUMNS.map((column) => (
                    <Text key={column.key} style={[im.matrixHeader, { color: colors.textSecondary }]}>
                      {column.label}
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
                      <Text style={[im.matrixPageLabel, { color: colors.text }]}>
                        {page.label}
                      </Text>
                      {PERMISSION_COLUMNS.map((column) => (
                        <TouchableOpacity
                          key={column.key}
                          style={[
                            im.matrixCell,
                            row[column.key] && im.checkboxActive,
                          ]}
                          onPress={() =>
                            setPermissions((prev) => ({
                              ...prev,
                              [page.id]: {
                                ...row,
                                [column.key]: !row[column.key],
                              },
                            }))
                          }
                        >
                          <Text
                            style={[
                              im.matrixText,
                              row[column.key] && { color: '#fff' },
                            ]}
                          >
                            {row[column.key] ? '✓' : ''}
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
                {meta.hasColor && (
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
                )}
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
          </View>
        </View>
      </View>
    </Modal>
  );
}

const im = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
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
  body: { padding: 20 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 6,
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
  templateRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  templateButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: 'transparent',
  },
  templateButtonActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
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
  matrixPageLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
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
  checkboxActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  matrixText: { fontSize: 13, fontWeight: '700', color: '#374151' },
  error: { fontSize: 12, marginTop: 6 },
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

// ─── Skeleton pulse ───────────────────────────────────────────────────────────

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
  const widths = [160, 120, 200, 140, 100, 180];
  const w = widths[Math.floor(Math.random() * widths.length)];
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

  // Use local state for service-backed tables, context for others
  const [serviceItems, setServiceItems] = useState<MasterItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);

  // Fallback to context if service data not available
  const contextItems = mf[meta.key] as MasterItem[];
  const items = serviceItems.length > 0 ? serviceItems : contextItems;

  const [query, setQuery] = useState(''); // what user types
  const [search, setSearch] = useState(''); // committed query (on button tap)
  const [searching, setSearching] = useState(false); // skeleton visible
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<MasterItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MasterItem | null>(null);

  // Load items from service (if available) or context
  useEffect(() => {
    const loadItems = async () => {
      try {
        const config = TABLE_CONFIG.find((t) => t.key === meta.key);

        if (config?.service.getAll) {
          const raw = await config.service.getAll();
          setServiceItems(raw.map(config.toItem));
        } else {
          // table not in config yet — fall back to context
          setServiceItems(contextItems);
        }
      } catch (error) {
        console.error(`Failed to load ${meta.label}:`, error);
        setServiceItems(contextItems);
      } finally {
        setLoadingItems(false);
      }
    };
    loadItems();
  }, [meta.key]);
  // Simulate API search — only fires when user taps Search button or presses return
  const doSearch = React.useCallback(() => {
    if (query.trim() === search) return; // nothing changed, skip
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
      const t = setTimeout(() => {
        setSearch('');
        setSearching(false);
      }, 500);
      return () => clearTimeout(t);
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
          ); // ✅
          if (meta.key === 'positions' && extra?.permissions) {
            await PositionService.setPermissions(editingItem.id, extra.permissions);
          }
        } else {
          const created = await config.service.create?.(item.label, extra); // ✅
          if (meta.key === 'positions' && created?.id && extra?.permissions) {
            await PositionService.setPermissions(String(created.id), extra.permissions);
          }
        }
        const raw = await config.service.getAll();
        setServiceItems(raw.map(config.toItem));
      } else {
        if (editingItem) mf.updateItem(meta.key as TableKey, item);
        else mf.addItem(meta.key as TableKey, item);
      }
    } catch (error) {
      console.error(`Failed to save ${meta.label}:`, error);
    }
  };

  const isLoading = loadingItems || searching;

  const styles = StyleSheet.create({
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
    // Search row
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
    emptyWrap: { alignItems: 'center', paddingTop: 60 },
    emptyIcon: { fontSize: 40, marginBottom: 12 },
    emptyTxt: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
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
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 16, color: colors.text }}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{meta.label}</Text>
          <Text style={styles.headerDesc}>{meta.description}</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => {
            setEditingItem(null);
            setModalVisible(true);
          }}
          activeOpacity={0.85}
        >
          <Plus size={14} color="#fff" strokeWidth={2.5} />
          <Text style={styles.addBtnTxt}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Search row — input + Search button */}
      <View style={styles.searchOuter}>
        <View style={styles.searchBox}>
          <Search size={13} color={colors.textSecondary} strokeWidth={2} />
          <TextInput
            style={styles.searchInput}
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
          style={styles.searchBtn}
          onPress={doSearch}
          disabled={searching}
          activeOpacity={0.85}
        >
          <Search size={14} color="#fff" strokeWidth={2.5} />
          <Text style={styles.searchBtnTxt}>
            {searching ? 'Searching…' : 'Search'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Count — shows committed search term, not live query */}
      {!isLoading && (
        <Text style={styles.countTxt}>
          {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}
          {search ? ` matching "${search}"` : ''}
        </Text>
      )}

      {/* Skeleton OR real list */}
      {isLoading ? (
        <View style={styles.skeletonWrap}>
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonRow key={i} colors={colors} hasColor={meta.hasColor} />
          ))}
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTxt}>
            {search
              ? `No entries matching "${search}"`
              : `No ${meta.label.toLowerCase()} yet.`}
          </Text>
          {!search && (
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => {
                setEditingItem(null);
                setModalVisible(true);
              }}
            >
              <Text style={styles.emptyBtnTxt}>Add First Entry</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {filtered.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              {meta.hasColor && item.color && (
                <View
                  style={[styles.colorDot, { backgroundColor: item.color }]}
                />
              )}
              <Text style={styles.itemLabel} numberOfLines={1}>
                {item.label}
              </Text>

              {/* ✅ Global items — show badge only, no edit/delete */}
              {item.isGlobal ? (
                <View style={styles.globalBadge}>
                  <Text style={styles.globalBadgeTxt}>Global</Text>
                </View>
              ) : (
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => {
                      setEditingItem(item);
                      setModalVisible(true);
                    }}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Edit2 size={13} color={colors.primary} strokeWidth={2} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => setDeleteTarget(item)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Trash2 size={13} color={colors.error} strokeWidth={2} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      )}

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
      <DeleteConfirm
        visible={!!deleteTarget}
        label={deleteTarget?.label ?? ''}
        onCancel={() => setDeleteTarget(null)}
        // In DeleteConfirm onConfirm
        onConfirm={async () => {
          if (deleteTarget) {
            if ((deleteTarget as any).isGlobal) return; // ✅ safety guard
            const id = String(deleteTarget.id);
            if (!id || id === 'NaN' || id === 'undefined') {
              console.error('Invalid delete id for position:', deleteTarget.id);
              setDeleteTarget(null);
              return;
            }
            const config = TABLE_CONFIG.find((t) => t.key === meta.key);
            try {
              if (config) {
                await config.service.delete?.(id);
                const raw = await config.service.getAll();
                setServiceItems(raw.map(config.toItem));
              } else {
                mf.deleteItem(meta.key as TableKey, id);
              }
            } catch (error) {
              console.error(`Failed to delete ${meta.label}:`, error);
            }
          }
          setDeleteTarget(null);
        }}
        colors={colors}
      />
    </View>
  );
}

// ─── Master File Home — menu of all tables ────────────────────────────────────

function MasterFileHome({
  onSelect,
  colors,
}: {
  onSelect: (meta: TableMeta) => void;
  colors: any;
}) {
  const mf = useMasterFile();

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 40 },
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
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 16,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
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
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.pageLabel}>MASTER FILE</Text>
      <Text style={styles.pageDesc}>
        Reference data used across all ERP modules. Tap a category to view,
        search, add, or edit entries.
      </Text>

      {TABLES.map((meta) => {
        const count = (mf[meta.key] as MasterItem[]).length;
        const Icon = meta.icon;
        return (
          <TouchableOpacity
            key={meta.key}
            style={styles.card}
            onPress={() => onSelect(meta)}
            activeOpacity={0.8}
          >
            <View
              style={[styles.iconWrap, { backgroundColor: meta.accent + '1A' }]}
            >
              <Icon size={20} color={meta.accent} strokeWidth={2} />
            </View>
            <View style={styles.info}>
              <Text style={styles.cardTitle}>{meta.label}</Text>
              <Text style={styles.cardDesc}>{meta.description}</Text>
            </View>
            <View
              style={[styles.badge, { backgroundColor: meta.accent + '1A' }]}
            >
              <Text style={[styles.badgeCount, { color: meta.accent }]}>
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
        );
      })}
    </ScrollView>
  );
}

// ─── Main Export — router between Home and Detail ─────────────────────────────

export default function MasterFileScreen() {
  const { colors } = useTheme();
  const [activeMeta, setActiveMeta] = useState<TableMeta | null>(null);

  if (activeMeta) {
    return (
      <TableDetailScreen
        meta={activeMeta}
        onBack={() => setActiveMeta(null)}
        colors={colors}
      />
    );
  }

  return (
    <MasterFileHome onSelect={(meta) => setActiveMeta(meta)} colors={colors} />
  );
}
