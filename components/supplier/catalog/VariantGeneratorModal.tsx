/**
 * VariantGeneratorModal
 * Builds variant groups + options, then calls the Cartesian generateVariants mutation.
 *
 * Color mode: automatically activates when group name contains "color" / "colour".
 * In color mode, preset color chips replace the plain text input, and a hex
 * picker allows custom colors. Each option stores { value: name, colorHex: hex }.
 *
 * Per-option image: each option can carry its own image, uploaded via MediaService.
 */
import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator, Alert, Image, ScrollView,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { ImagePlus, Plus, Trash2, X, Zap } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import { FadeDialogModal } from './FadeDialogModal'
import { MediaService } from '@/services/mediaService'
import {
  createVariantGroup, generateVariants,
  type VariantGroup, type SupplierItemVariant,
} from '@/services/supplierService/variantService'

// ─── Preset colors ────────────────────────────────────────────────────────────

const PRESET_COLORS: Array<{ name: string; hex: string }> = [
  { name: 'Black',   hex: '#000000' },
  { name: 'White',   hex: '#FFFFFF' },
  { name: 'Red',     hex: '#EF4444' },
  { name: 'Blue',    hex: '#3B82F6' },
  { name: 'Navy',    hex: '#1E3A8A' },
  { name: 'Green',   hex: '#22C55E' },
  { name: 'Yellow',  hex: '#EAB308' },
  { name: 'Purple',  hex: '#A855F7' },
  { name: 'Pink',    hex: '#EC4899' },
  { name: 'Orange',  hex: '#F97316' },
  { name: 'Brown',   hex: '#92400E' },
  { name: 'Gray',    hex: '#6B7280' },
  { name: 'Beige',   hex: '#D4B896' },
  { name: 'Teal',    hex: '#14B8A6' },
  { name: 'Gold',    hex: '#D97706' },
]

// Detect whether a group name implies color mode.
function isColorGroup(name: string): boolean {
  return /colou?r/i.test(name.trim())
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface LocalOption {
  value: string
  colorHex: string
  // pending image asset (not yet uploaded)
  imageAsset?: ImagePicker.ImagePickerAsset | null
  // already-uploaded URL
  imageUrl?: string | null
}

interface LocalGroup {
  name: string
  options: LocalOption[]
}

function emptyGroup(): LocalGroup {
  return { name: '', options: [{ value: '', colorHex: '' }] }
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function ColorSwatch({ hex, size = 22 }: { hex: string; size?: number }) {
  const border = hex.toLowerCase() === '#ffffff' ? '#D1D5DB' : 'transparent'
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: hex, borderWidth: 1, borderColor: border,
    }} />
  )
}

interface Props {
  visible: boolean
  supplierItemId: string
  existingGroups: VariantGroup[]
  onClose: () => void
  onGenerated: (variants: SupplierItemVariant[]) => void
}

// ─── Custom hex input row ─────────────────────────────────────────────────────

function CustomColorRow({
  value,
  onAdd,
  colors,
}: {
  value: { name: string; hex: string }
  onAdd: (name: string, hex: string) => void
  colors: any
}) {
  const [name, setName] = useState('')
  const [hex, setHex]   = useState('#')

  const isValid = /^#[0-9A-Fa-f]{6}$/.test(hex) && name.trim().length > 0

  return (
    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 6 }}>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Color name"
        placeholderTextColor={colors.textSecondary}
        style={{ flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 9, color: colors.text, fontSize: 13, backgroundColor: colors.background }}
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <TextInput
          value={hex}
          onChangeText={(v) => setHex(v.startsWith('#') ? v : `#${v}`)}
          placeholder="#RRGGBB"
          placeholderTextColor={colors.textSecondary}
          maxLength={7}
          autoCapitalize="characters"
          style={{ width: 88, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 9, color: colors.text, fontSize: 13, fontFamily: 'monospace', backgroundColor: colors.background }}
        />
        {/^#[0-9A-Fa-f]{6}$/.test(hex) && <ColorSwatch hex={hex} />}
      </View>
      <TouchableOpacity
        onPress={() => {
          if (!isValid) return
          onAdd(name.trim(), hex)
          setName(''); setHex('#')
        }}
        disabled={!isValid}
        style={{ paddingHorizontal: 12, paddingVertical: 9, borderRadius: 8, backgroundColor: isValid ? colors.primary : colors.border }}
      >
        <Text style={{ fontSize: 12, fontWeight: '700', color: isValid ? '#fff' : colors.textSecondary }}>Add</Text>
      </TouchableOpacity>
    </View>
  )
}

// ─── Single group editor ──────────────────────────────────────────────────────

function GroupEditor({
  group, groupIndex, onUpdate, onRemove, orgId, colors,
}: {
  group: LocalGroup
  groupIndex: number
  onUpdate: (g: LocalGroup) => void
  onRemove: () => void
  orgId: string
  colors: any
}) {
  const colorMode = isColorGroup(group.name)

  const setName = (name: string) => onUpdate({ ...group, name })

  const updateOption = (oi: number, patch: Partial<LocalOption>) =>
    onUpdate({ ...group, options: group.options.map((o, i) => i === oi ? { ...o, ...patch } : o) })

  const addTextOption = () =>
    onUpdate({ ...group, options: [...group.options, { value: '', colorHex: '' }] })

  const removeOption = (oi: number) =>
    onUpdate({ ...group, options: group.options.filter((_, i) => i !== oi) })

  // Toggle a preset color chip on/off
  const togglePreset = (preset: { name: string; hex: string }) => {
    const existing = group.options.findIndex(
      o => o.value === preset.name && o.colorHex === preset.hex,
    )
    if (existing >= 0) {
      onUpdate({ ...group, options: group.options.filter((_, i) => i !== existing) })
    } else {
      onUpdate({ ...group, options: [...group.options, { value: preset.name, colorHex: preset.hex }] })
    }
  }

  const addCustomColor = (name: string, hex: string) =>
    onUpdate({ ...group, options: [...group.options, { value: name, colorHex: hex }] })

  // Per-option image pick
  const pickOptionImage = async (oi: number) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) { Alert.alert('Permission needed', 'Allow photo library access.'); return }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8, allowsEditing: true, aspect: [1, 1],
    })
    if (!result.canceled && result.assets?.[0]) {
      updateOption(oi, { imageAsset: result.assets[0] })
    }
  }

  const inp = {
    borderWidth: 1, borderColor: colors.border, borderRadius: 8,
    padding: 9, color: colors.text, fontSize: 13,
    backgroundColor: colors.background,
  }

  return (
    <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, overflow: 'hidden', marginBottom: 2 }}>
      {/* Group name row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, backgroundColor: colors.background }}>
        <TextInput
          value={group.name}
          onChangeText={setName}
          placeholder="Group name (e.g. Color, Size, Material)"
          placeholderTextColor={colors.textSecondary}
          style={[inp, { flex: 1 }]}
        />
        <TouchableOpacity onPress={onRemove} style={{ padding: 6 }}>
          <Trash2 size={15} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <View style={{ padding: 12, gap: 10 }}>
        {/* ── Color mode ── */}
        {colorMode ? (
          <>
            {/* Preset chips */}
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary, marginBottom: 2 }}>PRESET COLORS</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {PRESET_COLORS.map((p) => {
                const selected = group.options.some(o => o.value === p.name && o.colorHex === p.hex)
                return (
                  <TouchableOpacity
                    key={p.name}
                    onPress={() => togglePreset(p)}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 7,
                      paddingHorizontal: 10, paddingVertical: 7,
                      borderRadius: 8, borderWidth: selected ? 2 : 1,
                      borderColor: selected ? colors.primary : colors.border,
                      backgroundColor: selected ? `${colors.primary}14` : colors.surface,
                    }}
                  >
                    <ColorSwatch hex={p.hex} size={14} />
                    <Text style={{ fontSize: 12, fontWeight: selected ? '700' : '500', color: selected ? colors.primary : colors.text }}>
                      {p.name}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            {/* Selected summary + image per selected option */}
            {group.options.filter(o => o.value).length > 0 && (
              <View style={{ gap: 8, marginTop: 4 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary }}>SELECTED ({group.options.filter(o => o.value).length})</Text>
                {group.options.filter(o => o.value).map((opt, oi) => {
                  const realIndex = group.options.indexOf(opt)
                  const previewUri = opt.imageAsset?.uri ?? opt.imageUrl
                  return (
                    <View key={oi} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.background, borderRadius: 8, padding: 8 }}>
                      <ColorSwatch hex={opt.colorHex || '#CCCCCC'} size={18} />
                      <Text style={{ flex: 1, fontSize: 13, color: colors.text, fontWeight: '600' }}>{opt.value}</Text>
                      {/* Per-option image */}
                      <TouchableOpacity
                        onPress={() => pickOptionImage(realIndex)}
                        style={{
                          width: 38, height: 38, borderRadius: 8, overflow: 'hidden',
                          backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
                          alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        {previewUri
                          ? <Image source={{ uri: previewUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                          : <ImagePlus size={14} color={colors.textSecondary} />}
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => removeOption(realIndex)}>
                        <X size={14} color={colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  )
                })}
              </View>
            )}

            {/* Custom color */}
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary, marginTop: 4 }}>CUSTOM COLOR</Text>
            <CustomColorRow value={{ name: '', hex: '' }} onAdd={addCustomColor} colors={colors} />
          </>
        ) : (
          /* ── Text mode ── */
          <>
            {group.options.map((opt, oi) => {
              const previewUri = opt.imageAsset?.uri ?? opt.imageUrl
              return (
                <View key={oi} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <TextInput
                    value={opt.value}
                    onChangeText={(v) => updateOption(oi, { value: v })}
                    placeholder={`Option ${oi + 1} (e.g. Large, XL, Cotton)`}
                    placeholderTextColor={colors.textSecondary}
                    style={[inp, { flex: 1 }]}
                  />
                  {/* Per-option image */}
                  <TouchableOpacity
                    onPress={() => pickOptionImage(oi)}
                    style={{
                      width: 38, height: 38, borderRadius: 8, overflow: 'hidden',
                      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
                      alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {previewUri
                      ? <Image source={{ uri: previewUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                      : <ImagePlus size={13} color={colors.textSecondary} />}
                  </TouchableOpacity>
                  {group.options.length > 1 && (
                    <TouchableOpacity onPress={() => removeOption(oi)}>
                      <X size={14} color={colors.textSecondary} />
                    </TouchableOpacity>
                  )}
                </View>
              )
            })}
            <TouchableOpacity onPress={addTextOption} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 }}>
              <Plus size={13} color={colors.primary} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>Add option</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  )
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export function VariantGeneratorModal({
  visible, supplierItemId, existingGroups, onClose, onGenerated,
}: Props) {
  const { colors } = useTheme()
  const { user } = useAuth()

  const [groups, setGroups] = useState<LocalGroup[]>([emptyGroup()])
  const [basePrice, setBasePrice] = useState('')
  const [baseCost, setBaseCost]   = useState('')
  const [generating, setGenerating] = useState(false)

  // Reset when modal opens
  useEffect(() => {
    if (visible) {
      setGroups([emptyGroup()])
      setBasePrice(''); setBaseCost('')
    }
  }, [visible])

  // Live Cartesian count for preview
  const cartesianCount = groups.reduce((acc, g) => {
    const filled = g.options.filter(o => o.value.trim()).length
    return filled > 0 ? acc * filled : acc
  }, 1)

  const updateGroup = (gi: number, g: LocalGroup) =>
    setGroups(prev => prev.map((x, i) => i === gi ? g : x))

  const removeGroup = (gi: number) =>
    setGroups(prev => prev.filter((_, i) => i !== gi))

  const addGroup = () => setGroups(prev => [...prev, emptyGroup()])

  // Upload all pending images before creating the group on the server.
  const uploadPendingImages = async (group: LocalGroup): Promise<LocalGroup> => {
    if (!user?.orgId) return group
    const updatedOptions = await Promise.all(
      group.options.map(async (opt) => {
        if (!opt.imageAsset) return opt
        try {
          const { publicUrl } = await MediaService.uploadMedia(
            {
              uri: opt.imageAsset.uri,
              name: opt.imageAsset.fileName || `variant_opt_${Date.now()}.jpg`,
              type: opt.imageAsset.mimeType || 'image/jpeg',
            },
            String(user.orgId),
          )
          return { ...opt, imageUrl: publicUrl, imageAsset: null }
        } catch {
          // Non-blocking — variant still created, image can be set later
          return opt
        }
      }),
    )
    return { ...group, options: updatedOptions }
  }

  const handleGenerate = async () => {
    const price = parseFloat(basePrice)
    if (isNaN(price) || price <= 0) {
      Alert.alert('Price required', 'Enter a base price greater than 0.')
      return
    }
    const validGroups = groups.filter(
      g => g.name.trim() && g.options.some(o => o.value.trim()),
    )
    if (validGroups.length === 0) {
      Alert.alert('No groups', 'Add at least one group with at least one option.')
      return
    }

    setGenerating(true)
    try {
      // 1. Upload pending images for all groups, then create groups on the server
      for (const group of validGroups) {
        const withUploads = await uploadPendingImages(group)
        await createVariantGroup({
          supplierItemId,
          name: withUploads.name.trim(),
          options: withUploads.options
            .filter(o => o.value.trim())
            .map((o, i) => ({
              value: o.value.trim(),
              colorHex: o.colorHex || undefined,
              image: o.imageUrl || undefined,
              sortOrder: i,
            })),
        })
      }

      // 2. Generate Cartesian combinations on the server
      const result = await generateVariants({
        supplierItemId,
        basePrice: price,
        baseCost: baseCost ? parseFloat(baseCost) : null,
      })

      onGenerated(result.variants)
      Alert.alert(
        'Variants generated',
        `Created ${result.created} variant${result.created !== 1 ? 's' : ''}${result.skipped ? `, skipped ${result.skipped} duplicate${result.skipped !== 1 ? 's' : ''}` : ''}.`,
      )
      onClose()
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to generate variants.')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <FadeDialogModal visible={visible} onRequestClose={onClose} maxWidth={680}>
      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 10,
        padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border,
      }}>
        <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: `${colors.primary}18`, alignItems: 'center', justifyContent: 'center' }}>
          <Zap size={17} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>Variant Generator</Text>
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>
            Define groups · select options · generate all combinations automatically.
          </Text>
        </View>
        <TouchableOpacity onPress={onClose} disabled={generating}>
          <X size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
        {/* Group editors */}
        {groups.map((g, gi) => (
          <GroupEditor
            key={gi}
            group={g}
            groupIndex={gi}
            onUpdate={(updated) => updateGroup(gi, updated)}
            onRemove={() => removeGroup(gi)}
            orgId={String(user?.orgId ?? '')}
            colors={colors}
          />
        ))}

        {/* Add group button */}
        <TouchableOpacity
          onPress={addGroup}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 8,
            paddingVertical: 11, paddingHorizontal: 14,
            borderWidth: 1, borderColor: colors.border,
            borderRadius: 10, borderStyle: 'dashed', justifyContent: 'center',
          }}
        >
          <Plus size={14} color={colors.primary} />
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>Add group</Text>
        </TouchableOpacity>

        {/* Live preview */}
        {cartesianCount > 1 && (
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 8,
            backgroundColor: `${colors.primary}0C`, borderRadius: 10, padding: 12,
          }}>
            <Zap size={14} color={colors.primary} />
            <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '700' }}>
              Will generate {cartesianCount} variant{cartesianCount !== 1 ? 's' : ''}
            </Text>
          </View>
        )}

        {/* Base pricing */}
        <View style={{ gap: 6 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary, letterSpacing: 0.4 }}>BASE PRICING</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 4 }}>Selling Price (₱) *</Text>
              <TextInput
                value={basePrice} onChangeText={setBasePrice}
                placeholder="0.00" keyboardType="decimal-pad"
                placeholderTextColor={colors.textSecondary}
                style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, color: colors.text, fontSize: 13, backgroundColor: colors.background }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 4 }}>Cost (₱)</Text>
              <TextInput
                value={baseCost} onChangeText={setBaseCost}
                placeholder="0.00" keyboardType="decimal-pad"
                placeholderTextColor={colors.textSecondary}
                style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, color: colors.text, fontSize: 13, backgroundColor: colors.background }}
              />
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={{ flexDirection: 'row', gap: 10, padding: 14, borderTopWidth: 1, borderTopColor: colors.border }}>
        <TouchableOpacity
          onPress={onClose} disabled={generating}
          style={{ flex: 1, padding: 13, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: colors.border }}
        >
          <Text style={{ fontWeight: '700', color: colors.text }}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleGenerate} disabled={generating}
          style={{
            flex: 2, padding: 13, borderRadius: 10, alignItems: 'center',
            backgroundColor: generating ? colors.border : colors.primary,
          }}
        >
          {generating
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={{ fontWeight: '700', color: '#fff' }}>
                Generate {cartesianCount > 1 ? `${cartesianCount} Variants` : 'Variants'}
              </Text>}
        </TouchableOpacity>
      </View>
    </FadeDialogModal>
  )
}
