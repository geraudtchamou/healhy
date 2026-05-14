import React, { useState } from 'react';

const MapOperations = ({ onFilterChange, onLayerChange, onExport }) => {
  const [operations, setOperations] = useState({
    cluster: true,
    heatmap: false,
    boundaries: false,
    labels: true,
    animations: true,
    fullscreen: false
  });

  const toggleOperation = (key) => {
    setOperations(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
    
    // Notify parent component
    if (onFilterChange) {
      onFilterChange(key, !operations[key]);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
      <h3 className="font-bold text-gray-800 mb-4">🗺️ Map Operations & Customization</h3>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Cluster Toggle */}
        <button
          onClick={() => toggleOperation('cluster')}
          className={`p-3 rounded-lg border-2 transition-all ${
            operations.cluster 
              ? 'border-blue-500 bg-blue-50 text-blue-700' 
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="text-2xl mb-1">🔵</div>
          <div className="text-xs font-medium">Clustering</div>
          <div className="text-xs opacity-75">{operations.cluster ? 'ON' : 'OFF'}</div>
        </button>

        {/* Heatmap Toggle */}
        <button
          onClick={() => toggleOperation('heatmap')}
          className={`p-3 rounded-lg border-2 transition-all ${
            operations.heatmap 
              ? 'border-red-500 bg-red-50 text-red-700' 
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="text-2xl mb-1">🔥</div>
          <div className="text-xs font-medium">Heatmap</div>
          <div className="text-xs opacity-75">{operations.heatmap ? 'ON' : 'OFF'}</div>
        </button>

        {/* Boundaries Toggle */}
        <button
          onClick={() => toggleOperation('boundaries')}
          className={`p-3 rounded-lg border-2 transition-all ${
            operations.boundaries 
              ? 'border-green-500 bg-green-50 text-green-700' 
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="text-2xl mb-1">🔲</div>
          <div className="text-xs font-medium">Boundaries</div>
          <div className="text-xs opacity-75">{operations.boundaries ? 'ON' : 'OFF'}</div>
        </button>

        {/* Labels Toggle */}
        <button
          onClick={() => toggleOperation('labels')}
          className={`p-3 rounded-lg border-2 transition-all ${
            operations.labels 
              ? 'border-purple-500 bg-purple-50 text-purple-700' 
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="text-2xl mb-1">🏷️</div>
          <div className="text-xs font-medium">Labels</div>
          <div className="text-xs opacity-75">{operations.labels ? 'ON' : 'OFF'}</div>
        </button>

        {/* Animations Toggle */}
        <button
          onClick={() => toggleOperation('animations')}
          className={`p-3 rounded-lg border-2 transition-all ${
            operations.animations 
              ? 'border-yellow-500 bg-yellow-50 text-yellow-700' 
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="text-2xl mb-1">✨</div>
          <div className="text-xs font-medium">Animations</div>
          <div className="text-xs opacity-75">{operations.animations ? 'ON' : 'OFF'}</div>
        </button>

        {/* Fullscreen Toggle */}
        <button
          onClick={() => toggleOperation('fullscreen')}
          className={`p-3 rounded-lg border-2 transition-all ${
            operations.fullscreen 
              ? 'border-indigo-500 bg-indigo-50 text-indigo-700' 
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="text-2xl mb-1">⛶</div>
          <div className="text-xs font-medium">Fullscreen</div>
          <div className="text-xs opacity-75">{operations.fullscreen ? 'ON' : 'OFF'}</div>
        </button>
      </div>

      {/* Quick Actions */}
      <div className="mt-4 flex flex-wrap gap-2">
        <button 
          onClick={() => onExport && onExport('png')}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
        >
          📷 Export as PNG
        </button>
        <button 
          onClick={() => onExport && onExport('pdf')}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
        >
          📄 Export as PDF
        </button>
        <button 
          onClick={() => onExport && onExport('geojson')}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
        >
          🌍 Export GeoJSON
        </button>
        <button 
          onClick={() => setOperations({
            cluster: true,
            heatmap: false,
            boundaries: false,
            labels: true,
            animations: true,
            fullscreen: false
          })}
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
        >
          🔄 Reset View
        </button>
      </div>

      {/* Active Operations Summary */}
      <div className="mt-3 text-xs text-gray-600">
        Active: {Object.entries(operations)
          .filter(([_, v]) => v)
          .map(([k]) => k.charAt(0).toUpperCase() + k.slice(1))
          .join(', ') || 'None'}
      </div>
    </div>
  );
};

export default MapOperations;
