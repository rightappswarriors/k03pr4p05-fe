import { gql } from 'graphql-request';
import { graphQLRequest } from './apiClient';

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

  static async getItems(query?: string, size?: number, orderBy: 'asc' | 'desc' = 'asc'): Promise<any[]> {
    const GRAPHQL = gql`
      query GetItems($query: String, $size: Int, $orderBy: orderBy) {
        getItems(query: $query, size: $size, orderBy: $orderBy) {
          id
          name
          barcode
          description
          brand
          categoryId
          price
          vatExempt
          assembly
        }
      }
    `;

    const response = await graphQLRequest<{ getItems: any[] }>(GRAPHQL, {
      query,
      size,
      orderBy,
    });
    return response.getItems;
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

  static async updateStock(inventoryItemId: number, data: { quantity?: number; price?: number; name?: string }): Promise<any> {
    const MUTATION = gql`
      mutation UpdateInventoryItem($id: Int!, $data: InventoryItemUpdateInput!) {
        updateInventoryItem(id: $id, data: $data) {
          id
          quantity
          price
          name
        }
      }
    `;

    const response = await graphQLRequest<{ updateInventoryItem: any }>(MUTATION, {
      id: inventoryItemId,
      data,
    });
    return response.updateInventoryItem;
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
}
