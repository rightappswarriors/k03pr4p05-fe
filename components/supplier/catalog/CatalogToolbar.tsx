import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native'
import { Search, RefreshCcw, Download, Upload, LayoutGrid, List, Star, SlidersHorizontal } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'

export type CatalogStatusFilter = 'ALL' | 'ACTIVE' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'INACTIVE'
export type CatalogSort = 'NEWEST' | 'OLDEST' | 'NAME_ASC' | 'PRICE_HIGH' | 'PRICE_LOW' | 'RATING' | 'STOCK_LOW'
export type CatalogLayout = 'table' | 'cards'

const STATUS_OPTIONS: Array<{ key: CatalogStatusFilter; label: string }> = [
  { key: 'ALL', label: 'All' },
  { key: 'ACTIVE', label: 'Active' },
  { key: 'LOW_STOCK', label: 'Low Stock' },
  { key: 'OUT_OF_STOCK', label: 'Out of Stock' },
  { key: 'INACTIVE', label: 'Inactive' },
]

const SORT_OPTIONS: Array<{ key: CatalogSort; label: string }> = [
  { key: 'NEWEST', label: 'Newest' },
  { key: 'OLDEST', label: 'Oldest' },
  { key: 'NAME_ASC', label: 'Name (A–Z)' },
  { key: 'PRICE_HIGH', label: 'Price: High to Low' },
  { key: 'PRICE_LOW', label: 'Price: Low to High' },
  { key: 'RATING', label: 'Highest Rated' },
  { key: 'STOCK_LOW', label: 'Stock: Low to High' },
]

const RATING_OPTIONS = [0, 4, 3, 2, 1]

interface Props {
  search: string
  onSearchChange: (v: string) => void
  status: CatalogStatusFilter
  onStatusChange: (v: CatalogStatusFilter) => void
  minRating: number
  onMinRatingChange: (v: number) => void
  sort: CatalogSort | any
  onSortChange: (v: CatalogSort) => void
  layout: CatalogLayout
  onLayoutChange: (v: CatalogLayout) => void
  showLayoutToggle: boolean
  onRefresh: () => void
  onAddItem: () => void
}

export function CatalogToolbar({
  search, onSearchChange,
  status, onStatusChange,
  minRating, onMinRatingChange,
  sort, onSortChange,
  layout, onLayoutChange,
  showLayoutToggle,
  onRefresh, onAddItem,
}: Props) {
  const { colors } = useTheme()
  const [sortOpen, setSortOpen] = useState(false)
  const [ratingOpen, setRatingOpen] = useState(false)

  return (
    <View style={{ gap: 10, position: 'relative', zIndex: 50 }}>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        <View style={{ flex: 1, minWidth: 200, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12 }}>
          <Search size={16} color={colors.textSecondary} />
          <TextInput
            value={search}
            onChangeText={onSearchChange}
            placeholder="Search products, SKU…"
            placeholderTextColor={colors.textSecondary}
            style={{ flex: 1, paddingVertical: 10, color: colors.text, fontSize: 14 }}
          />
        </View>

        <View style={{ position: 'relative', zIndex: ratingOpen ? 60 : 1 }}>
          <TouchableOpacity onPress={() => { setRatingOpen((v) => !v); setSortOpen(false) }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border }}>
            <Star size={13} color={colors.text} />
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{minRating > 0 ? `${minRating}+ stars` : 'Rating'}</Text>
          </TouchableOpacity>
          {ratingOpen && (
            <View style={{ position: 'absolute', top: 44, right: 0, zIndex: 10, backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingVertical: 4, minWidth: 130 }}>
              {RATING_OPTIONS.map((r) => (
                <TouchableOpacity key={r} onPress={() => { onMinRatingChange(r); setRatingOpen(false) }} style={{ paddingHorizontal: 14, paddingVertical: 10 }}>
                  <Text style={{ fontSize: 13, color: colors.text, fontWeight: r === minRating ? '700' : '400' }}>{r === 0 ? 'Any rating' : `${r}+ stars`}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

       <View style={{ position: 'relative', zIndex: sortOpen ? 60 : 1 }}>
          <TouchableOpacity onPress={() => { setSortOpen((v) => !v); setRatingOpen(false) }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border }}>
            <SlidersHorizontal size={14} color={colors.text} />
          </TouchableOpacity>
          {sortOpen && (
            <View style={{ position: 'absolute', top: 44, right: 0, zIndex: 10, backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingVertical: 4, minWidth: 180 }}>
              {SORT_OPTIONS.map((opt) => (
                <TouchableOpacity key={opt.key} onPress={() => { onSortChange(opt.key); setSortOpen(false) }} style={{ paddingHorizontal: 14, paddingVertical: 10 }}>
                  <Text style={{ fontSize: 13, color: colors.text, fontWeight: opt.key === sort ? '700' : '400' }}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <TouchableOpacity onPress={onRefresh} style={{ padding: 10, backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border }}>
          <RefreshCcw size={14} color={colors.text} />
        </TouchableOpacity>

        {/* TODO(backend): no export/import service exists yet */}
        <TouchableOpacity disabled style={{ padding: 10, backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border, opacity: 0.5 }}>
          <Download size={14} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity disabled style={{ padding: 10, backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border, opacity: 0.5 }}>
          <Upload size={14} color={colors.text} />
        </TouchableOpacity>

        {showLayoutToggle && (
          <View style={{ flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 10, padding: 3, borderWidth: 1, borderColor: colors.border }}>
            <TouchableOpacity onPress={() => onLayoutChange('table')} style={{ padding: 8, borderRadius: 8, backgroundColor: layout === 'table' ? colors.primary : 'transparent' }}>
              <List size={14} color={layout === 'table' ? '#fff' : colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onLayoutChange('cards')} style={{ padding: 8, borderRadius: 8, backgroundColor: layout === 'cards' ? colors.primary : 'transparent' }}>
              <LayoutGrid size={14} color={layout === 'cards' ? '#fff' : colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity onPress={onAddItem} style={{ backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 }}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>+ Add Product</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {STATUS_OPTIONS.map((opt) => (
          <TouchableOpacity key={opt.key} onPress={() => onStatusChange(opt.key)}
            style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: status === opt.key ? colors.primary : colors.surface, borderWidth: 1, borderColor: status === opt.key ? colors.primary : colors.border }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: status === opt.key ? '#fff' : colors.textSecondary }}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  )
}