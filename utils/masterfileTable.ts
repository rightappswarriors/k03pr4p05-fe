// config/tableConfig.ts
import { AdminCategoryService } from '@/services/admincategoryService';
import { CenterService } from '@/services/centerService';
import { DepartmentService } from '@/services/departMentService';
import { MasterFileFinanceService } from '@/services/masterFileFinanceService';
import { OrgCategoryService } from '@/services/orgCategoryService';
import { PositionService } from '@/services/positionService';
import { SubCenterService } from '@/services/subCenterService';
import { VatTypeService } from '@/services/vatTypeService';
import {
  BookOpen,
  FolderOpen,
  LayoutGrid,
  PhilippinePeso,
  UserCheck,
} from 'lucide-react-native';

export interface TableConfig {
  key: string;
  label: string;
  description: string;
  icon: React.FC<{ size: number; color: string; strokeWidth?: number }>;
  hasColor: boolean;
  placeholder: string;
  accent: string;
  service: {
    getAll: (query?: string, size?: number, orderBy?: string) => Promise<any[]>;
    create?: (name: string, extra?: any) => Promise<any>;   // ✅ extra for rate etc
    update?: (id: number | string, name: string, extra?: any) => Promise<any>; // ✅
    delete?: (id: number | string) => Promise<any>;
  };
  toItem: (raw: any) => { id: string; label: string; color?: string; isGlobal?: boolean };
  // ✅ optional extra fields for tables that need more than just name
  extraFields?: Array<{
    key: string;
    label: string;
    placeholder: string;
    type: 'text' | 'number';
  }>;
}
export const TABLE_CONFIG: TableConfig[] = [
  {
    key: 'itemCategories',
    label: 'Item Categories',
    description: 'Product groupings used in Inventory',
    icon: FolderOpen,
    hasColor: false,
    accent: '#E87722',
    placeholder: 'e.g. Frozen Foods',
    service: {
      getAll: async (q, size, order) => {
        // ✅ fetch both in parallel
        const [orgCategories, globalCategories] = await Promise.all([
          OrgCategoryService.getOrgCategories(q, size, order),
          AdminCategoryService.getCategories(q, size, order),
        ]);
        return [
          // org categories first — editable
          ...orgCategories.map(c => ({ ...c, isGlobal: false })),
          // global categories appended — read-only
          ...globalCategories.map(c => ({ ...c, isGlobal: true })),
        ];
      },
      create: (name) => OrgCategoryService.createOrgCategory({ name }),
      update: (id, name) => OrgCategoryService.updateOrgCategory({ id, name }),
      delete: (id) => OrgCategoryService.deleteOrgCategory(id),
    },
    toItem: (raw) => ({
      id: String(raw.id),
      label: raw.name,
      isGlobal: raw.isGlobal ?? false, // ✅ carry through
    }),
  },
  {
    key: 'vatTypes',
    label: 'VAT Types',
    description: 'Used in Inventory + Dashboard entry modal',
    icon: PhilippinePeso,
    hasColor: false,
    accent: '#10B981',
    placeholder: 'e.g. VAT Inclusive (12%)',
    service: {
      getAll: () => VatTypeService.getAll(),
      create: (name, extra) => VatTypeService.create(name, extra?.rate ?? 12), // ✅ send 12, not 0.12
      update: (id, name, extra) => VatTypeService.update(id, name, extra?.rate ?? 12), // ✅
      delete: (id) => VatTypeService.delete(id),
    },
    toItem: (raw) => {
      console.log('vatType raw:', raw); // ✅ check what id and rate look like
      return {
        id: String(raw.id),
        label: `${raw.name} (${raw.rate != null ? (raw.rate * 100).toFixed(0) : '?'}%)`,
      };
    },
    extraFields: [
      {
        key: 'rate',
        label: 'VAT Rate %',
        placeholder: 'e.g. 12',
        type: 'number',
      },
    ],
  },
  {
    key: 'departments',
    label: 'Departments',
    description: 'Used in HR — filter pills + Add Employee',
    icon: LayoutGrid,
    hasColor: true,
    accent: '#3B82F6',
    placeholder: 'e.g. Logistics',
    service: {
      getAll: () => DepartmentService.getAll(),
      create: (name, extra) => DepartmentService.create(name, ),
      update: (id, name) => DepartmentService.update(id, name),
      delete: (id) => DepartmentService.delete(id),
    },
    toItem: (raw) => ({ id: String(raw.id), label: raw.name, color: raw.color }),
  },
  {
    key: 'centers',
    label: 'Centers',
    description: 'Used in Dashboard journal entry',
    icon: BookOpen,
    hasColor: false,
    accent: '#06B6D4',
    placeholder: 'e.g. Iriga Outlet',
    service: {
      getAll: () => CenterService.getAll(),
      create: (name) => CenterService.create(name),
      update: (id, name) => CenterService.update(id, name),
      delete: (id) => CenterService.delete(id),
    },
    toItem: (raw) => ({ id: String(raw.id), label: raw.name }),
  },
  {
    key: 'subCenters',
    label: 'Sub-Centers',
    description: 'Used in Dashboard journal entry',
    icon: BookOpen,
    hasColor: false,
    accent: '#F59E0B',
    placeholder: 'e.g. Collections',
    service: {
      getAll: () => SubCenterService.getAll(),
      create: (name) => SubCenterService.create(name),
      update: (id, name) => SubCenterService.update(id, name),
      delete: (id) => SubCenterService.delete(id),
    },
    toItem: (raw) => ({ id: String(raw.id), label: raw.name }),
  },
  {
    key: 'accountTitles',
    label: 'Account Titles',
    description: 'Used in Dashboard entry + Budget module',
    icon: BookOpen,
    hasColor: false,
    accent: '#1B3A6B',
    placeholder: 'e.g. Transportation Allowance',
    service: {
      getAll: () => MasterFileFinanceService.getAccountTitles(),
      create: (name) => MasterFileFinanceService.createAccountTitle(name),
      update: (id, name) => MasterFileFinanceService.updateAccountTitle(id, name),
      delete: (id) => MasterFileFinanceService.deleteAccountTitle(id),
    },
    toItem: (raw) => ({ id: String(raw.id), label: raw.name }),
  },
  {
    key: 'positions',
    label: 'Positions',
    description: 'RBAC positions with permissions',
    icon: UserCheck,
    hasColor: false,
    accent: '#6366F1',
    placeholder: 'e.g. Manager',
    service: {
      getAll: () => PositionService.getAll(), // TODO: get orgId from context
      create: (name, extra) => PositionService.create(name, extra?.description),
      update: (id, name, extra) => PositionService.update(String(id), name, extra?.description),
      delete: (id) => PositionService.delete(String(id)),
    },
    toItem: (raw) => ({
      id: String(raw.id),
      label: raw.name,
      description: raw.description,
      permissions: raw.permissions?.map((p: any) => ({
        pageId: p.pageId,
        canView: p.canView,
        canCreate: p.canCreate,
        canEdit: p.canEdit,
        canDelete: p.canDelete,
      })),
    }),
    extraFields: [
      {
        key: 'description',
        label: 'Description',
        placeholder: 'Optional description',
        type: 'text',
      },
    ],
  },
];