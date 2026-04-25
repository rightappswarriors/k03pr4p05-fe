import { gql } from 'graphql-request';
import { graphQLRequest } from './apiClient';
import { formatGraphQLError } from '@/utils/errorFormatter';

export class MasterFileFinanceService {
    static async getAccountTitles() {
        const QUERY = gql`
            query GetAllAccountTitles {
                getAllAccountTitles {
                    id
                    label
                    code
                }
            }
        `
        try {
            const response = await graphQLRequest<{ getAllAccountTitles: any }>(QUERY);
            return response.getAllAccountTitles;
        } catch (error) {
            const message = formatGraphQLError(error);
            console.error('getAccountTitles error:', message);
            return [];
        }
    }
    
    static async createAccountTitle(label: string, code?: string) {
        const CREATE = gql`
            mutation CreateAccountTitle($label: String!, $code: String) {
                createAccountTitle(label: $label, code: $code) {
                    id
                    label
                    code
                }    
            }
        `
        try {
            const response = await graphQLRequest<{ createAccountTitle: any }>(CREATE, {
                label,
                code: code || null
            });
            return response.createAccountTitle;
        } catch (error) {
            const message = formatGraphQLError(error);
            console.error('createAccountTitle error:', message);
            throw error; // Re-throw so UI can show error
        }
    }
    
    static async updateAccountTitle(id: number, label: string, code?: string) {
        const UPDATE = gql`
            mutation UpdateAccountTitle($id: Int!, $label: String!, $code: String) {
                updateAccountTitle(id: $id, label: $label, code: $code) {
                    id
                    label
                    code
                }
            }
        `
        try {
            const response = await graphQLRequest<{ updateAccountTitle: any }>(UPDATE, {
                id,
                label,
                code: code || null
            });
            return response.updateAccountTitle;
        } catch (error) {
            const message = formatGraphQLError(error);
            console.error('updateAccountTitle error:', message);
            throw error;
        }
    }
    
    static async deleteAccountTitle(id: number) {
        const DELETE = gql`
            mutation DeleteAccountTitle($id: Int!) {
                deleteAccountTitle(id: $id) {
                    id
                    label
                }
            }
        `
        try {
            const response = await graphQLRequest<{ deleteAccountTitle: any }>(DELETE, {
                id
            });
            return response.deleteAccountTitle;
        } catch (error) {
            const message = formatGraphQLError(error);
            console.error('deleteAccountTitle error:', message);
            throw error;
        }
    }
}