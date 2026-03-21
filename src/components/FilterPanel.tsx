import React from 'react';
import { useClusterJewelStore } from '../store/clusterJewelStore';

export const FilterPanel: React.FC = () => {
  const filters = useClusterJewelStore((state) => state.filters);
  const setFilters = useClusterJewelStore((state) => state.setFilters);
  const availableJewelTypes = useClusterJewelStore((state) => state.availableJewelTypes);

  const handleJewelTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters({ jewelType: e.target.value || null });
  };

  const handlePriceMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 0;
    setFilters({ priceMin: value });
  };

  const handlePriceMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value ? parseInt(e.target.value) : null;
    setFilters({ priceMax: value });
  };

  const handleIlvlMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 0;
    setFilters({ ilvlMin: value });
  };

  const handleIlvlMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 86;
    setFilters({ ilvlMax: value });
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-6">
      <h2 className="text-xl font-bold text-gray-900">Filters</h2>

      {/* Jewel Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Cluster Type</label>
        <select
          value={filters.jewelType || ''}
          onChange={handleJewelTypeChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Types</option>
          {availableJewelTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      {/* Price Range */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Price Range (Chaos)</label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <input
              type="number"
              min="0"
              value={filters.priceMin}
              onChange={handlePriceMinChange}
              placeholder="Min"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <input
              type="number"
              min="0"
              value={filters.priceMax || ''}
              onChange={handlePriceMaxChange}
              placeholder="Max (no limit)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Item Level Range */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Item Level: {filters.ilvlMin} - {filters.ilvlMax}
        </label>
        <div className="space-y-3">
          <div>
            <input
              type="range"
              min="1"
              max="86"
              value={filters.ilvlMin}
              onChange={handleIlvlMinChange}
              className="w-full"
            />
            <div className="text-xs text-gray-500 mt-1">Min: {filters.ilvlMin}</div>
          </div>
          <div>
            <input
              type="range"
              min="1"
              max="86"
              value={filters.ilvlMax}
              onChange={handleIlvlMaxChange}
              className="w-full"
            />
            <div className="text-xs text-gray-500 mt-1">Max: {filters.ilvlMax}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterPanel;
