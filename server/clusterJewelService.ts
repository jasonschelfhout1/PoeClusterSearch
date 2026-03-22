import axios, { AxiosInstance } from 'axios';

type ClusterSize = 'Medium' | 'Large';
type ComboSize = 2 | 3;
type SampleSize = number;

interface TradeStatOption {
  id: number;
  text: string;
}

interface TradeStatEntry {
  id: string;
  text: string;
  option?: {
    options: TradeStatOption[];
  };
}

interface TradeStatGroup {
  label: string;
  entries: TradeStatEntry[];
}

interface TradeStatsResponse {
  result: TradeStatGroup[];
}

interface ClusterBaseDefinition {
  key: string;
  size: ClusterSize;
  name: string;
  tag: string;
  tradeText: string;
}

interface ClusterNotableDefinition {
  name: string;
  tradeStatId: string;
  baseTags: string[];
}

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

interface ClusterBase extends ClusterBaseSummary {
  notables: ClusterNotable[];
}

interface ClusterNotable {
  name: string;
  tradeStatId: string;
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
  sampleSize: SampleSize;
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
  sampleSize: SampleSize;
  status: ClusterComboAnalysisJobStatus;
  progress: ClusterComboAnalysisProgress;
  result: ClusterComboAnalysis | null;
  error: string | null;
}

interface CachedValue<T> {
  expiresAt: number;
  value: T;
}

interface AnalysisProgressUpdate {
  status?: ClusterComboAnalysisJobStatus;
  totalCombos?: number;
  completedCombos?: number;
  currentCombo?: string[] | null;
  waitSeconds?: number | null;
  estimatedSeconds?: number;
}

interface TradeSearchResponse {
  result: string[];
  id: string;
  total: number;
}

interface TradeFetchResponse {
  result: Array<{
    listing?: {
      price?: {
        amount: number;
        currency: string;
      };
    };
  }>;
}

interface TradeExchangeResponse {
  result: Record<
    string,
    {
      listing?: {
        offers?: Array<{
          exchange?: {
            amount: number;
          };
          item?: {
            amount: number;
          };
        }>;
      };
    }
  >;
}

const POB_CLUSTER_JEWELS_URL =
  'https://raw.githubusercontent.com/PathOfBuildingCommunity/PathOfBuilding/dev/src/Data/ClusterJewels.lua';
const POB_CLUSTER_MODS_URL =
  'https://raw.githubusercontent.com/PathOfBuildingCommunity/PathOfBuilding/dev/src/Data/ModJewelCluster.lua';
const POE_BASE_URL = 'https://www.pathofexile.com';
const MIRAGE_LEAGUE = 'Mirage';
const TRADE_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
  Accept: 'application/json,text/plain,*/*',
  Referer: `https://www.pathofexile.com/trade/search/${MIRAGE_LEAGUE}`,
};
const BASE_DATA_TTL_MS = 1000 * 60 * 60;
const CURRENCY_RATE_TTL_MS = 1000 * 60 * 10;
const ANALYSIS_TTL_MS = 1000 * 60 * 30;
const POE_REQUEST_INTERVAL_MS = 2200;
const MAX_SAMPLE_SIZE = 10;
const MIN_SAMPLE_SIZE = 1;
const ANALYSIS_LOG_INTERVAL = 10;

class PoERateLimiter {
  private queue: Promise<void> = Promise.resolve();
  private lastRunAt = 0;

  async run<T>(task: () => Promise<T>, onRetryWait?: (waitSeconds: number) => void): Promise<T> {
    const wrappedTask = async (): Promise<T> => {
      const now = Date.now();
      const waitMs = Math.max(0, POE_REQUEST_INTERVAL_MS - (now - this.lastRunAt));
      if (waitMs > 0) {
        await delay(waitMs);
      }

      this.lastRunAt = Date.now();

      try {
        return await task();
      } catch (error) {
        const retryAfterMs = getRetryDelayMs(error);
        if (retryAfterMs === null) {
          throw error;
        }

        console.log(
          `[RATE LIMIT] PoE asked us to wait ${Math.ceil(retryAfterMs / 1000)}s before retrying.`
        );
        onRetryWait?.(Math.ceil(retryAfterMs / 1000));
        await delay(retryAfterMs);
        this.lastRunAt = Date.now();
        return await task();
      }
    };

    const result = this.queue.then(wrappedTask, wrappedTask);
    this.queue = result.then(
      () => undefined,
      () => undefined
    );
    return result;
  }
}

const limiter = new PoERateLimiter();
const poeHttp: AxiosInstance = axios.create({
  baseURL: POE_BASE_URL,
  timeout: 30000,
  headers: TRADE_HEADERS,
});
const rawHttp: AxiosInstance = axios.create({
  timeout: 30000,
  headers: {
    'User-Agent': TRADE_HEADERS['User-Agent'],
  },
});

let baseCache: CachedValue<ClusterBase[]> | null = null;
let baseCachePromise: Promise<ClusterBase[]> | null = null;
const currencyRateCache = new Map<string, CachedValue<number>>();
const analysisCache = new Map<string, CachedValue<ClusterComboAnalysis>>();
const analysisPromiseCache = new Map<string, Promise<ClusterComboAnalysis>>();
const analysisJobCache = new Map<string, ClusterComboAnalysisJob>();

export async function getClusterBases(): Promise<ClusterBaseSummary[]> {
  const bases = await getClusterBaseDefinitions();
  return bases.map(toBaseSummary);
}

export async function startClusterBaseAnalysis(
  baseId: number,
  comboSize: ComboSize,
  sampleSize: SampleSize
): Promise<ClusterComboAnalysisJob> {
  const normalizedSampleSize = normalizeSampleSize(sampleSize);
  const jobId = getAnalysisJobId(baseId, comboSize, normalizedSampleSize);
  const cachedAnalysis = analysisCache.get(jobId);
  if (cachedAnalysis && cachedAnalysis.expiresAt > Date.now()) {
    const completedJob = buildCompletedAnalysisJob(jobId, cachedAnalysis.value);
    analysisJobCache.set(jobId, completedJob);
    return completedJob;
  }

  const existingJob = analysisJobCache.get(jobId);
  if (existingJob && ['queued', 'running'].includes(existingJob.status)) {
    return existingJob;
  }

  if (existingJob) {
    analysisJobCache.delete(jobId);
  }

  const base = await getClusterBaseOrThrow(baseId, comboSize);
  const startedAt = new Date().toISOString();
  const totalCombos = base.comboCounts[comboSize];
  const estimatedSeconds = base.estimatedSeconds[comboSize];
  const job: ClusterComboAnalysisJob = {
    jobId,
    base: toBaseSummary(base),
    comboSize,
    sampleSize: normalizedSampleSize,
    status: 'queued',
    progress: {
      totalCombos,
      completedCombos: 0,
      percentComplete: 0,
      currentCombo: null,
      waitSeconds: null,
      estimatedSeconds,
      startedAt,
      updatedAt: startedAt,
    },
    result: null,
    error: null,
  };

  analysisJobCache.set(jobId, job);

  void analyzeClusterBase(baseId, comboSize, normalizedSampleSize, (update) => {
    updateAnalysisJob(jobId, update);
  })
    .then((analysis) => {
      analysisJobCache.set(jobId, buildCompletedAnalysisJob(jobId, analysis));
    })
    .catch((error) => {
      const currentJob = analysisJobCache.get(jobId) ?? job;
      analysisJobCache.set(jobId, {
        ...currentJob,
        status: 'failed',
        progress: {
          ...currentJob.progress,
          currentCombo: null,
          updatedAt: new Date().toISOString(),
        },
        result: null,
        error: error instanceof Error ? error.message : String(error),
      });
    });

  return job;
}

export function getClusterBaseAnalysisJob(jobId: string): ClusterComboAnalysisJob | null {
  return analysisJobCache.get(jobId) ?? null;
}

export async function analyzeClusterBase(
  baseId: number,
  comboSize: ComboSize,
  sampleSize: SampleSize,
  onProgress?: (update: AnalysisProgressUpdate) => void
): Promise<ClusterComboAnalysis> {
  const normalizedSampleSize = normalizeSampleSize(sampleSize);
  const cacheKey = getAnalysisJobId(baseId, comboSize, normalizedSampleSize);
  const cachedAnalysis = analysisCache.get(cacheKey);
  if (cachedAnalysis && cachedAnalysis.expiresAt > Date.now()) {
    return cachedAnalysis.value;
  }

  const inFlightAnalysis = analysisPromiseCache.get(cacheKey);
  if (inFlightAnalysis) {
    return inFlightAnalysis;
  }

  const analysisPromise = runClusterBaseAnalysis(
    baseId,
    comboSize,
    normalizedSampleSize,
    cacheKey,
    onProgress
  ).finally(() => {
    analysisPromiseCache.delete(cacheKey);
  });

  analysisPromiseCache.set(cacheKey, analysisPromise);
  return analysisPromise;
}

async function runClusterBaseAnalysis(
  baseId: number,
  comboSize: ComboSize,
  sampleSize: SampleSize,
  cacheKey: string,
  onProgress?: (update: AnalysisProgressUpdate) => void
): Promise<ClusterComboAnalysis> {
  const base = await getClusterBaseOrThrow(baseId, comboSize);

  const notables = base.notables.slice().sort((left, right) => left.name.localeCompare(right.name));
  const combos = buildCombinations(notables, comboSize);
  const results: ClusterComboResult[] = [];
  const estimatedSeconds = base.estimatedSeconds[comboSize];

  onProgress?.({
    status: 'running',
    totalCombos: combos.length,
    completedCombos: 0,
    currentCombo: null,
    waitSeconds: null,
    estimatedSeconds,
  });

  const divineToChaosRate = await getChaosRateForCurrency('divine', (waitSeconds) => {
    onProgress?.({
      status: 'running',
      totalCombos: combos.length,
      completedCombos: 0,
      currentCombo: null,
      waitSeconds,
      estimatedSeconds,
    });
  });

  console.log(
    `[ANALYZE START] ${base.name} (${comboSize}-notable, sample ${sampleSize}) with ${combos.length} combos. Estimated ${estimatedSeconds}s.`
  );

  for (let index = 0; index < combos.length; index += 1) {
    const combo = combos[index];
    const completed = index + 1;
    const comboNames = combo.map((entry) => entry.name);

    onProgress?.({
      status: 'running',
      totalCombos: combos.length,
      completedCombos: index,
      currentCombo: comboNames,
      waitSeconds: null,
      estimatedSeconds,
    });

    console.log(
      `[ANALYZE CHECK] ${base.name} (${comboSize}-notable): ${completed}/${combos.length} -> ${comboNames.join(
        ' + '
      )}`
    );

    try {
      results.push(await analyzeCombo(base, combo, sampleSize, divineToChaosRate, onProgress));
    } catch (error) {
      console.error(
        `[ANALYZE ERROR] ${base.name} (${comboSize}-notable): failed on combo ${completed}/${combos.length} -> ${combo
          .map((entry) => entry.name)
          .join(' + ')}`
      );
      throw error;
    }

    onProgress?.({
      status: 'running',
      totalCombos: combos.length,
      completedCombos: completed,
      currentCombo: completed === combos.length ? null : comboNames,
      waitSeconds: null,
      estimatedSeconds,
    });

    const shouldLogProgress =
      completed === 1 ||
      completed === combos.length ||
      completed % ANALYSIS_LOG_INTERVAL === 0;

    if (shouldLogProgress) {
      const percentComplete = Math.round((completed / combos.length) * 100);
      console.log(
        `[ANALYZE PROGRESS] ${base.name} (${comboSize}-notable): ${completed}/${combos.length} combos (${percentComplete}%)`
      );
    }
  }

  results.sort(compareComboResults);

  const analysis: ClusterComboAnalysis = {
    base: toBaseSummary(base),
    comboSize,
    sampleSize,
    notableNames: notables.map((notable) => notable.name),
    divineToChaosRate,
    results,
  };

  analysisCache.set(cacheKey, {
    expiresAt: Date.now() + ANALYSIS_TTL_MS,
    value: analysis,
  });

  onProgress?.({
    status: 'completed',
    totalCombos: combos.length,
    completedCombos: combos.length,
    currentCombo: null,
    waitSeconds: null,
    estimatedSeconds,
  });

  console.log(
    `[ANALYZE DONE] ${base.name} (${comboSize}-notable, sample ${sampleSize}) finished with ${results.length} combo results.`
  );

  return analysis;
}

async function analyzeCombo(
  base: ClusterBase,
  combo: ClusterNotable[],
  sampleSize: SampleSize,
  divineToChaosRate: number,
  onProgress?: (update: AnalysisProgressUpdate) => void
): Promise<ClusterComboResult> {
  const comboNames = combo.map((entry) => entry.name);
  const handleRetryWait = (waitSeconds: number) => {
    onProgress?.({
      status: 'running',
      currentCombo: comboNames,
      waitSeconds,
    });
  };

  const searchResponse = await searchTrade(buildComboSearchQuery(base, combo), handleRetryWait);
  if (searchResponse.total === 0 || searchResponse.result.length === 0) {
    return {
      combo: comboNames,
      listingCount: 0,
      sampledListings: 0,
      medianChaos: null,
      averageChaos: null,
      medianDivines: null,
      averageDivines: null,
      lowestChaos: null,
    };
  }

  const itemIds = searchResponse.result.slice(0, sampleSize);
  const fetched = await fetchTradeItems(itemIds, searchResponse.id, handleRetryWait);
  const prices = await Promise.all(
    fetched.result
      .map((entry) => entry.listing?.price)
      .filter((price): price is NonNullable<typeof price> => Boolean(price))
      .map(async (price) => {
        const chaosEquivalent = await convertPriceToChaos(price.amount, price.currency);
        return chaosEquivalent;
      })
  );

  const validPrices = prices.filter((price): price is number => price !== null);
  if (validPrices.length === 0) {
    return {
      combo: comboNames,
      listingCount: searchResponse.total,
      sampledListings: 0,
      medianChaos: null,
      averageChaos: null,
      medianDivines: null,
      averageDivines: null,
      lowestChaos: null,
    };
  }

  const medianChaos = calculateMedian(validPrices);
  const averageChaos = calculateAverage(validPrices);
  const lowestChaos = Math.min(...validPrices);

  return {
    combo: comboNames,
    listingCount: searchResponse.total,
    sampledListings: validPrices.length,
    medianChaos: roundPrice(medianChaos),
    averageChaos: roundPrice(averageChaos),
    medianDivines: roundPrice(medianChaos / divineToChaosRate),
    averageDivines: roundPrice(averageChaos / divineToChaosRate),
    lowestChaos: roundPrice(lowestChaos),
  };
}

async function getClusterBaseDefinitions(): Promise<ClusterBase[]> {
  if (baseCache && baseCache.expiresAt > Date.now()) {
    return baseCache.value;
  }

  if (baseCachePromise) {
    return baseCachePromise;
  }

  baseCachePromise = buildClusterBaseDefinitions()
    .then((bases) => {
      baseCache = {
        expiresAt: Date.now() + BASE_DATA_TTL_MS,
        value: bases,
      };
      return bases;
    })
    .finally(() => {
      baseCachePromise = null;
    });

  return baseCachePromise;
}

async function buildClusterBaseDefinitions(): Promise<ClusterBase[]> {
  const [stats, clusterJewelsLua, clusterModsLua] = await Promise.all([
    getTradeStats(),
    rawHttp.get<string>(POB_CLUSTER_JEWELS_URL).then((response) => response.data),
    rawHttp.get<string>(POB_CLUSTER_MODS_URL).then((response) => response.data),
  ]);

  const baseOptions = getClusterBaseOptions(stats);
  const notableTradeIds = getClusterNotableTradeIds(stats);
  const baseDefinitions = parseClusterBaseDefinitions(clusterJewelsLua);
  const notableDefinitions = parseClusterNotableDefinitions(clusterModsLua, notableTradeIds);

  const bases = baseDefinitions
    .map<ClusterBase | null>((base) => {
      const tradeOption = baseOptions.get(base.tradeText);
      if (!tradeOption) {
        return null;
      }

      const notables = dedupeNotables(
        notableDefinitions
          .filter((notable) => notable.baseTags.includes(base.tag))
          .map((notable) => ({
            name: notable.name,
            tradeStatId: notable.tradeStatId,
          }))
      ).sort((left, right) => left.name.localeCompare(right.name));

      const maxComboSize: ComboSize = base.size === 'Large' && notables.length >= 3 ? 3 : 2;
      return {
        id: tradeOption.id,
        size: base.size,
        name: base.name,
        tag: base.tag,
        tradeText: tradeOption.text,
        notables,
        notableNames: notables.map((notable) => notable.name),
        notableCount: notables.length,
        maxComboSize,
        comboCounts: {
          2: calculateCombinationCount(notables.length, 2),
          3: maxComboSize === 3 ? calculateCombinationCount(notables.length, 3) : 0,
        },
        estimatedSeconds: {
          2: estimateAnalysisDurationSeconds(notables.length, 2),
          3: maxComboSize === 3 ? estimateAnalysisDurationSeconds(notables.length, 3) : 0,
        },
      };
    })
    .filter((base): base is ClusterBase => base !== null && base.notables.length >= 2)
    .sort((left, right) => {
      if (left.size !== right.size) {
        return left.size.localeCompare(right.size);
      }
      return left.name.localeCompare(right.name);
    });

  if (bases.length === 0) {
    throw new Error('Failed to build cluster jewel base data.');
  }

  return bases;
}

async function getTradeStats(): Promise<TradeStatsResponse> {
  const response = await limiter.run(() => poeHttp.get<TradeStatsResponse>('/api/trade/data/stats'));
  return response.data;
}

async function searchTrade(
  query: unknown,
  onRetryWait?: (waitSeconds: number) => void
): Promise<TradeSearchResponse> {
  const response = await limiter.run(() =>
    poeHttp.post<TradeSearchResponse>(`/api/trade/search/${MIRAGE_LEAGUE}`, query)
  , onRetryWait);
  return response.data;
}

async function fetchTradeItems(
  ids: string[],
  queryId: string,
  onRetryWait?: (waitSeconds: number) => void
): Promise<TradeFetchResponse> {
  const response = await limiter.run(() =>
    poeHttp.get<TradeFetchResponse>(`/api/trade/fetch/${ids.join(',')}`, {
      params: { query: queryId },
    })
  , onRetryWait);
  return response.data;
}

async function getChaosRateForCurrency(
  currency: string,
  onRetryWait?: (waitSeconds: number) => void
): Promise<number> {
  if (currency === 'chaos') {
    return 1;
  }

  const cachedRate = currencyRateCache.get(currency);
  if (cachedRate && cachedRate.expiresAt > Date.now()) {
    return cachedRate.value;
  }

  const payload = {
    exchange: {
      status: {
        option: 'online',
      },
      have: ['chaos'],
      want: [currency],
    },
  };

  const response = await limiter.run(() =>
    poeHttp.post<TradeExchangeResponse>(`/api/trade/exchange/${MIRAGE_LEAGUE}`, payload)
  , onRetryWait);

  const rates = Object.values(response.data.result)
    .map((entry) => entry.listing?.offers?.[0])
    .filter((offer): offer is NonNullable<typeof offer> => Boolean(offer))
    .map((offer) => {
      const exchangeAmount = offer.exchange?.amount ?? 0;
      const itemAmount = offer.item?.amount ?? 0;
      return itemAmount > 0 ? exchangeAmount / itemAmount : 0;
    })
    .filter((rate) => rate > 0)
    .slice(0, 10);

  if (rates.length === 0) {
    throw new Error(`Unable to resolve a chaos exchange rate for ${currency}.`);
  }

  const rate = calculateMedian(rates);
  currencyRateCache.set(currency, {
    expiresAt: Date.now() + CURRENCY_RATE_TTL_MS,
    value: rate,
  });
  return rate;
}

async function convertPriceToChaos(amount: number, currency: string): Promise<number | null> {
  try {
    const rate = await getChaosRateForCurrency(currency);
    return amount * rate;
  } catch {
    return null;
  }
}

function parseClusterBaseDefinitions(luaSource: string): ClusterBaseDefinition[] {
  const sections: Array<{ size: ClusterSize; marker: string; endMarker: string }> = [
    {
      size: 'Medium',
      marker: '["Medium Cluster Jewel"] = {',
      endMarker: '["Large Cluster Jewel"] = {',
    },
    {
      size: 'Large',
      marker: '["Large Cluster Jewel"] = {',
      endMarker: '},\n\tnotableSortOrder = {',
    },
  ];

  const bases: ClusterBaseDefinition[] = [];

  for (const section of sections) {
    const startIndex = luaSource.indexOf(section.marker);
    const endIndex = luaSource.indexOf(section.endMarker);
    if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
      continue;
    }

    const sectionBody = luaSource.slice(startIndex, endIndex);
    const skillRegex = /\["([^"]+)"\]\s*=\s*\{([\s\S]*?)\n\t\t\t\t},/g;
    let match: RegExpExecArray | null;

    while ((match = skillRegex.exec(sectionBody)) !== null) {
      const block = match[2];
      const nameMatch = block.match(/name = "([^"]+)"/);
      const tagMatch = block.match(/tag = "([^"]+)"/);
      const enchantMatch = block.match(/enchant = \{([\s\S]*?)\n\s+\},/);

      if (!nameMatch || !tagMatch || !enchantMatch) {
        continue;
      }

      const enchantLines = extractQuotedStrings(enchantMatch[1])
        .map(normalizeClusterEnchantLine)
        .filter(Boolean);

      if (enchantLines.length === 0) {
        continue;
      }

      bases.push({
        key: match[1],
        size: section.size,
        name: nameMatch[1],
        tag: tagMatch[1],
        tradeText: enchantLines.join('\n'),
      });
    }
  }

  return bases;
}

function parseClusterNotableDefinitions(
  luaSource: string,
  tradeStatIdsByName: Map<string, string>
): ClusterNotableDefinition[] {
  return luaSource
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.includes('"1 Added Passive Skill is '))
    .map((line) => {
      const notableMatch = line.match(/"1 Added Passive Skill is ([^"]+)"/);
      const weightKeyMatch = line.match(/weightKey = \{([^}]*)\}/);
      if (!notableMatch || !weightKeyMatch) {
        return null;
      }

      const name = notableMatch[1];
      const tradeStatId = tradeStatIdsByName.get(name);
      if (!tradeStatId) {
        return null;
      }

      const baseTags = extractQuotedStrings(weightKeyMatch[1]).filter(
        (value) => value.startsWith('affliction_') && !value.startsWith('old_do_not_use_')
      );
      if (baseTags.length === 0) {
        return null;
      }

      return {
        name,
        tradeStatId,
        baseTags,
      };
    })
    .filter((entry): entry is ClusterNotableDefinition => Boolean(entry));
}

function getClusterBaseOptions(stats: TradeStatsResponse): Map<string, TradeStatOption> {
  const enchantGroup = stats.result.find((group) => group.label === 'Enchant');
  const baseEntry = enchantGroup?.entries.find((entry) => entry.id === 'enchant.stat_3948993189');
  const options = baseEntry?.option?.options ?? [];

  return new Map(options.map((option) => [normalizeTradeOptionText(option.text), option]));
}

function getClusterNotableTradeIds(stats: TradeStatsResponse): Map<string, string> {
  const explicitGroup = stats.result.find((group) => group.label === 'Explicit');
  const notableEntries = explicitGroup?.entries.filter((entry) =>
    entry.text.startsWith('1 Added Passive Skill is ')
  );

  return new Map(
    (notableEntries ?? []).map((entry) => [
      entry.text.replace('1 Added Passive Skill is ', ''),
      entry.id,
    ])
  );
}

function buildComboSearchQuery(base: ClusterBase, combo: ClusterNotable[]) {
  return {
    query: {
      status: {
        option: 'any',
      },
      type: `${base.size} Cluster Jewel`,
      stats: [
        {
          type: 'and',
          filters: [
            {
              id: 'enchant.stat_3948993189',
              disabled: false,
              value: {
                option: base.id,
              },
            },
            ...combo.map((notable) => ({
              id: notable.tradeStatId,
              disabled: false,
            })),
          ],
          disabled: false,
        },
      ],
      filters: {
        type_filters: {
          filters: {
            category: {
              option: 'jewel.cluster',
            },
            rarity: {
              option: 'nonunique',
            },
          },
          disabled: false,
        },
        misc_filters: {
          filters: {
            corrupted: {
              option: 'false',
            },
            synthesised_item: {
              option: 'false',
            },
          },
          disabled: false,
        },
        trade_filters: {
          filters: {
            sale_type: {
              option: 'priced',
            },
          },
          disabled: false,
        },
      },
    },
    sort: {
      price: 'asc',
    },
  };
}

function buildCombinations<T>(items: T[], size: ComboSize): T[][] {
  const results: T[][] = [];

  const walk = (start: number, current: T[]) => {
    if (current.length === size) {
      results.push([...current]);
      return;
    }

    for (let index = start; index < items.length; index += 1) {
      current.push(items[index]);
      walk(index + 1, current);
      current.pop();
    }
  };

  walk(0, []);
  return results;
}

function getAnalysisJobId(baseId: number, comboSize: ComboSize, sampleSize: SampleSize): string {
  return `${baseId}-${comboSize}-${sampleSize}`;
}

function normalizeSampleSize(sampleSize: SampleSize): number {
  if (!Number.isFinite(sampleSize)) {
    return MAX_SAMPLE_SIZE;
  }

  return Math.max(MIN_SAMPLE_SIZE, Math.min(MAX_SAMPLE_SIZE, Math.floor(sampleSize)));
}

async function getClusterBaseOrThrow(baseId: number, comboSize: ComboSize): Promise<ClusterBase> {
  const bases = await getClusterBaseDefinitions();
  const base = bases.find((entry) => entry.id === baseId);
  if (!base) {
    throw new Error('Unknown cluster base selected.');
  }

  if (comboSize > base.maxComboSize) {
    throw new Error(`${base.size} Cluster Jewels cannot roll ${comboSize} notables.`);
  }

  return base;
}

function buildCompletedAnalysisJob(
  jobId: string,
  analysis: ClusterComboAnalysis
): ClusterComboAnalysisJob {
  const completedAt = new Date().toISOString();
  return {
    jobId,
    base: analysis.base,
    comboSize: analysis.comboSize,
    sampleSize: analysis.sampleSize,
    status: 'completed',
    progress: {
      totalCombos: analysis.results.length,
      completedCombos: analysis.results.length,
      percentComplete: 100,
      currentCombo: null,
      waitSeconds: null,
      estimatedSeconds: analysis.base.estimatedSeconds[analysis.comboSize],
      startedAt: completedAt,
      updatedAt: completedAt,
    },
    result: analysis,
    error: null,
  };
}

function updateAnalysisJob(jobId: string, update: AnalysisProgressUpdate): void {
  const existingJob = analysisJobCache.get(jobId);
  if (!existingJob) {
    return;
  }

  const totalCombos = update.totalCombos ?? existingJob.progress.totalCombos;
  const completedCombos = update.completedCombos ?? existingJob.progress.completedCombos;
  const percentComplete =
    totalCombos === 0 ? 100 : Math.min(100, Math.round((completedCombos / totalCombos) * 100));

  analysisJobCache.set(jobId, {
    ...existingJob,
    status: update.status ?? existingJob.status,
    progress: {
      ...existingJob.progress,
      totalCombos,
      completedCombos,
      percentComplete,
      currentCombo:
        update.currentCombo === undefined ? existingJob.progress.currentCombo : update.currentCombo,
      waitSeconds:
        update.waitSeconds === undefined ? existingJob.progress.waitSeconds : update.waitSeconds,
      estimatedSeconds: update.estimatedSeconds ?? existingJob.progress.estimatedSeconds,
      updatedAt: new Date().toISOString(),
    },
  });
}

function toBaseSummary(base: ClusterBase): ClusterBaseSummary {
  return {
    id: base.id,
    size: base.size,
    name: base.name,
    tag: base.tag,
    tradeText: base.tradeText,
    notableNames: base.notableNames,
    notableCount: base.notableCount,
    maxComboSize: base.maxComboSize,
    comboCounts: base.comboCounts,
    estimatedSeconds: base.estimatedSeconds,
  };
}

function dedupeNotables(notables: ClusterNotable[]): ClusterNotable[] {
  const byName = new Map<string, ClusterNotable>();
  for (const notable of notables) {
    byName.set(notable.name, notable);
  }
  return [...byName.values()];
}

function calculateCombinationCount(total: number, choose: number): number {
  if (choose > total) {
    return 0;
  }

  if (choose === 2) {
    return (total * (total - 1)) / 2;
  }

  if (choose === 3) {
    return (total * (total - 1) * (total - 2)) / 6;
  }

  return 0;
}

function estimateAnalysisDurationSeconds(totalNotables: number, comboSize: ComboSize): number {
  const combos = calculateCombinationCount(totalNotables, comboSize);
  const requestsPerCombo = 2;
  const startupRequests = 2;
  const bufferSeconds = 60;
  return Math.ceil(
    ((combos * requestsPerCombo + startupRequests) * POE_REQUEST_INTERVAL_MS) / 1000 + bufferSeconds
  );
}

function calculateAverage(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function calculateMedian(values: number[]): number {
  const sorted = values.slice().sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle];
}

function compareComboResults(left: ClusterComboResult, right: ClusterComboResult): number {
  if (left.medianChaos === null && right.medianChaos === null) {
    return left.combo.join(', ').localeCompare(right.combo.join(', '));
  }

  if (left.medianChaos === null) {
    return 1;
  }

  if (right.medianChaos === null) {
    return -1;
  }

  if (left.medianChaos !== right.medianChaos) {
    return left.medianChaos - right.medianChaos;
  }

  if (left.averageChaos !== null && right.averageChaos !== null && left.averageChaos !== right.averageChaos) {
    return left.averageChaos - right.averageChaos;
  }

  return left.combo.join(', ').localeCompare(right.combo.join(', '));
}

function normalizeTradeOptionText(value: string): string {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n');
}

function normalizeClusterEnchantLine(value: string): string {
  return value.replace(/^Added Small Passive Skills grant:\s*/, '').trim();
}

function extractQuotedStrings(value: string): string[] {
  return [...value.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
}

function roundPrice(value: number): number {
  return Math.round(value * 100) / 100;
}

function getRetryDelayMs(error: unknown): number | null {
  if (!axios.isAxiosError(error) || error.response?.status !== 429) {
    return null;
  }

  const message =
    error.response?.data?.details?.error?.message ??
    error.response?.data?.error?.message ??
    error.message;

  const secondsMatch = String(message).match(/(\d+)\s*seconds?/i);
  if (secondsMatch) {
    return (parseInt(secondsMatch[1], 10) + 1) * 1000;
  }

  return 61000;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}
