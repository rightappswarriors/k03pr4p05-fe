/**
 * ReviewsBuilder — Alibaba-inspired review display with image gallery.
 * Displays review images in a grid with preview modal navigation.
 */
import React, { useState, useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { useToast } from '@/contexts/ToastContext'
import { MessageSquare, Reply, Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react-native'
import type { SupplierItemReview } from '@/services/supplierService/supplierService'
import type { SupplierItemReviewImage } from '@/types'

interface Props {
  supplierItemId: string
  reviews: SupplierItemReview[]
  onUpdated: (reviews: SupplierItemReview[]) => void
  editable?: boolean
}

export function ReviewsBuilder({ supplierItemId, reviews, onUpdated, editable = true }: Props) {
  const { colors } = useTheme()
  const toast = useToast()
  const [replyText, setReplyText] = useState<Record<string, string>>({})

  // Image preview state
  const [previewImages, setPreviewImages] = useState<SupplierItemReviewImage[]>([])
  const [previewIndex, setPreviewIndex] = useState(0)

  const handleReply = useCallback((reviewId: string) => {
    toast.show('Reply functionality coming soon', 'info')
  }, [toast])

  const handleDelete = useCallback((reviewId: string) => {
    const updated = reviews.filter(r => r.id !== reviewId)
    onUpdated(updated)
    toast.show('Review removed', 'info')
  }, [reviews, onUpdated, toast])

  const openImagePreview = useCallback((images: SupplierItemReviewImage[], initialIdx: number) => {
    setPreviewImages(images)
    setPreviewIndex(initialIdx)
  }, [])

  const closeImagePreview = useCallback(() => {
    setPreviewImages([])
  }, [])

  const navigatePreview = useCallback((delta: number) => {
    if (previewImages.length === 0) return
    const newIdx = previewIndex + delta
    if (newIdx >= 0 && newIdx < previewImages.length) {
      setPreviewIndex(newIdx)
    }
  }, [previewIndex, previewImages.length])

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n)

  if (reviews.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <MessageSquare size={28} color={colors.textSecondary} />
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No reviews yet</Text>
        <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
          Reviews from buyers will appear here
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.text, borderBottomColor: colors.border }]}>
        Product Reviews ({reviews.length})
      </Text>

      {reviews.map((review) => (
        <ReviewItem
          key={review.id}
          review={review}
          colors={colors}
          editable={editable}
          replyText={replyText[review.id] || ''}
          onReplyChange={(text) => setReplyText(prev => ({ ...prev, [review.id]: text }))}
          onReply={handleReply}
          onDelete={handleDelete}
          onOpenImagePreview={openImagePreview}
        />
      ))}

      {/* Image Preview Modal */}
      {previewImages.length > 0 && (
        <View style={styles.previewBackdrop}>
          <View style={styles.previewContainer}>
            <Image source={{ uri: previewImages[previewIndex]?.url }} style={styles.previewImage} resizeMode="contain" />
            <View style={styles.previewControls}>
              <TouchableOpacity onPress={() => navigatePreview(-1)} style={styles.previewBtn} disabled={previewIndex === 0}>
                <ChevronLeft size={20} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={closeImagePreview} style={styles.previewBtn}>
                <X size={20} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigatePreview(1)} style={styles.previewBtn} disabled={previewIndex === previewImages.length - 1}>
                <ChevronRight size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}

interface ReviewItemProps {
  review: SupplierItemReview & { images?: SupplierItemReviewImage[] }
  colors: any
  editable: boolean
  replyText: string
  onReplyChange: (text: string) => void
  onReply: (reviewId: string) => void
  onDelete: (reviewId: string) => void
  onOpenImagePreview: (images: SupplierItemReviewImage[], initialIdx: number) => void
}

function ReviewItem({ review, colors, editable, replyText, onReplyChange, onReply, onDelete, onOpenImagePreview }: ReviewItemProps) {
  return (
    <View style={[styles.reviewCard, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
      <View style={styles.reviewHeader}>
        <View>
          <Text style={[styles.reviewerName, { color: colors.text }]}>{review.reviewer.name}</Text>
          <Text style={[styles.reviewDate, { color: colors.textSecondary }]}>
            {new Date(review.createdAt).toLocaleDateString('en-PH')}
          </Text>
        </View>
        {review.isVerifiedPurchase && (
          <View style={[styles.verifiedBadge, { backgroundColor: `${colors.primary}15` }]}>
            <Text style={[styles.verifiedText, { color: colors.primary }]}>Verified Purchase</Text>
          </View>
        )}
      </View>

      <View style={styles.ratingRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Text
            key={star}
            style={{ color: star <= review.rating ? '#F59E0B' : colors.textSecondary, fontSize: 14 }}
          >
            ★
          </Text>
        ))}
      </View>

      {review.title && (
        <Text style={[styles.reviewTitle, { color: colors.text }]}>{review.title}</Text>
      )}

      {review.comment && (
        <Text style={[styles.reviewComment, { color: colors.textSecondary }]}>{review.comment}</Text>
      )}

      {/* Review Images Grid */}
      {review.images && review.images.length > 0 && (
        <View style={styles.reviewImagesGrid}>
          {review.images.map((img, idx) => (
            <TouchableOpacity
              key={img.id}
              onPress={() => onOpenImagePreview(review.images!, idx)}
              style={styles.reviewImageThumbnail}
            >
              <Image source={{ uri: img.url }} style={styles.reviewImage} resizeMode="cover" />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {editable && (
        <View style={styles.actionsRow}>
          <TouchableOpacity onPress={() => onReply(review.id)} style={styles.replyBtn}>
            <Reply size={14} color={colors.primary} />
            <Text style={[styles.replyText, { color: colors.primary }]}>Reply</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => onDelete(review.id)} style={styles.deleteBtn}>
            <Trash2 size={14} color="#EF4444" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  sectionTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3, paddingBottom: 8, borderBottomWidth: 1 },
  emptyContainer: { alignItems: 'center', padding: 32, gap: 8 },
  emptyText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  emptySubtext: { fontSize: 12, color: '#6B7280', textAlign: 'center' },
  reviewCard: { borderRadius: 8, padding: 12, borderWidth: 1, gap: 8 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  reviewerName: { fontSize: 13, fontWeight: '600' },
  reviewDate: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  verifiedBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  verifiedText: { fontSize: 10, fontWeight: '600' },
  ratingRow: { flexDirection: 'row', gap: 2 },
  reviewTitle: { fontSize: 13, fontWeight: '600' },
  reviewComment: { fontSize: 13, lineHeight: 18 },
  reviewImagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  reviewImageThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 6,
    overflow: 'hidden',
  },
  reviewImage: {
    width: '100%',
    height: '100%',
  },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  replyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 6 },
  replyText: { fontSize: 12, fontWeight: '600' },
  deleteBtn: { padding: 6 },
  previewBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  previewContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    width: '90%',
    height: '80%',
    maxWidth: 500,
  },
  previewControls: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 20,
  },
  previewBtn: {
    padding: 12,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
})