import { z } from 'zod';

// Bitquery API Configuration
export const BITQUERY_CONFIG = {
  ENDPOINT: 'https://streaming.bitquery.io/eap',
  API_KEY: 'ory_at_YoW0aLryiXB0CVuzCHqJc-BVKohDim455mpOowrDpSU.n-9KUF5fjDMjnyXikYO5HBcHz7tqIOjtIua4nMuy8ZY'
};

// Base GraphQL response schema
const BitqueryResponseSchema = z.object({
  data: z.record(z.any()).optional(),
  errors: z.array(z.object({
    message: z.string(),
    locations: z.array(z.object({
      line: z.number(),
      column: z.number()
    })).optional(),
    path: z.array(z.string()).optional()
  })).optional()
});

export type BitqueryResponse<T = any> = {
  data?: T;
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: string[];
  }>;
};

// GraphQL client class
export class BitqueryClient {
  private endpoint: string;
  private apiKey: string;

  constructor(endpoint: string = BITQUERY_CONFIG.ENDPOINT, apiKey: string = BITQUERY_CONFIG.API_KEY) {
    this.endpoint = endpoint;
    this.apiKey = apiKey;
  }

  async query<T = any>(query: string, variables?: Record<string, any>): Promise<BitqueryResponse<T>> {
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          query,
          variables: variables || {}
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
      }

      const result = await response.json();
      
      // Validate response structure
      const validatedResult = BitqueryResponseSchema.parse(result);
      
      if (validatedResult.errors && validatedResult.errors.length > 0) {
        console.error('Bitquery GraphQL errors:', validatedResult.errors);
        throw new Error(`GraphQL errors: ${validatedResult.errors.map(e => e.message).join(', ')}`);
      }

      return validatedResult as BitqueryResponse<T>;
    } catch (error) {
      console.error('Bitquery API error:', error);
      throw error instanceof Error ? error : new Error('Unknown Bitquery API error');
    }
  }

  // Helper method for paginated queries
  async queryWithPagination<T = any>(
    query: string, 
    variables: Record<string, any> = {},
    limit: number = 100
  ): Promise<T[]> {
    const results: T[] = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore && results.length < limit) {
      const paginatedVariables = {
        ...variables,
        limit: Math.min(50, limit - results.length),
        offset
      };

      const response = await this.query<{ [key: string]: T[] }>(query, paginatedVariables);
      
      if (!response.data) {
        break;
      }

      // Get the first array from the response data
      const dataKey = Object.keys(response.data)[0];
      const batch = response.data[dataKey] || [];
      
      results.push(...batch);
      
      hasMore = batch.length === paginatedVariables.limit;
      offset += batch.length;
    }

    return results;
  }
}

// Default client instance
export const bitqueryClient = new BitqueryClient();

// Utility function for safe API calls
export async function safeBitqueryCall<T>(
  operation: () => Promise<T>,
  fallback: T,
  errorMessage: string = 'Bitquery API call failed'
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    console.warn(`${errorMessage}:`, error);
    return fallback;
  }
} 