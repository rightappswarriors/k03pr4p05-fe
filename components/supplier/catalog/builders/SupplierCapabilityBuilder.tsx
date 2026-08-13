/**
 * SupplierCapabilityBuilder — editor for supplier capabilities.
 * Supports: MINOR_CUSTOMIZATION, DRAWING_CUSTOMIZATION, SAMPLE_CUSTOMIZATION,
 * FULL_CUSTOMIZATION, OEM, ODM capability types.
 */
import React, { useState, useCallback, useEffect } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Switch } from 'react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { Settings, Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react-native'
import type { SupplierCapability, SupplierCapabilityType } from '@/types'
import { WholesaleService } from '@/services/wholesaleService'
import { useAuth } from '@/contexts/AuthContext'

interface Props {
  capabilities: SupplierCapability[]
  onChange: (capabilities: SupplierCapability[]) => void
  editable?: boolean
}

const CAPABILITY_TYPES: { value: SupplierCapabilityType; label: string; description: string }[] = [
  { value: 'MINOR_CUSTOMIZATION', label: 'Minor Customization', description: 'Small changes to existing products' },
  { value: 'DRAWING_CUSTOMIZATION', label: 'Drawing Customization', description: 'Custom designs based on drawings' },
  { value: 'SAMPLE_CUSTOMIZATION', label: 'Sample Customization', description: 'Modifications to samples' },
  { value: 'FULL_CUSTOMIZATION', label: 'Full Customization', description: 'Complete product customization' },
  { value: 'OEM', label: 'OEM', description: 'Original Equipment Manufacturing' },
  { value: 'ODM', label: 'ODM', description: 'Original Design Manufacturing' },
]

export function SupplierCapabilityBuilder({ onChange, editable = true }: Props) {
  const { colors } = useTheme()
  const { user } = useAuth()
  const [caps, setCaps] = useState<SupplierCapability[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set(CAPABILITY_TYPES.map(c => c.value)))

  // Sync with props when they change (controlled component)
  const getCapability = async (orgId: any): Promise<SupplierCapability[]> => {
    return await WholesaleService.getSupplierCapabilities(Number(orgId))
  }
  useEffect(() => {
    if (!user?.orgId) return
    let cancelled = false

    WholesaleService.getSupplierCapabilities(Number(user.orgId)).then((result) => {
      if (!cancelled) setCaps(result)
    })

    return () => {
      cancelled = true
    }
  }, [user?.orgId])
  const toggleExpanded = (type: SupplierCapabilityType) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }

  // Helper to generate temp ID for new capabilities
  const generateTempId = () => `temp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  const updateCapability = useCallback((type: SupplierCapabilityType, updates: Partial<SupplierCapability>) => {
    setCaps(prev => {
      const existing = prev.find(c => c.type === type)
      let newState: SupplierCapability[]
      if (existing) {
        newState = prev.map(c => c.type === type ? { ...c, ...updates } : c)
      } else {
        // Create new capability with temp ID for tracking
        newState = [...prev, {
          id: generateTempId(), // temp ID for new capabilities
          organizationId: 0,
          type,
          name: CAPABILITY_TYPES.find(c => c.value === type)?.label || type,
          available: true,
          description: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...updates,
        }]
      }
      onChange(newState)
      return newState
    })
  }, [onChange])

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
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        <Settings size={16} color={colors.primary} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Supplier Capabilities
        </Text>
      </View>

      {CAPABILITY_TYPES.map((capType) => {
        const capability = caps.find(c => c.type === capType.value)
        const isAvailable = capability?.available ?? false
        const isExpanded = expanded.has(capType.value)

        return (
          <View key={capType.value} style={[styles.capItem, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => toggleExpanded(capType.value)} style={styles.capHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                {isExpanded ? (
                  <ChevronDown size={16} color={colors.textSecondary} />
                ) : (
                  <ChevronRight size={16} color={colors.textSecondary} />
                )}
                <View style={{ flex: 1 }}>
                  <Text style={[styles.capName, { color: colors.text }]}>{capType.label}</Text>
                  <Text style={[styles.capDesc, { color: colors.textSecondary }]} numberOfLines={1}>
                    {capType.description}
                  </Text>
                </View>
              </View>

              {editable && (
                <Switch
                  value={isAvailable}
                  onValueChange={(val) => updateCapability(capType.value, { available: val })}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#fff"
                />
              )}
            </TouchableOpacity>

            {isExpanded && capability?.available && editable && (
              <View style={styles.capEditor}>
                <View style={styles.field}>
                  <Text style={lbl}>Description (optional)</Text>
                  <TextInput
                    value={capability.description || ''}
                    onChangeText={(v) => updateCapability(capType.value, { description: v })}
                    placeholder={capType.description}
                    placeholderTextColor={colors.textSecondary}
                    style={[inp, { minHeight: 50 }]}
                    multiline
                  />
                </View>
              </View>
            )}
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { borderRadius: 8, padding: 12, gap: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  capItem: { borderBottomWidth: 1, paddingVertical: 8 },
  capHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  capName: { fontSize: 14, fontWeight: '600' },
  capDesc: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  capEditor: { marginTop: 10, paddingLeft: 24 },
  field: { gap: 2 },
})