// contexts/MasterFileContext.tsx
// Central store for all Master File tables.
// Every screen that needs dropdowns (Inventory, HR, Dashboard entry modal)
// imports from here — so adding a new department in Master File
// immediately updates the HR filter pills and Add Employee modal.

import React, { createContext, useCallback, useContext, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MasterItem {
  id: string;
  label: string;
  color?: string; // optional — used by dept/category color chips
}

export interface MasterFileState {
  itemCategories: MasterItem[];
  vatTypes: MasterItem[];
  departments: MasterItem[];
  roles: MasterItem[];
  centers: MasterItem[];
  subCenters: MasterItem[];
  accountTitles: MasterItem[];
}

export type TableKey = keyof MasterFileState;

interface MasterFileContextType extends MasterFileState {
  addItem: (table: TableKey, item: MasterItem) => void;
  updateItem: (table: TableKey, item: MasterItem) => void;
  deleteItem: (table: TableKey, id: string) => void;
}

// ─── Seed data ────────────────────────────────────────────────────────────────

const INITIAL: MasterFileState = {
  itemCategories: [
    { id: 'cat1', label: 'Rice' },
    { id: 'cat2', label: 'Canned Goods' },
    { id: 'cat3', label: 'Beverages' },
    { id: 'cat4', label: 'Snacks' },
    { id: 'cat5', label: 'Dairy' },
    { id: 'cat6', label: 'Personal Care' },
    { id: 'cat7', label: 'Household' },
    { id: 'cat8', label: 'Frozen' },
  ],
  vatTypes: [
    { id: 'vat1', label: 'VAT Inclusive (12%)' },
    { id: 'vat2', label: 'VAT Exclusive (12%)' },
    { id: 'vat3', label: 'VAT Exempt' },
    { id: 'vat4', label: 'Zero-Rated' },
  ],
  departments: [
    { id: 'dep1', label: 'Engineering', color: '#3B82F6' },
    { id: 'dep2', label: 'Sales', color: '#10B981' },
    { id: 'dep3', label: 'Finance', color: '#F59E0B' },
    { id: 'dep4', label: 'HR', color: '#06B6D4' },
    { id: 'dep5', label: 'Product', color: '#8B5CF6' },
    { id: 'dep6', label: 'Design', color: '#EC4899' },
    { id: 'dep7', label: 'Marketing', color: '#EF4444' },
    { id: 'dep8', label: 'Operations', color: '#78716C' },
  ],
  roles: [
    { id: 'rol1', label: 'Branch Manager' },
    { id: 'rol2', label: 'Senior Cashier' },
    { id: 'rol3', label: 'Cashier' },
    { id: 'rol4', label: 'Inventory Clerk' },
    { id: 'rol5', label: 'Delivery Rider' },
    { id: 'rol6', label: 'HR Officer' },
    { id: 'rol7', label: 'Accountant' },
    { id: 'rol8', label: 'IT Support' },
    { id: 'rol9', label: 'Warehouse Staff' },
    { id: 'rol10', label: 'Marketing Officer' },
    { id: 'rol11', label: 'Senior Developer' },
    { id: 'rol12', label: 'Finance Analyst' },
    { id: 'rol13', label: 'Operations Head' },
  ],
  centers: [
    { id: 'cen1', label: 'Head Office' },
    { id: 'cen2', label: 'Main Branch' },
    { id: 'cen3', label: 'Cebu Branch' },
    { id: 'cen4', label: 'Davao Branch' },
    { id: 'cen5', label: 'Finance Division' },
    { id: 'cen6', label: 'HR Division' },
    { id: 'cen7', label: 'Operations' },
    { id: 'cen8', label: 'IT Department' },
  ],
  subCenters: [
    { id: 'sub1', label: 'Accounting' },
    { id: 'sub2', label: 'Payroll' },
    { id: 'sub3', label: 'Procurement' },
    { id: 'sub4', label: 'Sales Team' },
    { id: 'sub5', label: 'Marketing' },
    { id: 'sub6', label: 'Admin' },
    { id: 'sub7', label: 'Audit' },
    { id: 'sub8', label: 'Compliance' },
  ],
  accountTitles: [
    { id: 'acc1', label: 'Salaries and Wages' },
    { id: 'acc2', label: 'SSS / PhilHealth / Pag-IBIG' },
    { id: 'acc3', label: 'Electricity' },
    { id: 'acc4', label: 'Rent Expense' },
    { id: 'acc5', label: 'Internet and Communication' },
    { id: 'acc6', label: 'Fuel and Transportation' },
    { id: 'acc7', label: 'Office Supplies' },
    { id: 'acc8', label: 'Representation and Entertainment' },
    { id: 'acc9', label: 'VAT Payable' },
    { id: 'acc10', label: 'Depreciation' },
    { id: 'acc11', label: 'Cost of Sales' },
    { id: 'acc12', label: 'Delivery Fee' },
    { id: 'acc13', label: 'Accounts Receivable' },
    { id: 'acc14', label: 'Other Operating Expenses' },
  ],
};

// ─── Context ──────────────────────────────────────────────────────────────────

const MasterFileContext = createContext<MasterFileContextType | undefined>(
  undefined,
);

export function MasterFileProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = useState<MasterFileState>(INITIAL);

  const addItem = useCallback((table: TableKey, item: MasterItem) => {
    setState((prev) => ({ ...prev, [table]: [...prev[table], item] }));
  }, []);

  const updateItem = useCallback((table: TableKey, item: MasterItem) => {
    setState((prev) => ({
      ...prev,
      [table]: prev[table].map((i) => (i.id === item.id ? item : i)),
    }));
  }, []);

  const deleteItem = useCallback((table: TableKey, id: string) => {
    setState((prev) => ({
      ...prev,
      [table]: prev[table].filter((i) => i.id !== id),
    }));
  }, []);

  return (
    <MasterFileContext.Provider
      value={{ ...state, addItem, updateItem, deleteItem }}
    >
      {children}
    </MasterFileContext.Provider>
  );
}

export function useMasterFile() {
  const ctx = useContext(MasterFileContext);
  if (!ctx)
    throw new Error('useMasterFile must be used inside MasterFileProvider');
  return ctx;
}

// ─── Convenience selectors ────────────────────────────────────────────────────
// Use these in other screens for dropdown options

export function useCategoryLabels() {
  return useMasterFile().itemCategories.map((i) => i.label);
}
export function useVatTypeLabels() {
  return useMasterFile().vatTypes.map((i) => i.label);
}
export function useDepartments() {
  return useMasterFile().departments;
}
export function useDepartmentLabels() {
  return useMasterFile().departments.map((i) => i.label);
}
export function useRoleLabels() {
  return useMasterFile().roles.map((i) => i.label);
}
export function useCenterLabels() {
  return useMasterFile().centers.map((i) => i.label);
}
export function useSubCenterLabels() {
  return useMasterFile().subCenters.map((i) => i.label);
}
export function useAccountTitleLabels() {
  return useMasterFile().accountTitles.map((i) => i.label);
}
