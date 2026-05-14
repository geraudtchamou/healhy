import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

// Fix for default Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker icons by type
const markerIcons = {
  default: new L.Icon({
    iconUrl: 'https://cdn.jsdelivr.net/npm/@mapbox/maki@6.0.1/icons/hospital-15.svg',
    iconSize: [25, 25],
    iconAnchor: [12, 25],
    popupAnchor: [0, -25]
  }),
  hospital: new L.Icon({
    iconUrl: 'https://cdn.jsdelivr.net/npm/@mapbox/maki@6.0.1/icons/hospital-15.svg',
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30]
  }),
  lab: new L.Icon({
    iconUrl: 'https://cdn.jsdelivr.net/npm/@mapbox/maki@6.0.1/icons/laboratory-15.svg',
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30]
  }),
  outbreak: new L.Icon({
    iconUrl: 'https://cdn.jsdelivr.net/npm/@mapbox/maki@6.0.1/icons/alert-15.svg',
    iconSize: [35, 35],
    iconAnchor: [17, 35],
    popupAnchor: [0, -35]
  }),
  cluster: new L.Icon({
    iconUrl: 'https://cdn.jsdelivr.net/npm/@mapbox/maki@6.0.1/icons/group-15.svg',
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30]
  }),
  testing_site: new L.Icon({
    iconUrl: 'https://cdn.jsdelivr.net/npm/@mapbox/maki@6.0.1/icons/defibrillator-15.svg',
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30]
  }),
  quarantine: new L.Icon({
    iconUrl: 'https://cdn.jsdelivr.net/npm/@mapbox/maki@6.0.1/icons/roadblock-15.svg',
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30]
  })
};

// Severity colors
const severityColors = {
  mild: '#28a745',
  moderate: '#ffc107',
  severe: '#fd7e14',
  critical: '#dc3545'
};

function MapController({ onMapReady }) {
  const map = useMap();
  
  useEffect(() => {
    if (onMapReady) onMapReady(map);
  }, [map, onMapReady]);
  
  return null;
}

export default function AdvancedMap() {
  const [mapData, setMapData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDisease, setSelectedDisease] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('');
  const [selectedMarkerType, setSelectedMarkerType] = useState('');
  const [mapInstance, setMapInstance] = useState(null);
  const [clusterGroup, setClusterGroup] = useState(null);
  const [showClusters, setShowClusters] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [basemap, setBasemap] = useState('streets');

  useEffect(() => {
    fetchMapData();
  }, []);

  const fetchMapData = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedDisease) params.append('disease', selectedDisease);
      if (selectedSeverity) params.append('severity', selectedSeverity);
      
      const response = await fetch(`/api/map/data?${params}`);
      const data = await response.json();
      setMapData(data.locations || []);
    } catch (error) {
      console.error('Error fetching map data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMarkerIcon = (markerType, severity) => {
    if (markerType && markerIcons[markerType]) {
      return markerIcons[markerType];
    }
    
    // Default colored circle marker based on severity
    return null;
  };

  const filteredData = mapData.filter(location => {
    if (selectedSeverity && location.severities?.[selectedSeverity] === 0) return false;
    if (selectedMarkerType) return true; // Marker type filtering would need backend support
    return true;
  });

  const basemaps = {
    streets: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    terrain: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
  };

  const renderMarkers = () => {
    if (showClusters && clusterGroup) {
      clusterGroup.clearLayers();
    }

    const markers = filteredData.map((location, index) => {
      const markerType = location.marker_type || 'default';
      const icon = getMarkerIcon(markerType, location.max_severity);
      
      const popupContent = `
        <div style="min-width: 200px;">
          <h3 style="margin: 0 0 8px 0; color: #1a1a2e;">${location.diseases ? Object.keys(location.diseases).join(', ') : 'Unknown'}</h3>
          <p style="margin: 4px 0;"><strong>Country:</strong> ${location.country}</p>
          ${location.region ? `<p style="margin: 4px 0;"><strong>Region:</strong> ${location.region}</p>` : ''}
          <p style="margin: 4px 0;"><strong>Cases:</strong> ${location.count}</p>
          ${location.has_notes ? '<p style="margin: 4px 0; color: #666;">📝 Has notes</p>' : ''}
          ${location.has_images ? '<p style="margin: 4px 0; color: #666;">📷 Has images</p>' : ''}
          <div style="margin-top: 8px;">
            <strong>Severity Breakdown:</strong>
            <ul style="margin: 4px 0; padding-left: 16px;">
              ${location.severities?.mild > 0 ? `<li style="color: ${severityColors.mild}">Mild: ${location.severities.mild}</li>` : ''}
              ${location.severities?.moderate > 0 ? `<li style="color: ${severityColors.moderate}">Moderate: ${location.severities.moderate}</li>` : ''}
              ${location.severities?.severe > 0 ? `<li style="color: ${severityColors.severe}">Severe: ${location.severities.severe}</li>` : ''}
              ${location.severities?.critical > 0 ? `<li style="color: ${severityColors.critical}">Critical: ${location.severities.critical}</li>` : ''}
            </ul>
          </div>
        </div>
      `;

      if (icon) {
        return (
          <Marker
            key={index}
            position={[location.latitude, location.longitude]}
            icon={icon}
          >
            <Popup>{popupContent}</Popup>
          </Marker>
        );
      } else {
        return (
          <CircleMarker
            key={index}
            center={[location.latitude, location.longitude]}
            radius={Math.min(20, Math.sqrt(location.count) * 3)}
            fillColor={severityColors[location.max_severity] || '#3498db'}
            color="#fff"
            weight={2}
            opacity={1}
            fillOpacity={0.7}
          >
            <Popup>{popupContent}</Popup>
          </CircleMarker>
        );
      }
    });

    return markers;
  };

  return (
    <div className="card">
      <h2 className="card-title">Interactive Disease Map</h2>
      
      <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <select
          value={selectedDisease}
          onChange={(e) => setSelectedDisease(e.target.value)}
          className="form-select"
          style={{ minWidth: '150px' }}
        >
          <option value="">All Diseases</option>
          <option value="COVID-19">COVID-19</option>
          <option value="Influenza">Influenza</option>
          <option value="Malaria">Malaria</option>
          <option value="Dengue">Dengue</option>
          <option value="Ebola">Ebola</option>
        </select>

        <select
          value={selectedSeverity}
          onChange={(e) => setSelectedSeverity(e.target.value)}
          className="form-select"
          style={{ minWidth: '150px' }}
        >
          <option value="">All Severities</option>
          <option value="mild">Mild</option>
          <option value="moderate">Moderate</option>
          <option value="severe">Severe</option>
          <option value="critical">Critical</option>
        </select>

        <select
          value={basemap}
          onChange={(e) => setBasemap(e.target.value)}
          className="form-select"
          style={{ minWidth: '150px' }}
        >
          <option value="streets">Streets</option>
          <option value="satellite">Satellite</option>
          <option value="terrain">Terrain</option>
          <option value="dark">Dark Mode</option>
        </select>

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            checked={showClusters}
            onChange={(e) => setShowClusters(e.target.checked)}
          />
          Cluster Markers
        </label>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Loading map...</div>
      ) : (
        <MapContainer
          center={[20, 0]}
          zoom={2}
          style={{ height: '500px', width: '100%', borderRadius: '8px' }}
        >
          <TileLayer
            url={basemaps[basemap]}
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          
          <MapController onMapReady={setMapInstance} />
          
          {renderMarkers()}
        </MapContainer>
      )}

      <div style={{ marginTop: '16px', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        <div>
          <strong>Marker Types:</strong>
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px', flexWrap: 'wrap' }}>
            {Object.entries(markerIcons).slice(0, 4).map(([type, icon]) => (
              <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '20px', height: '20px' }}>
                  <img src={icon.options.iconUrl} alt={type} style={{ width: '100%', height: '100%' }} />
                </div>
                <span style={{ fontSize: '12px', textTransform: 'capitalize' }}>{type.replace('_', ' ')}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div>
          <strong>Severity Levels:</strong>
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            {Object.entries(severityColors).map(([level, color]) => (
              <div key={level} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: color }} />
                <span style={{ fontSize: '12px', textTransform: 'capitalize' }}>{level}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
