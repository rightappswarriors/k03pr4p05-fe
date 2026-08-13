// Frontend service for marketplace publishing operations.
import { gql } from 'graphql-request'
import { graphQLRequest } from './apiClient'

// ─── Types ────────────────────────────────────────────────────────────────────

export type MarketplaceListingStatus =
  | 'DRAFT'
  | 'READY'
  | 'PUBLISHED'
  | 'SUSPENDED'
  | 'ARCHIVED'

export interface MarketplaceListing {
  id: string
  supplierItemId: string
  status: MarketplaceListingStatus
  publishedAt: string | null
  unpublishedAt: string | null
  featured: boolean
  searchRank: number
  views: number
  clicks: number
  inquiries: number
  createdAt: string
  updatedAt: string
}

export interface MarketplaceReadiness {
  supplierItemId: string
  isPublishable: boolean
  errors: string[]
  warnings: string[]
  score: number
}

// ─── Fragments ────────────────────────────────────────────────────────────────

const LISTING_FIELDS = `
  id
  supplierItemId
  status
  publishedAt
  unpublishedAt
  featured
  searchRank
  views
  clicks
  inquiries
  createdAt
  updatedAt
`

const READINESS_FIELDS = `
  supplierItemId
  isPublishable
  errors
  warnings
  score
`

// ─── Queries ──────────────────────────────────────────────────────────────────

// Fetch listing for a single item.
export async function fetchMarketplaceListing(
  supplierItemId: string,
): Promise<MarketplaceListing | null> {
  const QUERY = gql`
    query MarketplaceListing($supplierItemId: String!) {
      marketplaceListing(supplierItemId: $supplierItemId) {
        ${LISTING_FIELDS}
      }
    }
  `
  const res = await graphQLRequest<{ marketplaceListing: MarketplaceListing | null }>(
    QUERY,
    { supplierItemId },
  )
  return res.marketplaceListing
}

// Fetch all listings for the authenticated supplier.
export async function fetchMarketplaceListings(): Promise<MarketplaceListing[]> {
  const QUERY = gql`
    query MarketplaceListings {
      marketplaceListings {
        ${LISTING_FIELDS}
      }
    }
  `
  const res = await graphQLRequest<{ marketplaceListings: MarketplaceListing[] }>(QUERY, {})
  return res.marketplaceListings
}

// Run readiness check without publishing.
export async function fetchMarketplaceReadiness(
  supplierItemId: string,
): Promise<MarketplaceReadiness> {
  const QUERY = gql`
    query MarketplaceReadiness($supplierItemId: String!) {
      marketplaceReadiness(supplierItemId: $supplierItemId) {
        ${READINESS_FIELDS}
      }
    }
  `
  const res = await graphQLRequest<{ marketplaceReadiness: MarketplaceReadiness }>(
    QUERY,
    { supplierItemId },
  )
  return res.marketplaceReadiness
}

// ─── Mutations ────────────────────────────────────────────────────────────────

// Validate only — returns readiness without side-effects.
export async function validateMarketplaceItem(
  supplierItemId: string,
): Promise<MarketplaceReadiness> {
  const MUTATION = gql`
    mutation ValidateMarketplaceItem($supplierItemId: String!) {
      validateMarketplaceItem(supplierItemId: $supplierItemId) {
        ${READINESS_FIELDS}
      }
    }
  `
  const res = await graphQLRequest<{ validateMarketplaceItem: MarketplaceReadiness }>(
    MUTATION,
    { supplierItemId },
  )
  return res.validateMarketplaceItem
}

// Publish listing.
export async function publishMarketplaceItem(
  supplierItemId: string,
): Promise<MarketplaceListing> {
  const MUTATION = gql`
    mutation PublishMarketplaceItem($supplierItemId: String!) {
      publishMarketplaceItem(supplierItemId: $supplierItemId) {
        ${LISTING_FIELDS}
      }
    }
  `
  const res = await graphQLRequest<{ publishMarketplaceItem: MarketplaceListing }>(
    MUTATION,
    { supplierItemId },
  )
  return res.publishMarketplaceItem
}

// Unpublish listing — sets status to ARCHIVED.
export async function unpublishMarketplaceItem(
  supplierItemId: string,
): Promise<MarketplaceListing> {
  const MUTATION = gql`
    mutation UnpublishMarketplaceItem($supplierItemId: String!) {
      unpublishMarketplaceItem(supplierItemId: $supplierItemId) {
        ${LISTING_FIELDS}
      }
    }
  `
  const res = await graphQLRequest<{ unpublishMarketplaceItem: MarketplaceListing }>(
    MUTATION,
    { supplierItemId },
  )
  return res.unpublishMarketplaceItem
}
