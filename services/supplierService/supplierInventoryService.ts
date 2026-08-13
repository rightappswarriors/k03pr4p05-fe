import { gql } from 'graphql-request'
import { graphQLRequest } from '../apiClient'
import type { SupplierItem } from './supplierService'

// ─── Types ──────────────────────────────────────────────────────────────────

export type SupplierStockBatchStatus = 'ACTIVE' | 'DEPLETED' | 'EXPIRED' | 'DAMAGED'
export type SupplierInventoryMovementType =
  | 'RECEIVED' | 'SOLD' | 'RESERVED' | 'RELEASED' | 'TRANSFERRED_OUT'
  | 'TRANSFERRED_IN' | 'ADJUSTED' | 'RETURNED' | 'DAMAGED' | 'EXPIRED'
export type SupplierIncomingStatus = 'PENDING' | 'RECEIVED' | 'CANCELLED'

export interface SupplierWarehouse {
  id: string
  organizationId: number
  name: string
  address?: string | null
  latitude?: number | null
  longitude?: number | null
  isDefault: boolean
  isActive: boolean
}

export interface SupplierStockBatch {
  id: string
  supplierItemId: string
  warehouseId?: string | null
  batchNumber?: string | null
  quantity: number
  remainingQty: number
  unitCost: number
  expiryDate?: string | null
  receivedAt: string
  status: SupplierStockBatchStatus
  warehouse?: { id: string; name: string } | null
}

export interface SupplierInventoryMovement {
  id: string
  supplierItemId: string
  warehouseId?: string | null
  batchId?: string | null
  type: SupplierInventoryMovementType
  quantity: number
  quantityBefore: number
  quantityAfter: number
  unitCost?: number | null
  referenceType?: string | null
  referenceId?: string | null
  reason?: string | null
  createdAt: string
}

export interface SupplierItemCostHistoryEntry {
  id: string
  supplierItemId: string
  oldCost: number
  newCost: number
  effectiveAt: string
  reason?: string | null
  changedById?: number | null
}

export interface SupplierIncomingStock {
  id: string
  supplierItemId: string
  warehouseId?: string | null
  expectedQty: number
  expectedDate?: string | null
  sourceLabel?: string | null
  status: SupplierIncomingStatus
  notes?: string | null
}

export interface InventoryValuation {
  totalQty: number
  totalValue: number
  averageCost: number
  batchCount: number
}

export interface InventoryForecast {
  hasData: boolean
  avgDailyConsumption?: number | null
  daysRemaining?: number | null
  expectedStockoutDate?: string | null
  suggestedReorderQty?: number | null
  suggestedReorderDate?: string | null
  isLowStockPredicted?: boolean | null
}

export interface StockAgingBuckets { fresh: number; aging: number; old: number; stale: number }
export interface BatchDistributionEntry { batchId: string; batchNumber?: string | null; remainingQty: number; unitCost: number }

export interface InventoryAnalytics {
  inventoryValue: number
  averageCost: number
  highestCost?: number | null
  lowestCost?: number | null
  inventoryTurnover?: number | null
  avgDaysInStock?: number | null
  estimatedProfit?: number | null
  marginPct?: number | null
  stockAging: StockAgingBuckets
  batchDistribution: BatchDistributionEntry[]
}

export interface SupplierInventoryDashboard {
  totalInventory: number
  inventoryValue: number
  availableStock: number
  reservedStock: number
  incomingStock: number
  lowStockCount: number
  outOfStockCount: number
  expiringSoonCount: number
  averageInventoryCost: number
  averageMargin?: number | null
}

// ─── Dashboard & list ───────────────────────────────────────────────────────

export async function fetchSupplierInventoryDashboard(orgId: number): Promise<SupplierInventoryDashboard> {
  const QUERY = gql`
    query SupplierInventoryDashboard($orgId: Int!) {
      supplierInventoryDashboard(orgId: $orgId) {
        totalInventory inventoryValue availableStock reservedStock incomingStock
        lowStockCount outOfStockCount expiringSoonCount averageInventoryCost averageMargin
      }
    }
  `
  const res = await graphQLRequest<{ supplierInventoryDashboard: SupplierInventoryDashboard }>(QUERY, { orgId })
  return res.supplierInventoryDashboard
}

const INVENTORY_ITEM_FIELDS = `
  id name sku unit unitPrice image isActive
  availableQty reservedQty incomingQty damagedQty returnedQty
  reorderLevel reorderQty
  createdAt updatedAt
`

export async function fetchSupplierInventoryList(orgId: number, warehouseId?: string | null): Promise<SupplierItem[]> {
  const QUERY = gql`
    query SupplierInventoryList($orgId: Int!, $warehouseId: String) {
      supplierInventoryList(orgId: $orgId, warehouseId: $warehouseId) {
        ${INVENTORY_ITEM_FIELDS}
      }
    }
  `
  const res = await graphQLRequest<{ supplierInventoryList: SupplierItem[] }>(QUERY, { orgId, warehouseId: warehouseId ?? null })
  return res.supplierInventoryList
}

export async function fetchInventoryValuation(supplierItemId: string): Promise<InventoryValuation> {
  const QUERY = gql`
    query InventoryValuation($supplierItemId: String!) {
      supplierInventoryValuation(supplierItemId: $supplierItemId) { totalQty totalValue averageCost batchCount }
    }
  `
  const res = await graphQLRequest<{ supplierInventoryValuation: InventoryValuation }>(QUERY, { supplierItemId })
  return res.supplierInventoryValuation
}

// ─── Batches ────────────────────────────────────────────────────────────────

export async function fetchStockBatches(supplierItemId: string, includeDepleted = false): Promise<SupplierStockBatch[]> {
  const QUERY = gql`
    query SupplierStockBatches($supplierItemId: String!, $includeDepleted: Boolean) {
      supplierStockBatches(supplierItemId: $supplierItemId, includeDepleted: $includeDepleted) {
        id supplierItemId warehouseId batchNumber quantity remainingQty unitCost expiryDate receivedAt status
        warehouse { id name }
      }
    }
  `
  const res = await graphQLRequest<{ supplierStockBatches: SupplierStockBatch[] }>(QUERY, { supplierItemId, includeDepleted })
  return res.supplierStockBatches
}

export async function receiveStock(input: {
  supplierItemId: string
  warehouseId?: string | null
  quantity: number
  unitCost: number
  batchNumber?: string | null
  expiryDate?: string | null
}): Promise<SupplierStockBatch> {
  const MUTATION = gql`
    mutation ReceiveStock($supplierItemId: String!, $warehouseId: String, $quantity: Float!, $unitCost: Float!, $batchNumber: String, $expiryDate: DateTime) {
      receiveStock(supplierItemId: $supplierItemId, warehouseId: $warehouseId, quantity: $quantity, unitCost: $unitCost, batchNumber: $batchNumber, expiryDate: $expiryDate) {
        id supplierItemId warehouseId batchNumber quantity remainingQty unitCost expiryDate receivedAt status
      }
    }
  `
  const res = await graphQLRequest<{ receiveStock: SupplierStockBatch }>(MUTATION, input)
  return res.receiveStock
}

export async function transferStock(input: {
  supplierItemId: string
  fromWarehouseId: string
  toWarehouseId: string
  quantity: number
  reason?: string
}): Promise<SupplierStockBatch[]> {
  const MUTATION = gql`
    mutation TransferStock($supplierItemId: String!, $fromWarehouseId: String!, $toWarehouseId: String!, $quantity: Float!, $reason: String) {
      transferStock(supplierItemId: $supplierItemId, fromWarehouseId: $fromWarehouseId, toWarehouseId: $toWarehouseId, quantity: $quantity, reason: $reason) {
        id warehouseId remainingQty unitCost status
      }
    }
  `
  const res = await graphQLRequest<{ transferStock: SupplierStockBatch[] }>(MUTATION, input)
  return res.transferStock
}

// ─── Adjustments / damage / returns ─────────────────────────────────────────

export async function adjustStock(input: { supplierItemId: string; delta: number; unitCost?: number; warehouseId?: string; reason: string }) {
  const MUTATION = gql`
    mutation AdjustStock($supplierItemId: String!, $delta: Float!, $unitCost: Float, $warehouseId: String, $reason: String!) {
      adjustStock(supplierItemId: $supplierItemId, delta: $delta, unitCost: $unitCost, warehouseId: $warehouseId, reason: $reason) { id }
    }
  `
  const res = await graphQLRequest<{ adjustStock: SupplierInventoryMovement }>(MUTATION, input)
  return res.adjustStock
}

export async function markDamagedStock(input: { supplierItemId: string; quantity: number; warehouseId?: string; reason: string }) {
  const MUTATION = gql`
    mutation MarkDamagedStock($supplierItemId: String!, $quantity: Float!, $warehouseId: String, $reason: String!) {
      markDamagedStock(supplierItemId: $supplierItemId, quantity: $quantity, warehouseId: $warehouseId, reason: $reason) { id }
    }
  `
  const res = await graphQLRequest<{ markDamagedStock: SupplierInventoryMovement }>(MUTATION, input)
  return res.markDamagedStock
}

export async function markReturnedStock(input: { supplierItemId: string; quantity: number; reason?: string }) {
  const MUTATION = gql`
    mutation MarkReturnedStock($supplierItemId: String!, $quantity: Float!, $reason: String) {
      markReturnedStock(supplierItemId: $supplierItemId, quantity: $quantity, reason: $reason) { id }
    }
  `
  const res = await graphQLRequest<{ markReturnedStock: SupplierInventoryMovement }>(MUTATION, input)
  return res.markReturnedStock
}

export async function restockReturnedItem(input: { supplierItemId: string; quantity: number; unitCost: number; warehouseId?: string }) {
  const MUTATION = gql`
    mutation RestockReturnedItem($supplierItemId: String!, $quantity: Float!, $unitCost: Float!, $warehouseId: String) {
      restockReturnedItem(supplierItemId: $supplierItemId, quantity: $quantity, unitCost: $unitCost, warehouseId: $warehouseId) { id }
    }
  `
  const res = await graphQLRequest<{ restockReturnedItem: SupplierInventoryMovement }>(MUTATION, input)
  return res.restockReturnedItem
}

export async function reconcileInventoryRollups(supplierItemId: string) {
  const MUTATION = gql`
    mutation ReconcileInventoryRollups($supplierItemId: String!) {
      reconcileInventoryRollups(supplierItemId: $supplierItemId) {
        driftDetected
        before { availableQty reservedQty damagedQty returnedQty incomingQty }
        after { availableQty reservedQty damagedQty returnedQty incomingQty }
      }
    }
  `
  const res = await graphQLRequest<{ reconcileInventoryRollups: any }>(MUTATION, { supplierItemId })
  return res.reconcileInventoryRollups
}

// ─── Movements / cost history / forecast / analytics ───────────────────────

export async function fetchInventoryMovements(supplierItemId: string, page = 1, pageSize = 30): Promise<SupplierInventoryMovement[]> {
  const QUERY = gql`
    query SupplierInventoryMovements($supplierItemId: String!, $page: Int, $pageSize: Int) {
      supplierInventoryMovements(supplierItemId: $supplierItemId, page: $page, pageSize: $pageSize) {
        id supplierItemId warehouseId batchId type quantity quantityBefore quantityAfter unitCost referenceType referenceId reason createdAt
      }
    }
  `
  const res = await graphQLRequest<{ supplierInventoryMovements: SupplierInventoryMovement[] }>(QUERY, { supplierItemId, page, pageSize })
  return res.supplierInventoryMovements
}

export async function fetchCostHistory(supplierItemId: string): Promise<SupplierItemCostHistoryEntry[]> {
  const QUERY = gql`
    query SupplierItemCostHistoryList($supplierItemId: String!) {
      supplierItemCostHistoryList(supplierItemId: $supplierItemId) {
        id supplierItemId oldCost newCost effectiveAt reason changedById
      }
    }
  `
  const res = await graphQLRequest<{ supplierItemCostHistoryList: SupplierItemCostHistoryEntry[] }>(QUERY, { supplierItemId })
  return res.supplierItemCostHistoryList
}

export async function fetchInventoryForecast(supplierItemId: string, trailingDays = 30): Promise<InventoryForecast> {
  const QUERY = gql`
    query SupplierInventoryForecast($supplierItemId: String!, $trailingDays: Int) {
      supplierInventoryForecast(supplierItemId: $supplierItemId, trailingDays: $trailingDays) {
        hasData avgDailyConsumption daysRemaining expectedStockoutDate suggestedReorderQty suggestedReorderDate isLowStockPredicted
      }
    }
  `
  const res = await graphQLRequest<{ supplierInventoryForecast: InventoryForecast }>(QUERY, { supplierItemId, trailingDays })
  return res.supplierInventoryForecast
}

export async function fetchInventoryAnalytics(supplierItemId: string): Promise<InventoryAnalytics> {
  const QUERY = gql`
    query SupplierInventoryAnalytics($supplierItemId: String!) {
      supplierInventoryAnalytics(supplierItemId: $supplierItemId) {
        inventoryValue averageCost highestCost lowestCost inventoryTurnover avgDaysInStock estimatedProfit marginPct
        stockAging { fresh aging old stale }
        batchDistribution { batchId batchNumber remainingQty unitCost }
      }
    }
  `
  const res = await graphQLRequest<{ supplierInventoryAnalytics: InventoryAnalytics }>(QUERY, { supplierItemId })
  return res.supplierInventoryAnalytics
}

// ─── Warehouses ─────────────────────────────────────────────────────────────

export async function fetchSupplierWarehouses(orgId: number): Promise<SupplierWarehouse[]> {
  const QUERY = gql`
    query SupplierWarehouses($orgId: Int!) {
      supplierWarehouses(orgId: $orgId) { id organizationId name address latitude longitude isDefault isActive }
    }
  `
  const res = await graphQLRequest<{ supplierWarehouses: SupplierWarehouse[] }>(QUERY, { orgId })
  return res.supplierWarehouses
}

export async function upsertSupplierWarehouse(input: {
  id?: string
  organizationId: number
  name: string
  address?: string
  latitude?: number
  longitude?: number
  isDefault?: boolean
}): Promise<SupplierWarehouse> {
  const MUTATION = gql`
    mutation UpsertSupplierWarehouse($id: String, $organizationId: Int!, $name: String!, $address: String, $latitude: Float, $longitude: Float, $isDefault: Boolean) {
      upsertSupplierWarehouse(id: $id, organizationId: $organizationId, name: $name, address: $address, latitude: $latitude, longitude: $longitude, isDefault: $isDefault) {
        id organizationId name address latitude longitude isDefault isActive
      }
    }
  `
  const res = await graphQLRequest<{ upsertSupplierWarehouse: SupplierWarehouse }>(MUTATION, input)
  return res.upsertSupplierWarehouse
}

// ─── Incoming stock ─────────────────────────────────────────────────────────

export async function fetchIncomingStock(supplierItemId: string): Promise<SupplierIncomingStock[]> {
  const QUERY = gql`
    query SupplierIncomingStockList($supplierItemId: String!) {
      supplierIncomingStockList(supplierItemId: $supplierItemId) {
        id supplierItemId warehouseId expectedQty expectedDate sourceLabel status notes
      }
    }
  `
  const res = await graphQLRequest<{ supplierIncomingStockList: SupplierIncomingStock[] }>(QUERY, { supplierItemId })
  return res.supplierIncomingStockList
}

export async function logIncomingStock(input: {
  supplierItemId: string
  warehouseId?: string
  expectedQty: number
  expectedDate?: string
  sourceLabel?: string
  notes?: string
}): Promise<SupplierIncomingStock> {
  const MUTATION = gql`
    mutation LogIncomingStock($supplierItemId: String!, $warehouseId: String, $expectedQty: Float!, $expectedDate: DateTime, $sourceLabel: String, $notes: String) {
      logIncomingStock(supplierItemId: $supplierItemId, warehouseId: $warehouseId, expectedQty: $expectedQty, expectedDate: $expectedDate, sourceLabel: $sourceLabel, notes: $notes) {
        id supplierItemId expectedQty expectedDate sourceLabel status
      }
    }
  `
  const res = await graphQLRequest<{ logIncomingStock: SupplierIncomingStock }>(MUTATION, input)
  return res.logIncomingStock
}

export async function cancelIncomingStock(incomingStockId: string): Promise<boolean> {
  const MUTATION = gql`
    mutation CancelIncomingStock($incomingStockId: String!) { cancelIncomingStock(incomingStockId: $incomingStockId) }
  `
  const res = await graphQLRequest<{ cancelIncomingStock: boolean }>(MUTATION, { incomingStockId })
  return res.cancelIncomingStock
}

export async function receiveIncomingStock(input: {
  incomingStockId: string
  unitCost: number
  batchNumber?: string
  expiryDate?: string
}): Promise<SupplierStockBatch> {
  const MUTATION = gql`
    mutation ReceiveIncomingStock($incomingStockId: String!, $unitCost: Float!, $batchNumber: String, $expiryDate: DateTime) {
      receiveIncomingStock(incomingStockId: $incomingStockId, unitCost: $unitCost, batchNumber: $batchNumber, expiryDate: $expiryDate) {
        id supplierItemId warehouseId unitCost remainingQty status
      }
    }
  `
  const res = await graphQLRequest<{ receiveIncomingStock: SupplierStockBatch }>(MUTATION, input)
  return res.receiveIncomingStock
}