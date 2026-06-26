// contexts/MasterFileContext.tsx
// Central store for all Master File tables.
// Every screen that needs dropdowns (Inventory, HR, Dashboard entry modal)
// imports from here — so adding a new department in Master File
// immediately updates the HR filter pills and Add Employee modal.

import { CenterService } from '@/services/centerService';
import { DepartmentService } from '@/services/departMentService';
import { MasterFileFinanceService } from '@/services/masterFileFinanceService';
import { OrgCategoryService } from '@/services/orgCategoryService';
import { PositionService } from '@/services/positionService';
import { SubCenterService } from '@/services/subCenterService';
import { VatTypeService } from '@/services/vatTypeService';
import { useAuth } from '@/contexts/AuthContext';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { PromoTypeService } from '@/services/promoTypeService';
import { ContactService } from '@/services/contactService';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MasterItem {
  id: string;
  label: string;

  isGlobal?: boolean; // ✅ new
  color?: string; // optional — used by dept/category color chips
  description?: string;
  permissions?: Array<{
    pageId: string;
    canView: boolean;
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
  }>;
}

export interface MasterFileState {
  itemCategories: MasterItem[];
  vatTypes: MasterItem[];
  departments: MasterItem[];
  roles: MasterItem[];
  centers: MasterItem[];
  subCenters: MasterItem[];
  accountTitles: MasterItem[];
  positions: MasterItem[];
  contacts: MasterItem[];
  promoTypes: MasterItem[];
}

export type TableKey = keyof MasterFileState;

interface MasterFileContextType extends MasterFileState {
  addItem: (table: TableKey, item: MasterItem) => void;
  updateItem: (table: TableKey, item: MasterItem) => void;
  deleteItem: (table: TableKey, id: string) => void;
}

// ─── Seed data ────────────────────────────────────────────────────────────────

const INITIAL: MasterFileState = {
  itemCategories: [], // ✅ empty — loaded from API
  vatTypes: [],
  departments: [],
  roles: [],
  centers: [],
  subCenters: [],
  accountTitles: [],
  positions: [],
  promoTypes: [],
  contacts: [],
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
  const { user } = useAuth();

  // Load all tables on mount from API
  useEffect(() => {
    const loadAll = async () => {
      const orgId = Number(user?.orgId || 0);
      const safeLoad = async (fn: () => Promise<any>, fallback: any) => {
        try {
          return await fn();
        } catch (e) {
          if (__DEV__) console.warn('MasterFile load failed:', e);
          return fallback;
        }
      };

      const [
        categories,
        vatTypes,
        departments,
        roles,
        centers,
        subCenters,
        accountTitles,
        positions,
        contact,
        promoTypes,
      ] = await Promise.all([
        safeLoad(() => OrgCategoryService.getOrgCategories(), []),
        safeLoad(() => VatTypeService.getAll(), []),
        safeLoad(() => DepartmentService.getAll(), []),
        safeLoad(() => PositionService.getAll(), []),
        safeLoad(() => CenterService.getAll(), []),
        safeLoad(() => SubCenterService.getAll(), []),
        safeLoad(() => MasterFileFinanceService.getAccountTitles(), []),
        safeLoad(() => PositionService.getAll(), []),
        safeLoad(() => ContactService.getContacts(orgId), []), // ✅ new Contacts table, branch-agnostic for now
        safeLoad(() => PromoTypeService.getAll(), []),
      ]);

      setState({
        itemCategories: (categories || []).map((c: any) => ({
          id: String(c.id),
          label: c.name ?? c.globalCategory?.name,
        })),
        vatTypes: (vatTypes || []).map((v: any) => ({
          id: String(v.id),
          label: v.name,
        })),
        departments: (departments || []).map((d: any) => ({
          id: String(d.id),
          label: d.name,
          color: d.color,
        })),
        roles: (roles || []).map((r: any) => ({
          id: String(r.id),
          label: r.name,
        })),
        centers: (centers || []).map((c: any) => ({
          id: String(c.id),
          label: c.name,
        })),
        subCenters: (subCenters || []).map((s: any) => ({
          id: String(s.id),
          label: s.name,
        })),
        accountTitles: (accountTitles || []).map((a: any) => ({
          id: String(a.id),
          label: a.name,
        })),
        positions: (positions || []).map((p: any) => ({
          id: p.id,
          label: p.name,
        })),
        contacts: (contact || []).map((c: any) => ({
          id: String(c.id),
          label: c.label,
        })),
        promoTypes: (promoTypes || []).map((p: any) => ({
          id: String(p.id),
          label: p.name,
          description: p.description,
        })),
      });
    };
    loadAll();
  }, [user?.orgId]);

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
export function useContactLabels() {
  return useMasterFile().contacts.map((i) => i.label);
}

export function usePromoTypes() {
  return useMasterFile().promoTypes;
}
export function usePromoTypeLabels() {
  return useMasterFile().promoTypes.map((i) => i.label);
}
