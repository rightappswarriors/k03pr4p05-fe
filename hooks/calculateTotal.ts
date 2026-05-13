import { CalculationResult, CartItem, DiscountOptions, Outlet, DEFAULT_VAT_RATE } from '@/types';

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export type CustomerType = 'REGULAR' | 'SENIOR_CITIZEN' | 'PWD';

export type DiscountType =
  | 'NONE'
  | 'SENIOR_CITIZEN'
  | 'PWD'
  | 'BNPC_SENIOR_CITIZEN'
  | 'BNPC_PWD'
  | 'CUSTOM'
  | 'SENIOR'
  | 'PROMO'
  | string;

export interface ScPwdDiscountParams {
  customerType: CustomerType;
  discountType: DiscountType;
  totalPax?: number;
  scPwdPax?: number;
  customDiscountRate?: number;
  isVatRegistered?: boolean;
}

export interface ExtraCharge {
  label: string;
  amount: number;
}

export interface SalesOrderTotalsParams {
  items: CartItem[];
  extraCharges?: ExtraCharge[];
  scPwdParams?: ScPwdDiscountParams;
}

export type ItemBreakdown = CartItem & {
  discountType?: DiscountType;
  discountRate?: number;
  discountAmount?: number;
  originalPrice?: number;
  vatExclusivePrice?: number;
  finalPrice?: number;
  lineTotal?: number;
};

export function removeVat(price: number, vatRate = DEFAULT_VAT_RATE): number {
  return price / (1 + vatRate);
}

export function calculateItemVat(
  item: CartItem,
  isVatRegistered: boolean,
  vatExemptActive: boolean,
  rate: number = item.rate ?? DEFAULT_VAT_RATE,
): number {
  if (!isVatRegistered || vatExemptActive || item.vatExempt === true || item.isVatExempt === true || item.rate === 0) {
    return 0;
  }

  const itemPrice = item.priceAtSale ?? item.price;
  const discountQty = item.discountQuantity ?? 0;
  const discountRate = item.discountRate ?? 0;
  const discountedPrice = itemPrice * (1 - discountRate);
  const regularQty = item.quantity - discountQty;
  const lineTotal = discountedPrice * discountQty + itemPrice * regularQty;

  return roundMoney(lineTotal - removeVat(lineTotal, item.vatRate ?? DEFAULT_VAT_RATE));
}

function normalizeDiscountType(type?: string): DiscountType {
  if (type === 'SENIOR') return 'SENIOR_CITIZEN';
  return (type ?? 'NONE') as DiscountType;
}

function discountRateFor(type: DiscountType, customRate = 0) {
  if (type === 'SENIOR_CITIZEN' || type === 'PWD') return 0.2;
  if (type === 'BNPC_SENIOR_CITIZEN' || type === 'BNPC_PWD') return 0.05;
  if (type === 'CUSTOM' || type === 'PROMO') return customRate;
  return 0;
}

export function computeScPwdDiscount(
  params: ScPwdDiscountParams,
  items: CartItem[],
) {
  const discountType = normalizeDiscountType(params.discountType);
  const rate = discountRateFor(discountType, params.customDiscountRate);
  const totalPax = Number(params.totalPax || 0);
  const scPwdPax = Number(params.scPwdPax || 0);
  const proportion = totalPax > 0 && scPwdPax > 0 ? Math.min(scPwdPax / totalPax, 1) : 1;
  const isScPwd = discountType === 'SENIOR_CITIZEN' || discountType === 'PWD';
  const isBnpc = discountType === 'BNPC_SENIOR_CITIZEN' || discountType === 'BNPC_PWD';

  let discountAmount = 0;
  let vatExemptSale = 0;
  let vatAmount = 0;
  let netTotal = 0;

  const itemBreakdown = items.map((item) => {
    const originalPrice = item.priceAtSale ?? item.price;
    const quantity = item.quantity;
    const vatRate = item.vatRate ?? DEFAULT_VAT_RATE;
    const isVatExemptItem = item.vatExempt === true || item.isVatExempt === true;
    const eligible = isScPwd || (isBnpc && item.isBNPC === true);
    const eligibleQty = eligible ? quantity * proportion : 0;
    const regularQty = quantity - eligibleQty;

    if (!eligible || rate <= 0) {
      const lineVat = params.isVatRegistered && !isVatExemptItem
        ? originalPrice - removeVat(originalPrice, vatRate)
        : 0;
      vatAmount += lineVat * quantity;
      netTotal += originalPrice * quantity;
      return {
        ...item,
        discountType: 'NONE',
        discountRate: 0,
        discountAmount: 0,
        originalPrice,
        vatExclusivePrice: isVatExemptItem ? originalPrice : removeVat(originalPrice, vatRate),
        finalPrice: originalPrice,
        lineTotal: originalPrice * quantity,
      };
    }

    if (isBnpc) {
      const perUnitDiscount = originalPrice * rate;
      const lineDiscount = perUnitDiscount * eligibleQty;
      const lineVat = params.isVatRegistered && !isVatExemptItem
        ? originalPrice - removeVat(originalPrice, vatRate)
        : 0;
      const lineTotal = originalPrice * regularQty + (originalPrice - perUnitDiscount) * eligibleQty;
      discountAmount += lineDiscount;
      vatAmount += lineVat * quantity;
      netTotal += lineTotal;
      return {
        ...item,
        discountType,
        discountRate: rate,
        discountAmount: roundMoney(lineDiscount),
        originalPrice,
        vatExclusivePrice: isVatExemptItem ? originalPrice : removeVat(originalPrice, vatRate),
        finalPrice: roundMoney(originalPrice - perUnitDiscount),
        lineTotal: roundMoney(lineTotal),
      };
    }

    const vatExclusivePrice =
      params.isVatRegistered && !isVatExemptItem ? removeVat(originalPrice, vatRate) : originalPrice;
    const perUnitDiscount = vatExclusivePrice * rate;
    const discountedUnit = vatExclusivePrice - perUnitDiscount;
    const regularVat = params.isVatRegistered && !isVatExemptItem
      ? originalPrice - vatExclusivePrice
      : 0;
    const lineDiscount = perUnitDiscount * eligibleQty;
    const lineTotal = originalPrice * regularQty + discountedUnit * eligibleQty;

    discountAmount += lineDiscount;
    vatExemptSale += vatExclusivePrice * eligibleQty;
    vatAmount += regularVat * regularQty;
    netTotal += lineTotal;

    return {
      ...item,
      discountType,
      discountRate: rate,
      discountAmount: roundMoney(lineDiscount),
      originalPrice,
      vatExclusivePrice: roundMoney(vatExclusivePrice),
      finalPrice: roundMoney(discountedUnit),
      lineTotal: roundMoney(lineTotal),
    };
  });

  return {
    discountAmount: roundMoney(discountAmount),
    vatExemptSale: roundMoney(vatExemptSale),
    vatAmount: roundMoney(vatAmount),
    netTotal: roundMoney(netTotal),
    itemBreakdown,
  };
}

export function calculateTotal(
  items: CartItem[],
  store: Outlet,
  discount: DiscountOptions = { type: 'NONE' },
  vatExemptActive = false,
  scPwdParams?: Partial<ScPwdDiscountParams>,
): CalculationResult {
  const discountType = normalizeDiscountType(scPwdParams?.discountType ?? discount.type);
  const subtotal = roundMoney(
    items.reduce((sum, item) => sum + (item.priceAtSale ?? item.price) * item.quantity, 0),
  );
  const isVatRegistered = Boolean(store.isVatRegistered);

  if (discountType !== 'NONE' || vatExemptActive) {
    const result = computeScPwdDiscount(
      {
        customerType: scPwdParams?.customerType ?? (vatExemptActive ? 'SENIOR_CITIZEN' : 'REGULAR'),
        discountType: vatExemptActive && discountType === 'NONE' ? 'SENIOR_CITIZEN' : discountType,
        totalPax: scPwdParams?.totalPax,
        scPwdPax: scPwdParams?.scPwdPax,
        customDiscountRate: scPwdParams?.customDiscountRate ?? discount.promoPercent ?? 0,
        isVatRegistered,
      },
      items,
    );

    return {
      subtotal,
      discount: result.discountAmount,
      vatAmount: result.vatAmount,
      vatExemptSale: result.vatExemptSale,
      discountRate: discountRateFor(discountType, scPwdParams?.customDiscountRate ?? 0),
      total: result.netTotal,
      netTotal: result.netTotal,
      isVatExempt: vatExemptActive || discountType === 'SENIOR_CITIZEN' || discountType === 'PWD',
      vatExemptAmount: result.vatExemptSale,
      itemBreakdown: result.itemBreakdown,
    };
  }

  const vatAmount = items.reduce(
    (sum, item) => sum + calculateItemVat(item, isVatRegistered, false),
    0,
  );

  return {
    subtotal,
    discount: 0,
    vatAmount: roundMoney(vatAmount),
    vatExemptSale: 0,
    discountRate: 0,
    total: roundMoney(subtotal),
    netTotal: roundMoney(subtotal),
    itemBreakdown: items.map((item) => ({
      ...item,
      discountType: 'NONE',
      discountRate: item.discountRate ?? 0,
      discountAmount: item.discountAmount ?? 0,
      originalPrice: item.priceAtSale ?? item.price,
      vatExclusivePrice: item.priceAtSale ?? item.price,
      finalPrice: item.priceAtSale ?? item.price,
    })),
  };
}

export function computeSalesOrderTotals(params: SalesOrderTotalsParams) {
  const subtotal = roundMoney(
    params.items.reduce(
      (sum, item) => sum + (item.priceAtSale ?? item.price) * item.quantity,
      0,
    ),
  );
  const discountType = normalizeDiscountType(params.scPwdParams?.discountType ?? 'NONE');
  const shouldApplyDiscount = Boolean(params.scPwdParams && discountType !== 'NONE');
  const discountResult = shouldApplyDiscount
    ? computeScPwdDiscount(params.scPwdParams!, params.items)
    : {
        discountAmount: 0,
        vatExemptSale: 0,
        vatAmount: roundMoney(
          params.items.reduce(
            (sum, item) =>
              sum +
              calculateItemVat(
                item,
                params.scPwdParams?.isVatRegistered ?? true,
                false,
              ),
            0,
          ),
        ),
        netTotal: subtotal,
        itemBreakdown: params.items.map((item) => ({
          ...item,
          discountType: 'NONE',
          discountRate: item.discountRate ?? 0,
          discountAmount: item.discountAmount ?? 0,
          originalPrice: item.priceAtSale ?? item.price,
          vatExclusivePrice: item.priceAtSale ?? item.price,
          finalPrice: item.priceAtSale ?? item.price,
          lineTotal: (item.priceAtSale ?? item.price) * item.quantity,
        })) as ItemBreakdown[],
      };

  const extraChargesTotal = roundMoney(
    (params.extraCharges ?? []).reduce(
      (sum, charge) => sum + (Number(charge.amount) || 0),
      0,
    ),
  );

  const netTotal = shouldApplyDiscount
    ? discountResult.netTotal
    : subtotal;

  return {
    subtotal,
    discountAmount: discountResult.discountAmount,
    vatExemptSale: discountResult.vatExemptSale,
    vatAmount: discountResult.vatAmount,
    extraChargesTotal,
    total: roundMoney(netTotal),
    grandTotal: roundMoney(netTotal + extraChargesTotal),
    itemBreakdown: discountResult.itemBreakdown as ItemBreakdown[],
  };
}
