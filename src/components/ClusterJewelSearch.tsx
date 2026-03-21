import React, { useState, useCallback } from 'react';
import { useClusterJewelStore } from '../store/clusterJewelStore';
import { poeAPI } from '../services/api';
import { SearchQuery } from '../types/poe-api';

// The predefined search query for cluster jewels
const clusterJewelSearchQuery: SearchQuery = {
  query: {
    status: {
      option: 'any',
    },
    stats: [
      {
        type: 'and',
        filters: [],
        disabled: false,
      },
      {
        type: 'and',
        filters: [
          {
            id: 'enchant.stat_3086156145',
            disabled: false,
            value: {
              min: 4,
              max: 5,
            },
          },
          {
            id: 'enchant.stat_4079888060',
            disabled: false,
          },
          {
            id: 'enchant.stat_3948993189',
            disabled: false,
            value: {
              option: 30,
            },
          },
          {
            id: 'explicit.stat_1424794574',
            disabled: true,
          },
        ],
        disabled: false,
      },
      {
        type: 'count',
        filters: [
          {
            id: 'explicit.stat_2337273077',
            disabled: true,
          },
          {
            id: 'explicit.stat_3467711950',
            disabled: true,
          },
          {
            id: 'explicit.stat_383245807',
            disabled: true,
          },
        ],
        disabled: false,
        value: {
          min: 1,
        },
      },
    ],
    filters: {
      misc_filters: {
        filters: {
          ilvl: {
            min: 75,
            max: 83,
          },
          veiled: {
            option: 'false',
          },
          corrupted: {
            option: 'false',
          },
          synthesised_item: {
            option: 'false',
          },
        },
        disabled: false,
      },
      type_filters: {
        filters: {
          rarity: {
            option: 'nonunique',
          },
          category: {
            option: 'jewel.cluster',
          },
        },
        disabled: false,
      },
      trade_filters: {
        filters: {
          fee: {
            min: 1,
            max: null,
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

export const ClusterJewelSearch: React.FC = () => {
  const setLoading = useClusterJewelStore((state) => state.setLoading);
  const setResults = useClusterJewelStore((state) => state.setResults);
  const setError = useClusterJewelStore((state) => state.setError);
  const error = useClusterJewelStore((state) => state.error);
  const clearError = useClusterJewelStore((state) => state.clearError);
  const [searchLimit, setSearchLimit] = useState(20);

  const handleSearch = useCallback(async () => {
    try {
      clearError();
      setLoading(true);

      const searchResults = await poeAPI.executeFullSearch(
        clusterJewelSearchQuery,
        searchLimit
      );

      setResults(searchResults, searchResults.length, '');
      
      // Extract and set available jewel types from results
      const types = Array.from(
        new Set(searchResults.map((r) => r.typeLine))
      ).sort();
      useClusterJewelStore.setState({ availableJewelTypes: types });

      console.log(`Loaded ${searchResults.length} cluster jewels`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to search';
      setError(message);
      console.error('Search error:', err);
    }
  }, [searchLimit, setLoading, setResults, setError, clearError]);

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-4">
      <h1 className="text-3xl font-bold text-gray-900">PoE Cluster Jewel Price Search</h1>
      
      <p className="text-gray-600">
        Search for cluster jewels on the Path of Exile trade API with advanced filtering options.
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-red-800">Error</h3>
            <p className="text-red-700 text-sm mt-1">{error}</p>
            <p className="text-red-600 text-xs mt-2">
              Make sure the proxy server is running: <code className="bg-red-100 px-2 py-1 rounded">npm run server</code>
            </p>
          </div>
          <button
            onClick={clearError}
            className="text-red-700 hover:text-red-900 font-semibold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Results Limit
          </label>
          <input
            type="number"
            min="1"
            max="100"
            value={searchLimit}
            onChange={(e) => setSearchLimit(Math.min(100, Math.max(1, parseInt(e.target.value) || 20)))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">Fetch up to this many items (1-100)</p>
        </div>

        <div className="flex items-end">
          <button
            onClick={handleSearch}
            className="w-full px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition-colors"
          >
            🔍 Search Cluster Jewels
          </button>
        </div>
      </div>

      <div className="text-sm text-gray-500 bg-blue-50 border border-blue-200 rounded p-3">
        <p>
          <strong>Note:</strong> Searching for non-unique cluster jewels with item level 75-83, sorted by price (ascending).
        </p>
      </div>
    </div>
  );
};

export default ClusterJewelSearch;
