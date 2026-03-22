import axios, { AxiosInstance } from 'axios';
import {
  ClusterBaseListResponse,
  ClusterComboAnalysisJob,
  ClusterBaseSummary,
  ComboSize,
} from '../types/cluster-jewel';

class PoEClusterAPI {
  private api: AxiosInstance;

  constructor(baseURL: string = 'http://localhost:3001/api') {
    this.api = axios.create({
      baseURL,
      timeout: 30000,
    });
  }

  async getClusterBases(): Promise<ClusterBaseSummary[]> {
    try {
      const response = await this.api.get<ClusterBaseListResponse>('/cluster-jewels/bases');
      return response.data.result;
    } catch (error) {
      throw this.handleError(error, 'Failed to load cluster jewel bases');
    }
  }

  async startClusterBaseAnalysis(
    baseId: number,
    comboSize: ComboSize,
    sampleSize: number
  ): Promise<ClusterComboAnalysisJob> {
    try {
      const response = await this.api.post<ClusterComboAnalysisJob>(
        '/cluster-jewels/analyze',
        {
          baseId,
          comboSize,
          sampleSize,
        }
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to analyze cluster jewel prices');
    }
  }

  async getClusterBaseAnalysisJob(jobId: string): Promise<ClusterComboAnalysisJob> {
    try {
      const response = await this.api.get<ClusterComboAnalysisJob>(`/cluster-jewels/analyze/${jobId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to load cluster jewel analysis progress');
    }
  }

  private handleError(error: unknown, message: string): never {
    if (axios.isAxiosError(error)) {
      const errorMessage = extractErrorMessage(error.response?.data) || error.message;
      throw new Error(`${message}: ${errorMessage}`);
    }

    throw new Error(`${message}: ${String(error)}`);
  }
}

function extractErrorMessage(value: unknown): string | null {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value !== 'object') {
    return null;
  }

  const maybeRecord = value as Record<string, unknown>;
  const directMessage = maybeRecord.message;
  if (typeof directMessage === 'string') {
    return directMessage;
  }

  const errorMessage = extractErrorMessage(maybeRecord.error);
  if (errorMessage) {
    return errorMessage;
  }

  return extractErrorMessage(maybeRecord.details);
}

export const poeAPI = new PoEClusterAPI();

export default poeAPI;
