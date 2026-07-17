// Frontend service for Supplier Item Variant operations.
import { gql } from 'graphql-request'
import { graphQLRequest } from '../apiClient'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VariantOption {
  id: string
  variantGroupId: string
  value: string
  colorHex?: string | null
  image?: string | null
  sortOrder: number
}

export interface VariantGroup {
  id: string
  supplierItemId: string
  name: string
  sortOrder: number
  createdAt: string
  updatedAt: string
  options: VariantOption[]
}

export interface VariantValue {
  variantId: string
  optionId: string
  option: VariantOption
}

export interface SupplierItemVariant {
  id: string
  supplierItemId: string
  sku?: string | null
  barcode?: string | null
  name: string
  price: number
  cost: number
  availableQty: number
  reservedQty: number
  incomingQty: number
  damagedQty: number
  returnedQty: number
  reorderLevel?: number | null
  reorderQty?: number | null
  weight?: number | null
  length?: number | null
  width?: number | null
  height?: number | null
  image?: string | null
  resolvedImage?: string | null
  isDefault: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
  variantValues: VariantValue[]
}

export interface GenerateVariantsResult {
  created: number
  skipped: number
  variants: SupplierItemVariant[]
}

// ─── Fragments ────────────────────────────────────────────────────────────────

const VARIANT_OPTION_FIELDS = `
  id variantGroupId value colorHex image sortOrder
`

const VARIANT_VALUE_FIELDS = `
  variantId optionId
  option { ${VARIANT_OPTION_FIELDS} }
`

const VARIANT_FIELDS = `
  id supplierItemId sku barcode name
  price cost
  availableQty reservedQty incomingQty damagedQty returnedQty
  reorderLevel reorderQty
  weight length width height
  image resolvedImage
  isDefault isActive
  createdAt updatedAt deletedAt
  variantValues { ${VARIANT_VALUE_FIELDS} }
`

const GROUP_FIELDS = `
  id supplierItemId name sortOrder createdAt updatedAt
  options { ${VARIANT_OPTION_FIELDS} }
`

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function fetchVariants(supplierItemId: string): Promise<SupplierItemVariant[]> {
  const QUERY = gql`
    query SupplierItemVariants($supplierItemId: String!) {
      supplierItemVariants(supplierItemId: $supplierItemId) { ${VARIANT_FIELDS} }
    }
  `
  const res = await graphQLRequest<{ supplierItemVariants: SupplierItemVariant[] }>(QUERY, { supplierItemId })
  return res.supplierItemVariants
}

export async function fetchVariant(id: string): Promise<SupplierItemVariant | null> {
  const QUERY = gql`
    query SupplierItemVariant($id: String!) {
      supplierItemVariant(id: $id) { ${VARIANT_FIELDS} }
    }
  `
  const res = await graphQLRequest<{ supplierItemVariant: SupplierItemVariant | null }>(QUERY, { id })
  return res.supplierItemVariant
}

export async function fetchVariantGroups(supplierItemId: string): Promise<VariantGroup[]> {
  const QUERY = gql`
    query VariantGroups($supplierItemId: String!) {
      variantGroups(supplierItemId: $supplierItemId) { ${GROUP_FIELDS} }
    }
  `
  const res = await graphQLRequest<{ variantGroups: VariantGroup[] }>(QUERY, { supplierItemId })
  return res.variantGroups
}

export async function fetchVariantOptions(variantGroupId: string): Promise<VariantOption[]> {
  const QUERY = gql`
    query VariantOptions($variantGroupId: String!) {
      variantOptions(variantGroupId: $variantGroupId) { ${VARIANT_OPTION_FIELDS} }
    }
  `
  const res = await graphQLRequest<{ variantOptions: VariantOption[] }>(QUERY, { variantGroupId })
  return res.variantOptions
}

// ─── Group mutations ──────────────────────────────────────────────────────────

export async function createVariantGroup(input: {
  supplierItemId: string
  name: string
  sortOrder?: number
  options?: Array<{ value: string; colorHex?: string; image?: string; sortOrder?: number }>
}): Promise<VariantGroup> {
  const MUTATION = gql`
    mutation CreateVariantGroup($supplierItemId: String!, $name: String!, $sortOrder: Int, $options: [VariantOptionInput!]) {
      createVariantGroup(supplierItemId: $supplierItemId, name: $name, sortOrder: $sortOrder, options: $options) { ${GROUP_FIELDS} }
    }
  `
  const res = await graphQLRequest<{ createVariantGroup: VariantGroup }>(MUTATION, input)
  return res.createVariantGroup
}

export async function updateVariantGroup(id: string, name?: string, sortOrder?: number): Promise<VariantGroup> {
  const MUTATION = gql`
    mutation UpdateVariantGroup($id: String!, $name: String, $sortOrder: Int) {
      updateVariantGroup(id: $id, name: $name, sortOrder: $sortOrder) { ${GROUP_FIELDS} }
    }
  `
  const res = await graphQLRequest<{ updateVariantGroup: VariantGroup }>(MUTATION, { id, name, sortOrder })
  return res.updateVariantGroup
}

export async function deleteVariantGroup(id: string): Promise<boolean> {
  const MUTATION = gql`
    mutation DeleteVariantGroup($id: String!) { deleteVariantGroup(id: $id) }
  `
  const res = await graphQLRequest<{ deleteVariantGroup: boolean }>(MUTATION, { id })
  return res.deleteVariantGroup
}

// ─── Option mutations ─────────────────────────────────────────────────────────

export async function createVariantOption(input: {
  variantGroupId: string
  value: string
  colorHex?: string | null
  image?: string | null
  sortOrder?: number
}): Promise<VariantOption> {
  const MUTATION = gql`
    mutation CreateVariantOption($variantGroupId: String!, $value: String!, $colorHex: String, $image: String, $sortOrder: Int) {
      createVariantOption(variantGroupId: $variantGroupId, value: $value, colorHex: $colorHex, image: $image, sortOrder: $sortOrder) { ${VARIANT_OPTION_FIELDS} }
    }
  `
  const res = await graphQLRequest<{ createVariantOption: VariantOption }>(MUTATION, input)
  return res.createVariantOption
}

export async function updateVariantOption(id: string, updates: Partial<Omit<VariantOption, 'id' | 'variantGroupId'>>): Promise<VariantOption> {
  const MUTATION = gql`
    mutation UpdateVariantOption($id: String!, $value: String, $colorHex: String, $image: String, $sortOrder: Int) {
      updateVariantOption(id: $id, value: $value, colorHex: $colorHex, image: $image, sortOrder: $sortOrder) { ${VARIANT_OPTION_FIELDS} }
    }
  `
  const res = await graphQLRequest<{ updateVariantOption: VariantOption }>(MUTATION, { id, ...updates })
  return res.updateVariantOption
}

export async function deleteVariantOption(id: string): Promise<boolean> {
  const MUTATION = gql`
    mutation DeleteVariantOption($id: String!) { deleteVariantOption(id: $id) }
  `
  const res = await graphQLRequest<{ deleteVariantOption: boolean }>(MUTATION, { id })
  return res.deleteVariantOption
}

// ─── Variant mutations ────────────────────────────────────────────────────────

export async function createVariant(input: {
  supplierItemId: string
  name: string
  price: number
  cost?: number
  sku?: string | null
  barcode?: string | null
  availableQty?: number
  image?: string | null
  weight?: number | null
  length?: number | null
  width?: number | null
  height?: number | null
  isDefault?: boolean
  optionIds: string[]
}): Promise<SupplierItemVariant> {
  const MUTATION = gql`
    mutation CreateVariant($input: CreateVariantInput!) {
      createVariant(input: $input) { ${VARIANT_FIELDS} }
    }
  `
  const res = await graphQLRequest<{ createVariant: SupplierItemVariant }>(MUTATION, { input })
  return res.createVariant
}

export async function updateVariant(input: {
  id: string
  name?: string | null
  price?: number | null
  cost?: number | null
  sku?: string | null
  barcode?: string | null
  availableQty?: number | null
  reorderLevel?: number | null
  reorderQty?: number | null
  image?: string | null
  weight?: number | null
  length?: number | null
  width?: number | null
  height?: number | null
  isDefault?: boolean | null
  isActive?: boolean | null
}): Promise<SupplierItemVariant> {
  const MUTATION = gql`
    mutation UpdateVariant($input: UpdateVariantInput!) {
      updateVariant(input: $input) { ${VARIANT_FIELDS} }
    }
  `
  const res = await graphQLRequest<{ updateVariant: SupplierItemVariant }>(MUTATION, { input })
  return res.updateVariant
}

export async function deleteVariant(id: string): Promise<boolean> {
  const MUTATION = gql`
    mutation DeleteVariant($id: String!) { deleteVariant(id: $id) }
  `
  const res = await graphQLRequest<{ deleteVariant: boolean }>(MUTATION, { id })
  return res.deleteVariant
}

// Generate the full Cartesian product of variants from existing groups.
export async function generateVariants(input: {
  supplierItemId: string
  basePrice: number
  baseCost?: number | null
}): Promise<GenerateVariantsResult> {
  const MUTATION = gql`
    mutation GenerateVariants($supplierItemId: String!, $basePrice: Float!, $baseCost: Float) {
      generateVariants(supplierItemId: $supplierItemId, basePrice: $basePrice, baseCost: $baseCost) {
        created skipped
        variants { ${VARIANT_FIELDS} }
      }
    }
  `
  const res = await graphQLRequest<{ generateVariants: GenerateVariantsResult }>(MUTATION, input)
  return res.generateVariants
}
