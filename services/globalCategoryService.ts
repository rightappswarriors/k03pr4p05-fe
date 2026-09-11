import { gql } from 'graphql-request';
import { graphQLRequest } from './apiClient';

export type CategoryTreeNode = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  depth: number;
  hasChildren: boolean;
  sortOrder: number;
};
export type CategorySuggestionStatus =
  'PENDING' | 'APPROVED' | 'REJECTED' | 'MERGED';
export type CategoryStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
export type CategoryReference = Pick<
  CategoryTreeNode,
  'id' | 'name' | 'slug' | 'parentId' | 'sortOrder'
>;
export type CategorySuggestion = {
  id: string;
  proposedName: string;
  proposedDescription?: string | null;
  parentCategoryId?: string | null;
  organizationId: number;
  status: CategorySuggestionStatus;
  rejectionReason?: string | null;
  approvedCategoryId?: string | null;
  createdAt: string;
  parentCategory?: CategoryReference | null;
  approvedCategory?: CategoryReference | null;
};
export type SuggestionPage = {
  items: CategorySuggestion[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};
export type GlobalCategory = CategoryReference & {
  description?: string | null;
  imageUrl?: string | null;
  iconUrl?: string | null;
  isFeatured: boolean;
  status: CategoryStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};
export type GlobalCategoryPage = {
  items: GlobalCategory[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};
export type CategoryPlacementSuggestion = {
  id: string;
  name: string;
  parentId: string | null;
  breadcrumb: string;
  depth: number;
  score: number;
  reason: string;
};
export type AdminCategorySuggestion = CategorySuggestion & {
  organization?: { name: string } | null;
};
export type AdminSuggestionPage = Omit<SuggestionPage, 'items'> & {
  items: AdminCategorySuggestion[];
};

const TREE = gql`
  query CategoryTree {
    categoryTree {
      id
      name
      slug
      parentId
      depth
      hasChildren
      sortOrder
    }
  }
`;
const USAGE = gql`
  query CategoryUsage($categoryId: String!) {
    categorySupplierItemUsage(categoryId: $categoryId) {
      categoryId
      supplierItemCount
    }
  }
`;
const SUGGESTIONS = gql`
  query MyCategorySuggestions(
    $page: Int
    $limit: Int
    $search: String
    $status: CategorySuggestionStatus
  ) {
    myCategorySuggestions(
      page: $page
      limit: $limit
      search: $search
      status: $status
    ) {
      items {
        id
        proposedName
        proposedDescription
        parentCategoryId
        organizationId
        status
        rejectionReason
        approvedCategoryId
        createdAt
        parentCategory {
          id
          name
          slug
          parentId
          sortOrder
        }
        approvedCategory {
          id
          name
          slug
          parentId
          sortOrder
        }
      }
      total
      page
      limit
      totalPages
    }
  }
`;
const CREATE_SUGGESTION = gql`
  mutation CreateCategorySuggestion(
    $proposedName: String!
    $proposedDescription: String
    $parentCategoryId: String
  ) {
    createCategorySuggestion(
      proposedName: $proposedName
      proposedDescription: $proposedDescription
      parentCategoryId: $parentCategoryId
    ) {
      suggestion {
        id
        proposedName
        status
        createdAt
      }
      possibleDuplicates {
        id
        name
        slug
        parentId
      }
    }
  }
`;
const PLACEMENT_SUGGESTIONS = gql`
  query CategoryPlacementSuggestions(
    $proposedName: String!
    $description: String
  ) {
    categoryPlacementSuggestions(
      proposedName: $proposedName
      description: $description
    ) {
      id
      name
      parentId
      breadcrumb
      depth
      score
      reason
    }
  }
`;
const ADMIN_SUGGESTIONS = gql`
  query AdminCategorySuggestions(
    $page: Int
    $limit: Int
    $search: String
    $status: CategorySuggestionStatus
    $organizationId: Int
    $parentCategoryId: String
    $from: String
    $to: String
  ) {
    adminCategorySuggestions(
      page: $page
      limit: $limit
      search: $search
      status: $status
      organizationId: $organizationId
      parentCategoryId: $parentCategoryId
      from: $from
      to: $to
    ) {
      items {
        id
        proposedName
        proposedDescription
        parentCategoryId
        organizationId
        status
        rejectionReason
        approvedCategoryId
        createdAt
        parentCategory {
          id
          name
          slug
          parentId
          sortOrder
        }
        approvedCategory {
          id
          name
          slug
          parentId
          sortOrder
        }
        organization {
          name
        }
      }
      total
      page
      limit
      totalPages
    }
  }
`;
const GLOBAL_CATEGORIES = gql`
  query GlobalCategories(
    $page: Int
    $limit: Int
    $search: String
    $status: CategoryStatus
  ) {
    globalCategories(
      page: $page
      limit: $limit
      search: $search
      status: $status
    ) {
      items {
        id
        name
        slug
        description
        parentId
        imageUrl
        iconUrl
        sortOrder
        isFeatured
        status
        createdAt
        updatedAt
        deletedAt
      }
      total
      page
      limit
      totalPages
    }
  }
`;
const CREATE_CATEGORY = gql`
  mutation CreateGlobalCategory($input: GlobalCategoryInput!) {
    createGlobalCategory(input: $input) {
      id
      name
    }
  }
`;
const UPDATE_CATEGORY = gql`
  mutation UpdateGlobalCategory($id: String!, $input: GlobalCategoryInput!) {
    updateGlobalCategory(id: $id, input: $input) {
      id
      name
    }
  }
`;
const ARCHIVE_CATEGORY = gql`
  mutation ArchiveGlobalCategory($id: String!) {
    archiveGlobalCategory(id: $id) {
      id
      status
    }
  }
`;
const RESTORE_CATEGORY = gql`
  mutation RestoreGlobalCategory($id: String!) {
    restoreGlobalCategory(id: $id) {
      id
      status
    }
  }
`;
const APPROVE_SUGGESTION = gql`
  mutation ApproveCategorySuggestion(
    $id: String!
    $input: CategorySuggestionApprovalInput
  ) {
    approveCategorySuggestion(id: $id, input: $input) {
      id
      status
      approvedCategoryId
    }
  }
`;
const REJECT_SUGGESTION = gql`
  mutation RejectCategorySuggestion($id: String!, $rejectionReason: String!) {
    rejectCategorySuggestion(id: $id, rejectionReason: $rejectionReason) {
      id
      status
      rejectionReason
    }
  }
`;
const MERGE_SUGGESTION = gql`
  mutation MergeCategorySuggestion($id: String!, $categoryId: String!) {
    mergeCategorySuggestion(id: $id, categoryId: $categoryId) {
      id
      status
      approvedCategoryId
    }
  }
`;
const CHANGE_MERGED_TARGET = gql`
  mutation ChangeMergedCategorySuggestionTarget(
    $id: String!
    $categoryId: String!
  ) {
    changeMergedCategorySuggestionTarget(id: $id, categoryId: $categoryId) {
      id
      status
      approvedCategoryId
    }
  }
`;
const CONVERT_MERGED_SUGGESTION = gql`
  mutation ConvertMergedCategorySuggestionToCategory(
    $id: String!
    $input: CategorySuggestionApprovalInput!
  ) {
    convertMergedCategorySuggestionToCategory(id: $id, input: $input) {
      id
      status
      approvedCategoryId
    }
  }
`;

export const getCategoryTree = async () =>
  (await graphQLRequest<{ categoryTree: CategoryTreeNode[] }>(TREE))
    .categoryTree;
export const getCategoryUsage = async (categoryId: string) =>
  (
    await graphQLRequest<{
      categorySupplierItemUsage: {
        categoryId: string;
        supplierItemCount: number;
      };
    }>(USAGE, { categoryId })
  ).categorySupplierItemUsage;
export const getMyCategorySuggestions = async (variables: {
  page: number;
  limit: number;
  search?: string;
  status?: CategorySuggestionStatus;
}) =>
  (
    await graphQLRequest<{ myCategorySuggestions: SuggestionPage }>(
      SUGGESTIONS,
      variables,
    )
  ).myCategorySuggestions;
export const createCategorySuggestion = async (variables: {
  proposedName: string;
  proposedDescription?: string;
  parentCategoryId?: string | null;
}) =>
  (
    await graphQLRequest<{
      createCategorySuggestion: {
        suggestion: CategorySuggestion;
        possibleDuplicates: Array<
          Pick<CategoryTreeNode, 'id' | 'name' | 'slug' | 'parentId'>
        >;
      };
    }>(CREATE_SUGGESTION, variables)
  ).createCategorySuggestion;
export const getCategoryPlacementSuggestions = async (
  proposedName: string,
  description?: string,
) =>
  (
    await graphQLRequest<{
      categoryPlacementSuggestions: CategoryPlacementSuggestion[];
    }>(PLACEMENT_SUGGESTIONS, { proposedName, description })
  ).categoryPlacementSuggestions;
export const getAdminCategorySuggestions = async (variables: {
  page: number;
  limit: number;
  search?: string;
  status?: CategorySuggestionStatus;
  organizationId?: number;
  parentCategoryId?: string;
  from?: string;
  to?: string;
}) =>
  (
    await graphQLRequest<{ adminCategorySuggestions: AdminSuggestionPage }>(
      ADMIN_SUGGESTIONS,
      variables,
    )
  ).adminCategorySuggestions;
export const getGlobalCategories = async (variables: {
  page: number;
  limit: number;
  search?: string;
  status?: CategoryStatus;
}) =>
  (
    await graphQLRequest<{ globalCategories: GlobalCategoryPage }>(
      GLOBAL_CATEGORIES,
      variables,
    )
  ).globalCategories;
export const createGlobalCategory = async (input: {
  name: string;
  description?: string;
  parentId?: string | null;
  sortOrder?: number;
  isFeatured?: boolean;
}) => (await graphQLRequest(CREATE_CATEGORY, { input })).createGlobalCategory;
export const updateGlobalCategory = async (
  id: string,
  input: {
    name: string;
    description?: string;
    parentId?: string | null;
    sortOrder?: number;
    isFeatured?: boolean;
    status?: CategoryStatus;
  },
) =>
  (await graphQLRequest(UPDATE_CATEGORY, { id, input })).updateGlobalCategory;
export const archiveGlobalCategory = async (id: string) =>
  (await graphQLRequest(ARCHIVE_CATEGORY, { id })).archiveGlobalCategory;
export const restoreGlobalCategory = async (id: string) =>
  (await graphQLRequest(RESTORE_CATEGORY, { id })).restoreGlobalCategory;
export const approveCategorySuggestion = async (
  id: string,
  input?: {
    name?: string;
    description?: string;
    parentId?: string | null;
    sortOrder?: number;
    isFeatured?: boolean;
  },
) =>
  (await graphQLRequest(APPROVE_SUGGESTION, { id, input }))
    .approveCategorySuggestion;
export const rejectCategorySuggestion = async (
  id: string,
  rejectionReason: string,
) =>
  (await graphQLRequest(REJECT_SUGGESTION, { id, rejectionReason }))
    .rejectCategorySuggestion;
export const mergeCategorySuggestion = async (id: string, categoryId: string) =>
  (await graphQLRequest(MERGE_SUGGESTION, { id, categoryId }))
    .mergeCategorySuggestion;
export const changeMergedCategorySuggestionTarget = async (
  id: string,
  categoryId: string,
) =>
  (await graphQLRequest(CHANGE_MERGED_TARGET, { id, categoryId }))
    .changeMergedCategorySuggestionTarget;
export const convertMergedCategorySuggestionToCategory = async (
  id: string,
  input: {
    name?: string;
    description?: string;
    parentId: string;
    sortOrder?: number;
    isFeatured?: boolean;
  },
) =>
  (await graphQLRequest(CONVERT_MERGED_SUGGESTION, { id, input }))
    .convertMergedCategorySuggestionToCategory;
