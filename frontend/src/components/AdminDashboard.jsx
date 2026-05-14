import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Download, BarChart3, Users, FileText } from 'lucide-react';

export default function AdminDashboard() {
  const { token, user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || user?.user_type !== 'admin') return;

    fetch('/api/admin/analytics', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setAnalytics(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [token, user]);

  const handleExport = async (disease = '', country = '') => {
    try {
      const params = new URLSearchParams({ disease, country, days: '90' });
      const response = await fetch(`/api/export/cases?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cases_export_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export data. Please try again.');
    }
  };

  if (!user || user.user_type !== 'admin') {
    return (
      <div className="container">
        <div className="card">
          <h2>Access Denied</h2>
          <p style={{ color: '#718096', marginTop: '12px' }}>
            Only administrators can access this dashboard.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1><BarChart3 size={28} style={{ marginRight: '12px', verticalAlign: 'middle' }} />Admin Analytics Dashboard</h1>
        <button onClick={() => handleExport()} className="btn btn-primary">
          <Download size={18} style={{ marginRight: '8px' }} />
          Export Data
        </button>
      </div>

      {analytics && (
        <>
          {/* Key Metrics */}
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', marginBottom: '24px' }}>
            <div className="stat-card">
              <div className="stat-icon" style={{ backgroundColor: '#ebf8ff' }}>
                <FileText size={24} color="#3182ce" />
              </div>
              <div className="stat-content">
                <div className="stat-value">{analytics.cases.today}</div>
                <div className="stat-label">Cases Today</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ backgroundColor: '#faf5ff' }}>
                <FileText size={24} color="#805ad5" />
              </div>
              <div className="stat-content">
                <div className="stat-value">{analytics.cases.this_week}</div>
                <div className="stat-label">Cases This Week</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ backgroundColor: '#fff5f5' }}>
                <FileText size={24} color="#e53e3e" />
              </div>
              <div className="stat-content">
                <div className="stat-value">{analytics.cases.this_month}</div>
                <div className="stat-label">Cases This Month</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ backgroundColor: '#f0fff4' }}>
                <Users size={24} color="#38a169" />
              </div>
              <div className="stat-content">
                <div className="stat-value">{analytics.users.total}</div>
                <div className="stat-label">Total Users</div>
              </div>
            </div>
          </div>

          {/* Moderation Stats */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <h3>Moderation Statistics</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginTop: '16px' }}>
              <div style={{ textAlign: 'center', padding: '20px', backgroundColor: '#feebc8', borderRadius: '12px' }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#dd6b20' }}>{analytics.moderation.pending}</div>
                <div style={{ color: '#c05621', marginTop: '8px' }}>Pending Review</div>
              </div>
              <div style={{ textAlign: 'center', padding: '20px', backgroundColor: '#c6f6d5', borderRadius: '12px' }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#2f855a' }}>{analytics.moderation.approved_total}</div>
                <div style={{ color: '#276749', marginTop: '8px' }}>Total Approved</div>
              </div>
              <div style={{ textAlign: 'center', padding: '20px', backgroundColor: '#fed7d7', borderRadius: '12px' }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#c53030' }}>{analytics.moderation.rejected_total}</div>
                <div style={{ color: '#9b2c2c', marginTop: '8px' }}>Total Rejected</div>
              </div>
              <div style={{ textAlign: 'center', padding: '20px', backgroundColor: '#bee3f8', borderRadius: '12px' }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#2b6cb0' }}>{analytics.moderation.approval_rate}%</div>
                <div style={{ color: '#2c5282', marginTop: '8px' }}>Approval Rate</div>
              </div>
            </div>
          </div>

          {/* User Breakdown */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <h3>User Breakdown</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginTop: '16px' }}>
              <div style={{ padding: '20px', border: '2px solid #4299e1', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#2b6cb0' }}>{analytics.users.individual}</div>
                <div style={{ color: '#4a5568', marginTop: '8px' }}>Individual Users</div>
              </div>
              <div style={{ padding: '20px', border: '2px solid #805ad5', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#6b46c1' }}>{analytics.users.government}</div>
                <div style={{ color: '#4a5568', marginTop: '8px' }}>Government Users</div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card">
            <h3>Quick Actions</h3>
            <div style={{ display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
              <button onClick={() => handleExport('', '')} className="btn btn-secondary">
                <Download size={18} style={{ marginRight: '8px' }} />
                Export All Cases (90 days)
              </button>
              <button onClick={() => handleExport('covid-19', '')} className="btn btn-secondary">
                <Download size={18} style={{ marginRight: '8px' }} />
                Export COVID-19 Cases
              </button>
              <button onClick={() => window.location.href = '/moderation'} className="btn btn-primary">
                Go to Moderation Queue
              </button>
            </div>
          </div>
        </>
      )}

      <p style={{ color: '#718096', fontSize: '12px', marginTop: '24px', textAlign: 'center' }}>
        Last updated: {analytics?.timestamp ? new Date(analytics.timestamp).toLocaleString() : 'N/A'}
      </p>
    </div>
  );
}
