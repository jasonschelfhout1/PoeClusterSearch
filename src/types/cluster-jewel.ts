export type ComboSize = 2 | 3;
export type ClusterSize = 'Medium' | 'Large';

export interface ClusterBaseSummary {
  id: number;
  size: ClusterSize;
  name: string;
  tag: string;
  tradeText: string;
  notableNames: string[];
  notableCount: number;
  maxComboSize: ComboSize;
  comboCounts: Record<ComboSize, number>;
  estimatedSeconds: Record<ComboSize, number>;
}

export interface ClusterComboResult {
  combo: string[];
  listingCount: number;
  sampledListings: number;
  medianChaos: number | null;
  averageChaos: number | null;
  medianDivines: number | null;
  averageDivines: number | null;
  lowestChaos: number | null;
}

export interface ClusterComboAnalysis {
  base: ClusterBaseSummary;
  comboSize: ComboSize;
  sampleSize: number;
  notableNames: string[];
  divineToChaosRate: number;
  results: ClusterComboResult[];
}

export type ClusterComboAnalysisJobStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface ClusterComboAnalysisProgress {
  totalCombos: number;
  completedCombos: number;
  percentComplete: number;
  currentCombo: string[] | null;
  waitSeconds: number | null;
  estimatedSeconds: number;
  startedAt: string;
  updatedAt: string;
}

export interface ClusterComboAnalysisJob {
  jobId: string;
  base: ClusterBaseSummary;
  comboSize: ComboSize;
  sampleSize: number;
  status: ClusterComboAnalysisJobStatus;
  progress: ClusterComboAnalysisProgress;
  result: ClusterComboAnalysis | null;
  error: string | null;
}

export interface ClusterBaseListResponse {
  league: string;
  result: ClusterBaseSummary[];
}
