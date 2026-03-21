import React from 'react';
import './App.css';
import ClusterJewelSearch from './components/ClusterJewelSearch';
import FilterPanel from './components/FilterPanel';
import ResultsTable from './components/ResultsTable';

function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Path of Exile Cluster Jewel Finder
          </h1>
          <p className="text-gray-600">
            Real-time price tracking and filtering for cluster jewels
          </p>
        </div>

        {/* Search Section */}
        <div className="mb-8">
          <ClusterJewelSearch />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar - Filters */}
          <div className="lg:col-span-1">
            <FilterPanel />
          </div>

          {/* Main - Results */}
          <div className="lg:col-span-3">
            <ResultsTable />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-gray-500 text-sm">
          <p>Data from Path of Exile Trade API • Updated in real-time</p>
        </div>
      </div>
    </div>
  );
}

export default App;
