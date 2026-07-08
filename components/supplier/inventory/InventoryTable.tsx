import React from 'react'
import { View, Text, TouchableOpacity, Image } from 'react-native'
import { Eye, MoreVertical, Package, PlusCircle, ClipboardEdit } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { InventoryStatusBadge } from './InventoryStatusBadge'
import { StockIndicator } from './StockIndicator'
import { InventoryValueBadge } from './InventoryValueBadge'
import type { SupplierItem } from '@/services/supplierService/supplierService'

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })

// Same 7-column-plus-actions layout convention as CatalogTable — flex-based,
// fills the container width, no fixed minWidth/horizontal scroll wrapper.
const COLUMNS = [
  { key: 'product', label: 'Product', flex: 2.2 },
  { key: 'sku', label: 'SKU', flex: 0.9 },
  { key: 'stock', label: 'Stock', flex: 1.6 },
  { key: 'avgCost', label: 'Avg. Cost', flex: 1 },
  { key: 'value', label: 'Inventory Value', flex: 1.2 },
  { key: 'batches', label: 'Batches', flex: 0.7 },
  { key: 'status', label: 'Status', flex: 1 },
  { key: 'updated', label: 'Updated', flex: 0.9 },
]

export interface InventoryRowData extends SupplierItem {
  averageCost: number
  inventoryValue: number
  batchCount: number
}

export function InventoryTable({
  items,
  onView,
  onReceive,
  onAdjust,
}: {
  items: InventoryRowData[]
  onView: (item: InventoryRowData) => void
  onReceive: (item: InventoryRowData) => void
  onAdjust: (item: InventoryRowData) => void
}) {
  const { colors } = useTheme()

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
          <View style={{ flex: 2.2, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {item.image ? <Image source={{ uri: item.image }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : <Package size={16} color={colors.textSecondary} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }} numberOfLines={1}>{item.name}</Text>
              <Text style={{ fontSize: 11, color: colors.textSecondary }}>per {item.unit}</Text>
            </View>
          </View>
          <Text style={{ flex: 0.9, fontSize: 12, color: colors.textSecondary }}>{item.sku ?? '—'}</Text>
          <View style={{ flex: 1.6 }}>
            <StockIndicator available={item.availableQty} reserved={item.reservedQty} incoming={item.incomingQty} unit={item.unit} />
          </View>
          <Text style={{ flex: 1, fontSize: 13, color: colors.text }}>{item.averageCost > 0 ? `₱${item.averageCost.toFixed(2)}` : '—'}</Text>
          <View style={{ flex: 1.2 }}><InventoryValueBadge value={item.inventoryValue} size="sm" /></View>
          <Text style={{ flex: 0.7, fontSize: 13, color: colors.text }}>{item.batchCount}</Text>
          <View style={{ flex: 1 }}><InventoryStatusBadge item={item} size="sm" /></View>
          <Text style={{ flex: 0.9, fontSize: 11, color: colors.textSecondary }}>{formatDate(item.updatedAt)}</Text>
          <View style={{ width: 110, flexDirection: 'row', gap: 4, justifyContent: 'flex-end' }}>
            <TouchableOpacity onPress={() => onView(item)} style={{ padding: 6 }}><Eye size={15} color={colors.textSecondary} /></TouchableOpacity>
            <TouchableOpacity onPress={() => onReceive(item)} style={{ padding: 6 }}><PlusCircle size={15} color={colors.textSecondary} /></TouchableOpacity>
            <TouchableOpacity onPress={() => onAdjust(item)} style={{ padding: 6 }}><ClipboardEdit size={15} color={colors.textSecondary} /></TouchableOpacity>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  )
}