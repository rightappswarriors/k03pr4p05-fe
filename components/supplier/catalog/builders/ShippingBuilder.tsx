/**
 * ShippingBuilder — editor for wholesale shipping configuration.
 * Features:
 * - Free Shipping option
 * - Shipping rule builder
 * - Origin location details
 */
import React, { useState, useCallback, useEffect, useRef } from 'react'
import { View, Text, TextInput, StyleSheet, Switch } from 'react-native'
import { useTheme } from '@/contexts/ThemeContext'
import type { WholesaleShipping } from '@/types'

interface Props {
  supplierItemId: string
  shipping?: WholesaleShipping | null
  onChange: (shipping: WholesaleShipping) => void
  editable?: boolean
}

export function ShippingBuilder({ supplierItemId, shipping, onChange, editable = true }: Props) {
  const { colors } = useTheme()
  const [isFreeShipping, setIsFreeShipping] = useState(shipping?.shippingMethod?.toLowerCase() === 'free')

  const [fields, setFields] = useState({
    originCountry: shipping?.originCountry || 'Philippines',
    originProvince: shipping?.originProvince || '',
    originCity: shipping?.originCity || '',
    shippingMethod: shipping?.shippingMethod || '',
    estimatedDays: shipping?.estimatedDays?.toString() || '',
    shippingNotes: shipping?.shippingNotes || '',
  })

  // Lift changes to parent (controlled state pattern)
  const notifyParent = useCallback(() => {
    onChange({
      id: shipping?.id || '',
      supplierItemId,
      originCountry: fields.originCountry || undefined,
      originProvince: fields.originProvince || undefined,
      originCity: fields.originCity || undefined,
      shippingMethod: isFreeShipping ? 'Free Shipping' : (fields.shippingMethod || undefined),
      estimatedDays: fields.estimatedDays ? parseInt(fields.estimatedDays) : undefined,
      shippingNotes: fields.shippingNotes || undefined,
      createdAt: shipping?.createdAt || new Date().toISOString(),
      updatedAt: shipping?.updatedAt || new Date().toISOString(),
    })
  }, [onChange, shipping, supplierItemId, fields, isFreeShipping])

  const update = useCallback((key: keyof typeof fields, value: string) => {
    setFields(prev => ({ ...prev, [key]: value }))
    // Notify parent after state change
    notifyParent()
  }, [notifyParent])

  // Guard to prevent prop sync loop
  const lastPropRef = useRef<string | null>(null)
  const propKey = shipping?.id ?? 'none'
  useEffect(() => {
    if (lastPropRef.current !== propKey) {
      lastPropRef.current = propKey
      setIsFreeShipping(shipping?.shippingMethod?.toLowerCase() === 'free')
      setFields({
        originCountry: shipping?.originCountry || 'Philippines',
        originProvince: shipping?.originProvince || '',
        originCity: shipping?.originCity || '',
        shippingMethod: shipping?.shippingMethod || '',
        estimatedDays: shipping?.estimatedDays?.toString() || '',
        shippingNotes: shipping?.shippingNotes || '',
      })
    }
  }, [shipping, propKey])

  const inp = {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 13,
    color: colors.text,
    backgroundColor: colors.background,
  }
  const lbl = { fontSize: 11, fontWeight: '600' as const, color: colors.textSecondary, marginBottom: 2 }

  if (!editable) {
    return (
      <View style={styles.displayContainer}>
        <View style={[styles.displayRow, { borderBottomColor: colors.border }]}>
          <Text style={[styles.displayLabel, { color: colors.textSecondary }]}>Shipping Method</Text>
          <Text style={[styles.displayValue, { color: colors.text }]}>
            {shipping?.shippingMethod || '—'}
          </Text>
        </View>
        <View style={[styles.displayRow, { borderBottomColor: colors.border }]}>
          <Text style={[styles.displayLabel, { color: colors.textSecondary }]}>Origin</Text>
          <Text style={[styles.displayValue, { color: colors.text }]}>
            {shipping?.originCity && shipping?.originProvince
              ? `${shipping.originCity}, ${shipping.originProvince}`
              : '—'}
          </Text>
        </View>
        <View style={[styles.displayRow, { borderBottomColor: colors.border }]}>
          <Text style={[styles.displayLabel, { color: colors.textSecondary }]}>Estimated Days</Text>
          <Text style={[styles.displayValue, { color: colors.text }]}>
            {shipping?.estimatedDays ? `${shipping.estimatedDays} days` : '—'}
          </Text>
        </View>
        <View style={styles.displayRow}>
          <Text style={[styles.displayLabel, { color: colors.textSecondary }]}>Notes</Text>
          <Text style={[styles.displayValue, { color: colors.text }]}>
            {shipping?.shippingNotes || '—'}
          </Text>
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <Text style={[styles.sectionTitle, { color: colors.text, borderBottomColor: colors.border }]}>
        Shipping Configuration
      </Text>

      {/* Free Shipping Toggle */}
      <View style={styles.freeShippingRow}>
        <Text style={[styles.freeShippingLabel, { color: colors.text }]}>Free Shipping</Text>
        <Switch
          value={isFreeShipping}
          onValueChange={(val) => { setIsFreeShipping(val); notifyParent() }}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor="#fff"
        />
      </View>

      {!isFreeShipping && (
        <View style={styles.shippingFields}>
          <View style={styles.fieldRow}>
            <View style={styles.field}>
              <Text style={lbl}>Shipping Method</Text>
              <TextInput
                value={fields.shippingMethod}
                onChangeText={(v) => update('shippingMethod', v)}
                placeholder="e.g. Courier, Air Freight"
                placeholderTextColor={colors.textSecondary}
                style={inp}
              />
            </View>
          </View>

          <View style={styles.fieldRow}>
            <View style={styles.field}>
              <Text style={lbl}>Estimated Days</Text>
              <TextInput
                value={fields.estimatedDays}
                onChangeText={(v) => update('estimatedDays', v)}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
                style={inp}
              />
            </View>
          </View>
        </View>
      )}

      <View style={styles.fieldRow}>
        <View style={styles.field}>
          <Text style={lbl}>Origin Country</Text>
          <TextInput
            value={fields.originCountry}
            onChangeText={(v) => update('originCountry', v)}
            placeholder="Philippines"
            placeholderTextColor={colors.textSecondary}
            style={inp}
          />
        </View>
      </View>

      <View style={styles.locationRow}>
        <View style={styles.locationField}>
          <Text style={lbl}>Province</Text>
          <TextInput
            value={fields.originProvince}
            onChangeText={(v) => update('originProvince', v)}
            placeholder="e.g. Metro Manila"
            placeholderTextColor={colors.textSecondary}
            style={inp}
          />
        </View>

        <View style={styles.locationField}>
          <Text style={lbl}>City</Text>
          <TextInput
            value={fields.originCity}
            onChangeText={(v) => update('originCity', v)}
            placeholder="e.g. Manila"
            placeholderTextColor={colors.textSecondary}
            style={inp}
          />
        </View>
      </View>

      <View style={styles.fieldRow}>
        <View style={styles.field}>
          <Text style={lbl}>Shipping Notes</Text>
          <TextInput
            value={fields.shippingNotes}
            onChangeText={(v) => update('shippingNotes', v)}
            placeholder="Special handling instructions, etc."
            placeholderTextColor={colors.textSecondary}
            style={[inp, { minHeight: 60 }]}
            multiline
          />
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#fff', borderRadius: 8, padding: 12, gap: 12 },
  sectionTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3, paddingBottom: 8, borderBottomWidth: 1 },
  freeShippingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  freeShippingLabel: { fontSize: 14, fontWeight: '600' },
  shippingFields: { gap: 8 },
  fieldRow: { gap: 8 },
  field: { gap: 2 },
  locationRow: { flexDirection: 'row', gap: 8 },
  locationField: { flex: 1, gap: 2 },
  saveBtn: { alignItems: 'center', padding: 8 },
  saveBtnText: { fontSize: 11, fontWeight: '600' },
  displayContainer: { gap: 4 },
  displayRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1 },
  displayLabel: { fontSize: 13, color: '#6B7280' },
  displayValue: { fontSize: 13, fontWeight: '500' },
})