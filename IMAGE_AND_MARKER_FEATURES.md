# Disease Tracker - Images & Diverse Markers Feature Documentation

## ✅ Implemented Features

### 1. Backend API Enhancements

#### Database Model Updates (`app.py`)
- Added `notes` field (Text) - User observations and context
- Added `image_urls` field (Text/JSON) - List of image URLs/paths
- Added `marker_type` field (String) - Type classification for markers

#### New API Endpoints

**POST `/api/cases`** - Submit case with images and marker type
```json
{
  "disease_name": "COVID-19",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "country": "USA",
  "onset_date": "2024-01-15",
  "severity": "moderate",
  "notes": "Patient reported travel history...",
  "marker_type": "hospital",
  "images": [
    { "data": "data:image/png;base64,..." }
  ]
}
```

**GET `/api/cases/<case_id>`** - Get detailed case info (with auth)
- Returns full details including notes and images for:
  - Case owner
  - Admin/Government users
  - Approved cases (public)

**PUT `/api/cases/<case_id>`** - Update case with images/notes
- Supports adding/updating notes
- Supports marker type changes
- Supports image uploads

**GET `/api/uploads/<filename>`** - Serve uploaded images
- Secure file serving from uploads directory

### 2. Frontend Components

#### Enhanced CaseReportForm.jsx
- **Notes Field**: Textarea for additional observations
- **Marker Type Selector**: Dropdown with 7 types:
  - Default
  - Hospital/Clinic
  - Testing Lab
  - Outbreak Zone
  - Cluster Area
  - Testing Site
  - Quarantine Facility
- **Image Upload**: 
  - Multiple file selection
  - Base64 encoding
  - 5MB size limit per image
  - Preview thumbnails
  - Remove individual images

#### AdvancedMap.jsx - Diverse Marker Support
- **Custom Icons by Type**: SVG icons from Mapbox Maki set
  - Hospital icon for medical facilities
  - Laboratory icon for testing sites
  - Alert icon for outbreak zones
  - Group icon for clusters
  - Defibrillator icon for testing sites
  - Roadblock icon for quarantine facilities

- **4 Basemap Options**:
  - Streets (OpenStreetMap)
  - Satellite (ESRI)
  - Terrain (OpenTopoMap)
  - Dark Mode (CartoDB)

- **Interactive Popups**: Show notes/images indicators
- **Severity-based Colors**: Color-coded markers

### 3. Marker Types Reference

| Type | Icon | Use Case |
|------|------|----------|
| `default` | Hospital pin | General cases |
| `hospital` | Hospital building | Medical facility reports |
| `lab` | Laboratory flask | Testing laboratory results |
| `outbreak` | Alert triangle | Active outbreak zones |
| `cluster` | Group of people | Case clustering areas |
| `testing_site` | Defibrillator | Testing locations |
| `quarantine` | Roadblock | Quarantine facilities |

### 4. Image Handling

#### Supported Formats
- JPEG/JPG
- PNG
- GIF

#### Storage
- Local filesystem: `/workspace/backend/uploads/`
- UUID-named files for uniqueness
- Served via `/api/uploads/<filename>`

#### Privacy
- Images only visible to:
  - Case submitter
  - Government/Admin users
  - Public (for approved cases only)

### 5. Usage Examples

#### Submitting a Case with Image
```javascript
const formData = {
  disease_name: 'Influenza',
  latitude: 51.5074,
  longitude: -0.1278,
  country: 'UK',
  onset_date: '2024-01-20',
  severity: 'mild',
  notes: 'Cluster detected in school',
  marker_type: 'cluster',
  images: [
    { data: 'data:image/jpeg;base64,/9j/4AAQSkZ...' }
  ]
};

fetch('/api/cases', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer <token>'
  },
  body: JSON.stringify(formData)
});
```

#### Retrieving Case with Images
```javascript
fetch('/api/cases/123', {
  headers: {
    'Authorization': 'Bearer <token>'
  }
})
.then(res => res.json())
.then(data => {
  console.log('Notes:', data.notes);
  console.log('Images:', data.images); // Array of URLs
  console.log('Marker Type:', data.marker_type);
});
```

## 🔒 Security Considerations

1. **File Size Limits**: 5MB per image enforced
2. **Authentication Required**: For upload and private data access
3. **Authorization Checks**: Only owners/admins see sensitive data
4. **De-identification**: All public data is de-identified
5. **Moderation Queue**: Images reviewed before public display

## 🚀 Deployment Notes

1. Ensure `uploads/` directory exists and is writable
2. Configure CORS for image serving if using CDN
3. Consider cloud storage (S3, etc.) for production
4. Implement image optimization/compression
5. Add virus scanning for uploaded files

## 📊 Benefits

- **Rich Context**: Notes provide valuable epidemiological context
- **Visual Evidence**: Images help verify and understand outbreaks
- **Better Classification**: Marker types improve data organization
- **Enhanced Maps**: Diverse icons improve map readability
- **Professional UI**: Modern file upload experience
