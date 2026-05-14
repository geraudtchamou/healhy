import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ComposedChart, Scatter
} from 'recharts';
import { TrendingUp, TrendingDown, Activity, Globe, Users, AlertTriangle } from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

// Color palettes
const COLORS = {
  primary: '#3B82F6',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  purple: '#8B5CF6',
  teal: '#14B8A6',
  pink: '#EC4899',
  gray: '#6B7280'
};

const SEVERITY_COLORS = {
  mild: '#10B981',
  moderate: '#F59E0B',
  severe: '#EF4444',
  critical: '#7C3AED'
};

/**
 * KPI Card Component
 */
const KPICard = ({ title, value, change, icon: Icon, color }) => {
  const isPositive = change >= 0;
  
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value.toLocaleString()}</p>
          {change !== undefined && (
            <div className={`flex items-center mt-2 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              <span className="ml-1 text-sm font-medium">{Math.abs(change).toFixed(1)}%</span>
              <span className="ml-2 text-gray-500">vs last period</span>
            </div>
          )}
        </div>
        <div className={`p-4 rounded-full ${color}`}>
          <Icon size={24} className="text-white" />
        </div>
      </div>
    </div>
  );
};

/**
 * Main Analytics Dashboard Component
 */
const AnalyticsDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [chartData, setChartData] = useState({});
  const [selectedPeriod, setSelectedPeriod] = useState(30);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchAnalytics();
  }, [selectedPeriod]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      // Fetch KPIs
      const kpiRes = await fetch(`${API_BASE}/analytics/kpis`);
      const kpiData = await kpiRes.json();
      setKpis(kpiData.kpis);

      // Fetch detailed metrics
      const metricsRes = await fetch(`${API_BASE}/analytics/metrics`);
      const metricsData = await metricsRes.json();
      setMetrics(metricsData);

      // Fetch chart data for different types
      const chartTypes = ['time_series', 'severity_trend', 'geographic_distribution', 'radar_metrics', 'bubble_chart'];
      const chartPromises = chartTypes.map(async type => {
        const res = await fetch(`${API_BASE}/analytics/charts/${type}?days=${selectedPeriod}`);
        const data = await res.json();
        return { type, data };
      });

      const results = await Promise.all(chartPromises);
      const chartsMap = {};
      results.forEach(({ type, data }) => {
        chartsMap[type] = data;
      });
      setChartData(chartsMap);

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Loading analytics dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-2">Real-time disease tracking insights and metrics</p>
          
          {/* Period Selector */}
          <div className="flex gap-2 mt-4">
            {[7, 14, 30, 60, 90].map(days => (
              <button
                key={days}
                onClick={() => setSelectedPeriod(days)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedPeriod === days
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                Last {days} days
              </button>
            ))}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          {['overview', 'trends', 'comparisons', 'engagement'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-medium capitalize transition-colors border-b-2 ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <KPICard
                title="Total Approved Cases"
                value={kpis?.total_approved_cases || 0}
                change={kpis?.month_over_month_growth}
                icon={Activity}
                color="bg-blue-500"
              />
              <KPICard
                title="Pending Moderation"
                value={kpis?.pending_moderation || 0}
                icon={AlertTriangle}
                color="bg-yellow-500"
              />
              <KPICard
                title="Active Outbreaks"
                value={kpis?.active_outbreaks || 0}
                icon={Globe}
                color="bg-red-500"
              />
              <KPICard
                title="Countries Affected"
                value={kpis?.countries_affected || 0}
                change={kpis?.week_over_week_growth}
                icon={Users}
                color="bg-purple-500"
              />
            </div>

            {/* Time Series Chart */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Daily Case Trends</h2>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={chartData.time_series?.data || []}>
                  <defs>
                    <linearGradient id="colorConfirmed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.8}/>
                      <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="confirmed" stroke={COLORS.primary} fillOpacity={1} fill="url(#colorConfirmed)" name="Total Cases" />
                  <Line type="monotone" dataKey="severe" stroke={COLORS.danger} strokeWidth={2} name="Severe" />
                  <Line type="monotone" dataKey="critical" stroke={COLORS.purple} strokeWidth={2} name="Critical" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Severity Distribution & Top Diseases */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Severity Pie Chart */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Severity Distribution</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={Object.entries(kpis?.severity_distribution || {}).map(([name, value]) => ({ name, value }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {Object.keys(kpis?.severity_distribution || {}).map((key, index) => (
                        <Cell key={`cell-${index}`} fill={SEVERITY_COLORS[key] || COLORS.gray} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Top Diseases Bar Chart */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Top Diseases This Month</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={kpis?.top_diseases || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}

        {/* Trends Tab */}
        {activeTab === 'trends' && (
          <>
            {/* Stacked Severity Trend */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Severity Trend Over Time</h2>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={chartData.severity_trend?.data || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="mild" stackId="1" stroke={SEVERITY_COLORS.mild} fill={SEVERITY_COLORS.mild} name="Mild" />
                  <Area type="monotone" dataKey="moderate" stackId="1" stroke={SEVERITY_COLORS.moderate} fill={SEVERITY_COLORS.moderate} name="Moderate" />
                  <Area type="monotone" dataKey="severe" stackId="1" stroke={SEVERITY_COLORS.severe} fill={SEVERITY_COLORS.severe} name="Severe" />
                  <Area type="monotone" dataKey="critical" stackId="1" stroke={SEVERITY_COLORS.critical} fill={SEVERITY_COLORS.critical} name="Critical" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Velocity Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-700">Average Daily Cases</h3>
                <p className="text-3xl font-bold text-blue-600 mt-2">
                  {metrics?.velocity?.avg_daily_cases.toFixed(1) || 0}
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-700">Peak Daily Cases</h3>
                <p className="text-3xl font-bold text-red-600 mt-2">
                  {metrics?.velocity?.max_daily_cases || 0}
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-700">Lowest Daily Cases</h3>
                <p className="text-3xl font-bold text-green-600 mt-2">
                  {metrics?.velocity?.min_daily_cases || 0}
                </p>
              </div>
            </div>
          </>
        )}

        {/* Comparisons Tab */}
        {activeTab === 'comparisons' && (
          <>
            {/* Radar Chart - Multi-metric Comparison */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Disease Multi-Metric Comparison</h2>
              <ResponsiveContainer width="100%" height={500}>
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData.radar_metrics?.diseases || []}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="disease" />
                  <PolarRadiusAxis angle={30} domain={[0, 'auto']} />
                  {(chartData.radar_metrics?.diseases || []).map((disease, idx) => (
                    <Radar
                      key={idx}
                      name={disease.disease}
                      data={Object.entries(disease.metrics).map(([key, value]) => ({ subject: key.replace(/_/g, ' '), A: value }))}
                      stroke={Object.values(COLORS)[idx % Object.keys(COLORS).length]}
                      fill={Object.values(COLORS)[idx % Object.keys(COLORS).length]}
                      fillOpacity={0.3}
                    />
                  ))}
                  <Legend />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Bubble Chart - Geographic Analysis */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Country Analysis (Cases vs Diseases)</h2>
              <ResponsiveContainer width="100%" height={400}>
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" dataKey="cases" name="Cases" unit="" />
                  <YAxis type="number" dataKey="diseases" name="Unique Diseases" unit="" />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                  <Scatter name="Countries" data={chartData.bubble_chart?.data || []} fill={COLORS.primary}>
                    {(chartData.bubble_chart?.data || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={Object.values(COLORS)[index % Object.keys(COLORS).length]} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {/* Engagement Tab */}
        {activeTab === 'engagement' && (
          <>
            {/* User Engagement Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <KPICard
                title="Total Users"
                value={metrics?.user_engagement?.total_users || 0}
                icon={Users}
                color="bg-blue-500"
              />
              <KPICard
                title="Active Submitters"
                value={metrics?.user_engagement?.active_submitters || 0}
                icon={Activity}
                color="bg-green-500"
              />
              <KPICard
                title="Cases Per User"
                value={metrics?.user_engagement?.cases_per_user || 0}
                icon={TrendingUp}
                color="bg-purple-500"
              />
              <KPICard
                title="Engagement Rate"
                value={`${metrics?.user_engagement?.engagement_rate || 0}%`}
                icon={Globe}
                color="bg-pink-500"
              />
            </div>

            {/* Moderation Efficiency */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Moderation Efficiency</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-gray-600">Average Response Time</p>
                  <p className="text-4xl font-bold text-blue-600">
                    {metrics?.moderation_efficiency?.avg_response_time_hours.toFixed(1) || 0} hours
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Total Moderations</p>
                  <p className="text-4xl font-bold text-green-600">
                    {metrics?.moderation_efficiency?.total_moderations || 0}
                  </p>
                </div>
              </div>
            </div>

            {/* Regional Hotspots */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Top Regional Hotspots</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Rank</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Country</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Region</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">Cases</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(metrics?.regional_hotspots || []).map((hotspot, idx) => (
                      <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${
                            idx < 3 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {idx + 1}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium">{hotspot.country}</td>
                        <td className="py-3 px-4 text-gray-600">{hotspot.region}</td>
                        <td className="py-3 px-4 text-right font-bold text-red-600">{hotspot.cases}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
