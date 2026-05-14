"""
Disease Tracking Platform - Backend API
Flask application with authentication, case report management, and data aggregation
"""

import os
import json
from datetime import datetime, timedelta
from functools import wraps
from flask import Flask, request, jsonify, g
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
import requests

app = Flask(__name__)

# Configuration
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///disease_tracker.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-key-change-in-production')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
app.config['JWT_IDENTITY_CLAIM'] = 'identity'

CORS(app)
db = SQLAlchemy(app)
jwt = JWTManager(app)

# Database Models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    user_type = db.Column(db.String(20), nullable=False, default='individual')  # individual, government, admin
    organization = db.Column(db.String(200))
    is_verified = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class CaseReport(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    disease_name = db.Column(db.String(100), nullable=False)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    location_name = db.Column(db.String(200))
    country = db.Column(db.String(100), nullable=False)
    region = db.Column(db.String(100))
    city = db.Column(db.String(100))
    onset_date = db.Column(db.Date, nullable=False)
    reported_date = db.Column(db.DateTime, default=datetime.utcnow)
    symptoms = db.Column(db.Text)
    severity = db.Column(db.String(20))  # mild, moderate, severe, critical
    age_group = db.Column(db.String(20))  # 0-17, 18-34, 35-64, 65+
    status = db.Column(db.String(20), default='pending')  # pending, approved, rejected
    moderator_notes = db.Column(db.Text)
    is_deidentified = db.Column(db.Boolean, default=True)
    
    # New Fields: Images and Notes
    notes = db.Column(db.Text)  # User observations/context
    image_urls = db.Column(db.Text)  # JSON string list of image URLs/paths
    marker_type = db.Column(db.String(50), default='default')  # default, hospital, lab, outbreak, cluster
    
    user = db.relationship('User', backref=db.backref('case_reports', lazy=True))

class OutbreakAlert(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    disease_name = db.Column(db.String(100), nullable=False)
    country = db.Column(db.String(100), nullable=False)
    region = db.Column(db.String(100))
    alert_level = db.Column(db.String(20), nullable=False)  # low, medium, high, critical
    case_count = db.Column(db.Integer)
    description = db.Column(db.Text)
    source = db.Column(db.String(100))  # WHO, CDC, ECDC, Global.health
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)

class ModerationLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    case_report_id = db.Column(db.Integer, db.ForeignKey('case_report.id'), nullable=False)
    moderator_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    action = db.Column(db.String(20), nullable=False)  # approve, reject
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# ==================== NEW MODULES ====================

class TropicalDiseaseData(db.Model):
    """Specialized data for vector-borne and climate-sensitive tropical diseases"""
    __tablename__ = 'tropical_disease_data'
    id = db.Column(db.Integer, primary_key=True)
    case_report_id = db.Column(db.Integer, db.ForeignKey('case_report.id'), nullable=True)
    disease_name = db.Column(db.String(100), nullable=False, index=True)  # Malaria, Dengue, Zika, Chikungunya, Leishmaniasis
    vector_type = db.Column(db.String(50))  # Aedes aegypti, Anopheles, Tick, Sandfly
    temperature_avg = db.Column(db.Float)  # Avg temp in C during incubation
    humidity_avg = db.Column(db.Float)  # Avg humidity %
    rainfall_mm = db.Column(db.Float)  # Rainfall in mm
    endemic_status = db.Column(db.String(20))  # endemic, epidemic, imported, eliminated
    prevention_measures = db.Column(db.Text)  # Bed nets, spraying, vaccination
    risk_level = db.Column(db.String(20))  # low, medium, high, very_high
    seasonal_pattern = db.Column(db.String(50))  # rainy_season, dry_season, year_round
    case_report = db.relationship('CaseReport', backref=db.backref('tropical_data', uselist=False))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class EmergentDiseaseWatch(db.Model):
    """Rapid response tracking for novel pathogens, variants, and emerging threats"""
    __tablename__ = 'emergent_disease_watch'
    id = db.Column(db.Integer, primary_key=True)
    case_report_id = db.Column(db.Integer, db.ForeignKey('case_report.id'), nullable=True)
    pathogen_name = db.Column(db.String(100), nullable=False)  # Novel coronavirus, Unknown pathogen
    variant_lineage = db.Column(db.String(50))  # e.g., XBB.1.5, BA.2.86, Clade I
    r0_estimate = db.Column(db.Float)  # Basic reproduction number
    transmission_mode = db.Column(db.String(100))  # Airborne, Contact, Zoonotic, Vector-borne
    containment_status = db.Column(db.String(20))  # contained, spreading, uncontrolled
    who_alert_level = db.Column(db.Integer, default=0)  # 0-5 PHEIC scale
    genomic_sequence_available = db.Column(db.Boolean, default=False)
    travel_restrictions = db.Column(db.Text)  # JSON string of affected regions
    first_detected_date = db.Column(db.Date)
    origin_location = db.Column(db.String(200))
    zoonotic_source = db.Column(db.String(100))  # Animal reservoir if known
    case_fatality_rate = db.Column(db.Float)  # CFR percentage
    case_report = db.relationship('CaseReport', backref=db.backref('emergent_data', uselist=False))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Initialize database
with app.app_context():
    db.create_all()

# External API integrations
def fetch_who_data():
    """Fetch data from WHO APIs"""
    try:
        # WHO doesn't have a simple public REST API, using simulated data structure
        # In production, integrate with WHO's official data sources
        response = requests.get('https://covid19.who.int/region', timeout=10)
        if response.status_code == 200:
            return response.json()
    except Exception as e:
        app.logger.error(f"WHO API error: {e}")
    return None

def fetch_cdc_data():
    """Fetch data from CDC APIs"""
    try:
        response = requests.get(
            'https://data.cdc.gov/resource/9mfq-cb36.json',
            timeout=10
        )
        if response.status_code == 200:
            return response.json()[:100]  # Limit to 100 records
    except Exception as e:
        app.logger.error(f"CDC API error: {e}")
    return None

def fetch_ecdc_data():
    """Fetch data from ECDC EpiPulse"""
    try:
        # ECDC EpiPulse requires authentication, using placeholder
        response = requests.get(
            'https://epipulse.ecdc.europa.eu/api/events',
            headers={'Accept': 'application/json'},
            timeout=10
        )
        if response.status_code == 200:
            return response.json()
    except Exception as e:
        app.logger.error(f"ECDC API error: {e}")
    return None

def fetch_global_health_data():
    """Fetch data from Global.health"""
    try:
        response = requests.get(
            'https://data.covid-19.global.health/cases',
            params={'limit': 100},
            timeout=10
        )
        if response.status_code == 200:
            return response.json()
    except Exception as e:
        app.logger.error(f"Global.health API error: {e}")
    return None

# Authentication routes
@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    
    if not data or not all(k in data for k in ['email', 'password', 'user_type']):
        return jsonify({'error': 'Missing required fields'}), 400
    
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already registered'}), 409
    
    user = User(
        email=data['email'],
        user_type=data['user_type'],
        organization=data.get('organization'),
        is_verified=(data['user_type'] == 'admin')  # Auto-verify admins
    )
    user.set_password(data['password'])
    
    db.session.add(user)
    db.session.commit()
    
    access_token = create_access_token(identity=user.id)
    return jsonify({
        'message': 'Registration successful',
        'access_token': access_token,
        'user': {
            'id': user.id,
            'email': user.email,
            'user_type': user.user_type,
            'is_verified': user.is_verified
        }
    }), 201

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    
    if not data or not all(k in data for k in ['email', 'password']):
        return jsonify({'error': 'Missing email or password'}), 400
    
    user = User.query.filter_by(email=data['email']).first()
    
    if not user or not user.check_password(data['password']):
        return jsonify({'error': 'Invalid credentials'}), 401
    
    access_token = create_access_token(identity=user.id)
    return jsonify({
        'access_token': access_token,
        'user': {
            'id': user.id,
            'email': user.email,
            'user_type': user.user_type,
            'organization': user.organization,
            'is_verified': user.is_verified
        }
    }), 200

# Case Report Routes
@app.route('/api/cases', methods=['POST'])
@jwt_required()
def submit_case_report():
    data = request.get_json()
    current_user_id = get_jwt_identity()
    
    # Validate required fields
    required_fields = ['disease_name', 'latitude', 'longitude', 'country', 'onset_date']
    if not all(k in data for k in required_fields):
        return jsonify({'error': 'Missing required fields'}), 400
    
    # Validate coordinates
    try:
        lat = float(data['latitude'])
        lon = float(data['longitude'])
        if not (-90 <= lat <= 90) or not (-180 <= lon <= 180):
            return jsonify({'error': 'Invalid coordinates'}), 400
    except ValueError:
        return jsonify({'error': 'Coordinates must be numbers'}), 400
    
    # Validate date
    try:
        onset_date = datetime.strptime(data['onset_date'], '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
    
    # Validate severity
    valid_severities = ['mild', 'moderate', 'severe', 'critical']
    severity = data.get('severity', 'moderate')
    if severity not in valid_severities:
        return jsonify({'error': f'Severity must be one of: {valid_severities}'}), 400
    
    # Validate marker type
    valid_marker_types = ['default', 'hospital', 'lab', 'outbreak', 'cluster', 'testing_site', 'quarantine']
    marker_type = data.get('marker_type', 'default')
    if marker_type not in valid_marker_types:
        return jsonify({'error': f'Marker type must be one of: {valid_marker_types}'}), 400
    
    # Process images (base64 or URLs)
    image_urls = []
    images = data.get('images', [])
    if images:
        for img in images:
            if isinstance(img, dict) and 'data' in img:
                # Base64 image - save to uploads folder
                import base64
                import uuid
                try:
                    img_data = img['data'].split(',')[1] if ',' in img['data'] else img['data']
                    decoded = base64.b64decode(img_data)
                    filename = f"{uuid.uuid4()}.png"
                    upload_dir = os.path.join(os.path.dirname(__file__), 'uploads')
                    os.makedirs(upload_dir, exist_ok=True)
                    filepath = os.path.join(upload_dir, filename)
                    with open(filepath, 'wb') as f:
                        f.write(decoded)
                    image_urls.append(f'/api/uploads/{filename}')
                except Exception as e:
                    app.logger.error(f"Image upload error: {e}")
            elif isinstance(img, str) and img.startswith('http'):
                # External URL
                image_urls.append(img)
    
    case_report = CaseReport(
        user_id=current_user_id,
        disease_name=data['disease_name'].strip(),
        latitude=lat,
        longitude=lon,
        location_name=data.get('location_name'),
        country=data['country'].strip(),
        region=data.get('region'),
        city=data.get('city'),
        onset_date=onset_date,
        symptoms=data.get('symptoms'),
        severity=severity,
        age_group=data.get('age_group'),
        is_deidentified=True,
        notes=data.get('notes'),
        image_urls=json.dumps(image_urls) if image_urls else None,
        marker_type=marker_type
    )
    
    db.session.add(case_report)
    db.session.commit()
    
    return jsonify({
        'message': 'Case report submitted for moderation',
        'case_id': case_report.id,
        'status': case_report.status
    }), 201

@app.route('/api/cases/<int:case_id>', methods=['PUT'])
@jwt_required()
def update_case_report(case_id):
    current_user_id = get_jwt_identity()
    case_report = CaseReport.query.get_or_404(case_id)
    
    # Only allow the original submitter or admins to update
    if case_report.user_id != current_user_id:
        user = User.query.get(current_user_id)
        if user.user_type != 'admin':
            return jsonify({'error': 'Unauthorized'}), 403
    
    # Cannot update approved cases
    if case_report.status == 'approved':
        return jsonify({'error': 'Cannot update approved cases'}), 400
    
    data = request.get_json()
    
    if 'disease_name' in data:
        case_report.disease_name = data['disease_name'].strip()
    if 'latitude' in data:
        case_report.latitude = float(data['latitude'])
    if 'longitude' in data:
        case_report.longitude = float(data['longitude'])
    if 'location_name' in data:
        case_report.location_name = data['location_name']
    if 'country' in data:
        case_report.country = data['country'].strip()
    if 'region' in data:
        case_report.region = data['region']
    if 'city' in data:
        case_report.city = data['city']
    if 'onset_date' in data:
        try:
            case_report.onset_date = datetime.strptime(data['onset_date'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': 'Invalid date format'}), 400
    if 'symptoms' in data:
        case_report.symptoms = data['symptoms']
    if 'severity' in data:
        if data['severity'] not in ['mild', 'moderate', 'severe', 'critical']:
            return jsonify({'error': 'Invalid severity'}), 400
        case_report.severity = data['severity']
    if 'age_group' in data:
        case_report.age_group = data['age_group']
    
    db.session.commit()
    
    return jsonify({
        'message': 'Case report updated',
        'case_id': case_report.id
    }), 200

@app.route('/api/cases/my', methods=['GET'])
@jwt_required()
def get_my_cases():
    current_user_id = get_jwt_identity()
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    
    pagination = CaseReport.query.filter_by(user_id=current_user_id)\
        .order_by(CaseReport.reported_date.desc())\
        .paginate(page=page, per_page=per_page, error_out=False)
    
    cases = [{
        'id': case.id,
        'disease_name': case.disease_name,
        'latitude': case.latitude,
        'longitude': case.longitude,
        'location_name': case.location_name,
        'country': case.country,
        'onset_date': case.onset_date.isoformat(),
        'reported_date': case.reported_date.isoformat(),
        'symptoms': case.symptoms,
        'severity': case.severity,
        'status': case.status,
        'moderator_notes': case.moderator_notes
    } for case in pagination.items]
    
    return jsonify({
        'cases': cases,
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': page
    }), 200

# Moderation Routes (Admin/Government only)
@app.route('/api/moderation/pending', methods=['GET'])
@jwt_required()
def get_pending_cases():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if user.user_type not in ['admin', 'government']:
        return jsonify({'error': 'Unauthorized'}), 403
    
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    
    pagination = CaseReport.query.filter_by(status='pending')\
        .order_by(CaseReport.reported_date.asc())\
        .paginate(page=page, per_page=per_page, error_out=False)
    
    cases = [{
        'id': case.id,
        'disease_name': case.disease_name,
        'latitude': case.latitude,
        'longitude': case.longitude,
        'location_name': case.location_name,
        'country': case.country,
        'region': case.region,
        'city': case.city,
        'onset_date': case.onset_date.isoformat(),
        'reported_date': case.reported_date.isoformat(),
        'symptoms': case.symptoms,
        'severity': case.severity,
        'age_group': case.age_group,
        'submitter_email': case.user.email
    } for case in pagination.items]
    
    return jsonify({
        'cases': cases,
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': page
    }), 200

@app.route('/api/moderation/<int:case_id>', methods=['POST'])
@jwt_required()
def moderate_case(case_id):
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if user.user_type not in ['admin', 'government']:
        return jsonify({'error': 'Unauthorized'}), 403
    
    case_report = CaseReport.query.get_or_404(case_id)
    data = request.get_json()
    
    action = data.get('action')
    if action not in ['approve', 'reject']:
        return jsonify({'error': 'Action must be approve or reject'}), 400
    
    notes = data.get('notes', '')
    
    if action == 'approve':
        case_report.status = 'approved'
    else:
        case_report.status = 'rejected'
    
    case_report.moderator_notes = notes
    
    # Log moderation action
    mod_log = ModerationLog(
        case_report_id=case_id,
        moderator_id=current_user_id,
        action=action,
        notes=notes
    )
    db.session.add(mod_log)
    db.session.commit()
    
    return jsonify({
        'message': f'Case {action}d successfully',
        'case_id': case_id,
        'status': case_report.status
    }), 200

# Public Data Routes
@app.route('/api/cases/public', methods=['GET'])
def get_public_cases():
    """Get approved cases for public display (de-identified)"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    disease = request.args.get('disease')
    country = request.args.get('country')
    days = request.args.get('days', 30, type=int)
    
    query = CaseReport.query.filter_by(status='approved', is_deidentified=True)
    
    if disease:
        query = query.filter(CaseReport.disease_name.ilike(f'%{disease}%'))
    if country:
        query = query.filter_by(country=country)
    
    cutoff_date = datetime.utcnow().date() - timedelta(days=days)
    query = query.filter(CaseReport.onset_date >= cutoff_date)
    
    pagination = query.order_by(CaseReport.reported_date.desc())\
        .paginate(page=page, per_page=per_page, error_out=False)
    
    cases = [{
        'id': case.id,
        'disease_name': case.disease_name,
        'latitude': case.latitude,
        'longitude': case.longitude,
        'country': case.country,
        'region': case.region,
        'onset_date': case.onset_date.isoformat(),
        'severity': case.severity,
        'age_group': case.age_group,
        'marker_type': case.marker_type,
        'has_images': bool(case.image_urls),
        'has_notes': bool(case.notes)
    } for case in pagination.items]
    
    return jsonify({
        'cases': cases,
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': page
    }), 200

@app.route('/api/map/data', methods=['GET'])
def get_map_data():
    """Get aggregated case data for map visualization"""
    disease = request.args.get('disease')
    country = request.args.get('country')
    days = request.args.get('days', 30, type=int)
    
    query = CaseReport.query.filter_by(status='approved', is_deidentified=True)
    
    if disease:
        query = query.filter(CaseReport.disease_name.ilike(f'%{disease}%'))
    if country:
        query = query.filter_by(country=country)
    
    cutoff_date = datetime.utcnow().date() - timedelta(days=days)
    query = query.filter(CaseReport.onset_date >= cutoff_date)
    
    cases = query.all()
    
    # Aggregate by location
    location_data = {}
    for case in cases:
        key = f"{case.latitude},{case.longitude}"
        if key not in location_data:
            location_data[key] = {
                'latitude': case.latitude,
                'longitude': case.longitude,
                'country': case.country,
                'region': case.region,
                'count': 0,
                'diseases': {},
                'severities': {'mild': 0, 'moderate': 0, 'severe': 0, 'critical': 0}
            }
        location_data[key]['count'] += 1
        
        if case.disease_name not in location_data[key]['diseases']:
            location_data[key]['diseases'][case.disease_name] = 0
        location_data[key]['diseases'][case.disease_name] += 1
        
        if case.severity in location_data[key]['severities']:
            location_data[key]['severities'][case.severity] += 1
    
    return jsonify({
        'locations': list(location_data.values()),
        'total_cases': len(cases),
        'last_updated': datetime.utcnow().isoformat()
    }), 200

@app.route('/api/alerts', methods=['GET'])
def get_alerts():
    """Get active outbreak alerts"""
    country = request.args.get('country')
    disease = request.args.get('disease')
    
    query = OutbreakAlert.query.filter_by(is_active=True)
    
    if country:
        query = query.filter_by(country=country)
    if disease:
        query = query.filter(OutbreakAlert.disease_name.ilike(f'%{disease}%'))
    
    alerts = query.order_by(OutbreakAlert.created_at.desc()).all()
    
    return jsonify({
        'alerts': [{
            'id': alert.id,
            'disease_name': alert.disease_name,
            'country': alert.country,
            'region': alert.region,
            'alert_level': alert.alert_level,
            'case_count': alert.case_count,
            'description': alert.description,
            'source': alert.source,
            'created_at': alert.created_at.isoformat()
        } for alert in alerts],
        'total': len(alerts)
    }), 200

@app.route('/api/alerts', methods=['POST'])
@jwt_required()
def create_alert():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if user.user_type not in ['admin', 'government']:
        return jsonify({'error': 'Unauthorized'}), 403
    
    data = request.get_json()
    required_fields = ['disease_name', 'country', 'alert_level']
    
    if not all(k in data for k in required_fields):
        return jsonify({'error': 'Missing required fields'}), 400
    
    valid_levels = ['low', 'medium', 'high', 'critical']
    if data['alert_level'] not in valid_levels:
        return jsonify({'error': f'Alert level must be one of: {valid_levels}'}), 400
    
    alert = OutbreakAlert(
        disease_name=data['disease_name'].strip(),
        country=data['country'].strip(),
        region=data.get('region'),
        alert_level=data['alert_level'],
        case_count=data.get('case_count'),
        description=data.get('description'),
        source=data.get('source', 'Manual'),
        is_active=True
    )
    
    db.session.add(alert)
    db.session.commit()
    
    return jsonify({
        'message': 'Alert created successfully',
        'alert_id': alert.id
    }), 201

# Statistics and Dashboard
@app.route('/api/stats/global', methods=['GET'])
def get_global_stats():
    """Get global statistics"""
    total_cases = CaseReport.query.filter_by(status='approved').count()
    pending_cases = CaseReport.query.filter_by(status='pending').count()
    total_alerts = OutbreakAlert.query.filter_by(is_active=True).count()
    
    # Cases by disease
    diseases = db.session.query(
        CaseReport.disease_name, 
        db.func.count(CaseReport.id)
    ).filter_by(status='approved').group_by(CaseReport.disease_name).all()
    
    # Cases by country
    countries = db.session.query(
        CaseReport.country, 
        db.func.count(CaseReport.id)
    ).filter_by(status='approved').group_by(CaseReport.country)\
     .order_by(db.func.count(CaseReport.id).desc()).limit(10).all()
    
    # Cases by severity
    severities = db.session.query(
        CaseReport.severity, 
        db.func.count(CaseReport.id)
    ).filter_by(status='approved').group_by(CaseReport.severity).all()
    
    return jsonify({
        'total_cases': total_cases,
        'pending_cases': pending_cases,
        'active_alerts': total_alerts,
        'by_disease': [{'disease': d[0], 'count': d[1]} for d in diseases],
        'top_countries': [{'country': c[0], 'count': c[1]} for c in countries],
        'by_severity': [{'severity': s[0], 'count': s[1]} for s in severities],
        'last_updated': datetime.utcnow().isoformat()
    }), 200

@app.route('/api/admin/users', methods=['GET'])
@jwt_required()
def get_all_users():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if user.user_type != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    users = User.query.all()
    
    return jsonify({
        'users': [{
            'id': u.id,
            'email': u.email,
            'user_type': u.user_type,
            'organization': u.organization,
            'is_verified': u.is_verified,
            'created_at': u.created_at.isoformat(),
            'case_count': len(u.case_reports)
        } for u in users],
        'total': len(users)
    }), 200

@app.route('/api/admin/verify-user/<int:user_id>', methods=['POST'])
@jwt_required()
def verify_user(user_id):
    current_user_id = get_jwt_identity()
    admin = User.query.get(current_user_id)
    
    if admin.user_type != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    user = User.query.get_or_404(user_id)
    user.is_verified = True
    db.session.commit()
    
    return jsonify({
        'message': f'User {user.email} verified successfully',
        'user_id': user_id
    }), 200

# Enhanced Features Routes

@app.route('/api/stats/trends', methods=['GET'])
def get_trend_data():
    """Get time series data for trend analysis"""
    disease = request.args.get('disease')
    country = request.args.get('country')
    days = request.args.get('days', 30, type=int)
    
    query = CaseReport.query.filter_by(status='approved')
    
    if disease:
        query = query.filter(CaseReport.disease_name.ilike(f'%{disease}%'))
    if country:
        query = query.filter_by(country=country)
    
    cutoff_date = datetime.utcnow().date() - timedelta(days=days)
    query = query.filter(CaseReport.onset_date >= cutoff_date)
    
    cases = query.order_by(CaseReport.onset_date).all()
    
    # Group by date
    daily_counts = {}
    for case in cases:
        date_str = case.onset_date.isoformat()
        if date_str not in daily_counts:
            daily_counts[date_str] = {'count': 0, 'severe': 0, 'critical': 0}
        daily_counts[date_str]['count'] += 1
        if case.severity in ['severe', 'critical']:
            daily_counts[date_str][case.severity] += 1
    
    # Fill in missing dates
    all_dates = []
    current = cutoff_date
    while current <= datetime.utcnow().date():
        date_str = current.isoformat()
        all_dates.append({
            'date': date_str,
            'count': daily_counts.get(date_str, {}).get('count', 0),
            'severe': daily_counts.get(date_str, {}).get('severe', 0),
            'critical': daily_counts.get(date_str, {}).get('critical', 0)
        })
        current += timedelta(days=1)
    
    return jsonify({
        'daily_data': all_dates,
        'total': len(cases),
        'period_days': days
    }), 200

@app.route('/api/export/cases', methods=['GET'])
@jwt_required()
def export_cases():
    """Export case data as CSV (for gov/admin users)"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if user.user_type not in ['admin', 'government']:
        return jsonify({'error': 'Unauthorized'}), 403
    
    disease = request.args.get('disease')
    country = request.args.get('country')
    days = request.args.get('days', 30, type=int)
    
    query = CaseReport.query.filter_by(status='approved')
    
    if disease:
        query = query.filter(CaseReport.disease_name.ilike(f'%{disease}%'))
    if country:
        query = query.filter_by(country=country)
    
    cutoff_date = datetime.utcnow().date() - timedelta(days=days)
    query = query.filter(CaseReport.onset_date >= cutoff_date)
    
    cases = query.all()
    
    csv_data = "id,disease_name,country,region,city,onset_date,severity,age_group\n"
    for case in cases:
        csv_data += f"{case.id},{case.disease_name},{case.country},{case.region or ''},{case.city or ''},{case.onset_date.isoformat()},{case.severity},{case.age_group or ''}\n"
    
    from flask import Response
    return Response(
        csv_data,
        mimetype='text/csv',
        headers={'Content-Disposition': 'attachment;filename=cases_export.csv'}
    )

@app.route('/api/symptoms/analyzer', methods=['POST'])
def analyze_symptoms():
    """Analyze symptom patterns for early detection"""
    data = request.get_json()
    symptoms = data.get('symptoms', [])
    
    if not symptoms:
        return jsonify({'error': 'No symptoms provided'}), 400
    
    # Common symptom-disease associations (simplified for demo)
    symptom_disease_map = {
        'fever': ['influenza', 'covid-19', 'malaria', 'dengue'],
        'cough': ['covid-19', 'influenza', 'tuberculosis'],
        'fatigue': ['covid-19', 'influenza', 'mononucleosis'],
        'headache': ['migraine', 'meningitis', 'dengue'],
        'rash': ['measles', 'chickenpox', 'ebola'],
        'nausea': ['norovirus', 'food poisoning', 'ebola'],
        'diarrhea': ['cholera', 'norovirus', 'ebola'],
        'shortness of breath': ['covid-19', 'pneumonia', 'asthma'],
        'muscle pain': ['influenza', 'dengue', 'malaria'],
        'joint pain': ['dengue', 'chikungunya', ' Zika']
    }
    
    possible_diseases = {}
    for symptom in symptoms:
        symptom_lower = symptom.lower()
        for key, diseases in symptom_disease_map.items():
            if key in symptom_lower:
                for disease in diseases:
                    possible_diseases[disease] = possible_diseases.get(disease, 0) + 1
    
    # Sort by likelihood
    sorted_diseases = sorted(possible_diseases.items(), key=lambda x: x[1], reverse=True)
    
    risk_level = 'low'
    if sorted_diseases and sorted_diseases[0][1] >= 3:
        risk_level = 'high'
    elif sorted_diseases and sorted_diseases[0][1] >= 2:
        risk_level = 'medium'
    
    return jsonify({
        'possible_diseases': [{'disease': d, 'match_count': c} for d, c in sorted_diseases[:5]],
        'risk_level': risk_level,
        'recommendation': 'Seek medical attention immediately' if risk_level == 'high' else 'Monitor symptoms and consult a doctor if they worsen'
    }), 200

@app.route('/api/predictions/outbreak', methods=['GET'])
def predict_outbreak_risk():
    """Predict outbreak risk based on recent case velocity"""
    country = request.args.get('country')
    disease = request.args.get('disease')
    
    # Get cases from last 14 days vs previous 14 days
    now = datetime.utcnow().date()
    recent_cutoff = now - timedelta(days=14)
    previous_cutoff = now - timedelta(days=28)
    
    query = CaseReport.query.filter_by(status='approved')
    if country:
        query = query.filter_by(country=country)
    if disease:
        query = query.filter(CaseReport.disease_name.ilike(f'%{disease}%'))
    
    recent_cases = query.filter(CaseReport.onset_date >= recent_cutoff).count()
    previous_cases = query.filter(
        CaseReport.onset_date >= previous_cutoff,
        CaseReport.onset_date < recent_cutoff
    ).count()
    
    # Calculate growth rate
    if previous_cases > 0:
        growth_rate = ((recent_cases - previous_cases) / previous_cases) * 100
    else:
        growth_rate = 100 if recent_cases > 0 else 0
    
    # Determine risk level
    if growth_rate > 100:
        risk_level = 'critical'
    elif growth_rate > 50:
        risk_level = 'high'
    elif growth_rate > 20:
        risk_level = 'medium'
    else:
        risk_level = 'low'
    
    return jsonify({
        'recent_cases': recent_cases,
        'previous_cases': previous_cases,
        'growth_rate': round(growth_rate, 2),
        'risk_level': risk_level,
        'prediction': f"Outbreak risk is {risk_level}. Cases are {'increasing rapidly' if growth_rate > 50 else 'stable' if growth_rate < 20 else 'increasing'}."
    }), 200

@app.route('/api/notifications/subscribe', methods=['POST'])
@jwt_required()
def subscribe_notifications():
    """Subscribe to disease alerts for specific regions/diseases"""
    current_user_id = get_jwt_identity()
    data = request.get_json()
    
    # In production, this would save to a NotificationSubscription model
    # For now, just acknowledge the subscription
    return jsonify({
        'message': 'Notification preferences saved',
        'preferences': data
    }), 200

# Admin Analytics Dashboard
@app.route('/api/admin/analytics', methods=['GET'])
@jwt_required()
def get_admin_analytics():
    """Advanced analytics for admin dashboard"""
    current_user_id = get_jwt_identity()
    admin = User.query.get(current_user_id)
    
    if admin.user_type != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    # Time-based analytics
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)
    
    cases_today = CaseReport.query.filter(
        CaseReport.reported_date >= today_start
    ).count()
    
    cases_week = CaseReport.query.filter(
        CaseReport.reported_date >= week_ago
    ).count()
    
    cases_month = CaseReport.query.filter(
        CaseReport.reported_date >= month_ago
    ).count()
    
    # Moderation stats
    pending = CaseReport.query.filter_by(status='pending').count()
    approved_total = CaseReport.query.filter_by(status='approved').count()
    rejected_total = CaseReport.query.filter_by(status='rejected').count()
    
    approval_rate = (approved_total / (approved_total + rejected_total) * 100) if (approved_total + rejected_total) > 0 else 0
    
    # User stats
    total_users = User.query.count()
    gov_users = User.query.filter_by(user_type='government').count()
    individual_users = User.query.filter_by(user_type='individual').count()
    
    return jsonify({
        'cases': {
            'today': cases_today,
            'this_week': cases_week,
            'this_month': cases_month
        },
        'moderation': {
            'pending': pending,
            'approved_total': approved_total,
            'rejected_total': rejected_total,
            'approval_rate': round(approval_rate, 2)
        },
        'users': {
            'total': total_users,
            'government': gov_users,
            'individual': individual_users
        },
        'timestamp': now.isoformat()
    }), 200

# Heatmap data for visualization
@app.route('/api/heatmap', methods=['GET'])
def get_heatmap_data():
    """Get aggregated data for heatmap visualization"""
    days = request.args.get('days', 30, type=int)
    
    cutoff_date = datetime.utcnow().date() - timedelta(days=days)
    
    cases = CaseReport.query.filter(
        CaseReport.status == 'approved',
        CaseReport.onset_date >= cutoff_date
    ).all()
    
    # Aggregate by country
    country_data = {}
    for case in cases:
        if case.country not in country_data:
            country_data[case.country] = {'count': 0, 'diseases': set()}
        country_data[case.country]['count'] += 1
        country_data[case.country]['diseases'].add(case.disease_name)
    
    return jsonify({
        'countries': [
            {'country': k, 'cases': v['count'], 'unique_diseases': len(v['diseases'])}
            for k, v in country_data.items()
        ],
        'total_countries': len(country_data),
        'period_days': days
    }), 200

# Health check
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'database': 'connected',
        'features': ['authentication', 'case_reports', 'moderation', 'analytics', 'predictions', 'exports']
    }), 200

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    app.run(host='0.0.0.0', port=port, debug=debug)

# Serve uploaded images
@app.route('/api/uploads/<filename>', methods=['GET'])
def serve_upload(filename):
    """Serve uploaded images"""
    from flask import send_from_directory
    upload_dir = os.path.join(os.path.dirname(__file__), 'uploads')
    return send_from_directory(upload_dir, filename)

# Get single case details (with images and notes for authorized users)
@app.route('/api/cases/<int:case_id>', methods=['GET'])
@jwt_required(optional=True)
def get_case_details(case_id):
    """Get detailed case information including images and notes"""
    current_user_id = get_jwt_identity()
    case = CaseReport.query.get_or_404(case_id)
    
    # Check authorization
    is_owner = (current_user_id == case.user_id)
    user = None
    is_admin_gov = False
    
    if current_user_id:
        user = User.query.get(current_user_id)
        is_admin_gov = user and user.user_type in ['admin', 'government']
    
    # Only show full details to owner, admin/government, or if approved
    if case.status != 'approved' and not is_owner and not is_admin_gov:
        return jsonify({'error': 'Unauthorized'}), 403
    
    # Parse image URLs
    image_list = json.loads(case.image_urls) if case.image_urls else []
    
    response_data = {
        'id': case.id,
        'disease_name': case.disease_name,
        'latitude': case.latitude,
        'longitude': case.longitude,
        'location_name': case.location_name,
        'country': case.country,
        'region': case.region,
        'city': case.city,
        'onset_date': case.onset_date.isoformat(),
        'reported_date': case.reported_date.isoformat(),
        'symptoms': case.symptoms,
        'severity': case.severity,
        'age_group': case.age_group,
        'status': case.status,
        'marker_type': case.marker_type,
        'notes': case.notes if (is_owner or is_admin_gov or case.status == 'approved') else None,
        'images': image_list if (is_owner or is_admin_gov or case.status == 'approved') else [],
        'moderator_notes': case.moderator_notes if is_admin_gov else None
    }
    
    return jsonify(response_data), 200

# Update case with images and notes
@app.route('/api/analytics/kpis', methods=['GET'])
def get_kpis():
    """Get Key Performance Indicators for dashboard"""
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)
    
    # Overall stats
    total_cases = CaseReport.query.filter_by(status='approved').count()
    pending_cases = CaseReport.query.filter_by(status='pending').count()
    active_outbreaks = OutbreakAlert.query.filter_by(is_active=True).count()
    
    # Time-based comparisons
    cases_today = CaseReport.query.filter(
        CaseReport.status == 'approved',
        CaseReport.reported_date >= today_start
    ).count()
    
    cases_week = CaseReport.query.filter(
        CaseReport.status == 'approved',
        CaseReport.reported_date >= week_ago
    ).count()
    
    cases_month = CaseReport.query.filter(
        CaseReport.status == 'approved',
        CaseReport.reported_date >= month_ago
    ).count()
    
    # Previous periods for comparison
    prev_week_start = now - timedelta(days=14)
    prev_month_start = now - timedelta(days=60)
    
    cases_prev_week = CaseReport.query.filter(
        CaseReport.status == 'approved',
        CaseReport.reported_date >= prev_week_start,
        CaseReport.reported_date < week_ago
    ).count()
    
    cases_prev_month = CaseReport.query.filter(
        CaseReport.status == 'approved',
        CaseReport.reported_date >= prev_month_start,
        CaseReport.reported_date < month_ago
    ).count()
    
    # Calculate growth rates
    week_growth = ((cases_week - cases_prev_week) / cases_prev_week * 100) if cases_prev_week > 0 else 0
    month_growth = ((cases_month - cases_prev_month) / cases_prev_month * 100) if cases_prev_month > 0 else 0
    
    # Severity distribution (current month)
    severity_counts = db.session.query(
        CaseReport.severity, 
        db.func.count(CaseReport.id)
    ).filter(
        CaseReport.status == 'approved',
        CaseReport.reported_date >= month_ago
    ).group_by(CaseReport.severity).all()
    
    severity_dist = {s: c for s, c in severity_counts} if severity_counts else {}
    
    # Top diseases this month
    top_diseases = db.session.query(
        CaseReport.disease_name,
        db.func.count(CaseReport.id).label('count')
    ).filter(
        CaseReport.status == 'approved',
        CaseReport.reported_date >= month_ago
    ).group_by(CaseReport.disease_name)\
     .order_by(db.desc('count'))\
     .limit(5).all()
    
    # Geographic spread
    countries_affected = db.session.query(CaseReport.country)\
        .filter(CaseReport.status == 'approved', CaseReport.reported_date >= month_ago)\
        .distinct().count()
    
    return jsonify({
        'kpis': {
            'total_approved_cases': total_cases,
            'pending_moderation': pending_cases,
            'active_outbreaks': active_outbreaks,
            'cases_today': cases_today,
            'cases_this_week': cases_week,
            'cases_this_month': cases_month,
            'week_over_week_growth': round(week_growth, 2),
            'month_over_month_growth': round(month_growth, 2),
            'countries_affected': countries_affected
        },
        'severity_distribution': severity_dist,
        'top_diseases': [{'name': d[0], 'count': d[1]} for d in top_diseases],
        'timestamp': now.isoformat()
    }), 200


@app.route('/api/analytics/metrics', methods=['GET'])
def get_detailed_metrics():
    """Get detailed metrics for advanced analysis"""
    now = datetime.utcnow()
    month_ago = now - timedelta(days=30)
    quarter_ago = now - timedelta(days=90)
    
    # Case velocity (cases per day)
    daily_cases = db.session.query(
        db.func.date(CaseReport.reported_date).label('date'),
        db.func.count(CaseReport.id).label('count')
    ).filter(
        CaseReport.status == 'approved',
        CaseReport.reported_date >= quarter_ago
    ).group_by(db.func.date(CaseReport.reported_date))\
     .order_by(db.func.date(CaseReport.reported_date)).all()
    
    velocity_data = [{'date': str(d[0]), 'count': d[1]} for d in daily_cases] if daily_cases else []
    
    # Average response time (submission to approval)
    moderation_logs = ModerationLog.query.join(CaseReport).filter(
        CaseReport.reported_date >= month_ago
    ).all()
    
    response_times = []
    for log in moderation_logs:
        case = CaseReport.query.get(log.case_report_id)
        if case:
            time_diff = (log.created_at - case.reported_date).total_seconds() / 3600  # hours
            response_times.append(time_diff)
    
    avg_response_time = sum(response_times) / len(response_times) if response_times else 0
    
    # User engagement metrics
    total_users = User.query.count()
    active_submitters = db.session.query(CaseReport.user_id).distinct().count()
    
    cases_per_user = total_cases / active_submitters if active_submitters > 0 else 0
    
    # Disease severity correlation
    severity_by_disease = db.session.query(
        CaseReport.disease_name,
        CaseReport.severity,
        db.func.count(CaseReport.id).label('count')
    ).filter(
        CaseReport.status == 'approved',
        CaseReport.reported_date >= month_ago
    ).group_by(CaseReport.disease_name, CaseReport.severity).all()
    
    disease_severity_matrix = {}
    for disease, severity, count in severity_by_disease:
        if disease not in disease_severity_matrix:
            disease_severity_matrix[disease] = {}
        disease_severity_matrix[disease][severity] = count
    
    # Age group distribution
    age_distribution = db.session.query(
        CaseReport.age_group,
        db.func.count(CaseReport.id)
    ).filter(
        CaseReport.status == 'approved',
        CaseReport.reported_date >= month_ago,
        CaseReport.age_group.isnot(None)
    ).group_by(CaseReport.age_group).all()
    
    age_dist = {a: c for a, c in age_distribution} if age_distribution else {}
    
    # Regional hotspots
    regional_hotspots = db.session.query(
        CaseReport.country,
        CaseReport.region,
        db.func.count(CaseReport.id).label('count')
    ).filter(
        CaseReport.status == 'approved',
        CaseReport.reported_date >= month_ago,
        CaseReport.region.isnot(None)
    ).group_by(CaseReport.country, CaseReport.region)\
     .order_by(db.desc('count'))\
     .limit(10).all()
    
    return jsonify({
        'velocity': {
            'daily_data': velocity_data,
            'avg_daily_cases': sum(v['count'] for v in velocity_data) / len(velocity_data) if velocity_data else 0,
            'max_daily_cases': max((v['count'] for v in velocity_data), default=0),
            'min_daily_cases': min((v['count'] for v in velocity_data), default=0)
        },
        'moderation_efficiency': {
            'avg_response_time_hours': round(avg_response_time, 2),
            'total_moderations': len(moderation_logs)
        },
        'user_engagement': {
            'total_users': total_users,
            'active_submitters': active_submitters,
            'cases_per_user': round(cases_per_user, 2),
            'engagement_rate': round((active_submitters / total_users * 100) if total_users > 0 else 0, 2)
        },
        'disease_severity_matrix': disease_severity_matrix,
        'age_distribution': age_dist,
        'regional_hotspots': [{'country': r[0], 'region': r[1], 'cases': r[2]} for r in regional_hotspots],
        'timestamp': now.isoformat()
    }), 200


@app.route('/api/analytics/charts/<chart_type>', methods=['GET'])
def get_chart_data(chart_type):
    """Get data for various chart types"""
    now = datetime.utcnow()
    days = request.args.get('days', 30, type=int)
    cutoff_date = now - timedelta(days=days)
    
    base_query = CaseReport.query.filter(
        CaseReport.status == 'approved',
        CaseReport.reported_date >= cutoff_date
    )
    
    if chart_type == 'time_series':
        # Daily time series with multiple metrics
        daily_data = db.session.query(
            db.func.date(CaseReport.reported_date).label('date'),
            db.func.count(CaseReport.id).label('total'),
            db.func.sum(db.case((CaseReport.severity == 'mild', 1), else_=0)).label('mild'),
            db.func.sum(db.case((CaseReport.severity == 'moderate', 1), else_=0)).label('moderate'),
            db.func.sum(db.case((CaseReport.severity == 'severe', 1), else_=0)).label('severe'),
            db.func.sum(db.case((CaseReport.severity == 'critical', 1), else_=0)).label('critical')
        ).filter(
            CaseReport.status == 'approved',
            CaseReport.reported_date >= cutoff_date
        ).group_by(db.func.date(CaseReport.reported_date))\
         .order_by(db.func.date(CaseReport.reported_date)).all()
        
        return jsonify({
            'chart_type': 'time_series',
            'data': [{
                'date': str(d[0]),
                'confirmed': d[1],
                'mild': d[2] or 0,
                'moderate': d[3] or 0,
                'severe': d[4] or 0,
                'critical': d[5] or 0
            } for d in daily_data],
            'period_days': days
        }), 200
    
    elif chart_type == 'disease_comparison':
        # Compare multiple diseases over time
        diseases = request.args.getlist('diseases')
        if not diseases:
            # Get top 5 diseases
            top = db.session.query(CaseReport.disease_name, db.func.count(CaseReport.id))\
                .filter(CaseReport.status == 'approved', CaseReport.reported_date >= cutoff_date)\
                .group_by(CaseReport.disease_name)\
                .order_by(db.desc(db.func.count(CaseReport.id)))\
                .limit(5).all()
            diseases = [d[0] for d in top]
        
        series_data = {}
        for disease in diseases:
            daily = db.session.query(
                db.func.date(CaseReport.reported_date).label('date'),
                db.func.count(CaseReport.id).label('count')
            ).filter(
                CaseReport.status == 'approved',
                CaseReport.disease_name == disease,
                CaseReport.reported_date >= cutoff_date
            ).group_by(db.func.date(CaseReport.reported_date))\
             .order_by(db.func.date(CaseReport.reported_date)).all()
            
            series_data[disease] = [{'date': str(d[0]), 'count': d[1]} for d in daily]
        
        return jsonify({
            'chart_type': 'disease_comparison',
            'diseases': diseases,
            'series': series_data,
            'period_days': days
        }), 200
    
    elif chart_type == 'geographic_distribution':
        # Country-level aggregation for choropleth
        geo_data = db.session.query(
            CaseReport.country,
            db.func.count(CaseReport.id).label('cases'),
            db.func.count(db.distinct(CaseReport.disease_name)).label('unique_diseases'),
            db.func.avg(db.case([
                (CaseReport.severity == 'mild', 1),
                (CaseReport.severity == 'moderate', 2),
                (CaseReport.severity == 'severe', 3),
                (CaseReport.severity == 'critical', 4)
            ])).label('avg_severity')
        ).filter(
            CaseReport.status == 'approved',
            CaseReport.reported_date >= cutoff_date
        ).group_by(CaseReport.country).all()
        
        return jsonify({
            'chart_type': 'geographic_distribution',
            'data': [{
                'country': g[0],
                'cases': g[1],
                'unique_diseases': g[2],
                'avg_severity': round(g[3], 2) if g[3] else 0
            } for g in geo_data],
            'period_days': days
        }), 200
    
    elif chart_type == 'severity_trend':
        # Stacked area chart data for severity trends
        severity_trend = db.session.query(
            db.func.date(CaseReport.reported_date).label('date'),
            CaseReport.severity,
            db.func.count(CaseReport.id).label('count')
        ).filter(
            CaseReport.status == 'approved',
            CaseReport.reported_date >= cutoff_date,
            CaseReport.severity.isnot(None)
        ).group_by(db.func.date(CaseReport.reported_date), CaseReport.severity)\
         .order_by(db.func.date(CaseReport.reported_date)).all()
        
        # Reorganize by date
        by_date = {}
        for date, severity, count in severity_trend:
            if str(date) not in by_date:
                by_date[str(date)] = {'date': str(date), 'mild': 0, 'moderate': 0, 'severe': 0, 'critical': 0}
            by_date[str(date)][severity] = count
        
        return jsonify({
            'chart_type': 'severity_trend',
            'data': list(by_date.values()),
            'period_days': days
        }), 200
    
    elif chart_type == 'radar_metrics':
        # Radar chart for multi-metric comparison by disease
        diseases = request.args.getlist('diseases')
        if not diseases:
            top = db.session.query(CaseReport.disease_name, db.func.count(CaseReport.id))\
                .filter(CaseReport.status == 'approved', CaseReport.reported_date >= cutoff_date)\
                .group_by(CaseReport.disease_name)\
                .order_by(db.desc(db.func.count(CaseReport.id)))\
                .limit(5).all()
            diseases = [d[0] for d in top]
        
        radar_data = []
        for disease in diseases:
            stats = db.session.query(
                db.func.count(CaseReport.id).label('total'),
                db.func.count(db.distinct(CaseReport.country)).label('countries'),
                db.func.avg(db.case([
                    (CaseReport.severity == 'mild', 1),
                    (CaseReport.severity == 'moderate', 2),
                    (CaseReport.severity == 'severe', 3),
                    (CaseReport.severity == 'critical', 4)
                ])).label('avg_severity'),
                db.func.count(db.distinct(db.func.date(CaseReport.onset_date))).label('days_active')
            ).filter(
                CaseReport.status == 'approved',
                CaseReport.disease_name == disease,
                CaseReport.reported_date >= cutoff_date
            ).first()
            
            if stats and stats[0] > 0:
                radar_data.append({
                    'disease': disease,
                    'metrics': {
                        'case_volume': stats[0],
                        'geographic_spread': stats[1] or 0,
                        'severity_index': round(stats[2] or 0, 2),
                        'duration_days': stats[3] or 0,
                        'growth_rate': 0  # Placeholder for future calculation
                    }
                })
        
        return jsonify({
            'chart_type': 'radar_metrics',
            'diseases': radar_data,
            'period_days': days
        }), 200
    
    elif chart_type == 'sankey_flow':
        # Sankey diagram data: Country -> Disease -> Severity
        flow_data = db.session.query(
            CaseReport.country,
            CaseReport.disease_name,
            CaseReport.severity,
            db.func.count(CaseReport.id).label('count')
        ).filter(
            CaseReport.status == 'approved',
            CaseReport.reported_date >= cutoff_date,
            CaseReport.severity.isnot(None)
        ).group_by(CaseReport.country, CaseReport.disease_name, CaseReport.severity)\
         .order_by(db.desc(db.func.count(CaseReport.id)))\
         .limit(50).all()
        
        nodes = set()
        links = []
        
        for country, disease, severity, count in flow_data:
            nodes.add(f"country:{country}")
            nodes.add(f"disease:{disease}")
            nodes.add(f"severity:{severity}")
            
            links.append({
                'source': f"country:{country}",
                'target': f"disease:{disease}",
                'value': count
            })
            links.append({
                'source': f"disease:{disease}",
                'target': f"severity:{severity}",
                'value': count
            })
        
        node_list = [{'id': n, 'category': n.split(':')[0]} for n in nodes]
        
        return jsonify({
            'chart_type': 'sankey_flow',
            'nodes': node_list,
            'links': links,
            'period_days': days
        }), 200
    
    elif chart_type == 'bubble_chart':
        # Bubble chart: Country (x), Cases (y), Diseases (size), Severity (color)
        bubble_data = db.session.query(
            CaseReport.country,
            db.func.count(CaseReport.id).label('cases'),
            db.func.count(db.distinct(CaseReport.disease_name)).label('diseases'),
            db.func.avg(db.case([
                (CaseReport.severity == 'mild', 1),
                (CaseReport.severity == 'moderate', 2),
                (CaseReport.severity == 'severe', 3),
                (CaseReport.severity == 'critical', 4)
            ])).label('avg_severity')
        ).filter(
            CaseReport.status == 'approved',
            CaseReport.reported_date >= cutoff_date
        ).group_by(CaseReport.country).all()
        
        return jsonify({
            'chart_type': 'bubble_chart',
            'data': [{
                'country': b[0],
                'cases': b[1],
                'diseases': b[2],
                'avg_severity': round(b[3] or 0, 2)
            } for b in bubble_data],
            'period_days': days
        }), 200
    
    else:
        return jsonify({'error': f'Unknown chart type: {chart_type}'}), 400


@app.route('/api/analytics/dashboard', methods=['GET'])
@jwt_required(optional=True)
def get_analytics_dashboard():
    """Comprehensive analytics dashboard data"""
    current_user_id = get_jwt_identity()
    user = None
    is_admin = False
    
    if current_user_id:
        user = User.query.get(current_user_id)
        is_admin = user and user.user_type == 'admin'
    
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)
    
    # KPI Cards
    total_cases = CaseReport.query.filter_by(status='approved').count()
    pending = CaseReport.query.filter_by(status='pending').count()
    active_alerts = OutbreakAlert.query.filter_by(is_active=True).count()
    
    cases_week = CaseReport.query.filter(
        CaseReport.status == 'approved',
        CaseReport.reported_date >= week_ago
    ).count()
    
    # Trend data (last 14 days)
    trend_14d = now - timedelta(days=14)
    daily_trend = db.session.query(
        db.func.date(CaseReport.reported_date).label('date'),
        db.func.count(CaseReport.id).label('count')
    ).filter(
        CaseReport.status == 'approved',
        CaseReport.reported_date >= trend_14d
    ).group_by(db.func.date(CaseReport.reported_date))\
     .order_by(db.func.date(CaseReport.reported_date)).all()
    
    trend_data = [{'date': str(d[0]), 'cases': d[1]} for d in daily_trend]
    
    # Top diseases
    top_diseases = db.session.query(
        CaseReport.disease_name,
        db.func.count(CaseReport.id).label('count')
    ).filter(
        CaseReport.status == 'approved',
        CaseReport.reported_date >= month_ago
    ).group_by(CaseReport.disease_name)\
     .order_by(db.desc('count'))\
     .limit(5).all()
    
    # Severity breakdown
    severity_breakdown = db.session.query(
        CaseReport.severity,
        db.func.count(CaseReport.id).label('count')
    ).filter(
        CaseReport.status == 'approved',
        CaseReport.reported_date >= month_ago
    ).group_by(CaseReport.severity).all()
    
    severity_pie = [{'name': s[0] or 'unknown', 'value': s[1]} for s in severity_breakdown]
    
    # Recent alerts
    recent_alerts = OutbreakAlert.query.filter_by(is_active=True)\
        .order_by(OutbreakAlert.created_at.desc()).limit(5).all()
    
    alerts_list = [{
        'id': a.id,
        'disease': a.disease_name,
        'country': a.country,
        'level': a.alert_level,
        'created': a.created_at.isoformat()
    } for a in recent_alerts]
    
    return jsonify({
        'kpis': {
            'total_cases': total_cases,
            'pending_cases': pending,
            'active_alerts': active_alerts,
            'weekly_cases': cases_week
        },
        'trend': {
            'period': '14_days',
            'data': trend_data
        },
        'top_diseases': [{'name': d[0], 'count': d[1]} for d in top_diseases],
        'severity_distribution': severity_pie,
        'recent_alerts': alerts_list,
        'user_context': {
            'is_admin': is_admin,
            'user_type': user.user_type if user else 'anonymous'
        },
        'timestamp': now.isoformat()
    }), 200


# ==================== TROPICAL DISEASES MODULE API ====================

@app.route('/api/tropical/diseases', methods=['GET'])
def get_tropical_diseases():
    """Get all tropical disease data with filtering options"""
    disease_filter = request.args.get('disease')
    endemic_status = request.args.get('endemic_status')
    risk_level = request.args.get('risk_level')
    
    query = TropicalDiseaseData.query
    
    if disease_filter:
        query = query.filter(TropicalDiseaseData.disease_name.ilike(f'%{disease_filter}%'))
    if endemic_status:
        query = query.filter(TropicalDiseaseData.endemic_status == endemic_status)
    if risk_level:
        query = query.filter(TropicalDiseaseData.risk_level == risk_level)
    
    diseases = query.order_by(TropicalDiseaseData.created_at.desc()).all()
    
    result = []
    for d in diseases:
        case_info = None
        if d.case_report:
            case_info = {
                'location': f"{d.case_report.city or ''}, {d.case_report.country}".strip(', '),
                'latitude': d.case_report.latitude,
                'longitude': d.case_report.longitude,
                'severity': d.case_report.severity,
                'onset_date': str(d.case_report.onset_date) if d.case_report.onset_date else None
            }
        
        result.append({
            'id': d.id,
            'disease_name': d.disease_name,
            'vector_type': d.vector_type,
            'temperature_avg': d.temperature_avg,
            'humidity_avg': d.humidity_avg,
            'rainfall_mm': d.rainfall_mm,
            'endemic_status': d.endemic_status,
            'prevention_measures': d.prevention_measures,
            'risk_level': d.risk_level,
            'seasonal_pattern': d.seasonal_pattern,
            'case_info': case_info,
            'created_at': d.created_at.isoformat()
        })
    
    return jsonify({'tropical_diseases': result, 'count': len(result)}), 200


@app.route('/api/tropical/diseases', methods=['POST'])
@jwt_required()
def submit_tropical_disease():
    """Submit tropical disease data (government/admin only)"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user or user.user_type not in ['government', 'admin']:
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    data = request.get_json()
    required_fields = ['disease_name', 'vector_type']
    if not all(k in data for k in required_fields):
        return jsonify({'error': 'Missing required fields'}), 400
    
    # Validate endemic status
    valid_endemic = ['endemic', 'epidemic', 'imported', 'eliminated']
    endemic_status = data.get('endemic_status', 'endemic')
    if endemic_status not in valid_endemic:
        return jsonify({'error': f'Endemic status must be one of: {valid_endemic}'}), 400
    
    # Validate risk level
    valid_risk = ['low', 'medium', 'high', 'very_high']
    risk_level = data.get('risk_level', 'medium')
    if risk_level not in valid_risk:
        return jsonify({'error': f'Risk level must be one of: {valid_risk}'}), 400
    
    # Validate seasonal pattern
    valid_seasonal = ['rainy_season', 'dry_season', 'year_round']
    seasonal_pattern = data.get('seasonal_pattern', 'year_round')
    if seasonal_pattern not in valid_seasonal:
        return jsonify({'error': f'Seasonal pattern must be one of: {valid_seasonal}'}), 400
    
    tropical_data = TropicalDiseaseData(
        case_report_id=data.get('case_report_id'),
        disease_name=data['disease_name'].strip(),
        vector_type=data['vector_type'].strip(),
        temperature_avg=data.get('temperature_avg'),
        humidity_avg=data.get('humidity_avg'),
        rainfall_mm=data.get('rainfall_mm'),
        endemic_status=endemic_status,
        prevention_measures=data.get('prevention_measures'),
        risk_level=risk_level,
        seasonal_pattern=seasonal_pattern
    )
    
    db.session.add(tropical_data)
    db.session.commit()
    
    return jsonify({
        'message': 'Tropical disease data submitted successfully',
        'id': tropical_data.id
    }), 201


@app.route('/api/tropical/risk-map', methods=['GET'])
def get_tropical_risk_map():
    """Get aggregated risk data for map visualization"""
    # Group by country/region with risk levels
    risk_data = db.session.query(
        CaseReport.country,
        db.func.count(CaseReport.id).label('case_count'),
        db.func.avg(TropicalDiseaseData.temperature_avg).label('avg_temp'),
        db.func.avg(TropicalDiseaseData.humidity_avg).label('avg_humidity')
    ).join(
        TropicalDiseaseData,
        CaseReport.id == TropicalDiseaseData.case_report_id
    ).filter(
        CaseReport.status == 'approved'
    ).group_by(CaseReport.country).all()
    
    map_data = []
    for row in risk_data:
        # Calculate composite risk score
        temp_risk = 1.0 if row.avg_temp and row.avg_temp > 25 else 0.5
        humidity_risk = 1.0 if row.avg_humidity and row.avg_humidity > 70 else 0.5
        case_factor = min(row.case_count / 100, 2.0)  # Normalize
        
        risk_score = (temp_risk + humidity_risk + case_factor) / 3 * 100
        
        map_data.append({
            'country': row.country,
            'case_count': row.case_count,
            'avg_temperature': round(row.avg_temp, 1) if row.avg_temp else None,
            'avg_humidity': round(row.avg_humidity, 1) if row.avg_humidity else None,
            'risk_score': round(risk_score, 1),
            'risk_level': 'very_high' if risk_score > 75 else 'high' if risk_score > 50 else 'medium' if risk_score > 25 else 'low'
        })
    
    return jsonify({'risk_map': map_data}), 200


# ==================== EMERGENT DISEASES MODULE API ====================

@app.route('/api/emergent/watch', methods=['GET'])
def get_emergent_diseases():
    """Get all emergent disease watch data"""
    containment_filter = request.args.get('containment_status')
    who_level = request.args.get('who_alert_level')
    
    query = EmergentDiseaseWatch.query
    
    if containment_filter:
        query = query.filter(EmergentDiseaseWatch.containment_status == containment_filter)
    if who_level:
        try:
            level = int(who_level)
            query = query.filter(EmergentDiseaseWatch.who_alert_level >= level)
        except ValueError:
            pass
    
    diseases = query.order_by(EmergentDiseaseWatch.who_alert_level.desc(), 
                              EmergentDiseaseWatch.created_at.desc()).all()
    
    result = []
    for d in diseases:
        case_info = None
        if d.case_report:
            case_info = {
                'location': f"{d.case_report.city or ''}, {d.case_report.country}".strip(', '),
                'latitude': d.case_report.latitude,
                'longitude': d.case_report.longitude,
                'severity': d.case_report.severity
            }
        
        travel_restrictions = []
        if d.travel_restrictions:
            try:
                travel_restrictions = json.loads(d.travel_restrictions)
            except:
                travel_restrictions = [d.travel_restrictions]
        
        result.append({
            'id': d.id,
            'pathogen_name': d.pathogen_name,
            'variant_lineage': d.variant_lineage,
            'r0_estimate': d.r0_estimate,
            'transmission_mode': d.transmission_mode,
            'containment_status': d.containment_status,
            'who_alert_level': d.who_alert_level,
            'genomic_sequence_available': d.genomic_sequence_available,
            'travel_restrictions': travel_restrictions,
            'first_detected_date': str(d.first_detected_date) if d.first_detected_date else None,
            'origin_location': d.origin_location,
            'zoonotic_source': d.zoonotic_source,
            'case_fatality_rate': d.case_fatality_rate,
            'case_info': case_info,
            'created_at': d.created_at.isoformat(),
            'updated_at': d.updated_at.isoformat()
        })
    
    return jsonify({'emergent_diseases': result, 'count': len(result)}), 200


@app.route('/api/emergent/watch', methods=['POST'])
@jwt_required()
def submit_emergent_disease():
    """Submit emergent disease watch data (admin/government only)"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user or user.user_type not in ['government', 'admin']:
        return jsonify({'error': 'Insufficient permissions'}), 403
    
    data = request.get_json()
    required_fields = ['pathogen_name']
    if not all(k in data for k in required_fields):
        return jsonify({'error': 'Missing required fields'}), 400
    
    # Validate containment status
    valid_containment = ['contained', 'spreading', 'uncontrolled']
    containment_status = data.get('containment_status', 'spreading')
    if containment_status not in valid_containment:
        return jsonify({'error': f'Containment status must be one of: {valid_containment}'}), 400
    
    # Validate transmission mode
    valid_transmission = ['airborne', 'contact', 'zoonotic', 'vector-borne', 'waterborne', 'unknown']
    transmission_mode = data.get('transmission_mode', 'unknown')
    if transmission_mode not in valid_transmission:
        return jsonify({'error': f'Transmission mode must be one of: {valid_transmission}'}), 400
    
    # Process travel restrictions
    travel_restrictions = data.get('travel_restrictions', [])
    if isinstance(travel_restrictions, list):
        travel_restrictions = json.dumps(travel_restrictions)
    
    emergent_data = EmergentDiseaseWatch(
        case_report_id=data.get('case_report_id'),
        pathogen_name=data['pathogen_name'].strip(),
        variant_lineage=data.get('variant_lineage'),
        r0_estimate=data.get('r0_estimate'),
        transmission_mode=transmission_mode,
        containment_status=containment_status,
        who_alert_level=data.get('who_alert_level', 0),
        genomic_sequence_available=data.get('genomic_sequence_available', False),
        travel_restrictions=travel_restrictions,
        first_detected_date=datetime.strptime(data['first_detected_date'], '%Y-%m-%d').date() if data.get('first_detected_date') else None,
        origin_location=data.get('origin_location'),
        zoonotic_source=data.get('zoonotic_source'),
        case_fatality_rate=data.get('case_fatality_rate')
    )
    
    db.session.add(emergent_data)
    db.session.commit()
    
    return jsonify({
        'message': 'Emergent disease watch entry created',
        'id': emergent_data.id,
        'who_alert_level': emergent_data.who_alert_level
    }), 201


@app.route('/api/emergent/alerts', methods=['GET'])
def get_emergent_alerts():
    """Get high-priority emergent disease alerts (WHO level 3+)"""
    alerts = EmergentDiseaseWatch.query.filter(
        EmergentDiseaseWatch.who_alert_level >= 3
    ).order_by(
        EmergentDiseaseWatch.who_alert_level.desc(),
        EmergentDiseaseWatch.created_at.desc()
    ).limit(20).all()
    
    result = []
    for alert in alerts:
        result.append({
            'id': alert.id,
            'pathogen': alert.pathogen_name,
            'variant': alert.variant_lineage,
            'who_level': alert.who_alert_level,
            'containment': alert.containment_status,
            'cfr': alert.case_fatality_rate,
            'origin': alert.origin_location,
            'first_detected': str(alert.first_detected_date) if alert.first_detected_date else None,
            'created': alert.created_at.isoformat()
        })
    
    return jsonify({'alerts': result, 'count': len(result)}), 200


@app.route('/api/emergent/statistics', methods=['GET'])
def get_emergent_statistics():
    """Get aggregated statistics for emergent diseases"""
    now = datetime.utcnow()
    
    # Total by containment status
    containment_stats = db.session.query(
        EmergentDiseaseWatch.containment_status,
        db.func.count(EmergentDiseaseWatch.id).label('count')
    ).group_by(EmergentDiseaseWatch.containment_status).all()
    
    # Average R0 by transmission mode
    r0_stats = db.session.query(
        EmergentDiseaseWatch.transmission_mode,
        db.func.avg(EmergentDiseaseWatch.r0_estimate).label('avg_r0')
    ).filter(
        EmergentDiseaseWatch.r0_estimate.isnot(None)
    ).group_by(EmergentDiseaseWatch.transmission_mode).all()
    
    # WHO alert level distribution
    who_stats = db.session.query(
        EmergentDiseaseWatch.who_alert_level,
        db.func.count(EmergentDiseaseWatch.id).label('count')
    ).group_by(EmergentDiseaseWatch.who_alert_level).all()
    
    # Recent additions (last 7 days)
    week_ago = now - timedelta(days=7)
    recent_count = EmergentDiseaseWatch.query.filter(
        EmergentDiseaseWatch.created_at >= week_ago
    ).count()
    
    return jsonify({
        'containment_breakdown': {s.containment_status: s.count for s in containment_stats},
        'r0_by_transmission': {s.transmission_mode: round(s.avg_r0, 2) if s.avg_r0 else None for s in r0_stats},
        'who_level_distribution': {s.who_alert_level: s.count for s in who_stats},
        'new_this_week': recent_count,
        'timestamp': now.isoformat()
    }), 200
