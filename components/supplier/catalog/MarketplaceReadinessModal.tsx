// Modal that displays marketplace readiness checklist for a supplier item.
import React, { useEffect, useState } from 'react'
import { View, Text, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native'
import { CheckCircle2, XCircle, AlertTriangle, Globe, X } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { FadeDialogModal } from './FadeDialogModal'
import {
  validateMarketplaceItem,
  publishMarketplaceItem,
  unpublishMarketplaceItem,
  type MarketplaceReadiness,
  type MarketplaceListing,
} from '@/services/marketplaceService'

interface Props {
  visible: boolean
  supplierItemId: string
  itemName: string
  currentListing: MarketplaceListing | null | undefined
  onClose: () => void
  onPublished: (listing: MarketplaceListing) => void
  onUnpublished: (listing: MarketplaceListing) => void
}

export function MarketplaceReadinessModal({
  visible,
  supplierItemId,
  itemName,
  currentListing,
  onClose,
  onPublished,
  onUnpublished,
}: Props) {
  const { colors } = useTheme()
  const [readiness, setReadiness] = useState<MarketplaceReadiness | null>(null)
  const [loading, setLoading] = useState(false)
  const [acting, setActing] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const isPublished = currentListing?.status === 'PUBLISHED'

  // Load readiness whenever the modal opens.
  useEffect(() => {
    if (!visible || !supplierItemId) return
    setReadiness(null)
    setActionError(null)
    setLoading(true)
    validateMarketplaceItem(supplierItemId)
      .then(setReadiness)
      .catch((e) => setReadiness({ supplierItemId, isPublishable: false, errors: [e?.message ?? 'Validation failed.'], warnings: [], score: 0 }))
      .finally(() => setLoading(false))
  }, [visible, supplierItemId])

  const handlePublish = async () => {
    setActing(true)
    setActionError(null)
    try {
      const listing = await publishMarketplaceItem(supplierItemId)
      onPublished(listing)
      onClose()
    } catch (e: any) {
      setActionError(e?.message ?? 'Failed to publish.')
    } finally {
      setActing(false)
    }
  }

  const handleUnpublish = async () => {
    setActing(true)
    setActionError(null)
    try {
      const listing = await unpublishMarketplaceItem(supplierItemId)
      onUnpublished(listing)
      onClose()
    } catch (e: any) {
      setActionError(e?.message ?? 'Failed to unpublish.')
    } finally {
      setActing(false)
    }
  }

  const scoreColor =
    !readiness ? colors.textSecondary
    : readiness.score >= 80 ? '#059669'
    : readiness.score >= 50 ? '#D97706'
    : '#DC2626'

  return (
    <FadeDialogModal visible={visible} onRequestClose={onClose} maxWidth={520}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' }}>
          <Globe size={18} color="#2563EB" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>Marketplace Readiness</Text>
          <Text style={{ fontSize: 12, color: colors.textSecondary }} numberOfLines={1}>{itemName}</Text>
        </View>
        <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
          <X size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        {loading ? (
          <View style={{ alignItems: 'center', paddingVertical: 40, gap: 10 }}>
            <ActivityIndicator color={colors.primary} />
            <Text style={{ fontSize: 13, color: colors.textSecondary }}>Checking readiness…</Text>
          </View>
        ) : readiness ? (
          <>
            {/* Score */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.background, borderRadius: 12, padding: 14 }}>
              <View>
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 4 }}>READINESS SCORE</Text>
                <Text style={{ fontSize: 32, fontWeight: '900', color: scoreColor }}>{readiness.score}%</Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                  {readiness.isPublishable
                    ? readiness.warnings.length > 0
                      ? `Ready · ${readiness.warnings.length} suggestion${readiness.warnings.length > 1 ? 's' : ''}`
                      : 'Ready to publish'
                    : `${readiness.errors.length} blocking issue${readiness.errors.length > 1 ? 's' : ''} to fix`}
                </Text>
              </View>
              {/* Ring */}
              <View style={{ width: 64, height: 64, borderRadius: 32, borderWidth: 5, borderColor: scoreColor + '30', alignItems: 'center', justifyContent: 'center', backgroundColor: scoreColor + '10' }}>
                <Text style={{ fontSize: 16, fontWeight: '900', color: scoreColor }}>{readiness.score}%</Text>
              </View>
            </View>

            {/* Errors */}
            {readiness.errors.length > 0 && (
              <View style={{ gap: 6 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary, letterSpacing: 0.5 }}>BLOCKING ISSUES</Text>
                {readiness.errors.map((err, i) => (
                  <View key={i} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: '#FEF2F2', borderRadius: 8, padding: 10 }}>
                    <XCircle size={15} color="#DC2626" style={{ marginTop: 1 }} />
                    <Text style={{ flex: 1, fontSize: 13, color: '#7F1D1D' }}>{err}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Warnings */}
            {readiness.warnings.length > 0 && (
              <View style={{ gap: 6 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary, letterSpacing: 0.5 }}>SUGGESTIONS</Text>
                {readiness.warnings.map((warn, i) => (
                  <View key={i} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: '#FFFBEB', borderRadius: 8, padding: 10 }}>
                    <AlertTriangle size={15} color="#D97706" style={{ marginTop: 1 }} />
                    <Text style={{ flex: 1, fontSize: 13, color: '#78350F' }}>{warn}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* All clear */}
            {readiness.errors.length === 0 && readiness.warnings.length === 0 && (
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: '#ECFDF5', borderRadius: 8, padding: 12 }}>
                <CheckCircle2 size={16} color="#059669" />
                <Text style={{ fontSize: 13, color: '#065F46', fontWeight: '600' }}>All checks passed. This item is ready to publish.</Text>
              </View>
            )}

            {/* Action error */}
            {actionError && (
              <View style={{ backgroundColor: '#FEF2F2', borderRadius: 8, padding: 10 }}>
                <Text style={{ fontSize: 13, color: '#DC2626' }}>{actionError}</Text>
              </View>
            )}
          </>
        ) : null}
      </ScrollView>

      {/* Footer actions */}
      <View style={{ flexDirection: 'row', gap: 10, padding: 14, borderTopWidth: 1, borderTopColor: colors.border }}>
        <TouchableOpacity
          onPress={onClose}
          style={{ flex: 1, padding: 13, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: colors.border }}
        >
          <Text style={{ fontWeight: '700', color: colors.text }}>Close</Text>
        </TouchableOpacity>

        {isPublished ? (
          <TouchableOpacity
            onPress={handleUnpublish}
            disabled={acting}
            style={{ flex: 1.5, padding: 13, borderRadius: 10, alignItems: 'center', backgroundColor: acting ? colors.border : '#FEF2F2', borderWidth: 1, borderColor: '#FECACA' }}
          >
            <Text style={{ fontWeight: '700', color: acting ? colors.textSecondary : '#DC2626' }}>
              {acting ? 'Unpublishing…' : 'Unpublish'}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={handlePublish}
            disabled={acting || loading || !readiness?.isPublishable}
            style={{ flex: 1.5, padding: 13, borderRadius: 10, alignItems: 'center', backgroundColor: (acting || loading || !readiness?.isPublishable) ? colors.border : '#2563EB', opacity: (acting || loading || !readiness?.isPublishable) ? 0.6 : 1 }}
          >
            <Text style={{ fontWeight: '700', color: (acting || !readiness?.isPublishable) ? colors.textSecondary : '#fff' }}>
              {acting ? 'Publishing…' : 'Publish to Marketplace'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </FadeDialogModal>
  )
}
