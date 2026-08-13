// config/tableConfig.ts
import { AdminCategoryService } from '@/services/admincategoryService';
import { CenterService } from '@/services/centerService';
import { DepartmentService } from '@/services/departMentService';
import { MasterFileFinanceService } from '@/services/masterFileFinanceService';
import { OrgCategoryService } from '@/services/orgCategoryService';
import { PositionService } from '@/services/positionService';
import { SubCenterService } from '@/services/subCenterService';
import { VatTypeService } from '@/services/vatTypeService';
import { ContactService } from '@/services/contactService';
import {
  BookOpen,
  FolderOpen,
  LayoutGrid,
  PhilippinePeso,
  UserCheck, AtSign, Tag
} from 'lucide-react-native';
import { PromoTypeService } from '@/services/promoTypeService';
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
      update: (id, name) => OrgCategoryService.updateOrgCategory({ id: Number(id), name }),
      delete: (id) => OrgCategoryService.deleteOrgCategory(Number(id)),
    },
    toItem: (raw) => ({
      id: String(raw.id),
      label: raw.name,
      isGlobal: raw.isGlobal ?? false, // ✅ carry through
    }),
  },
  {
    key: 'promoTypes',
    label: 'Promo Types',
    description: 'Discount types used on POS — Senior, PWD, Promo, etc.',
    icon: Tag,
    hasColor: false,
    accent: '#F43F5E',
    placeholder: 'e.g. Senior Citizen',
    service: {
      getAll: () => PromoTypeService.getAll(),
      create: (name, extra) => PromoTypeService.create(name, extra?.description),
      update: (id, name, extra) => PromoTypeService.update(Number(id), name, extra?.description),
      delete: async (id) => {
        await PromoTypeService.delete(Number(id));
        return { id }; // tableConfig expects a return value
      },
    },
    toItem: (raw) => ({
      id: String(raw.id),
      label: raw.name,
      description: raw.description ?? undefined,
      isGlobal: false,
    }),
    extraFields: [
      {
        key: 'description',
        label: 'Description',
        placeholder: 'e.g. 20% off for senior citizens',
        type: 'text' as const,
      },
    ],
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
      update: (id, name, extra) => VatTypeService.update(Number(id), name, extra?.rate ?? 12), // ✅
      delete: (id) => VatTypeService.delete(Number(id)),
    },
    toItem: (raw) => {
      if (__DEV__) console.log('vatType raw:', raw); // ✅ check what id and rate look like
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
      create: (name, extra) => DepartmentService.create(name,),
      update: (id, name) => DepartmentService.update(Number(id), name),
      delete: (id) => DepartmentService.delete(Number(id)),
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
      getAll: () => CenterService.getCenters(),
      create: (name) => CenterService.create(name),
      update: (id, name) => CenterService.update(Number(id), name),
      delete: (id) => CenterService.delete(Number(id)),
    },
    toItem: (raw) => ({ id: String(raw.id), label: raw.label }),
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
      update: (id, name) => SubCenterService.update(Number(id), name),
      delete: (id) => SubCenterService.delete(Number(id)),
    },
    toItem: (raw) => ({ id: String(raw.id), label: raw.label }),
  },
  // Excerpt from tableConfig.ts - just the accountTitles section

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
      create: (name, extra) => MasterFileFinanceService.createAccountTitle(
        name,
        extra?.code  // ✅ Now passes optional code
      ),
      update: (id, name, extra) => MasterFileFinanceService.updateAccountTitle(
        Number(id),
        name,
        extra?.code  // ✅ Now passes optional code
      ),
      delete: (id) => MasterFileFinanceService.deleteAccountTitle(Number(id)),
    },
    toItem: (raw) => ({
      id: String(raw.id),
      label: raw.label,  // ✅ Now uses 'label' consistently
      code: raw.code
    }),
    // ✅ Optional: Add code field if you want users to input it
    extraFields: [
      {
        key: 'code',
        label: 'Account Code',
        placeholder: 'e.g. 1001',
        type: 'text' as const,
      },
    ],
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
  {
    key: 'contacts',
    label: 'Contacts',
    description: 'Global or branch-specific email contacts for Restock Scheduling',
    icon: AtSign,
    hasColor: false,
    accent: '#0EA5E9',
    placeholder: 'e.g. Main Supplier – Cebu',
    service: {
      getAll: async (query?: string) => {
        // TODO: pass real orgId from context; branchId = null → returns all
        return ContactService.getContacts(null, query)
      },
      create: async (name: string, extra?: any) => {
        return ContactService.createContact({
          branchId: extra?.branchId ?? null,  // null = global
          label: name,                       // label is the primary "name" field
          name: extra?.fullName ?? name,
          email: extra?.email ?? '',
          phone: extra?.phone ?? null,
          position: extra?.position ?? null,
          department: extra?.department ?? null,
          notes: extra?.notes ?? null,
        })
      },
      update: async (id: number | string, name: string, extra?: any) => {
        return ContactService.updateContact(Number(id), {
          label: name,
          branchId: extra?.branchId ?? undefined,
          name: extra?.fullName ?? undefined,
          email: extra?.email ?? undefined,
          phone: extra?.phone ?? undefined,
          position: extra?.position ?? undefined,
          department: extra?.department ?? undefined,
          notes: extra?.notes ?? undefined,
        })
      },
      delete: (id: number | string) => ContactService.deleteContact(Number(id)),
    },
    toItem: (raw: any) => ({
      id: String(raw.id),
      label: raw.label,                              // shown in the list
      isGlobal: raw.branchId === null || raw.branchId === undefined,
      // carry extra fields so the edit modal can pre-fill them
      email: raw.email,
      fullName: raw.name,
      phone: raw.phone,
      position: raw.position,
      department: raw.department,
      branchId: raw.branchId,
      notes: raw.notes,
    }),
    extraFields: [
      {
        key: 'email',
        label: 'Email address',
        placeholder: 'supplier@example.com',
        type: 'text' as const,
      },
      {
        key: 'fullName',
        label: 'Full name',
        placeholder: 'e.g. Juan dela Cruz',
        type: 'text' as const,
      },
      {
        key: 'phone',
        label: 'Phone (optional)',
        placeholder: '+63 912 345 6789',
        type: 'text' as const,
      },
      {
        key: 'position',
        label: 'Position / title (optional)',
        placeholder: 'e.g. Purchasing Manager',
        type: 'text' as const,
      },
      {
        key: 'department',
        label: 'Department (optional)',
        placeholder: 'e.g. Logistics',
        type: 'text' as const,
      },
    ],
  },
];