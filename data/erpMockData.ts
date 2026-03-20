// ── ERP Shared Mock Data — Philippine Enterprise ────────────────

export const salesOrders = [
  { id: 'ORD-001', customer: 'Jollibee Foods Corp', product: 'Enterprise Suite', qty: 5, total: 245000, status: 'Completed' },
  { id: 'ORD-002', customer: 'SM Investments Corp', product: 'Analytics Pro', qty: 12, total: 84000, status: 'Processing' },
  { id: 'ORD-003', customer: 'Ayala Corporation', product: 'HR Module', qty: 3, total: 67500, status: 'Pending' },
  { id: 'ORD-004', customer: 'BDO Unibank Inc', product: 'Finance Pkg', qty: 8, total: 192000, status: 'Completed' },
  { id: 'ORD-005', customer: 'PLDT Inc', product: 'CRM Starter', qty: 20, total: 140000, status: 'Shipped' },
  { id: 'ORD-006', customer: 'Globe Telecom', product: 'Inventory Mgr', qty: 2, total: 38000, status: 'Cancelled' },
  { id: 'ORD-007', customer: 'Robinsons Retail', product: 'Enterprise Suite', qty: 7, total: 343000, status: 'Completed' },
  { id: 'ORD-008', customer: 'Meralco', product: 'Analytics Pro', qty: 15, total: 105000, status: 'Processing' },
];

export const inventoryItems = [
  { id: 'SKU-101', name: 'Enterprise Suite License', sku: 'ES-LIC-001', stock: 142, lowStock: false },
  { id: 'SKU-102', name: 'Analytics Pro License', sku: 'AP-LIC-002', stock: 8, lowStock: true },
  { id: 'SKU-103', name: 'HR Module License', sku: 'HR-LIC-003', stock: 55, lowStock: false },
  { id: 'SKU-104', name: 'Finance Package', sku: 'FP-LIC-004', stock: 4, lowStock: true },
  { id: 'SKU-105', name: 'CRM Starter Kit', sku: 'CRM-LIC-005', stock: 200, lowStock: false },
  { id: 'SKU-106', name: 'Inventory Manager', sku: 'IM-LIC-006', stock: 12, lowStock: true },
  { id: 'SKU-107', name: 'Support Premium', sku: 'SP-LIC-007', stock: 88, lowStock: false },
  { id: 'SKU-108', name: 'Cloud Hosting Bundle', sku: 'CH-BND-008', stock: 3, lowStock: true },
];

export const employees = [
  { id: 'EMP-001', name: 'Juan dela Cruz', role: 'Software Engineer', department: 'Engineering', status: 'Active' },
  { id: 'EMP-002', name: 'Maria Santos', role: 'Product Manager', department: 'Product', status: 'Active' },
  { id: 'EMP-003', name: 'Jose Reyes', role: 'Sales Executive', department: 'Sales', status: 'Active' },
  { id: 'EMP-004', name: 'Ana Bautista', role: 'UX Designer', department: 'Design', status: 'On Leave' },
  { id: 'EMP-005', name: 'Carlo Mendoza', role: 'DevOps Engineer', department: 'Engineering', status: 'Active' },
  { id: 'EMP-006', name: 'Liza Garcia', role: 'Finance Analyst', department: 'Finance', status: 'Active' },
  { id: 'EMP-007', name: 'Ramon Torres', role: 'HR Manager', department: 'HR', status: 'Active' },
  { id: 'EMP-008', name: 'Cynthia Flores', role: 'Marketing Lead', department: 'Marketing', status: 'Contract' },
];

export const financeData = {
  revenue: 14_285_000,
  expenses: 8_923_000,
  profit: 5_362_000,
  revenueVsExpenses: {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    revenue: [2100000, 1850000, 2400000, 2280000, 2650000, 3005000],
    expenses: [1400000, 1320000, 1580000, 1480000, 1620000, 1523000],
  },
};

export const salesTrend = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
  data: [420000, 385000, 550000, 498000, 682000, 740000],
};

export const inventoryDistribution = {
  labels: ['ES', 'AP', 'HR', 'FP', 'CRM', 'IM'],
  data: [142, 8, 55, 4, 200, 12],
};

export const topProducts = [
  { name: 'Enterprise Suite', revenue: 588000 },
  { name: 'CRM Starter Kit', revenue: 240000 },
  { name: 'Finance Package', revenue: 192000 },
  { name: 'Analytics Pro', revenue: 189000 },
  { name: 'HR Module', revenue: 135000 },
];

export const dashboardStats = {
  totalSales: 1_214_500,
  inventoryItems: inventoryItems.length,
  employees: employees.length,
  monthlyProfit: 740000 - 423000,
};