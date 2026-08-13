import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native'
import DateTimePicker from '@/components/DateTimePicker'
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  History,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react-native'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { fetchOrCreateCatalog } from '@/services/supplierService/supplierService'
import {
  cancelScheduledPrice,
  createScheduledPrice,
  deleteScheduledPrice,
  editScheduledPrice,
  getPriceHistory,
  getPricingCategories,
  getPricingDetail,
  getPricingList,
  getScheduledPrices,
  type CreateScheduledPriceInput,
  type EditScheduledPriceInput,
  type PriceHistory,
  type PricingCategory,
  type PricingDetail,
  type PricingListFilterInput,
  type PricingListItem,
  type ScheduledPrice,
  type UpdatePriceInput,
  updatePrice,
} from '@/services/supplierService/pricingService'
import PricingKpiRow from '@/components/supplier/pricing/PricingKpiRow'
import {
  PRICING_COLUMN_KEYS,
  PricingToolbar,
  type PricingColumnKey,
  type PricingLayout,
  type PricingSort,
} from '@/components/supplier/pricing/PricingToolBar'
import { CatalogPagination } from '@/components/supplier/catalog/CatalogPagination'
import { OrderCardSkeletonList } from '@/components/LoadingSkeleton'

const BREAKPOINTS = { tablet: 768, desktop: 1100 }
const PAGE_SIZE = 18
const PRODUCT_PLACEHOLDER = require('@/assets/images/placeholder.png')

function formatPHP(value: number): string {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value)
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function formatDateInput(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
}

function parseDateInput(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function sortItems(items: PricingListItem[], sort: PricingSort): PricingListItem[] {
  const sorted = [...items]
  switch (sort) {
    case 'OLDEST':
      return sorted.sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime())
    case 'NAME_ASC':
      return sorted.sort((a, b) => a.name.localeCompare(b.name))
    case 'PRICE_HIGH':
      return sorted.sort((a, b) => b.sellingPrice - a.sellingPrice)
    case 'PRICE_LOW':
      return sorted.sort((a, b) => a.sellingPrice - b.sellingPrice)
    case 'MARGIN_HIGH':
      return sorted.sort((a, b) => b.margin - a.margin)
    case 'MARGIN_LOW':
      return sorted.sort((a, b) => a.margin - b.margin)
    case 'NEWEST':
    default:
      return sorted.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  }
}

interface PricingCardProps {
  item: PricingListItem
  columns: number
  onDetail: (item: PricingListItem, section?: 'overview' | 'history') => void
  onEdit: (item: PricingListItem) => void
  onSchedule: (item: PricingListItem) => void
}

function PricingCard({ item, columns, onDetail, onEdit, onSchedule }: PricingCardProps) {
  const { colors } = useTheme()
  const cardWidth: `${number}%` = columns === 1 ? '100%' : `${100 / columns - 1.2}%`
  const statusColor = item.isActive ? colors.success : colors.textSecondary

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={() => onDetail(item, 'overview')}
      style={{
        width: cardWidth,
        minWidth: 260,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        padding: 14,
        gap: 12,
      }}
    >
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Image
          source={item.image ? { uri: item.image } : PRODUCT_PLACEHOLDER}
          style={{ width: 72, height: 72, borderRadius: 10, backgroundColor: colors.background }}
          resizeMode="cover"
        />
        <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
          <Text numberOfLines={2} style={{ color: colors.text, fontSize: 16, fontWeight: '800' }}>
            {item.name}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{item.sku ?? 'No SKU'}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{item.categoryName ?? 'Uncategorized'}</Text>
          <View
            style={{
              alignSelf: 'flex-start',
              borderRadius: 999,
              paddingHorizontal: 8,
              paddingVertical: 4,
              backgroundColor: item.isActive ? '#DCFCE7' : colors.background,
            }}
          >
            <Text style={{ color: statusColor, fontSize: 11, fontWeight: '800' }}>
              {item.isActive ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <Metric label="Current Cost" value={formatPHP(item.currentCost)} />
        <Metric label="Selling Price" value={formatPHP(item.sellingPrice)} />
        <Metric label="Margin" value={formatPercent(item.margin)} />
        <Metric label="Markup" value={formatPercent(item.markup)} />
      </View>

      <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Updated {formatDate(item.updatedAt)}</Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <CardAction icon={<Pencil size={13} color={colors.primary} />} label="Edit Price" onPress={() => onEdit(item)} />
        <CardAction icon={<Search size={13} color={colors.primary} />} label="View Details" onPress={() => onDetail(item, 'overview')} />
        <CardAction icon={<CalendarClock size={13} color={colors.primary} />} label="Schedule Price" onPress={() => onSchedule(item)} />
        <CardAction icon={<History size={13} color={colors.primary} />} label="View History" onPress={() => onDetail(item, 'history')} />
      </View>
    </TouchableOpacity>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme()
  return (
    <View style={{ flex: 1, minWidth: 105, gap: 2 }}>
      <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '700' }}>{label}</Text>
      <Text style={{ color: colors.text, fontSize: 14, fontWeight: '800' }}>{value}</Text>
    </View>
  )
}

function CardAction({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress: () => void }) {
  const { colors } = useTheme()
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        paddingHorizontal: 9,
        paddingVertical: 7,
      }}
    >
      {icon}
      <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '800' }}>{label}</Text>
    </TouchableOpacity>
  )
}

interface TierEditorRowProps {
  tier: { id?: string; minQty: string; price: string }
  onChange: (field: 'minQty' | 'price', value: string) => void
  onRemove: () => void
}

function TierEditorRow({ tier, onChange, onRemove }: TierEditorRowProps) {
  const { colors } = useTheme()
  return (
    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 4 }}>Min Qty</Text>
        <TextInput
          value={tier.minQty}
          onChangeText={(value) => onChange('minQty', value)}
          placeholder="10"
          keyboardType="number-pad"
          style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, color: colors.text }}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 4 }}>Price</Text>
        <TextInput
          value={tier.price}
          onChangeText={(value) => onChange('price', value)}
          placeholder="0.00"
          keyboardType="decimal-pad"
          style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, color: colors.text }}
        />
      </View>
      <TouchableOpacity onPress={onRemove} style={{ backgroundColor: '#FEE2E2', padding: 10, borderRadius: 8 }}>
        <Trash2 size={16} color="#EF4444" />
      </TouchableOpacity>
    </View>
  )
}

interface PriceEditorModalProps {
  visible: boolean
  mode: 'new' | 'edit'
  item: PricingListItem | null
  loading: boolean
  catalogItems: PricingListItem[]
  onClose: () => void
  onSubmit: (input: UpdatePriceInput) => Promise<void>
}

function PriceEditorModal({ visible, mode, item, loading, catalogItems, onClose, onSubmit }: PriceEditorModalProps) {
  const { colors } = useTheme()
  const [selectedItemId, setSelectedItemId] = useState(item?.id ?? '')
  const [price, setPrice] = useState('')
  const [vatRate, setVatRate] = useState('12')
  const [moq, setMoq] = useState('1')
  const [reason, setReason] = useState('')
  const [effectiveAt, setEffectiveAt] = useState(formatDateInput(new Date(Date.now() + 24 * 60 * 60 * 1000)))
  const [tiers, setTiers] = useState<Array<{ id?: string; minQty: string; price: string }>>([])
  const [error, setError] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)

  useEffect(() => {
    if (!visible) return
    if (mode === 'edit' && item) {
      setSelectedItemId(item.id)
      setPrice(String(item.sellingPrice))
      setVatRate('12')
      setMoq('1')
      setReason('')
      setEffectiveAt(formatDateInput(new Date()))
      setTiers([])
    } else {
      setSelectedItemId(item?.id ?? '')
      setPrice('')
      setVatRate('12')
      setMoq('1')
      setReason('')
      setEffectiveAt(formatDateInput(new Date(Date.now() + 24 * 60 * 60 * 1000)))
      setTiers([])
    }
    setError('')
  }, [visible, mode, item])

  const updateTier = (index: number, field: 'minQty' | 'price', value: string) => {
    const next = [...tiers]
    next[index] = { ...next[index], [field]: value }
    setTiers(next)
  }

  const addTier = () => setTiers((current) => [...current, { minQty: '', price: '' }])
  const removeTier = (index: number) => setTiers((current) => current.filter((_, i) => i !== index))

  const validateAndSubmit = async () => {
    setError('')
    const parsedPrice = Number(price)
    const parsedMoq = Number(moq)
    const parsedVat = Number(vatRate)
    const parsedTiers = tiers
      .filter((tier) => tier.minQty.trim() && tier.price.trim())
      .map((tier) => ({ minQty: Number(tier.minQty), price: Number(tier.price) }))

    if (mode === 'new' && !selectedItemId) {
      setError('Choose a product before saving.')
      return
    }
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setError('Selling price must be greater than zero.')
      return
    }
    if (!Number.isFinite(parsedMoq) || parsedMoq <= 0) {
      setError('MOQ must be greater than zero.')
      return
    }
    if (!Number.isFinite(parsedVat) || parsedVat < 0) {
      setError('VAT must be zero or higher.')
      return
    }

    const sortedTiers = [...parsedTiers].sort((a, b) => a.minQty - b.minQty)
    const seen = new Set<number>()
    for (const tier of sortedTiers) {
      if (seen.has(tier.minQty) || tier.minQty <= 0 || tier.price <= 0) {
        setError('Tier minimum quantities must be unique and greater than zero.')
        return
      }
      seen.add(tier.minQty)
    }

    const payload: UpdatePriceInput = {
      supplierItemId: selectedItemId,
      price: parsedPrice,
      vatRate: parsedVat / 100,
      moq: parsedMoq,
      reason: reason.trim() || undefined,
      priceTiers: sortedTiers.length ? sortedTiers : undefined,
      effectiveAt: effectiveAt || undefined,
    }

    await onSubmit(payload)
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)', justifyContent: 'center', padding: 16 }}>
        <View style={{ maxHeight: '95%', width: '100%', maxWidth: 860, alignSelf: 'center', backgroundColor: colors.surface, borderRadius: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: '900' }}>{mode === 'new' ? 'New Price' : 'Edit Price'}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>{mode === 'new' ? 'Create or update a selling price' : 'Adjust selling price, VAT, MOQ, and tiers'}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={{ padding: 6 }}>
              <X size={18} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
            {!!error && (
              <View style={{ backgroundColor: '#FEF2F2', borderRadius: 8, padding: 10, borderLeftWidth: 3, borderLeftColor: '#EF4444' }}>
                <Text style={{ color: '#B91C1C', fontSize: 13 }}>{error}</Text>
              </View>
            )}

            {mode === 'new' ? (
              <View style={{ gap: 8 }}>
                <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>Product</Text>
                <TouchableOpacity onPress={() => setPickerOpen((value) => !value)} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10 }}>
                  <Text style={{ color: colors.text }}>{catalogItems.find((entry) => entry.id === selectedItemId)?.name ?? 'Select a product'}</Text>
                </TouchableOpacity>
                {pickerOpen && (
                  <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, maxHeight: 180 }}>
                    <ScrollView>
                      {catalogItems.map((entry) => (
                        <TouchableOpacity key={entry.id} onPress={() => { setSelectedItemId(entry.id); setPickerOpen(false) }} style={{ paddingHorizontal: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                          <Text style={{ color: colors.text }}>{entry.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            ) : (
              <View style={{ gap: 6 }}>
                <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>Product</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{item?.name ?? 'Selected item'}</Text>
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
              <View style={{ flex: 1, minWidth: 140 }}>
                <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>Selling Price</Text>
                <TextInput value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="0.00" style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, color: colors.text, marginTop: 4 }} />
              </View>
              <View style={{ flex: 1, minWidth: 140 }}>
                <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>VAT %</Text>
                <TextInput value={vatRate} onChangeText={setVatRate} keyboardType="decimal-pad" placeholder="12" style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, color: colors.text, marginTop: 4 }} />
              </View>
              <View style={{ flex: 1, minWidth: 120 }}>
                <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>MOQ</Text>
                <TextInput value={moq} onChangeText={setMoq} keyboardType="number-pad" placeholder="1" style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, color: colors.text, marginTop: 4 }} />
              </View>
            </View>

            <View>
              <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>Effective Date</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(true)} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, marginTop: 4 }}>
                <Text style={{ color: colors.text }}>{effectiveAt}</Text>
              </TouchableOpacity>
              {showDatePicker && Platform.OS !== 'web' && (
                <DateTimePicker value={parseDateInput(effectiveAt)} mode="date" onChange={(_, date) => { setShowDatePicker(false); if (date) setEffectiveAt(formatDateInput(date)) }} />
              )}
              {showDatePicker && Platform.OS === 'web' && (
                <input type="date" value={effectiveAt} onChange={(event) => setEffectiveAt(event.target.value)} style={{ marginTop: 8, width: '100%', padding: 10, borderRadius: 8, border: `1px solid ${colors.border}` }} />
              )}
            </View>

            <View>
              <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>Notes</Text>
              <TextInput value={reason} onChangeText={setReason} placeholder="Reason for this change" multiline style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, color: colors.text, minHeight: 70, marginTop: 4 }} />
            </View>

            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>Price Tiers</Text>
                <TouchableOpacity onPress={addTier} style={{ backgroundColor: colors.primary + '20', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
                  <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>+ Add Tier</Text>
                </TouchableOpacity>
              </View>
              {tiers.map((tier, index) => (
                <TierEditorRow key={`${tier.minQty}-${index}`} tier={tier} onChange={(field, value) => updateTier(index, field, value)} onRemove={() => removeTier(index)} />
              ))}
            </View>
          </ScrollView>

          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: colors.border }}>
            <TouchableOpacity onPress={onClose} style={{ borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8 }}>
              <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity disabled={loading} onPress={validateAndSubmit} style={{ backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, minWidth: 90, alignItems: 'center' }}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>{mode === 'new' ? 'Save' : 'Update'}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

interface ScheduleEditorModalProps {
  visible: boolean
  mode: 'create' | 'edit'
  item: PricingListItem | null
  schedule: ScheduledPrice | null
  loading: boolean
  onClose: () => void
  onSubmit: (input: CreateScheduledPriceInput | EditScheduledPriceInput, tiers: Array<{ minQty: number; price: number }>) => Promise<void>
}

function ScheduleEditorModal({ visible, mode, item, schedule, loading, onClose, onSubmit }: ScheduleEditorModalProps) {
  const { colors } = useTheme()
  const [price, setPrice] = useState('')
  const [effectiveAt, setEffectiveAt] = useState(formatDateInput(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)))
  const [expiresAt, setExpiresAt] = useState('')
  const [reason, setReason] = useState('')
  const [tiers, setTiers] = useState<Array<{ id?: string; minQty: string; price: string }>>([])
  const [error, setError] = useState('')
  const [showEffectivePicker, setShowEffectivePicker] = useState(false)
  const [showExpiryPicker, setShowExpiryPicker] = useState(false)

  useEffect(() => {
    if (!visible) return
    setError('')
    if (mode === 'edit' && schedule) {
      setPrice(String(schedule.price))
      setEffectiveAt(formatDateInput(new Date(schedule.effectiveAt)))
      setExpiresAt(schedule.expiresAt ? formatDateInput(new Date(schedule.expiresAt)) : '')
      setReason('')
      setTiers([])
    } else {
      setPrice('')
      setEffectiveAt(formatDateInput(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)))
      setExpiresAt('')
      setReason('')
      setTiers([])
    }
  }, [visible, mode, schedule])

  const updateTier = (index: number, field: 'minQty' | 'price', value: string) => {
    const next = [...tiers]
    next[index] = { ...next[index], [field]: value }
    setTiers(next)
  }
  const addTier = () => setTiers((current) => [...current, { minQty: '', price: '' }])
  const removeTier = (index: number) => setTiers((current) => current.filter((_, i) => i !== index))

  const submit = async () => {
    setError('')
    const parsedPrice = Number(price)
    const effectiveDate = new Date(effectiveAt)
    const expiryDate = expiresAt ? new Date(expiresAt) : null
    const parsedTiers = tiers
      .filter((tier) => tier.minQty.trim() && tier.price.trim())
      .map((tier) => ({ minQty: Number(tier.minQty), price: Number(tier.price) }))

    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setError('A valid future price is required.')
      return
    }
    if (effectiveDate <= new Date()) {
      setError('Effective date must be in the future.')
      return
    }
    if (expiryDate && expiryDate <= effectiveDate) {
      setError('Expiration must be after the effective date.')
      return
    }

    const sortedTiers = [...parsedTiers].sort((a, b) => a.minQty - b.minQty)
    const seen = new Set<number>()
    for (const tier of sortedTiers) {
      if (seen.has(tier.minQty) || tier.minQty <= 0 || tier.price <= 0) {
        setError('Tier minimum quantities must be unique and greater than zero.')
        return
      }
      seen.add(tier.minQty)
    }

    if (mode === 'create') {
      await onSubmit({ supplierItemId: item?.id ?? '', price: parsedPrice, effectiveAt: effectiveDate.toISOString(), expiresAt: expiryDate?.toISOString() ?? null, reason: reason.trim() || undefined }, sortedTiers)
    } else if (schedule) {
      await onSubmit({ id: schedule.id, price: parsedPrice, effectiveAt: effectiveDate.toISOString(), expiresAt: expiryDate?.toISOString() ?? null, reason: reason.trim() || undefined }, sortedTiers)
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)', justifyContent: 'center', padding: 16 }}>
        <View style={{ maxHeight: '95%', width: '100%', maxWidth: 860, alignSelf: 'center', backgroundColor: colors.surface, borderRadius: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: '900' }}>{mode === 'create' ? 'Schedule Price' : 'Edit Schedule'}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>{item?.name ?? 'Upcoming price change'}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={{ padding: 6 }}>
              <X size={18} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
            {!!error && (
              <View style={{ backgroundColor: '#FEF2F2', borderRadius: 8, padding: 10, borderLeftWidth: 3, borderLeftColor: '#EF4444' }}>
                <Text style={{ color: '#B91C1C', fontSize: 13 }}>{error}</Text>
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
              <View style={{ flex: 1, minWidth: 200 }}>
                <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>Future Price</Text>
                <TextInput value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="0.00" style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, color: colors.text, marginTop: 4 }} />
              </View>
              <View style={{ flex: 1, minWidth: 200 }}>
                <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>Effective Date</Text>
                <TouchableOpacity onPress={() => setShowEffectivePicker(true)} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, marginTop: 4 }}>
                  <Text style={{ color: colors.text }}>{effectiveAt}</Text>
                </TouchableOpacity>
                {showEffectivePicker && Platform.OS !== 'web' && (
                  <DateTimePicker value={parseDateInput(effectiveAt)} mode="date" onChange={(_, date) => { setShowEffectivePicker(false); if (date) setEffectiveAt(formatDateInput(date)) }} />
                )}
                {showEffectivePicker && Platform.OS === 'web' && <input type="date" value={effectiveAt} onChange={(event) => setEffectiveAt(event.target.value)} style={{ marginTop: 8, width: '100%', padding: 10, borderRadius: 8, border: `1px solid ${colors.border}` }} />}
              </View>
            </View>

            <View>
              <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>Expiration Date</Text>
              <TouchableOpacity onPress={() => setShowExpiryPicker(true)} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, marginTop: 4 }}>
                <Text style={{ color: colors.text }}>{expiresAt || 'Optional'}</Text>
              </TouchableOpacity>
              {showExpiryPicker && Platform.OS !== 'web' && (
                <DateTimePicker value={expiresAt ? parseDateInput(expiresAt) : new Date()} mode="date" onChange={(_, date) => { setShowExpiryPicker(false); if (date) setExpiresAt(formatDateInput(date)) }} />
              )}
              {showExpiryPicker && Platform.OS === 'web' && <input type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} style={{ marginTop: 8, width: '100%', padding: 10, borderRadius: 8, border: `1px solid ${colors.border}` }} />}
            </View>

            <View>
              <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>Notes</Text>
              <TextInput value={reason} onChangeText={setReason} placeholder="Reason for this schedule" multiline style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, color: colors.text, minHeight: 70, marginTop: 4 }} />
            </View>

            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>Price Tiers</Text>
                <TouchableOpacity onPress={addTier} style={{ backgroundColor: colors.primary + '20', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
                  <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>+ Add Tier</Text>
                </TouchableOpacity>
              </View>
              {tiers.map((tier, index) => (
                <TierEditorRow key={`${tier.minQty}-${index}`} tier={tier} onChange={(field, value) => updateTier(index, field, value)} onRemove={() => removeTier(index)} />
              ))}
            </View>
          </ScrollView>

          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: colors.border }}>
            <TouchableOpacity onPress={onClose} style={{ borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8 }}>
              <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity disabled={loading} onPress={submit} style={{ backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, minWidth: 90, alignItems: 'center' }}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>{mode === 'create' ? 'Save' : 'Update'}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

interface DetailModalProps {
  item: PricingListItem | null
  visible: boolean
  onClose: () => void
  onEditPrice: (item: PricingListItem) => void
  onSchedulePrice: (item: PricingListItem) => void
  onEditScheduledPrice: (item: PricingListItem, schedule: ScheduledPrice) => void
  onCancelScheduled: (id: string) => Promise<void>
  onDeleteScheduled: (id: string) => Promise<void>
  section: 'overview' | 'history'
  refreshKey: number
}

function PricingDetailModal({ item, visible, onClose, onEditPrice, onSchedulePrice, onEditScheduledPrice, onCancelScheduled, onDeleteScheduled, section, refreshKey }: DetailModalProps) {
  const { colors } = useTheme()
  const [detail, setDetail] = useState<PricingDetail | null>(null)
  const [history, setHistory] = useState<PriceHistory[]>([])
  const [scheduled, setScheduled] = useState<ScheduledPrice[]>([])
  const [loading, setLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    if (!visible || !item) return

    setLoading(true)
    Promise.all([getPricingDetail(item.id), getPriceHistory(item.id), getScheduledPrices(item.id)])
      .then(([detailData, historyData, scheduledData]) => {
        if (!mounted) return
        setDetail(detailData)
        setHistory(historyData)
        setScheduled(scheduledData)
      })
      .catch((error) => {
        if (__DEV__) console.error('pricingDetail error', error)
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [item, visible, refreshKey])

  const supplierItem = detail?.supplierItem
  const pendingSchedules = scheduled.filter((entry) => entry.status === 'PENDING')
  const activeSchedules = scheduled.filter((entry) => entry.status === 'ACTIVE')

  const handleAction = async (action: (id: string) => Promise<void>, id: string) => {
    setStatusMessage('Working...')
    try {
      await action(id)
      setStatusMessage('Updated successfully.')
      const [detailData, historyData, scheduledData] = await Promise.all([getPricingDetail(item?.id ?? ''), getPriceHistory(item?.id ?? ''), getScheduledPrices(item?.id ?? '')])
      setDetail(detailData)
      setHistory(historyData)
      setScheduled(scheduledData)
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Unable to complete the action.')
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)', justifyContent: 'center', padding: 16 }}>
        <View style={{ maxHeight: '92%', maxWidth: 980, width: '100%', alignSelf: 'center', backgroundColor: colors.surface, borderRadius: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <View style={{ gap: 3, flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: 19, fontWeight: '900' }}>{item?.name ?? 'Pricing Detail'}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{item?.sku ?? 'Supplier item pricing'}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={{ padding: 8 }}>
              <X size={18} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 18, gap: 18 }}>
            {!!statusMessage && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.background, borderRadius: 8, padding: 10 }}>
                <CheckCircle2 size={14} color={colors.primary} />
                <Text style={{ color: colors.text, fontSize: 12 }}>{statusMessage}</Text>
              </View>
            )}
            {loading ? (
              <Text style={{ color: colors.textSecondary }}>Loading pricing details...</Text>
            ) : (
              <>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  <Metric label="Current Price" value={formatPHP(supplierItem?.unitPrice ?? item?.sellingPrice ?? 0)} />
                  <Metric label="VAT" value={`${((supplierItem?.vatRate ?? 0) * 100).toFixed(1)}%`} />
                  <Metric label="MOQ" value={(supplierItem?.moq ?? 0).toString()} />
                  <Metric label="Margin" value={formatPercent(detail?.margin ?? item?.margin ?? 0)} />
                  <Metric label="Markup" value={formatPercent(detail?.markup ?? item?.markup ?? 0)} />
                  <Metric label="Profit / Unit" value={formatPHP(detail?.profitPerUnit ?? 0)} />
                </View>

                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity onPress={() => onEditPrice(item!)} style={{ backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }}>
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Edit Price</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => onSchedulePrice(item!)} style={{ borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }}>
                    <Text style={{ color: colors.text, fontSize: 12, fontWeight: '700' }}>Schedule Price</Text>
                  </TouchableOpacity>
                </View>

                <Section title="Product Summary">
                  <Row label="Product" value={supplierItem?.name ?? item?.name ?? '—'} />
                  <Row label="Cost" value={formatPHP(supplierItem?.currentCost ?? item?.currentCost ?? 0)} />
                  <Row label="Selling Price" value={formatPHP(supplierItem?.unitPrice ?? item?.sellingPrice ?? 0)} />
                  <Row label="Status" value={supplierItem?.isActive ? 'Active' : 'Inactive'} />
                  <Row label="VAT" value={`${((supplierItem?.vatRate ?? 0) * 100).toFixed(1)}%`} />
                  <Row label="MOQ" value={(supplierItem?.moq ?? 0).toString()} />
                </Section>

                <Section title="Price Tiers">
                  {(supplierItem?.priceTiers ?? []).length === 0 ? (
                    <EmptyText text="No tiered pricing configured." />
                  ) : (
                    supplierItem?.priceTiers.map((tier) => <Row key={tier.id} label={`${tier.minQty}+ units`} value={formatPHP(tier.price)} />)
                  )}
                </Section>

                <Section title="Scheduled Prices">
                  {pendingSchedules.length === 0 && activeSchedules.length === 0 ? (
                    <EmptyText text="No scheduled price changes." />
                  ) : (
                    <>
                      {pendingSchedules.map((price) => (
                        <View key={price.id} style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 6 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                            <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>{formatDate(price.effectiveAt)} · {price.status}</Text>
                            <Text style={{ color: colors.text, fontSize: 13, fontWeight: '800' }}>{formatPHP(price.price)}</Text>
                          </View>
                          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{price.expiresAt ? `Expires ${formatDate(price.expiresAt)}` : 'No expiration'}</Text>
                          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                            <TouchableOpacity onPress={() => item && onEditScheduledPrice(item, price)} style={{ borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
                              <Text style={{ color: colors.text, fontSize: 12, fontWeight: '700' }}>Edit</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleAction(onCancelScheduled, price.id)} style={{ borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
                              <Text style={{ color: colors.text, fontSize: 12, fontWeight: '700' }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleAction(onDeleteScheduled, price.id)} style={{ borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
                              <Text style={{ color: colors.text, fontSize: 12, fontWeight: '700' }}>Delete</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                      {activeSchedules.map((price) => (
                        <View key={price.id} style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 6 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                            <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>{formatDate(price.effectiveAt)} · {price.status}</Text>
                            <Text style={{ color: colors.text, fontSize: 13, fontWeight: '800' }}>{formatPHP(price.price)}</Text>
                          </View>
                          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{price.expiresAt ? `Expires ${formatDate(price.expiresAt)}` : 'No expiration'}</Text>
                        </View>
                      ))}
                    </>
                  )}
                </Section>

                <Section title="Price History">
                  {history.length === 0 ? (
                    <EmptyText text="No price history yet." />
                  ) : (
                    history.map((entry) => (
                      <Row key={entry.id} label={`${formatDate(entry.effectiveAt)} · ${entry.reason ?? 'Price update'}`} value={`${formatPHP(entry.oldPrice)} → ${formatPHP(entry.newPrice)}`} />
                    ))
                  )}
                </Section>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors } = useTheme()
  return (
    <View style={{ gap: 10 }}>
      <Text style={{ color: colors.text, fontSize: 15, fontWeight: '900' }}>{title}</Text>
      <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, overflow: 'hidden' }}>{children}</View>
    </View>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme()
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <Text style={{ color: colors.textSecondary, fontSize: 13, flex: 1 }}>{label}</Text>
      <Text style={{ color: colors.text, fontSize: 13, fontWeight: '800', textAlign: 'right', flex: 1 }}>{value}</Text>
    </View>
  )
}

function EmptyText({ text }: { text: string }) {
  const { colors } = useTheme()
  return <Text style={{ color: colors.textSecondary, fontSize: 13, padding: 12 }}>{text}</Text>
}

export default function PricingScreen() {
  const { colors } = useTheme()
  const { user } = useAuth()
  const { width } = useWindowDimensions()
  const isTablet = width >= BREAKPOINTS.tablet
  const isDesktop = width >= BREAKPOINTS.desktop
  const horizontalPadding = isDesktop ? 32 : isTablet ? 24 : 16
  const contentMaxWidth = isDesktop ? 1680 : undefined
  const cardColumns = isDesktop ? 3 : isTablet ? 2 : 1

  const [catalogId, setCatalogId] = useState('')
  const [items, setItems] = useState<PricingListItem[]>([])
  const [categories, setCategories] = useState<PricingCategory[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState<PricingListFilterInput>({})
  const [sort, setSort] = useState<PricingSort>('NEWEST')
  const [layout, setLayout] = useState<PricingLayout>('table')
  const [visibleColumns, setVisibleColumns] = useState<PricingColumnKey[]>([...PRICING_COLUMN_KEYS])
  const [selectedItem, setSelectedItem] = useState<PricingListItem | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailSection, setDetailSection] = useState<'overview' | 'history'>('overview')
  const [priceModalOpen, setPriceModalOpen] = useState(false)
  const [priceModalMode, setPriceModalMode] = useState<'new' | 'edit'>('new')
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)
  const [scheduleModalMode, setScheduleModalMode] = useState<'create' | 'edit'>('create')
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduledPrice | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [detailRefreshKey, setDetailRefreshKey] = useState(0)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const loadCatalog = useCallback(async (): Promise<string | null> => {
    if (!user?.orgId) return null
    const catalog = await fetchOrCreateCatalog(user.orgId)
    setCatalogId(catalog.id)
    return catalog.id
  }, [user?.orgId])

  const loadPricing = useCallback(
    async (catalogOverride?: string) => {
      const id = catalogOverride || catalogId || (await loadCatalog())
      if (!id) {
        setLoading(false)
        return
      }

      const result = await getPricingList(id, page, PAGE_SIZE, filter)
      setItems(result.items)
      setTotal(result.total)
    },
    [catalogId, filter, loadCatalog, page]
  )

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoading(true)
      try {
        const id = catalogId || (await loadCatalog())
        if (!id) {
          setLoading(false)
          return
        }
        const [pricing, categoryList] = await Promise.all([getPricingList(id, page, PAGE_SIZE, filter), getPricingCategories()])
        if (!mounted) return
        setItems(pricing.items)
        setTotal(pricing.total)
        setCategories(categoryList)
      } catch (error) {
        if (__DEV__) console.error('pricingList error', error)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [catalogId, filter, loadCatalog, page])

  useEffect(() => {
    setPage(1)
  }, [filter, sort])

  const onRefresh = async () => {
    setRefreshing(true)
    try {
      const id = catalogId || (await loadCatalog())
      if (!id) return
      const [pricing, categoryList] = await Promise.all([getPricingList(id, page, PAGE_SIZE, filter), getPricingCategories()])
      setItems(pricing.items)
      setTotal(pricing.total)
      setCategories(categoryList)
      setDetailRefreshKey((value) => value + 1)
      setFeedback(null)
    } finally {
      setRefreshing(false)
    }
  }

  const sortedItems = useMemo(() => sortItems(items, sort), [items, sort])

  const openDetail = (item: PricingListItem, section: 'overview' | 'history' = 'overview') => {
    setSelectedItem(item)
    setDetailSection(section)
    setDetailOpen(true)
  }

  const openNewPrice = () => {
    setPriceModalMode('new')
    setSelectedItem(items[0] ?? null)
    setPriceModalOpen(true)
  }

  const openEditPrice = (item: PricingListItem) => {
    setSelectedItem(item)
    setPriceModalMode('edit')
    setPriceModalOpen(true)
  }

  const openSchedulePrice = (item: PricingListItem, schedule?: ScheduledPrice) => {
    setSelectedItem(item)
    setSelectedSchedule(schedule ?? null)
    setScheduleModalMode(schedule ? 'edit' : 'create')
    setScheduleModalOpen(true)
  }

  const handlePriceSubmit = async (input: UpdatePriceInput) => {
    if (!selectedItem) return
    setSubmitting(true)
    try {
      await updatePrice({ ...input, supplierItemId: selectedItem.id })
      setFeedback({ type: 'success', message: 'Price updated successfully.' })
      setPriceModalOpen(false)
      await onRefresh()
      setDetailRefreshKey((value) => value + 1)
    } catch (error) {
      setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Unable to update price.' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleScheduleSubmit = async (input: CreateScheduledPriceInput | EditScheduledPriceInput, tiers: Array<{ minQty: number; price: number }>) => {
    if (!selectedItem) return
    setSubmitting(true)
    try {
      const tierPayload = tiers.length
        ? {
            supplierItemId: selectedItem.id,
            priceTiers: tiers.map((tier) => ({ minQty: Number(tier.minQty), price: Number(tier.price) })),
          }
        : undefined
      if (tierPayload) {
        await updatePrice({ supplierItemId: selectedItem.id, priceTiers: tierPayload.priceTiers })
      }
      if (scheduleModalMode === 'create') {
        await createScheduledPrice(input as CreateScheduledPriceInput)
      } else if (selectedSchedule) {
        await editScheduledPrice(input as EditScheduledPriceInput)
      }
      setFeedback({ type: 'success', message: 'Scheduled price saved.' })
      setScheduleModalOpen(false)
      await onRefresh()
      setDetailRefreshKey((value) => value + 1)
    } catch (error) {
      setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Unable to save schedule.' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancelSchedule = async (id: string) => {
    await cancelScheduledPrice(id)
    await onRefresh()
    setDetailRefreshKey((value) => value + 1)
  }

  const handleDeleteSchedule = async (id: string) => {
    await deleteScheduledPrice(id)
    await onRefresh()
    setDetailRefreshKey((value) => value + 1)
  }

  const resetFilters = () => {
    setFilter({})
    setSort('NEWEST')
  }

  const showColumn = (column: PricingColumnKey) => visibleColumns.includes(column)

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: horizontalPadding,
          paddingVertical: 16,
          gap: 18,
          width: '100%',
          maxWidth: contentMaxWidth,
          alignSelf: 'center',
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: isDesktop ? 26 : 22, fontWeight: '900', color: colors.text }}>Pricing</Text>
          <Text style={{ fontSize: 13, color: colors.textSecondary }}>
            Manage item prices, margins, scheduled changes, and price history.
          </Text>
        </View>

        {feedback && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, backgroundColor: feedback.type === 'success' ? '#DCFCE7' : '#FEE2E2' }}>
            {feedback.type === 'success' ? <CheckCircle2 size={16} color="#15803D" /> : <AlertCircle size={16} color="#B91C1C" />}
            <Text style={{ color: feedback.type === 'success' ? '#166534' : '#B91C1C', fontSize: 13, fontWeight: '700' }}>{feedback.message}</Text>
          </View>
        )}

        <PricingKpiRow catalogId={catalogId} refreshKey={detailRefreshKey} />

        <View style={{ position: 'relative', zIndex: 50 }}>
          <PricingToolbar
            filter={filter}
            onFilterChange={setFilter}
            sort={sort}
            onSortChange={setSort}
            layout={layout}
            onLayoutChange={setLayout}
            showLayoutToggle={isDesktop}
            visibleColumns={visibleColumns}
            onVisibleColumnsChange={setVisibleColumns}
            selectedCount={0}
            onBulkUpdatePress={() => undefined}
            onRefresh={onRefresh}
            onNewPrice={openNewPrice}
            onResetFilters={resetFilters}
            categories={categories}
          />
        </View>

        <View style={{ position: 'relative', zIndex: 1 }}>
          {loading ? (
            <OrderCardSkeletonList count={4} />
          ) : sortedItems.length === 0 ? (
            <View style={{ alignItems: 'center', padding: 48, gap: 8, backgroundColor: colors.surface, borderRadius: 12 }}>
              <Package size={32} color={colors.textSecondary} />
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: '900' }}>No pricing items found</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: 'center' }}>
                Add catalog items or adjust your filters to see supplier pricing.
              </Text>
            </View>
          ) : layout === 'table' ? (
            <View style={{ backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
              <ScrollView horizontal>
                <View>
                  <View style={{ flexDirection: 'row', backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                    {showColumn('image') && <HeaderCell label="Image" />}
                    {showColumn('product') && <HeaderCell label="Product" />}
                    {showColumn('sku') && <HeaderCell label="SKU" />}
                    {showColumn('category') && <HeaderCell label="Category" />}
                    {showColumn('currentCost') && <HeaderCell label="Current Cost" />}
                    {showColumn('sellingPrice') && <HeaderCell label="Selling Price" />}
                    {showColumn('margin') && <HeaderCell label="Margin %" />}
                    {showColumn('markup') && <HeaderCell label="Markup %" />}
                    {showColumn('tierCount') && <HeaderCell label="Price Tiers" />}
                    {showColumn('updated') && <HeaderCell label="Updated" />}
                    {showColumn('status') && <HeaderCell label="Status" />}
                    <HeaderCell label="Actions" />
                  </View>
                  {sortedItems.map((item) => (
                    <View key={item.id} style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border }}>
                      {showColumn('image') && (
                        <Cell style={{ width: 74 }}>
                          <Image source={item.image ? { uri: item.image } : PRODUCT_PLACEHOLDER} style={{ width: 48, height: 48, borderRadius: 8 }} />
                        </Cell>
                      )}
                      {showColumn('product') && (
                        <Cell style={{ width: 220 }}>
                          <Text style={{ color: colors.text, fontWeight: '700' }}>{item.name}</Text>
                        </Cell>
                      )}
                      {showColumn('sku') && (
                        <Cell style={{ width: 120 }}>
                          <Text style={{ color: colors.textSecondary }}>{item.sku ?? '—'}</Text>
                        </Cell>
                      )}
                      {showColumn('category') && (
                        <Cell style={{ width: 140 }}>
                          <Text style={{ color: colors.textSecondary }}>{item.categoryName ?? 'Uncategorized'}</Text>
                        </Cell>
                      )}
                      {showColumn('currentCost') && (
                        <Cell style={{ width: 120 }}>
                          <Text style={{ color: colors.text }}>{formatPHP(item.currentCost)}</Text>
                        </Cell>
                      )}
                      {showColumn('sellingPrice') && (
                        <Cell style={{ width: 120 }}>
                          <Text style={{ color: colors.text }}>{formatPHP(item.sellingPrice)}</Text>
                        </Cell>
                      )}
                      {showColumn('margin') && (
                        <Cell style={{ width: 90 }}>
                          <Text style={{ color: colors.text }}>{formatPercent(item.margin)}</Text>
                        </Cell>
                      )}
                      {showColumn('markup') && (
                        <Cell style={{ width: 90 }}>
                          <Text style={{ color: colors.text }}>{formatPercent(item.markup)}</Text>
                        </Cell>
                      )}
                      {showColumn('tierCount') && (
                        <Cell style={{ width: 90 }}>
                          <Text style={{ color: colors.text }}>{item.priceTierCount}</Text>
                        </Cell>
                      )}
                      {showColumn('updated') && (
                        <Cell style={{ width: 120 }}>
                          <Text style={{ color: colors.textSecondary }}>{formatDate(item.updatedAt)}</Text>
                        </Cell>
                      )}
                      {showColumn('status') && (
                        <Cell style={{ width: 100 }}>
                          <Text style={{ color: item.isActive ? colors.success : colors.textSecondary, fontWeight: '700' }}>{item.isActive ? 'Active' : 'Inactive'}</Text>
                        </Cell>
                      )}
                      <Cell style={{ width: 250 }}>
                        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                          <TinyAction label="Edit" onPress={() => openEditPrice(item)} />
                          <TinyAction label="Schedule" onPress={() => openSchedulePrice(item)} />
                          <TinyAction label="Details" onPress={() => openDetail(item, 'overview')} />
                          <TinyAction label="History" onPress={() => openDetail(item, 'history')} />
                        </View>
                      </Cell>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          ) : (
            <>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
                {sortedItems.map((item) => (
                  <PricingCard key={item.id} item={item} columns={cardColumns} onDetail={openDetail} onEdit={openEditPrice} onSchedule={openSchedulePrice} />
                ))}
              </View>
              <CatalogPagination page={page} pageSize={PAGE_SIZE} totalItems={total} onPageChange={setPage} onPageSizeChange={() => undefined} />
            </>
          )}
        </View>
      </ScrollView>

      <PricingDetailModal
        item={selectedItem}
        visible={detailOpen}
        onClose={() => setDetailOpen(false)}
        onEditPrice={openEditPrice}
        onSchedulePrice={openSchedulePrice}
        onEditScheduledPrice={openSchedulePrice}
        onCancelScheduled={handleCancelSchedule}
        onDeleteScheduled={handleDeleteSchedule}
        section={detailSection}
        refreshKey={detailRefreshKey}
      />

      <PriceEditorModal visible={priceModalOpen} mode={priceModalMode} item={selectedItem} loading={submitting} catalogItems={items} onClose={() => setPriceModalOpen(false)} onSubmit={handlePriceSubmit} />
      <ScheduleEditorModal visible={scheduleModalOpen} mode={scheduleModalMode} item={selectedItem} schedule={selectedSchedule} loading={submitting} onClose={() => setScheduleModalOpen(false)} onSubmit={handleScheduleSubmit} />
    </View>
  )
}

function HeaderCell({ label }: { label: string }) {
  const { colors } = useTheme()
  return (
    <View style={{ width: label === 'Actions' ? 250 : label === 'Product' ? 220 : label === 'SKU' ? 120 : label === 'Category' ? 140 : label === 'Current Cost' || label === 'Selling Price' ? 120 : label === 'Margin %' || label === 'Markup %' ? 90 : label === 'Price Tiers' ? 90 : label === 'Updated' ? 120 : label === 'Status' ? 100 : 74, paddingHorizontal: 12, paddingVertical: 12 }}>
      <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '800' }}>{label}</Text>
    </View>
  )
}

function Cell({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={[{ paddingHorizontal: 12, paddingVertical: 12, justifyContent: 'center' }, style]}>{children}</View>
}

function TinyAction({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors } = useTheme()
  return (
    <TouchableOpacity onPress={onPress} style={{ borderWidth: 1, borderColor: colors.border, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8 }}>
      <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '700' }}>{label}</Text>
    </TouchableOpacity>
  )
}
