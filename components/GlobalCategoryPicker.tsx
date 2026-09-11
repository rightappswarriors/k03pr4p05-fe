import React, { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Modal, ScrollView, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native'
import { ChevronDown, Search, X } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { getCategoryTree, type CategoryTreeNode } from '@/services/globalCategoryService'

type Props = {
  selectedCategoryId?: string | null
  onSelect: (category: { id: string; name: string; breadcrumb: string }) => void
  leafOnly?: boolean
  disabled?: boolean
  label?: string
}

export function GlobalCategoryPicker({ selectedCategoryId, onSelect, leafOnly = false, disabled = false, label = 'Category *' }: Props) {
  const { colors } = useTheme()
  const { width, height } = useWindowDimensions()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [pendingCategoryId, setPendingCategoryId] = useState<string | null>(selectedCategoryId ?? null)
  const [categories, setCategories] = useState<CategoryTreeNode[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    getCategoryTree().then(setCategories).catch(() => setCategories([])).finally(() => setLoading(false))
  }, [open])

  const options = useMemo(() => {
    const byId = new Map(categories.map(category => [category.id, category]))
    const breadcrumb = (category: CategoryTreeNode) => {
      const names = [category.name]; let parentId = category.parentId; const visited = new Set<string>([category.id])
      while (parentId && byId.has(parentId) && !visited.has(parentId)) { const parent = byId.get(parentId)!; visited.add(parent.id); names.unshift(parent.name); parentId = parent.parentId }
      return names.join(' › ')
    }
    const term = query.trim().toLowerCase()
    return categories.filter(category => !leafOnly || !category.hasChildren).map(category => ({ ...category, breadcrumb: breadcrumb(category) })).filter(category => !term || `${category.name} ${category.slug} ${category.breadcrumb}`.toLowerCase().includes(term))
  }, [categories, leafOnly, query])
  const selected = options.find(category => category.id === selectedCategoryId) ?? categories.find(category => category.id === selectedCategoryId)
  const selectedBreadcrumb = selected ? (options.find(category => category.id === selected.id)?.breadcrumb ?? selected.name) : ''
  const pending = options.find(category => category.id === pendingCategoryId) ?? null
  const isCompact = width < 768
  const close = () => { setOpen(false); setQuery(''); setPendingCategoryId(selectedCategoryId ?? null) }
  const openPicker = () => { setPendingCategoryId(selectedCategoryId ?? null); setOpen(true) }
  const confirm = () => { if (!pending) return; onSelect(pending); close() }

  return <View style={{ gap: 5 }}>
    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary }}>{label}</Text>
    <TouchableOpacity disabled={disabled} onPress={openPicker} style={{ minHeight: 46, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', opacity: disabled ? .6 : 1 }}>
      <View style={{ flex: 1 }}><Text style={{ color: selected ? colors.text : colors.textSecondary, fontSize: 14 }}>{selected?.name ?? 'Search or choose a category...'}</Text>{selected && <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 2 }} numberOfLines={1}>{selectedBreadcrumb}</Text>}</View><ChevronDown size={16} color={colors.textSecondary} />
    </TouchableOpacity>
    <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
      <View style={{ flex: 1, padding: isCompact ? 12 : 24, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,.52)' }}>
        <View style={{ width: '100%', maxWidth: 620, maxHeight: Math.min(680, height - (isCompact ? 24 : 64)), minHeight: isCompact ? Math.min(460, height - 24) : 420, backgroundColor: colors.surface, borderRadius: isCompact ? 16 : 18, borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOpacity: .24, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 20, overflow: 'hidden' }}>
          <View style={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 4 }}><View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Text style={{ color: colors.text, fontWeight: '800', fontSize: 18 }}>Select Category</Text><TouchableOpacity accessibilityLabel="Close category picker" onPress={close} style={{ padding: 4 }}><X size={20} color={colors.textSecondary} /></TouchableOpacity></View><Text style={{ color: colors.textSecondary, fontSize: 13 }}>Choose the most specific category for your product.</Text></View>
          <View style={{ paddingHorizontal: 20, paddingVertical: 12 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: colors.background }}><Search size={16} color={colors.textSecondary} /><TextInput autoFocus value={query} onChangeText={setQuery} onKeyPress={(event) => { if (event.nativeEvent.key === 'Escape') close(); if (event.nativeEvent.key === 'Enter') confirm() }} placeholder="Search category name, slug, or breadcrumb..." placeholderTextColor={colors.textSecondary} style={{ flex: 1, color: colors.text, paddingVertical: 10 }} /></View></View>
          <View style={{ flex: 1, minHeight: 0 }}>{loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 28 }} /> : <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20 }}>{options.length ? options.map(category => { const active = pendingCategoryId === category.id; return <TouchableOpacity key={category.id} accessibilityRole="radio" accessibilityState={{ selected: active }} onPress={() => setPendingCategoryId(category.id)} style={{ paddingVertical: 13, paddingHorizontal: 10, marginHorizontal: -10, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: active ? `${colors.primary}14` : 'transparent', borderLeftWidth: active ? 3 : 0, borderLeftColor: colors.primary }}><View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}><Text style={{ flex: 1, color: colors.text, fontWeight: '700' }}>{category.name}</Text>{active && <Text style={{ color: colors.primary, fontWeight: '800' }}>✓</Text>}</View><Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 3 }}>{category.breadcrumb}</Text></TouchableOpacity> }) : <View style={{ paddingVertical: 30, alignItems: 'center', gap: 4 }}><Text style={{ color: colors.text, fontWeight: '700' }}>No categories found</Text><Text style={{ color: colors.textSecondary, fontSize: 12 }}>Try another category name or breadcrumb.</Text></View>}</ScrollView>}</View>
          <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: colors.border, gap: 10 }}><View style={{ flexDirection: 'row', gap: 10 }}><TouchableOpacity onPress={close} style={{ flex: 1, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 8 }}><Text style={{ color: colors.text, fontWeight: '700' }}>Cancel</Text></TouchableOpacity><TouchableOpacity disabled={!pending} onPress={confirm} style={{ flex: 1.4, paddingVertical: 12, alignItems: 'center', backgroundColor: colors.primary, borderRadius: 8, opacity: pending ? 1 : .45 }}><Text style={{ color: '#fff', fontWeight: '700' }}>Select Category</Text></TouchableOpacity></View><Text style={{ color: colors.textSecondary, fontSize: 12 }}>Only the most specific categories can be selected.</Text></View>
        </View>
      </View>
    </Modal>
  </View>
}
