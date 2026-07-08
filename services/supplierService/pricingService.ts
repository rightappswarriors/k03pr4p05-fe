import { graphQLRequest } from '../apiClient'

// Fragments
export const PRICING_LIST_ITEM_FIELDS = `
  fragment PricingListItemFields on PricingListItem {
    id
    name
    image
    sku
    categoryName
    categoryId
    currentCost
    sellingPrice
    margin
    markup
    priceTierCount
    updatedAt
    isActive
  }
`

export const PRICE_TIER_FIELDS = `
  fragment PriceTierFields on PriceTier {
    id
    minQty
    price
  }
`

export const SUPPLIER_ITEM_PRICING_FIELDS = `
  ${PRICE_TIER_FIELDS}
  fragment SupplierItemPricingFields on SupplierItem {
    id
    name
    description
    image
    sku
    unit
    unitPrice
    currentCost
    vatRate
    isVatExempt
    moq
    availableQty
    isActive
    createdAt
    updatedAt
    priceTiers {
      ...PriceTierFields
    }
  }
`

export const SCHEDULED_PRICE_FIELDS = `
  fragment ScheduledPriceFields on SupplierScheduledPrice {
    id
    supplierItemId
    price
    effectiveAt
    expiresAt
    status
    createdById
    createdAt
    updatedAt
  }
`

export const PRICE_HISTORY_FIELDS = `
  fragment PriceHistoryFields on SupplierItemPriceHistory {
    id
    supplierItemId
    oldPrice
    newPrice
    effectiveAt
    changedById
    reason
  }
`

// Queries
export const PRICING_DASHBOARD_QUERY = `
  query PricingDashboard($catalogId: String!) {
    pricingDashboard(catalogId: $catalogId) {
      activePriceCount
      averageSellingPrice
      averageMargin
      highestMargin
      lowestMargin
      productsOnPromotion
      scheduledPriceChanges
      priceUpdatesThisMonth
    }
  }
`

export const PRICING_LIST_QUERY = `
  ${PRICING_LIST_ITEM_FIELDS}
  query PricingList(
    $catalogId: String!
    $page: Int
    $pageSize: Int
    $filter: PricingListFilterInput
  ) {
    pricingList(catalogId: $catalogId, page: $page, pageSize: $pageSize, filter: $filter) {
      items {
        ...PricingListItemFields
      }
      total
      page
      pageSize
    }
  }
`

export const PRICING_DETAIL_QUERY = `
  ${SUPPLIER_ITEM_PRICING_FIELDS}
  query PricingDetail($supplierItemId: String!) {
    pricingDetail(supplierItemId: $supplierItemId) {
      margin
      markup
      profitPerUnit
      supplierItem {
        ...SupplierItemPricingFields
      }
    }
  }
`

export const PRICE_HISTORY_QUERY = `
  ${PRICE_HISTORY_FIELDS}
  query PriceHistory($supplierItemId: String!) {
    supplierItemPriceHistoryList(supplierItemId: $supplierItemId) {
      ...PriceHistoryFields
    }
  }
`

export const SCHEDULED_PRICES_QUERY = `
  ${SCHEDULED_PRICE_FIELDS}
  query ScheduledPrices($supplierItemId: String!) {
    scheduledPricesList(supplierItemId: $supplierItemId) {
      ...ScheduledPriceFields
    }
  }
`

export const PRICING_ANALYTICS_QUERY = `
  ${PRICE_HISTORY_FIELDS}
  query PricingAnalytics($supplierItemId: String!) {
    pricingAnalytics(supplierItemId: $supplierItemId) {
      estimatedRevenue
      estimatedProfit
      averageSellingPrice
      highestPrice
      lowestPrice
      averageMargin
      priceChangeCount
      priceTrend {
        ...PriceHistoryFields
      }
    }
  }
`

// Mutations
export const UPDATE_PRICE_MUTATION = `
  ${SUPPLIER_ITEM_PRICING_FIELDS}
  mutation UpdatePrice(
    $supplierItemId: String!
    $price: Float
    $vatRate: Float
    $moq: Int
    $reason: String
    $changedById: Int
    $priceTiers: [PriceTierInput!]
    $effectiveAt: DateTime
  ) {
    updatePrice(
      supplierItemId: $supplierItemId
      price: $price
      vatRate: $vatRate
      moq: $moq
      reason: $reason
      changedById: $changedById
      priceTiers: $priceTiers
      effectiveAt: $effectiveAt
    ) {
      ...SupplierItemPricingFields
    }
  }
`

export const PRICING_CATEGORIES_QUERY = `
  query PricingCategories($pageSize: Int, $isActive: Boolean) {
    getOrgCategories(pageSize: $pageSize, isActive: $isActive, orderBy: "asc") {
      id
      name
      isActive
    }
  }
`

export const BULK_UPDATE_PRICES_MUTATION = `
  mutation BulkUpdatePrices(
    $items: [BulkPriceUpdateItemInput!]!
    $reason: String
    $changedById: Int
  ) {
    bulkUpdatePrices(items: $items, reason: $reason, changedById: $changedById) {
      id
      unitPrice
      updatedAt
    }
  }
`

export const CREATE_SCHEDULED_PRICE_MUTATION = `
  ${SCHEDULED_PRICE_FIELDS}
  mutation CreateScheduledPrice(
    $supplierItemId: String!
    $price: Float!
    $effectiveAt: DateTime!
    $expiresAt: DateTime
    $createdById: Int
    $reason: String
  ) {
    createScheduledPrice(
      supplierItemId: $supplierItemId
      price: $price
      effectiveAt: $effectiveAt
      expiresAt: $expiresAt
      createdById: $createdById
      reason: $reason
    ) {
      ...ScheduledPriceFields
    }
  }
`

export const EDIT_SCHEDULED_PRICE_MUTATION = `
  ${SCHEDULED_PRICE_FIELDS}
  mutation EditScheduledPrice(
    $id: String!
    $price: Float
    $effectiveAt: DateTime
    $expiresAt: DateTime
    $reason: String
  ) {
    editScheduledPrice(id: $id, price: $price, effectiveAt: $effectiveAt, expiresAt: $expiresAt, reason: $reason) {
      ...ScheduledPriceFields
    }
  }
`

export const CANCEL_SCHEDULED_PRICE_MUTATION = `
  ${SCHEDULED_PRICE_FIELDS}
  mutation CancelScheduledPrice($id: String!) {
    cancelScheduledPrice(id: $id) {
      ...ScheduledPriceFields
    }
  }
`

export const DELETE_SCHEDULED_PRICE_MUTATION = `
  ${SCHEDULED_PRICE_FIELDS}
  mutation DeleteScheduledPrice($id: String!) {
    deleteScheduledPrice(id: $id) {
      ...ScheduledPriceFields
    }
  }
`

// Types
export interface PricingKPIs {
  activePriceCount: number
  averageSellingPrice: number
  averageMargin: number
  highestMargin: number
  lowestMargin: number
  productsOnPromotion: number
  scheduledPriceChanges: number
  priceUpdatesThisMonth: number
}

export interface PricingListItem {
  id: string
  name: string
  image: string | null
  sku: string | null
  categoryName: string | null
  categoryId: number | null
  currentCost: number
  sellingPrice: number
  margin: number
  markup: number
  priceTierCount: number
  updatedAt: string
  isActive: boolean
}

export interface PricingListFilterInput {
  search?: string
  categoryId?: number
  brand?: string
  minPrice?: number
  maxPrice?: number
  minMargin?: number
  maxMargin?: number
  startDate?: string
  endDate?: string
}

export interface PricingListResult {
  items: PricingListItem[]
  total: number
  page: number
  pageSize: number
}

export interface PriceTier {
  id: string
  minQty: number
  price: number
}

export interface PriceTierInput {
  minQty: number
  price: number
}

export interface PricingCategory {
  id: number
  name: string
  isActive: boolean
}

export interface SupplierItemPricing {
  id: string
  name: string
  description?: string | null
  image?: string | null
  sku?: string | null
  unit: string
  unitPrice: number
  currentCost?: number | null
  vatRate: number
  isVatExempt: boolean
  moq: number
  availableQty: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  priceTiers: PriceTier[]
}

export interface PricingDetail {
  supplierItem: SupplierItemPricing
  margin: number
  markup: number
  profitPerUnit: number
}

export type ScheduledPriceStatus = 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED'

export interface ScheduledPrice {
  id: string
  supplierItemId: string
  price: number
  effectiveAt: string
  expiresAt: string | null
  status: ScheduledPriceStatus
  createdById: number | null
  createdAt: string
  updatedAt: string
}

export interface PriceHistory {
  id: string
  supplierItemId: string
  oldPrice: number
  newPrice: number
  effectiveAt: string
  changedById: number | null
  reason: string | null
}

export interface PricingAnalytics {
  estimatedRevenue: number
  estimatedProfit: number
  averageSellingPrice: number
  highestPrice: number
  lowestPrice: number
  averageMargin: number
  priceChangeCount: number
  priceTrend: PriceHistory[]
}

export interface UpdatePriceInput {
  supplierItemId: string
  price?: number
  vatRate?: number
  moq?: number
  reason?: string
  changedById?: number
  priceTiers?: PriceTierInput[]
  effectiveAt?: string
}

export interface BulkPriceUpdateItemInput {
  supplierItemId: string
  price: number
}

export interface BulkUpdatePricesInput {
  items: BulkPriceUpdateItemInput[]
  reason?: string
  changedById?: number
}

export interface CreateScheduledPriceInput {
  supplierItemId: string
  price: number
  effectiveAt: string
  expiresAt?: string | null
  createdById?: number
  reason?: string
}

export interface EditScheduledPriceInput {
  id: string
  price?: number
  effectiveAt?: string
  expiresAt?: string | null
  reason?: string
}

export async function getPricingDashboard(catalogId: string): Promise<PricingKPIs> {
  const res = await graphQLRequest<{ pricingDashboard: PricingKPIs }>(PRICING_DASHBOARD_QUERY, { catalogId })
  return res.pricingDashboard
}

export async function getPricingList(
  catalogId: string,
  page = 1,
  pageSize = 20,
  filter?: PricingListFilterInput
): Promise<PricingListResult> {
  const res = await graphQLRequest<{ pricingList: PricingListResult }>(PRICING_LIST_QUERY, {
    catalogId,
    page,
    pageSize,
    filter: filter ?? null,
  })
  return res.pricingList
}

export async function getPricingCategories(): Promise<PricingCategory[]> {
  const res = await graphQLRequest<{ getOrgCategories: PricingCategory[] }>(
    PRICING_CATEGORIES_QUERY,
    { pageSize: 200, isActive: true }
  )
  return res.getOrgCategories
}

export async function getPricingDetail(supplierItemId: string): Promise<PricingDetail> {
  const res = await graphQLRequest<{ pricingDetail: PricingDetail }>(PRICING_DETAIL_QUERY, { supplierItemId })
  return res.pricingDetail
}

export async function getPriceHistory(supplierItemId: string): Promise<PriceHistory[]> {
  const res = await graphQLRequest<{ supplierItemPriceHistoryList: PriceHistory[] }>(
    PRICE_HISTORY_QUERY,
    { supplierItemId }
  )
  return res.supplierItemPriceHistoryList
}

export async function getScheduledPrices(supplierItemId: string): Promise<ScheduledPrice[]> {
  const res = await graphQLRequest<{ scheduledPricesList: ScheduledPrice[] }>(
    SCHEDULED_PRICES_QUERY,
    { supplierItemId }
  )
  return res.scheduledPricesList
}

export async function getPricingAnalytics(supplierItemId: string): Promise<PricingAnalytics> {
  const res = await graphQLRequest<{ pricingAnalytics: PricingAnalytics }>(
    PRICING_ANALYTICS_QUERY,
    { supplierItemId }
  )
  return res.pricingAnalytics
}

export async function updatePrice(input: UpdatePriceInput): Promise<SupplierItemPricing> {
  const res = await graphQLRequest<{ updatePrice: SupplierItemPricing }>(UPDATE_PRICE_MUTATION, input)
  return res.updatePrice
}

export async function bulkUpdatePrices(input: BulkUpdatePricesInput): Promise<SupplierItemPricing[]> {
  const res = await graphQLRequest<{ bulkUpdatePrices: SupplierItemPricing[] }>(
    BULK_UPDATE_PRICES_MUTATION,
    input
  )
  return res.bulkUpdatePrices
}

export async function createScheduledPrice(input: CreateScheduledPriceInput): Promise<ScheduledPrice> {
  const res = await graphQLRequest<{ createScheduledPrice: ScheduledPrice }>(
    CREATE_SCHEDULED_PRICE_MUTATION,
    input
  )
  return res.createScheduledPrice
}

export async function editScheduledPrice(input: EditScheduledPriceInput): Promise<ScheduledPrice> {
  const res = await graphQLRequest<{ editScheduledPrice: ScheduledPrice }>(
    EDIT_SCHEDULED_PRICE_MUTATION,
    input
  )
  return res.editScheduledPrice
}

export async function cancelScheduledPrice(id: string): Promise<ScheduledPrice> {
  const res = await graphQLRequest<{ cancelScheduledPrice: ScheduledPrice }>(
    CANCEL_SCHEDULED_PRICE_MUTATION,
    { id }
  )
  return res.cancelScheduledPrice
}

export async function deleteScheduledPrice(id: string): Promise<ScheduledPrice> {
  const res = await graphQLRequest<{ deleteScheduledPrice: ScheduledPrice }>(
    DELETE_SCHEDULED_PRICE_MUTATION,
    { id }
  )
  return res.deleteScheduledPrice
}
