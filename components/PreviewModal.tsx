import React, { useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Animated,
  Image,
  Linking,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native'
import { X, RotateCcw, ExternalLink, FileText, AlertCircle } from 'lucide-react-native'

interface PreviewModalProps {
  visible: boolean
  onClose: () => void
  /** File to preview — usually document.fileUrl */
  uri: string
  /** Shown in the header and as the fallback label for non-images */
  fileName?: string
  /**
   * Pass an explicit true/false if you already know the file type.
   * If omitted, it's inferred from the uri's extension.
   */
  isImage?: boolean
}

const IMAGE_EXT = /\.(jpe?g|png|webp|gif|heic|bmp)$/i
const SCALE_MIN = 1
const SCALE_MAX = 4
const DOUBLE_TAP_MS = 280
const TAP_SLOP = 8 // px of movement still counted as a "tap" not a drag

/**
 * Fullscreen preview for a single file, with pinch-to-zoom, drag-to-pan
 * once zoomed, mouse-wheel zoom (web), double-tap to reset, and an
 * explicit reset button. Images default to a bounded "fit" size (capped
 * width/height) rather than stretching edge-to-edge — zoom is what takes
 * it further.
 *
 * Anything that isn't an image (pdf, docx, etc.) skips all of this and
 * shows a file icon + "Open File" button instead.
 *
 * Usage:
 *   const [previewVisible, setPreviewVisible] = useState(false)
 *   <TouchableOpacity onPress={() => setPreviewVisible(true)}>...</TouchableOpacity>
 *   <PreviewModal
 *     visible={previewVisible}
 *     onClose={() => setPreviewVisible(false)}
 *     uri={document.fileUrl}
 *     fileName={requirement.label}
 *   />
 */
export function PreviewModal({ visible, onClose, uri, fileName, isImage }: PreviewModalProps) {
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [zoomed, setZoomed] = useState(false)
  const resolvedIsImage = isImage ?? IMAGE_EXT.test(uri)
  const { width: winW, height: winH } = useWindowDimensions()

  // Default bounded box the image sits in before any zoom — this is what
  // gives the "don't stretch full screen by default" behavior. resizeMode
  // "contain" then fits the image's real aspect ratio inside this box.
  const box = useMemo(() => ({ width: winW * 0.92, height: winH * 0.72 }), [winW, winH])

  // Page-space rect of the body area, captured via measureInWindow so we
  // can tell whether a tap landed on the image box or the empty backdrop
  // around it — without nesting a separate Pressable (see note below).
  const bodyRef = useRef<View>(null)
  const bodyRect = useRef({ x: 0, y: 0, width: winW, height: winH })

  // --- zoom/pan state -------------------------------------------------
  // Animated values drive the transform without re-rendering on every
  // touch move. Plain refs mirror the same numbers so we can read/clamp
  // them synchronously (Animated.Value can't be read synchronously).
  const scaleAnim = useRef(new Animated.Value(SCALE_MIN)).current
  const translateAnim = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current
  const scaleRef = useRef(SCALE_MIN)
  const translateRef = useRef({ x: 0, y: 0 })

  // Gesture bookkeeping, reset at the start of each touch sequence.
  const pinchStartDistance = useRef<number | null>(null)
  const pinchStartScale = useRef(SCALE_MIN)
  const panStartPoint = useRef<{ x: number; y: number } | null>(null)
  const panStartTranslate = useRef({ x: 0, y: 0 })
  const gestureMoved = useRef(false)
  const lastTapAt = useRef(0)

  const resetView = (animated = true) => {
    scaleRef.current = SCALE_MIN
    translateRef.current = { x: 0, y: 0 }
    setZoomed(false)
    if (animated) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: SCALE_MIN, useNativeDriver: true }),
        Animated.spring(translateAnim, { toValue: { x: 0, y: 0 }, useNativeDriver: true }),
      ]).start()
    } else {
      scaleAnim.setValue(SCALE_MIN)
      translateAnim.setValue({ x: 0, y: 0 })
    }
  }

  const clampTranslate = (scale: number, x: number, y: number) => {
    // How far the scaled box overhangs the window — that's how far we're
    // allowed to pan before the edge would show empty space.
    const maxX = Math.max((box.width * scale - winW) / 2, 0)
    const maxY = Math.max((box.height * scale - box.height) / 2, 0)
    return {
      x: Math.min(maxX, Math.max(-maxX, x)),
      y: Math.min(maxY, Math.max(-maxY, y)),
    }
  }

  const distanceBetween = (touches: any[]) => {
    const [a, b] = touches
    const dx = a.pageX - b.pageX
    const dy = a.pageY - b.pageY
    return Math.sqrt(dx * dx + dy * dy)
  }

  const applyZoomDelta = (factor: number, animated = true) => {
    const next = Math.min(SCALE_MAX, Math.max(SCALE_MIN, scaleRef.current * factor))
    scaleRef.current = next
    setZoomed(next > SCALE_MIN)
    const clamped = clampTranslate(next, translateRef.current.x, translateRef.current.y)
    translateRef.current = clamped
    if (animated) {
      Animated.parallel([
        Animated.timing(scaleAnim, { toValue: next, duration: 120, useNativeDriver: true }),
        Animated.timing(translateAnim, { toValue: clamped, duration: 120, useNativeDriver: true }),
      ]).start()
    } else {
      scaleAnim.setValue(next)
      translateAnim.setValue(clamped)
    }
  }

  // True if a page-space point (x, y) falls inside the centered image box.
  // Used on release to tell "tapped the backdrop, close" apart from
  // "tapped/dragged the image, don't close" — all from ONE responder,
  // which is what actually fixes the drag-closes-the-modal bug: there's
  // no separate Pressable underneath competing for the same touch.
  const isPointInImageBox = (x: number, y: number) => {
    const left = bodyRect.current.x + (bodyRect.current.width - box.width) / 2
    const top = bodyRect.current.y + (bodyRect.current.height - box.height) / 2
    return x >= left && x <= left + box.width && y >= top && y <= top + box.height
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_evt, gestureState) =>
        Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2,

      onPanResponderGrant: () => {
        pinchStartDistance.current = null
        panStartPoint.current = null
        gestureMoved.current = false
      },

      onPanResponderMove: (evt, gestureState) => {
        const touches = evt.nativeEvent.touches
        if (Math.abs(gestureState.dx) > TAP_SLOP || Math.abs(gestureState.dy) > TAP_SLOP) {
          gestureMoved.current = true
        }

        if (touches.length === 2) {
          // Pinch: scale relative to the distance when the second finger landed.
          const dist = distanceBetween(touches)
          if (pinchStartDistance.current == null) {
            pinchStartDistance.current = dist
            pinchStartScale.current = scaleRef.current
          } else {
            const next = Math.min(
              SCALE_MAX,
              Math.max(SCALE_MIN, pinchStartScale.current * (dist / pinchStartDistance.current))
            )
            scaleRef.current = next
            scaleAnim.setValue(next)
          }
        } else if (touches.length === 1 && scaleRef.current > SCALE_MIN) {
          // Drag to pan — only once zoomed in, otherwise a single-finger
          // drag over the image does nothing (and importantly, no longer
          // risks closing the modal — see isPointInImageBox above).
          if (panStartPoint.current == null) {
            panStartPoint.current = { x: gestureState.moveX, y: gestureState.moveY }
            panStartTranslate.current = { ...translateRef.current }
          }
          const dx = gestureState.moveX - panStartPoint.current.x
          const dy = gestureState.moveY - panStartPoint.current.y
          const next = {
            x: panStartTranslate.current.x + dx,
            y: panStartTranslate.current.y + dy,
          }
          translateRef.current = next
          translateAnim.setValue(next)
        }
      },

      onPanResponderRelease: (evt, gestureState) => {
        // Snap zoom/pan back in bounds (or all the way to 1x if pinched below it).
        if (scaleRef.current <= SCALE_MIN) {
          resetView()
        } else {
          const clamped = clampTranslate(scaleRef.current, translateRef.current.x, translateRef.current.y)
          translateRef.current = clamped
          setZoomed(true)
          Animated.spring(translateAnim, { toValue: clamped, useNativeDriver: true }).start()
        }

        if (!gestureMoved.current) {
          // It was a tap, not a drag/pinch.
          const now = Date.now()
          if (now - lastTapAt.current < DOUBLE_TAP_MS) {
            lastTapAt.current = 0
            if (scaleRef.current > SCALE_MIN) {
              resetView()
            } else {
              applyZoomDelta(2.5)
            }
          } else {
            lastTapAt.current = now
            // Single tap so far (might still become a double-tap). Only
            // the backdrop around the image closes the modal on tap —
            // tapping the image itself never does, zoomed or not.
            if (!isPointInImageBox(gestureState.x0, gestureState.y0)) {
              onClose()
            }
          }
        }

        pinchStartDistance.current = null
        panStartPoint.current = null
      },
    })
  ).current

  // Web only — RN ignores unknown DOM props like onWheel on native, so
  // this is safe to always pass. Scroll/pinch-on-trackpad zooms in place.
  const handleWheel = (event: any) => {
    event.preventDefault?.()
    const factor = event.deltaY < 0 ? 1.1 : 0.9
    applyZoomDelta(factor)
  }

  const handleShow = () => {
    setLoading(true)
    setFailed(false)
    resetView(false)
  }

  const handleBodyLayout = () => {
    bodyRef.current?.measureInWindow((x, y, width, height) => {
      bodyRect.current = { x, y, width, height }
    })
  }

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose} onShow={handleShow}>
      <View style={styles.backdrop}>
        <View style={styles.header}>
          <Text style={styles.headerText} numberOfLines={1}>
            {fileName ?? 'Preview'}
          </Text>
          <View style={styles.headerActions}>
            {resolvedIsImage && !failed && (
              <Pressable
                onPress={() => resetView()}
                hitSlop={12}
                style={[styles.iconButton, !zoomed && styles.iconButtonDisabled]}
              >
                <RotateCcw size={19} color="#fff" />
              </Pressable>
            )}
            <Pressable onPress={onClose} hitSlop={12} style={styles.iconButton}>
              <X size={22} color="#fff" />
            </Pressable>
          </View>
        </View>

        {resolvedIsImage && !failed ? (
          <View
            ref={bodyRef}
            onLayout={handleBodyLayout}
            style={styles.body}
            {...panResponder.panHandlers}
            onWheel={handleWheel as any}
          >
            <Animated.View
              style={[
                styles.imageWrap,
                {
                  width: box.width,
                  height: box.height,
                  transform: [
                    { translateX: translateAnim.x },
                    { translateY: translateAnim.y },
                    { scale: scaleAnim },
                  ],
                },
              ]}
            >
              <Image
                source={{ uri }}
                style={styles.image}
                resizeMode="contain"
                onLoadEnd={() => setLoading(false)}
                onError={() => {
                  setLoading(false)
                  setFailed(true)
                }}
              />
            </Animated.View>
            {loading && (
              <View style={styles.loadingOverlay} pointerEvents="none">
                <ActivityIndicator size="large" color="#fff" />
              </View>
            )}
            {!loading && (
              <Text style={styles.hint} pointerEvents="none">
                Pinch or scroll to zoom · drag to pan · double-tap or reset to undo
              </Text>
            )}
          </View>
        ) : (
          <Pressable style={styles.body} onPress={onClose}>
            <Pressable onPress={() => {}} style={styles.fallback}>
              {failed ? <AlertCircle size={40} color="#fff" /> : <FileText size={40} color="#fff" />}
              <Text style={styles.fallbackText} numberOfLines={2}>
                {failed ? "Couldn't load a preview for this file" : fileName ?? 'File'}
              </Text>
              <Pressable style={styles.openButton} onPress={() => Linking.openURL(uri)}>
                <ExternalLink size={14} color="#fff" />
                <Text style={styles.openButtonText}>Open File</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        )}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerText: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    marginRight: 12,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  iconButtonDisabled: {
    opacity: 0.4,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  imageWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    position: 'absolute',
    bottom: 28,
    alignSelf: 'center',
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  fallbackText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
  openButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  openButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
})