/**
 * PricingBuilder — tiered pricing editor for wholesale products.
 * Features:
 * - Tiered pricing (Min Qty, Max Qty, Unit Price)
 * - MOQ validation
 * - Prevent overlapping ranges
 * - Auto-suggest next Min Qty
 * - Optional Unlimited Max Qty
 * - Price preview table
 */
import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react-native'
import type { PriceTier } from '@/types'

interface Props {
  supplierItemId: string
  priceTiers: PriceTier[]
  moq: number
  unit: string
  currency?: string
  onChange: (tiers: PriceTier[]) => void
  onValidityChange?: (isValid: boolean) => void
  editable?: boolean
}

interface EditingTier extends Omit<PriceTier, 'id' | 'createdAt' | 'updatedAt'> {
  id?: string
  _tempId?: string
  unlimitedMax?: boolean
  supplierItemId?: string
}

export function PricingBuilder({ supplierItemId, priceTiers, moq, unit, currency = 'PHP', onChange, onValidityChange, editable = true }: Props) {
  const { colors } = useTheme()
  const [tiers, setTiers] = useState<EditingTier[]>(() =>
    priceTiers.map(t => ({
      ...t,
      unlimitedMax: t.maxQty === null,
    }))
  )
  const [expandedPreview, setExpandedPreview] = useState(true)
  // Track which fields have been touched (for delayed error display)
  const [touchedPrice, setTouchedPrice] = useState<Record<string, boolean>>({})
  const [touchedMinQty, setTouchedMinQty] = useState<Record<string, boolean>>({})

  // Sync with props (controlled component) - only when props change
  // Use a ref to track the last prop value to avoid unnecessary resets
  const lastPropRef = useRef<string | null>(null)
  const propKey = priceTiers.map(t => t.id).sort().join('|')
  useEffect(() => {
    if (lastPropRef.current !== propKey) {
      lastPropRef.current = propKey
      setTiers(priceTiers.map(t => ({
        ...t,
        unlimitedMax: t.maxQty === null,
      })))
      // Reset touched state when props change
      setTouchedPrice({})
      setTouchedMinQty({})
    }
  }, [priceTiers, propKey])

  // Build clean tiers for parent - called directly from handlers, not via effect
  const buildCleanTiers = useCallback((tiersToClean: EditingTier[]) => {
    return tiersToClean.map(t => ({
      ...t,
      maxQty: t.unlimitedMax ? null : t.maxQty,
    })).map(({ _tempId, ...rest }) => rest as PriceTier)
  }, [])

  const addTier = useCallback(() => {
    const lastTier = tiers[tiers.length - 1]
    const suggestedMinQty = lastTier ? (lastTier.maxQty ?? lastTier.minQty + 100) + 1 : moq

    setTiers(prev => {
      const newTier: EditingTier = {
        supplierItemId,
        minQty: suggestedMinQty,
        maxQty: null,
        price: 0,  // Will show as blank in input due to touched tracking - no error until blur
        currency,
        unlimitedMax: true,
        _tempId: `temp_${Date.now()}`,
      }
      const updated = [...prev, newTier]
      onChange(buildCleanTiers(updated))
      return updated
    })
  }, [supplierItemId, tiers, moq, currency, onChange, buildCleanTiers])

  const updateTier = useCallback((index: number, field: keyof EditingTier, value: any) => {
    setTiers(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      onChange(buildCleanTiers(updated))
      return updated
    })
  }, [onChange, buildCleanTiers])

  const removeTier = useCallback((index: number) => {
    setTiers(prev => {
      const updated = prev.filter((_, i) => i !== index)
      onChange(buildCleanTiers(updated))
      return updated
    })
  }, [onChange, buildCleanTiers])

  // Helper to mark fields as touched
  const markPriceTouched = useCallback((tierKey: string) => {
    setTouchedPrice(prev => ({ ...prev, [tierKey]: true }))
  }, [])

  const markMinQtyTouched = useCallback((tierKey: string) => {
    setTouchedMinQty(prev => ({ ...prev, [tierKey]: true }))
  }, [])

  // Validation - errors are computed but never cause early return
  // The editor always renders; errors display as inline banners/messages
  const errors = useMemo(() => {
    const e: string[] = []

    tiers.forEach((tier, i) => {
      const tierKey = tier.id || tier._tempId || `idx_${i}`
      // Only show price error if field has been touched (blurred at least once)
      if (touchedPrice[tierKey] && tier.price <= 0) {
        e.push(`Tier ${i + 1}: Price must be greater than 0`)
      }
      if (tier.minQty < moq && i === 0) {
        e.push(`Tier ${i + 1}: Min Qty must be at least MOQ (${moq})`)
      }
      if (touchedMinQty[tierKey] && tier.minQty < 1) {
        e.push(`Tier ${i + 1}: Min Qty must be at least 1`)
      }
    })

    // Check for overlapping ranges
    for (let i = 0; i < tiers.length - 1; i++) {
      const current = tiers[i]
      const next = tiers[i + 1]
      if (!current || !next) continue
      const currentMax = current.unlimitedMax ? Infinity : (current.maxQty ?? Infinity)

      if (current.unlimitedMax) {
        e.push(`Tier ${i + 1}: Unlimited Max Qty cannot be followed by other tiers`)
      } else if (next.minQty <= currentMax) {
        e.push(`Tier ${i + 1}: Overlapping range with Tier ${i + 2}`)
      }
    }

    return e
  }, [tiers, moq, touchedPrice, touchedMinQty])

  // Report validity to parent
  useEffect(() => {
    const isValid = errors.length === 0
    onValidityChange?.(isValid)
  }, [errors.length, onValidityChange])

  // Compute per-tier field errors for inline display
  const tierFieldErrors = useMemo(() => {
    const e: Record<string, { price?: string; minQty?: string }> = {}
    tiers.forEach((tier, i) => {
      const tierKey = tier.id || tier._tempId || `idx_${i}`
      const tierErrors: { price?: string; minQty?: string } = {}
      if (touchedPrice[tierKey] && tier.price <= 0) {
        tierErrors.price = 'Price must be greater than 0'
      }
      if (touchedMinQty[tierKey] && tier.minQty < 1) {
        tierErrors.minQty = 'Min Qty must be at least 1'
      }
      if (Object.keys(tierErrors).length > 0) {
        e[tierKey] = tierErrors
      }
    })
    return e
  }, [tiers, touchedPrice, touchedMinQty])

  const sortedTiers = useMemo(() =>
    [...tiers].sort((a, b) => a.minQty - b.minQty),
    [tiers]
  )

  const fmt = (n: number | string) =>
    new Intl.NumberFormat('en-PH', { style: 'currency', currency }).format(Number(n))

  return (
    <View style={styles.container}>
      {/* Validation Errors Banner - always visible at top of editor */}
      {errors.length > 0 && (
        <View style={[styles.errorContainer, { backgroundColor: '#FEF2F2' }]}>
          <Text style={[styles.errorTitle, { color: '#EF4444' }]}>Validation Errors</Text>
          {errors.map((err, i) => (
            <Text key={i} style={[styles.errorText, { color: '#EF4444' }]}>• {err}</Text>
          ))}
        </View>
      )}

      {editable && (
        <View style={[styles.editorSection, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text, borderBottomColor: colors.border }]}>
            Volume Pricing Tiers
          </Text>

          {tiers.map((tier, index) => {
            const tierKey = tier.id || tier._tempId || `idx_${index}`
            const fieldErr = tierFieldErrors[tierKey]
            return (
              <TierEditorRow
                key={tierKey}
                tier={tier}
                index={index}
                colors={colors}
                onUpdate={updateTier}
                onRemove={removeTier}
                onMarkPriceTouched={() => markPriceTouched(tierKey)}
                onMarkMinQtyTouched={() => markMinQtyTouched(tierKey)}
                showUnlimitedOption={index === tiers.length - 1}
                priceError={fieldErr?.price}
                minQtyError={fieldErr?.minQty}
              />
            )
          })}

          <TouchableOpacity onPress={addTier} style={styles.addTierBtn}>
            <Plus size={16} color={colors.primary} />
            <Text style={[styles.addTierText, { color: colors.primary }]}>Add Price Tier</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={[styles.previewSection, { backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => setExpandedPreview(p => !p)} style={styles.previewHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {expandedPreview ? (
              <ChevronDown size={16} color={colors.textSecondary} />
            ) : (
              <ChevronRight size={16} color={colors.textSecondary} />
            )}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Price Preview</Text>
          </View>
        </TouchableOpacity>

        {expandedPreview && (
          <View style={styles.previewTable}>
            <View style={[styles.previewHeaderRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.previewHeaderCell, { color: colors.textSecondary, flex: 2 }]}>Quantity Range</Text>
              <Text style={[styles.previewHeaderCell, { color: colors.textSecondary, flex: 1.5 }]}>Unit Price</Text>
              <Text style={[styles.previewHeaderCell, { color: colors.textSecondary, flex: 1 }]}>Min Order</Text>
            </View>

            {sortedTiers.map((tier, mapIdx) => (
              <View key={tier.id || tier._tempId || mapIdx} style={[styles.previewRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.previewCell, { color: colors.text, flex: 2 }]}>
                  {tier.unlimitedMax ? `${tier.minQty}+` : `${tier.minQty} - ${tier.maxQty}`}
                </Text>
                <Text style={[styles.previewCell, { color: colors.text, fontWeight: '600', flex: 1.5 }]}>
                  {fmt(tier.price)}
                </Text>
                <Text style={[styles.previewCell, { color: tier.minQty <= moq ? colors.primary : colors.textSecondary, flex: 1 }]}>
                  {tier.minQty <= moq ? 'MOQ ✓' : tier.minQty}
                </Text>
              </View>
            ))}

            {sortedTiers.length === 0 && (
              <Text style={[styles.emptyPreview, { color: colors.textSecondary }]}>
                No pricing tiers configured. Base price applies.
              </Text>
            )}
          </View>
        )}
      </View>
    </View>
  )
}

interface TierEditorRowProps {
  tier: EditingTier
  index: number
  colors: any
  onUpdate: (index: number, field: keyof EditingTier, value: any) => void
  onRemove: (index: number) => void
  onMarkPriceTouched: () => void
  onMarkMinQtyTouched: () => void
  showUnlimitedOption?: boolean
  priceError?: string
  minQtyError?: string
}

// Regex allowing a partial/complete decimal number as the user types it:
// "", "0", "12", "12.", "12.5", ".5" — but not multiple dots or letters.
const DECIMAL_INPUT_RE = /^\d*\.?\d*$/

function TierEditorRow({ tier, index, colors, onUpdate, onRemove, onMarkPriceTouched, onMarkMinQtyTouched, showUnlimitedOption, priceError, minQtyError }: TierEditorRowProps) {
  // Local text buffer for the price input. This is what's rendered in the
  // TextInput. It's kept separate from `tier.price` (the numeric value sent
  // to the parent) so the user can type "12." or "0.5" without the trailing
  // decimal point getting stripped by a numeric round-trip on every keystroke.
  const [priceText, setPriceText] = useState<string>(tier.price ? String(tier.price) : '')
  const priceFocused = useRef(false)

  // If the tier's price changes from outside (e.g. parent reset, tier
  // switched) while the user isn't actively editing it, resync the buffer.
  useEffect(() => {
    if (!priceFocused.current) {
      setPriceText(tier.price ? String(tier.price) : '')
    }
  }, [tier.price])

  const handlePriceChange = (v: string) => {
    // Reject anything that isn't a valid (possibly partial) decimal number.
    if (v !== '' && !DECIMAL_INPUT_RE.test(v)) return
    setPriceText(v)
    const parsed = v === '' || v === '.' ? 0 : parseFloat(v)
    onUpdate(index, 'price', Number.isNaN(parsed) ? 0 : parsed)
  }

  const handlePriceFocus = () => {
    priceFocused.current = true
  }

  const handlePriceBlur = () => {
    priceFocused.current = false
    // Normalize display (e.g. "12." -> "12", "" stays "" until touched shows error)
    setPriceText(tier.price ? String(tier.price) : '')
    onMarkPriceTouched()
  }

  const inp = {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 13,
    color: colors.text,
    backgroundColor: colors.background,
    minWidth: 60,
  }
  const lbl = { fontSize: 11, fontWeight: '600' as const, color: colors.textSecondary, marginBottom: 2 }

  return (
    <View style={[styles.tierRow, { borderBottomColor: colors.border }]}>
      <View style={styles.tierFields}>
        <View style={styles.inlineField}>
          <Text style={lbl}>Min Qty</Text>
          <TextInput
            value={String(tier.minQty)}
            onChangeText={(v) => onUpdate(index, 'minQty', parseInt(v) || 0)}
            onBlur={onMarkMinQtyTouched}
            keyboardType="number-pad"
            placeholder="1"
            placeholderTextColor={colors.textSecondary}
            style={[inp, minQtyError ? { borderColor: '#EF4444' } : {}]}
          />
          {!!minQtyError && (
            <Text style={{ fontSize: 11, color: '#EF4444', marginTop: 2 }}>{minQtyError}</Text>
          )}
        </View>

        {!tier.unlimitedMax && (
          <View style={styles.inlineField}>
            <Text style={lbl}>Max Qty</Text>
            <TextInput
              value={tier.maxQty ? String(tier.maxQty) : ''}
              onChangeText={(v) => onUpdate(index, 'maxQty', parseInt(v) || 0)}
              keyboardType="number-pad"
              placeholder="Unlimited"
              placeholderTextColor={colors.textSecondary}
              style={inp}
            />
          </View>
        )}

        <View style={styles.inlineField}>
          <Text style={lbl}>Unit Price</Text>
          <TextInput
            value={priceText}
            onChangeText={handlePriceChange}
            onFocus={handlePriceFocus}
            onBlur={handlePriceBlur}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={colors.textSecondary}
            style={[inp, priceError ? { borderColor: '#EF4444' } : {}]}
          />
          {!!priceError && (
            <Text style={{ fontSize: 11, color: '#EF4444', marginTop: 2 }}>{priceError}</Text>
          )}
        </View>
      </View>

      {showUnlimitedOption && (
        <TouchableOpacity
          onPress={() => onUpdate(index, 'unlimitedMax', !tier.unlimitedMax)}
          style={[styles.unlimitedBadge, { backgroundColor: tier.unlimitedMax ? `${colors.primary}15` : colors.surface }]}
        >
          <Text style={[styles.unlimitedText, { color: tier.unlimitedMax ? colors.primary : colors.textSecondary }]}>
            Unlimited
          </Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity onPress={() => onRemove(index)} style={styles.removeBtn}>
        <Trash2 size={16} color="#EF4444" />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3, paddingBottom: 8, borderBottomWidth: 1 },
  editorSection: { borderRadius: 8, padding: 12 },
  tierRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 10, borderBottomWidth: 1 },
  tierFields: { flex: 1, flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  inlineField: { gap: 2, minWidth: 70 },
  removeBtn: { padding: 4 },
  unlimitedBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, marginLeft: 8 },
  unlimitedText: { fontSize: 11, fontWeight: '600' },
  addTierBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10 },
  addTierText: { fontSize: 13, fontWeight: '600' },
  previewSection: { borderRadius: 8, padding: 12 },
  previewHeader: { paddingVertical: 8 },
  previewTable: { marginTop: 8 },
  previewHeaderRow: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1 },
  previewHeaderCell: { fontSize: 12, fontWeight: '600' },
  previewRow: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1 },
  previewCell: { fontSize: 13 },
  emptyPreview: { fontSize: 13, fontStyle: 'italic', padding: 16, textAlign: 'center' },
  errorContainer: { backgroundColor: '#FEF2F2', borderRadius: 8, padding: 12, gap: 4 },
  errorTitle: { fontSize: 14, fontWeight: '700' },
  errorText: { fontSize: 12 },
})