import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function CaseReportForm({ onSuccess }) {
  const { token } = useAuth();
  const [formData, setFormData] = useState({
    disease_name: '',
    latitude: '',
    longitude: '',
    location_name: '',
    country: '',
    region: '',
    city: '',
    onset_date: '',
    symptoms: '',
    severity: 'moderate',
    age_group: '',
    notes: '',
    marker_type: 'default'
  });
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    const newImages = [];
    
    files.forEach(file => {
      if (file.size > 5 * 1024 * 1024) {
        setError(`File ${file.name} is too large. Max size is 5MB.`);
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        newImages.push({
          name: file.name,
          data: reader.result,
          type: file.type
        });
        if (newImages.length === files.length) {
          setImages([...images, ...newImages]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const submitData = {
        ...formData,
        images: images.map(img => ({ data: img.data }))
      };

      const response = await fetch('/api/cases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(submitData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit case report');
      }

      setSuccess(true);
      setFormData({
        disease_name: '',
        latitude: '',
        longitude: '',
        location_name: '',
        country: '',
        region: '',
        city: '',
        onset_date: '',
        symptoms: '',
        severity: 'moderate',
        age_group: '',
        notes: '',
        marker_type: 'default'
      });
      setImages([]);

      if (onSuccess) onSuccess();
      
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2 className="card-title">Submit Case Report</h2>
      
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">Case report submitted successfully!</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Disease Name *</label>
          <input
            type="text"
            name="disease_name"
            value={formData.disease_name}
            onChange={handleChange}
            className="form-input"
            required
            placeholder="e.g., COVID-19, Influenza, Malaria"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label">Latitude *</label>
            <input
              type="number"
              name="latitude"
              value={formData.latitude}
              onChange={handleChange}
              className="form-input"
              step="any"
              min="-90"
              max="90"
              required
              placeholder="-90 to 90"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Longitude *</label>
            <input
              type="number"
              name="longitude"
              value={formData.longitude}
              onChange={handleChange}
              className="form-input"
              step="any"
              min="-180"
              max="180"
              required
              placeholder="-180 to 180"
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Location Name</label>
          <input
            type="text"
            name="location_name"
            value={formData.location_name}
            onChange={handleChange}
            className="form-input"
            placeholder="Hospital, Clinic, etc."
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label">Country *</label>
            <input
              type="text"
              name="country"
              value={formData.country}
              onChange={handleChange}
              className="form-input"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Region/State</label>
            <input
              type="text"
              name="region"
              value={formData.region}
              onChange={handleChange}
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label className="form-label">City</label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              className="form-input"
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Symptom Onset Date *</label>
          <input
            type="date"
            name="onset_date"
            value={formData.onset_date}
            onChange={handleChange}
            className="form-input"
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Marker Type</label>
          <select
            name="marker_type"
            value={formData.marker_type}
            onChange={handleChange}
            className="form-select"
          >
            <option value="default">Default</option>
            <option value="hospital">Hospital/Clinic</option>
            <option value="lab">Testing Lab</option>
            <option value="outbreak">Outbreak Zone</option>
            <option value="cluster">Cluster Area</option>
            <option value="testing_site">Testing Site</option>
            <option value="quarantine">Quarantine Facility</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Severity</label>
          <select
            name="severity"
            value={formData.severity}
            onChange={handleChange}
            className="form-select"
          >
            <option value="mild">Mild</option>
            <option value="moderate">Moderate</option>
            <option value="severe">Severe</option>
            <option value="critical">Critical</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Age Group</label>
          <select
            name="age_group"
            value={formData.age_group}
            onChange={handleChange}
            className="form-select"
          >
            <option value="">Select...</option>
            <option value="0-17">0-17</option>
            <option value="18-34">18-34</option>
            <option value="35-64">35-64</option>
            <option value="65+">65+</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Symptoms</label>
          <textarea
            name="symptoms"
            value={formData.symptoms}
            onChange={handleChange}
            className="form-textarea"
            placeholder="Describe symptoms..."
          />
        </div>

        <div className="form-group">
          <label className="form-label">Additional Notes</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            className="form-textarea"
            placeholder="Add any additional observations or context..."
            rows="3"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Upload Images (Optional)</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageUpload}
            className="form-input"
          />
          <p className="form-hint">Max 5MB per image. Supported formats: JPG, PNG, GIF</p>
          
          {images.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '10px', marginTop: '10px' }}>
              {images.map((img, index) => (
                <div key={index} style={{ position: 'relative', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
                  <img src={img.data} alt={img.name} style={{ width: '100%', height: '100px', objectFit: 'cover' }} />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    style={{
                      position: 'absolute',
                      top: '4px',
                      right: '4px',
                      background: 'rgba(255,0,0,0.8)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: '24px',
                      height: '24px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Submitting...' : 'Submit Case Report'}
        </button>
      </form>
    </div>
  );
}
