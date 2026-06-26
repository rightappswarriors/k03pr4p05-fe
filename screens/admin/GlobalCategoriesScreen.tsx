// screens/admin/GlobalCategoriesScreen.tsx
// Super admin manages global ItemCategories here.
// Orgs can then pick from these to create their own OrgItemCategory.
// Responsive: compact on mobile, wider layout on web/tablet.

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Edit2,
  FolderOpen,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { AdminCategoryService } from '@/services/admincategoryService';

const ACCENT = '#7C3AED';

// ─── Types ────────────────────────────────────────────────────────────────────

interface GlobalCategory {
  id: string;
  label: string;
  createdAt?: string;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonPulse({ style, colors }: { style: any; colors: any }) {
  const anim = useRef(new Animated.Value(0.35)).current;

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

function SkeletonRow({ colors }: { colors: any }) {
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
      {/* Icon placeholder */}
      <SkeletonPulse
        colors={colors}
        style={{ width: 36, height: 36, borderRadius: 10, marginRight: 12 }}
      />
      {/* Label + date */}
      <View style={{ flex: 1, gap: 6 }}>
        <SkeletonPulse
          colors={colors}
          style={{ height: 14, borderRadius: 4, maxWidth: w }}
        />
        <SkeletonPulse
          colors={colors}
          style={{ height: 10, borderRadius: 4, maxWidth: 80 }}
        />
      </View>
      {/* Action buttons */}
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

// ─── Add / Edit Modal ─────────────────────────────────────────────────────────

function CategoryModal({
  visible,
  onClose,
  onSave,
  existing,
  colors,
  saving,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  existing: GlobalCategory | null;
  colors: any;
  saving: boolean;
}) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (visible) {
      setName(existing?.label ?? '');
      setError('');
    }
  }, [visible, existing]);

  const handleSave = () => {
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    // ✅ Fixed: delegates to parent handleSave — no direct service call here
    onSave(name.trim());
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={m.overlay}>
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={[m.sheet, { backgroundColor: colors.surface }]}>
          <View style={[m.handle, { backgroundColor: colors.border }]} />
          <View style={[m.header, { borderBottomColor: colors.border }]}>
            <Text style={[m.title, { color: colors.text }]}>
              {existing ? 'Edit Global Category' : 'New Global Category'}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={20} color={colors.textSecondary} strokeWidth={2} />
            </TouchableOpacity>
          </View>
          <View style={m.body}>
            <Text style={[m.fieldLabel, { color: colors.textSecondary }]}>
              NAME *
            </Text>
            <TextInput
              style={[
                m.input,
                {
                  color: colors.text,
                  backgroundColor: colors.background,
                  borderColor: error
                    ? (colors.error ?? '#EF4444')
                    : colors.border,
                },
              ]}
              placeholder="e.g. Beverages"
              placeholderTextColor={colors.textSecondary}
              value={name}
              onChangeText={(v) => {
                setName(v);
                if (error) setError('');
              }}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
            <Text style={[m.hint, { color: colors.textSecondary }]}>
              This will be visible to all organizations as a template.
            </Text>
            {error ? (
              <Text style={[m.error, { color: colors.error ?? '#EF4444' }]}>
                {error}
              </Text>
            ) : null}
            <TouchableOpacity
              style={[
                m.saveBtn,
                { backgroundColor: ACCENT, opacity: saving ? 0.7 : 1 },
              ]}
              onPress={handleSave}
              activeOpacity={0.85}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={m.saveTxt}>
                  {existing ? 'Save Changes' : 'Create Category'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const m = StyleSheet.create({
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
  hint: { fontSize: 12, marginTop: 8, lineHeight: 17 },
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
  deleting,
}: {
  visible: boolean;
  label: string;
  onCancel: () => void;
  onConfirm: () => void;
  colors: any;
  deleting: boolean;
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
          <View
            style={[
              dc.icon,
              { backgroundColor: (colors.error ?? '#EF4444') + '18' },
            ]}
          >
            <Trash2
              size={26}
              color={colors.error ?? '#EF4444'}
              strokeWidth={1.5}
            />
          </View>
          <Text style={[dc.title, { color: colors.text }]}>
            Delete Category?
          </Text>
          <Text style={[dc.sub, { color: colors.textSecondary }]}>
            "{label}" will be removed globally. Organizations using this
            category may be affected.
          </Text>
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
                {
                  backgroundColor: colors.error ?? '#EF4444',
                  borderColor: colors.error ?? '#EF4444',
                  opacity: deleting ? 0.7 : 1,
                },
              ]}
              onPress={onConfirm}
              disabled={deleting}
            >
              {deleting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={[dc.btnTxt, { color: '#fff' }]}>Delete</Text>
              )}
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
  sub: { fontSize: 13, textAlign: 'center', marginBottom: 24, lineHeight: 19 },
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

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function GlobalCategoriesScreen() {
  const { colors } = useTheme(); // ✅ navy/orange palette from ThemeContext
  const { width } = Dimensions.get('window');
  const isWide = width >= 768;

  const [items, setItems] = useState<GlobalCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<GlobalCategory | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GlobalCategory | null>(null);

  // ── Load ──────────────────────────────────────────────────────────────────

  const loadCategories = useCallback(async () => {
    try {
      const raw = await AdminCategoryService.getCategories(); // ✅ AdminCategoryService
      setItems(
        raw.map((c: any) => ({
          id: String(c.id),
          label: c.name,
          createdAt: c.createdAt,
        })),
      );
    } catch (err) {
      if (__DEV__) console.error('Failed to load global categories:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // ── Search ────────────────────────────────────────────────────────────────

  const doSearch = useCallback(() => {
    if (query.trim() === search) return;
    setSearching(true);
    const t = setTimeout(() => {
      setSearch(query.trim());
      setSearching(false);
    }, 600);
    return () => clearTimeout(t);
  }, [query, search]);

  const handleClear = () => {
    setQuery('');
    if (search !== '') {
      setSearching(true);
      setTimeout(() => {
        setSearch('');
        setSearching(false);
      }, 400);
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return q ? items.filter((i) => i.label.toLowerCase().includes(q)) : items;
  }, [items, search]);

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = async (name: string) => {
    setSaving(true);
    try {
      if (editingItem) {
        await AdminCategoryService.updateCategory(Number(editingItem.id), name); // ✅
      } else {
        await AdminCategoryService.createCategories([name]); // ✅
      }
      await loadCategories();
      setModalVisible(false);
      setEditingItem(null);
    } catch (err) {
      if (__DEV__) console.error('Failed to save category:', err);
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await AdminCategoryService.deleteCategory(Number(deleteTarget.id)); // ✅
      await loadCategories();
      setDeleteTarget(null);
    } catch (err) {
      if (__DEV__) console.error('Failed to delete category:', err);
    } finally {
      setDeleting(false);
    }
  };

  const isLoading = loading || searching;

  // ── Styles ────────────────────────────────────────────────────────────────

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    inner: {
      flex: 1,
      maxWidth: isWide ? 760 : undefined,
      alignSelf: isWide ? 'center' : undefined,
      width: '100%',
      paddingTop: isWide ? 24 : 0,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: isWide ? 0 : 16,
      paddingVertical: 12,
      gap: 10,
    },
    topBarTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.text,
      flex: 1,
    },
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 10,
      backgroundColor: ACCENT,
    },
    addBtnTxt: { fontSize: 13, fontWeight: '700', color: '#fff' },
    searchOuter: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginHorizontal: isWide ? 0 : 12,
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
      backgroundColor: searching ? colors.border : ACCENT,
    },
    searchBtnTxt: { fontSize: 13, fontWeight: '700', color: '#fff' },
    countTxt: {
      fontSize: 11,
      color: colors.textSecondary,
      paddingHorizontal: isWide ? 2 : 14,
      paddingBottom: 6,
    },
    listContent: { paddingHorizontal: isWide ? 0 : 12, paddingBottom: 40 },
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
    itemIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: ACCENT + '18',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    itemLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
    itemDate: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
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
    emptyWrap: { alignItems: 'center', paddingTop: 80 },
    emptyIcon: { fontSize: 48, marginBottom: 12 },
    emptyTxt: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
    emptyBtn: {
      marginTop: 16,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: ACCENT,
    },
    emptyBtnTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },
    skeletonWrap: { paddingHorizontal: isWide ? 0 : 12, paddingTop: 4 },
  });

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={s.container}>
      <View style={s.inner}>
        {/* Top bar */}
        <View style={s.topBar}>
          <FolderOpen size={20} color={ACCENT} strokeWidth={2} />
          <Text style={s.topBarTitle}>Global Categories</Text>
          <TouchableOpacity
            style={s.addBtn}
            onPress={() => {
              setEditingItem(null);
              setModalVisible(true);
            }}
            activeOpacity={0.85}
          >
            <Plus size={14} color="#fff" strokeWidth={2.5} />
            <Text style={s.addBtnTxt}>New Category</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={s.searchOuter}>
          <View style={s.searchBox}>
            <Search size={13} color={colors.textSecondary} strokeWidth={2} />
            <TextInput
              style={s.searchInput}
              placeholder="Search categories…"
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

        {/* Count */}
        {!isLoading && (
          <Text style={s.countTxt}>
            {filtered.length}{' '}
            {filtered.length === 1 ? 'category' : 'categories'}
            {search ? ` matching "${search}"` : ''}
          </Text>
        )}

        {/* Skeleton → List → Empty */}
        {isLoading ? (
          <View style={s.skeletonWrap}>
            {Array.from({ length: 7 }).map((_, i) => (
              <SkeletonRow key={i} colors={colors} />
            ))}
          </View>
        ) : filtered.length === 0 ? (
          <View style={s.emptyWrap}>
            <Text style={s.emptyIcon}>🗂️</Text>
            <Text style={s.emptyTxt}>
              {search
                ? `No categories matching "${search}"`
                : 'No global categories yet.\nCreate one for organizations to use.'}
            </Text>
            {!search && (
              <TouchableOpacity
                style={s.emptyBtn}
                onPress={() => {
                  setEditingItem(null);
                  setModalVisible(true);
                }}
              >
                <Text style={s.emptyBtnTxt}>Create First Category</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={s.listContent}
            showsVerticalScrollIndicator={false}
          >
            {filtered.map((item) => (
              <View key={item.id} style={s.itemRow}>
                <View style={s.itemIcon}>
                  <FolderOpen size={16} color={ACCENT} strokeWidth={2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.itemLabel} numberOfLines={1}>
                    {item.label}
                  </Text>
                  {item.createdAt && (
                    <Text style={s.itemDate}>
                      Created {new Date(item.createdAt).toLocaleDateString()}
                    </Text>
                  )}
                </View>
                <View style={s.actions}>
                  <TouchableOpacity
                    style={s.actionBtn}
                    onPress={() => {
                      setEditingItem(item);
                      setModalVisible(true);
                    }}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Edit2 size={13} color={ACCENT} strokeWidth={2} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.actionBtn}
                    onPress={() => setDeleteTarget(item)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Trash2
                      size={13}
                      color={colors.error ?? '#EF4444'}
                      strokeWidth={2}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      <CategoryModal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setEditingItem(null);
        }}
        onSave={handleSave}
        existing={editingItem}
        colors={colors}
        saving={saving}
      />

      <DeleteConfirm
        visible={!!deleteTarget}
        label={deleteTarget?.label ?? ''}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        colors={colors}
        deleting={deleting}
      />
    </View>
  );
}
