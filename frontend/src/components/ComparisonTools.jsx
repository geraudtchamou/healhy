import React, { useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, ComposedChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Cell, ReferenceLine
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const ComparisonTools = ({ data }) => {
  const [comparisonMode, setComparisonMode] = useState('countries');
  const [selectedItems, setSelectedItems] = useState([]);
  const [metric, setMetric] = useState('confirmed');
  
  // Extract unique countries and diseases from data
  const countries = [...new Set(data?.cases?.map(c => c.country) || [])];
  const diseases = [...new Set(data?.cases?.map(c => c.disease_name) || [])];
  
  // Prepare comparison data
  const getComparisonData = () => {
    if (!data || !data.cases) return [];
    
    if (comparisonMode === 'countries') {
      // Group by country
      const grouped = {};
      data.cases.forEach(caseItem => {
        if (!grouped[caseItem.country]) {
          grouped[caseItem.country] = {
            name: caseItem.country,
            confirmed: 0,
            deaths: 0,
            recovered: 0,
            critical: 0
          };
        }
        grouped[caseItem.country].confirmed += 1;
        if (caseItem.severity === 'critical') grouped[caseItem.country].critical += 1;
        if (caseItem.severity === 'severe') grouped[caseItem.country].deaths += 1;
      });
      return Object.values(grouped).slice(0, 10); // Top 10
    } else if (comparisonMode === 'diseases') {
      // Group by disease
      const grouped = {};
      data.cases.forEach(caseItem => {
        if (!grouped[caseItem.disease_name]) {
          grouped[caseItem.disease_name] = {
            name: caseItem.disease_name,
            confirmed: 0,
            deaths: 0,
            recovered: 0,
            critical: 0
          };
        }
        grouped[caseItem.disease_name].confirmed += 1;
        if (caseItem.severity === 'critical') grouped[caseItem.disease_name].critical += 1;
      });
      return Object.values(grouped);
    } else if (comparisonMode === 'severity') {
      // Group by severity
      const grouped = { mild: 0, moderate: 0, severe: 0, critical: 0 };
      data.cases.forEach(caseItem => {
        grouped[caseItem.severity] = (grouped[caseItem.severity] || 0) + 1;
      });
      return [
        { name: 'Mild', value: grouped.mild },
        { name: 'Moderate', value: grouped.moderate },
        { name: 'Severe', value: grouped.severe },
        { name: 'Critical', value: grouped.critical }
      ];
    }
    return [];
  };

  const comparisonData = getComparisonData();

  const toggleSelection = (item) => {
    if (selectedItems.includes(item)) {
      setSelectedItems(selectedItems.filter(i => i !== item));
    } else {
      if (selectedItems.length < 5) {
        setSelectedItems([...selectedItems, item]);
      }
    }
  };

  const renderBarComparison = () => (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={comparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="name" 
          angle={-45} 
          textAnchor="end" 
          interval={0}
          height={80}
        />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="confirmed" fill="#0088FE" name="Total Cases" />
        <Bar dataKey="critical" fill="#FF8042" name="Critical" />
        <Bar dataKey="deaths" fill="#FF0000" name="Severe/Deaths" />
      </BarChart>
    </ResponsiveContainer>
  );

  const renderLineComparison = () => (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={comparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="name" 
          angle={-45} 
          textAnchor="end" 
          interval={0}
          height={80}
        />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="confirmed" stroke="#0088FE" strokeWidth={2} name="Total Cases" />
        <Line type="monotone" dataKey="critical" stroke="#FF8042" strokeWidth={2} name="Critical" />
        <Line type="monotone" dataKey="deaths" stroke="#FF0000" strokeWidth={2} name="Severe/Deaths" />
      </LineChart>
    </ResponsiveContainer>
  );

  const renderStackedArea = () => (
    <ResponsiveContainer width="100%" height={400}>
      <ComposedChart data={comparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="name" 
          angle={-45} 
          textAnchor="end" 
          interval={0}
          height={80}
        />
        <YAxis />
        <Tooltip />
        <Legend />
        <Area type="monotone" dataKey="confirmed" stackId="1" stroke="#0088FE" fill="#0088FE" fillOpacity={0.6} name="Total" />
        <Area type="monotone" dataKey="critical" stackId="1" stroke="#FF8042" fill="#FF8042" fillOpacity={0.6} name="Critical" />
        <Area type="monotone" dataKey="deaths" stackId="1" stroke="#FF0000" fill="#FF0000" fillOpacity={0.6} name="Severe" />
      </ComposedChart>
    </ResponsiveContainer>
  );

  const renderPercentageBar = () => {
    const percentageData = comparisonData.map(item => ({
      name: item.name,
      confirmed: item.confirmed,
      criticalPercent: item.confirmed > 0 ? ((item.critical / item.confirmed) * 100).toFixed(1) : 0,
      deathPercent: item.confirmed > 0 ? ((item.deaths / item.confirmed) * 100).toFixed(1) : 0
    }));

    return (
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={percentageData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="name" 
            angle={-45} 
            textAnchor="end" 
            interval={0}
            height={80}
          />
          <YAxis label={{ value: 'Percentage (%)', angle: -90, position: 'insideLeft' }} />
          <Tooltip />
          <Legend />
          <ReferenceLine y={100} stroke="#000" strokeDasharray="3 3" />
          <Bar dataKey="criticalPercent" fill="#FF8042" name="Critical %" />
          <Bar dataKey="deathPercent" fill="#FF0000" name="Severe/Death %" />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex flex-wrap gap-4 mb-6 items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">📊 Comparison Tools</h2>
        
        <div className="flex flex-wrap gap-3">
          {/* Mode Selector */}
          <select 
            value={comparisonMode} 
            onChange={(e) => setComparisonMode(e.target.value)}
            className="px-3 py-2 border rounded-md bg-white text-sm"
          >
            <option value="countries">Compare Countries</option>
            <option value="diseases">Compare Diseases</option>
            <option value="severity">Compare Severity Levels</option>
          </select>

          {/* Metric Selector */}
          <select 
            value={metric} 
            onChange={(e) => setMetric(e.target.value)}
            className="px-3 py-2 border rounded-md bg-white text-sm"
          >
            <option value="confirmed">Total Cases</option>
            <option value="critical">Critical Cases</option>
            <option value="deaths">Deaths/Severe</option>
          </select>

          {/* Chart Type */}
          <select 
            id="chartTypeSelect"
            className="px-3 py-2 border rounded-md bg-white text-sm chart-type-selector"
            defaultValue="bar"
          >
            <option value="bar">Bar Chart</option>
            <option value="line">Line Chart</option>
            <option value="area">Stacked Area</option>
            <option value="percentage">Percentage Bar</option>
          </select>
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-blue-600">Total Entities</p>
          <p className="text-2xl font-bold text-blue-800">{comparisonData.length}</p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg">
          <p className="text-sm text-red-600">Highest Count</p>
          <p className="text-2xl font-bold text-red-800">
            {comparisonData.length > 0 ? Math.max(...comparisonData.map(d => d.confirmed)) : 0}
          </p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <p className="text-sm text-green-600">Average Cases</p>
          <p className="text-2xl font-bold text-green-800">
            {comparisonData.length > 0 
              ? Math.round(comparisonData.reduce((sum, d) => sum + d.confirmed, 0) / comparisonData.length) 
              : 0}
          </p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <p className="text-sm text-purple-600">Critical Rate</p>
          <p className="text-2xl font-bold text-purple-800">
            {comparisonData.length > 0 
              ? ((comparisonData.reduce((sum, d) => sum + d.critical, 0) / 
                  comparisonData.reduce((sum, d) => sum + d.confirmed, 0)) * 100).toFixed(1)
              : 0}%
          </p>
        </div>
      </div>

      {/* Selection Guide */}
      <div className="mb-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
        <p className="text-sm text-yellow-800">
          💡 <strong>Tip:</strong> Select up to 5 items to compare side-by-side. 
          Current selection: <strong>{selectedItems.length}/5</strong>
        </p>
      </div>

      {/* Item Selection Chips */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(comparisonMode === 'countries' ? countries : diseases).slice(0, 15).map(item => (
          <button
            key={item}
            onClick={() => toggleSelection(item)}
            className={`px-3 py-1 rounded-full text-sm transition-colors ${
              selectedItems.includes(item)
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {item} {selectedItems.includes(item) && '✓'}
          </button>
        ))}
      </div>

      {/* Chart Render based on dropdown */}
      <div className="chart-render-area">
        <div id="bar-chart" className="chart-view">
          {renderBarComparison()}
        </div>
        <div id="line-chart" className="chart-view hidden">
          {renderLineComparison()}
        </div>
        <div id="area-chart" className="chart-view hidden">
          {renderStackedArea()}
        </div>
        <div id="percentage-chart" className="chart-view hidden">
          {renderPercentageBar()}
        </div>
      </div>

      {/* Data Table */}
      <div className="mt-8">
        <h3 className="font-semibold text-gray-800 mb-3">Detailed Comparison Table</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Cases</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Critical</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Critical %</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {comparisonData
                .sort((a, b) => b.confirmed - a.confirmed)
                .map((item, index) => (
                <tr key={item.name} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">#{index + 1}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{item.confirmed}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-red-600">{item.critical}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      item.confirmed > 0 && (item.critical / item.confirmed) > 0.2
                        ? 'bg-red-100 text-red-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {item.confirmed > 0 ? ((item.critical / item.confirmed) * 100).toFixed(1) : 0}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ComparisonTools;
