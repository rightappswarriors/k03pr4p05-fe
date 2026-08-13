// Financial calculation helpers — shared between conversation timeline cards
// and PO/order screens.  All amounts are in the currency configured on the
// SupplierItem / PO (default PHP).

export const DEFAULT_VAT_RATE = 0.12;

export interface FinancialBreakdown {
  quantity: number;
  unitPrice: number;
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  isVatExempt: boolean;
  grandTotal: number;
}

/**
 * Compute a full financial breakdown from unit price, qty and VAT info.
 * Mirrors the backend logic in supplierRFQService.createPurchaseOrder.
 */
export function computeFinancials(
  quantity: number,
  unitPrice: number,
  vatRate: number = DEFAULT_VAT_RATE,
  isVatExempt: boolean = false,
): FinancialBreakdown {
  const subtotal = unitPrice * quantity;
  const effectiveVatRate = isVatExempt ? 0 : vatRate;
  const vatAmount = isVatExempt ? 0 : subtotal * vatRate;
  const grandTotal = subtotal + vatAmount;

  return {
    quantity,
    unitPrice,
    subtotal,
    vatRate: effectiveVatRate,
    vatAmount,
    isVatExempt,
    grandTotal,
  };
}

/** Format a number as Philippine Peso currency. */
export function formatPHP(value: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

/** Resolve sender display name with the documented priority chain. */
export function resolveSenderName(
  opts: {
    fullName?: string | null;
    organizationName?: string | null;
    email?: string | null;
    senderType?: "AGENT" | "SUPPLIER" | null;
  },
): string {
  if (opts.fullName && opts.fullName.trim()) return opts.fullName.trim();
  if (opts.organizationName && opts.organizationName.trim())
    return opts.organizationName.trim();
  if (opts.email && opts.email.trim()) return opts.email.trim();
  // Fall back to role labels
  if (opts.senderType === "AGENT") return "Agent";
  if (opts.senderType === "SUPPLIER") return "Supplier";
  return "Unknown";
}

/**
 * Format a date safely — never renders "Invalid Date".
 * Returns a graceful fallback when the value is missing or unparseable.
 */
export function formatDateSafe(
  iso: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions,
): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-PH", options ?? {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatTimeSafe(
  iso: string | Date | null | undefined,
): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-PH", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
