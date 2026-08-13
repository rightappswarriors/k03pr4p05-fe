/**
 * DocumentsBuilder — manages wholesale product documents.
 * Uses MediaService for upload functionality.
 * Supports: CE, FDA, ISO, ROHS, MSDS, OTHER document types.
 * Controlled component: syncs from props with guard, calls onChange directly from handlers.
 */
import React, { useState, useCallback, useEffect, useRef } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Linking } from 'react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { useToast } from '@/contexts/ToastContext'
import { FileText, Plus, Trash2, ExternalLink, Upload } from 'lucide-react-native'
import { MediaService } from '@/services/mediaService'
import * as DocumentPicker from 'expo-document-picker'
import type { WholesaleDocument } from '@/types'

interface Props {
  supplierItemId: string
  documents: WholesaleDocument[]
  orgId: string | number
  onChange: (documents: WholesaleDocument[]) => void
  editable?: boolean
}

type DocumentType = 'CE' | 'FDA' | 'ISO' | 'ROHS' | 'MSDS' | 'OTHER'

const DOCUMENT_TYPES: DocumentType[] = ['CE', 'FDA', 'ISO', 'ROHS', 'MSDS', 'OTHER']

export function DocumentsBuilder({ supplierItemId, documents, orgId, onChange, editable = true }: Props) {
  const { colors } = useTheme()
  const toast = useToast()
  const [docs, setDocs] = useState<WholesaleDocument[]>(documents)
  const [uploading, setUploading] = useState(false)

  // Guard to prevent prop sync loop
  const lastPropKey = useRef<string | null>(null)
  const docKey = documents.map(d => d.id).sort().join('|')
  useEffect(() => {
    if (lastPropKey.current !== docKey) {
      lastPropKey.current = docKey
      setDocs(documents)
    }
  }, [documents, docKey])

  // Lift changes to parent directly from handlers (not via effect)
  const notifyParent = useCallback((updated: WholesaleDocument[]) => {
    onChange(updated)
  }, [onChange])

  const addDocument = useCallback(async () => {
    if (!editable) return

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      })

      if (result.canceled) return

      setUploading(true)
      const asset = result.assets[0]

      const { publicUrl, filePath } = await MediaService.uploadMedia(
        {
          uri: asset.uri,
          name: asset.name || `document_${Date.now()}.pdf`,
          type: asset.mimeType || 'application/pdf',
        },
        String(orgId)
      )

      const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      const newDoc: WholesaleDocument = {
        id: tempId,
        _tempId: tempId,
        supplierItemId,
        title: asset.name,
        type: 'OTHER',
        fileUrl: publicUrl,
        verified: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      setDocs(prev => {
        const updated = [...prev, newDoc]
        notifyParent(updated)
        return updated
      })
      toast.show('Document uploaded', 'success')
    } catch (e: any) {
      toast.show(`Upload failed: ${e.message}`, 'error')
    } finally {
      setUploading(false)
    }
  }, [editable, orgId, docs, supplierItemId, onChange, toast, notifyParent])

  const removeDocument = useCallback((index: number) => {
    setDocs(prev => {
      const updated = prev.filter((_, i) => i !== index)
      notifyParent(updated)
      return updated
    })
  }, [notifyParent])

  const changeType = useCallback((index: number, type: DocumentType) => {
    setDocs(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], type }
      notifyParent(updated)
      return updated
    })
  }, [notifyParent])

  const openDocument = useCallback((url: string) => {
    Linking.openURL(url)
  }, [])

  return (
    <View style={[styles.container, { backgroundColor: colors.card}]}>
      <Text style={[styles.sectionTitle, { color: colors.text, borderBottomColor: colors.border }]}>
        Product Documents
      </Text>

      {docs.length === 0 && (
        <View style={styles.emptyState}>
          <FileText size={28} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No documents uploaded.</Text>
        </View>
      )}

      {docs.map((doc, index) => (
        <DocumentRow
          key={doc.id}
          doc={doc}
          index={index}
          colors={colors}
          editable={editable}
          onTypeChange={changeType}
          onRemove={removeDocument}
          onOpen={openDocument}
        />
      ))}

      {editable && (
        <TouchableOpacity
          onPress={addDocument}
          disabled={uploading}
          style={[styles.addButton, { backgroundColor: colors.primary }]}
        >
          {uploading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Upload size={16} color="#fff" />
              <Text style={styles.addButtonText}>Upload Document</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  )
}

interface DocumentRowProps {
  doc: WholesaleDocument
  index: number
  colors: any
  editable: boolean
  onTypeChange: (index: number, type: DocumentType) => void
  onRemove: (index: number) => void
  onOpen: (url: string) => void
}

function DocumentRow({ doc, index, colors, editable, onRemove, onOpen }: DocumentRowProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <View style={[styles.docRow, { borderBottomColor: colors.border }]}>
      <View style={styles.docHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.docTitle, { color: colors.text }]} numberOfLines={1}>
            {doc.title || `Document ${index + 1}`}
          </Text>
          <Text style={[styles.docMeta, { color: colors.textSecondary }]}>
            {doc.type} • {doc.verified ? 'Verified' : 'Pending verification'}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 6 }}>
          <TouchableOpacity onPress={() => onOpen(doc.fileUrl)} style={styles.iconBtn}>
            <ExternalLink size={16} color={colors.primary} />
          </TouchableOpacity>

          {editable && (
            <TouchableOpacity onPress={() => onRemove(index)} style={styles.iconBtn}>
              <Trash2 size={16} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {!editable && (
        <View style={styles.readonlyInfo}>
          <Text style={[styles.docMeta, { color: colors.textSecondary }]}>
            {new Date(doc.createdAt).toLocaleDateString('en-PH')}
          </Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#fff', borderRadius: 8, padding: 12, gap: 12 },
  sectionTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3, paddingBottom: 8, borderBottomWidth: 1 },
  emptyState: { alignItems: 'center', padding: 24, gap: 8 },
  emptyText: { fontSize: 13, color: '#6B7280' },
  docRow: { paddingVertical: 10, borderBottomWidth: 1 },
  docHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  docTitle: { fontSize: 14, fontWeight: '600' },
  docMeta: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  iconBtn: { padding: 4 },
  readonlyInfo: { marginTop: 6 },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  addButtonText: { color: '#fff', fontWeight: '600', fontSize: 13 },
})