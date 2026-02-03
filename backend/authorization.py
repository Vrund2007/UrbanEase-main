from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_mail import Mail, Message
from dotenv import load_dotenv
import os

# Load environment variables from .env file
dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(dotenv_path)

app = Flask(__name__)
# Enable CORS for all domains on all routes 
CORS(app, resources={r"/*": {"origins": "*"}})

# Database Configuration
# Using the connection string from the previous files
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://postgres:9979@localhost:5432/UrbanEase'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# Mail Configuration
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USE_SSL'] = False
app.config['MAIL_USERNAME'] = os.environ.get('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.environ.get('MAIL_PASSWORD')


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
            password=password, # Storing as-is per requirements (no hashing)
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
        create_user(username, phone, email, password, account_type)
        
        # Send Welcome Email
        try:
            msg = Message(
                subject="Welcome to UrbanEase!",
                recipients=[email]
            )
            msg.body = f"""Hello {username},

Your {account_type} account has been successfully created.

Welcome to UrbanEase! We are excited to have you on board.
"""
            mail.send(msg)
        except Exception as mail_error:
            # Log email failure but do not fail the registration
            print(f"Error sending email: {mail_error}")

        return jsonify({'success': True, 'account_type': account_type}), 201
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

if __name__ == '__main__':
    # Running on port 5000 as the primary common port
    app.run(debug=True, port=5000)

