// Table of variants for a single parent supplier item.
// Variants are grouped by their primary option value (e.g. color) into
// expandable parent rows; children are the individual variant combinations.
import React, { useMemo, useState } from 'react'
import { View, Text, TouchableOpacity, Image } from 'react-native'
import { Package, Pencil, Trash2, CheckCircle2, XCircle, ChevronDown, ChevronRight, X } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import type { SupplierItemVariant } from '@/services/supplierService/variantService'
import { FadeDialogModal } from './FadeDialogModal'

const formatPHP = (n: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n)

function VariantStatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6,
      backgroundColor: isActive ? '#ECFDF5' : '#F1F5F9',
    }}>
      {isActive
        ? <CheckCircle2 size={11} color="#059669" />
        : <XCircle size={11} color="#94A3B8" />}
      <Text style={{ fontSize: 10, fontWeight: '700', color: isActive ? '#059669' : '#64748B' }}>
        {isActive ? 'Active' : 'Inactive'}
      </Text>
    </View>
  )
}

function MarketplaceReadyDot({ variant }: { variant: SupplierItemVariant }) {
  // A variant is "marketplace ready" when it has a price > 0 and stock > 0.
  const ready = variant.price > 0 && (variant.availableQty > 0)
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: ready ? '#10B981' : '#94A3B8' }} />
      <Text style={{ fontSize: 10, color: ready ? '#059669' : '#94A3B8', fontWeight: '600' }}>
        {ready ? 'Ready' : 'Incomplete'}
      </Text>
    </View>
  )
}

const COLS = [
  { label: 'Image',     w: 52 },
  { label: 'Variant',   flex: 2.2 },
  { label: 'SKU',       flex: 1.2 },
  { label: 'Price',     flex: 1 },
  { label: 'Cost',      flex: 1 },
  { label: 'Stock',     flex: 1 },
  { label: 'Reserved',  flex: 0.9 },
  { label: 'Incoming',  flex: 0.9 },
  { label: 'Status',    flex: 0.9 },
  { label: 'Mktpl',     flex: 0.8 },
  { label: '',          w: 72 },
]

interface Props {
  variants: SupplierItemVariant[]
  onEdit: (v: SupplierItemVariant) => void
  onDelete: (v: SupplierItemVariant) => void
}

// A parent grouping — keyed by the first option value on the variant
// (e.g. "Green Coffee", "Black"). Falls back to the variant's own name
// when it has no option values at all, so every variant still lands in
// exactly one group.
interface VariantGroupRow {
  key: string
  label: string
  colorHex?: string
  variants: SupplierItemVariant[]
}

function groupVariants(variants: SupplierItemVariant[]): VariantGroupRow[] {
  const map = new Map<string, VariantGroupRow>()
  for (const v of variants) {
    const primary = v.variantValues?.[0]
    const key = primary ? `${primary.optionId}:${primary.option.value}` : `__standalone__:${v.id}`
    const label = primary ? primary.option.value : v.name
    const existing = map.get(key)
    if (existing) {
      existing.variants.push(v)
    } else {
      map.set(key, { key, label, colorHex: primary?.option.colorHex ?? undefined, variants: [v] })
    }
  }
  return Array.from(map.values())
}

export function VariantTable({ variants, onEdit, onDelete }: Props) {
  const { colors } = useTheme()
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  const groups = useMemo(() => groupVariants(variants), [variants])

  if (variants.length === 0) return null

  const toggle = (key: string) => setExpanded((e) => ({ ...e, [key]: !e[key] }))

  const headerText = { fontSize: 10, fontWeight: '700' as const, color: colors.textSecondary, textTransform: 'uppercase' as const, letterSpacing: 0.4 }
  const cell = { fontSize: 12, fontWeight: '600' as const, color: colors.text }
  const cellSub = { fontSize: 11, color: colors.textSecondary }

  return (
    <>
    <View style={{ width: '100%', minWidth: 940, borderWidth: 1, borderColor: colors.border, borderRadius: 12, overflow: 'hidden' }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{ width: 52 }} />
        {COLS.slice(1).map((col) => (
          <View key={col.label} style={col.flex ? { flex: col.flex } : { width: col.w }}>
            <Text style={headerText}>{col.label}</Text>
          </View>
        ))}
      </View>

      {/* Grouped rows */}
      {groups.map((group, gIdx) => {
        const isOpen = !!expanded[group.key]
        const activeCount = group.variants.filter((v) => v.isActive).length
        const totalStock = group.variants.reduce((s, v) => s + v.availableQty, 0)
        const prices = group.variants.filter((v) => v.price > 0).map((v) => v.price)
        const minPrice = prices.length ? Math.min(...prices) : 0
        const maxPrice = prices.length ? Math.max(...prices) : 0
        const readyCount = group.variants.filter((v) => v.price > 0 && v.availableQty > 0).length

        return (
          <View key={group.key}>
            {/* Parent row */}
            <TouchableOpacity
              onPress={() => toggle(group.key)}
              activeOpacity={0.7}
              style={{
                flexDirection: 'row', alignItems: 'center',
                paddingVertical: 11, paddingHorizontal: 12,
                borderTopWidth: gIdx === 0 ? 0 : 1, borderTopColor: colors.border,
                backgroundColor: colors.surface,
              }}
            >
              <View style={{ width: 52, alignItems: 'flex-start', flexDirection: 'row',  gap: 2 }}>
                {isOpen
                  ? <ChevronDown size={15} color={colors.textSecondary} />
                  : <ChevronRight size={15} color={colors.textSecondary} />}
              </View>

              {/* Group label */}
              <View style={{ flex: 2.2, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {group.colorHex && (
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: group.colorHex, borderWidth: 1, borderColor: colors.border }} />
                )}
                <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }} numberOfLines={1}>
                  {group.label}
                </Text>
                <View style={{ paddingHorizontal: 6, paddingVertical: 1, borderRadius: 5, backgroundColor: `${colors.primary}14` }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: colors.primary }}>
                    {group.variants.length} {group.variants.length === 1 ? 'variant' : 'variants'}
                  </Text>
                </View>
              </View>

              <View style={{ flex: 1.2 }}>
                <Text style={cellSub}>—</Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={cell}>
                  {minPrice === maxPrice ? formatPHP(minPrice) : `${formatPHP(minPrice)}–${formatPHP(maxPrice)}`}
                </Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={cellSub}>—</Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={{ ...cell, color: totalStock === 0 ? '#EF4444' : colors.text }}>{totalStock}</Text>
              </View>

              <View style={{ flex: 0.9 }}><Text style={cellSub}>—</Text></View>
              <View style={{ flex: 0.9 }}><Text style={cellSub}>—</Text></View>

              <View style={{ flex: 0.9 }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textSecondary }}>
                  {activeCount}/{group.variants.length} active
                </Text>
              </View>

              <View style={{ flex: 0.8 }}>
                <Text style={{ fontSize: 10, fontWeight: '600', color: readyCount === group.variants.length ? '#059669' : colors.textSecondary }}>
                  {readyCount}/{group.variants.length}
                </Text>
              </View>

              <View style={{ width: 72 }} />
            </TouchableOpacity>

            {/* Child rows */}
            {isOpen && group.variants.map((v) => (
              <View
                key={v.id}
                style={{
                  flexDirection: 'row', alignItems: 'center',
                  paddingVertical: 10, paddingHorizontal: 12, paddingLeft: 12,
                  borderTopWidth: 1, borderTopColor: colors.border,
                  backgroundColor: colors.background,
                  opacity: v.isActive ? 1 : 0.55,
                }}
              >
                {/* Indent guide + image */}
                <View style={{ width: 52, alignItems: 'flex-start', paddingLeft: 14 }}>
                  <View style={{ width: 32, height: 32, borderRadius: 7, backgroundColor: colors.surface, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
                    {v.resolvedImage
                      ? <TouchableOpacity onPress={() => setPreviewImage(v.resolvedImage ?? null)} style={{ width: '100%', height: '100%' }}>
                          <Image source={{ uri: v.resolvedImage }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                        </TouchableOpacity>
                      : <Package size={14} color={colors.textSecondary} />}
                  </View>
                </View>

                {/* Variant name + option pills */}
                <View style={{ flex: 2.2 }}>
                  <Text style={cell} numberOfLines={1}>{v.name}</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 3, marginTop: 2 }}>
                    {v.variantValues.map((vv) => (
                      <View key={vv.optionId} style={{ flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, backgroundColor: `${colors.primary}12` }}>
                        {vv.option.colorHex && (
                          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: vv.option.colorHex }} />
                        )}
                        <Text style={{ fontSize: 9, fontWeight: '700', color: colors.primary }}>{vv.option.value}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                <View style={{ flex: 1.2 }}>
                  <Text style={cellSub} numberOfLines={1}>{v.sku ?? '—'}</Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={cell}>{formatPHP(v.price)}</Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={cellSub}>{formatPHP(v.cost)}</Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={{ ...cell, color: v.availableQty === 0 ? '#EF4444' : colors.text }}>
                    {v.availableQty}
                  </Text>
                </View>

                <View style={{ flex: 0.9 }}>
                  <Text style={cellSub}>{v.reservedQty}</Text>
                </View>

                <View style={{ flex: 0.9 }}>
                  <Text style={cellSub}>{v.incomingQty}</Text>
                </View>

                <View style={{ flex: 0.9 }}>
                  <VariantStatusBadge isActive={v.isActive} />
                </View>

                <View style={{ flex: 0.8 }}>
                  <MarketplaceReadyDot variant={v} />
                </View>

                {/* Actions */}
                <View style={{ width: 72, flexDirection: 'row', gap: 4, justifyContent: 'flex-end' }}>
                  <TouchableOpacity onPress={() => onEdit(v)} style={{ padding: 6 }}>
                    <Pencil size={14} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => onDelete(v)} style={{ padding: 6 }}>
                    <Trash2 size={14} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )
      })}
    </View>
      <FadeDialogModal visible={!!previewImage} onRequestClose={() => setPreviewImage(null)} maxWidth={600}>
        <View style={{ padding: 14, gap: 10, backgroundColor: colors.surface }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text }}>Variant image</Text>
            <TouchableOpacity onPress={() => setPreviewImage(null)} style={{ padding: 4 }}>
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          {previewImage && <Image source={{ uri: previewImage }} style={{ width: '100%', height: 420, borderRadius: 10, backgroundColor: colors.background }} resizeMode="contain" />}
        </View>
      </FadeDialogModal>
    </>
  )
}
