import { gql } from 'graphql-request';
import { graphQLRequest } from './apiClient';
import { AuthService } from './authService';
import { getGraphQLClient } from '@/utils/constants';

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

  static async uploadMedia(file: any, orgId: string) {
    if (!orgId) throw new Error('orgId is required for media upload');
    const mediaFile = this.normalizeMediaFile(file);

    const formData = new FormData();
    formData.append('orgId', orgId);
    formData.append('file', mediaFile as any);

    const response = await fetch(`${this.getMediaServerUrl()}/upload`, {
      method: 'POST',
      body: formData,
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Media upload failed: ${response.status} ${text}`);
    }

    const result = await response.json();
    if (!result?.success) {
      throw new Error(result?.error || 'Media upload failed');
    }

    const publicUrl = result.data?.publicUrl || result.data?.url;
    const filePath = result.data?.filePath || result.data?.path;

    if (!publicUrl || !filePath) {
      throw new Error('Invalid response from media server');
    }

    return { publicUrl, filePath };
  }

  static async deleteMedia(path: string) {
    if (!path) throw new Error('path is required for media deletion');

    try {
      const response = await fetch(`${this.getMediaServerUrl()}/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ path }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Media delete failed: ${response.status} ${text}`);
      }

      const result = await response.json();
      if (!result?.success) {
        throw new Error(result?.error || 'Media delete failed');
      }

      return result.data;
    } catch (error) {
      console.warn('Failed to delete media (continuing):', error);
      return null;
    }
  }

  static async updateMedia(file: any, oldPath: string, orgId: string) {
    if (!oldPath) {
      this.uploadMedia(file, orgId);
      return;
    };
    if (!orgId) throw new Error('orgId is required for media update');

    const mediaFile = this.normalizeMediaFile(file);
    const formData = new FormData();
    formData.append('orgId', orgId);
    formData.append('oldPath', oldPath);
    formData.append('file', mediaFile as any);

    const response = await fetch(`${this.getMediaServerUrl()}/update`, {
      method: 'PUT',
      body: formData,
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Media update failed: ${response.status} ${text}`);
    }

    const result = await response.json();
    if (!result?.success) {
      throw new Error(result?.error || 'Media update failed');
    }

    const publicUrl = result.data?.publicUrl || result.data?.url;
    const filePath = result.data?.filePath || result.data?.path;

    if (!publicUrl || !filePath) {
      throw new Error('Invalid response from media server');
    }

    return { publicUrl, filePath };
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
      console.error('Failed to fetch dashboard inventory stats:', error);
      return { skuCount: 0, totalUnits: 0, categoryBreakdown: [] };
    }
  }
  static async getOrgItems(query?: string, size?: number): Promise<any[]> {
    const GRAPHQL = gql`
      query GetItems($query: String, $size: Int) {
        getItems(query: $query, size: $size) {
          id
          name
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
          vatExempt
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
      console.error('Failed to fetch organization items:', error);
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
    description?: string;
    barcode: string;
    brand?: string;
    categoryId?: number;        // global
    orgCategoryId?: number;     // ✅ org
    stock: number;
    sellingPrice: number;
    image?: string;
    vatExempt?: boolean;
    vatTypeId?: number;         // ✅ add
    assembly?: boolean;
    skuNumber?: string;
    costLines?: Array<{ label: string; amount: number }>;
    opExPct?: number;
    priceB?: number;
    priceC?: number;
    minQuantity?: number;
  }): Promise<any> {
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
        sellingPrice
        minQuantity
        costLines { label amount }
        category { id name }
        orgCategory { id name }
        vatExempt
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
      console.error('Failed to create item:', error);
      throw error;
    }
  }

  static async updateItem(itemId: number, data: any): Promise<any> {
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
          sellingPrice
          costLines { label amount}
          category { id name }
          sellingPrice
          vatExempt
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
      console.error('Failed to update item:', error);
      throw error;
    }
  }

  static async deleteItem(itemId: number, imagePath?: string): Promise<any> {
    if (imagePath) {
      try {
        await this.deleteMedia(imagePath);
      } catch (err) {
        console.warn('deleteMedia failed, proceeding with item delete:', err);
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
      console.error('Failed to delete item:', error);
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
      console.error('Failed to update inventory item:', error);
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
      console.error('Failed to add items to outlet:', error);
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
      console.error('Failed to add item to outlet with units:', error);
      throw error;
    }
  }

}