// k03pr4p05-fe\services\wholesaleService.ts
import { gql } from 'graphql-request';
import { graphQLRequest } from './apiClient';
import type {
  SupplierItem,
  ProductWholesaleSettings,
  ProductSpecification,
  WholesalePackaging,
  WholesaleShipping,
  WholesaleDocument,
  PriceTier,
  SupplierItemImage,
  SupplierCapability,
} from '@/types/index';

// ─────────────────────────────────────────────────────────────
// WHOLESALE PRODUCT QUERIES
// ─────────────────────────────────────────────────────────────

const GET_WHOLESALE_PRODUCT = gql`
  query GetWholesaleProduct($id: String!) {
    wholesaleProduct(id: $id) {
      id
      name
      description
      sku
      unit
      unitPrice
      isVatExempt
      vatRate
      moq
      availableQty
      isActive
      image
      averageRating
      reviewCount
      createdAt
      updatedAt
      priceTiers {
        id
        minQty
        maxQty
        price
        currency
        createdAt
        updatedAt
      }
      reviews {
        id
        supplierItemId
        reviewerOrgId
        rating
        title
        comment
        isVerifiedPurchase
        createdAt
        updatedAt
        reviewer {
          id
          name
        }
        supplierItemImage {
          id
          url
          sortOrder
        }
      }
      productWholesaleSettings {
        id
        supplierItemId
        minimumOrderQty
        sampleAvailable
        samplePrice
        leadTime
        createdAt
        updatedAt
      }
      productSpecifications {
        id
        supplierItemId
        category
        groupName
        name
        value
        unit
        sortOrder
        createdAt
        updatedAt
      }
      wholesalePackaging {
        id
        supplierItemId
        sellingUnit
        packageLength
        packageWidth
        packageHeight
        grossWeight
        netWeight
        createdAt
        updatedAt
      }
      wholesaleShipping {
        id
        supplierItemId
        originCountry
        originProvince
        originCity
        shippingMethod
        estimatedDays
        shippingNotes
        createdAt
        updatedAt
      }
      wholesaleDocuments {
        id
        supplierItemId
        title
        type
        fileUrl
        verified
        verifiedById
        verifiedAt
        createdAt
        updatedAt
      }
      images {
        id
        url
        sortOrder
      }
    }
  }
`;

const GET_WHOLESALE_PRODUCTS = gql`
  query GetWholesaleProducts(
    $catalogId: String
    $search: String
    $categoryId: String
    $groupId: String
    $isActive: Boolean
  ) {
    wholesaleProducts(
      catalogId: $catalogId
      search: $search
      categoryId: $categoryId
      groupId: $groupId
      isActive: $isActive
    ) {
      id
      name
      description
      sku
      unit
      unitPrice
      isVatExempt
      vatRate
      moq
      availableQty
      isActive
      image
      averageRating
      reviewCount
      createdAt
      updatedAt
      priceTiers {
        id
        minQty
        maxQty
        price
        currency
      }
      productWholesaleSettings {
        id
        supplierItemId
        minimumOrderQty
        sampleAvailable
        samplePrice
        leadTime
      }
    }
  }
`;

const GET_RELATED_PRODUCTS = gql`
  query GetRelatedProducts($productId: String!, $limit: Int) {
    relatedProducts(productId: $productId, limit: $limit) {
      id
      name
      unitPrice
      image
      averageRating
      reviewCount
      priceTiers {
        id
        minQty
        maxQty
        price
        currency
      }
      productWholesaleSettings {
        minimumOrderQty
        sampleAvailable
        samplePrice
      }
      images {
        id
        url
        sortOrder
      }
    }
  }
`;

// ─────────────────────────────────────────────────────────────
// WHOLESALE PRODUCT MUTATIONS
// ─────────────────────────────────────────────────────────────

const CREATE_SPECIFICATION = gql`
  mutation CreateSpecification($input: CreateSpecificationInput!) {
    createSpecification(input: $input) {
      id
      supplierItemId
      category
      groupName
      name
      value
      unit
      sortOrder
      createdAt
      updatedAt
    }
  }
`;

const UPDATE_SPECIFICATION = gql`
  mutation UpdateSpecification($input: UpdateSpecificationInput!) {
    updateSpecification(input: $input) {
      id
      supplierItemId
      category
      groupName
      name
      value
      unit
      sortOrder
      createdAt
      updatedAt
    }
  }
`;

const DELETE_SPECIFICATION = gql`
  mutation DeleteSpecification($id: String!) {
    deleteSpecification(id: $id) {
      id
    }
  }
`;

const UPDATE_PACKAGING = gql`
  mutation UpdatePackaging($input: UpdatePackagingInput!) {
    updatePackaging(input: $input) {
      id
      supplierItemId
      sellingUnit
      packageLength
      packageWidth
      packageHeight
      grossWeight
      netWeight
      createdAt
      updatedAt
    }
  }
`;

const UPDATE_SHIPPING = gql`
  mutation UpdateShipping($input: UpdateShippingInput!) {
    updateShipping(input: $input) {
      id
      supplierItemId
      originCountry
      originProvince
      originCity
      shippingMethod
      estimatedDays
      shippingNotes
      createdAt
      updatedAt
    }
  }
`;

const UPLOAD_DOCUMENT = gql`
  mutation UploadDocument($input: UploadDocumentInput!) {
    uploadDocument(input: $input) {
      id
      supplierItemId
      title
      type
      fileUrl
      verified
      createdAt
      updatedAt
    }
  }
`

const DELETE_DOCUMENT = gql`
  mutation DeleteDocument($id: String!) {
    deleteDocument(id: $id) {
      id
    }
  }
`

const UPDATE_WHOLESALE_SETTINGS = gql`
  mutation UpdateWholesaleSettings(
    $supplierItemId: String!
    $minimumOrderQty: Int
    $sampleAvailable: Boolean
    $samplePrice: Float
    $leadTime: String
  ) {
    updateWholesaleSettings(
      supplierItemId: $supplierItemId
      minimumOrderQty: $minimumOrderQty
      sampleAvailable: $sampleAvailable
      samplePrice: $samplePrice
      leadTime: $leadTime
    ) {
      id
      supplierItemId
      minimumOrderQty
      sampleAvailable
      samplePrice
      leadTime
      createdAt
      updatedAt
    }
  }
`;

const CREATE_SUPPLIER_CAPABILITY = gql`
  mutation CreateSupplierCapability($input: CreateSupplierCapabilityInput!) {
    createSupplierCapability(input: $input) {
      id
      organizationId
      type
      name
      available
      description
      createdAt
      updatedAt
    }
  }
`;

const UPDATE_SUPPLIER_CAPABILITY = gql`
  mutation UpdateSupplierCapability($input: UpdateSupplierCapabilityInput!) {
    updateSupplierCapability(input: $input) {
      id
      organizationId
      type
      name
      available
      description
      createdAt
      updatedAt
    }
  }
`;

const DELETE_SUPPLIER_CAPABILITY = gql`
  mutation DeleteSupplierCapability($id: String!) {
    deleteSupplierCapability(id: $id) {
      id
    }
  }
`;

const UPDATE_DOCUMENT = gql`
  mutation UpdateDocument($input: UpdateDocumentInput!) {
    updateDocument(input: $input) {
      id
      supplierItemId
      title
      type
      fileUrl
      verified
      createdAt
      updatedAt
    }
  }
`;

const GET_SUPPLIER_CAPABILITIES = gql`
  query GetSupplierCapabilities($organizationId: Int!) {
    supplierCapabilities(organizationId: $organizationId) {
      id
      organizationId
      type
      name
      available
      description
      createdAt
      updatedAt
    }
  }
`;

const GET_SUPPLIER_ITEM_IMAGES = gql`
  query GetSupplierItemImages($supplierItemId: String!) {
    supplierItemImages(supplierItemId: $supplierItemId) {
      id
      supplierItemId
      url
      sortOrder
      createdAt
      updatedAt
    }
  }
`;

const CREATE_SUPPLIER_ITEM_IMAGE = gql`
  mutation CreateSupplierItemImage($input: CreateSupplierItemImageInput!) {
    createSupplierItemImage(input: $input) {
      id
      supplierItemId
      url
      sortOrder
      createdAt
      updatedAt
    }
  }
`;

const UPDATE_SUPPLIER_ITEM_IMAGE = gql`
  mutation UpdateSupplierItemImage($input: UpdateSupplierItemImageInput!) {
    updateSupplierItemImage(input: $input) {
      id
      supplierItemId
      url
      sortOrder
      createdAt
      updatedAt
    }
  }
`;

const DELETE_SUPPLIER_ITEM_IMAGE = gql`
  mutation DeleteSupplierItemImage($id: Int!) {
    deleteSupplierItemImage(id: $id) {
      id
    }
  }
`;

const REORDER_SUPPLIER_ITEM_IMAGES = gql`
  mutation ReorderSupplierItemImages($input: ReorderImagesInput!) {
    reorderSupplierItemImages(input: $input) {
      id
      url
      sortOrder
    }
  }
`;

// ─────────────────────────────────────────────────────────────
// WHOLESALE SERVICE CLASS
// ─────────────────────────────────────────────────────────────

export class WholesaleService {
  // Fetch a single wholesale product by ID
  static async getWholesaleProduct(id: string): Promise<SupplierItem | null> {
    try {
      const response = await graphQLRequest<{ wholesaleProduct: SupplierItem }>(
        GET_WHOLESALE_PRODUCT,
        { id }
      );
      return response.wholesaleProduct;
    } catch (error) {
      if (__DEV__) console.error('Failed to fetch wholesale product:', error);
      return null;
    }
  }

  // Fetch wholesale products list with optional filters
  static async getWholesaleProducts(params?: {
    catalogId?: string;
    search?: string;
    categoryId?: string;
    groupId?: string;
    isActive?: boolean;
  }): Promise<SupplierItem[]> {
    try {
      const response = await graphQLRequest<{ wholesaleProducts: SupplierItem[] }>(
        GET_WHOLESALE_PRODUCTS,
        params || {}
      );
      return response.wholesaleProducts || [];
    } catch (error) {
      if (__DEV__) console.error('Failed to fetch wholesale products:', error);
      return [];
    }
  }

  // Fetch related products for a given product
  static async getRelatedProducts(
    productId: string,
    limit?: number
  ): Promise<SupplierItem[]> {
    try {
      const response = await graphQLRequest<{ relatedProducts: SupplierItem[] }>(
        GET_RELATED_PRODUCTS,
        { productId, limit }
      );
      return response.relatedProducts || [];
    } catch (error) {
      if (__DEV__) console.error('Failed to fetch related products:', error);
      return [];
    }
  }

  // Specification mutations
  static async createSpecification(input: {
    supplierItemId: string;
    name: string;
    value: string;
    category?: string;
    groupName?: string;
    unit?: string;
    sortOrder?: number;
  }): Promise<ProductSpecification> {
    const response = await graphQLRequest<{ createSpecification: ProductSpecification }>(
      CREATE_SPECIFICATION,
      { input }
    );
    return response.createSpecification;
  }

  static async updateSpecification(input: {
    id: string;
    name?: string;
    value?: string;
    category?: string;
    groupName?: string;
    unit?: string;
    sortOrder?: number;
  }): Promise<ProductSpecification> {
    const response = await graphQLRequest<{ updateSpecification: ProductSpecification }>(
      UPDATE_SPECIFICATION,
      { input }
    );
    return response.updateSpecification;
  }

  static async deleteSpecification(id: string): Promise<{ id: string }> {
    const response = await graphQLRequest<{ deleteSpecification: { id: string } }>(
      DELETE_SPECIFICATION,
      { id }
    );
    return response.deleteSpecification;
  }

  // Packaging mutations
  // NOTE: field names below (packageLength/packageWidth/packageHeight) must match
  // UpdatePackagingInput on the server — confirmed against the WholesalePackaging
  // fields queried in GET_WHOLESALE_PRODUCT above. Previously this sent
  // length/width/height, which the schema doesn't define, causing:
  //   Field "length" is not defined by type "UpdatePackagingInput"
  static async updatePackaging(input: {
    supplierItemId: string;
    sellingUnit?: string;
    packageLength?: number | null;
    packageWidth?: number | null;
    packageHeight?: number | null;
    grossWeight?: number | null;
    netWeight?: number | null;
  }): Promise<WholesalePackaging> {
    const response = await graphQLRequest<{ updatePackaging: WholesalePackaging }>(
      UPDATE_PACKAGING,
      { input }
    );
    return response.updatePackaging;
  }

  // Shipping mutations
  static async updateShipping(input: {
    supplierItemId: string;
    originCountry?: string;
    originProvince?: string;
    originCity?: string;
    shippingMethod?: string;
    estimatedDays?: number;
    shippingNotes?: string;
  }): Promise<WholesaleShipping> {
    const response = await graphQLRequest<{ updateShipping: WholesaleShipping }>(
      UPDATE_SHIPPING,
      { input }
    );
    return response.updateShipping;
  }

  // Document mutations
  static async uploadDocument(input: {
    supplierItemId: string;
    type: string;
    title?: string;
    fileUrl: string;
  }): Promise<WholesaleDocument> {
    const response = await graphQLRequest<{ uploadDocument: WholesaleDocument }>(
      UPLOAD_DOCUMENT,
      { input }
    );
    return response.uploadDocument;
  }

  static async deleteDocument(id: string): Promise<{ id: string }> {
    const response = await graphQLRequest<{ deleteDocument: { id: string } }>(
      DELETE_DOCUMENT,
      { id }
    );
    return response.deleteDocument;
  }

  static async updateDocument(input: {
    id: string;
    type?: string;
    title?: string;
  }): Promise<WholesaleDocument> {
    const response = await graphQLRequest<{ updateDocument: WholesaleDocument }>(
      UPDATE_DOCUMENT,
      { input }
    );
    return response.updateDocument;
  }

  // Wholesale settings mutations
  static async updateWholesaleSettings(
    supplierItemId: string,
    data: {
      minimumOrderQty?: number;
      sampleAvailable?: boolean;
      samplePrice?: number;
      leadTime?: string;
    }
  ): Promise<ProductWholesaleSettings> {
    const response = await graphQLRequest<{ updateWholesaleSettings: ProductWholesaleSettings }>(
      UPDATE_WHOLESALE_SETTINGS,
      { supplierItemId, ...data }
    );
    return response.updateWholesaleSettings;
  }

  // Supplier capability mutations
  static async createSupplierCapability(input: {
    organizationId: number;
    type: string;
    name?: string;
    available?: boolean;
    description?: string;
  }): Promise<SupplierCapability> {
    const response = await graphQLRequest<{ createSupplierCapability: SupplierCapability }>(
      CREATE_SUPPLIER_CAPABILITY,
      { input }
    );
    return response.createSupplierCapability;
  }

  static async updateSupplierCapability(input: {
    id: string;
    available?: boolean;
    description?: string;
  }): Promise<SupplierCapability> {
    const response = await graphQLRequest<{ updateSupplierCapability: SupplierCapability }>(
      UPDATE_SUPPLIER_CAPABILITY,
      { input }
    );
    return response.updateSupplierCapability;
  }

  static async deleteSupplierCapability(id: string): Promise<SupplierCapability> {
    const response = await graphQLRequest<{ deleteSupplierCapability: SupplierCapability }>(
      DELETE_SUPPLIER_CAPABILITY,
      { id }
    );
    return response.deleteSupplierCapability;
  }

  static async getSupplierCapabilities(organizationId: number): Promise<SupplierCapability[]> {
    try {
      const response = await graphQLRequest<{ supplierCapabilities: SupplierCapability[] }>(
        GET_SUPPLIER_CAPABILITIES,
        { organizationId }
      );
      return response.supplierCapabilities || [];
    } catch (error) {
      if (__DEV__) console.error('Failed to fetch supplier capabilities:', error);
      return [];
    }
  }

  // Image management methods
  static async getSupplierItemImages(supplierItemId: string): Promise<SupplierItemImage[]> {
    try {
      const response = await graphQLRequest<{ supplierItemImages: SupplierItemImage[] }>(
        GET_SUPPLIER_ITEM_IMAGES,
        { supplierItemId }
      );
      return response.supplierItemImages || [];
    } catch (error) {
      if (__DEV__) console.error('Failed to fetch supplier item images:', error);
      return [];
    }
  }

  static async createSupplierItemImage(input: {
    supplierItemId: string;
    url: string;
    sortOrder?: number;
  }): Promise<SupplierItemImage> {
    const response = await graphQLRequest<{ createSupplierItemImage: SupplierItemImage }>(
      CREATE_SUPPLIER_ITEM_IMAGE,
      { input }
    );
    return response.createSupplierItemImage;
  }

  static async updateSupplierItemImage(input: {
    id: number;
    url?: string;
    sortOrder?: number;
  }): Promise<SupplierItemImage> {
    const response = await graphQLRequest<{ updateSupplierItemImage: SupplierItemImage }>(
      UPDATE_SUPPLIER_ITEM_IMAGE,
      { input }
    );
    return response.updateSupplierItemImage;
  }

  static async deleteSupplierItemImage(id: number): Promise<SupplierItemImage> {
    const response = await graphQLRequest<{ deleteSupplierItemImage: SupplierItemImage }>(
      DELETE_SUPPLIER_ITEM_IMAGE,
      { id }
    );
    return response.deleteSupplierItemImage;
  }

  static async reorderSupplierItemImages(input: {
    ids: number[];
    sortOrders: number[];
  }): Promise<SupplierItemImage> {
    const response = await graphQLRequest<{ reorderSupplierItemImages: SupplierItemImage }>(
      REORDER_SUPPLIER_ITEM_IMAGES,
      { input }
    );
    return response.reorderSupplierItemImages;
  }
}

// Export individual methods for convenience
export const fetchWholesaleProduct = WholesaleService.getWholesaleProduct;
export const fetchWholesaleProducts = WholesaleService.getWholesaleProducts;
export const fetchRelatedProducts = WholesaleService.getRelatedProducts;