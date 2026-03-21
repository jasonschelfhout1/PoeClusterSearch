import React from 'react';
import { useClusterJewelStore } from '../store/clusterJewelStore';
import { SearchResult } from '../types/poe-api';

export const ResultsTable: React.FC = () => {
  const results = useClusterJewelStore((state) => state.getFilteredResults());
  const sortColumn = useClusterJewelStore((state) => state.sortColumn);
  const sortDirection = useClusterJewelStore((state) => state.sortDirection);
  const setSortColumn = useClusterJewelStore((state) => state.setSortColumn);
  const isLoading = useClusterJewelStore((state) => state.isLoading);
  const totalResults = useClusterJewelStore((state) => state.totalResults);

  const handleSortClick = (column: 'price' | 'ilvl' | 'name') => {
    setSortColumn(column);
  };

  const SortIndicator: React.FC<{ column: string }> = ({ column }) => {
    if (sortColumn !== column) return null;
    return (
      <span className="ml-1">
        {sortDirection === 'asc' ? '▲' : '▼'}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin">
          <div className="border-4 border-gray-300 border-t-blue-500 rounded-full h-12 w-12"></div>
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-gray-500 text-lg">No results found. Try adjusting your filters or search criteria.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <p className="text-sm font-medium text-gray-700">
          Showing {results.length} of {totalResults} results
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-100 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Type
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200"
                onClick={() => handleSortClick('ilvl')}
              >
                iLvl <SortIndicator column="ilvl" />
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200"
                onClick={() => handleSortClick('price')}
              >
                Price <SortIndicator column="price" />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Seller
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Listed
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {results.map((result: SearchResult) => (
              <tr key={result.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{result.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{result.typeLine}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{result.ilvl}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-600">
                  {result.priceAmount} {result.priceCurrency}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{result.seller}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      result.online
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {result.online ? 'Online' : 'Offline'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{result.listed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ResultsTable;
