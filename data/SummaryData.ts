// data/SummaryData.ts
// Expense Summary (GIS) and Item Net Summary data
// Used by DashboardScreen tabs

export interface GISRow {
  id: string;
  main: "Income" | "Expenses";
  group: string;
  code: string;
  description: string;
  debit: number;
  credit: number;
  total: number;
}

export interface SummaryRow {
  id: string;
  itemCode: string;
  description: string;
  opExPct: number;   // OpEx contribution as a decimal e.g. 0.12
  computedCost: number;
  costContribution: number;
  sellingPrice: number;
  status?: string
}

// ─── Expense Summary (GIS) ────────────────────────────────────────────────────

export const INITIAL_GIS_ROWS: GISRow[] = [
  { id: "g01", main: "Income", group: "Sales Revenue", code: "REV-001", description: "Retail Sales - Main Branch", debit: 0, credit: 520000, total: 520000 },
  { id: "g02", main: "Income", group: "Sales Revenue", code: "REV-002", description: "Retail Sales - Cebu Branch", debit: 0, credit: 310000, total: 310000 },
  { id: "g03", main: "Income", group: "Other Income", code: "OTH-001", description: "Delivery Service Fees", debit: 0, credit: 18500, total: 18500 },
  { id: "g04", main: "Income", group: "Other Income", code: "OTH-002", description: "Franchise Royalty Income", debit: 0, credit: 45000, total: 45000 },
  { id: "g05", main: "Expenses", group: "Cost of Sales", code: "COS-001", description: "Purchases - Groceries", debit: 385000, credit: 0, total: -385000 },
  { id: "g06", main: "Expenses", group: "Cost of Sales", code: "COS-002", description: "Freight and Delivery Cost", debit: 22000, credit: 0, total: -22000 },
  { id: "g07", main: "Expenses", group: "Operating Exp", code: "OPX-001", description: "Salaries and Wages", debit: 148000, credit: 0, total: -148000 },
  { id: "g08", main: "Expenses", group: "Operating Exp", code: "OPX-002", description: "SSS / PhilHealth / Pag-IBIG", debit: 18600, credit: 0, total: -18600 },
  { id: "g09", main: "Expenses", group: "Operating Exp", code: "OPX-003", description: "Electricity - Main Branch", debit: 24500, credit: 0, total: -24500 },
  { id: "g10", main: "Expenses", group: "Operating Exp", code: "OPX-004", description: "Electricity - Cebu Branch", debit: 15800, credit: 0, total: -15800 },
  { id: "g11", main: "Expenses", group: "Operating Exp", code: "OPX-005", description: "Rent Expense - Main Branch", debit: 35000, credit: 0, total: -35000 },
  { id: "g12", main: "Expenses", group: "Operating Exp", code: "OPX-006", description: "Internet and Communication", debit: 4200, credit: 0, total: -4200 },
  { id: "g13", main: "Expenses", group: "Operating Exp", code: "OPX-007", description: "Fuel and Transportation", debit: 8500, credit: 0, total: -8500 },
  { id: "g14", main: "Expenses", group: "Admin Expenses", code: "ADM-001", description: "Office Supplies", debit: 3200, credit: 0, total: -3200 },
  { id: "g15", main: "Expenses", group: "Admin Expenses", code: "ADM-002", description: "Representation and Entertainment", debit: 5500, credit: 0, total: -5500 },
  { id: "g16", main: "Expenses", group: "Tax and Gov", code: "TAX-001", description: "VAT Payable - March", debit: 37800, credit: 0, total: -37800 },
  { id: "g17", main: "Expenses", group: "Tax and Gov", code: "TAX-002", description: "Withholding Tax - Suppliers", debit: 4200, credit: 0, total: -4200 },
  { id: "g18", main: "Expenses", group: "Depreciation", code: "DEP-001", description: "Depreciation - POS Equipment", debit: 6800, credit: 0, total: -6800 },
  { id: "g19", main: "Expenses", group: "Depreciation", code: "DEP-002", description: "Depreciation - Delivery Vehicle", debit: 12500, credit: 0, total: -12500 },
  { id: "g20", main: "Income", group: "Sales Revenue", code: "REV-003", description: "Kompra Online Orders Revenue", debit: 0, credit: 128000, total: 128000 },
];

// ─── Item Net Summary ─────────────────────────────────────────────────────────

export const INITIAL_SUMMARY_ROWS: SummaryRow[] = [
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