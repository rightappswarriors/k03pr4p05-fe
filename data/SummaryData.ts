// data/SummaryData.ts
// Expense Summary (GIS) and Item Net Summary data
// Used by DashboardScreen tabs

export interface GISRow {
  id: string;
  main: "Income" | "Expenses" | string;
  group: string;
  code: string;
  description: string;
  debit: number;
  credit: number;
  total: number;
  amount?: number;
  createdAt?: string;
  accountTitleId: any,
  centerId: any,
  subCenterId: any,
}

export interface SummaryRow {
  id: string;
  itemCode: string;
  itemName?: string;
  itemId?: string;
  costLines?: { label: string; amount: number }[];
  description: string;
  amount?: number;
  baseCost: number;
  centerId?: number;
  subCenterId?: number;
  accountTitleId?: number;
  orgId?: number;
  vatInput: number;
  sellingPrice: number;
  vatOutput: number;
  opExPct: number; // OpEx contribution as a decimal e.g. 0.12
  opExAmount: number;
  grossProfit: number;
  netProfit: number;
  status?: string;
  computedCost: number;
  costContribution: number;
  createdAt: string;
}



export const INITIAL_SUMMARY_ROWS = [
  { id: "s01", itemCode: "RICE-GAN-25", description: "Ganador Rice 25kg", opExPct: 0.08, computedCost: 1050, costContribution: 1084, sellingPrice: 1200 },
  { id: "s02", itemCode: "RICE-NFA-25", description: "NFA Rice 25kg", opExPct: 0.08, computedCost: 820, costContribution: 846, sellingPrice: 950 },
  { id: "s03", itemCode: "CAN-CTF-155", description: "Century Tuna Flakes", opExPct: 0.12, computedCost: 28, costContribution: 29, sellingPrice: 38 },
  { id: "s04", itemCode: "CAN-PCB-150", description: "Purefoods Corned Beef", opExPct: 0.12, computedCost: 40, costContribution: 41, sellingPrice: 55 },
  { id: "s05", itemCode: "BEV-SPR-1.5", description: "Sprite 1.5L", opExPct: 0.10, computedCost: 42, costContribution: 44, sellingPrice: 55 },
  { id: "s06", itemCode: "BEV-RC-1.5", description: "RC Cola 1.5L", opExPct: 0.10, computedCost: 30, costContribution: 31, sellingPrice: 42 },
  { id: "s07", itemCode: "SNK-CHI-22", description: "Chippy BBQ 22g", opExPct: 0.15, computedCost: 18, costContribution: 19, sellingPrice: 27 },
  { id: "s08", itemCode: "SNK-PIA-85", description: "Piattos Cheese 85g", opExPct: 0.15, computedCost: 32, costContribution: 33, sellingPrice: 45 },
  { id: "s09", itemCode: "DAI-BB-300", description: "Bear Brand 300g", opExPct: 0.10, computedCost: 158, costContribution: 163, sellingPrice: 185 },
  { id: "s10", itemCode: "DAI-AEV-155", description: "Alaska Evap 155ml", opExPct: 0.12, computedCost: 15, costContribution: 16, sellingPrice: 22 },
  { id: "s11", itemCode: "PCA-SFG-135", description: "Safeguard Bar 135g", opExPct: 0.12, computedCost: 32, costContribution: 33, sellingPrice: 45 },
  { id: "s12", itemCode: "PCA-DVS-180", description: "Dove Shampoo 180ml", opExPct: 0.12, computedCost: 95, costContribution: 98, sellingPrice: 125 },
  { id: "s13", itemCode: "BEV-NES-100", description: "Nescafe 3in1 100s", opExPct: 0.10, computedCost: 420, costContribution: 433, sellingPrice: 550 },
  { id: "s14", itemCode: "FOD-LM-PC", description: "Lucky Me Pancit Canton", opExPct: 0.15, computedCost: 10, costContribution: 10, sellingPrice: 15 },
  { id: "s15", itemCode: "HHD-TID-1K", description: "Tide Powder 1kg", opExPct: 0.12, computedCost: 65, costContribution: 67, sellingPrice: 88 },
];