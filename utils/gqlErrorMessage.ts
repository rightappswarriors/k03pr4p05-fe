

export function gqlErrorMessage(error: any): string {
    // GraphQL errors come back in error.response.errors[]
    const graphqlMessage = error?.response?.errors?.[0]?.message;
    return graphqlMessage ?? (error instanceof Error ? error.message : String(error));
}