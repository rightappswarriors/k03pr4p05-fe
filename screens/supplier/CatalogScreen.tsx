import React, { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, TextInput, RefreshControl } from 'react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import {
  fetchOrCreateCatalog,
  type SupplierItem,
  type SupplierCatalog,
} from '@/services/supplierService'

const formatPHP = (amount: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount)

function ItemCard({ item, onEdit }: { item: SupplierItem; onEdit: () => void }) {
  const { colors } = useTheme()
  return (
    <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 14, gap: 8, opacity: item.isActive ? 1 : 0.55 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{item.name}</Text>
          {item.sku && <Text style={{ fontSize: 12, color: colors.textSecondary }}>SKU: {item.sku}</Text>}
          {item.description && (
            <Text style={{ fontSize: 12, color: colors.textSecondary }} numberOfLines={2}>{item.description}</Text>
          )}
        </View>
        <View style={{ gap: 6, alignItems: 'flex-end' }}>
          <View style={{ backgroundColor: item.isActive ? '#22C55E20' : '#6B728020', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: item.isActive ? '#22C55E' : '#6B7280' }}>
              {item.isActive ? 'Active' : 'Inactive'}
            </Text>
          </View>
          <TouchableOpacity onPress={onEdit} style={{ backgroundColor: colors.primary + '20', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>Edit</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap' }}>
        <View>
          <Text style={{ fontSize: 11, color: colors.textSecondary }}>Unit Price</Text>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>{formatPHP(item.unitPrice)}/{item.unit}</Text>
        </View>
        <View>
          <Text style={{ fontSize: 11, color: colors.textSecondary }}>Min Order</Text>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>{item.moq} {item.unit}</Text>
        </View>
        <View>
          <Text style={{ fontSize: 11, color: colors.textSecondary }}>Available</Text>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>{item.availableQty} {item.unit}</Text>
        </View>
        <View>
          <Text style={{ fontSize: 11, color: colors.textSecondary }}>VAT</Text>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>{item.isVatExempt ? 'Exempt' : '12%'}</Text>
        </View>
      </View>

      {item.priceTiers.length > 0 && (
        <View style={{ backgroundColor: colors.background, borderRadius: 8, padding: 10, gap: 4 }}>
          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textSecondary }}>PRICE TIERS</Text>
          {item.priceTiers.map((tier, i) => (
            <Text key={i} style={{ fontSize: 12, color: colors.text }}>
              {tier.minQty}+ {item.unit}: {formatPHP(tier.price)}
            </Text>
          ))}
        </View>
      )}
    </View>
  )
}

interface CatalogScreenProps {
  onAddItem?: (catalogId: string) => void
  onEditItem?: (itemId: string) => void
}

export default function CatalogScreen({ onAddItem, onEditItem }: CatalogScreenProps) {
  const { colors } = useTheme()
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [catalog, setCatalog] = useState<SupplierCatalog | null>(null)

  const load = async () => {
    if (!user?.orgId) return
    try {
      const data = await fetchOrCreateCatalog(user.orgId)
      setCatalog(data)
    } catch (e) {
      console.error('supplierCatalog error', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [user?.orgId])

  const items = catalog?.items ?? []
  const filtered = items.filter(
    i => i.name.toLowerCase().includes(search.toLowerCase()) || (i.sku ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const onRefresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ padding: 16, gap: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>My Catalog</Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary }}>
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => catalog && onAddItem?.(catalog.id)}
            style={{ backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>+ Add Item</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search items or SKU…"
          placeholderTextColor={colors.textSecondary}
          style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, backgroundColor: colors.surface, color: colors.text, fontSize: 14 }}
        />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {loading ? (
          [0, 1, 2].map(i => <View key={i} style={{ height: 120, backgroundColor: colors.surface, borderRadius: 12, opacity: 0.4 }} />)
        ) : filtered.length === 0 ? (
          <View style={{ alignItems: 'center', padding: 48, gap: 10 }}>
            <Text style={{ fontSize: 40 }}>📦</Text>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>
              {search ? 'No matching items' : 'No catalog items yet'}
            </Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center' }}>
              {search ? 'Try a different search term.' : 'Add your first product to start receiving purchase orders from buyers.'}
            </Text>
            {!search && catalog && (
              <TouchableOpacity
                onPress={() => onAddItem?.(catalog.id)}
                style={{ backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, marginTop: 8 }}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>Add First Item</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filtered.map(item => (
            <ItemCard key={item.id} item={item} onEdit={() => onEditItem?.(item.id)} />
          ))
        )}
      </ScrollView>
    </View>
  )
}
