import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceLine, ComposedChart, ScatterChart, Scatter, ZAxis
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FF6B6B'];

const AdvancedCharts = ({ data }) => {
  const [chartType, setChartType] = useState('comparison');
  const [selectedMetrics, setSelectedMetrics] = useState(['confirmed', 'deaths', 'recovered']);
  const [timeRange, setTimeRange] = useState('30');
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    if (data && data.trends) {
      // Process data for charts
      const processed = data.trends.slice(-parseInt(timeRange)).map(item => ({
        ...item,
        date: new Date(item.date).toLocaleDateString(),
        confirmed: item.confirmed || 0,
        deaths: item.deaths || 0,
        recovered: item.recovered || 0,
        critical: item.critical || 0,
        newCases: item.newCases || 0
      }));
      setChartData(processed);
    }
  }, [data, timeRange]);

  const toggleMetric = (metric) => {
    setSelectedMetrics(prev => 
      prev.includes(metric) 
        ? prev.filter(m => m !== metric)
        : [...prev, metric]
    );
  };

  const renderComparisonChart = () => (
    <ResponsiveContainer width="100%" height={400}>
      <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis yAxisId="left" />
        <YAxis yAxisId="right" orientation="right" />
        <Tooltip />
        <Legend />
        {selectedMetrics.includes('confirmed') && (
          <Area yAxisId="left" type="monotone" dataKey="confirmed" fill="#8884d8" fillOpacity={0.3} name="Confirmed" />
        )}
        {selectedMetrics.includes('deaths') && (
          <Line yAxisId="right" type="monotone" dataKey="deaths" stroke="#ff7300" strokeWidth={2} name="Deaths" />
        )}
        {selectedMetrics.includes('recovered') && (
          <Line yAxisId="left" type="monotone" dataKey="recovered" stroke="#00C49F" strokeWidth={2} name="Recovered" />
        )}
        {selectedMetrics.includes('critical') && (
          <Bar yAxisId="right" dataKey="critical" fill="#FF8042" name="Critical" />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );

  const renderTrendAnalysis = () => (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Legend />
        <ReferenceLine y={0} stroke="#000" />
        {selectedMetrics.map((metric, index) => (
          <Line 
            key={metric}
            type="monotone" 
            dataKey={metric} 
            stroke={COLORS[index % COLORS.length]} 
            strokeWidth={2}
            dot={false}
            name={metric.charAt(0).toUpperCase() + metric.slice(1)}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );

  const renderGrowthRate = () => {
    const growthData = chartData.slice(1).map((item, index) => {
      const prev = chartData[index];
      return {
        date: item.date,
        growthRate: prev.confirmed > 0 ? ((item.confirmed - prev.confirmed) / prev.confirmed * 100).toFixed(2) : 0,
        newCases: item.newCases
      };
    });

    return (
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={growthData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis yAxisId="left" label={{ value: 'Growth Rate (%)', angle: -90, position: 'insideLeft' }} />
          <YAxis yAxisId="right" orientation="right" label={{ value: 'New Cases', angle: 90, position: 'insideRight' }} />
          <Tooltip />
          <Legend />
          <Bar yAxisId="left" dataKey="growthRate" fill="#8884d8" name="Growth Rate %" />
          <Line yAxisId="right" type="monotone" dataKey="newCases" stroke="#82ca9d" strokeWidth={2} name="New Cases" />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const renderDistribution = () => {
    if (!chartData.length) return null;
    const latest = chartData[chartData.length - 1];
    const pieData = [
      { name: 'Recovered', value: latest.recovered },
      { name: 'Active', value: latest.confirmed - latest.recovered - latest.deaths },
      { name: 'Deaths', value: latest.deaths },
      { name: 'Critical', value: latest.critical }
    ].filter(d => d.value > 0);

    return (
      <ResponsiveContainer width="100%" height={400}>
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            outerRadius={150}
            fill="#8884d8"
            dataKey="value"
          >
            {pieData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    );
  };

  const renderScatterCorrelation = () => {
    const scatterData = chartData.map(item => ({
      x: item.confirmed,
      y: item.deaths,
      z: item.critical || 0,
      name: item.date
    }));

    return (
      <ResponsiveContainer width="100%" height={400}>
        <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
          <CartesianGrid />
          <XAxis type="number" dataKey="x" name="Confirmed" unit=" cases" />
          <YAxis type="number" dataKey="y" name="Deaths" unit=" cases" />
          <ZAxis range={[50, 400]} name="Critical" />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} />
          <Legend />
          <Scatter name="Cases Correlation" data={scatterData} fill="#8884d8" />
        </ScatterChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex flex-wrap gap-4 mb-6 items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">Advanced Analytics & Comparison</h2>
        
        <div className="flex flex-wrap gap-2">
          <select 
            value={chartType} 
            onChange={(e) => setChartType(e.target.value)}
            className="px-3 py-2 border rounded-md bg-white"
          >
            <option value="comparison">Multi-Metric Comparison</option>
            <option value="trend">Trend Analysis</option>
            <option value="growth">Growth Rate</option>
            <option value="distribution">Case Distribution</option>
            <option value="correlation">Correlation Scatter</option>
          </select>

          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border rounded-md bg-white"
          >
            <option value="7">Last 7 days</option>
            <option value="14">Last 14 days</option>
            <option value="30">Last 30 days</option>
            <option value="60">Last 60 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Metric Toggles */}
      <div className="flex flex-wrap gap-3 mb-6">
        {['confirmed', 'deaths', 'recovered', 'critical'].map(metric => (
          <label key={metric} className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedMetrics.includes(metric)}
              onChange={() => toggleMetric(metric)}
              className="rounded"
            />
            <span className="capitalize text-sm text-gray-700">{metric}</span>
          </label>
        ))}
      </div>

      {/* Chart Render */}
      <div className="chart-container">
        {chartType === 'comparison' && renderComparisonChart()}
        {chartType === 'trend' && renderTrendAnalysis()}
        {chartType === 'growth' && renderGrowthRate()}
        {chartType === 'distribution' && renderDistribution()}
        {chartType === 'correlation' && renderScatterCorrelation()}
      </div>

      {/* Insights Panel */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-blue-800 mb-2">📊 Chart Insights</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Toggle metrics to compare different data series</li>
          <li>• Adjust time range to analyze short-term vs long-term trends</li>
          <li>• Use correlation chart to identify relationships between metrics</li>
          <li>• Growth rate helps identify acceleration/deceleration patterns</li>
        </ul>
      </div>
    </div>
  );
};

export default AdvancedCharts;
