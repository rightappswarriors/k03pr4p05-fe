import React, { useEffect, useState } from 'react'
import { Modal, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { Star, X } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { createOrganizationReview, updateOrganizationReview, type OrganizationReview } from '@/services/supplierService/supplierService'

export function ReviewFormModal({
  visible,
  organizationId,
  review,
  onClose,
  onSaved,
}: {
  visible: boolean
  organizationId: number
  review?: OrganizationReview | null
  onClose: () => void
  onSaved: (review: OrganizationReview) => void
}) {
  const { colors } = useTheme()
  const [rating, setRating] = useState(5)
  const [reviewerName, setReviewerName] = useState('')
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!visible) return
    setRating(review?.rating ?? 5)
    setReviewerName(review?.reviewerName ?? review?.reviewer?.name ?? '')
    setComment(review?.comment ?? '')
  }, [review, visible])

  const submit = async () => {
    setSaving(true)
    try {
      const saved = review
        ? await updateOrganizationReview({ id: review.id, rating, comment, reviewerName })
        : await createOrganizationReview({ organizationId, rating, comment, reviewerName })
      onSaved(saved)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.42)', alignItems: 'center', justifyContent: 'center', padding: 18 }}>
        <View style={{ width: '100%', maxWidth: 460, backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 18, gap: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '900' }}>{review ? 'Edit review' : 'Write review'}</Text>
            <TouchableOpacity onPress={onClose}><X size={20} color={colors.textSecondary} /></TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {[1, 2, 3, 4, 5].map((value) => (
              <TouchableOpacity key={value} onPress={() => setRating(value)} style={{ padding: 4 }}>
                <Star size={28} color="#F59E0B" fill={value <= rating ? '#F59E0B' : 'transparent'} />
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            value={reviewerName}
            onChangeText={setReviewerName}
            placeholder="Reviewer name"
            placeholderTextColor={colors.textSecondary}
            style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: colors.text }}
          />
          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder="Comment"
            placeholderTextColor={colors.textSecondary}
            multiline
            style={{ minHeight: 120, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, textAlignVertical: 'top' }}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
            <TouchableOpacity onPress={onClose} style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ color: colors.text, fontWeight: '800' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={submit} disabled={saving} style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.primary, opacity: saving ? 0.65 : 1 }}>
              <Text style={{ color: '#fff', fontWeight: '900' }}>{saving ? 'Saving...' : 'Submit'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}
