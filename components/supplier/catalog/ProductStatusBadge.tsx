import React from 'react'
import { View, Text } from 'react-native'
import type { SupplierItem } from '@/services/supplierService/supplierService'

export type ProductStatus = 'ACTIVE' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'INACTIVE'

const STATUS_META: Record<ProductStatus, { label: string; color: string }> = {
  ACTIVE: { label: 'Active', color: '#22C55E' },
  LOW_STOCK: { label: 'Low Stock', color: '#F59E0B' },
  OUT_OF_STOCK: { label: 'Out of Stock', color: '#EF4444' },
  INACTIVE: { label: 'Inactive', color: '#6B7280' },
}

// TODO(backend): "low stock" uses the item's own MOQ as a stand-in threshold
// since SupplierItem has no dedicated reorder-point field (Item.minQuantity
// exists for retail Items, but not for SupplierItem). Consider adding one.
export function getProductStatus(item: Pick<SupplierItem, 'isActive' | 'availableQty' | 'moq'>): ProductStatus {
  if (!item.isActive) return 'INACTIVE'
  if (item.availableQty <= 0) return 'OUT_OF_STOCK'
  if (item.availableQty <= item.moq) return 'LOW_STOCK'
  return 'ACTIVE'
}

export function ProductStatusBadge({ item, size = 'md' }: { item: Pick<SupplierItem, 'isActive' | 'availableQty' | 'moq'>; size?: 'sm' | 'md' }) {
  const status = getProductStatus(item)
  const { label, color } = STATUS_META[status]
  const isSmall = size === 'sm'
  return (
    <View style={{ backgroundColor: color + '18', paddingHorizontal: isSmall ? 8 : 10, paddingVertical: isSmall ? 3 : 4, borderRadius: 20, alignSelf: 'flex-start' }}>
      <Text style={{ fontSize: isSmall ? 10 : 11, fontWeight: '700', color }}>{label}</Text>
    </View>
  )
}