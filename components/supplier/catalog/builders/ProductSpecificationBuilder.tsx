/**
 * ProductSpecificationBuilder — inline editor for product specifications.
 * Used within ProductsDetailModal to manage technical specs for wholesale products.
 * Controlled component: onChange lifts edits to parent state; persistence happens on Save.
 */
import React, { useState, useCallback, useEffect, useRef } from 'react'
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet } from 'react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { Plus, Trash2, GripVertical, ChevronDown, ChevronRight } from 'lucide-react-native'
import type { ProductSpecification } from '@/types'

interface Props {
  supplierItemId: string
  specifications: ProductSpecification[]
  onChange: (specs: ProductSpecification[]) => void
  editable?: boolean
}

interface EditingSpec extends Omit<ProductSpecification, 'id' | 'createdAt' | 'updatedAt'> {
  id?: string
  _tempId?: string
}

export function ProductSpecificationBuilder({ supplierItemId, specifications, onChange, editable = true }: Props) {
  const { colors } = useTheme()
  const [specs, setSpecs] = useState<EditingSpec[]>(() =>
    specifications.map(s => ({ ...s }))
  )
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  // Guard to prevent prop sync loop
  const lastPropKey = useRef<string | null>(null)
  const propKey = specifications.map(s => s.id).sort().join('|')
  useEffect(() => {
    if (lastPropKey.current !== propKey) {
      lastPropKey.current = propKey
      setSpecs(specifications.map(s => ({ ...s })))
    }
  }, [specifications, propKey])

  // Lift changes to parent (controlled state pattern) - called directly from handlers
  const notifyParent = useCallback((updatedSpecs: EditingSpec[]) => {
    onChange(updatedSpecs as ProductSpecification[])
  }, [onChange])

  const addSpec = useCallback(() => {
    const newSpec: EditingSpec = {
      supplierItemId,
      name: '',
      value: '',
      unit: '',
      category: '',
      groupName: '',
      sortOrder: specs.length,
      _tempId: `temp_${Date.now()}`,
    }
    setSpecs(prev => {
      const updated = [...prev, newSpec]
      notifyParent(updated)
      return updated
    })
  }, [supplierItemId, specs.length, notifyParent])

  const updateSpec = useCallback((index: number, field: keyof EditingSpec, value: string) => {
    setSpecs(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      notifyParent(updated)
      return updated
    })
  }, [notifyParent])

  const removeSpec = useCallback((index: number) => {
    setSpecs(prev => {
      const updated = prev.filter((_, i) => i !== index)
      notifyParent(updated)
      return updated
    })
  }, [notifyParent])

  const groupedSpecs = specs.reduce((acc, spec, index) => {
    const group = spec.groupName || 'General'
    if (!acc[group]) acc[group] = []
    acc[group].push({ ...spec, _index: index })
    return acc
  }, {} as Record<string, Array<EditingSpec & { _index: number }>>)

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(group)) next.delete(group)
      else next.add(group)
      return next
    })
  }

  if (!editable) {
    return (
      <View style={[styles.container, { backgroundColor: colors.card  }]}>
        {specs.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No specifications added.</Text>
        ) : (
          Object.entries(groupedSpecs).map(([group, groupSpecs]) => (
            <View key={group} style={[styles.groupContainer, { backgroundColor: colors.card}]}>
              <Text style={[styles.groupTitle, { color: colors.text, borderBottomColor: colors.border }]}>
                {group}
              </Text>
              {groupSpecs.map((spec) => (
                <View key={spec.id || spec._tempId} style={styles.specRow}>
                  <Text style={[styles.specName, { color: colors.textSecondary }]}>
                    {spec.name}
                    {spec.unit ? ` (${spec.unit})` : ''}
                  </Text>
                  <Text style={[styles.specValue, { color: colors.text }]}>{spec.value}</Text>
                </View>
              ))}
            </View>
          ))
        )}
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {Object.keys(groupedSpecs).length === 0 && specs.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No specifications added.</Text>
          <TouchableOpacity onPress={addSpec} style={[styles.addButton, { backgroundColor: colors.primary }]}>
            <Plus size={16} color="#fff" />
            <Text style={[styles.addButtonText, { color: colors.text}]}>Add Specification</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {Object.entries(groupedSpecs).map(([group, groupSpecs]) => (
            <View key={group} style={[styles.groupContainer, { backgroundColor: colors.card }]}>
              <TouchableOpacity onPress={() => toggleGroup(group)} style={styles.groupHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {expandedGroups.has(group) ? (
                    <ChevronDown size={16} color={colors.textSecondary} />
                  ) : (
                    <ChevronRight size={16} color={colors.textSecondary} />
                  )}
                  <Text style={[styles.groupTitle, { color: colors.text }]}>{group}</Text>
                </View>
              </TouchableOpacity>
              {expandedGroups.has(group) && (
                <View style={styles.specsList}>
                  {groupSpecs.map((spec) => (
                    <SpecEditorRow
                      key={spec.id || spec._tempId}
                      spec={spec}
                      index={spec._index}
                      colors={colors}
                      onUpdate={updateSpec}
                      onRemove={removeSpec}
                    />
                  ))}
                </View>
              )}
            </View>
          ))}

          <TouchableOpacity onPress={addSpec} style={styles.addNewButton}>
            <Plus size={16} color={colors.primary} />
            <Text style={[styles.addNewText, { color: colors.primary }]}>Add Specification</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  )
}

interface SpecEditorRowProps {
  spec: EditingSpec & { _index: number }
  index: number
  colors: any
  onUpdate: (index: number, field: keyof EditingSpec, value: string) => void
  onRemove: (index: number) => void
}

function SpecEditorRow({ spec, index, colors, onUpdate, onRemove }: SpecEditorRowProps) {
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

  return (
    <View style={[styles.editorRow, { borderBottomColor: colors.border }]}>
      <View style={styles.rowDragHandle}>
        <GripVertical size={14} color={colors.textSecondary} />
      </View>

      <View style={styles.editorFields}>
        <View style={styles.inlineField}>
          <Text style={lbl}>Name</Text>
          <TextInput
            value={spec.name}
            onChangeText={(v) => onUpdate(index, 'name', v)}
            placeholder="e.g. Voltage"
            placeholderTextColor={colors.textSecondary}
            style={inp}
          />
        </View>

        <View style={styles.inlineField}>
          <Text style={lbl}>Value</Text>
          <TextInput
            value={spec.value}
            onChangeText={(v) => onUpdate(index, 'value', v)}
            placeholder="e.g. 220V"
            placeholderTextColor={colors.textSecondary}
            style={inp}
          />
        </View>

        <View style={styles.inlineField}>
          <Text style={lbl}>Unit</Text>
          <TextInput
            value={spec.unit || ''}
            onChangeText={(v) => onUpdate(index, 'unit', v)}
            placeholder="e.g. V"
            placeholderTextColor={colors.textSecondary}
            style={inp}
          />
        </View>

        <View style={styles.inlineField}>
          <Text style={lbl}>Category</Text>
          <TextInput
            value={spec.category || ''}
            onChangeText={(v) => onUpdate(index, 'category', v)}
            placeholder="Optional"
            placeholderTextColor={colors.textSecondary}
            style={inp}
          />
        </View>

        <View style={styles.inlineField}>
          <Text style={lbl}>Group</Text>
          <TextInput
            value={spec.groupName || ''}
            onChangeText={(v) => onUpdate(index, 'groupName', v)}
            placeholder="Optional grouping"
            placeholderTextColor={colors.textSecondary}
            style={inp}
          />
        </View>
      </View>

      <TouchableOpacity onPress={() => onRemove(index)} style={styles.removeBtn}>
        <Trash2 size={16} color="#EF4444" />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  emptyState: { alignItems: 'center', padding: 24, gap: 12 },
  emptyText: { fontSize: 14, color: '#6B7280' },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  addButtonText: {  fontWeight: '600', fontSize: 13 },
  groupContainer: { backgroundColor: '#fff', borderRadius: 8 },
  groupHeader: { padding: 12 },
  groupTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3, paddingBottom: 8, borderBottomWidth: 1 },
  specsList: { paddingHorizontal: 12, paddingBottom: 8 },
  specRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  specName: { fontSize: 13 },
  specValue: { fontSize: 13, fontWeight: '500' },
  addNewButton: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10 },
  addNewText: { fontSize: 13, fontWeight: '600' },
  editorRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 8, borderBottomWidth: 1 },
  rowDragHandle: { paddingTop: 12 },
  editorFields: { flex: 1, gap: 8 },
  inlineField: { gap: 2 },
  removeBtn: { padding: 4 },
})