import { gql } from 'graphql-request'
import { graphQLRequest } from './apiClient'

export type SupplierLinkStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'DISABLED'
export type SupplierLinkSortField = 'REQUESTED_AT' | 'STATUS' | 'RETAILER_NAME' | 'OUTLET_NAME'
export type SortDirection = 'ASC' | 'DESC'
export interface SupplierLinkRetailerOrganization { id: number; name: string; profileImage?: string | null; location?: string | null; contactNumber?: string | null }
export interface SupplierLink { id: string; supplierOrgId: number; outletId: number; status: SupplierLinkStatus; isApproved: boolean; requestDirection: 'RETAILER_TO_SUPPLIER' | 'SUPPLIER_TO_RETAILER'; supplierName: string; supplierProfileImage?: string | null; supplierLocation?: string | null; outletName: string; outletAddress?: string | null; retailerOrganizationName: string; retailerProfileImage?: string | null; retailerLocation?: string | null; retailerContactNumber?: string | null; retailerOrganization: SupplierLinkRetailerOrganization; organizationName: string; organizationLogo?: string | null; rating?: number | null; revenue: number; orders: number; outstanding: number; openMandates: number; unreadMessages: number; lastActivity?: string | null; assignedAgentName?: string | null; linkedAt?: string | null; requestedAt: string; approvedAt?: string | null; rejectedAt?: string | null; disabledAt?: string | null; requestedById?: number | null; reviewedById?: number | null; notes?: string | null; preferredWarehouseId?: string | null; deliveryInstructions?: string | null; receivingHours?: string | null; creditTerms?: string | null; createdAt: string; updatedAt: string }
export interface SupplierLinkSummary { activeRetailers: number; pendingRequests: number; rejectedRequests: number; disabledLinks: number }
export interface SupplierLinkPage { items: SupplierLink[]; total: number; page: number; pageSize: number; summary: SupplierLinkSummary }
export interface SupplierDirectoryEntry { id: number; name: string; profileImage?: string | null; location?: string | null; contactNumber?: string | null; relationshipId?: string | null; relationshipStatus?: SupplierLinkStatus | null }
export interface SupplierLinkOutletOption { id: number; name: string; address?: string | null }
export interface SupplierDirectoryPage { items: SupplierDirectoryEntry[]; outlets: SupplierLinkOutletOption[]; total: number; page: number; pageSize: number }
export interface SupplierLinkListOptions { status?: SupplierLinkStatus; search?: string; page?: number; pageSize?: number; sortBy?: SupplierLinkSortField; sortDirection?: SortDirection }
export interface SupplierBusinessProfileMetrics { overallRating?: number | null; reviewCount: number; activeProducts: number; successfulOrders: number; eligibleTerminalOrders: number; orderCompletionRate?: number | null; completedDeliveries: number; eligibleTerminalDeliveries: number; deliveryCompletionRate?: number | null }
export interface SupplierBusinessProductPreview { id: string; name: string; image?: string | null; unit: string; moq: number; category?: string | null }
export interface SupplierBusinessProfile { id: number; name: string; profileImage?: string | null; bannerImage?: string | null; location?: string | null; contactNumber?: string | null; bio?: string | null; verificationStatus: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'EXPIRED'; memberSince: string; relationshipId?: string | null; relationshipStatus?: SupplierLinkStatus | null; outletId?: number | null; outletName?: string | null; categories: string[]; productPreview: SupplierBusinessProductPreview[]; metrics: SupplierBusinessProfileMetrics }

const FIELDS = `id supplierOrgId outletId status isApproved requestDirection supplierName supplierProfileImage supplierLocation outletName outletAddress retailerOrganizationName retailerProfileImage retailerLocation retailerContactNumber retailerOrganization { id name profileImage location contactNumber } organizationName organizationLogo rating revenue orders outstanding openMandates unreadMessages lastActivity assignedAgentName linkedAt requestedAt approvedAt rejectedAt disabledAt requestedById reviewedById notes preferredWarehouseId deliveryInstructions receivingHours creditTerms createdAt updatedAt`
const PAGE_FIELDS = `items { ${FIELDS} } total page pageSize summary { activeRetailers pendingRequests rejectedRequests disabledLinks }`

/** Returns relationship workspaces for the signed-in supplier organization. */
export async function getLinks(options: SupplierLinkListOptions = {}): Promise<SupplierLinkPage> {
  const result = await graphQLRequest<{ supplierLinkRelationships: SupplierLinkPage }>(gql`query SupplierLinkRelationships($status: SupplierLinkStatus, $search: String, $page: Int, $pageSize: Int, $sortBy: SupplierLinkSortField, $sortDirection: SupplierLinkSortDirection) { supplierLinkRelationships(status: $status, search: $search, page: $page, pageSize: $pageSize, sortBy: $sortBy, sortDirection: $sortDirection) { ${PAGE_FIELDS} } }`, options)
  return result.supplierLinkRelationships
}

/** Returns supplier relationships for the signed-in retailer organization. */
export async function getRetailerLinks(options: SupplierLinkListOptions = {}): Promise<SupplierLinkPage> {
  const result = await graphQLRequest<{ retailerSupplierLinkRelationships: SupplierLinkPage }>(gql`query RetailerSupplierLinkRelationships($status: SupplierLinkStatus, $search: String, $page: Int, $pageSize: Int, $sortBy: SupplierLinkSortField, $sortDirection: SupplierLinkSortDirection) { retailerSupplierLinkRelationships(status: $status, search: $search, page: $page, pageSize: $pageSize, sortBy: $sortBy, sortDirection: $sortDirection) { ${PAGE_FIELDS} } }`, options)
  return result.retailerSupplierLinkRelationships
}

/** Returns the relationship workspace after verifying the caller belongs to either organization. */
export async function getLink(id: string): Promise<SupplierLink | null> {
  const result = await graphQLRequest<{ supplierLink: SupplierLink | null }>(gql`query SupplierLink($id: String!) { supplierLink(id: $id) { ${FIELDS} } }`, { id })
  return result.supplierLink
}

async function linkAction(name: 'approveSupplierLink' | 'rejectSupplierLink' | 'disableSupplierLink', id: string) {
  const result = await graphQLRequest<Record<typeof name, SupplierLink>>(gql`mutation SupplierLinkAction($id: String!) { ${name}(id: $id) { ${FIELDS} } }`, { id })
  return result[name]
}

export const approveLink = (id: string) => linkAction('approveSupplierLink', id)
export const rejectLink = (id: string) => linkAction('rejectSupplierLink', id)
export const disableLink = (id: string) => linkAction('disableSupplierLink', id)

export async function reviewSupplierInvitation(id: string, action: 'accept' | 'reject') {
  const name = action === 'accept' ? 'acceptSupplierLinkInvitation' : 'rejectSupplierLinkInvitation'
  const result = await graphQLRequest<Record<string, SupplierLink>>(gql`mutation ReviewSupplierLinkInvitation($id: String!) { ${name}(id: $id) { ${FIELDS} } }`, { id })
  return result[name]
}

export async function requestLink(supplierOrgId: number, outletId: number): Promise<SupplierLink> {
  const result = await graphQLRequest<{ requestSupplierLink: SupplierLink }>(gql`mutation RequestSupplierLink($supplierOrgId: Int!, $outletId: Int!) { requestSupplierLink(supplierOrgId: $supplierOrgId, outletId: $outletId) { ${FIELDS} } }`, { supplierOrgId, outletId })
  return result.requestSupplierLink
}

export async function getRegisteredSuppliers(options: { search?: string; outletId?: number; page?: number; pageSize?: number } = {}): Promise<SupplierDirectoryPage> {
  const result = await graphQLRequest<{ registeredSupplierDirectory: SupplierDirectoryPage }>(gql`query RegisteredSupplierDirectory($search: String, $outletId: Int, $page: Int, $pageSize: Int) { registeredSupplierDirectory(search: $search, outletId: $outletId, page: $page, pageSize: $pageSize) { items { id name profileImage location contactNumber relationshipId relationshipStatus } outlets { id name address } total page pageSize } }`, options)
  return result.registeredSupplierDirectory
}

export async function getRegisteredSupplierProfile(supplierOrgId: number, outletId?: number): Promise<SupplierBusinessProfile> {
  const result = await graphQLRequest<{ registeredSupplierProfile: SupplierBusinessProfile }>(gql`query RegisteredSupplierProfile($supplierOrgId: Int!, $outletId: Int) { registeredSupplierProfile(supplierOrgId: $supplierOrgId, outletId: $outletId) { id name profileImage bannerImage location contactNumber bio verificationStatus memberSince relationshipId relationshipStatus outletId outletName categories productPreview { id name image unit moq category } metrics { overallRating reviewCount activeProducts successfulOrders eligibleTerminalOrders orderCompletionRate completedDeliveries eligibleTerminalDeliveries deliveryCompletionRate } } }`, { supplierOrgId, outletId })
  return result.registeredSupplierProfile
}
