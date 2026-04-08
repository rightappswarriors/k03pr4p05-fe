import { graphQLRequest } from './apiClient';

export class PositionService {
  static async getAll() {
    const query = `
      query GetPositions {
        positions {
          id
          name
          description
          permissions {
            pageId
            canView
            canCreate
            canEdit
            canDelete
            page {
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
    const response = await graphQLRequest(query,{});
    return response.positions;
  }

  static async getPages() {
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
    return response.pages;
  }

  static async create(name: string, description?: string) {
    const mutation = `
      mutation CreatePosition($input: PositionInput!) {
        createPosition(input: $input) {
          id
          name
          description
        }
      }
    `;
    const response = await graphQLRequest(mutation, { input: { name, description } });
    return response.createPosition;
  }

  static async update(id: string, name: string, description?: string) {
    const mutation = `
      mutation UpdatePosition($id: String!, $input: PositionInput!) {
        updatePosition(id: $id, input: $input) {
          id
          name
          description
        }
      }
    `;
    const response = await graphQLRequest(mutation, { id, input: { name, description } });
    return response.updatePosition;
  }

  static async delete(id: string | number) {
    const mutation = `
      mutation DeletePosition($id: String!) {
        deletePosition(id: $id) {
          id
        }
      }
    `;
    const response = await graphQLRequest(mutation, { id: String(id) });
    return response.deletePosition;
  }

  static async setPermissions(positionId: string, permissions: any[]) {
    const mutation = `
      mutation SetPositionPermissions($positionId: String!, $permissions: [PermissionInput!]!) {
        setPositionPermissions(positionId: $positionId, permissions: $permissions) {
          id
        }
      }
    `;
    const response = await graphQLRequest(mutation, { positionId, permissions });
    return response.setPositionPermissions;
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
  }
}
