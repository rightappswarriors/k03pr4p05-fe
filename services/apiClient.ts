import { getGraphQLClient } from '@/utils/constants';
import { AuthService } from './authService';

export type GraphQLVariables = Record<string, any>;

export interface GraphQLRequestOptions {
  skipAuth?: boolean;
}

function normalizeError(error: unknown): string {
  if (!error || typeof error !== 'object') return 'Unknown network error';

  // graphql-request ClientError
  if ('response' in error && typeof (error as any).response === 'object') {
    const resp = (error as any).response;
    const messageFromErrors = Array.isArray(resp.errors)
      ? resp.errors.map((e: any) => e.message).join(' | ')
      : null;
    return messageFromErrors || resp.statusText || 'GraphQL request error';
  }

  if (error instanceof Error) {
    return error.message || 'GraphQL request error';
  }

  return String(error);
}

export async function graphQLRequest<T = any>(
  query: string,
  variables: GraphQLVariables = {},
  options: GraphQLRequestOptions = {}
): Promise<T> {
  const client = await getGraphQLClient();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (!options.skipAuth) {
    const { accessToken } = await AuthService.getTokens();
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
  }

  try {
    return (await client.request<T>(query, variables, headers)) as T;
  } catch (error) {
    const message = normalizeError(error);
    throw new Error(message);
  }
}
