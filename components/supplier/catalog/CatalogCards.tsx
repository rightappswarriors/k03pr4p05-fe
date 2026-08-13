import React from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { Package, Eye, Pencil, Globe, Globe2 } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { RatingStars } from './RatingStars'
import { ProductStatusBadge } from './ProductStatusBadge'
import { MarketplaceBadge } from './MarketplaceBadge'
import type { SupplierItem } from '@/services/supplierService/supplierService'

const formatPHP = (amount: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount)

function CatalogCard({
  item,
  onView,
  onEdit,
  onPublish,
  onUnpublish,
  onValidate,
}: {
  item: SupplierItem
  onView: () => void
  onEdit: () => void
  onPublish: () => void
  onUnpublish: () => void
  onValidate: () => void
}) {
  const { colors } = useTheme()
  const listing = item.marketplaceListing
  const isPublished = listing?.status === 'PUBLISHED'

  return (
    <TouchableOpacity
      onPress={onView}
      activeOpacity={0.85}
      style={{
        backgroundColor: colors.surface,
        borderRadius: 14,
        padding: 14,
        gap: 10,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 2,
        opacity: item.isActive ? 1 : 0.6,
      }}
    >
      {/* Header row */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
          <Package size={18} color={colors.textSecondary} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }} numberOfLines={1}>{item.name}</Text>
          <Text style={{ fontSize: 11, color: colors.textSecondary }}>{item.sku ?? 'No SKU'}</Text>
        </View>
        <View style={{ gap: 4, alignItems: 'flex-end' }}>
          <ProductStatusBadge item={item} size="sm" />
          {/* Marketplace status badge */}
          <MarketplaceBadge status={listing?.status} size="xs" />
        </View>
      </View>

      <RatingStars rating={item.averageRating} reviewCount={item.reviewCount} size={12} />

      {/* Price / stock / moq row */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <View>
          <Text style={{ fontSize: 11, color: colors.textSecondary }}>Price</Text>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>{formatPHP(item.unitPrice)}/{item.unit}</Text>
        </View>
        <View>
          <Text style={{ fontSize: 11, color: colors.textSecondary }}>Available</Text>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>{item.availableQty} {item.unit}</Text>
        </View>
        <View>
          <Text style={{ fontSize: 11, color: colors.textSecondary }}>MOQ</Text>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>{item.moq} {item.unit}</Text>
        </View>
      </View>

      {/* Primary actions */}
      <View style={{ flexDirection: 'row', gap: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border }}>
        <TouchableOpacity
          onPress={onView}
          style={{ flex: 1, flexDirection: 'row', gap: 4, justifyContent: 'center', alignItems: 'center', paddingVertical: 7, borderRadius: 8, backgroundColor: colors.background }}
        >
          <Eye size={13} color={colors.text} />
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>View</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onEdit}
          style={{ flex: 1, flexDirection: 'row', gap: 4, justifyContent: 'center', alignItems: 'center', paddingVertical: 7, borderRadius: 8, backgroundColor: colors.primary + '15' }}
        >
          <Pencil size={13} color={colors.primary} />
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>Edit</Text>
        </TouchableOpacity>

        {/* Marketplace: validate opens readiness modal */}
        <TouchableOpacity
          onPress={onValidate}
          style={{ flex: 1, flexDirection: 'row', gap: 4, justifyContent: 'center', alignItems: 'center', paddingVertical: 7, borderRadius: 8, backgroundColor: '#EFF6FF' }}
        >
          <Globe size={13} color="#2563EB" />
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#2563EB' }}>
            {isPublished ? 'Listed' : 'Publish'}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  )
}

export function CatalogCards({
  items,
  columns,
  onView,
  onEdit,
  onValidate,
}: {
  items: SupplierItem[]
  columns: number
  onView: (item: SupplierItem) => void
  onEdit: (item: SupplierItem) => void
  // Opens the readiness modal — handles both publish and unpublish from inside.
  onValidate: (item: SupplierItem) => void
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
      {items.map((item) => (
        <View key={item.id} style={{ width: columns > 1 ? `${100 / columns - 1.5}%` : '100%' }}>
          <CatalogCard
            item={item}
            onView={() => onView(item)}
            onEdit={() => onEdit(item)}
            onPublish={() => onValidate(item)}
            onUnpublish={() => onValidate(item)}
            onValidate={() => onValidate(item)}
          />
        </View>
      ))}
    </View>
  )
}
