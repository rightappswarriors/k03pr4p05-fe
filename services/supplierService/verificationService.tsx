import { gql } from 'graphql-request'
import { graphQLRequest } from '../apiClient'
import { MediaService } from '../mediaService'

// ─── Fragments (field blocks — same convention as supplierService.ts) ────────

const REQUIREMENT_FIELDS = `
  id
  documentType
  label
  description
  isRequired
  validityDays
  reminderDaysBefore
  isActive
`

const REVIEW_FIELDS = `
  id
  documentId
  status
  remarks
  reviewedById
  reviewedAt
`

const DOCUMENT_FIELDS = `
  id
  orgId
  requirementId
  documentType
  fileUrl
  filePath
  status
  uploadedAt
  approvedAt
  expiresAt
  reviewedById
  reviewedAt
  adminRemarks
  isSuperseded
  requirement { ${REQUIREMENT_FIELDS} }
  reviews { ${REVIEW_FIELDS} }
`

// ─── Types ─────────────────────────────────────────────────────────────────

export type DocumentType =
  | 'BUSINESS_PERMIT'
  | 'DTI_SEC_REGISTRATION'
  | 'BIR_2303'
  | 'VALID_ID'
  | 'PROOF_OF_ADDRESS'
  | 'OTHER'

export type VerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'BYPASSED_DEV'
export type OrgVerificationStatus = 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'EXPIRED'

export interface VerificationRequirement {
  id: string
  documentType: DocumentType
  label: string
  description?: string | null
  isRequired: boolean
  validityDays?: number | null
  reminderDaysBefore: number[]
  isActive: boolean
}

export interface VerificationReviewHistoryEntry {
  id: string
  documentId: string
  status: VerificationStatus
  remarks?: string | null
  reviewedById?: number | null
  reviewedAt: string
}

export interface BusinessVerificationDocument {
  id: string
  orgId: number
  requirementId: string
  documentType: DocumentType
  fileUrl: string
  filePath: string
  status: VerificationStatus
  uploadedAt: string
  approvedAt?: string | null
  expiresAt?: string | null
  reviewedById?: number | null
  reviewedAt?: string | null
  adminRemarks?: string | null
  isSuperseded: boolean
  requirement: VerificationRequirement
  reviews: VerificationReviewHistoryEntry[]
}

export interface VerificationDashboardData {
  orgVerificationStatus: OrgVerificationStatus
  verificationExpiresAt?: string | null
  requiredCount: number
  submittedCount: number
  approvedCount: number
  rejectedCount: number
  progressPct: number
  requirements: VerificationRequirement[]
  documents: BusinessVerificationDocument[]
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export async function fetchVerificationDashboard(orgId: number): Promise<VerificationDashboardData> {
  try {
    const QUERY = gql`
      query VerificationDashboard($orgId: Int!) {
        verificationDashboard(orgId: $orgId) {
          orgVerificationStatus
          verificationExpiresAt
          requiredCount
          submittedCount
          approvedCount
          rejectedCount
          progressPct
          requirements { ${REQUIREMENT_FIELDS} }
          documents { ${DOCUMENT_FIELDS} }
        }
      }
    `
    const res = await graphQLRequest<{ verificationDashboard: VerificationDashboardData }>(QUERY, { orgId })
    return res.verificationDashboard
  } catch (error) {
    if (__DEV__) {
      console.error('[verificationService] fetchVerificationDashboard failed:', error)
    }
    throw error
  }
}

export async function fetchVerificationDocuments(orgId: number): Promise<BusinessVerificationDocument[]> {
  try {
    const QUERY = gql`
      query VerificationDocuments($orgId: Int!) {
        verificationDocuments(orgId: $orgId) { ${DOCUMENT_FIELDS} }
      }
    `
    const res = await graphQLRequest<{ verificationDocuments: BusinessVerificationDocument[] }>(QUERY, { orgId })
    return res.verificationDocuments
  } catch (error) {
    if (__DEV__) {
      console.error('[verificationService] fetchVerificationDocuments failed:', error)
    }
    throw error
  }
}

export async function fetchVerificationRequirements(): Promise<VerificationRequirement[]> {
  try {
    const QUERY = gql`
      query VerificationRequirementsList {
        verificationRequirementsList { ${REQUIREMENT_FIELDS} }
      }
    `
    const res = await graphQLRequest<{ verificationRequirementsList: VerificationRequirement[] }>(QUERY, {})
    return res.verificationRequirementsList
  } catch (error) {
    if (__DEV__) {
      console.error('[verificationService] fetchVerificationRequirements failed:', error)
    }
    throw error
  }
}

// ─── Mutations (raw) ───────────────────────────────────────────────────────

export interface UploadVerificationDocumentInput {
  orgId: number | null
  requirementId: string
  documentType: DocumentType
  fileUrl: string
  filePath: string
}

async function recordUploadedVerificationDocument(
  input: UploadVerificationDocumentInput
): Promise<BusinessVerificationDocument> {
  try {
    if (!input.orgId) {
      throw new Error('Organization Id not ready.')
    }
    const MUTATION = gql`
      mutation UploadVerificationDocument($input: UploadVerificationDocumentInput!) {
        uploadVerificationDocument(input: $input) { ${DOCUMENT_FIELDS} }
      }
    `
    const res = await graphQLRequest<{ uploadVerificationDocument: BusinessVerificationDocument }>(MUTATION, {
      input,
    })
    return res.uploadVerificationDocument
  } catch (error) {
    if (__DEV__) {
      console.error('[verificationService] recordUploadedVerificationDocument failed:', error)
    }
    throw error
  }
}

export async function deleteVerificationDocument(id: string): Promise<{ id: string }> {
  try {
    const MUTATION = gql`
      mutation DeleteVerificationDocument($id: String!) {
        deleteVerificationDocument(id: $id) {
          id
        }
      }
    `
    const res = await graphQLRequest<{ deleteVerificationDocument: { id: string } }>(MUTATION, { id })
    return res.deleteVerificationDocument
  } catch (error) {
    if (__DEV__) {
      console.error('[verificationService] deleteVerificationDocument failed:', error)
    }
    throw error
  }
}

export async function reviewVerificationDocument(params: {
  id: string
  status: VerificationStatus
  remarks?: string
  reviewedById?: number
}): Promise<BusinessVerificationDocument> {
  try {
    const MUTATION = gql`
      mutation ReviewVerificationDocument($id: String!, $status: VerificationStatus!, $remarks: String, $reviewedById: Int) {
        reviewVerificationDocument(id: $id, status: $status, remarks: $remarks, reviewedById: $reviewedById) {
          ${DOCUMENT_FIELDS}
        }
      }
    `
    const res = await graphQLRequest<{ reviewVerificationDocument: BusinessVerificationDocument }>(MUTATION, params)
    return res.reviewVerificationDocument
  } catch (error) {
    if (__DEV__) {
      console.error('[verificationService] reviewVerificationDocument failed:', error)
    }
    throw error
  }
}

// ─── Composed upload flow (MediaService + GraphQL, one call for the UI) ────

/**
 * Full upload flow: MediaService.uploadMedia (fresh upload) or
 * MediaService.updateMedia (replace, when replacingFilePath is passed)
 * handles the actual file bytes, then this records the resulting
 * fileUrl/filePath against the requirement.
 *
 * Retry is just "call this again with the same file" — MediaService calls
 * are not stateful, so the caller only needs to hold onto the last-failed
 * `file`/`orgId`/`requirementId`/`documentType` args and re-invoke this on
 * retry press.
 *
 * Note: MediaService.uploadMedia/updateMedia already throw their own
 * descriptive errors on failure (and MediaService.deleteMedia already logs
 * + swallows internally) — this try/catch only adds __DEV__ visibility at
 * the verification-service layer without changing that behavior.
 */
export async function uploadVerificationDocument(params: {
  file: any
  orgId: number | null
  requirementId: string
  documentType: DocumentType
  replacingFilePath?: string
}): Promise<BusinessVerificationDocument> {
  try {
    const { file, orgId, requirementId, documentType, replacingFilePath } = params

    const { publicUrl, filePath } = replacingFilePath
      ? await MediaService.updateMedia(file, replacingFilePath, String(orgId))
      : await MediaService.uploadMedia(file, String(orgId))

    return await recordUploadedVerificationDocument({
      orgId,
      requirementId,
      documentType,
      fileUrl: publicUrl,
      filePath,
    })
  } catch (error) {
    if (__DEV__) {
      console.error('[verificationService] uploadVerificationDocument failed:', error)
    }
    throw error
  }
}

/**
 * Deletes a document — only permitted before approval. Best-effort file
 * cleanup via MediaService.deleteMedia first (it already swallows its own
 * errors and logs in __DEV__, so a storage hiccup doesn't block removing
 * the DB row), then removes the record.
 */
export async function deleteVerificationDocumentWithFile(
  doc: Pick<BusinessVerificationDocument, 'id' | 'filePath' | 'status'>
): Promise<{ id: string }> {
  try {
    if (doc.status === 'APPROVED') {
      throw new Error('Cannot delete an approved document.')
    }
    await MediaService.deleteMedia(doc.filePath)
    return await deleteVerificationDocument(doc.id)
  } catch (error) {
    if (__DEV__) {
      console.error('[verificationService] deleteVerificationDocumentWithFile failed:', error)
    }
    throw error
  }
}