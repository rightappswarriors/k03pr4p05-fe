// data/erpMockData.ts
// Rich mock data for all ERP screens — Philippine business context
// Replace with real API calls screen by screen when backend is ready

// ─── Dashboard ───────────────────────────────────────────────────────────────

export const dashboarMock = {
  totalSales: 2_847_500,
  inventoryItems: 312,
  employees: 48,
  monthlyProfit: 634_200,
  salesGrowth: "+12.4%",
  inventoryChange: "-3.1%",
  employeeChange: "+2",
  profitGrowth: "+8.7%",
};

export const dashboardStats = {
  totalSales: 0,
  inventoryItems: 0,
  employees: 0,
  monthlyProfit: 0,
  salesGrowth: "-",
  inventoryChange: "-",
  employeeChange: "-",
  profitGrowth: "-",
};

// ─── Sales Trend ─────────────────────────────────────────────────────────────

export const salesTrend = {
  labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
  data: [380000, 420000, 395000, 510000, 480000, 562000],
};

export const salesTrendByQuarter = {
  labels: ["Q1", "Q2", "Q3", "Q4"],
  data: [1195000, 1552000, 1680000, 1820000],
};

// ─── Inventory Distribution ───────────────────────────────────────────────────

export const inventoryDistribution = {
  labels: ["Rice", "Canned", "Beverages", "Snacks", "Dairy", "Personal"],
  data: [1200, 860, 540, 720, 380, 290],
};

// ─── Finance ──────────────────────────────────────────────────────────────────

export const financeData = {
  revenue: 2_847_500,
  expenses: 2_213_300,
  profit: 634_200,
  revenueVsExpenses: {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    revenue: [420000, 445000, 460000, 510000, 495000, 517500],
    expenses: [328000, 342000, 355000, 390000, 398000, 400300],
  },
};

export const financeByYear: Record<string, typeof financeData> = {
  "2026": financeData,
  "2025": {
    revenue: 2_490_000,
    expenses: 1_980_000,
    profit: 510_000,
    revenueVsExpenses: {
      labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
      revenue: [370000, 390000, 400000, 430000, 450000, 450000],
      expenses: [295000, 310000, 322000, 345000, 362000, 346000],
    },
  },
};

// ─── Sales Orders ────────────────────────────────────────────────────────────

export const salesOrders = [
  { id: "ORD-2026-0041", customer: "Maria Santos", product: "Ganador Rice 25kg", qty: 3, total: 3600, status: "Completed", date: "2026-03-17", outlet: "Main Branch" },
  { id: "ORD-2026-0040", customer: "Juan dela Cruz", product: "Sprite 1.5L (24pcs)", qty: 2, total: 1320, status: "Processing", date: "2026-03-17", outlet: "Main Branch" },
  { id: "ORD-2026-0039", customer: "Ana Reyes", product: "Nescafe 3in1 (100s)", qty: 5, total: 2750, status: "Completed", date: "2026-03-16", outlet: "Cebu Branch" },
  { id: "ORD-2026-0038", customer: "Rosa Gonzales", product: "Milo 300g", qty: 8, total: 1000, status: "Shipped", date: "2026-03-16", outlet: "Main Branch" },
  { id: "ORD-2026-0037", customer: "Pedro Manalo", product: "Lucky Me Instant", qty: 12, total: 720, status: "Pending", date: "2026-03-15", outlet: "Davao Branch" },
  { id: "ORD-2026-0036", customer: "Luz Bautista", product: "Bear Brand 300g", qty: 4, total: 1480, status: "Completed", date: "2026-03-15", outlet: "Main Branch" },
  { id: "ORD-2026-0035", customer: "Carlo Mercado", product: "Pampers NB 44s", qty: 6, total: 5100, status: "Cancelled", date: "2026-03-14", outlet: "Cebu Branch" },
  { id: "ORD-2026-0034", customer: "Tess Valdez", product: "Dove Soap 135g", qty: 24, total: 2880, status: "Completed", date: "2026-03-14", outlet: "Main Branch" },
  { id: "ORD-2026-0033", customer: "Ben Torres", product: "San Miguel Beer 1L", qty: 10, total: 2500, status: "Shipped", date: "2026-03-13", outlet: "Davao Branch" },
  { id: "ORD-2026-0032", customer: "Carmen Flores", product: "Chippy BBQ 22g", qty: 50, total: 1350, status: "Completed", date: "2026-03-13", outlet: "Main Branch" },
];

// ─── Inventory Items ──────────────────────────────────────────────────────────

export const inventoryItems = [
  { id: "INV001", name: "Ganador Rice 25kg", sku: "RICE-GAN-25", stock: 142, minStock: 20, category: "Rice", price: 1200, lowStock: false },
  { id: "INV002", name: "NFA Rice 25kg", sku: "RICE-NFA-25", stock: 8, minStock: 15, category: "Rice", price: 950, lowStock: true },
  { id: "INV003", name: "Century Tuna Flakes", sku: "CAN-CTF-155", stock: 240, minStock: 50, category: "Canned", price: 38, lowStock: false },
  { id: "INV004", name: "Purefoods Corned Beef", sku: "CAN-PCB-150", stock: 12, minStock: 40, category: "Canned", price: 55, lowStock: true },
  { id: "INV005", name: "Sprite 1.5L", sku: "BEV-SPR-1.5", stock: 96, minStock: 24, category: "Beverages", price: 55, lowStock: false },
  { id: "INV006", name: "RC Cola 1.5L", sku: "BEV-RC-1.5", stock: 48, minStock: 24, category: "Beverages", price: 42, lowStock: false },
  { id: "INV007", name: "Chippy BBQ 22g", sku: "SNK-CHI-22", stock: 5, minStock: 30, category: "Snacks", price: 27, lowStock: true },
  { id: "INV008", name: "Piattos Cheese 85g", sku: "SNK-PIA-85", stock: 84, minStock: 24, category: "Snacks", price: 45, lowStock: false },
  { id: "INV009", name: "Bear Brand 300g", sku: "DAI-BB-300", stock: 60, minStock: 20, category: "Dairy", price: 185, lowStock: false },
  { id: "INV010", name: "Alaska Evap 155ml", sku: "DAI-AEV-155", stock: 180, minStock: 48, category: "Dairy", price: 22, lowStock: false },
  { id: "INV011", name: "Safeguard Bar 135g", sku: "PCA-SFG-135", stock: 3, minStock: 24, category: "Personal", price: 45, lowStock: true },
  { id: "INV012", name: "Dove Shampoo 180ml", sku: "PCA-DVS-180", stock: 72, minStock: 18, category: "Personal", price: 125, lowStock: false },
  { id: "INV013", name: "Nescafe 3in1 100s", sku: "BEV-NES-100", stock: 55, minStock: 10, category: "Beverages", price: 550, lowStock: false },
  { id: "INV014", name: "Lucky Me Pancit Canton", sku: "FOD-LM-PC", stock: 320, minStock: 60, category: "Canned", price: 15, lowStock: false },
  { id: "INV015", name: "Tide Powder 1kg", sku: "HHD-TID-1K", stock: 7, minStock: 15, category: "Personal", price: 88, lowStock: true },
];

// ─── Employees ────────────────────────────────────────────────────────────────

export const employees = [
  { id: "EMP001", name: "Maria Santos", role: "Branch Manager", department: "Sales", status: "Active", salary: 42000, hireDate: "2021-03-15", email: "m.santos@rightapps.ph" },
  { id: "EMP002", name: "Juan dela Cruz", role: "Senior Cashier", department: "Sales", status: "Active", salary: 22000, hireDate: "2022-07-01", email: "j.delacruz@rightapps.ph" },
  { id: "EMP003", name: "Ana Reyes", role: "Inventory Clerk", department: "Engineering", status: "Active", salary: 20000, hireDate: "2023-01-10", email: "a.reyes@rightapps.ph" },
  { id: "EMP004", name: "Pedro Manalo", role: "Delivery Rider", department: "Sales", status: "Active", salary: 18500, hireDate: "2023-06-20", email: "p.manalo@rightapps.ph" },
  { id: "EMP005", name: "Rosa Gonzales", role: "HR Officer", department: "HR", status: "Active", salary: 28000, hireDate: "2020-11-05", email: "r.gonzales@rightapps.ph" },
  { id: "EMP006", name: "Carlo Mercado", role: "Accountant", department: "Finance", status: "Active", salary: 32000, hireDate: "2021-08-15", email: "c.mercado@rightapps.ph" },
  { id: "EMP007", name: "Luz Bautista", role: "Cashier", department: "Sales", status: "On Leave", salary: 19000, hireDate: "2022-02-28", email: "l.bautista@rightapps.ph" },
  { id: "EMP008", name: "Ben Torres", role: "IT Support", department: "Engineering", status: "Active", salary: 26000, hireDate: "2022-09-01", email: "b.torres@rightapps.ph" },
  { id: "EMP009", name: "Carmen Flores", role: "Warehouse Staff", department: "Product", status: "Active", salary: 17000, hireDate: "2023-04-15", email: "c.flores@rightapps.ph" },
  { id: "EMP010", name: "Tess Valdez", role: "Marketing Officer", department: "Product", status: "Contract", salary: 24000, hireDate: "2024-01-08", email: "t.valdez@rightapps.ph" },
  { id: "EMP011", name: "Mark Uy", role: "Senior Developer", department: "Engineering", status: "Active", salary: 55000, hireDate: "2020-06-10", email: "m.uy@rightapps.ph" },
  { id: "EMP012", name: "Jessa Ocampo", role: "UI/UX Designer", department: "Design", status: "Active", salary: 36000, hireDate: "2021-11-20", email: "j.ocampo@rightapps.ph" },
];

// ─── Top Products ─────────────────────────────────────────────────────────────

export const topProducts = [
  { name: "Ganador Rice 25kg", revenue: 187200, units: 156 },
  { name: "Nescafe 3in1 100s", revenue: 151250, units: 275 },
  { name: "Bear Brand 300g", revenue: 129500, units: 700 },
  { name: "Chippy BBQ 22g", revenue: 94500, units: 3500 },
  { name: "Sprite 1.5L", revenue: 86240, units: 1568 },
];