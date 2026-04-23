import { CalculationResult, CartItem, DiscountOptions, Outlet } from '@/types';

function toCents(n: number) { return Math.round(n * 100); }
function fromCents(n: number) { return n / 100; }

export function calculateTotal(
  items: CartItem[],
  store: Outlet,
  discount: DiscountOptions,
): CalculationResult {
  const subtotalCents = items.reduce(
    (sum, item) => sum + toCents(item.priceAtSale ?? item.price) * item.quantity,
    0,
  );

  const vatableCents = items.reduce(
    (sum, item) =>
      sum + (item.vatable ? toCents(item.priceAtSale ?? item.price) * item.quantity : 0),
    0,
  );
  const nonVatableCents = subtotalCents - vatableCents;
  const vatRate = store.vatType?.rate ?? store.VatPercent ?? 0.12;
  const discountOptionRate = store.discountOption ?? {};
  const isSeniorOrPwd = /SENIOR|PWD/.test(discount.type || '');
  const applyVatExempt = Boolean(discount.applyVatExempt && isSeniorOrPwd);
  const vatCents = Math.round(vatableCents * vatRate);

  // ── Non-VAT store ───────────────────────────────────────────────────────────
  if (!store.isVatRegistered) {
    let discountCents = 0;
    let discountRate = 0;
    if (discount.type !== 'NONE') {
      discountRate = discountOptionRate[discount.type] ?? (isSeniorOrPwd ? 0.20 : 0);
      discountCents = Math.round(subtotalCents * discountRate);
    }
    return {
      subtotal: fromCents(subtotalCents),
      discount: fromCents(discountCents),
      vatAmount: 0,
      discountRate,
      total: fromCents(subtotalCents - discountCents),
    };
  }

  // ── VAT store, no discount ──────────────────────────────────────────────────
  if (discount.type === 'NONE') {
    const vatCents = Math.round(vatableCents * vatRate);
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
      return {
        subtotal: fromCents(subtotalCents),
        discount: 0,
        vatAmount: fromCents(vatCents),
        discountRate: 0,
        total: fromCents(subtotalCents + vatCents),
      };
    }

    const vatableExclusiveCents = Math.round(vatableCents / (1 + vatRate));
    const vatExemptAmountCents = vatableCents - vatableExclusiveCents;
    const scRate = discountOptionRate[discount.type] ?? 0.2;
    const scDiscCents = Math.round(vatableExclusiveCents * scRate);
    const totalCents = nonVatableCents + (vatableExclusiveCents - scDiscCents);

    return {
      subtotal: fromCents(subtotalCents),
      discount: fromCents(scDiscCents),
      vatAmount: 0,
      discountRate: scRate,
      total: fromCents(totalCents),
      isVatExempt: true,
      vatExemptAmount: fromCents(vatExemptAmountCents),
    };
  }

  // ── VAT store, regular promo ────────────────────────────────────────────────────────────
  const discountRate = discountOptionRate[discount.type] ?? 0;
  const discountCents = Math.round(subtotalCents * discountRate);
  const afterPromoCents = subtotalCents - discountCents;
  const discountedVatableCents = Math.round(vatableCents * (1 - discountRate));
  const promoVatCents = Math.round(discountedVatableCents * vatRate);

  return {
    subtotal: fromCents(subtotalCents),
    discount: fromCents(discountCents),
    vatAmount: fromCents(promoVatCents),
    discountRate,
    total: fromCents(afterPromoCents + promoVatCents),
  };
}