from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_mail import Mail, Message
from dotenv import load_dotenv
import os
import random

# Load environment variables from .env file
dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(dotenv_path)

app = Flask(__name__)
# Enable CORS for all domains on all routes 
CORS(app, resources={r"/*": {"origins": "*"}})

# Global storage for OTP and registration data (For Testing Only)
# WARNING: This is not thread-safe and supports only one active signup at a time.
temp_storage = {
    'otp': None,
    'user_data': None
}

# Database Configuration
# Using SQLite for local development
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///UrbanEase.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# Create tables if they don't exist
with app.app_context():
    db.create_all()

# Mail Configuration
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USE_SSL'] = False
app.config['MAIL_USERNAME'] = os.environ.get('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.environ.get('MAIL_PASSWORD')
app.config['MAIL_DEFAULT_SENDER'] = 'krishnajadav1013@gmail.com'


mail = Mail(app)

# --- Models ---
class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(15), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password = db.Column(db.Text, nullable=False)
    account_type = db.Column(db.String(20), nullable=False)

# --- Helper Functions ---
def get_user_by_email(email):
    return User.query.filter_by(email=email).first()

def create_user(username, phone, email, password, account_type):
    try:
        new_user = User(
            username=username,
            phone=phone,
            email=email,
            password=password,
            account_type=account_type
        )
        db.session.add(new_user)
        db.session.commit()
        return new_user
    except Exception as e:
        db.session.rollback()
        raise e

# --- Routes ---

@app.route('/login', methods=['POST'])
def login():

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

@app.route('/signup', methods=['POST'])
def signup():
        
    data = request.get_json()
    
    if not data:
        return jsonify({'success': False, 'message': 'No data provided'}), 400
        
    username = data.get('username')
    phone = data.get('phone')
    email = data.get('email')
    password = data.get('password')
    account_type = data.get('account_type')
    
    if not all([username, phone, email, password, account_type]):
        return jsonify({'success': False, 'message': 'Missing required fields'}), 400

    # Check if user already exists
    if get_user_by_email(email):
        return jsonify({'success': False, 'message': 'Email already exists'}), 400
        
    try:
        # Generate 6-digit OTP
        otp = str(random.randint(100000, 999999))
        
        # Store in global variable (Testing only)
        temp_storage['otp'] = otp
        temp_storage['user_data'] = {
            'username': username,
            'phone': phone,
            'email': email,
            'password': password,
            'account_type': account_type
        }
        
        # Send OTP Email
        try:
            msg = Message(
                subject="Your OTP for UrbanEase Registration",
                recipients=[email]
            )
            msg.body = f"""Hello {username},

Your OTP for registration is: {otp}

Please enter this OTP to complete your registration.

Valuable,
Team UrbanEase
"""
            mail.send(msg)
            return jsonify({'success': True, 'message': 'OTP sent successfully'}), 200
        except Exception as mail_error:
            print(f"Error sending email: {mail_error}")
            return jsonify({'success': False, 'message': 'Failed to send OTP email'}), 500

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/verify_otp', methods=['POST'])
def verify_otp():
    data = request.get_json()
    entered_otp = data.get('otp')
    
    if not entered_otp:
         return jsonify({'success': False, 'message': 'OTP is required'}), 400
         
    # Check global storage
    stored_otp = temp_storage.get('otp')
    registration_data = temp_storage.get('user_data')
    
    if not stored_otp or not registration_data:
        # For better UX in testing, if we lost the state, guide user to retry
        return jsonify({'success': False, 'message': 'No pending registration found. Please try signing up again.'}), 400
        
    if entered_otp == stored_otp:
        try:
            # Create User
            create_user(
                registration_data['username'],
                registration_data['phone'],
                registration_data['email'],
                registration_data['password'],
                registration_data['account_type']
            )
            
            # Send Welcome Email
            try:
                msg = Message(
                    subject="Welcome to UrbanEase!",
                    recipients=[registration_data['email']]
                )
                msg.body = f"""Hello {registration_data['username']},

Your {registration_data['account_type']} account has been successfully created.

Welcome to UrbanEase! We are excited to have you on board.
"""
                mail.send(msg)
            except Exception as mail_error:
                print(f"Error sending welcome email: {mail_error}")
            
            # Clear global storage
            temp_storage['otp'] = None
            temp_storage['user_data'] = None
            
            return jsonify({'success': True, 'account_type': registration_data['account_type']}), 201
            
        except Exception as e:
            return jsonify({'success': False, 'message': str(e)}), 500
    else:
        return jsonify({'success': False, 'message': 'Invalid OTP'}), 400

if __name__ == '__main__':
    # Running on port 5000 as the primary common port
    app.run(debug=True, port=5000)