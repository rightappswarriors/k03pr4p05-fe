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
  bnpcDiscountUsed?: number;
  bnpcEligibleAmountUsed?: number;
  bnpcCapManuallyReached?: boolean;
  disableBnpc?: boolean;
}

export interface ExtraCharge {
  label: string;
  amount: number;
}

export interface SalesOrderTotalsParams {
  items: CartItem[];
  extraCharges?: ExtraCharge[];
  scPwdParams?: ScPwdDiscountParams;
  automaticDiscounts?: boolean;
}

export type ItemBreakdown = CartItem & {
  discountType?: DiscountType;
  discountRate?: number;
  discountAmount?: number;
  originalPrice?: number;
  vatExclusivePrice?: number;
  finalPrice?: number;
  lineTotal?: number;
  eligibleAmount?: number;
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
  const discountAmount = roundMoney(item.discountAmount ?? itemPrice * discountRate * discountQty);
  const lineTotal = roundMoney(itemPrice * item.quantity - discountAmount);

  return roundMoney(lineTotal - removeVat(lineTotal, rate));
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

  const BNPC_WEEKLY_PURCHASE_LIMIT = 2500;
  const BNPC_WEEKLY_DISCOUNT_CAP = 125;
  let remainingBnpcPurchase = Math.max(0, BNPC_WEEKLY_PURCHASE_LIMIT - Number(params.bnpcEligibleAmountUsed ?? 0));
  let remainingBnpcDiscount = Math.max(0, BNPC_WEEKLY_DISCOUNT_CAP - Number(params.bnpcDiscountUsed ?? 0));
  let bnpcCapReached = Boolean(params.bnpcCapManuallyReached) || remainingBnpcPurchase <= 0 || remainingBnpcDiscount <= 0;

  let discountAmount = 0;
  let vatExemptSale = 0;
  let vatAmount = 0;
  let netTotal = 0;

  const itemBreakdown = items.map((item) => {
    const originalPrice = item.priceAtSale ?? item.price;
    const quantity = item.quantity;
    const vatRate = item.vatRate ?? DEFAULT_VAT_RATE;
    const isVatExemptItem = item.vatExempt === true || item.isVatExempt === true;
    const discountQty = Math.max(0, Math.min(quantity, item.discountQuantity ?? 0));
    const manualDiscountRate = item.discountRate ?? 0;
    const manualDiscountAmount = roundMoney(
      item.discountAmount !== undefined && item.discountAmount !== 0
        ? item.discountAmount
        : Math.max(0, originalPrice * manualDiscountRate * discountQty),
    );
    const eligibleBnpc = isBnpc && !bnpcCapReached && item.isBNPC === true && !params.disableBnpc;
    const eligibleSenior = (isScPwd || (isBnpc && (bnpcCapReached || params.disableBnpc))) && item.hasSeniorDiscountVATExempt === true;
    const eligible = eligibleBnpc || eligibleSenior;
    const eligibleQty = eligible ? quantity * proportion : 0;
    const regularQty = quantity - eligibleQty;
    const regularVat = params.isVatRegistered && !isVatExemptItem
      ? originalPrice - removeVat(originalPrice, vatRate)
      : 0;

    if (!eligible || rate <= 0) {
      const lineTotal = roundMoney(originalPrice * quantity - manualDiscountAmount);
      discountAmount += manualDiscountAmount;
      vatAmount += regularVat * quantity;
      netTotal += lineTotal;
      return {
        ...item,
        discountType: manualDiscountAmount > 0 ? 'CUSTOM' : 'NONE',
        discountRate: manualDiscountAmount > 0 ? manualDiscountRate : 0,
        discountAmount: manualDiscountAmount,
        originalPrice,
        vatExclusivePrice: isVatExemptItem ? originalPrice : removeVat(originalPrice, vatRate),
        finalPrice: lineTotal / quantity,
        lineTotal,
      };
    }

    if (eligibleBnpc) {
      const lineGross = originalPrice * quantity;
      const eligibleAmount = originalPrice * eligibleQty;
      const eligibleAmountToDiscount = Math.max(0, Math.min(eligibleAmount, remainingBnpcPurchase));
      const lineDiscount = roundMoney(Math.min(eligibleAmountToDiscount * rate, remainingBnpcDiscount));
      const totalDiscount = roundMoney(lineDiscount + manualDiscountAmount);
      const lineTotal = roundMoney(lineGross - totalDiscount);

      discountAmount += totalDiscount;
      vatAmount += regularVat * quantity;
      netTotal += lineTotal;
      remainingBnpcPurchase = Math.max(0, remainingBnpcPurchase - eligibleAmountToDiscount);
      remainingBnpcDiscount = Math.max(0, remainingBnpcDiscount - lineDiscount);

      return {
        ...item,
        discountType: manualDiscountAmount > 0 ? 'CUSTOM' : discountType,
        discountRate: manualDiscountAmount > 0 ? manualDiscountRate : rate,
        discountAmount: totalDiscount,
        originalPrice,
        vatExclusivePrice: isVatExemptItem ? originalPrice : removeVat(originalPrice, vatRate),
        finalPrice: roundMoney(lineTotal / quantity),
        lineTotal,
      };
    }

    const vatExclusivePrice = params.isVatRegistered && !isVatExemptItem
      ? removeVat(originalPrice, vatRate)
      : originalPrice;
    const effectiveRate = isBnpc && bnpcCapReached ? 0.2 : rate;
    const effectiveDiscountType = isBnpc && bnpcCapReached
      ? (discountType === 'BNPC_PWD' ? 'PWD' : 'SENIOR_CITIZEN')
      : discountType;
    const perUnitDiscount = vatExclusivePrice * effectiveRate;
    const discountedUnit = vatExclusivePrice - perUnitDiscount;
    const seniorLineDiscount = roundMoney(perUnitDiscount * eligibleQty);
    const totalDiscount = roundMoney(seniorLineDiscount + manualDiscountAmount);
    const lineTotal = roundMoney(originalPrice * regularQty + discountedUnit * eligibleQty - manualDiscountAmount);

    discountAmount += totalDiscount;
    vatExemptSale += roundMoney(vatExclusivePrice * eligibleQty);
    vatAmount += regularVat * regularQty;
    netTotal += lineTotal;

    return {
      ...item,
      discountType: manualDiscountAmount > 0 ? 'CUSTOM' : effectiveDiscountType,
      discountRate: manualDiscountAmount > 0 ? manualDiscountRate : effectiveRate,
      discountAmount: totalDiscount,
      originalPrice,
      vatExclusivePrice: roundMoney(vatExclusivePrice),
      finalPrice: roundMoney(lineTotal / quantity),
      lineTotal,
    };
  });

  return {
    discountAmount: roundMoney(discountAmount),
    vatExemptSale: roundMoney(vatExemptSale),
    vatAmount: roundMoney(vatAmount),
    netTotal: roundMoney(netTotal),
    itemBreakdown,
    bnpcCapReached,
  };
}

export function computeAutomaticItemDiscounts(
  params: Omit<ScPwdDiscountParams, 'discountType'>,
  items: CartItem[],
) {
  const customerType = params.customerType;
  const isEligibleCustomer = customerType === 'SENIOR_CITIZEN' || customerType === 'PWD';
  const totalPax = Number(params.totalPax || 0);
  const scPwdPax = Number(params.scPwdPax || 0);
  const proportion = totalPax > 0 && scPwdPax > 0 ? Math.min(scPwdPax / totalPax, 1) : 1;
  const bnpcType: DiscountType = customerType === 'PWD' ? 'BNPC_PWD' : 'BNPC_SENIOR_CITIZEN';
  const seniorType: DiscountType = customerType === 'PWD' ? 'PWD' : 'SENIOR_CITIZEN';

  const BNPC_WEEKLY_PURCHASE_LIMIT = 2500;
  const BNPC_WEEKLY_DISCOUNT_CAP = 125;
  let remainingBnpcPurchase = Math.max(0, BNPC_WEEKLY_PURCHASE_LIMIT - Number(params.bnpcEligibleAmountUsed ?? 0));
  let remainingBnpcDiscount = Math.max(0, BNPC_WEEKLY_DISCOUNT_CAP - Number(params.bnpcDiscountUsed ?? 0));
  let bnpcCapReached = Boolean(params.bnpcCapManuallyReached) || remainingBnpcPurchase <= 0 || remainingBnpcDiscount <= 0;

  let discountAmount = 0;
  let vatExemptSale = 0;
  let vatAmount = 0;
  let netTotal = 0;

  const itemBreakdown = items.map((item) => {
    const originalPrice = item.priceAtSale ?? item.price;
    const quantity = item.quantity;
    const vatRate = item.vatRate ?? DEFAULT_VAT_RATE;
    const isVatExemptItem = item.vatExempt === true || item.isVatExempt === true;
    const seniorEligible = isEligibleCustomer && item.hasSeniorDiscountVATExempt === true;
    const bnpcEligible = isEligibleCustomer && !bnpcCapReached && !seniorEligible && item.isBNPC === true && !params.disableBnpc;
    const seniorFallbackEligible = isEligibleCustomer && (bnpcCapReached || params.disableBnpc) && item.hasSeniorDiscountVATExempt === true;
    const eligibleQty = (seniorEligible || bnpcEligible || seniorFallbackEligible) ? quantity * proportion : 0;
    const regularQty = quantity - eligibleQty;
    const regularVat = params.isVatRegistered && !isVatExemptItem
      ? originalPrice - removeVat(originalPrice, vatRate)
      : 0;

    if (!seniorEligible && !bnpcEligible && !seniorFallbackEligible) {
      const lineTotal = roundMoney(originalPrice * quantity);
      vatAmount += regularVat * quantity;
      netTotal += lineTotal;
      return {
        ...item,
        discountType: 'NONE',
        discountRate: 0,
        discountAmount: 0,
        originalPrice,
        vatExclusivePrice: isVatExemptItem ? originalPrice : roundMoney(removeVat(originalPrice, vatRate)),
        finalPrice: originalPrice,
        lineTotal,
        eligibleAmount: 0,
      };
    }

    if (bnpcEligible) {
      const lineGross = originalPrice * quantity;
      const eligibleAmount = originalPrice * eligibleQty;
      const eligibleAmountToDiscount = Math.max(0, Math.min(eligibleAmount, remainingBnpcPurchase));
      const lineDiscount = roundMoney(Math.min(eligibleAmountToDiscount * 0.05, remainingBnpcDiscount));
      const lineTotal = roundMoney(lineGross - lineDiscount);

      discountAmount += lineDiscount;
      vatAmount += regularVat * quantity;
      netTotal += lineTotal;
      remainingBnpcPurchase = Math.max(0, remainingBnpcPurchase - eligibleAmountToDiscount);
      remainingBnpcDiscount = Math.max(0, remainingBnpcDiscount - lineDiscount);
      bnpcCapReached = remainingBnpcPurchase <= 0 || remainingBnpcDiscount <= 0;

      return {
        ...item,
        discountType: bnpcType,
        discountRate: 0.05,
        discountAmount: lineDiscount,
        originalPrice,
        vatExclusivePrice: isVatExemptItem ? originalPrice : roundMoney(removeVat(originalPrice, vatRate)),
        finalPrice: roundMoney(originalPrice * 0.95),
        lineTotal,
        eligibleAmount: roundMoney(eligibleAmountToDiscount),
      };
    }

    const vatExclusivePrice = params.isVatRegistered && !isVatExemptItem
      ? removeVat(originalPrice, vatRate)
      : originalPrice;
    const lineDiscount = roundMoney(vatExclusivePrice * 0.2 * eligibleQty);
    const discountedUnit = vatExclusivePrice * 0.8;
    const lineTotal = roundMoney(originalPrice * regularQty + discountedUnit * eligibleQty);

    discountAmount += lineDiscount;
    vatExemptSale += roundMoney(vatExclusivePrice * eligibleQty);
    vatAmount += regularVat * regularQty;
    netTotal += lineTotal;

    return {
      ...item,
      discountType: seniorType,
      discountRate: 0.2,
      discountAmount: lineDiscount,
      originalPrice,
      vatExclusivePrice: roundMoney(vatExclusivePrice),
      finalPrice: roundMoney(discountedUnit),
      lineTotal,
      eligibleAmount: roundMoney(vatExclusivePrice * eligibleQty),
    };
  });

  return {
    discountAmount: roundMoney(discountAmount),
    vatExemptSale: roundMoney(vatExemptSale),
    vatAmount: roundMoney(vatAmount),
    netTotal: roundMoney(netTotal),
    itemBreakdown,
    bnpcCapReached,
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
      grossSubtotal: subtotal,
      vatableSale: roundMoney(Math.max(0, result.netTotal - result.vatExemptSale - result.vatAmount)),
      discount: result.discountAmount,
      vatAmount: result.vatAmount,
      vatExemptSale: result.vatExemptSale,
      discountRate: discountRateFor(discountType, scPwdParams?.customDiscountRate ?? 0),
      total: result.netTotal,
      netTotal: result.netTotal,
      isVatExempt: vatExemptActive || discountType === 'SENIOR_CITIZEN' || discountType === 'PWD' || Boolean((result as any).bnpcCapReached),
      vatExemptAmount: result.vatExemptSale,
      itemBreakdown: result.itemBreakdown,
      bnpcCapReached: Boolean((result as any).bnpcCapReached),
    };
  }

  let discountTotal = 0;
  let netTotal = 0;

  const itemBreakdown = items.map((item) => {
    const originalPrice = item.priceAtSale ?? item.price;
    const discountQty = Math.max(0, Math.min(item.quantity, item.discountQuantity ?? 0));
    const discountRate = item.discountRate ?? 0;
    const lineDiscount = roundMoney(
      item.discountAmount !== undefined && item.discountAmount !== 0
        ? item.discountAmount
        : Math.max(0, originalPrice * discountRate * discountQty),
    );
    const lineTotal = roundMoney(originalPrice * item.quantity - lineDiscount);
    const itemDiscountType = (item as any).discountType as DiscountType | undefined;
    const knownDiscountTypes: DiscountType[] = [
      'SENIOR',
      'SENIOR_CITIZEN',
      'PWD',
      'BNPC_SENIOR_CITIZEN',
      'BNPC_PWD',
      'CUSTOM',
      'PROMO',
    ];
    const discountType = lineDiscount > 0
      ? knownDiscountTypes.includes(itemDiscountType ?? 'NONE') && itemDiscountType !== 'NONE'
        ? itemDiscountType
        : 'CUSTOM'
      : 'NONE';

    discountTotal += lineDiscount;
    netTotal += lineTotal;

    return {
      ...item,
      discountType,
      discountRate,
      discountAmount: lineDiscount,
      originalPrice,
      vatExclusivePrice: originalPrice,
      finalPrice: item.quantity ? roundMoney(lineTotal / item.quantity) : originalPrice,
      lineTotal,
    };
  });

  const vatAmount = roundMoney(
    items.reduce((sum, item) => sum + calculateItemVat(item, isVatRegistered, false), 0),
  );

  return {
    subtotal,
    grossSubtotal: subtotal,
    vatableSale: roundMoney(Math.max(0, netTotal - vatAmount)),
    discount: roundMoney(discountTotal),
    vatAmount,
    vatExemptSale: 0,
    discountRate: 0,
    total: roundMoney(netTotal),
    netTotal: roundMoney(netTotal),
    itemBreakdown,
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
  const shouldApplyDiscount = Boolean(params.scPwdParams && (discountType !== 'NONE' || params.automaticDiscounts));
  const discountResult = shouldApplyDiscount
    ? params.automaticDiscounts
      ? computeAutomaticItemDiscounts(params.scPwdParams!, params.items)
      : computeScPwdDiscount(params.scPwdParams!, params.items)
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
    grossSubtotal: subtotal,
    vatableSale: roundMoney(Math.max(0, subtotal - discountResult.vatExemptSale - discountResult.vatAmount)),
    discountAmount: discountResult.discountAmount,
    vatExemptSale: discountResult.vatExemptSale,
    vatAmount: discountResult.vatAmount,
    extraChargesTotal,
    total: roundMoney(netTotal),
    grandTotal: roundMoney(netTotal + extraChargesTotal),
    itemBreakdown: discountResult.itemBreakdown as ItemBreakdown[],
    bnpcCapReached: Boolean((discountResult as any).bnpcCapReached),
  };
}
