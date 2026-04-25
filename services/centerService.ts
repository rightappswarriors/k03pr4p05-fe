import { gql } from "graphql-request"
import { graphQLRequest } from "./apiClient";

export class CenterService {
    static async getCenters() {
        const QUERY = gql`
            query {
                getCenters {
                    id
                    label
                }
            }
        `;
        const response = await graphQLRequest<{ getCenters: any }>(QUERY, {});
        return response.getCenters;
    }

    static async create(label: string) {
        const CREATE_CENTER = gql`
            mutation CreateCenter($label: String!) {
                createCenter(label: $label) {
                    id
                    label
                }
            }
        `;
        const response = await graphQLRequest<{ createCenter: any }>(CREATE_CENTER, {
            label
        });
        return response.createCenter;
    }

    static async update(id: number, label: string) {
        const UPDATE_CENTER = gql`
            mutation UpdateCenter($id: Int!, $label: String!) {
                updateCenter(id: $id, label: $label) {
                    id
                    label
                }
            }
        `;
        const response = await graphQLRequest<{ updateCenter: any }>(UPDATE_CENTER, {
            id,
            label
        });
        return response.updateCenter;
    }

    static async delete(id: number) {
        const DELETE_CENTER = gql`
            mutation DeleteCenter($id: Int!) {
                deleteCenter(id: $id) {
                    id
                    label
                }
            }
        `;
        const response = await graphQLRequest<{ deleteCenter: any }>(DELETE_CENTER, {
            id
        });
        return response.deleteCenter;
    }
}