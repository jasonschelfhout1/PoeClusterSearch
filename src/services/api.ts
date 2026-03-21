import axios, { AxiosInstance } from 'axios';
import { SearchQuery, SearchResponse, FetchResponse, SearchResult, ResultItem } from '../types/poe-api';

class PoEClusterAPI {
  private api: AxiosInstance;
  private baseURL: string;

  constructor(baseURL: string = 'http://localhost:3001/api') {
    this.baseURL = baseURL;
    this.api = axios.create({
      baseURL,
      timeout: 30000,
    });
  }

  /**
   * Search for cluster jewels using the provided query
   */
  async search(query: SearchQuery): Promise<{ results: string[]; queryId: string; total: number }> {
    try {
      const response = await this.api.post<SearchResponse>('/search', query);
      return {
        results: response.data.result,
        queryId: response.data.id,
        total: response.data.total,
      };
    } catch (error) {
      throw this.handleError(error, 'Failed to search for cluster jewels');
    }
  }

  /**
   * Fetch detailed information for items
   */
  async fetchItems(itemIds: string[], queryId: string): Promise<ResultItem[]> {
    try {
      const idsParam = itemIds.join(',');
      const response = await this.api.get<FetchResponse>(`/fetch/${idsParam}`, {
        params: { query: queryId },
      });
      return response.data.result;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch item details');
    }
  }

  /**
   * Convert API response items to SearchResult format for UI
   */
  convertToSearchResults(items: ResultItem[]): SearchResult[] {
    return items.map((item) => {
      const priceData = item.listing?.price;
      const accountData = item.listing?.account;
      const indexedDate = item.listing?.indexed ? new Date(item.listing.indexed) : new Date();

      return {
        id: item.id,
        name: item.item.name,
        typeLine: item.item.typeLine,
        ilvl: item.item.ilvl,
        priceAmount: priceData?.amount || 0,
        priceCurrency: priceData?.currency || 'unknown',
        seller: accountData?.name || 'Unknown',
        online: accountData?.online || false,
        listed: indexedDate.toLocaleDateString(),
        explicitMods: item.item.explicitMods || [],
      };
    });
  }

  /**
   * Execute a full search: search -> fetch -> convert
   */
  async executeFullSearch(query: SearchQuery, limit: number = 20): Promise<SearchResult[]> {
    try {
      // Step 1: Search for item IDs
      const { results, queryId, total } = await this.search(query);
      console.log(`Search returned ${total} total results, fetching ${Math.min(limit, results.length)} items`);

      // Step 2: Fetch full details for a subset of results
      const itemsToFetch = results.slice(0, limit);
      const items = await this.fetchItems(itemsToFetch, queryId);

      // Step 3: Convert to UI format
      return this.convertToSearchResults(items);
    } catch (error) {
      throw this.handleError(error, 'Failed to execute full search');
    }
  }

  /**
   * Helper: Handle and format errors
   */
  private handleError(error: unknown, message: string): never {
    if (axios.isAxiosError(error)) {
      const errorMsg = error.response?.data?.message || error.message;
      throw new Error(`${message}: ${errorMsg}`);
    }
    throw new Error(`${message}: ${String(error)}`);
  }
}

export const poeAPI = new PoEClusterAPI();

export default poeAPI;
