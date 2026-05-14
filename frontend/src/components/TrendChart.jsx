import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TrendingUp, AlertTriangle } from 'lucide-react';

export default function TrendChart({ disease = '', country = '', days = 30 }) {
  const [data, setData] = useState([]);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const params = new URLSearchParams({ disease, country, days: days.toString() });
        const [trendRes, predRes] = await Promise.all([
          fetch(`/api/stats/trends?${params}`),
          fetch(`/api/predictions/outbreak?${params}`)
        ]);
        
        const trendData = await trendRes.json();
        const predData = await predRes.json();
        
        setData(trendData.daily_data || []);
        setPrediction(predData);
      } catch (error) {
        console.error('Error fetching trend data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [disease, country, days]);

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  const getRiskColor = (level) => {
    switch (level) {
      case 'critical': return '#e53e3e';
      case 'high': return '#dd6b20';
      case 'medium': return '#d69e2e';
      case 'low': return '#38a169';
      default: return '#718096';
    }
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3><TrendingUp size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} />Case Trends</h3>
        {prediction && (
          <div style={{ 
            padding: '8px 16px', 
            borderRadius: '8px', 
            backgroundColor: `${getRiskColor(prediction.risk_level)}20`,
            color: getRiskColor(prediction.risk_level),
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertTriangle size={16} />
            {prediction.risk_level.toUpperCase()} RISK
          </div>
        )}
      </div>
      
      {data.length > 0 ? (
        <>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4299e1" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#4299e1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(date) => new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                stroke="#718096"
              />
              <YAxis stroke="#718096" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e2e8f0', 
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                }}
                labelFormatter={(label) => new Date(label).toLocaleDateString()}
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="count" 
                name="Total Cases" 
                stroke="#4299e1" 
                fillOpacity={1} 
                fill="url(#colorCount)" 
              />
              <Line type="monotone" dataKey="severe" name="Severe Cases" stroke="#e53e3e" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="critical" name="Critical Cases" stroke="#9b2c2c" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
          
          {prediction && (
            <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f7fafc', borderRadius: '8px' }}>
              <p style={{ fontSize: '14px', color: '#4a5568' }}>
                <strong>Prediction:</strong> {prediction.prediction} Growth rate: {prediction.growth_rate}% 
                ({prediction.recent_cases} recent vs {prediction.previous_cases} previous cases)
              </p>
            </div>
          )}
        </>
      ) : (
        <p style={{ color: '#718096', textAlign: 'center', padding: '40px' }}>
          No trend data available for the selected filters
        </p>
      )}
    </div>
  );
}
