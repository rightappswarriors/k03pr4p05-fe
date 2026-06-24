import { graphQLRequest } from './apiClient';

export class PositionService {
  static async getAll() {
    try {
      const query = `
        query GetPositions {
          positions {
            id
            name
            description
            permissions {
              id
              pageId
              canView
              canCreate
              canEdit
              canDelete
              page {
                id
                key
                label
              }
            }
            users {
              id
              fullname
            }
          }
        }
      `;

      const response = await graphQLRequest(query, {});
      return response.positions;
    } catch (error) {
      if (__DEV__) console.error('PositionService.getAll failed:', error);
      throw error;
    }
  }

  static async getPages() {
    try {
      const query = `
        query GetPages {
          pages {
            id
            key
            label
            sortOrder
          }
        }
      `;

      const response = await graphQLRequest(query, {});
      if (__DEV__) console.log('PositionService.getPages response:', response);
      return response.pages;
    } catch (error) {
      if (__DEV__) console.error('PositionService.getPages failed:', error);
      throw error;
    }
  }

  static async create(name: string, description?: string) {
    try {
      const mutation = `
        mutation CreatePosition($input: PositionInput!) {
          createPosition(input: $input) {
            id
            name
            description
          }
        }
      `;

      const response = await graphQLRequest(mutation, {
        input: { name, description },
      });

      return response.createPosition;
    } catch (error) {
      if (__DEV__) console.error('PositionService.create failed:', error);
      throw error;
    }
  }

  static async update(
    id: string,
    name: string,
    description?: string,
  ) {
    try {
      const mutation = `
        mutation UpdatePosition($id: String!, $input: PositionInput!) {
          updatePosition(id: $id, input: $input) {
            id
            name
            description
          }
        }
      `;
 
      const response = await graphQLRequest(mutation, {
        id,
        input: { name, description },
      });

      return response.updatePosition;
    } catch (error) {
      if (__DEV__) console.error('PositionService.update failed:', error);
      throw error;
    }
  }

  static async delete(id: string | number) {
    try {
      const mutation = `
        mutation DeletePosition($id: String!) {
          deletePosition(id: $id) {
            id
          }
        }
      `;

      const response = await graphQLRequest(mutation, {
        id: String(id),
      });

      return response.deletePosition;
    } catch (error) {
      if (__DEV__) console.error('PositionService.delete failed:', error);
      throw error;
    }
  }

  static async setPermissions(
    positionId: string,
    permissions: any[],
  ) {
    try {
      const mutation = `
        mutation SetPositionPermissions(
          $positionId: String!
          $permissions: [PermissionInput!]!
        ) {
          setPositionPermissions(
            positionId: $positionId
            permissions: $permissions
          ) {
            id
          }
        }
      `;

      const response = await graphQLRequest(mutation, {
        positionId,
        permissions,
      });

      return response.setPositionPermissions;
    } catch (error) {
      if (__DEV__)
        console.error(
          'PositionService.setPermissions failed:',
          error,
        );
      throw error;
    }
  }

  static async setUserPermissionOverride(
    userId: number,
    pageId: string,
    override: {
      canView?: boolean | null;
      canCreate?: boolean | null;
      canEdit?: boolean | null;
      canDelete?: boolean | null;
    },
  ) {
    try {
      const mutation = `
        mutation SetUserPermissionOverride(
          $userId: Int!
          $pageId: String!
          $canView: Boolean
          $canCreate: Boolean
          $canEdit: Boolean
          $canDelete: Boolean
        ) {
          setUserPermissionOverride(
            userId: $userId
            pageId: $pageId
            canView: $canView
            canCreate: $canCreate
            canEdit: $canEdit
            canDelete: $canDelete
          ) {
            id
          }
        }
      `;

      const response = await graphQLRequest(mutation, {
        userId,
        pageId,
        canView: override.canView,
        canCreate: override.canCreate,
        canEdit: override.canEdit,
        canDelete: override.canDelete,
      });

      return response.setUserPermissionOverride;
    } catch (error) {
      if (__DEV__)
        console.error(
          'PositionService.setUserPermissionOverride failed:',
          error,
        );
      throw error;
    }
  }
}