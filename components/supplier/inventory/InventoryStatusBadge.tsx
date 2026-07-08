import React from 'react'
import { View, Text } from 'react-native'
import type { SupplierItem } from '@/services/supplierService/supplierService'

export type InventoryStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'

export function getInventoryStatus(item: Pick<SupplierItem, 'availableQty' | 'reorderLevel'>): InventoryStatus {
  if (item.availableQty <= 0) return 'OUT_OF_STOCK'
  if (item.reorderLevel != null && item.availableQty <= item.reorderLevel) return 'LOW_STOCK'
  return 'IN_STOCK'
}

const META: Record<InventoryStatus, { label: string; color: string }> = {
  IN_STOCK: { label: 'In Stock', color: '#22C55E' },
  LOW_STOCK: { label: 'Low Stock', color: '#F59E0B' },
  OUT_OF_STOCK: { label: 'Out of Stock', color: '#EF4444' },
}

export function InventoryStatusBadge({ item, size = 'md' }: { item: Pick<SupplierItem, 'availableQty' | 'reorderLevel'>; size?: 'sm' | 'md' }) {
  const status = getInventoryStatus(item)
  const { label, color } = META[status]
  const isSmall = size === 'sm'
  return (
    <View style={{ backgroundColor: color + '18', paddingHorizontal: isSmall ? 8 : 10, paddingVertical: isSmall ? 3 : 4, borderRadius: 20, alignSelf: 'flex-start' }}>
      <Text style={{ fontSize: isSmall ? 10 : 11, fontWeight: '700', color }}>{label}</Text>
    </View>
  )
}