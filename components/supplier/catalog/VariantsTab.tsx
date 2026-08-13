// Variants tab — orchestrates groups editor, generator, table, and create/edit modal.
import React, { useCallback, useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native'
import { Plus, Zap, Layers, RefreshCcw } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { VariantTable } from './VariantTable'
import { VariantGeneratorModal } from './VariantGeneratorModal'
import { CreateVariantModal } from './CreateVariantModal'
import {
  fetchVariants, fetchVariantGroups, deleteVariant,
  type SupplierItemVariant, type VariantGroup,
} from '@/services/supplierService/variantService'
import type { SupplierItem } from '@/services/supplierService/supplierService'

interface Props {
  item: SupplierItem
}

export function VariantsTab({ item }: Props) {
  const { colors } = useTheme()
  const [variants, setVariants] = useState<SupplierItemVariant[]>([])
  const [groups, setGroups] = useState<VariantGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [generatorOpen, setGeneratorOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [editingVariant, setEditingVariant] = useState<SupplierItemVariant | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [v, g] = await Promise.all([
        fetchVariants(item.id),
        fetchVariantGroups(item.id),
      ])
      setVariants(v)
      setGroups(g)
    } catch (e) {
      if (__DEV__) console.error('VariantsTab load error', e)
    } finally {
      setLoading(false)
    }
  }, [item.id])

  useEffect(() => { load() }, [load])

  const handleDelete = (v: SupplierItemVariant) => {
    Alert.alert(
      'Delete variant?',
      `"${v.name}" will be soft-deleted. Existing order history is preserved.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              await deleteVariant(v.id)
              setVariants(prev => prev.filter(x => x.id !== v.id))
            } catch (e: any) {
              Alert.alert('Error', e?.message ?? 'Failed to delete variant.')
            }
          },
        },
      ],
    )
  }

  const handleEdit = (v: SupplierItemVariant) => {
    setEditingVariant(v)
    setCreateOpen(true)
  }

  const handleSaved = (saved: SupplierItemVariant) => {
    setVariants(prev => {
      const idx = prev.findIndex(x => x.id === saved.id)
      return idx >= 0 ? prev.map(x => (x.id === saved.id ? saved : x)) : [saved, ...prev]
    })
    setEditingVariant(null)
  }

  // Summary stats
  const totalStock = variants.filter(v => v.isActive).reduce((s, v) => s + v.availableQty, 0)
  const lowestPrice = variants.filter(v => v.isActive && v.price > 0).reduce((min, v) => Math.min(min, v.price), Infinity)
  const highestPrice = variants.filter(v => v.isActive && v.price > 0).reduce((max, v) => Math.max(max, v.price), 0)
  const activeCount = variants.filter(v => v.isActive).length
  const formatPHP = (n: number) => isFinite(n) ? new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n) : '—'

  return (
    <View style={{ gap: 14 }}>
      {/* KPI row */}
      {variants.length > 0 && (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {[
            { label: 'Variants', value: `${activeCount} active` },
            { label: 'Total Stock', value: String(totalStock) },
            { label: 'Price Range', value: lowestPrice === highestPrice ? formatPHP(lowestPrice) : `${formatPHP(lowestPrice)} – ${formatPHP(highestPrice)}` },
            { label: 'Groups', value: `${groups.length}` },
          ].map(k => (
            <View key={k.label} style={{ flex: 1, borderRadius: 10, padding: 11, backgroundColor: colors.background, gap: 3, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase' }}>{k.label}</Text>
              <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text }}>{k.value}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Action bar */}
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        <TouchableOpacity
          onPress={() => { setEditingVariant(null); setCreateOpen(true) }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, backgroundColor: colors.primary }}>
          <Plus size={14} color="#fff" />
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>Add Variant</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setGeneratorOpen(true)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE' }}>
          <Zap size={14} color="#2563EB" />
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#2563EB' }}>Generator</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={load}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }}>
          <RefreshCcw size={13} color={colors.textSecondary} />
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary }}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={{ alignItems: 'center', paddingVertical: 40 }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : variants.length === 0 ? (
        <View style={{ alignItems: 'center', paddingVertical: 48, gap: 10, backgroundColor: colors.background, borderRadius: 12, borderWidth: 1, borderColor: colors.border }}>
          <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: `${colors.primary}14`, alignItems: 'center', justifyContent: 'center' }}>
            <Layers size={22} color={colors.primary} />
          </View>
          <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text }}>No variants yet</Text>
          <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center', maxWidth: 280 }}>
            Use the Generator to auto-create all combinations, or add variants manually.
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
            <TouchableOpacity onPress={() => setGeneratorOpen(true)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, backgroundColor: colors.primary }}>
              <Zap size={14} color="#fff" />
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>Open Generator</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setEditingVariant(null); setCreateOpen(true) }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: colors.border }}>
              <Plus size={14} color={colors.text} />
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>Add Manually</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ width: '100%' }}
          contentContainerStyle={{ flexGrow: 1 }}
        >
          <VariantTable
            variants={variants}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </ScrollView>
      )}

      {/* Modals */}
      <VariantGeneratorModal
        visible={generatorOpen}
        supplierItemId={item.id}
        existingGroups={groups}
        onClose={() => setGeneratorOpen(false)}
        onGenerated={(newVariants) => {
          setVariants(prev => [...prev, ...newVariants])
          load() // refresh groups too
        }}
      />

      <CreateVariantModal
        visible={createOpen}
        supplierItemId={item.id}
        variantGroups={groups}
        editing={editingVariant}
        onClose={() => { setCreateOpen(false); setEditingVariant(null) }}
        onSaved={handleSaved}
      />
    </View>
  )
}
