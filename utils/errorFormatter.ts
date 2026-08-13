import { GraphQLError } from "graphql";

export function formatGraphQLError(error: any): string {
  try {
    // GraphQL error response structure from graphql-request
    const { response, request } = error;

    if (response?.errors?.length) {
      const messages = response.errors.map(
        (err: GraphQLError) =>
          `Message: ${err.message} | Path: ${err.path?.join(".")}`
      );

      return `❌ GraphQL Error (status: ${response.status}):\n${messages.join(
        "\n"
      )}`;
    }

    if (response?.status) {
      return `❌ GraphQL Error (status: ${response.status})`;
    }

    return `❌ Unexpected Error: ${error.message || JSON.stringify(error)}`;
  } catch (e) {
    return `❌ Error formatting GraphQL error: ${String(e)}`;
  }
}
