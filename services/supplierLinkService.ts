import { gql } from 'graphql-request'
import { graphQLRequest } from './apiClient'

export type SupplierLinkStatus = 'SUGGESTED' | 'REQUESTED' | 'PENDING' | 'ACCEPTED' | 'ACTIVE' | 'PAUSED' | 'BLOCKED' | 'ARCHIVED'
export interface SupplierLink { id: string; supplierOrgId: number; outletId: number; status: SupplierLinkStatus; isApproved: boolean; organizationName: string; organizationLogo?: string | null; rating: number; revenue: number; orders: number; outstanding: number; openMandates: number; unreadMessages: number; lastActivity?: string | null; assignedAgentName?: string | null; linkedAt?: string | null; notes?: string | null; preferredWarehouseId?: string | null; deliveryInstructions?: string | null; receivingHours?: string | null; creditTerms?: string | null; createdAt?: string | null; updatedAt?: string | null }

const FIELDS = `id supplierOrgId outletId status isApproved organizationName organizationLogo rating revenue orders outstanding openMandates unreadMessages lastActivity assignedAgentName linkedAt notes preferredWarehouseId deliveryInstructions receivingHours creditTerms createdAt updatedAt`

/** Returns relationship workspaces for the signed-in supplier organization. */
export async function getLinks(status?: SupplierLinkStatus): Promise<SupplierLink[]> {
  const result = await graphQLRequest<{ supplierLinks: SupplierLink[] }>(gql`query SupplierLinks($status: SupplierLinkStatus) { supplierLinks(status: $status) { ${FIELDS} } }`, { status })
  return result.supplierLinks
}

/** Returns supplier relationships for the signed-in retailer organization. */
export async function getRetailerLinks(): Promise<SupplierLink[]> {
  const result = await graphQLRequest<{ retailerSupplierLinks: SupplierLink[] }>(gql`query RetailerSupplierLinks { retailerSupplierLinks { ${FIELDS} } }`)
  return result.retailerSupplierLinks
}

/** Returns the relationship workspace after verifying the caller belongs to either organization. */
export async function getLink(id: string): Promise<SupplierLink | null> {
  const result = await graphQLRequest<{ supplierLink: SupplierLink | null }>(gql`query SupplierLink($id: String!) { supplierLink(id: $id) { ${FIELDS} } }`, { id })
  return result.supplierLink
}

/** Updates one relationship lifecycle state or collaboration setting. */
export async function updateLink(id: string, status: SupplierLinkStatus): Promise<SupplierLink> {
  const result = await graphQLRequest<{ updateSupplierLink: SupplierLink }>(gql`mutation UpdateSupplierLink($input: UpdateSupplierLinkInput!) { updateSupplierLink(input: $input) { ${FIELDS} } }`, { input: { id, status } })
  return result.updateSupplierLink
}
