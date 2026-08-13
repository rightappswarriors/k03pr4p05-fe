
// ─── Helpers ──────────────────────────────────────────────────────────────────
export type VatType =
  | "VAT Inclusive (12%)"
  | "VAT Exclusive (12%)"
  | "VAT Exempt"
  | "Zero Rated";

  
export function calVatAmount(grossAmount: number, vatRate?: number): number {

  return parseFloat((grossAmount * (vatRate || 0)).toFixed(2));
}
export function calcVatAndNet(
  grossAmount: number,
  vatType: string | { rate: number; name?: string }
): { vat: number; net: number } {
  // If vatType is an object with rate, use it directly
  if (typeof vatType === 'object' && vatType.rate !== undefined) {
    const vat = grossAmount * vatType.rate;
    return { vat: parseFloat(vat.toFixed(2)), net: grossAmount };
  }

  // Fallback to string matching for backward compatibility
  switch (vatType) {
    case "VAT Inclusive (12%)": {
      const net = grossAmount / 1.12;
      const vat = grossAmount - net;
      return { vat: parseFloat(vat.toFixed(2)), net: parseFloat(net.toFixed(2)) };
    }
    case "VAT Exclusive (12%)": {
      const vat = grossAmount * 0.12;
      return { vat: parseFloat(vat.toFixed(2)), net: grossAmount };
    }
    case "VAT Exempt":
    case "Zero Rated":
    default:
      return { vat: 0, net: grossAmount };
  }
}
 
// ─── Profit calculation ────────────────────────────────────────────────────────
 
export function getProfitOrExpense(
  sellingPrice: number,
  costContribution?: number
): number {
  if (costContribution === undefined) {
    return sellingPrice; // treat as profit if cost contribution is missing
  }
  if (!Number.isFinite(sellingPrice) || !Number.isFinite(costContribution)) {
    return 0;
  }
  return sellingPrice - costContribution;
}

export function formatPesoCompact(amount: number): string {
  const abs = Math.abs(amount);
  let result: string;
  if (abs >= 1_000_000) result = `₱${(abs / 1_000_000).toFixed(2)}M`;
  else if (abs >= 1_000) result = `₱${(abs / 1_000).toFixed(1)}K`;
  else result = `₱${abs.toFixed(2)}`;
  return amount < 0 ? `-${result}` : result;
}
 
export function formatPeso(n: number): string {
    return `₱${Math.abs(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}


export function getResponsiveColumns(width: number): number {
    if (width >= 1200) return 4;
    if (width >= 900) return 3;
    if (width >= 600) return 2;
    return 1;
}