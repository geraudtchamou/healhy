import { useState, useEffect } from 'react';

export default function StatsDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/stats/global');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats?.total_cases || 0}</div>
          <div className="stat-label">Total Cases</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats?.pending_cases || 0}</div>
          <div className="stat-label">Pending Review</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats?.active_alerts || 0}</div>
          <div className="stat-label">Active Alerts</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div className="card">
          <h3 className="card-title">Cases by Disease</h3>
          {stats?.by_disease.length > 0 ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Disease</th>
                  <th>Cases</th>
                </tr>
              </thead>
              <tbody>
                {stats.by_disease.map((item, index) => (
                  <tr key={index}>
                    <td>{item.disease}</td>
                    <td>{item.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ color: '#718096' }}>No data available</p>
          )}
        </div>

        <div className="card">
          <h3 className="card-title">Top Countries</h3>
          {stats?.top_countries.length > 0 ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Country</th>
                  <th>Cases</th>
                </tr>
              </thead>
              <tbody>
                {stats.top_countries.map((item, index) => (
                  <tr key={index}>
                    <td>{item.country}</td>
                    <td>{item.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ color: '#718096' }}>No data available</p>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: '20px' }}>
        <h3 className="card-title">Cases by Severity</h3>
        {stats?.by_severity.length > 0 ? (
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            {stats.by_severity.map((item, index) => (
              <div key={index} style={{ textAlign: 'center', padding: '16px', background: '#f7fafc', borderRadius: '8px' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#667eea' }}>{item.count}</div>
                <div style={{ color: '#718096' }}>{item.severity}</div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#718096' }}>No data available</p>
        )}
      </div>
    </div>
  );
}
