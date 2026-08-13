import { ItemUnit } from "@/types";

// utils/stockHelpers.ts
export const formatStockDisplay = (
  quantity: number,
  defaultUnit?: ItemUnit
): string => {
  if (!defaultUnit) return `${quantity}`;
  
  const { unitLabel, conversionFactor, unitName } = defaultUnit;
  
  if (conversionFactor === 1) {
    // base unit — just show quantity + unit name
    return `${quantity} ${unitName}`;
  }
  
  // Convert to display unit
  const displayQty = quantity / conversionFactor;
  const remainder = quantity % conversionFactor;
  
  if (remainder === 0) {
    return `${displayQty} ${unitLabel}`;
  }
  
  // e.g. "2 cases + 3 pieces" or "2.5 sacks"
  return `${displayQty.toFixed(1)} ${unitName}`;
};

// Examples:
// quantity=48, defaultUnit=case(factor=24) → "2 cases"
// quantity=50, defaultUnit=kg(factor=1)    → "50 kg"
// quantity=2500, defaultUnit=kg, baseUnit=gram → "2.5 kg"