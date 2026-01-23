from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import os

app = Flask(__name__)
# Enable CORS for all domains on all routes
CORS(app)

# Database Configuration
# Using the connection string from the previous files
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://postgres:9979@localhost:5432/UrbanEase'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# --- Models ---
class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password = db.Column(db.Text, nullable=False)
    account_type = db.Column(db.String(20), nullable=False)

# --- Helper Functions ---
def get_user_by_email(email):
    return User.query.filter_by(email=email).first()

def create_user(email, password, account_type):
    try:
        new_user = User(
            email=email,
            password=password, # Storing as-is per requirements (no hashing)
            account_type=account_type
        )
        db.session.add(new_user)
        db.session.commit()
        return new_user
    except Exception as e:
        db.session.rollback()
        raise e

# --- Global CORS Handling ---
@app.after_request
def after_request(response):
    # Ensure CORS headers are present even for error responses or specific preflight cases
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

# --- Routes ---

@app.route('/login', methods=['POST', 'OPTIONS'])
def login():
    if request.method == 'OPTIONS':
        return jsonify({'status': 'OK'}), 200

    data = request.get_json()
    
    if not data:
        return jsonify({'success': False, 'message': 'No data provided'}), 400
        
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({'success': False, 'message': 'Invalid email or password'}), 200

    user = get_user_by_email(email)
    
    # Direct password comparison as per requirements
    if not user or user.password != password:
        return jsonify({
            'success': False,
            'message': 'Invalid email or password'
        }), 200
        
    return jsonify({
        'success': True,
        'account_type': user.account_type
    }), 200

@app.route('/signup', methods=['POST', 'OPTIONS'])
def signup():
    if request.method == 'OPTIONS':
        return jsonify({'status': 'OK'}), 200
        
    data = request.get_json()
    
    if not data:
        return jsonify({'success': False, 'message': 'No data provided'}), 400
        
    email = data.get('email')
    password = data.get('password')
    account_type = data.get('account_type')
    
    if not all([email, password, account_type]):
        return jsonify({'success': False, 'message': 'Missing required fields'}), 400
        
    # Check if user already exists
    if get_user_by_email(email):
        return jsonify({'success': False, 'message': 'Email already exists'}), 400
        
    try:
        create_user(email, password, account_type)
        return jsonify({'success': True, 'account_type': account_type}), 201
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

if __name__ == '__main__':
    # Running on port 5000 as the primary common port
    app.run(debug=True, port=5000)
