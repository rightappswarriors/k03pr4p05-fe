import React, { useEffect, useMemo, useState } from 'react';
import { Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ChevronDown, Search, X } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useResponsive } from '@/hooks/useResponsive';
import type { CategoryPlacementSuggestion, CategoryTreeNode } from '@/services/globalCategoryService';

type Props = {
  categories: CategoryTreeNode[];
  suggestedCategories?: CategoryPlacementSuggestion[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  disabled?: boolean;
  placeholder?: string;
};

export function GlobalParentCategoryPicker({ categories, suggestedCategories = [], selectedId, onSelect, disabled, placeholder = 'Search or choose a category...' }: Props) {
  const { colors } = useTheme(); const { isMobile, height } = useResponsive();
  const [open, setOpen] = useState(false); const [query, setQuery] = useState('');
  useEffect(() => { if (!open) setQuery(''); }, [open]);
  const byId = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);
  const breadcrumb = (category?: CategoryTreeNode) => { const names: string[] = []; let current = category; const visited = new Set<string>(); while (current && !visited.has(current.id)) { visited.add(current.id); names.unshift(current.name); current = current.parentId ? byId.get(current.parentId) : undefined; } return names.join(' › '); };
  const selectable = useMemo(() => categories.filter((category) => category.depth < 2), [categories]);
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = selectable.filter((category) => !normalizedQuery || `${category.name} ${category.slug} ${breadcrumb(category)}`.toLowerCase().includes(normalizedQuery));
  const suggested = useMemo(() => suggestedCategories.map((suggestion) => byId.get(suggestion.id)).filter((category): category is CategoryTreeNode => !!category && category.depth < 2).filter((category, index, values) => values.findIndex((item) => item.id === category.id) === index), [suggestedCategories, byId]);
  const selected = selectedId ? byId.get(selectedId) : undefined;
  const choose = (id: string | null) => { onSelect(id); setOpen(false); };
  const option = (category: CategoryTreeNode) => <TouchableOpacity key={category.id} accessibilityRole="button" onPress={() => choose(category.id)} style={{ paddingHorizontal: 16, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: selectedId === category.id ? `${colors.primary}14` : 'transparent' }}><Text style={{ color: colors.text, fontWeight: selectedId === category.id ? '800' : '600' }}>{category.name}</Text><Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>{breadcrumb(category)}</Text></TouchableOpacity>;
  const menuContent = <><View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}><Search size={16} color={colors.textSecondary} /><TextInput autoFocus value={query} onChangeText={setQuery} onKeyPress={(event) => { if (event.nativeEvent.key === 'Escape') setOpen(false); if (event.nativeEvent.key === 'Enter' && filtered.length === 1) choose(filtered[0].id); }} placeholder="Search categories..." placeholderTextColor={colors.textSecondary} style={{ flex: 1, color: colors.text, padding: 4 }} /><TouchableOpacity accessibilityLabel="Close category picker" onPress={() => setOpen(false)}><X size={18} color={colors.textSecondary} /></TouchableOpacity></View><ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator contentContainerStyle={{ paddingBottom: 8 }}><TouchableOpacity onPress={() => choose(null)} style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: selectedId === null ? `${colors.primary}14` : 'transparent' }}><Text style={{ color: colors.text, fontWeight: selectedId === null ? '800' : '600' }}>Main category (no parent)</Text><Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>Place this at the top level of Kompra's categories.</Text></TouchableOpacity>{!normalizedQuery && suggested.length > 0 && <><Text style={{ color: colors.textSecondary, fontWeight: '800', fontSize: 11, letterSpacing: .5, paddingHorizontal: 16, paddingTop: 13, paddingBottom: 5 }}>SUGGESTED PLACEMENT</Text>{suggested.map(option)}</>}<Text style={{ color: colors.textSecondary, fontWeight: '800', fontSize: 11, letterSpacing: .5, paddingHorizontal: 16, paddingTop: 13, paddingBottom: 5 }}>ALL CATEGORIES</Text>{filtered.length ? filtered.map(option) : <Text style={{ color: colors.textSecondary, paddingHorizontal: 16, paddingVertical: 18 }}>No categories match your search.</Text>}</ScrollView></>;
  const menu = isMobile ? <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}><View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,.5)' }}><TouchableOpacity activeOpacity={1} onPress={() => setOpen(false)} style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }} /><View style={{ maxHeight: height * .8, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden', backgroundColor: colors.card }}>{menuContent}</View></View></Modal> : open ? <View style={{ maxHeight: 360, marginTop: 6, borderWidth: 1, borderColor: colors.border, borderRadius: 10, overflow: 'hidden', backgroundColor: colors.card, zIndex: 10 }}>{menuContent}</View> : null;
  return <><TouchableOpacity accessibilityRole="button" accessibilityLabel="Choose parent category" disabled={disabled} onPress={() => setOpen(true)} style={{ minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 10, opacity: disabled ? .6 : 1 }}><Text numberOfLines={1} style={{ flex: 1, color: selected ? colors.text : colors.textSecondary }}>{selected ? breadcrumb(selected) : placeholder}</Text><ChevronDown size={18} color={colors.textSecondary} /></TouchableOpacity>{menu}</>;
}
