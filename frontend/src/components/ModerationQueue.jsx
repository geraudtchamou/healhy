import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function ModerationQueue() {
  const { token } = useAuth();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState(null);
  const [actionNotes, setActionNotes] = useState('');

  useEffect(() => {
    fetchPendingCases();
  }, []);

  const fetchPendingCases = async () => {
    try {
      const response = await fetch('/api/moderation/pending', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setCases(data.cases);
    } catch (error) {
      console.error('Error fetching pending cases:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleModerate = async (caseId, action) => {
    try {
      const response = await fetch(`/api/moderation/${caseId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action, notes: actionNotes })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      setActionNotes('');
      setSelectedCase(null);
      fetchPendingCases();
    } catch (error) {
      alert('Error moderating case: ' + error.message);
    }
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div className="card">
      <h2 className="card-title">Moderation Queue</h2>
      
      {cases.length === 0 ? (
        <p style={{ color: '#718096' }}>No pending cases</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Disease</th>
              <th>Location</th>
              <th>Date</th>
              <th>Severity</th>
              <th>Submitter</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {cases.map((caseItem) => (
              <tr key={caseItem.id}>
                <td>{caseItem.disease_name}</td>
                <td>{caseItem.city || caseItem.region || caseItem.country}</td>
                <td>{new Date(caseItem.onset_date).toLocaleDateString()}</td>
                <td>
                  <span className={`badge badge-${caseItem.severity}`}>
                    {caseItem.severity}
                  </span>
                </td>
                <td>{caseItem.submitter_email}</td>
                <td>
                  <button
                    className="btn btn-success"
                    style={{ padding: '6px 12px', marginRight: '8px' }}
                    onClick={() => handleModerate(caseItem.id, 'approve')}
                  >
                    Approve
                  </button>
                  <button
                    className="btn btn-danger"
                    style={{ padding: '6px 12px' }}
                    onClick={() => setSelectedCase(caseItem)}
                  >
                    Reject
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selectedCase && (
        <div className="modal-overlay" onClick={() => setSelectedCase(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Reject Case Report</h3>
              <button className="modal-close" onClick={() => setSelectedCase(null)}>×</button>
            </div>
            <div className="form-group">
              <label className="form-label">Reason for Rejection</label>
              <textarea
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                className="form-textarea"
                placeholder="Explain why this case is being rejected..."
              />
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setSelectedCase(null)}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={() => handleModerate(selectedCase.id, 'reject')}
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
