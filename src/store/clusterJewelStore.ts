import { create } from 'zustand';
import { SearchResult, ClusterJewelFilters } from '../types/poe-api';

export interface ClusterJewelState {
  results: SearchResult[];
  isLoading: boolean;
  error: string | null;
  totalResults: number;
  currentQueryId: string | null;
  filters: ClusterJewelFilters;
  sortColumn: 'price' | 'ilvl' | 'name' | null;
  sortDirection: 'asc' | 'desc';
  availableJewelTypes: string[];
  setResults: (results: SearchResult[], total: number, queryId: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setFilters: (filters: Partial<ClusterJewelFilters>) => void;
  setSortColumn: (column: 'price' | 'ilvl' | 'name' | null, direction?: 'asc' | 'desc') => void;
  setAvailableJewelTypes: (types: string[]) => void;
  clearError: () => void;
  resetFilters: () => void;
  getFilteredResults: () => SearchResult[];
}

const defaultFilters: ClusterJewelFilters = {
  jewelType: null,
  priceMin: 0,
  priceMax: null,
  ilvlMin: 75,
  ilvlMax: 86,
  enabledStatFilters: [],
};

export const useClusterJewelStore = create<ClusterJewelState>((set, get) => ({
  results: [],
  isLoading: false,
  error: null,
  totalResults: 0,
  currentQueryId: null,
  filters: defaultFilters,
  sortColumn: 'price',
  sortDirection: 'asc',
  availableJewelTypes: [],

  setResults: (results, total, queryId) =>
    set({
      results,
      totalResults: total,
      currentQueryId: queryId,
      isLoading: false,
    }),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error, isLoading: false }),

  setFilters: (newFilters) =>
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    })),

  setSortColumn: (column, direction = 'asc') =>
    set((state) => ({
      sortColumn: column,
      sortDirection: state.sortColumn === column && state.sortDirection === 'asc' ? 'desc' : direction,
    })),

  setAvailableJewelTypes: (types) => set({ availableJewelTypes: types }),

  clearError: () => set({ error: null }),

  resetFilters: () => set({ filters: defaultFilters, sortColumn: 'price', sortDirection: 'asc' }),

  getFilteredResults: () => {
    const state = get();
    let filtered = [...state.results];

    // Apply filters
    const { jewelType, priceMin, priceMax, ilvlMin, ilvlMax } = state.filters;

    if (jewelType) {
      filtered = filtered.filter((r) => r.typeLine.includes(jewelType) || r.category === jewelType);
    }

    filtered = filtered.filter((r) => {
      if (r.priceAmount < priceMin) return false;
      if (priceMax !== null && r.priceAmount > priceMax) return false;
      return !(r.ilvl < ilvlMin || r.ilvl > ilvlMax);
    });

    // Apply sorting
    if (state.sortColumn) {
      filtered.sort((a, b) => {
        let aVal: number | string = 0;
        let bVal: number | string = 0;

        if (state.sortColumn === 'price') {
          aVal = a.priceAmount;
          bVal = b.priceAmount;
        } else if (state.sortColumn === 'ilvl') {
          aVal = a.ilvl;
          bVal = b.ilvl;
        } else if (state.sortColumn === 'name') {
          aVal = a.name;
          bVal = b.name;
        }

        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return state.sortDirection === 'asc'
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        }

        return state.sortDirection === 'asc'
          ? (aVal as number) - (bVal as number)
          : (bVal as number) - (aVal as number);
      });
    }

    return filtered;
  },
}));
