import { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import DiseaseMap from './components/DiseaseMap';
import OutbreakAlerts from './components/OutbreakAlerts';
import CaseReportForm from './components/CaseReportForm';
import ModerationQueue from './components/ModerationQueue';
import StatsDashboard from './components/StatsDashboard';
import AuthModal from './components/AuthModal';
import TrendChart from './components/TrendChart';
import SymptomAnalyzer from './components/SymptomAnalyzer';
import AdminDashboard from './components/AdminDashboard';
import AdvancedCharts from './components/AdvancedCharts';
import AdvancedMap from './components/AdvancedMap';
import ComparisonTools from './components/ComparisonTools';
import MapOperations from './components/MapOperations';
import AnalyticsDashboard from './components/AnalyticsDashboard';

function Header() {
  const { isAuthenticated, user, logout } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <>
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <span>🌍</span>
            <span>Disease Tracker</span>
          </div>
          <nav className="nav-links">
            <Link to="/" className="nav-link">Dashboard</Link>
            <Link to="/analytics" className="nav-link">Analytics</Link>
            <Link to="/map" className="nav-link">Map</Link>
            <Link to="/alerts" className="nav-link">Alerts</Link>
            {isAuthenticated && (
              <>
                <Link to="/submit" className="nav-link">Submit Report</Link>
                <Link to="/my-cases" className="nav-link">My Cases</Link>
                {(user?.user_type === 'government' || user?.user_type === 'admin') && (
                  <Link to="/moderation" className="nav-link">Moderation</Link>
                )}
                {user?.user_type === 'admin' && (
                  <Link to="/admin" className="nav-link">Admin</Link>
                )}
              </>
            )}
          </nav>
          <div>
            {isAuthenticated ? (
              <button className="btn btn-secondary" onClick={logout}>
                Logout
              </button>
            ) : (
              <button className="btn btn-primary" onClick={() => setShowAuthModal(true)}>
                Login / Register
              </button>
            )}
          </div>
        </div>
      </header>
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
    </>
  );
}

function Dashboard() {
  const [dashboardData, setDashboardData] = useState({ trends: [], cases: [], alerts: [] });

  return (
    <div className="container">
      <h1 style={{ marginBottom: '24px' }}>Global Disease Dashboard</h1>
      <StatsDashboard onDataLoad={setDashboardData} />
      <div className="dashboard-grid" style={{ marginTop: '20px' }}>
        <DiseaseMap days={30} />
        <OutbreakAlerts />
      </div>
      <div style={{ marginTop: '20px' }}>
        <TrendChart days={30} />
      </div>
      {/* New Advanced Charts Section */}
      <div style={{ marginTop: '20px' }}>
        <AdvancedCharts data={dashboardData} />
      </div>
      {/* Comparison Tools */}
      <div style={{ marginTop: '20px' }}>
        <ComparisonTools data={dashboardData} />
      </div>
      <div className="dashboard-grid" style={{ marginTop: '20px' }}>
        <SymptomAnalyzer />
      </div>
    </div>
  );
}

function MapPage() {
  const [filters, setFilters] = useState({ disease: '', country: '', days: 30 });
  const [mapCases, setMapCases] = useState([]);
  const [mapAlerts, setMapAlerts] = useState([]);

  return (
    <div className="container">
      <h1 style={{ marginBottom: '24px' }}>Advanced Global Map</h1>
      
      {/* Map Operations Toolbar */}
      <MapOperations 
        onFilterChange={(key, value) => console.log('Operation:', key, value)}
        onLayerChange={(layer) => console.log('Layer:', layer)}
        onExport={(format) => console.log('Exporting as:', format)}
      />
      
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <input
              type="text"
              placeholder="Filter by disease..."
              value={filters.disease}
              onChange={(e) => setFilters({ ...filters, disease: e.target.value })}
              className="form-input"
            />
          </div>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <input
              type="text"
              placeholder="Filter by country..."
              value={filters.country}
              onChange={(e) => setFilters({ ...filters, country: e.target.value })}
              className="form-input"
            />
          </div>
          <div style={{ width: '150px' }}>
            <select
              value={filters.days}
              onChange={(e) => setFilters({ ...filters, days: Number(e.target.value) })}
              className="form-select"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value={365}>Last year</option>
            </select>
          </div>
        </div>
      </div>
      <AdvancedMap cases={mapCases} alerts={mapAlerts} />
    </div>
  );
}

function AlertsPage() {
  return (
    <div className="container">
      <h1 style={{ marginBottom: '24px' }}>Outbreak Alerts</h1>
      <OutbreakAlerts />
    </div>
  );
}

function SubmitCasePage() {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return (
      <div className="container">
        <div className="card">
          <h2>Please login to submit a case report</h2>
          <p style={{ color: '#718096', marginTop: '12px' }}>
            You need to be logged in to submit disease case reports.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <h1 style={{ marginBottom: '24px' }}>Submit Case Report</h1>
      <CaseReportForm />
    </div>
  );
}

function MyCasesPage() {
  const { token } = useAuth();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);

  useState(() => {
    fetch('/api/cases/my', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setCases(data.cases);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div className="container">
      <h1 style={{ marginBottom: '24px' }}>My Case Reports</h1>
      <div className="card">
        {cases.length === 0 ? (
          <p style={{ color: '#718096' }}>You haven't submitted any case reports yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Disease</th>
                <th>Location</th>
                <th>Date</th>
                <th>Severity</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((caseItem) => (
                <tr key={caseItem.id}>
                  <td>{caseItem.disease_name}</td>
                  <td>{caseItem.location_name || caseItem.country}</td>
                  <td>{new Date(caseItem.onset_date).toLocaleDateString()}</td>
                  <td>
                    <span className={`badge badge-${caseItem.severity}`}>
                      {caseItem.severity}
                    </span>
                  </td>
                  <td>
                    <span className={`badge badge-${caseItem.status}`}>
                      {caseItem.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function ModerationPage() {
  const { user } = useAuth();
  
  if (!user || (user.user_type !== 'government' && user.user_type !== 'admin')) {
    return (
      <div className="container">
        <div className="card">
          <h2>Access Denied</h2>
          <p style={{ color: '#718096', marginTop: '12px' }}>
            Only government and admin users can access the moderation queue.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <h1 style={{ marginBottom: '24px' }}>Moderation Queue</h1>
      <ModerationQueue />
    </div>
  );
}

function AppContent() {
  return (
    <BrowserRouter>
      <Header />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/analytics" element={<AnalyticsDashboard />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/alerts" element={<AlertsPage />} />
        <Route path="/submit" element={<SubmitCasePage />} />
        <Route path="/my-cases" element={<MyCasesPage />} />
        <Route path="/moderation" element={<ModerationPage />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
