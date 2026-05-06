import { Platform } from 'react-native';

/**
  * Get all organization-level items
  * Used to fetch items available in the organization that can be added to outlets
  * Note: Items don't have prices at org level - prices are set per inventory/outlet
  */
 // @/services/itemService.ts
export class MediaService {
    static getMediaServerUrl(): string {
        return (process.env.EXPO_PUBLIC_MEDIA_SERVER_URL || 'http://10.0.2.2:3001').replace(/\/$/, '');
    }

    static async normalizeMediaFile(file: any) {
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

        if (Platform.OS === 'web') {
            if (file instanceof File || file instanceof Blob) {
                return file;
            }

            const response = await fetch(uri);
            if (!response.ok) {
                throw new Error('Unable to fetch selected file for upload');
            }

            const blob = await response.blob();
            return new File([blob], name, { type });
        }

        return { uri, name, type };
    }

    static async uploadMedia(file: any, orgId: string) {
        if (!orgId) throw new Error('orgId is required for media upload');
        const mediaFile = await this.normalizeMediaFile(file);

        const formData = new FormData();
        formData.append('orgId', orgId);
        formData.append('file', mediaFile as any);

        const response = await fetch(`${this.getMediaServerUrl()}/upload`, {
            method: 'POST',
            body: formData,
            headers: {
                'Accept': 'application/json',
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
                    'Accept': 'application/json',
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
            return this.uploadMedia(file, orgId);
        }
        if (!orgId) throw new Error('orgId is required for media update');

        const mediaFile = await this.normalizeMediaFile(file);
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
}