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
    (sum, item) => sum + toCents(item.price) * item.quantity,
    0
  );

  let discountCents = 0;
  let vatCents = 0;
  const discountOptionRate = store.discountOption
  let totalCents = subtotalCents;
  let discountRate = 0
  if (!store.isVatRegistered) {
    // Non-VAT store
    if (discount.type === 'SENIOR' || discount.type === 'PWD') {
      discountCents = Math.round(subtotalCents * discountOptionRate[discount.type]);
      discountRate = discountOptionRate[discount.type]
    } else if (discount.type === 'PROMO') {
      discountCents = Math.round(
        subtotalCents * ((discountOptionRate[discount.type] ?? 0) / 100)
      );
      discountRate = discountOptionRate[discount.type]
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

  // VAT-registered store
  if (discount.type === 'SENIOR' || discount.type === 'PWD') {
    // 20% off and VAT exempt
    discountCents = Math.round(subtotalCents * discountOptionRate[discount.type]);
    discountRate = discountOptionRate[discount.type]
    vatCents = 0;
    totalCents = subtotalCents - discountCents;
  } else if (discount.type === 'PROMO') {
    discountCents = Math.round(
      subtotalCents * ((discountOptionRate[discount.type] ?? 0) / 100)
    );
    discountRate = discountOptionRate[discount.type]
    const afterPromo = subtotalCents - discountCents;
    vatCents = Math.round(afterPromo * 0.12); // VAT on discounted amount
    totalCents = afterPromo + vatCents;
  } else {
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
