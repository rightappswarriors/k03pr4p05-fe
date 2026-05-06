import { CalculationResult, CartItem, DiscountOptions, Outlet, DEFAULT_VAT_RATE } from '@/types';

function toCents(n: number) { return Math.round(n * 100); }
function fromCents(n: number) { return n / 100; }

/**
 * Calculate per-item VAT amount.
 * Items with vatExempt === true are VAT-exempt (no VAT).
 * Items with vatExempt !== true are subject to 12% VAT.
 */
export function calculateItemVat(item: CartItem, isVatRegistered: boolean, vatExemptActive: boolean): number {
  if (vatExemptActive) {
    return 0;
  }
  if (!isVatRegistered) return 0;

  // If vatExempt === true, item is VAT-exempt and no VAT is applied
  if (item.vatExempt === true) return 0;

  const itemPrice = item.priceAtSale ?? item.price;
  const discountQty = (item as any).discountQuantity ?? 0;
  const discountRate = (item as any).discountRate ?? 0;

  // Calculate discounted and regular portions
  const discountedPrice = itemPrice * (1 - discountRate);
  const discountedQty = discountQty;
  const regularQty = item.quantity - discountQty;

  const lineTotal = (discountedPrice * discountedQty) + (itemPrice * regularQty);
  const itemVat = lineTotal * DEFAULT_VAT_RATE;

  return itemVat;
}

export function calculateTotal(
  items: CartItem[],
  store: Outlet,
  discount: DiscountOptions,
  vatExemptActive: boolean,
): CalculationResult {
  // Create a copy of items to avoid mutating the original array
  const itemsWithVat = items.map(item => ({
    ...item,
    itemVatAmount: calculateItemVat(item, store.isVatRegistered ?? false, vatExemptActive),
  }));

  // Calculate subtotal with per-item discounts
  const subtotalCents = itemsWithVat.reduce(
    (sum, item) => {
      const itemPrice = toCents(item.priceAtSale ?? item.price);
      const discountQty = (item as any).discountQuantity ?? 0;
      const discountRate = (item as any).discountRate ?? 0;

      // Discounted items
      const discountedPrice = itemPrice * (1 - discountRate);
      const discountedQty = discountQty;

      // Regular price items
      const regularQty = item.quantity - discountQty;

      return sum + (discountedPrice * discountedQty) + (itemPrice * regularQty);
    },
    0,
  );

  const vatableCents = itemsWithVat.reduce(
    (sum, item) => {
      // Item is vatable if vatExempt !== true
      const isVatable = item.vatExempt !== true;
      if (!isVatable) return sum;
      const itemPrice = toCents(item.priceAtSale ?? item.price);
      const discountQty = (item as any).discountQuantity ?? 0;
      const discountRate = (item as any).discountRate ?? 0;

      // Discounted items
      const discountedPrice = itemPrice * (1 - discountRate);
      const discountedQty = discountQty;

      // Regular price items
      const regularQty = item.quantity - discountQty;

      return sum + (discountedPrice * discountedQty) + (itemPrice * regularQty);
    },
    0,
  );

  const nonVatableCents = subtotalCents - vatableCents;
  const vatRate = store.vatType?.rate ?? store.VatPercent ?? DEFAULT_VAT_RATE;
  const discountOptionRate = store.discountOption ?? {};
  const isSeniorOrPwd = /SENIOR|PWD/.test(discount.type || '');
  const applyVatExempt = Boolean(discount.applyVatExempt && isSeniorOrPwd);

  // Sum all per-item VAT amounts
  const totalItemVatCents = toCents(itemsWithVat.reduce((sum, item) => sum + (item.itemVatAmount ?? 0), 0));
  const vatCents = store.isVatRegistered ? totalItemVatCents : 0;

  // ── Non-VAT store ───────────────────────────────────────────────────────────
  if (!store.isVatRegistered) {
    // For non-VAT stores, per-item discounts are already applied in subtotal
    // Global discounts are not supported for per-item discount system
    return {
      subtotal: fromCents(subtotalCents),
      discount: 0, // Per-item discounts are already deducted
      vatAmount: 0,
      discountRate: 0,
      total: fromCents(subtotalCents),
    };
  }

  // ── VAT store ──────────────────────────────────────────────────────────────
  if (discount.type === 'NONE') {
    return {
      subtotal: fromCents(subtotalCents),
      discount: 0,
      vatAmount: fromCents(vatCents),
      discountRate: 0,
      total: fromCents(subtotalCents + vatCents),
    };
  }

  // ── VAT store, SC/PWD exemption ──────────────────────────────────────────────
  if (isSeniorOrPwd) {
    if (!applyVatExempt) {
      // SC/PWD not applied, use per-item VAT
      return {
        subtotal: fromCents(subtotalCents),
        discount: 0,
        vatAmount: fromCents(vatCents),
        discountRate: 0,
        total: fromCents(subtotalCents + vatCents),
      };
    }

    // SC/PWD exemption applied: calculate the VAT that would have been charged
    const vatableExclusiveCents = Math.round(vatableCents / (1 + vatRate));
    const vatExemptAmountCents = vatableCents - vatableExclusiveCents;
    const scRate = discountOptionRate[discount.type] ?? 0.2;
    const scDiscCents = Math.round(vatableExclusiveCents * scRate);
    const totalCents = nonVatableCents + (vatableExclusiveCents - scDiscCents);

    return {
      subtotal: fromCents(subtotalCents),
      discount: fromCents(scDiscCents),
      vatAmount: 0, // No VAT when SC/PWD exemption is applied
      discountRate: scRate,
      total: fromCents(totalCents),
      isVatExempt: true,
      vatExemptAmount: fromCents(vatExemptAmountCents),
    };
  }

  // ── VAT store, regular promo ────────────────────────────────────────────────────────────
  // Note: With per-item VAT, we keep the per-item VAT amounts calculated above
  const discountRate = discountOptionRate[discount.type] ?? 0;
  const discountCents = Math.round(subtotalCents * discountRate);
  const afterPromoCents = subtotalCents - discountCents;

  return {
    subtotal: fromCents(subtotalCents),
    discount: fromCents(discountCents),
    vatAmount: fromCents(vatCents),
    discountRate,
    total: fromCents(afterPromoCents + vatCents),
  };
}