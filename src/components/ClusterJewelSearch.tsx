import React, { useEffect, useState } from 'react';
import { poeAPI } from '../services/api';
import {
  ClusterBaseSummary,
  ClusterComboAnalysis,
  ClusterComboAnalysisJob,
  ClusterComboResult,
  ComboSize,
} from '../types/cluster-jewel';

type SortColumn =
  | 'combo'
  | 'listingCount'
  | 'sampledListings'
  | 'medianChaos'
  | 'averageChaos'
  | 'medianDivines'
  | 'averageDivines'
  | 'lowestChaos';

type SortDirection = 'asc' | 'desc';

const panelClass =
  'rounded-3xl border border-[var(--border-soft)] bg-[var(--surface-card)] p-6 shadow-[var(--shadow-soft)] backdrop-blur-sm';
const fieldLabelClass =
  'text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]';
const inputClass =
  'w-full rounded-2xl border border-[var(--border-strong)] bg-[var(--input-bg)] px-4 py-3 text-base text-[var(--text-primary)] outline-none transition focus:ring-2 focus:ring-[var(--accent)]';
const badgeClass =
  'inline-flex items-center rounded-full border border-[var(--border-info)] bg-[var(--surface-info)] px-3 py-2 text-sm font-bold text-[var(--text-accent)]';

export const ClusterJewelSearch: React.FC = () => {
  const [bases, setBases] = useState<ClusterBaseSummary[]>([]);
  const [selectedBaseId, setSelectedBaseId] = useState<number | null>(null);
  const [comboSize, setComboSize] = useState<ComboSize>(2);
  const [sampleSize, setSampleSize] = useState(10);
  const [analysis, setAnalysis] = useState<ClusterComboAnalysis | null>(null);
  const [analysisJob, setAnalysisJob] = useState<ClusterComboAnalysisJob | null>(null);
  const [isLoadingBases, setIsLoadingBases] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<SortColumn>('medianChaos');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  useEffect(() => {
    let isCancelled = false;

    const loadBases = async () => {
      try {
        setIsLoadingBases(true);
        setError(null);
        const loadedBases = await poeAPI.getClusterBases();

        if (isCancelled) {
          return;
        }

        setBases(loadedBases);
        setSelectedBaseId((currentValue) => currentValue ?? loadedBases[0]?.id ?? null);
      } catch (err) {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load cluster jewel bases.');
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingBases(false);
        }
      }
    };

    void loadBases();

    return () => {
      isCancelled = true;
    };
  }, []);

  const selectedBase = bases.find((base) => base.id === selectedBaseId) ?? null;

  useEffect(() => {
    if (selectedBase && comboSize > selectedBase.maxComboSize) {
      setComboSize(selectedBase.maxComboSize);
    }
  }, [comboSize, selectedBase]);

  useEffect(() => {
    setAnalysis(null);
    setAnalysisJob(null);
    setIsAnalyzing(false);
  }, [selectedBaseId, comboSize, sampleSize]);

  useEffect(() => {
    if (!analysisJob || (analysisJob.status !== 'queued' && analysisJob.status !== 'running')) {
      return;
    }

    let isCancelled = false;

    const pollAnalysisJob = async () => {
      try {
        const nextJob = await poeAPI.getClusterBaseAnalysisJob(analysisJob.jobId);
        if (isCancelled) {
          return;
        }

        setAnalysisJob(nextJob);

        if (nextJob.status === 'completed' && nextJob.result) {
          setAnalysis(nextJob.result);
          setIsAnalyzing(false);
          return;
        }

        if (nextJob.status === 'failed') {
          setError(nextJob.error ?? 'Failed to analyze cluster jewel prices.');
          setIsAnalyzing(false);
        }
      } catch (err) {
        if (!isCancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to load cluster jewel analysis progress.'
          );
          setIsAnalyzing(false);
        }
      }
    };

    const intervalId = window.setInterval(() => {
      void pollAnalysisJob();
    }, 2500);

    void pollAnalysisJob();

    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
    };
  }, [analysisJob?.jobId, analysisJob?.status]);

  const largeBases = bases.filter((base) => base.size === 'Large');
  const mediumBases = bases.filter((base) => base.size === 'Medium');
  const results = analysis?.results ?? [];
  const sortedResults = sortResults(results, sortColumn, sortDirection);
  const pricedResults = results.filter((result) => result.medianChaos !== null);
  const progress = analysisJob?.progress ?? null;

  const handleAnalyze = async () => {
    if (!selectedBase) {
      return;
    }

    try {
      setIsAnalyzing(true);
      setError(null);
      setAnalysis(null);

      const nextJob = await poeAPI.startClusterBaseAnalysis(
        selectedBase.id,
        comboSize,
        sampleSize
      );

      setAnalysisJob(nextJob);

      if (nextJob.status === 'completed' && nextJob.result) {
        setAnalysis(nextJob.result);
        setIsAnalyzing(false);
        return;
      }

      if (nextJob.status === 'failed') {
        setError(nextJob.error ?? 'Failed to analyze cluster jewel prices.');
        setIsAnalyzing(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze cluster jewel prices.');
      setIsAnalyzing(false);
    }
  };

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((currentDirection) => (currentDirection === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortColumn(column);
    setSortDirection(column === 'combo' ? 'asc' : 'desc');
  };

  return (
    <div className="grid gap-6">
      <section className={`${panelClass} overflow-hidden`}>
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-accent)]">
            Mirage Combo Pricing
          </p>
          <h2 className="text-3xl font-bold leading-tight text-[var(--text-primary)]">
            Discover possible combos for your cluster jewel
          </h2>
          <p className="max-w-3xl text-base leading-7 text-[var(--text-secondary)]">
            The app loads every unique notable that can appear on the selected base, searches each
            valid 2- or 3-notable combination on trade, and summarizes the value using chaos
            equivalents.
          </p>
        </div>
      </section>

      {error && (
        <section
          className="rounded-3xl border border-[var(--border-danger)] bg-[var(--surface-danger)] p-6 shadow-[var(--shadow-soft)]"
          role="alert"
        >
          <h3 className="text-lg font-semibold text-[var(--text-danger-strong)]">Request failed</h3>
          <p className="mt-2 text-[var(--text-danger)]">{error}</p>
          <p className="mt-3 text-sm text-[var(--text-danger)]">
            If the proxy is already running, restart it after pulling these changes so the latest
            analysis endpoints are available.
          </p>
        </section>
      )}

      <section className={panelClass}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="grid gap-2">
            <span className={fieldLabelClass}>Cluster base</span>
            <select
              value={selectedBaseId ?? ''}
              onChange={(event) => setSelectedBaseId(Number(event.target.value))}
              disabled={isLoadingBases || bases.length === 0}
              className={inputClass}
            >
              {bases.length === 0 && <option value="">Loading bases...</option>}
              {largeBases.length > 0 && (
                <optgroup label="Large Cluster Jewels">
                  {largeBases.map((base) => (
                    <option key={base.id} value={base.id}>
                      {base.name}
                    </option>
                  ))}
                </optgroup>
              )}
              {mediumBases.length > 0 && (
                <optgroup label="Medium Cluster Jewels">
                  {mediumBases.map((base) => (
                    <option key={base.id} value={base.id}>
                      {base.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </label>

          <label className="grid gap-2">
            <span className={fieldLabelClass}>Combo size</span>
            <select
              value={comboSize}
              onChange={(event) => setComboSize(Number(event.target.value) as ComboSize)}
              disabled={!selectedBase || isLoadingBases}
              className={inputClass}
            >
              <option value={2}>2 notable combos</option>
              {selectedBase?.maxComboSize === 3 && <option value={3}>3 notable combos</option>}
            </select>
          </label>

          <label className="grid gap-2">
            <span className={fieldLabelClass}>Sample size</span>
            <div className="rounded-2xl border border-[var(--border-strong)] bg-[var(--input-bg)] px-4 py-3">
              <div className="mb-3 flex items-baseline justify-between gap-4 text-sm text-[var(--text-secondary)]">
                <strong className="text-lg text-[var(--text-primary)]">{sampleSize}</strong>
                <span>cheapest listings per combo</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={sampleSize}
                onChange={(event) => setSampleSize(Number(event.target.value))}
                disabled={isAnalyzing}
                className="w-full accent-[var(--accent)]"
              />
              <div className="mt-2 flex justify-between text-xs text-[var(--text-muted)]">
                <span>1</span>
                <span>10</span>
              </div>
            </div>
          </label>

          <div className="grid gap-2">
            <span className={fieldLabelClass}>Run analysis</span>
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={!selectedBase || isLoadingBases || isAnalyzing}
              className="w-full rounded-2xl bg-[var(--accent)] px-5 py-3 text-base font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isAnalyzing ? 'Analyzing...' : 'Analyze prices'}
            </button>
          </div>
        </div>
      </section>

      {selectedBase ? (
        <>
          <section className={panelClass}>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Selected base" value={selectedBase.name} detail={selectedBase.size} />
              <MetricCard
                label="Unique notables"
                value={String(selectedBase.notableCount)}
                detail="discovered for this base"
              />
              <MetricCard
                label="Combos to search"
                value={String(selectedBase.comboCounts[comboSize])}
                detail={`${comboSize}-notable combinations`}
              />
              <MetricCard
                label="Estimated time"
                value={formatDuration(selectedBase.estimatedSeconds[comboSize])}
                detail="rate-limited against trade"
              />
            </div>
            <p className="mt-4 text-sm leading-6 text-[var(--text-muted)]">
              Prices are sampled from up to {sampleSize} of the cheapest priced listings per combo,
              then converted into chaos using the current divine exchange rate. Large 3-notable scans
              can exceed the estimate when trade slows down.
            </p>
          </section>

          <section className={panelClass}>
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                  Available notables
                </h3>
                <p className="mt-1 text-[var(--text-secondary)]">
                  Every unique notable discovered for the {selectedBase.name} base.
                </p>
              </div>
              <span className={badgeClass}>{selectedBase.notableCount} total</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              {selectedBase.notableNames.map((notableName) => (
                <span
                  key={notableName}
                  className="inline-flex items-center rounded-full border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)]"
                >
                  {notableName}
                </span>
              ))}
            </div>
          </section>
        </>
      ) : (
        <section className={`${panelClass} text-center text-[var(--text-muted)]`}>
          <p>No cluster bases are available yet.</p>
        </section>
      )}

      {isAnalyzing && selectedBase && progress && (
        <section className={panelClass}>
          <div className="flex items-center gap-4">
            <div
              aria-hidden="true"
              className="h-10 w-10 animate-spin rounded-full border-[3px] border-[var(--spinner-track)] border-t-[var(--accent)]"
            />
            <div className="grid gap-1">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                Running the market scan
              </h3>
              <p className="text-[var(--text-secondary)]">
                {progress.completedCombos} of {progress.totalCombos} combinations checked on Mirage.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            <div className="flex flex-col gap-1 text-sm font-semibold text-[var(--text-secondary)] sm:flex-row sm:items-center sm:justify-between">
              <span>{progress.percentComplete}% complete</span>
              <span>Estimated total: {formatDuration(progress.estimatedSeconds)}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full border border-[var(--border-soft)] bg-[var(--surface-subtle)]">
              <div
                className="h-full rounded-full bg-[linear-gradient(135deg,var(--accent),var(--accent-hover))] transition-[width] duration-300"
                style={{ width: `${progress.percentComplete}%` }}
              />
            </div>
            {progress.waitSeconds !== null && (
              <p className="text-sm leading-6 text-[var(--text-muted)]">
                Waiting {formatDuration(progress.waitSeconds)} for the PoE trade rate limit to clear.
              </p>
            )}
            <p className="text-sm leading-6 text-[var(--text-muted)]">
              {progress.currentCombo
                ? `Current combo: ${progress.currentCombo.join(', ')}`
                : 'Preparing the next combo...'}
            </p>
          </div>
        </section>
      )}

      {analysis && (
        <>
          <section className={panelClass}>
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                  {analysis.base.name} {analysis.comboSize}-notable results
                </h3>
                <p className="mt-1 text-[var(--text-secondary)]">
                  {pricedResults.length} of {analysis.results.length} combinations had priced listings.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <span className={badgeClass}>
                  Sampling {analysis.sampleSize} cheapest listing
                  {analysis.sampleSize === 1 ? '' : 's'}
                </span>
                <span className={badgeClass}>
                  Divine rate: {formatNumber(analysis.divineToChaosRate)} chaos
                </span>
                <span className={badgeClass}>
                  Mirage {analysis.base.size.toLowerCase()} cluster jewel
                </span>
              </div>
            </div>
          </section>

          <section className={panelClass}>
            {analysis.results.length === 0 ? (
              <div className="text-center text-[var(--text-muted)]">
                <p>No combinations were available for this request.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border-soft)]">
                      <SortHeader
                        label="Combo"
                        column="combo"
                        activeColumn={sortColumn}
                        direction={sortDirection}
                        onSort={handleSort}
                      />
                      <SortHeader
                        label="Listings"
                        column="listingCount"
                        activeColumn={sortColumn}
                        direction={sortDirection}
                        onSort={handleSort}
                      />
                      <SortHeader
                        label="Sampled"
                        column="sampledListings"
                        activeColumn={sortColumn}
                        direction={sortDirection}
                        onSort={handleSort}
                      />
                      <SortHeader
                        label="Median chaos"
                        column="medianChaos"
                        activeColumn={sortColumn}
                        direction={sortDirection}
                        onSort={handleSort}
                      />
                      <SortHeader
                        label="Average chaos"
                        column="averageChaos"
                        activeColumn={sortColumn}
                        direction={sortDirection}
                        onSort={handleSort}
                      />
                      <SortHeader
                        label="Median div"
                        column="medianDivines"
                        activeColumn={sortColumn}
                        direction={sortDirection}
                        onSort={handleSort}
                      />
                      <SortHeader
                        label="Average div"
                        column="averageDivines"
                        activeColumn={sortColumn}
                        direction={sortDirection}
                        onSort={handleSort}
                      />
                      <SortHeader
                        label="Lowest chaos"
                        column="lowestChaos"
                        activeColumn={sortColumn}
                        direction={sortDirection}
                        onSort={handleSort}
                      />
                    </tr>
                  </thead>
                  <tbody>
                    {sortedResults.map((result) => (
                      <ComboRow key={result.combo.join('|')} result={result} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
};

interface MetricCardProps {
  label: string;
  value: string;
  detail: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, detail }) => (
  <div className="grid gap-1 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] p-4">
    <span className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
      {label}
    </span>
    <strong className="text-xl font-semibold leading-tight text-[var(--text-primary)]">
      {value}
    </strong>
    <span className="text-sm text-[var(--text-secondary)]">{detail}</span>
  </div>
);

interface SortHeaderProps {
  label: string;
  column: SortColumn;
  activeColumn: SortColumn;
  direction: SortDirection;
  onSort: (column: SortColumn) => void;
}

const SortHeader: React.FC<SortHeaderProps> = ({
  label,
  column,
  activeColumn,
  direction,
  onSort,
}) => {
  const isActive = activeColumn === column;
  const arrow = !isActive ? '↕' : direction === 'asc' ? '↑' : '↓';

  return (
    <th scope="col" className="p-0 text-left">
      <button
        type="button"
        className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-[0.78rem] font-bold uppercase tracking-[0.08em] transition ${
          isActive
            ? 'text-[var(--text-accent)]'
            : 'text-[var(--text-muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)]'
        }`}
        onClick={() => onSort(column)}
      >
        <span>{label}</span>
        <span aria-hidden="true" className="text-sm tracking-normal">
          {arrow}
        </span>
      </button>
    </th>
  );
};

interface ComboRowProps {
  result: ClusterComboResult;
}

const ComboRow: React.FC<ComboRowProps> = ({ result }) => {
  const isMissingPrice = result.medianChaos === null;

  return (
    <tr className="border-b border-[var(--border-soft)] last:border-b-0">
      <td
        className={`px-4 py-4 align-top font-semibold ${
          isMissingPrice ? 'text-[var(--text-muted)]' : 'text-[var(--text-primary)]'
        }`}
      >
        {result.combo.join(', ')}
      </td>
      <TableCell value={String(result.listingCount)} muted={isMissingPrice} />
      <TableCell value={String(result.sampledListings)} muted={isMissingPrice} />
      <TableCell value={formatPrice(result.medianChaos)} muted={isMissingPrice} />
      <TableCell value={formatPrice(result.averageChaos)} muted={isMissingPrice} />
      <TableCell value={formatPrice(result.medianDivines)} muted={isMissingPrice} />
      <TableCell value={formatPrice(result.averageDivines)} muted={isMissingPrice} />
      <TableCell value={formatPrice(result.lowestChaos)} muted={isMissingPrice} />
    </tr>
  );
};

interface TableCellProps {
  value: string;
  muted: boolean;
}

const TableCell: React.FC<TableCellProps> = ({ value, muted }) => (
  <td
    className={`px-4 py-4 align-top ${
      muted ? 'text-[var(--text-muted)]' : 'text-[var(--text-secondary)]'
    }`}
  >
    {value}
  </td>
);

function formatDuration(totalSeconds: number): string {
  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }

  const totalMinutes = Math.ceil(totalSeconds / 60);
  if (totalMinutes < 60) {
    return `${totalMinutes}m`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

function formatPrice(value: number | null): string {
  if (value === null) {
    return 'No price';
  }

  return formatNumber(value);
}

function formatNumber(value: number): string {
  if (value >= 1000) {
    return value.toFixed(0);
  }

  if (value >= 100) {
    return value.toFixed(1);
  }

  return value.toFixed(2);
}

function sortResults(
  results: ClusterComboResult[],
  sortColumn: SortColumn,
  sortDirection: SortDirection
): ClusterComboResult[] {
  const sorted = [...results];

  sorted.sort((left, right) => {
    let comparison = 0;

    if (sortColumn === 'combo') {
      comparison = left.combo.join(', ').localeCompare(right.combo.join(', '));
    } else if (sortColumn === 'listingCount') {
      comparison = compareNumbers(left.listingCount, right.listingCount, sortDirection);
    } else if (sortColumn === 'sampledListings') {
      comparison = compareNumbers(left.sampledListings, right.sampledListings, sortDirection);
    } else if (sortColumn === 'medianChaos') {
      comparison = compareNullableNumbers(left.medianChaos, right.medianChaos, sortDirection);
    } else if (sortColumn === 'averageChaos') {
      comparison = compareNullableNumbers(left.averageChaos, right.averageChaos, sortDirection);
    } else if (sortColumn === 'medianDivines') {
      comparison = compareNullableNumbers(left.medianDivines, right.medianDivines, sortDirection);
    } else if (sortColumn === 'averageDivines') {
      comparison = compareNullableNumbers(left.averageDivines, right.averageDivines, sortDirection);
    } else if (sortColumn === 'lowestChaos') {
      comparison = compareNullableNumbers(left.lowestChaos, right.lowestChaos, sortDirection);
    }

    if (comparison !== 0) {
      return comparison;
    }

    return left.combo.join(', ').localeCompare(right.combo.join(', '));
  });

  return sorted;
}

function compareNumbers(left: number, right: number, direction: SortDirection): number {
  return direction === 'asc' ? left - right : right - left;
}

function compareNullableNumbers(
  left: number | null,
  right: number | null,
  direction: SortDirection
): number {
  if (left === null && right === null) {
    return 0;
  }

  if (left === null) {
    return 1;
  }

  if (right === null) {
    return -1;
  }

  return compareNumbers(left, right, direction);
}

export default ClusterJewelSearch;
