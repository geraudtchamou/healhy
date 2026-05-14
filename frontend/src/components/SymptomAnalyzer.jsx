import { useState } from 'react';
import { Activity, Stethoscope } from 'lucide-react';

export default function SymptomAnalyzer() {
  const [symptoms, setSymptoms] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);

  const commonSymptoms = [
    'fever', 'cough', 'fatigue', 'headache', 'rash',
    'nausea', 'diarrhea', 'shortness of breath', 'muscle pain', 'joint pain'
  ];

  const addSymptom = (symptom) => {
    if (!symptoms.includes(symptom.toLowerCase())) {
      setSymptoms([...symptoms, symptom.toLowerCase()]);
      setInputValue('');
    }
  };

  const removeSymptom = (symptomToRemove) => {
    setSymptoms(symptoms.filter(s => s !== symptomToRemove));
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      addSymptom(inputValue.trim());
    }
  };

  const analyzeSymptoms = async () => {
    if (symptoms.length === 0) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/symptoms/analyzer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symptoms })
      });
      const data = await response.json();
      setAnalysis(data);
    } catch (error) {
      console.error('Error analyzing symptoms:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level) => {
    switch (level) {
      case 'high': return '#e53e3e';
      case 'medium': return '#d69e2e';
      case 'low': return '#38a169';
      default: return '#718096';
    }
  };

  return (
    <div className="card">
      <h3><Stethoscope size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} />Symptom Checker</h3>
      <p style={{ color: '#718096', fontSize: '14px', marginBottom: '16px' }}>
        Enter your symptoms to get an AI-powered analysis of possible diseases
      </p>

      <div style={{ marginBottom: '16px' }}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a symptom and press Enter..."
          className="form-input"
          list="symptom-suggestions"
        />
        <datalist id="symptom-suggestions">
          {commonSymptoms.map(s => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </div>

      {symptoms.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
            {symptoms.map((symptom) => (
              <span
                key={symptom}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#ebf8ff',
                  color: '#3182ce',
                  borderRadius: '20px',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {symptom}
                <button
                  onClick={() => removeSymptom(symptom)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#3182ce',
                    padding: '0',
                    fontSize: '16px'
                  }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <button
            onClick={analyzeSymptoms}
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%' }}
          >
            {loading ? 'Analyzing...' : 'Analyze Symptoms'}
          </button>
        </div>
      )}

      {analysis && (
        <div style={{ marginTop: '20px' }}>
          <div style={{
            padding: '16px',
            borderRadius: '8px',
            backgroundColor: `${getRiskColor(analysis.risk_level)}15`,
            border: `2px solid ${getRiskColor(analysis.risk_level)}`,
            marginBottom: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <Activity size={24} color={getRiskColor(analysis.risk_level)} />
              <h4 style={{ margin: 0, color: getRiskColor(analysis.risk_level) }}>
                Risk Level: {analysis.risk_level.toUpperCase()}
              </h4>
            </div>
            <p style={{ margin: 0, color: '#4a5568' }}>{analysis.recommendation}</p>
          </div>

          {analysis.possible_diseases.length > 0 && (
            <div>
              <h4 style={{ marginBottom: '12px' }}>Possible Diseases:</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {analysis.possible_diseases.map((item, index) => (
                  <div
                    key={item.disease}
                    style={{
                      padding: '12px',
                      backgroundColor: '#f7fafc',
                      borderRadius: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <span style={{ fontWeight: '500', textTransform: 'capitalize' }}>
                      {index + 1}. {item.disease}
                    </span>
                    <span style={{
                      padding: '4px 12px',
                      backgroundColor: '#4299e1',
                      color: 'white',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}>
                      {item.match_count} matches
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p style={{ 
            marginTop: '16px', 
            fontSize: '12px', 
            color: '#718096',
            fontStyle: 'italic',
            textAlign: 'center'
          }}>
            ⚠️ This is not a medical diagnosis. Please consult a healthcare professional for proper evaluation.
          </p>
        </div>
      )}
    </div>
  );
}
