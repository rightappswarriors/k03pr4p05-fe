import { gql } from 'graphql-request';
import { graphQLRequest } from './apiClient';
import { AuthService } from './authService';
import { getGraphQLClient } from '@/utils/constants';

export class InventoryService {
  static async getInventory(outletId: number): Promise<any> {
    const QUERY = gql`
      query GetInventoryByOutletId($outletId: Int!) {
        getInventoryByOutletId(outletId: $outletId) {
          id
          name
          address
          outletType
          inventory {
            id
            outletId
            inventoryItems {
              id
              itemId
              quantity
              price
              minQuantity
              opExPct
              costJson
              totalCost
              priceB
              priceC
              item {
                id
                name
                barcode
                stock
                vatExempt
                assembly
                skuNumber
                brandId
                brandDetails { id name }
                categoryId
                category { id name }
              }
            }
          }
        }
      }
    `;

    const response = await graphQLRequest<{ getInventoryByOutletId: any }>(QUERY, {
      outletId,
    });

    return response.getInventoryByOutletId;
  }

  /**
   * Get all organization-level items
   * Used to fetch items available in the organization that can be added to outlets
   * Note: Items don't have prices at org level - prices are set per inventory/outlet
   */
  static async getOrgItems(query?: string, size?: number): Promise<any[]> {
    const GRAPHQL = gql`
      query GetItems($query: String, $size: Int) {
        getItems(query: $query, size: $size) {
          id
          name
          barcode
          description
          categoryId
          stock
          sellingPrice
          opExPct
          priceB
          priceC
          minQuantity
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
    categoryId?: number;
    stock: number;
    sellingPrice: number;
    vatExempt?: boolean;
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
          stock
          opExPct
          sellingPrice
          minQuantity
          costLines { label amount }
          category { id name }
          vatExempt
          assembly
          skuNumber
          brandId
          brandDetails { id name }
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
      mutation UpdateItem($id: Int!, $data: UpdateItemInput!) {
        updateItem(id: $id, data: $data) {
          id
          name
          barcode
          description
          brand
          categoryId
          stock
          sellingPrice
          costLines { label amount}
          category { id name }
          price
          vatExempt
          assembly
          skuNumber
          brandDetails { id name }
          media { id url type }
        }
      }
    `;

    try {
      const { accessToken } = await AuthService.getTokens();
      const client = await getGraphQLClient();
      const response = await client.request(MUTATION, { id: itemId, data }, {
        Authorization: `Bearer ${accessToken}`
      }) as any;

      return response.updateItem;
    } catch (error) {
      console.error('Failed to update item:', error);
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

  /**
   * Add item to outlet inventory with units for selling
   */
  static async addItemToOutletWithUnits(outletId: number, data: {
    itemId: number;
    quantity: number;
    price: number;
    units?: Array<{
      unitName: string;
      unitLabel: string;
      price: number;
      quantity: number;
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