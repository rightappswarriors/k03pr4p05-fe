import { gql } from 'graphql-request';
import { graphQLRequest } from './apiClient';
import { AuthService } from './authService';
import { getGraphQLClient } from '@/utils/constants';
import { MediaService } from './mediaService';
import { formatGraphQLError } from '@/utils/errorFormatter';

const MIN_DESC_LENGTH = 50;

export function validateDescription(description: string): string | null {
  if (description.trim().length < MIN_DESC_LENGTH) {
    return `Description is required and must be at least ${MIN_DESC_LENGTH} characters.`;
  }
  return null;
}

export class InventoryService {
  static async getItemStockDistribution(itemId: number): Promise<any> {
    const QUERY = gql`
    query GetItemStockDistribution($itemId: Int!) {
      getItemStockDistribution(itemId: $itemId) {
        itemId
        itemName
        totalStock
        minQuantity
        stockLabel
        stockDescription
        warehouseStock
        totalAssigned
        image
        outlets {
          outletId
          outletName
          quantity
          baseUnit
          reorderPoint
          status
        }
      }
    }
  `;
    const { accessToken } = await AuthService.getTokens();
    const client = await getGraphQLClient();
    const data = await client.request<{ getItemStockDistribution: any }>(
      QUERY,
      { itemId },
      { Authorization: `Bearer ${accessToken}` }
    );
    return data.getItemStockDistribution;
  }

  //FrontendService
  static async getInventoryItemById(inventoryItemId: number): Promise<any> {
    const QUERY = gql`
    query GetInventoryItemById($id: ID!) {
      getInventoryItemById(id: $id) {
        id
        price
        quantity
        categoryId
        category { id name }
        item {
          id
          name
          barcode
          brand
          stock
          sellingPrice
          description
          image
          isBNPC
          remainingStock
          maxAllocatable
          hasSeniorDiscountVATExempt
          costLines { id label amount }
        }
        units {
          id
          unitName
          unitLabel
          price
          quantity
          conversionFactor
          baseUnit
          barcode
          isDefault
          isActive
          allowDecimal
          minOrderQty
          maxOrderQty
          reorderPoint
        }
      }
    }
  `;
    const { accessToken } = await AuthService.getTokens();
    const client = await getGraphQLClient();
    const data = await client.request<{ getInventoryItemById: any }>(
      QUERY,
      { id: inventoryItemId },
      { Authorization: `Bearer ${accessToken}` }
    );
    return data.getInventoryItemById;
  }
  static getMediaServerUrl(): string {
    return (process.env.EXPO_PUBLIC_MEDIA_SERVER_URL || 'http://10.0.2.2:3001').replace(/\/$/, '');
  }

  static normalizeMediaFile(file: any) {
    const uri = file?.uri;
    if (!uri) {
      throw new Error('Media file URI is required');
    }
    const name = file.name || uri.split('/').pop() || `upload_${Date.now()}`;
    const type =
      file.type ||
      (name.match(/\.([a-zA-Z0-9]+)$/)?.[1]
        ? `image/${name.split('.').pop()}`
        : 'image/jpeg');
    return { uri, name, type };
  }


  static async getDashboardInventoryStats(): Promise<{
    skuCount: number;
    totalUnits: number;
    categoryBreakdown: { name: string; totalStock: number }[];
  }> {
    const GRAPHQL = gql`
    query {
      getDashboardInventoryStats {
        skuCount
        totalUnits
        categoryBreakdown {
          name
          totalStock
        }
      }
    }
  `;

    try {
      const { accessToken } = await AuthService.getTokens();
      const client = await getGraphQLClient();
      const res = await client.request(
        GRAPHQL, {},
        { Authorization: `Bearer ${accessToken}` },
      ) as any;

      return res.getDashboardInventoryStats ?? {
        skuCount: 0,
        totalUnits: 0,
        categoryBreakdown: [],
      };
    } catch (error) {
      if (__DEV__) console.error('Failed to fetch dashboard inventory stats:', error);
      return { skuCount: 0, totalUnits: 0, categoryBreakdown: [] };
    }
  }
  static async getOrgItems(query?: string, size?: number): Promise<any[]> {
    const GRAPHQL = gql`
      query GetItems($query: String, $size: Int) {
        getItems(query: $query, size: $size) {
          id
          name
          itemCode
          barcode
          description
          categoryId
          image
          stock
          sellingPrice
          opExPct
          priceB
          priceC
          minQuantity
          stockLabel          
          stockDescription    
          costLines { label amount }
          category {
            id
            name
          }
          vatType {
            id
            name
            rate
          }
          vatExempt
          isVatExempt
          isBNPC
          hasSeniorDiscountVATExempt
          vatRate
          assembly
          skuNumber
          brandId
          brandDetails {
            id
            name
          }
          media {
            id
            url
            type
          }
        }
      }
    `;

    try {
      const { accessToken } = await AuthService.getTokens();
      const client = await getGraphQLClient();
      const response = await client.request(GRAPHQL, {
        query: query || undefined,
        size: size || 100,
      }, {
        Authorization: `Bearer ${accessToken}`
      }) as any;

      // Map items - prices are set per inventory/outlet level
      return (response.getItems || []).map((item: any) => ({
        ...item,
      }));
    } catch (error) {
      if (__DEV__) console.error('Failed to fetch organization items:', error);
      return [];
    }
  }

  static async addItemToInventory(itemPayload: any): Promise<any> {
    const MUTATION = gql`
      mutation CreateItems($items: [CreateItemInput!]!) {
        createItems(items: $items) {
          count
        }
      }
    `;

    if (!Array.isArray(itemPayload)) {
      itemPayload = [itemPayload];
    }

    const response = await graphQLRequest<{ createItems: any }>(MUTATION, {
      items: itemPayload,
    });

    return response.createItems;
  }

  static async createItem(data: {
    name: string;
    description: string;
    barcode: string;
    brand?: string;
    categoryId?: number;        // global
    orgCategoryId?: number;     // ✅ org
    stock: number;
    sellingPrice: number;
    image?: string;
    itemCode?: string;
    vatExempt?: boolean;
    isVatExempt?: boolean;
    isBNPC?: boolean;
    hasSeniorDiscountVATExempt?: boolean;
    vatRate?: number;
    vatTypeId?: number;         // ✅ add
    assembly?: boolean;
    skuNumber?: string;
    costLines?: Array<{ label: string; amount: number }>;
    opExPct?: number;
    priceB?: number;
    priceC?: number;
    stockLabel: string;
    stockDescription?: string;
    minQuantity: number;
  }): Promise<any> {
    if (__DEV__) console.log('Creating item with data:', data.stockLabel, data.stockDescription);
    const MUTATION = gql`
    mutation CreateItem($data: CreateItemInput!) {
      createItem(data: $data) {
        id
        name
        barcode
        description
        categoryId
        orgCategoryId
        stock
        opExPct
        itemCode
        sellingPrice
        minQuantity
        stockLabel
        stockDescription
        costLines { label amount }
        category { id name }
        orgCategory { id name }
        vatExempt
        isVatExempt
        isBNPC
        hasSeniorDiscountVATExempt
        vatRate
        vatTypeId
        assembly
        skuNumber
        media { id url type }
      }
    }
  `;

    try {
      const { accessToken } = await AuthService.getTokens();
      const client = await getGraphQLClient();
      const response = await client.request(MUTATION, { data }, {
        Authorization: `Bearer ${accessToken}`
      }) as any;

      return response.createItem;
    } catch (error) {
      const errorMessage = formatGraphQLError(error);
      if (__DEV__) console.error('Failed to create item:', errorMessage);
      throw errorMessage;
    }
  }

  static async updateItem(itemId: number, data: any): Promise<any> {
    const descError = validateDescription(data.description ?? '');
    if (descError) {
      throw new Error(descError); // local guard — never calls the API
    }
    const MUTATION = gql`
      mutation UpdateItem($id: ID!, $data: UpdateItemInput!) {
        updateItem(id: $id, data: $data) {
          id
          name
          barcode
          description
          brandId
          categoryId
          stock
          itemCode
          stockLabel
          stockDescription
          sellingPrice
          costLines { label amount}
          category { id name }
          sellingPrice
          vatExempt
          isVatExempt
          isBNPC
          hasSeniorDiscountVATExempt
          vatRate
          assembly
          skuNumber
          image
        }
      }
    `;

    try {
      const { accessToken } = await AuthService.getTokens();
      const client = await getGraphQLClient();
      const response = await client.request(MUTATION, { id: String(itemId), data }, {
        Authorization: `Bearer ${accessToken}`
      }) as any;

      return response.updateItem;
    } catch (error) {
      if (__DEV__) console.error('Failed to update item:', error);
      throw error;
    }
  }

  static async deleteItem(itemId: number, imagePath?: string): Promise<any> {
    if (imagePath) {
      try {
        await MediaService.deleteMedia(imagePath);
      } catch (err) {
        if (__DEV__) console.warn('deleteMedia failed, proceeding with item delete:', err);
      }
    }

    const MUTATION = gql`
      mutation DeleteItem($id: ID!) {
        deleteItem(id: $id) {
          id
        }
      }
    `;

    try {
      const { accessToken } = await AuthService.getTokens();
      const client = await getGraphQLClient();
      const res = await client.request(MUTATION, { id: itemId }, {
        Authorization: `Bearer ${accessToken}`,
      }) as any;
      return res.deleteItem;
    } catch (error) {
      if (__DEV__) console.error('Failed to delete item:', error);
      throw error;
    }
  }

  static async updateStock(inventoryItemId: number, data: { quantity?: number; price?: number; name?: string }): Promise<any> {
    const MUTATION = gql`
      mutation UpdateInventoryItem($id: Int!, $quantity: Int, $price: Float, $minQuantity: Int, $costLines: [CostLineInput!], $opExPct: Float, $priceB: Float, $priceC: Float) {
        updateInventoryItem(id: $id, quantity: $quantity, price: $price, minQuantity: $minQuantity, costLines: $costLines, opExPct: $opExPct, priceB: $priceB, priceC: $priceC) {
          id
          quantity
          price
          minQuantity
          totalCost
          opExPct
          priceB
          priceC
          costJson
          item { id name }
        }
      }
    `;

    try {
      const { accessToken } = await AuthService.getTokens();
      const client = await getGraphQLClient();
      const response = await client.request(MUTATION, {
        id: inventoryItemId,
        ...data,
      }, {
        Authorization: `Bearer ${accessToken}`
      }) as any;

      return response.updateInventoryItem;
    } catch (error) {
      if (__DEV__) console.error('Failed to update inventory item:', error);
      throw error;
    }
  }

  static async transferStock(params: {
    fromInventoryItemId: number;
    toInventoryItemId: number;
    quantity: number;
  }): Promise<{ from: any; to: any }> {
    // Fallback manual transfer using existing update endpoints.
    const fromItem = await this.updateStock(params.fromInventoryItemId, { quantity: -params.quantity });
    const toItem = await this.updateStock(params.toInventoryItemId, { quantity: params.quantity });

    return { from: fromItem, to: toItem };
  }

  static async getInventoryItemsByRack(inventoryId: number, rackName: string): Promise<any[]> {
    const QUERY = gql`
      query GetInventoryItemsByRack($inventoryId: Int!, $rackName: String!) {
        getInventoryItemsByRack(inventoryId: $inventoryId, rackName: $rackName) {
          id
          inventoryId
          itemId
          quantity
          price
          locationData {
            aisle
            rack
            shelf
          }
          itemData {
            id
            name
          }
        }
      }
    `;

    const response = await graphQLRequest<{ getInventoryItemsByRack: any[] }>(QUERY, {
      inventoryId,
      rackName,
    });
    return response.getInventoryItemsByRack;
  }

  /**
   * Add organization items to an outlet's inventory
   * This creates the link between items (org-level) and the outlet's inventory
   */
  static async addItemsToOutlet(inventoryId: number, items: Array<{
    itemId: number;
    quantity: number;
    price: number;
  }>): Promise<any> {
    const MUTATION = gql`
      mutation AddItemsToInventory($inventoryId: ID!, $items: [AddItemToInventoryInput!]!) {
        addItemsToInventory(inventoryId: $inventoryId, items: $items) {
          count
        }
      }
    `;

    try {
      const { accessToken } = await AuthService.getTokens();
      const client = await getGraphQLClient();
      const response = await client.request(MUTATION, {
        inventoryId: String(inventoryId),
        items,
      }, {
        Authorization: `Bearer ${accessToken}`
      }) as any;

      return response.addItemsToInventory;
    } catch (error) {
      if (__DEV__) console.error('Failed to add items to outlet:', error);
      throw error;
    }
  }
  static async updateOutletItem(
    inventoryItemId: number,
    payload: {
      price: number;
      quantity: number;
      categoryId?: number;
      units: Array<{
        unitName: string;
        unitLabel: string;
        price: number;
        quantity: number;
        conversionFactor: number;
        baseUnit: string;
        barcode?: string;
        isDefault: boolean;
        allowDecimal: boolean;
        minOrderQty?: number;
        maxOrderQty?: number;
        reorderPoint?: number;
      }>;
    }
  ): Promise<void> {
    const MUTATION = gql`
    mutation UpdateOutletItem($data: UpdateOutletItemInput!) {
      updateOutletItem(data: $data) {
        id
        price
        quantity
        units {
          id
          unitName
          unitLabel
          price
          isDefault
          allowDecimal
        }
      }
    }
  `;
    const { accessToken } = await AuthService.getTokens();
    const client = await getGraphQLClient();
    await client.request(
      MUTATION,
      {
        data: {
          inventoryItemId,
          ...payload,
        },
      },
      { Authorization: `Bearer ${accessToken}` }
    );
  }
  /**
   * Add item to outlet inventory with units for selling
   */
  static async addItemToOutletWithUnits(outletId: number, data: {
    isLocked?: boolean;
    itemId: number;
    quantity: number;
    price: number;
    categoryId: number | undefined,
    units?: Array<{
      unitName: string;
      unitLabel: string;
      price: number;
      quantity: number;
      allowDecimal: boolean;
      conversionFactor: number;
      baseUnit?: string;
      barcode?: string;
      isDefault?: boolean;
      minOrderQty?: number;
      maxOrderQty?: number;
      reorderPoint?: number;
    }>;
  }): Promise<any> {
    const MUTATION = gql`
      mutation AddItemToInventoryWithUnits($outletId: ID!, $data: AddItemToInventoryWithUnitsInput!) {
        addItemToInventoryWithUnits(outletId: $outletId, data: $data) {
          id
          itemId
          quantity
          price
          item {
            id
            name
            barcode
            stock
            vatExempt
          isVatExempt
          isBNPC
          vatRate
          assembly
            skuNumber
            brandDetails { id name }
            category { id name }
          }
          units {
            id
            unitName
            unitLabel
            price
            quantity
            allowDecimal
            conversionFactor
            baseUnit
            barcode
            isDefault
            minOrderQty
            maxOrderQty
            reorderPoint
          }
        }
      }
    `;

    try {
      const { accessToken } = await AuthService.getTokens();
      const client = await getGraphQLClient();
      const response = await client.request(MUTATION, {
        outletId: outletId,
        data,
      }, {
        Authorization: `Bearer ${accessToken}`
      }) as any;

      return response.addItemToInventoryWithUnits;
    } catch (error) {
      if (__DEV__) console.error('Failed to add item to outlet with units:', error);
      throw error;
    }
  }

  static async createScPwdCustomer(data: any): Promise<any> {
    const MUTATION = gql`
      mutation CreateScPwdCustomer($data: ScPwdCustomerInput!) {
        createScPwdCustomer(data: $data) { id fullName idNumber idType customerType isRepresentative representativeName representativeIdNumber }
      }
    `;
    const response = await graphQLRequest<{ createScPwdCustomer: any }>(MUTATION, { data });
    return response.createScPwdCustomer;
  }

  static async updateScPwdCustomer(id: string, data: any): Promise<any> {
    const MUTATION = gql`
      mutation UpdateScPwdCustomer($id: String!, $data: ScPwdCustomerInput!) {
        updateScPwdCustomer(id: $id, data: $data) { id fullName idNumber idType customerType isRepresentative representativeName representativeIdNumber }
      }
    `;
    const response = await graphQLRequest<{ updateScPwdCustomer: any }>(MUTATION, { id, data });
    return response.updateScPwdCustomer;
  }

  static async getScPwdCustomers(search?: string): Promise<any[]> {
    const QUERY = gql`
      query ScPwdCustomers($search: String) {
        scPwdCustomers(search: $search) { id fullName idNumber idType customerType dateOfBirth contactNumber address isRepresentative representativeName representativeIdNumber createdAt updatedAt }
      }
    `;
    const response = await graphQLRequest<{ scPwdCustomers: any[] }>(QUERY, { search });
    return response.scPwdCustomers ?? [];
  }

  static async getScPwdCustomer(id: string): Promise<any> {
    const QUERY = gql`
      query ScPwdCustomer($id: String!) {
        scPwdCustomer(id: $id) { id fullName idNumber idType customerType dateOfBirth contactNumber address isRepresentative representativeName representativeIdNumber createdAt updatedAt }
      }
    `;
    const response = await graphQLRequest<{ scPwdCustomer: any }>(QUERY, { id });
    return response.scPwdCustomer;
  }
}



