/**
 * MediaBuilder — Alibaba-inspired product media manager.
 * Features:
 * - Large banner preview (tap opens the zoomable PreviewModal)
 * - Horizontal thumbnail gallery with REAL drag-and-drop reordering
 *   (spring animation, items slide out of the way live as you drag)
 * - Upload multiple images
 * - Replace image
 * - Delete image
 * - "Make Primary" action
 * - First image by sortOrder automatically becomes SupplierItem.image
 * - Support up to 10 images
 * - Mobile + Tablet + Desktop responsive
 */
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  ActivityIndicator,
  Animated,
  PanResponder,
  Platform,
} from 'react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { useToast } from '@/contexts/ToastContext'
import { MediaService } from '@/services/mediaService'
import * as ImagePicker from 'expo-image-picker'
import { Plus, GripVertical, Camera, Expand } from 'lucide-react-native'
import { PreviewModal } from '@/components/PreviewModal'
import type { SupplierItemImage } from '@/types'
import { WholesaleService} from '@/services/wholesaleService'
interface Props {
  supplierItemId: string
  images: SupplierItemImage[]
  onUpdated: (images: SupplierItemImage[], primaryImageUrl?: string) => void
  editable?: boolean
  orgId: string | number
}

const THUMB_SIZE = 80
const THUMB_GAP = 12
const STEP = THUMB_SIZE + THUMB_GAP

// ---------------------------------------------------------------------
// Broken image placeholder + guarded <Image>
// ---------------------------------------------------------------------
function BrokenImagePlaceholder({ colors }: { colors: any }) {
  return (
    <View
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
      }}
    >
      <Camera size={20} color={colors.textSecondary} />
      <Text style={{ fontSize: 9, color: colors.textSecondary }}>Failed to load</Text>
    </View>
  )
}

function MediaImage({
  uri,
  style,
  resizeMode = 'cover',
}: {
  uri: string
  style?: any
  resizeMode?: 'cover' | 'contain'
}) {
  const { colors } = useTheme()
  const [hasError, setHasError] = React.useState(false)

  if (hasError) {
    return (
      <View style={[style, { backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }]}>
        <BrokenImagePlaceholder colors={colors} />
      </View>
    )
  }

  return (
    <Image
      source={{ uri }}
      style={style}
      resizeMode={resizeMode}
      onError={(e) => {
        console.warn('Media image failed to load:', uri, e.nativeEvent)
        setHasError(true)
      }}
    />
  )
}

// ---------------------------------------------------------------------
// MediaBuilder
// ---------------------------------------------------------------------
export function MediaBuilder({ supplierItemId, images, onUpdated, editable = true, orgId }: Props) {
  const { colors } = useTheme()
  const toast = useToast()
  const [itemImages, setItemImages] = useState<SupplierItemImage[]>(images)
  const [uploading, setUploading] = useState(false)
  const [selectedImageId, setSelectedImageId] = useState<number | null>(null)
  const [previewVisible, setPreviewVisible] = useState(false)
  // activeIndex tracks which thumbnail's image is shown in the banner
  const [activeIndex, setActiveIndex] = useState(0)

  // Sync with props - controlled component pattern.
  // Skip the sync right after our own optimistic updates.
  const isControlledUpdate = useRef(false)
  useEffect(() => {
    if (!isControlledUpdate.current) {
      setItemImages(images)
      setSelectedImageId(null)
      setActiveIndex(0)
    }
    isControlledUpdate.current = false
  }, [images])

  const sortedImages = [...itemImages].sort((a, b) => a.sortOrder - b.sortOrder)
  const bannerImage = sortedImages[activeIndex]?.url || sortedImages[0]?.url

  const uploadImage = useCallback(async () => {
    if (!editable || itemImages.length >= 10) return

    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!perm.granted) {
        toast.show('Photo library access is required.', 'warning')
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
        allowsMultipleSelection: true,
      })

      if (result.canceled) return

      setUploading(true)
      const uploadedImages: SupplierItemImage[] = []

      for (const asset of result.assets) {
        const { publicUrl } = await MediaService.uploadMedia(
          {
            uri: asset.uri,
            name: asset.fileName || `product_${Date.now()}.jpg`,
            type: asset.mimeType || 'image/jpeg',
          },
          String(orgId)
        )
        uploadedImages.push({
          id: Date.now() + Math.random(),
          supplierItemId,
          url: publicUrl,
          sortOrder: itemImages.length + uploadedImages.length,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      }

      const updated = [...itemImages, ...uploadedImages]
      setItemImages(updated)
      const newPrimaryUrl = updated.length === 1 ? uploadedImages[0].url : bannerImage
      onUpdated(updated, newPrimaryUrl)
      isControlledUpdate.current = true
      toast.show(`${uploadedImages.length} image(s) uploaded`, 'success')
    } catch (e: any) {
      toast.show(`Upload failed: ${e.message}`, 'error')
    } finally {
      setUploading(false)
    }
  }, [editable, itemImages, orgId, supplierItemId, toast, bannerImage, onUpdated])

  const deleteImage = useCallback(
    (id: number) => {
      if (!editable) return

      setItemImages((prev) => {
        const remaining = prev.filter((img) => img.id !== id)
        const newPrimary = remaining[0]?.url
        onUpdated(remaining, newPrimary)
        if (selectedImageId === id) setSelectedImageId(null)
        if (activeIndex >= remaining.length) setActiveIndex(0)
        isControlledUpdate.current = true
        return remaining
      })
    },
    [editable, onUpdated, selectedImageId, activeIndex]
  )

  const makePrimary = useCallback(
    (id: number) => {
      if (!editable) return

      setItemImages((prev) => {
        const idx = prev.findIndex((img) => img.id === id)
        if (idx === 0) return prev

        const reordered = prev.map((img, i) => ({
          ...img,
          sortOrder: i === idx ? 0 : i < idx ? img.sortOrder + 1 : img.sortOrder - 1,
        }))

        const newPrimary = reordered.find((img) => img.sortOrder === 0)?.url
        onUpdated(reordered, newPrimary)
        isControlledUpdate.current = true
        setActiveIndex(0)
        return reordered
      })
    },
    [editable, onUpdated]
  )

  const replaceImage = useCallback(
    async (id: number) => {
      if (!editable) return

      try {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
        if (!perm.granted) return

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.85,
        })

        if (result.canceled || !result.assets[0]) return

        setUploading(true)
        const { publicUrl } = await MediaService.uploadMedia(
          {
            uri: result.assets[0].uri,
            name: result.assets[0].fileName || `product_${Date.now()}.jpg`,
            type: result.assets[0].mimeType || 'image/jpeg',
          },
          String(orgId)
        )

        setItemImages((prev) => {
          const updated = prev.map((img) =>
            img.id === id ? { ...img, url: publicUrl, updatedAt: new Date().toISOString() } : img
          )
          onUpdated(updated, prev.find((img) => img.sortOrder === 0)?.url)
          isControlledUpdate.current = true
          return updated
        })
        toast.show('Image replaced', 'success')
      } catch (e: any) {
        toast.show(`Replace failed: ${e.message}`, 'error')
      } finally {
        setUploading(false)
      }
    },
    [editable, orgId, toast, onUpdated]
  )

  // Fired once, when a drag (or a web arrow click) settles into a final order.
  const handleReorderEnd = useCallback(
    (orderedIds: number[]) => {
      setItemImages((prev) => {
        const currentActiveId = sortedImages[activeIndex]?.id
        const byId = new Map(prev.map((img) => [img.id, img]))
        const reordered = orderedIds.map((id) => byId.get(id)).filter(Boolean) as SupplierItemImage[]
        const withSortOrder = reordered.map((img, i) => ({ ...img, sortOrder: i }))

        const newPrimaryUrl = withSortOrder[0]?.url
        onUpdated(withSortOrder, newPrimaryUrl)
        isControlledUpdate.current = true

        // Keep the banner following the same photo it was showing, not slot 0.
        const newActiveIdx = withSortOrder.findIndex((img) => img.id === currentActiveId)
        setActiveIndex(newActiveIdx === -1 ? 0 : newActiveIdx)

        return withSortOrder
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeIndex]
  )

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.text, borderBottomColor: colors.border }]}>
        Product Media
      </Text>

      {/* Banner Preview — tapping this (and only this) opens the zoomable PreviewModal */}
      <View style={[styles.bannerContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {bannerImage ? (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setPreviewVisible(true)}
            style={{ width: '100%', height: '100%' }}
          >
            <MediaImage uri={bannerImage} style={styles.bannerImage} resizeMode="cover" />
            <View style={styles.expandOverlay}>
              <Expand size={20} color="#fff" />
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.emptyBanner}>
            <Camera size={32} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No images added</Text>
          </View>
        )}
      </View>

      {/* Thumbnail Gallery */}
      <View style={styles.galleryHeader}>
        <Text style={[styles.galleryTitle, { color: colors.textSecondary }]}>
          {Platform.OS === 'web' ? 'Images (Use arrows to reorder)' : 'Images (Drag to Reorder)'}
        </Text>
        <Text style={[styles.imageCount, { color: colors.textSecondary }]}>{sortedImages.length} / 10</Text>
      </View>

      <DraggableImageRow
        images={sortedImages}
        selectedImageId={selectedImageId}
        editable={editable}
        uploading={uploading}
        colors={colors}
        onAdd={uploadImage}
        onSelect={(id) => {
          setSelectedImageId(id)
          const idx = sortedImages.findIndex((img) => img.id === id)
          if (idx !== -1) setActiveIndex(idx)
        }}
        onReorderEnd={handleReorderEnd}
      />

      {/* Selected Image Actions */}
      {selectedImageId && editable && (
        <View style={styles.actionPanel}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.primary }]}
              onPress={() => makePrimary(selectedImageId)}
            >
              <Text style={styles.actionBtnText}>Make Primary</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
              onPress={() => replaceImage(selectedImageId)}
            >
              <Text style={[styles.actionBtnText, { color: colors.text }]}>Replace</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#FEF2F2' }]}
              onPress={() => deleteImage(selectedImageId)}
            >
              <Text style={[styles.actionBtnText, { color: '#DC2626' }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Fullscreen zoomable preview — banner tap only */}
      <PreviewModal
        visible={previewVisible}
        onClose={() => setPreviewVisible(false)}
        uri={bannerImage ?? ''}
        fileName={sortedImages.length ? `Image ${activeIndex + 1} of ${sortedImages.length}` : 'Preview'}
        isImage
      />
    </View>
  )
}

// ---------------------------------------------------------------------
// DraggableImageRow — owns live drag order + spring animations
// ---------------------------------------------------------------------
interface DraggableRowProps {
  images: SupplierItemImage[] // already sorted by sortOrder
  selectedImageId: number | null
  editable: boolean
  uploading: boolean
  colors: any
  onAdd: () => void
  onSelect: (id: number) => void
  onReorderEnd: (orderedIds: number[]) => void
}

function DraggableImageRow({
  images,
  selectedImageId,
  editable,
  uploading,
  colors,
  onAdd,
  onSelect,
  onReorderEnd,
}: DraggableRowProps) {
  const [order, setOrder] = useState<number[]>(() => images.map((i) => i.id))
  const [activeDragId, setActiveDragId] = useState<number | null>(null)

  const byId = useMemo(() => {
    const m: Record<number, SupplierItemImage> = {}
    images.forEach((img) => {
      m[img.id] = img
    })
    return m
  }, [images])

  // Fresh snapshot readable from inside gesture callbacks (avoids stale closures
  // without having to recreate PanResponders every render).
  const latest = useRef({ order, images })
  useEffect(() => {
    latest.current = { order, images }
  }, [order, images])

  // Resync local order when the underlying image SET changes (upload/delete),
  // but never mid-drag, and never just because order changed (we own that).
  useEffect(() => {
    if (activeDragId != null) return
    const incomingIds = images.map((i) => i.id)
    setOrder((prev) => {
      const sameSet = prev.length === incomingIds.length && incomingIds.every((id) => prev.includes(id))
      return sameSet ? prev : incomingIds
    })
  }, [images, activeDragId])

  // One persistent Animated.Value per id = its horizontal "slot" position.
  const leftAnims = useRef<Record<number, Animated.Value>>({}).current
  const getLeftAnim = (id: number, initialIndex: number) => {
    if (!leftAnims[id]) leftAnims[id] = new Animated.Value(initialIndex * STEP)
    return leftAnims[id]
  }

  // Whenever order changes, spring every NON-dragged item into its new slot.
  useEffect(() => {
    order.forEach((id, idx) => {
      if (id === activeDragId) return
      Animated.spring(getLeftAnim(id, idx), {
        toValue: idx * STEP,
        useNativeDriver: true,
        friction: 8,
        tension: 80,
      }).start()
    })
  }, [order, activeDragId])

  const dragStartLeft = useRef(0)
  const lastIndex = useRef(0)

  const handleDragStart = useCallback((id: number) => {
    const idx = latest.current.order.indexOf(id)
    dragStartLeft.current = idx * STEP
    lastIndex.current = idx
    setActiveDragId(id)
  }, [])

  const handleDragMove = useCallback((id: number, dx: number) => {
    const count = latest.current.images.length
    const proposed = Math.round((dragStartLeft.current + dx) / STEP)
    const clamped = Math.max(0, Math.min(count - 1, proposed))
    if (clamped !== lastIndex.current) {
      lastIndex.current = clamped
      setOrder((prev) => {
        const from = prev.indexOf(id)
        if (from === -1 || from === clamped) return prev
        const next = [...prev]
        next.splice(from, 1)
        next.splice(clamped, 0, id)
        return next
      })
    }
  }, [])

  const handleDragEnd = useCallback(
    (_id: number) => {
      setActiveDragId(null)
      setOrder((current) => {
        onReorderEnd(current)
        return current
      })
    },
    [onReorderEnd]
  )

  const handleWebMove = useCallback(
    (id: number, direction: -1 | 1) => {
      setOrder((prev) => {
        const from = prev.indexOf(id)
        const to = Math.max(0, Math.min(prev.length - 1, from + direction))
        if (to === from) return prev
        const next = [...prev]
        next.splice(from, 1)
        next.splice(to, 0, id)
        onReorderEnd(next)
        return next
      })
    },
    [onReorderEnd]
  )

  const rowWidth = (order.length + 1) * STEP // +1 slot reserved for the add button

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      scrollEnabled={activeDragId == null}
      contentContainerStyle={{ paddingVertical: 4 }}
    >
      <View style={[styles.thumbnailsRow, { width: rowWidth }]}>
        {order.map((id, idx) => {
          const img = byId[id]
          if (!img) return null
          return (
            <DraggableThumb
              key={id}
              id={id}
              image={img}
              index={idx}
              isLast={idx === order.length - 1}
              isPrimary={idx === 0}
              isSelected={id === selectedImageId}
              isDragging={id === activeDragId}
              editable={editable}
              leftAnim={getLeftAnim(id, idx)}
              onSelect={() => onSelect(id)}
              onDragStart={handleDragStart}
              onDragMove={handleDragMove}
              onDragEnd={handleDragEnd}
              onWebMove={handleWebMove}
              colors={colors}
            />
          )
        })}

        {editable && (
          <TouchableOpacity
            style={[
              styles.addThumbnail,
              {
                position: 'absolute',
                top: 0,
                left: order.length * STEP,
                backgroundColor: colors.background,
                borderColor: colors.border,
              },
            ]}
            onPress={onAdd}
            disabled={uploading || order.length >= 10}
          >
            {uploading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Plus size={24} color={colors.primary} />
            )}
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  )
}

// ---------------------------------------------------------------------
// DraggableThumb — a single thumbnail; owns its own PanResponder
// ---------------------------------------------------------------------
interface DraggableThumbProps {
  id: number
  image: SupplierItemImage
  index: number
  isLast: boolean
  isPrimary: boolean
  isSelected: boolean
  isDragging: boolean
  editable: boolean
  leftAnim: Animated.Value
  onSelect: () => void
  onDragStart: (id: number) => void
  onDragMove: (id: number, dx: number) => void
  onDragEnd: (id: number) => void
  onWebMove: (id: number, direction: -1 | 1) => void
  colors: any
}

function DraggableThumb({
  id,
  image,
  index,
  isLast,
  isPrimary,
  isSelected,
  isDragging,
  editable,
  leftAnim,
  onSelect,
  onDragStart,
  onDragMove,
  onDragEnd,
  onWebMove,
  colors,
}: DraggableThumbProps) {
  const dragX = useRef(new Animated.Value(0)).current
  const liftAnim = useRef(new Animated.Value(1)).current
  const moved = useRef(false)

  // Native: the whole thumbnail is the drag surface. Tap-vs-drag is
  // decided on release (if the finger never moved past a small slop,
  // it's treated as a tap/select instead of a reorder).
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => editable && Platform.OS !== 'web',
      onPanResponderGrant: () => {
        moved.current = false
        dragX.setValue(0)
        Animated.spring(liftAnim, { toValue: 1.08, useNativeDriver: true, friction: 6 }).start()
        onDragStart(id)
      },
      onPanResponderMove: (_e, gesture) => {
        if (Math.abs(gesture.dx) > 4 || Math.abs(gesture.dy) > 4) moved.current = true
        dragX.setValue(gesture.dx)
        onDragMove(id, gesture.dx)
      },
      onPanResponderRelease: () => {
        Animated.spring(liftAnim, { toValue: 1, useNativeDriver: true, friction: 6 }).start()
        Animated.spring(dragX, { toValue: 0, useNativeDriver: true, friction: 8, tension: 80 }).start()
        if (!moved.current) onSelect()
        onDragEnd(id)
      },
      onPanResponderTerminate: () => {
        Animated.spring(liftAnim, { toValue: 1, useNativeDriver: true }).start()
        Animated.spring(dragX, { toValue: 0, useNativeDriver: true }).start()
        onDragEnd(id)
      },
    })
  ).current

  return (
    <Animated.View
      style={[
        styles.thumbnailWrapper,
        {
          position: 'absolute',
          top: 0,
          zIndex: isDragging ? 10 : 1,
          elevation: isDragging ? 6 : 0,
          shadowOpacity: isDragging ? 0.25 : 0,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
          borderColor: isSelected ? colors.primary : 'transparent',
          borderWidth: isSelected ? 2 : 0,
          transform: [{ translateX: Animated.add(leftAnim, dragX) }, { scale: liftAnim }],
        },
      ]}
      {...(Platform.OS !== 'web' ? panResponder.panHandlers : {})}
    >
      {Platform.OS === 'web' ? (
        <TouchableOpacity activeOpacity={0.8} onPress={onSelect} style={{ width: '100%', height: '100%' }}>
          <MediaImage uri={image.url} style={styles.thumbnail} />
        </TouchableOpacity>
      ) : (
        <MediaImage uri={image.url} style={styles.thumbnail} />
      )}

      {isPrimary && (
        <View style={[styles.primaryBadge, { backgroundColor: colors.primary }]}>
          <Text style={styles.primaryBadgeText}>Primary</Text>
        </View>
      )}

      {editable && Platform.OS !== 'web' && (
        <View style={styles.thumbnailActions}>
          <GripVertical size={14} color="rgba(255,255,255,0.9)" />
        </View>
      )}

      {editable && Platform.OS === 'web' && (
        <View style={styles.webReorderControls}>
          {index > 0 && (
            <TouchableOpacity onPress={() => onWebMove(id, -1)} style={styles.reorderArrow}>
              <Text style={{ color: colors.primary, fontSize: 10 }}>{'←'}</Text>
            </TouchableOpacity>
          )}
          {!isLast && (
            <TouchableOpacity onPress={() => onWebMove(id, 1)} style={styles.reorderArrow}>
              <Text style={{ color: colors.primary, fontSize: 10 }}>{'→'}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: { gap: 16 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  bannerContainer: {
    height: 300,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  expandOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 4,
    padding: 4,
  },
  emptyBanner: {
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
  },
  galleryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  galleryTitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  imageCount: {
    fontSize: 12,
  },
  thumbnailsRow: {
    height: THUMB_SIZE,
    position: 'relative',
  },
  thumbnailWrapper: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 8,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  primaryBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  primaryBadgeText: {
    fontSize: 9,
    color: '#fff',
    fontWeight: '700',
  },
  thumbnailActions: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    padding: 2,
  },
  webReorderControls: {
    position: 'absolute',
    top: 2,
    left: 2,
    flexDirection: 'row',
    gap: 2,
  },
  reorderArrow: {
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 2,
    paddingHorizontal: 2,
  },
  addThumbnail: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionPanel: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    paddingTop: 12,
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
})