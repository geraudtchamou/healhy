import { useState, useEffect } from 'react';

export default function OutbreakAlerts({ disease, country }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
  }, [disease, country]);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (disease) params.append('disease', disease);
      if (country) params.append('country', country);
      
      const response = await fetch(`/api/alerts?${params}`);
      const data = await response.json();
      setAlerts(data.alerts);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAlertClass = (level) => {
    return `alert-${level}`;
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div className="card">
      <h2 className="card-title">Outbreak Alerts</h2>
      {alerts.length === 0 ? (
        <p style={{ color: '#718096' }}>No active alerts</p>
      ) : (
        alerts.map((alert) => (
          <div key={alert.id} className={`alert-item ${getAlertClass(alert.alert_level)}`}>
            <div className="alert-title">{alert.disease_name} - {alert.country}</div>
            {alert.region && <div style={{ fontSize: '13px' }}>{alert.region}</div>}
            <div className="alert-meta">
              Level: <strong>{alert.alert_level.toUpperCase()}</strong> | 
              Cases: {alert.case_count || 'N/A'} | 
              Source: {alert.source}
            </div>
            {alert.description && (
              <div style={{ marginTop: '8px', fontSize: '14px' }}>{alert.description}</div>
            )}
            <div style={{ fontSize: '12px', color: '#a0aec0', marginTop: '8px' }}>
              {new Date(alert.created_at).toLocaleString()}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
