/**
 * catalogValidator.ts
 * Reusable marketplace eligibility validator for portal.kompra.ph.
 * Consumed by ProductDetailsModal, MarketplaceReadinessModal, CatalogCards,
 * and future kompra.ph marketplace integration — keep validation logic here,
 * never inline it in UI components.
 */
import type { SupplierItem } from '@/services/supplierService/supplierService'
import type { SupplierItemVariant } from '@/services/supplierService/variantService'

export interface ValidationResult {
  eligible: boolean
  errors: string[]    // blocking — must fix before publishing
  warnings: string[]  // non-blocking suggestions
}

// ── Base product checks ────────────────────────────────────────────────────────

function validateBaseProduct(
  item: SupplierItem,
  hasVariants: boolean,
): Pick<ValidationResult, 'errors' | 'warnings'> {
  const errors: string[] = []
  const warnings: string[] = []

  if (!item.name?.trim())        errors.push('Product name is required.')
  if (!item.description?.trim()) errors.push('Product description is required.')
  if (!(item as any).categoryId) errors.push('Category is required.')
  if (!item.image)               errors.push('At least one product image is required.')
  if (!item.unit?.trim())        errors.push('Unit of measure is required.')
  if (!(item.unitPrice > 0))     errors.push('Selling price must be greater than zero.')
  if (!(item.moq >= 1))          errors.push('Minimum Order Quantity (MOQ) must be at least 1.')
  if (!item.isActive)            errors.push('Product must be active before publishing.')

  // Inventory only required on parent when the item has no variants.
  if (!hasVariants && !(item.availableQty > 0)) {
    errors.push('Available inventory must be greater than zero.')
  }

  // Non-blocking suggestions
  if (!item.sku?.trim()) warnings.push('Adding a SKU improves search and order-tracking.')

  return { errors, warnings }
}

// ── Per-variant checks ────────────────────────────────────────────────────────

function validateVariants(
  variants: SupplierItemVariant[],
): Pick<ValidationResult, 'errors' | 'warnings'> {
  const errors: string[] = []
  const warnings: string[] = []

  const active = variants.filter(v => v.isActive && !v.deletedAt)

  if (active.length === 0) {
    errors.push('At least one active variant is required.')
    return { errors, warnings }
  }

  // Duplicate SKU check across all active variants.
  const skus = active.map(v => v.sku).filter(Boolean)
  if (new Set(skus).size < skus.length) {
    errors.push('Duplicate variant SKU found. Each variant must have a unique SKU.')
  }

  for (const v of active) {
    const label = v.name || `Variant (…${v.id.slice(-4)})`

    if (!(v.price > 0))        errors.push(`"${label}": Selling price must be greater than zero.`)
    if (v.cost < 0)            errors.push(`"${label}": Cost cannot be negative.`)
    if (v.availableQty < 0)    errors.push(`"${label}": Inventory cannot be negative.`)
    if (!(v.availableQty > 0)) warnings.push(`"${label}": Inventory is zero — buyers cannot order this variant.`)
    if (!v.image)              warnings.push(`"${label}": No variant image set; parent image will be used as fallback.`)
    if (!v.sku?.trim())        warnings.push(`"${label}": No SKU set.`)
    if (!v.variantValues?.length) {
      errors.push(`"${label}": Must be linked to at least one variant attribute.`)
    }
  }

  return { errors, warnings }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * validateMarketplaceEligibility
 * Call this before any publish attempt or to show the readiness checklist.
 * Pass `variants` when the item has the variant system enabled.
 */
export function validateMarketplaceEligibility(
  item: SupplierItem,
  variants?: SupplierItemVariant[],
): ValidationResult {
  const hasVariants = (variants?.length ?? 0) > 0
  const base = validateBaseProduct(item, hasVariants)
  const variantCheck = hasVariants ? validateVariants(variants!) : { errors: [], warnings: [] }

  return {
    eligible: base.errors.length === 0 && variantCheck.errors.length === 0,
    errors: [...base.errors, ...variantCheck.errors],
    warnings: [...base.warnings, ...variantCheck.warnings],
  }
}

/**
 * Quick inline check used by the inventory/MOQ inputs in ProductDetailsModal.
 * Returns a field-level error string or null.
 */
export function validateInventoryField(
  field: 'availableQty' | 'moq',
  rawValue: string,
): string | null {
  const n = parseFloat(rawValue)
  if (isNaN(n)) return 'Must be a valid number.'
  if (field === 'availableQty' && n < 0) return 'Inventory cannot be negative.'
  if (field === 'moq' && n < 1) return 'MOQ must be at least 1.'
  return null
}
