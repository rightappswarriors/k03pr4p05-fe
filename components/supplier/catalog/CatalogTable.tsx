import React from 'react'
import { View, Text, TouchableOpacity, Image } from 'react-native'
import { Eye, Pencil, MoreVertical, Package } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { RatingStars } from './RatingStars'
import { ProductStatusBadge } from './ProductStatusBadge'
import type { SupplierItem } from '@/services/supplierService/supplierService'

const formatPHP = (amount: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount)
const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })

const COLUMNS = [
  { key: 'product', label: 'Product', flex: 2.4 },
  { key: 'sku', label: 'SKU', flex: 1 },
  { key: 'rating', label: 'Rating', flex: 1.2 },
  { key: 'price', label: 'Price', flex: 1 },
  { key: 'stock', label: 'Available Stock', flex: 1.2 },
  { key: 'status', label: 'Status', flex: 1 },
  { key: 'updated', label: 'Updated', flex: 0.9 },
]

export function CatalogTable({
  items,
  onView,
  onEdit,
}: {
  items: SupplierItem[]
  onView: (item: SupplierItem) => void
  onEdit: (item: SupplierItem) => void
}) {
  const { colors } = useTheme()

  // Was: horizontal ScrollView + minWidth:900 wrapper — that locked the table
  // to 900px even inside a much wider container, leaving blank space to the
  // right at contentMaxWidth=1680. Dropped in favor of a plain flex:1 View so
  // the flex-based columns above actually stretch to fill the container.
  return (
    <View style={{ flex: 1, width: '100%', backgroundColor: colors.surface, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
      <View style={{ flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 16, backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        {COLUMNS.map((col) => (
          <Text key={col.key} style={{ flex: col.flex, fontSize: 11, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4 }}>
            {col.label}
          </Text>
        ))}
        <View style={{ width: 110 }} />
      </View>

      {items.map((item, idx) => (
        <TouchableOpacity
          key={item.id}
          onPress={() => onView(item)}
          activeOpacity={0.7}
          style={{
            flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16,
            backgroundColor: idx % 2 === 0 ? colors.surface : colors.background + '40',
            borderBottomWidth: idx === items.length - 1 ? 0 : 1, borderBottomColor: colors.border,
            opacity: item.isActive ? 1 : 0.6,
          }}
        >
          <View style={{ flex: 2.4, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {item.image ? <Image source={{ uri: item.image }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : <Package size={16} color={colors.textSecondary} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }} numberOfLines={1}>{item.name}</Text>
              <Text style={{ fontSize: 11, color: colors.textSecondary }}>per {item.unit}</Text>
            </View>
          </View>
          <Text style={{ flex: 1, fontSize: 12, color: colors.textSecondary }}>{item.sku ?? '—'}</Text>
          <View style={{ flex: 1.2 }}><RatingStars rating={item.averageRating} reviewCount={item.reviewCount} size={12} /></View>
          <Text style={{ flex: 1, fontSize: 13, fontWeight: '700', color: colors.text }}>{formatPHP(item.unitPrice)}</Text>
          <Text style={{ flex: 1.2, fontSize: 13, color: colors.text }}>{item.availableQty} {item.unit}</Text>
          <View style={{ flex: 1 }}><ProductStatusBadge item={item} size="sm" /></View>
          <Text style={{ flex: 0.9, fontSize: 11, color: colors.textSecondary }}>{formatDate(item.updatedAt)}</Text>
          <View style={{ width: 110, flexDirection: 'row', gap: 4, justifyContent: 'flex-end' }}>
            <TouchableOpacity onPress={() => onView(item)} style={{ padding: 6 }}><Eye size={15} color={colors.textSecondary} /></TouchableOpacity>
            <TouchableOpacity onPress={() => onEdit(item)} style={{ padding: 6 }}><Pencil size={15} color={colors.textSecondary} /></TouchableOpacity>
            <TouchableOpacity style={{ padding: 6 }}><MoreVertical size={15} color={colors.textSecondary} /></TouchableOpacity>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  )
}