// components/GlobalCategoryPickerModal.tsx
import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Search, X } from 'lucide-react-native';
import { AdminCategoryService } from '@/services/admincategoryService';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (id: number, name: string) => void;
  selectedId: number | null;
  colors: any;
}

export function GlobalCategoryPickerModal({
  visible,
  onClose,
  onSelect,
  selectedId,
  colors,
}: Props) {
  const [query, setQuery] = useState('');
  const [categories, setCategories] = useState<{ id: number; name: string }[]>(
    [],
  );
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    if (!visible) return;
    setLoading(true);
    AdminCategoryService.getCategories()
      .then(setCategories)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [visible]);

  const filtered = React.useMemo(() => {
    const q = query.toLowerCase();
    return q
      ? categories.filter((c) => c.name.toLowerCase().includes(q))
      : categories;
  }, [query, categories]);

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
      maxHeight: '75%',
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
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 13,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    rowLabel: { flex: 1, fontSize: 14, fontWeight: '500', color: colors.text },
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
      paddingVertical: 24,
    },
    sectionLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.textSecondary,
      letterSpacing: 1,
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 4,
    },
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
            <Text style={s.title}>Select Global Category</Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={20} color={colors.textSecondary} strokeWidth={2} />
            </TouchableOpacity>
          </View>

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
              <Text style={s.sectionLabel}>GLOBAL CATEGORIES</Text>
              {filtered.length === 0 ? (
                <Text style={s.emptyTxt}>No categories found</Text>
              ) : (
                filtered.map((cat) => {
                  const isSelected = selectedId === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={s.row}
                      onPress={() => {
                        onSelect(cat.id, cat.name);
                        onClose();
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={s.rowLabel}>{cat.name}</Text>
                      <View
                        style={[
                          s.check,
                          {
                            borderColor: isSelected
                              ? colors.primary
                              : colors.border,
                            backgroundColor: isSelected
                              ? colors.primary
                              : 'transparent',
                          },
                        ]}
                      >
                        {isSelected && (
                          <Text
                            style={{
                              color: '#fff',
                              fontSize: 11,
                              fontWeight: '800',
                            }}
                          >
                            ✓
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}
