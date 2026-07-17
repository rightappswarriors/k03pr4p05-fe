/**
 * PackagingBuilder — editor for wholesale packaging details.
 * Supports dimension inputs and weight specifications.
 */
import React, { useState, useCallback, useEffect, useRef } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Switch } from 'react-native'
import { useTheme } from '@/contexts/ThemeContext'
import type { WholesalePackaging } from '@/types'

interface Props {
  supplierItemId: string
  packaging?: WholesalePackaging | null
  onChange: (packaging: WholesalePackaging) => void
  editable?: boolean
}

export function PackagingBuilder({ supplierItemId, packaging, onChange, editable = true }: Props) {
  const { colors } = useTheme()

  // Controlled component - initialize from props
  const [fields, setFields] = useState({
    sellingUnit: packaging?.sellingUnit || '',
    packageLength: packaging?.packageLength?.toString() || '',
    packageWidth: packaging?.packageWidth?.toString() || '',
    packageHeight: packaging?.packageHeight?.toString() || '',
    grossWeight: packaging?.grossWeight?.toString() || '',
    netWeight: packaging?.netWeight?.toString() || '',
  })

  // Lift changes to parent (controlled state pattern)
  const notifyParent = useCallback(() => {
    onChange({
      id: packaging?.id || '',
      supplierItemId,
      sellingUnit: fields.sellingUnit || undefined,
      packageLength: fields.packageLength ? parseFloat(fields.packageLength) : undefined,
      packageWidth: fields.packageWidth ? parseFloat(fields.packageWidth) : undefined,
      packageHeight: fields.packageHeight ? parseFloat(fields.packageHeight) : undefined,
      grossWeight: fields.grossWeight ? parseFloat(fields.grossWeight) : undefined,
      netWeight: fields.netWeight ? parseFloat(fields.netWeight) : undefined,
      createdAt: packaging?.createdAt || new Date().toISOString(),
      updatedAt: packaging?.updatedAt || new Date().toISOString(),
    })
  }, [onChange, packaging, supplierItemId, fields])

  const update = useCallback((key: keyof typeof fields, value: string) => {
    setFields(prev => ({ ...prev, [key]: value }))
    // Notify parent after state change (debounced in actual use by batching in parent)
    notifyParent()
  }, [notifyParent])

  // Guard to prevent prop sync loop
  const lastPropRef = useRef<string | null>(null)
  const propKey = packaging?.id ?? 'none'
  useEffect(() => {
    if (lastPropRef.current !== propKey) {
      lastPropRef.current = propKey
      setFields({
        sellingUnit: packaging?.sellingUnit || '',
        packageLength: packaging?.packageLength?.toString() || '',
        packageWidth: packaging?.packageWidth?.toString() || '',
        packageHeight: packaging?.packageHeight?.toString() || '',
        grossWeight: packaging?.grossWeight?.toString() || '',
        netWeight: packaging?.netWeight?.toString() || '',
      })
    }
  }, [packaging, propKey])

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
          <Text style={[styles.displayLabel, { color: colors.textSecondary }]}>Selling Unit</Text>
          <Text style={[styles.displayValue, { color: colors.text }]}>{packaging?.sellingUnit || '—'}</Text>
        </View>
        <View style={[styles.displayRow, { borderBottomColor: colors.border }]}>
          <Text style={[styles.displayLabel, { color: colors.textSecondary }]}>Dimensions (L×W×H)</Text>
          <Text style={[styles.displayValue, { color: colors.text }]}>
            {packaging?.packageLength && packaging?.packageWidth && packaging?.packageHeight
              ? `${packaging.packageLength} × ${packaging.packageWidth} × ${packaging.packageHeight} cm`
              : '—'}
          </Text>
        </View>
        <View style={styles.displayRow}>
          <Text style={[styles.displayLabel, { color: colors.textSecondary }]}>Gross Weight</Text>
          <Text style={[styles.displayValue, { color: colors.text }]}>
            {packaging?.grossWeight ? `${packaging.grossWeight} kg` : '—'}
          </Text>
        </View>
        <View style={styles.displayRow}>
          <Text style={[styles.displayLabel, { color: colors.textSecondary }]}>Net Weight</Text>
          <Text style={[styles.displayValue, { color: colors.text }]}>
            {packaging?.netWeight ? `${packaging.netWeight} kg` : '—'}
          </Text>
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.card}]}>
      <Text style={[styles.sectionTitle, { color: colors.text, borderBottomColor: colors.border }]}>
        Packaging Details
      </Text>

      <View style={styles.fieldRow}>
        <View style={styles.field}>
          <Text style={lbl}>Selling Unit</Text>
          <TextInput
            value={fields.sellingUnit}
            onChangeText={(v) => update('sellingUnit', v)}
            placeholder="e.g. Box, Piece, Pack"
            placeholderTextColor={colors.textSecondary}
            style={inp}
          />
        </View>
      </View>

      <View style={styles.dimensionsSection}>
        <Text style={[styles.subsectionTitle, { color: colors.textSecondary }]}>Package Dimensions (cm)</Text>
        <View style={styles.dimensionsRow}>
          <View style={styles.dimensionField}>
            <Text style={lbl}>Length</Text>
            <TextInput
              value={fields.packageLength}
              onChangeText={(v) => update('packageLength', v)}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={colors.textSecondary}
              style={inp}
            />
          </View>
          <View style={styles.dimensionField}>
            <Text style={lbl}>Width</Text>
            <TextInput
              value={fields.packageWidth}
              onChangeText={(v) => update('packageWidth', v)}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={colors.textSecondary}
              style={inp}
            />
          </View>
          <View style={styles.dimensionField}>
            <Text style={lbl}>Height</Text>
            <TextInput
              value={fields.packageHeight}
              onChangeText={(v) => update('packageHeight', v)}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={colors.textSecondary}
              style={inp}
            />
          </View>
        </View>
      </View>

      <View style={styles.weightsSection}>
        <Text style={[styles.subsectionTitle, { color: colors.textSecondary }]}>Weights (kg)</Text>
        <View style={styles.weightsRow}>
          <View style={styles.weightField}>
            <Text style={lbl}>Gross Weight</Text>
            <TextInput
              value={fields.grossWeight}
              onChangeText={(v) => update('grossWeight', v)}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={colors.textSecondary}
              style={inp}
            />
          </View>
          <View style={styles.weightField}>
            <Text style={lbl}>Net Weight</Text>
            <TextInput
              value={fields.netWeight}
              onChangeText={(v) => update('netWeight', v)}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={colors.textSecondary}
              style={inp}
            />
          </View>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#fff', borderRadius: 8, padding: 12, gap: 12 },
  sectionTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3, paddingBottom: 8, borderBottomWidth: 1 },
  fieldRow: { gap: 8 },
  field: { gap: 2 },
  dimensionsSection: { gap: 8 },
  subsectionTitle: { fontSize: 11, fontWeight: '600' },
  dimensionsRow: { flexDirection: 'row', gap: 8 },
  dimensionField: { flex: 1, gap: 2 },
  weightsSection: { gap: 8 },
  weightsRow: { flexDirection: 'row', gap: 8 },
  weightField: { flex: 1, gap: 2 },
  saveBtn: { alignItems: 'center', padding: 8 },
  saveBtnText: { fontSize: 11, fontWeight: '600' },
  displayContainer: { gap: 4 },
  displayRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1 },
  displayLabel: { fontSize: 13, color: '#6B7280' },
  displayValue: { fontSize: 13, fontWeight: '500' },
})