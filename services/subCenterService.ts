import { gql } from "graphql-request";
import { graphQLRequest } from "./apiClient";
import { formatGraphQLError } from "@/utils/errorFormatter";

export class SubCenterService {
    static async getAll() {
        const SUB_CENTERS = gql`
            query SubCenters {
                subCenters {
                    id
                    label
                }
            }
        `;
        try {

            const response = await graphQLRequest<{ subCenters: any }>(SUB_CENTERS, {
            });
            return response.subCenters;
        } catch (error) {
            const errorMessage = formatGraphQLError(error)
            if (__DEV__) console.error("SubCenterService ", errorMessage);
            throw new Error(errorMessage)
        }
    }
    static async create(name: string) {
        const CREATE_SUB_CENTER = gql`
            mutation CreateSubCenter($label: String!) {
                createSubCenter(label: $label) {
                    id
                    label
                }
            }
        `;
        const response = await graphQLRequest<{ createSubCenter: any }>(CREATE_SUB_CENTER, {
            label: name,
        });
        return response.createSubCenter;
    }
    static async update(id: number, label: string) {
        const UPDATE_SUB_CENTER = gql`
            mutation UpdateSubCenter($id: Int!, $label: String!) {
                updateSubCenter(id: $id, label: $label) {
                    id 
                    label
                }
            }
        `
        const response = await graphQLRequest<{ updateSubCenter: any }>(UPDATE_SUB_CENTER, {
            id,
            label
        });
        return response.updateSubCenter;
    }

    static async delete(id: number) {
        const DELETE_SUB_CENTER = gql`
            mutation DeleteSubCenter($id: Int!) {
                deleteSubCenter(id: $id) {
                    id
                }
            }    
        `
        const response = await graphQLRequest<{ deleteSubCenter: any }>(DELETE_SUB_CENTER, {
            id
        });
        return response.deleteSubCenter;
    }
}