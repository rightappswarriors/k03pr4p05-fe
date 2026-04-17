import { CalculationResult, CartItem, DiscountOptions, Outlet } from '@/types';

function toCents(amount: number) {
  return Math.round(amount * 100);
}
function fromCents(cents: number) {
  return cents / 100;
}

export function calculateTotal(
  items: CartItem[],
  store: Outlet,
  discount: DiscountOptions,
): CalculationResult {
  const subtotalCents = items.reduce(
    (sum, item) =>
      sum + toCents(item.priceAtSale ?? item.price) * item.quantity,
    0,
  );

  const discountOptionRate = store.discountOption ?? {};
  let discountCents = 0;
  let vatCents = 0;
  let totalCents = subtotalCents;
  let discountRate = 0;

  const isSeniorOrPwd =
    discount.type === 'SENIOR' || discount.type === 'PWD';

  if (!store.isVatRegistered) {
    // ── Non-VAT store ────────────────────────────────────────────────────────
    if (isSeniorOrPwd) {
      discountRate = discountOptionRate[discount.type] ?? 0.20;
      discountCents = Math.round(subtotalCents * discountRate);
    } else if (discount.type !== 'NONE') {
      // PROMO or custom — rate stored as decimal in discountOption
      discountRate = discountOptionRate[discount.type] ?? 0;
      discountCents = Math.round(subtotalCents * discountRate);
    }
    totalCents = subtotalCents - discountCents;
    return {
      subtotal: fromCents(subtotalCents),
      discount: fromCents(discountCents),
      vatAmount: 0,
      discountRate,
      total: fromCents(totalCents),
    };
  }

  // ── VAT-registered store ─────────────────────────────────────────────────
  if (isSeniorOrPwd) {
    // BIR-compliant order:
    // 1. Strip VAT first  →  vatExclusivePrice = subtotal / 1.12
    // 2. Apply 20% on VAT-exclusive price
    // 3. VAT = 0 (exempt)
    const vatExclusiveCents = Math.round(subtotalCents / 1.12);
    discountRate = discountOptionRate[discount.type] ?? 0.20;
    discountCents = Math.round(vatExclusiveCents * discountRate);
    vatCents = 0;                                          // VAT exempt
    totalCents = vatExclusiveCents - discountCents;
  } else if (discount.type !== 'NONE') {
    // PROMO: discount on VAT-inclusive, then compute VAT on discounted amount
    discountRate = discountOptionRate[discount.type] ?? 0;
    discountCents = Math.round(subtotalCents * discountRate);
    const afterPromo = subtotalCents - discountCents;
    vatCents = Math.round(afterPromo * 0.12);
    totalCents = afterPromo + vatCents;
  } else {
    // No discount — normal VAT
    vatCents = Math.round(subtotalCents * 0.12);
    totalCents = subtotalCents + vatCents;
  }

  return {
    discountRate,
    subtotal: fromCents(subtotalCents),
    discount: fromCents(discountCents),
    vatAmount: fromCents(vatCents),
    total: fromCents(totalCents),
  };
}