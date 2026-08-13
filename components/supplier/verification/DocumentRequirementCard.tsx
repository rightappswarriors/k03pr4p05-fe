import React, { useState } from 'react'
import { View, Text, TouchableOpacity, Image, ActivityIndicator } from 'react-native'
import {
  FileText,
  Upload,
  RefreshCcw,
  Trash2,
  Eye,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { DashboardCard } from '@/screens/supplier/SupplierDashboardScreen'

import { withAlpha } from '@/utils/color'
import { FadeInView } from '@/components/FadeInView'
import { VerificationStatusBadge } from './VerificationStatusBadge'
import { PreviewModal } from '@/components/PreviewModal'
import {
  uploadVerificationDocument,
  deleteVerificationDocumentWithFile,
  type BusinessVerificationDocument,
  type VerificationRequirement,
} from '@/services/supplierService/verificationService'
 
interface Props {
  orgId: number | null
  requirement: VerificationRequirement
  document?: BusinessVerificationDocument
  /**
   * Opens the platform file/image picker and resolves with a file object
   * compatible with MediaService.normalizeMediaFile (native: {uri,name,type};
   * web: File/Blob). Injected so this component doesn't need to know which
   * picker library (expo-image-picker, expo-document-picker, <input type=file>)
   * this project uses — wire it from the screen that already has that set up.
   */
  onPickFile: () => Promise<any | null>
  onReviewPress?: (document: BusinessVerificationDocument) => void
  /** Called after a successful upload/replace or delete so the parent can refetch the dashboard. */
  onChanged?: () => void
}
 
export function DocumentRequirementCard({ orgId, requirement, document, onPickFile, onReviewPress, onChanged }: Props) {
  const { colors } = useTheme()
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [lastFailedFile, setLastFailedFile] = useState<any | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)
  const [previewVisible, setPreviewVisible] = useState(false)
 
  const canDelete = document && document.status !== 'APPROVED'
  const isImage = !!document?.fileUrl?.match(/\.(jpe?g|png|webp|gif)$/i)
 
  async function handlePick(replacing = false) {
    setLocalError(null)
    const file = await onPickFile()
    if (!file) return
    await doUpload(file, replacing)
  }
 
  async function doUpload(file: any, replacing: boolean) {
    setSubmitting(true)
    setSubmitError(null)
    try {
      setLastFailedFile(null)
      await uploadVerificationDocument({
        file,
        orgId,
        requirementId: requirement.id,
        documentType: requirement.documentType,
        replacingFilePath: replacing ? document?.filePath : undefined,
      })
      onChanged?.()
    } catch (err: any) {
      setLastFailedFile(file)
      setLocalError(err?.message ?? 'Upload failed. Please try again.')
      setSubmitError(err?.message ?? 'Upload failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }
 
  async function handleRetry() {
    if (!lastFailedFile) return
    await doUpload(lastFailedFile, !!document)
  }
 
  async function handleDelete() {
    if (!document) return
    setDeleting(true)
    try {
      await deleteVerificationDocumentWithFile(document)
      onChanged?.()
    } catch (err: any) {
      setLocalError(err?.message ?? 'Delete failed. Please try again.')
    } finally {
      setDeleting(false)
    }
  }
 
  const isBusy = submitting || deleting
 
  return (
    <FadeInView>
      <DashboardCard>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: withAlpha(colors.primary, '14'),
              overflow: 'hidden',
            }}
          >
            {document && isImage ? (
              <Image source={{ uri: document.fileUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            ) : (
              <FileText size={20} color={colors.primary} />
            )}
          </View>
 
          <View style={{ flex: 1, gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>{requirement.label}</Text>
              {requirement.isRequired && (
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#DC2626' }}>Required</Text>
              )}
            </View>
            {requirement.description && (
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>{requirement.description}</Text>
            )}
            {document && <VerificationStatusBadge status={document.status} size="sm" />}
            {document?.adminRemarks && document.status === 'REJECTED' && (
              <View
                style={{
                  flexDirection: 'row',
                  gap: 6,
                  backgroundColor: withAlpha('#DC2626', '10'),
                  borderRadius: 8,
                  padding: 8,
                  marginTop: 4,
                }}
              >
                <AlertCircle size={13} color="#DC2626" style={{ marginTop: 1 }} />
                <Text style={{ fontSize: 12, color: '#DC2626', flex: 1 }}>{document.adminRemarks}</Text>
              </View>
            )}
            {(localError || submitError) && (
              <Text style={{ fontSize: 12, color: '#DC2626', marginTop: 2 }}>
                {localError ?? submitError}
              </Text>
            )}
          </View>
        </View>
 
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          {isBusy ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 }}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                {submitting ? 'Uploading…' : 'Deleting…'}
              </Text>
            </View>
          ) : lastFailedFile ? (
            <TouchableOpacity
              onPress={handleRetry}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8,
                backgroundColor: withAlpha('#DC2626', '14'),
              }}
            >
              <RefreshCcw size={13} color="#DC2626" />
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#DC2626' }}>Retry Upload</Text>
            </TouchableOpacity>
          ) : !document ? (
            <TouchableOpacity
              onPress={() => handlePick(false)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8,
                backgroundColor: colors.primary,
              }}
            >
              <Upload size={13} color="#fff" />
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>Upload</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                onPress={() => setPreviewVisible(true)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Eye size={13} color={colors.text} />
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>Preview</Text>
              </TouchableOpacity>
 
              {document.status !== 'APPROVED' && (
                <TouchableOpacity
                  onPress={() => handlePick(true)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <RefreshCcw size={13} color={colors.text} />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>Replace</Text>
                </TouchableOpacity>
              )}
 
              {canDelete && (
                <TouchableOpacity
                  onPress={handleDelete}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: withAlpha('#DC2626', '40'),
                  }}
                >
                  <Trash2 size={13} color="#DC2626" />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#DC2626' }}>Delete</Text>
                </TouchableOpacity>
              )}
 
              {document.status === 'APPROVED' && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 }}>
                  <CheckCircle2 size={13} color="#059669" />
                  <Text style={{ fontSize: 12, color: '#059669', fontWeight: '600' }}>
                    Approved documents can't be edited — contact an admin to revoke first.
                  </Text>
                </View>
              )}
            </>
          )}
        </View>
      </DashboardCard>

      {document && (
        <PreviewModal
          visible={previewVisible}
          onClose={() => setPreviewVisible(false)}
          uri={document.fileUrl}
          fileName={requirement.label}
          isImage={isImage}
        />
      )}
    </FadeInView>
  )
}
 
/**
 * The spec lists `UploadDocumentCard` as a separate component from
 * `DocumentRequirementCard`. In practice the upload/replace/delete/retry UI
 * only makes sense in the context of the requirement it's satisfying, so
 * this is one component exported under both names rather than two nearly-
 * identical components that would drift out of sync.
 */
export const UploadDocumentCard = DocumentRequirementCard