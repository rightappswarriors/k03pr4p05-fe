// ─── CategoryPickerModal ──────────────────────────────────────────────────────

import { AdminCategoryService } from "@/services/admincategoryService";
import { OrgCategoryService } from "@/services/orgCategoryService";
import { Search, X } from "lucide-react-native";
import React, { useState } from "react";
import { StyleSheet, View, Modal, TouchableOpacity, Text, TextInput, ActivityIndicator, ScrollView } from "react-native";

interface CategoryOption {
  id: number;
  name: string;
  isGlobal: boolean;
}

export function CategoryPickerModal({
  visible,
  onClose,
  onSelect,
  selectedId,
  selectedIsGlobal,
  colors,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (id: number, isGlobal: boolean, name: string) => void;
  selectedId: number | null;
  selectedIsGlobal: boolean;
  colors: any;
}) {
  const [query, setQuery] = useState('');
  const [orgCategories, setOrgCategories] = useState<CategoryOption[]>([]);
  const [globalCategories, setGlobalCategories] = useState<CategoryOption[]>(
    [],
  );
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    if (!visible) return;
    setLoading(true);
    Promise.all([
      OrgCategoryService.getOrgCategories(),
      AdminCategoryService.getCategories(),
    ])
      .then(([org, global]) => {
        setOrgCategories(
          org.map((c: any) => ({ id: c.id, name: c.name, isGlobal: false })),
        );
        setGlobalCategories(
          global.map((c: any) => ({ id: c.id, name: c.name, isGlobal: true })),
        );
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [visible]);

  const filtered = React.useMemo(() => {
    const q = query.toLowerCase();
    const filterFn = (c: CategoryOption) =>
      !q || c.name.toLowerCase().includes(q);
    return {
      org: orgCategories.filter(filterFn),
      global: globalCategories.filter(filterFn),
    };
  }, [query, orgCategories, globalCategories]);

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
      maxHeight: '80%',
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
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.background,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 9,
      marginHorizontal: 16,
      marginTop: 12,
      marginBottom: 8,
    },
    searchInput: { flex: 1, fontSize: 13, color: colors.text },
    sectionLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.textSecondary,
      letterSpacing: 1,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 6,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    rowLabel: { flex: 1, fontSize: 14, fontWeight: '500', color: colors.text },
    badge: {
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 6,
      marginRight: 10,
    },
    badgeTxt: { fontSize: 10, fontWeight: '700' },
    check: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyTxt: {
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: 'center',
      paddingVertical: 20,
    },
  });

  const renderRow = (cat: CategoryOption) => {
    const isSelected =
      selectedId === cat.id && selectedIsGlobal === cat.isGlobal;
    return (
      <TouchableOpacity
        key={`${cat.isGlobal ? 'g' : 'o'}-${cat.id}`}
        style={s.row}
        onPress={() => {
          onSelect(cat.id, cat.isGlobal, cat.name);
          onClose();
        }}
        activeOpacity={0.7}
      >
        {cat.isGlobal && (
          <View style={[s.badge, { backgroundColor: colors.primary + '18' }]}>
            <Text style={[s.badgeTxt, { color: colors.primary }]}>Global</Text>
          </View>
        )}
        <Text style={s.rowLabel}>{cat.name}</Text>
        <View
          style={[
            s.check,
            {
              borderColor: isSelected ? colors.primary : colors.border,
              backgroundColor: isSelected ? colors.primary : 'transparent',
            },
          ]}
        >
          {isSelected && (
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>
              ✓
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

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
            <Text style={s.title}>Select Category</Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={20} color={colors.textSecondary} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={s.searchBox}>
            <Search size={13} color={colors.textSecondary} strokeWidth={2} />
            <TextInput
              style={s.searchInput}
              placeholder="Search categories…"
              placeholderTextColor={colors.textSecondary}
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
            />
            {query.length > 0 && (
              <TouchableOpacity
                onPress={() => setQuery('')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={13} color={colors.textSecondary} strokeWidth={2} />
              </TouchableOpacity>
            )}
          </View>

          {loading ? (
            <ActivityIndicator
              color={colors.primary}
              style={{ marginTop: 24 }}
            />
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Org categories */}
              {filtered.org.length > 0 && (
                <>
                  <Text style={s.sectionLabel}>MY CATEGORIES</Text>
                  {filtered.org.map(renderRow)}
                </>
              )}

              {/* Global categories */}
              {filtered.global.length > 0 && (
                <>
                  <Text style={s.sectionLabel}>GLOBAL CATEGORIES</Text>
                  {filtered.global.map(renderRow)}
                </>
              )}

              {filtered.org.length === 0 && filtered.global.length === 0 && (
                <Text style={s.emptyTxt}>No categories found</Text>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}
