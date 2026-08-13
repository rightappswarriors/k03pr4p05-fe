import React, { useState } from 'react'
import { Pressable, Text, TextInput, TouchableOpacity, View } from 'react-native'
import {
  CalendarRange,
  CheckSquare,
  Columns3,
  Download,
  LayoutGrid,
  List,
  RefreshCcw,
  Search,
  SlidersHorizontal,
  Upload,
} from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import DateRangePickerModal from '@/components/DateRangePickerModal'
import type { PricingCategory, PricingListFilterInput } from '@/services/supplierService/pricingService'

export type PricingSort =
  | 'NEWEST'
  | 'OLDEST'
  | 'NAME_ASC'
  | 'PRICE_HIGH'
  | 'PRICE_LOW'
  | 'MARGIN_HIGH'
  | 'MARGIN_LOW'

export type PricingLayout = 'table' | 'cards'

export const PRICING_COLUMN_KEYS = [
  'image',
  'product',
  'sku',
  'category',
  'currentCost',
  'sellingPrice',
  'margin',
  'markup',
  'tierCount',
  'updated',
  'status',
] as const
export type PricingColumnKey = (typeof PRICING_COLUMN_KEYS)[number]

const COLUMN_LABELS: Record<PricingColumnKey, string> = {
  image: 'Image',
  product: 'Product',
  sku: 'SKU',
  category: 'Category',
  currentCost: 'Current Cost',
  sellingPrice: 'Selling Price',
  margin: 'Margin %',
  markup: 'Markup %',
  tierCount: 'Price Tiers',
  updated: 'Updated',
  status: 'Status',
}

const SORT_OPTIONS: Array<{ key: PricingSort; label: string }> = [
  { key: 'NEWEST', label: 'Newest' },
  { key: 'OLDEST', label: 'Oldest' },
  { key: 'NAME_ASC', label: 'Name (A–Z)' },
  { key: 'PRICE_HIGH', label: 'Price: High to Low' },
  { key: 'PRICE_LOW', label: 'Price: Low to High' },
  { key: 'MARGIN_HIGH', label: 'Margin: High to Low' },
  { key: 'MARGIN_LOW', label: 'Margin: Low to High' },
]

interface Props {
  filter: PricingListFilterInput
  onFilterChange: (f: PricingListFilterInput) => void
  sort: PricingSort
  onSortChange: (s: PricingSort) => void
  layout: PricingLayout
  onLayoutChange: (l: PricingLayout) => void
  showLayoutToggle: boolean
  visibleColumns: PricingColumnKey[]
  onVisibleColumnsChange: (cols: PricingColumnKey[]) => void
  selectedCount: number
  onBulkUpdatePress: () => void
  onRefresh: () => void
  onNewPrice: () => void
  onResetFilters: () => void
  categories: PricingCategory[]
}

export function PricingToolbar({
  filter,
  onFilterChange,
  sort,
  onSortChange,
  layout,
  onLayoutChange,
  showLayoutToggle,
  visibleColumns,
  onVisibleColumnsChange,
  selectedCount,
  onBulkUpdatePress,
  onRefresh,
  onNewPrice,
  onResetFilters,
  categories,
}: Props) {
  const { colors } = useTheme()
  const [sortOpen, setSortOpen] = useState(false)
  const [columnsOpen, setColumnsOpen] = useState(false)
  const [rangeOpen, setRangeOpen] = useState(false)
  const [categoryOpen, setCategoryOpen] = useState(false)
  const [dateModalOpen, setDateModalOpen] = useState(false)

  const closeAllPopovers = () => {
    setSortOpen(false)
    setColumnsOpen(false)
    setRangeOpen(false)
    setCategoryOpen(false)
  }

  const toggleColumn = (key: PricingColumnKey) => {
    if (visibleColumns.includes(key)) {
      onVisibleColumnsChange(visibleColumns.filter((c) => c !== key))
    } else {
      onVisibleColumnsChange([...visibleColumns, key])
    }
    setColumnsOpen(false)
  }

  const dateLabel =
    filter.startDate && filter.endDate
      ? `${new Date(filter.startDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })} – ${new Date(
          filter.endDate
        ).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}`
      : 'Date Range'

  const categoryLabel =
    categories.find((cat) => cat.id === filter.categoryId)?.name ?? (filter.categoryId ? 'Category' : 'Category')

  return (
    <View style={{ gap: 10, position: 'relative', zIndex: 50 }}>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        <View
          style={{
            flex: 1,
            minWidth: 220,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: colors.surface,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: colors.border,
            paddingHorizontal: 12,
          }}
        >
          <Search size={16} color={colors.textSecondary} />
          <TextInput
            value={filter.search ?? ''}
            onChangeText={(v) => onFilterChange({ ...filter, search: v })}
            placeholder="Search products, SKU…"
            placeholderTextColor={colors.textSecondary}
            style={{ flex: 1, paddingVertical: 10, color: colors.text, fontSize: 14 }}
          />
        </View>

        <View style={{ position: 'relative', zIndex: categoryOpen ? 60 : 1 }}>
          <TouchableOpacity
            onPress={() => {
              closeAllPopovers()
              setCategoryOpen((v) => !v)
            }}
            style={{
              minWidth: 140,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              backgroundColor: colors.surface,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: colors.border,
              paddingHorizontal: 12,
              paddingVertical: 10,
            }}
          >
            <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>{categoryLabel}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>▾</Text>
          </TouchableOpacity>
          {categoryOpen && (
            <>
              <Pressable style={{ position: 'absolute', inset: 0, zIndex: -1 }} onPress={() => setCategoryOpen(false)} />
              <View
                style={{
                  position: 'absolute',
                  top: 44,
                  right: 0,
                  zIndex: 10,
                  backgroundColor: colors.surface,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: colors.border,
                  paddingVertical: 6,
                  minWidth: 220,
                  maxHeight: 260,
                }}
              >
                <TouchableOpacity
                  onPress={() => {
                    onFilterChange({ ...filter, categoryId: undefined })
                    setCategoryOpen(false)
                  }}
                  style={{ paddingHorizontal: 14, paddingVertical: 10 }}
                >
                  <Text style={{ color: colors.text, fontSize: 13 }}>All categories</Text>
                </TouchableOpacity>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => {
                      onFilterChange({ ...filter, categoryId: cat.id })
                      setCategoryOpen(false)
                    }}
                    style={{ paddingHorizontal: 14, paddingVertical: 10 }}
                  >
                    <Text style={{ color: colors.text, fontSize: 13, fontWeight: cat.id === filter.categoryId ? '700' : '400' }}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </View>

        <View style={{ position: 'relative', zIndex: rangeOpen ? 60 : 1 }}>
          <TouchableOpacity
            onPress={() => {
              closeAllPopovers()
              setRangeOpen((v) => !v)
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 12,
              paddingVertical: 10,
              backgroundColor: colors.surface,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <SlidersHorizontal size={14} color={colors.text} />
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>Price / Margin</Text>
          </TouchableOpacity>
          {rangeOpen && (
            <View
              style={{
                position: 'absolute',
                top: 44,
                right: 0,
                zIndex: 10,
                backgroundColor: colors.surface,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: colors.border,
                padding: 14,
                minWidth: 220,
                gap: 10,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase' }}>
                Price Range
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  keyboardType="numeric"
                  value={filter.minPrice?.toString() ?? ''}
                  onChangeText={(v) => onFilterChange({ ...filter, minPrice: v ? Number(v) : undefined })}
                  placeholder="Min"
                  placeholderTextColor={colors.textSecondary}
                  style={{ flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 8, color: colors.text }}
                />
                <TextInput
                  keyboardType="numeric"
                  value={filter.maxPrice?.toString() ?? ''}
                  onChangeText={(v) => onFilterChange({ ...filter, maxPrice: v ? Number(v) : undefined })}
                  placeholder="Max"
                  placeholderTextColor={colors.textSecondary}
                  style={{ flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 8, color: colors.text }}
                />
              </View>
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', marginTop: 4 }}>
                Margin % Range
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  keyboardType="numeric"
                  value={filter.minMargin?.toString() ?? ''}
                  onChangeText={(v) => onFilterChange({ ...filter, minMargin: v ? Number(v) : undefined })}
                  placeholder="Min %"
                  placeholderTextColor={colors.textSecondary}
                  style={{ flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 8, color: colors.text }}
                />
                <TextInput
                  keyboardType="numeric"
                  value={filter.maxMargin?.toString() ?? ''}
                  onChangeText={(v) => onFilterChange({ ...filter, maxMargin: v ? Number(v) : undefined })}
                  placeholder="Max %"
                  placeholderTextColor={colors.textSecondary}
                  style={{ flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 8, color: colors.text }}
                />
              </View>
            </View>
          )}
        </View>

        <TouchableOpacity
          onPress={() => setDateModalOpen(true)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 12,
            paddingVertical: 10,
            backgroundColor: colors.surface,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <CalendarRange size={14} color={colors.text} />
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{dateLabel}</Text>
        </TouchableOpacity>
        <DateRangePickerModal
          visible={dateModalOpen}
          onClose={() => setDateModalOpen(false)}
          initialStart={filter.startDate ? new Date(filter.startDate) : undefined}
          initialEnd={filter.endDate ? new Date(filter.endDate) : undefined}
          onApply={(start, end) => onFilterChange({ ...filter, startDate: start.toISOString(), endDate: end.toISOString() })}
        />

        <View style={{ position: 'relative', zIndex: sortOpen ? 60 : 1 }}>
          <TouchableOpacity
            onPress={() => {
              closeAllPopovers()
              setSortOpen((v) => !v)
            }}
            style={{ padding: 10, backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border }}
          >
            <SlidersHorizontal size={14} color={colors.text} />
          </TouchableOpacity>
          {sortOpen && (
            <View
              style={{
                position: 'absolute',
                top: 44,
                right: 0,
                zIndex: 10,
                backgroundColor: colors.surface,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: colors.border,
                paddingVertical: 4,
                minWidth: 190,
              }}
            >
              {SORT_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => {
                    onSortChange(opt.key)
                    setSortOpen(false)
                  }}
                  style={{ paddingHorizontal: 14, paddingVertical: 10 }}
                >
                  <Text style={{ fontSize: 13, color: colors.text, fontWeight: opt.key === sort ? '700' : '400' }}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {showLayoutToggle && (
          <View style={{ position: 'relative', zIndex: columnsOpen ? 60 : 1 }}>
            <TouchableOpacity
              onPress={() => {
                closeAllPopovers()
                setColumnsOpen((v) => !v)
              }}
              style={{ padding: 10, backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border }}
            >
              <Columns3 size={14} color={colors.text} />
            </TouchableOpacity>
            {columnsOpen && (
              <>
                <Pressable style={{ position: 'absolute', inset: 0, zIndex: -1 }} onPress={() => setColumnsOpen(false)} />
                <View
                  style={{
                    position: 'absolute',
                    top: 44,
                    right: 0,
                    zIndex: 10,
                    backgroundColor: colors.surface,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: colors.border,
                    paddingVertical: 6,
                    minWidth: 180,
                  }}
                >
                  {PRICING_COLUMN_KEYS.map((key) => (
                    <TouchableOpacity
                      key={key}
                      onPress={() => toggleColumn(key)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 8 }}
                    >
                      <CheckSquare size={14} color={visibleColumns.includes(key) ? colors.primary : colors.textSecondary} />
                      <Text style={{ fontSize: 13, color: colors.text }}>{COLUMN_LABELS[key]}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </View>
        )}

        <TouchableOpacity onPress={onRefresh} style={{ padding: 10, backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border }}>
          <RefreshCcw size={14} color={colors.text} />
        </TouchableOpacity>

        <TouchableOpacity onPress={onResetFilters} style={{ paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>Reset</Text>
        </TouchableOpacity>

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

        {selectedCount > 0 && (
          <TouchableOpacity
            onPress={onBulkUpdatePress}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primary, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 }}
          >
            <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>Bulk Update ({selectedCount})</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={onNewPrice} style={{ backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 }}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>+ New Price</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
