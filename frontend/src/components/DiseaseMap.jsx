import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import L from 'leaflet';

export default function DiseaseMap({ disease, country, days }) {
  const [mapData, setMapData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMapData();
  }, [disease, country, days]);

  const fetchMapData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (disease) params.append('disease', disease);
      if (country) params.append('country', country);
      if (days) params.append('days', days);
      
      const response = await fetch(`/api/map/data?${params}`);
      const data = await response.json();
      setMapData(data);
    } catch (error) {
      console.error('Error fetching map data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMarkerColor = (count) => {
    if (count >= 10) return '#e53e3e';
    if (count >= 5) return '#dd6b20';
    if (count >= 3) return '#d69e2e';
    return '#48bb78';
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div className="card">
      <h2 className="card-title">Global Disease Map</h2>
      <div className="map-container">
        <MapContainer center={[20, 0]} zoom={2} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />
          {mapData && mapData.locations.map((location, index) => (
            <CircleMarker
              key={index}
              center={[location.latitude, location.longitude]}
              radius={Math.min(location.count * 3, 30)}
              fillColor={getMarkerColor(location.count)}
              color="#fff"
              weight={2}
              opacity={1}
              fillOpacity={0.7}
            >
              <Popup>
                <strong>{location.country}</strong><br />
                {location.region && <span>{location.region}<br /></span>}
                Cases: {location.count}<br />
                <strong>Diseases:</strong><br />
                {Object.entries(location.diseases).map(([disease, count]) => (
                  <div key={disease}>{disease}: {count}</div>
                ))}
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
      {mapData && (
        <div style={{ marginTop: '16px', color: '#718096' }}>
          Total Cases: {mapData.total_cases} | Last Updated: {new Date(mapData.last_updated).toLocaleString()}
        </div>
      )}
    </div>
  );
}
