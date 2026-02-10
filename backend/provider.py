from flask import Blueprint, jsonify, request, session, redirect, send_from_directory
from authorization import db, User
from admin import ProviderProfile, ProviderProfilePic, HouseListing, HouseImage, TiffinListing, TiffinImage, ServiceListing, Meal, Order, ServiceBooking
from werkzeug.utils import secure_filename
import os
import time

provider_bp = Blueprint('provider', __name__)

# Image storage paths
IMAGES_FOLDER = r'C:\Users\vrund\OneDrive\Desktop\UrbanEase-main\Images\database images'
ALLOWED_EXTENSIONS = {'jpg', 'jpeg'}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_current_user():
    """Get current logged-in user from session"""
    user_id = session.get('user_id')
    if not user_id:
        return None
    return User.query.get(user_id)

def require_provider_auth(f):
    """Decorator to require provider authentication"""
    from functools import wraps
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user = get_current_user()
        if not user:
            return jsonify({'success': False, 'message': 'Not authenticated', 'redirect': '/frontend/Home-page and Signup/login.html'}), 401
        if user.account_type not in ['provider', 'service_provider']:
            return jsonify({'success': False, 'message': 'Not authorized', 'redirect': '/frontend/Home-page and Signup/index.html'}), 403
        return f(*args, **kwargs)
    return decorated_function

# --- Routes ---

@provider_bp.route('/provider/dashboard')
def provider_dashboard():
    """Serve provider dashboard - requires authentication"""
    user = get_current_user()
    
    if not user:
        # Not logged in - redirect to login
        return redirect('/frontend/Home-page and Signup/login.html')
    
    if user.account_type not in ['provider', 'service_provider']:
        # Not a provider - redirect to homepage
        return redirect('/frontend/Home-page and Signup/index.html')
    
    # Serve the provider dashboard HTML
    return send_from_directory(
        r'C:\Users\vrund\OneDrive\Desktop\UrbanEase-main\frontend\dashboards\provider',
        'provider.html'
    )

@provider_bp.route('/provider/api/status', methods=['GET'])
@require_provider_auth
def get_provider_status():
    """Get provider verification status and profile data"""
    try:
        user_id = session.get('user_id')
        
        # Get provider profile
        profile = ProviderProfile.query.filter_by(user_id=user_id).first()
        
        if not profile:
            return jsonify({
                'has_profile': False,
                'verification_status': None,
                'profile': None
            }), 200
        
        # Get profile picture if exists
        profile_pic = ProviderProfilePic.query.filter_by(provider_id=profile.id).first()
        
        return jsonify({
            'has_profile': True,
            'verification_status': profile.verification_status,
            'profile': {
                'id': profile.id,
                'business_name': profile.business_name,
                'aadhaar_number': profile.aadhaar_number,
                'business_license': profile.business_license,
                'verified_at': profile.verified_at.strftime('%Y-%m-%d') if profile.verified_at else None,
                'created_at': profile.created_at.strftime('%Y-%m-%d') if profile.created_at else None,
                'profile_image': profile_pic.image_path if profile_pic else None
            }
        }), 200
        
    except Exception as e:
        print(f"Error fetching provider status: {e}")
        return jsonify({'error': 'Internal Server Error', 'details': str(e)}), 500

@provider_bp.route('/provider/api/user-profile', methods=['GET'])
@require_provider_auth
def get_user_profile():
    """Get user's basic profile info (for pre-filling forms)"""
    try:
        user = get_current_user()
        
        return jsonify({
            'username': user.username,
            'email': user.email,
            'phone': user.phone
        }), 200
        
    except Exception as e:
        print(f"Error fetching user profile: {e}")
        return jsonify({'error': 'Internal Server Error', 'details': str(e)}), 500

@provider_bp.route('/provider/api/apply-verification', methods=['POST'])
@require_provider_auth
def apply_verification():
    """Submit or resubmit verification application"""
    try:
        user_id = session.get('user_id')
        
        # Get form data (provider_type is hardcoded as 'other' - no longer used in UI)
        business_name = request.form.get('business_name')
        aadhaar_number = request.form.get('aadhaar_number')
        business_license = request.form.get('business_license')
        
        # Validate required fields
        if not all([business_name, aadhaar_number]):
            return jsonify({'success': False, 'message': 'Missing required fields'}), 400
        
        # Validate Aadhaar number (12 digits)
        if not aadhaar_number.isdigit() or len(aadhaar_number) != 12:
            return jsonify({'success': False, 'message': 'Invalid Aadhaar number. Must be 12 digits.'}), 400
        
        # Check for existing profile
        existing_profile = ProviderProfile.query.filter_by(user_id=user_id).first()
        
        # Check if Aadhaar already exists (for different user)
        aadhaar_exists = ProviderProfile.query.filter(
            ProviderProfile.aadhaar_number == aadhaar_number,
            ProviderProfile.user_id != user_id
        ).first()
        
        if aadhaar_exists:
            return jsonify({'success': False, 'message': 'This Aadhaar number is already registered'}), 400
        
        # Handle file upload
        profile_image_path = None
        if 'profile_photo' in request.files:
            file = request.files['profile_photo']
            if file and file.filename:
                # Validate file type
                if not allowed_file(file.filename):
                    return jsonify({'success': False, 'message': 'Only JPEG images are allowed'}), 400
                
                # Validate MIME type
                if file.content_type not in ['image/jpeg', 'image/jpg']:
                    return jsonify({'success': False, 'message': 'Only JPEG images are allowed'}), 400
                
                # Check file size
                file.seek(0, 2)  # Seek to end
                file_size = file.tell()
                file.seek(0)  # Seek back to start
                
                if file_size > MAX_FILE_SIZE:
                    return jsonify({'success': False, 'message': 'File size must be less than 5MB'}), 400
                
                # Generate unique filename
                timestamp = int(time.time())
                # We'll update this after we have the profile ID
                temp_filename = f"provider_temp_{timestamp}.jpg"
        
        if existing_profile:
            # Update existing profile (reapplication after rejection)
            existing_profile.business_name = business_name
            existing_profile.aadhaar_number = aadhaar_number
            existing_profile.business_license = business_license
            existing_profile.verification_status = 'pending'
            existing_profile.verified_at = None
            
            profile_id = existing_profile.id
        else:
            # Create new profile
            new_profile = ProviderProfile(
                user_id=user_id,
                business_name=business_name,
                aadhaar_number=aadhaar_number,
                business_license=business_license,
                verification_status='pending'
            )
            db.session.add(new_profile)
            db.session.flush()  # Get the ID
            profile_id = new_profile.id
        
        # Now handle the image with proper filename
        if 'profile_photo' in request.files:
            file = request.files['profile_photo']
            if file and file.filename:
                timestamp = int(time.time())
                filename = f"provider_{profile_id}_{timestamp}.jpg"
                filepath = os.path.join(IMAGES_FOLDER, filename)
                
                # Ensure directory exists
                os.makedirs(IMAGES_FOLDER, exist_ok=True)
                
                file.save(filepath)
                profile_image_path = filename
                
                # Save or update profile pic record
                existing_pic = ProviderProfilePic.query.filter_by(provider_id=profile_id).first()
                if existing_pic:
                    # Delete old file if exists
                    old_path = os.path.join(IMAGES_FOLDER, existing_pic.image_path)
                    if os.path.exists(old_path):
                        try:
                            os.remove(old_path)
                        except:
                            pass
                    existing_pic.image_path = profile_image_path
                else:
                    new_pic = ProviderProfilePic(
                        provider_id=profile_id,
                        image_path=profile_image_path
                    )
                    db.session.add(new_pic)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Verification application submitted successfully'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Error submitting verification: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@provider_bp.route('/provider/logout', methods=['POST', 'GET'])
def provider_logout():
    """Clear session and redirect to login"""
    session.clear()
    return redirect('/frontend/Home-page and Signup/login.html')

    return jsonify({
        'authenticated': True,
        'account_type': user.account_type,
        'username': user.username
    }), 200

@provider_bp.route('/images/<path:filename>')
def serve_image(filename):
    """Serve images from database images folder"""
    return send_from_directory(IMAGES_FOLDER, filename)

# --- House Listings Routes ---

@provider_bp.route('/provider/api/house-listings', methods=['GET'])
@require_provider_auth
def get_house_listings():
    """Get all house listings for the current provider"""
    try:
        user_id = session.get('user_id')
        provider_profile = ProviderProfile.query.filter_by(user_id=user_id).first()
        
        if not provider_profile:
            return jsonify({'success': False, 'message': 'Provider profile not found'}), 404
            
        listings = HouseListing.query.filter_by(provider_id=provider_profile.id).order_by(HouseListing.created_at.desc()).all()
        
        results = []
        for listing in listings:
            # Get first image as preview
            first_image = HouseImage.query.filter_by(listing_id=listing.id).first()
            preview_image = first_image.image_path if first_image else None
            
            # Get all images for details
            all_images = HouseImage.query.filter_by(listing_id=listing.id).all()
            images_list = [{'id': img.id, 'image_path': img.image_path} for img in all_images]
            
            results.append({
                'id': listing.id,
                'title': listing.title,
                'description': listing.description,
                'price': float(listing.price),
                'location': listing.location,
                'type': listing.type,
                'status': listing.status,
                'approved_at': listing.approved_at.strftime('%Y-%m-%d') if listing.approved_at else None,
                'created_at': listing.created_at.strftime('%Y-%m-%d') if listing.created_at else None,
                'preview_image': preview_image,
                'images': images_list
            })
            
        return jsonify(results), 200
        
    except Exception as e:
        print(f"Error fetching house listings: {e}")
        return jsonify({'error': 'Internal Server Error', 'details': str(e)}), 500

@provider_bp.route('/provider/api/house-listings/add', methods=['POST'])
@require_provider_auth
def add_house_listing():
    """Add a new house listing with images"""
    try:
        user_id = session.get('user_id')
        provider_profile = ProviderProfile.query.filter_by(user_id=user_id).first()
        
        if not provider_profile:
            return jsonify({'success': False, 'message': 'Provider profile not found'}), 404
            
        if provider_profile.verification_status != 'verified':
            return jsonify({'success': False, 'message': 'Only verified providers can add listings'}), 403
            
        # Get form data
        title = request.form.get('title')
        description = request.form.get('description')
        price = request.form.get('price')
        location = request.form.get('location')
        type_ = request.form.get('type')
        
        # Validate required fields
        if not all([title, description, price, location, type_]):
            return jsonify({'success': False, 'message': 'Missing required fields'}), 400
            
        # Validate Payment Status (Dummy Integration)
        payment_status = request.form.get('payment_status')
        if payment_status != 'success':
            return jsonify({'success': False, 'message': 'Payment required before listing'}), 402

        # Create listing
        new_listing = HouseListing(
            provider_id=provider_profile.id,
            title=title,
            description=description,
            price=price,
            location=location,
            type=type_,
            status='pending'
        )
        
        db.session.add(new_listing)
        db.session.flush() # Get ID
        
        listing_id = new_listing.id
        
        # Handle images
        if 'images' not in request.files:
            db.session.rollback()
            return jsonify({'success': False, 'message': 'At least one image is required'}), 400
            
        files = request.files.getlist('images')
        
        if not files or files[0].filename == '':
            db.session.rollback()
            return jsonify({'success': False, 'message': 'At least one image is required'}), 400
            
        # Ensure directory exists
        os.makedirs(IMAGES_FOLDER, exist_ok=True)
            
        for file in files:
            if file and allowed_file(file.filename):
                timestamp = int(time.time())
                # Format: house_<listing_id>_<timestamp>.<ext>
                unique_ts = f"{timestamp}_{files.index(file)}"
                filename = f"house_{listing_id}_{unique_ts}.jpg"
                filepath = os.path.join(IMAGES_FOLDER, filename)
                
                # Check file size (optional per file check)
                file.seek(0, 2)
                size = file.tell()
                file.seek(0)
                
                if size > MAX_FILE_SIZE:
                    continue # Skip large files or handle error
                
                file.save(filepath)
                
                # Create image record
                # Note: relative path stored in DB or filename? 
                # Admin dashboard expects full path or filename? 
                # Admin dashboard code: `const filename = imagePath.split('\\').pop().split('/').pop();`
                # It handles paths. Let's store just filename for simplicity or relative path.
                # User request: "Images stored in: static/Images/database_images/"
                # Let's store the full relative path from static or just filename? 
                # Admin View: `img.image_path`
                # Let's verify how admin retrieves it.
                # `http://127.0.0.1:5000/images/${encodeURIComponent(filename)}` in admin-script.js
                # Admin script extracts filename. So storing full path is fine, but storing filename is cleaner.
                # However, schema says `image_path`. I'll store the absolute path to be consistent with existing practice if any, 
                # OR better, store relative path `static/Images/database_images/filename.jpg`.
                # Wait, admin script uses `/images/<filename>` route. I need to make sure that route can serve these files.
                # The `/images/<filename>` route likely serves from `IMAGES_FOLDER`. 
                # `provider.py` doesn't seem to have a generic image serving route, `admin.py` or `run.py` might.
                # Let's look at `run.py` later. For now, I'll store the filename. 
                # Actually, admin.py's `ProviderProfilePic` stores `image_path` as `provider_<id>_<ts>.jpg` (filename only based on `provider.py` code).
                # So I will store just the filename.
                
                new_image = HouseImage(
                    listing_id=listing_id,
                    image_path=filename 
                )
                db.session.add(new_image)
                
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Listing added successfully'}), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Error adding house listing: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500
@provider_bp.route('/provider/api/dashboard-stats', methods=['GET'])
@require_provider_auth
def get_dashboard_stats():
    """Get dashboard statistics for the provider"""
    try:
        user = get_current_user()
        profile = ProviderProfile.query.filter_by(user_id=user.id).first()
        
        if not profile:
            return jsonify({
                'house_count': 0,
                'tiffin_count': 0,
                'service_count': 0,
                'order_count': 0,
                'booking_count': 0
            }), 200
            
        house_count = HouseListing.query.filter_by(provider_id=profile.id).count()
        tiffin_count = TiffinListing.query.filter_by(provider_id=profile.id).count()
        service_count = ServiceListing.query.filter_by(provider_id=profile.id).count()
        
        return jsonify({
            'house_count': house_count,
            'tiffin_count': tiffin_count,
            'service_count': service_count,
            'order_count': 0, # Placeholder
            'booking_count': 0 # Placeholder
        }), 200
        
    except Exception as e:
        print(f"Error fetching dashboard stats: {e}")
        return jsonify({'error': 'Internal Server Error'}), 500

# --- Tiffin Listing Routes ---

@provider_bp.route('/provider/api/tiffin-listings', methods=['GET'])
@require_provider_auth
def get_provider_tiffin_listings():
    """Get all tiffin listings for the current provider"""
    try:
        user = get_current_user()
        profile = ProviderProfile.query.filter_by(user_id=user.id).first()
        
        if not profile:
            return jsonify([]), 200
            
        listings = TiffinListing.query.filter_by(provider_id=profile.id).order_by(TiffinListing.created_at.desc()).all()
        
        results = []
        for listing in listings:
            # Get first image as preview
            first_image = TiffinImage.query.filter_by(tiffin_listing_id=listing.id).first()
            preview_image = first_image.image_path if first_image else None
            
            results.append({
                'id': listing.id,
                'delivery_radius': float(listing.delivery_radius) if listing.delivery_radius else 0,
                'fast_delivery_available': listing.fast_delivery_available,
                'status': listing.status,
                'diet_type': listing.diet_type,
                'available_days': listing.available_days,
                'preview_image': preview_image,
                'created_at': listing.created_at.strftime('%Y-%m-%d'),
                'kitchen_open': listing.kitchen_open
            })
            
        return jsonify(results), 200
        
    except Exception as e:
        print(f"Error fetching provider tiffin listings: {e}")
        return jsonify({'error': 'Internal Server Error', 'details': str(e)}), 500

@provider_bp.route('/provider/api/tiffin-listings/add', methods=['POST'])
@require_provider_auth
def add_tiffin_listing():
    """Add a new tiffin listing"""
    try:
        user = get_current_user()
        profile = ProviderProfile.query.filter_by(user_id=user.id).first()
        
        if not profile or profile.verification_status != 'verified':
            return jsonify({'success': False, 'message': 'Provider must be verified to add listings'}), 403

        # Validate Payment Status
        payment_status = request.form.get('payment_status')
        if payment_status != 'success':
            return jsonify({'success': False, 'message': 'Payment required before listing'}), 402

        # Get form data
        delivery_radius = request.form.get('delivery_radius')
        fast_delivery = request.form.get('fast_delivery') == 'true'
        diet_type = request.form.get('diet_type')
        available_days = request.form.get('available_days')
        
        if not all([delivery_radius, diet_type, available_days]):
             return jsonify({'success': False, 'message': 'Missing required fields'}), 400

        # Create listing
        new_listing = TiffinListing(
            provider_id=profile.id,
            delivery_radius=delivery_radius,
            fast_delivery_available=fast_delivery,
            diet_type=diet_type,
            available_days=available_days,
            status='pending'
        )
        
        db.session.add(new_listing)
        db.session.flush() # Get ID
        
        # Handle Images
        files = request.files.getlist('images')
        
        # Ensure directory exists
        os.makedirs(IMAGES_FOLDER, exist_ok=True)
            
        for file in files:
            if file and allowed_file(file.filename):
                timestamp = int(time.time())
                unique_ts = f"{timestamp}_{files.index(file)}"
                filename = f"tiffin_{new_listing.id}_{unique_ts}.jpg"
                filepath = os.path.join(IMAGES_FOLDER, filename)
                
                # Check file size
                file.seek(0, 2)
                size = file.tell()
                file.seek(0)
                
                if size > MAX_FILE_SIZE:
                    continue 
                
                file.save(filepath)
                
                # Create Image Record
                new_image = TiffinImage(
                    tiffin_listing_id=new_listing.id,
                    image_path=filename
                )
                db.session.add(new_image)
        
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Tiffin listing added successfully'}), 201

    except Exception as e:
        db.session.rollback()
        print(f"Error adding tiffin listing: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@provider_bp.route('/provider/tiffin/<int:listing_id>/toggle-kitchen', methods=['POST'])
@require_provider_auth
def toggle_kitchen_status(listing_id):
    """Toggle kitchen status for a tiffin listing"""
    try:
        user = get_current_user()
        profile = ProviderProfile.query.filter_by(user_id=user.id).first()
        
        if not profile:
            return jsonify({'success': False, 'message': 'Provider profile not found'}), 404
            
        if profile.verification_status != 'verified':
            return jsonify({'success': False, 'message': 'Provider not verified'}), 403
            
        listing = TiffinListing.query.filter_by(id=listing_id, provider_id=profile.id).first()
        
        if not listing:
            return jsonify({'success': False, 'message': 'Listing not found or unauthorized'}), 404
            
        if listing.status != 'approved':
             return jsonify({'success': False, 'message': 'Only approved listings can be toggled'}), 400
            
        # Toggle status
        listing.kitchen_open = not listing.kitchen_open
        db.session.commit()
        
        return jsonify({
            'success': True, 
            'message': 'Kitchen status updated',
            'kitchen_open': listing.kitchen_open
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error toggling kitchen status: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@provider_bp.route('/images/database_images/<path:filename>')
def serve_db_image(filename):
    return send_from_directory(IMAGES_FOLDER, filename)

@provider_bp.route('/provider/tiffin/<int:listing_id>/add-meal', methods=['POST'])
@require_provider_auth
def add_meal(listing_id):
    """Add a new meal to a tiffin listing"""
    try:
        user = get_current_user()
        profile = ProviderProfile.query.filter_by(user_id=user.id).first()
        
        if not profile or profile.verification_status != 'verified':
            return jsonify({'success': False, 'message': 'Provider must be verified to add meals'}), 403
            
        listing = TiffinListing.query.filter_by(id=listing_id, provider_id=profile.id).first()
        
        if not listing:
            return jsonify({'success': False, 'message': 'Listing not found or unauthorized'}), 404
            
        if listing.status != 'approved':
             return jsonify({'success': False, 'message': 'Listing must be approved to add meals'}), 400
             
        if not listing.kitchen_open:
             return jsonify({'success': False, 'message': 'Kitchen must be open to add meals'}), 400

        # Form Data
        meal_name = request.form.get('meal_name')
        meal_category = request.form.get('meal_category')
        diet_type = request.form.get('diet_type')
        price = request.form.get('price')
        
        if not all([meal_name, meal_category, diet_type, price]):
             return jsonify({'success': False, 'message': 'Missing required fields'}), 400

        # File Upload
        if 'meal_image' not in request.files:
             return jsonify({'success': False, 'message': 'Meal image is required'}), 400
             
        file = request.files['meal_image']
        if file.filename == '':
             return jsonify({'success': False, 'message': 'No selected file'}), 400
             
        if file and allowed_file(file.filename):
            filename = secure_filename(f"meal_{listing.id}_{int(time.time())}.jpg")
            filepath = os.path.join(IMAGES_FOLDER, filename)
            file.save(filepath)
            
            new_meal = Meal(
                tiffin_listing_id=listing.id,
                meal_name=meal_name,
                description=request.form.get('description', ''),
                meal_category=meal_category,
                diet_type=diet_type,
                price=price,
                is_available=request.form.get('is_available') == 'true',
                meal_image_path=filename
            )
            
            db.session.add(new_meal)
            db.session.commit()
            
            return jsonify({'success': True, 'message': 'Meal added successfully'}), 201
        
        return jsonify({'success': False, 'message': 'Invalid file'}), 400

    except Exception as e:
        db.session.rollback()
        print(f"Error adding meal: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@provider_bp.route('/provider/tiffin/<int:listing_id>/meals', methods=['GET'])
@require_provider_auth
def get_meals(listing_id):
    """Get all meals for a tiffin listing"""
    try:
         user = get_current_user()
         profile = ProviderProfile.query.filter_by(user_id=user.id).first()
         
         if not profile:
             return jsonify({'success': False, 'message': 'Profile not found'}), 404
             
         listing = TiffinListing.query.filter_by(id=listing_id, provider_id=profile.id).first()
         
         if not listing:
              return jsonify({'success': False, 'message': 'Listing not found'}), 404
              
         meals = Meal.query.filter_by(tiffin_listing_id=listing.id).order_by(Meal.created_at.desc()).all()
         
         results = []
         for meal in meals:
             results.append({
                 'id': meal.id,
                 'meal_name': meal.meal_name,
                 'description': meal.description,
                 'meal_category': meal.meal_category,
                 'diet_type': meal.diet_type,
                 'price': float(meal.price),
                 'is_available': meal.is_available,
                 'meal_image_path': meal.meal_image_path,
                 'created_at': meal.created_at.strftime('%Y-%m-%d')
             })
             
         return jsonify(results), 200

    except Exception as e:
        print(f"Error fetching meals: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@provider_bp.route('/provider/meal/<int:meal_id>/edit', methods=['PUT'])
@require_provider_auth
def edit_meal(meal_id):
    """Edit an existing meal"""
    try:
        user = get_current_user()
        profile = ProviderProfile.query.filter_by(user_id=user.id).first()
        
        if not profile or profile.verification_status != 'verified':
            return jsonify({'success': False, 'message': 'Provider must be verified'}), 403
            
        meal = Meal.query.get(meal_id)
        if not meal:
            return jsonify({'success': False, 'message': 'Meal not found'}), 404
            
        # Verify ownership through tiffin listing
        listing = TiffinListing.query.filter_by(id=meal.tiffin_listing_id, provider_id=profile.id).first()
        if not listing:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        
        # Update fields
        data = request.form
        meal.meal_name = data.get('meal_name', meal.meal_name)
        meal.description = data.get('description', meal.description)
        meal.meal_category = data.get('meal_category', meal.meal_category)
        meal.diet_type = data.get('diet_type', meal.diet_type)
        meal.price = data.get('price', meal.price)
        meal.is_available = data.get('is_available') == 'true'
        
        # Handle optional image update
        if 'meal_image' in request.files:
            file = request.files['meal_image']
            if file.filename != '' and allowed_file(file.filename):
                filename = secure_filename(f"meal_{listing.id}_{int(time.time())}.jpg")
                filepath = os.path.join(IMAGES_FOLDER, filename)
                file.save(filepath)
                meal.meal_image_path = filename
        
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Meal updated successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error editing meal: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

# --- Orders Routes ---

@provider_bp.route('/provider/orders/active-count', methods=['GET'])
@require_provider_auth
def get_active_orders_count():
    """Get count of active orders for the provider"""
    try:
        user = get_current_user()
        profile = ProviderProfile.query.filter_by(user_id=user.id).first()
        
        if not profile:
            return jsonify({'active_count': 0}), 200
        
        # Count orders that are placed, preparing, or out_for_delivery
        active_count = db.session.query(Order).join(
            TiffinListing, Order.tiffin_listing_id == TiffinListing.id
        ).filter(
            TiffinListing.provider_id == profile.id,
            Order.order_status.in_(['placed', 'preparing', 'out_for_delivery'])
        ).count()
        
        return jsonify({'active_count': active_count}), 200
        
    except Exception as e:
        print(f"Error getting active orders count: {e}")
        return jsonify({'active_count': 0}), 200

@provider_bp.route('/provider/tiffin/<int:listing_id>/orders', methods=['GET'])
@require_provider_auth
def get_tiffin_orders(listing_id):
    """Get all orders for a tiffin listing"""
    try:
        user = get_current_user()
        profile = ProviderProfile.query.filter_by(user_id=user.id).first()
        
        if not profile:
            return jsonify({'success': False, 'message': 'Profile not found'}), 404
            
        listing = TiffinListing.query.filter_by(id=listing_id, provider_id=profile.id).first()
        
        if not listing:
            return jsonify({'success': False, 'message': 'Listing not found or unauthorized'}), 404
            
        orders = Order.query.filter_by(tiffin_listing_id=listing.id).order_by(Order.order_date.desc()).all()
        
        results = []
        for order in orders:
            customer = User.query.get(order.customer_id)
            meal = Meal.query.get(order.meal_id)
            
            results.append({
                'id': order.id,
                'customer_name': customer.username if customer else 'Unknown',
                'customer_phone': customer.phone if customer else 'N/A',
                'meal_name': meal.meal_name if meal else 'Unknown',
                'meal_category': meal.meal_category if meal else '',
                'diet_type': meal.diet_type if meal else '',
                'quantity': order.quantity,
                'base_price': float(order.base_price),
                'fast_delivery': order.fast_delivery,
                'fast_delivery_charge': float(order.fast_delivery_charge) if order.fast_delivery_charge else 0,
                'total_price': float(order.total_price),
                'order_status': order.order_status,
                'delivery_address': order.delivery_address,
                'order_date': order.order_date.strftime('%Y-%m-%d %H:%M') if order.order_date else ''
            })
            
        return jsonify(results), 200

    except Exception as e:
        print(f"Error fetching orders: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@provider_bp.route('/provider/order/<int:order_id>/update-status', methods=['POST'])
@require_provider_auth
def update_order_status(order_id):
    """Update order status with valid transitions only"""
    try:
        user = get_current_user()
        profile = ProviderProfile.query.filter_by(user_id=user.id).first()
        
        if not profile:
            return jsonify({'success': False, 'message': 'Profile not found'}), 404
        
        data = request.get_json()
        new_status = data.get('new_status')
        
        if not new_status:
            return jsonify({'success': False, 'message': 'New status required'}), 400
        
        # Valid transitions
        valid_transitions = {
            'placed': 'preparing',
            'preparing': 'out_for_delivery',
            'out_for_delivery': 'delivered'
        }
        
        # Secure query: verify ownership through tiffin_listing
        order = db.session.query(Order).join(
            TiffinListing, Order.tiffin_listing_id == TiffinListing.id
        ).filter(
            Order.id == order_id,
            TiffinListing.provider_id == profile.id
        ).first()
        
        if not order:
            return jsonify({'success': False, 'message': 'Order not found or unauthorized'}), 404
        
        # Check if transition is valid
        if order.order_status not in valid_transitions:
            return jsonify({'success': False, 'message': 'Order cannot be updated'}), 400
            
        if valid_transitions[order.order_status] != new_status:
            return jsonify({'success': False, 'message': f'Invalid status transition from {order.order_status} to {new_status}'}), 400
        
        order.order_status = new_status
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Status updated', 'new_status': new_status}), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error updating order status: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

# --- Service Listing Routes ---

@provider_bp.route('/provider/api/service-listings', methods=['GET'])
@require_provider_auth
def get_provider_service_listings():
    """Get all service listings for the current provider"""
    try:
        user = get_current_user()
        profile = ProviderProfile.query.filter_by(user_id=user.id).first()
        
        if not profile:
            return jsonify([]), 200
            
        listings = ServiceListing.query.filter_by(provider_id=profile.id).order_by(ServiceListing.created_at.desc()).all()
        
        results = []
        for listing in listings:
            results.append({
                'id': listing.id,
                'service_category': listing.service_category,
                'service_title': listing.service_title,
                'description': listing.description,
                'base_price': float(listing.base_price),
                'service_radius': float(listing.service_radius) if listing.service_radius else 0,
                'availability_days': listing.availability_days,
                'status': listing.status,
                'created_at': listing.created_at.strftime('%Y-%m-%d')
            })
            
        return jsonify(results), 200
        
    except Exception as e:
        print(f"Error fetching provider service listings: {e}")
        return jsonify({'error': 'Internal Server Error', 'details': str(e)}), 500

@provider_bp.route('/provider/api/service-listings/add', methods=['POST'])
@require_provider_auth
def add_service_listing():
    """Add a new service listing"""
    try:
        user = get_current_user()
        profile = ProviderProfile.query.filter_by(user_id=user.id).first()
        
        if not profile or profile.verification_status != 'verified':
            return jsonify({'success': False, 'message': 'Provider must be verified to add listings'}), 403

        # Validate Payment Status
        payment_status = request.form.get('payment_status')
        if payment_status != 'success':
            return jsonify({'success': False, 'message': 'Payment required before listing'}), 402

        # Get form data
        service_category = request.form.get('service_category')
        service_title = request.form.get('service_title')
        description = request.form.get('description')
        base_price = request.form.get('base_price')
        service_radius = request.form.get('service_radius')
        availability_days = request.form.get('availability_days')
        
        if not all([service_category, service_title, description, base_price, service_radius, availability_days]):
             return jsonify({'success': False, 'message': 'Missing required fields'}), 400

        # Create listing
        new_listing = ServiceListing(
            provider_id=profile.id,
            service_category=service_category,
            service_title=service_title,
            description=description,
            base_price=base_price,
            service_radius=service_radius,
            availability_days=availability_days,
            status='pending'
        )
        
        db.session.add(new_listing)
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Service listing added successfully'}), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Error adding service listing: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

# --- Service Bookings Routes ---

@provider_bp.route('/provider/service-bookings/active-count', methods=['GET'])
@require_provider_auth
def get_active_service_bookings_count():
    """Get count of active service bookings for the provider"""
    try:
        user = get_current_user()
        profile = ProviderProfile.query.filter_by(user_id=user.id).first()
        
        if not profile:
            return jsonify({'active_count': 0}), 200
        
        # Count bookings that are requested or accepted, only for approved listings
        active_count = db.session.query(ServiceBooking).join(
            ServiceListing, ServiceBooking.service_listing_id == ServiceListing.id
        ).filter(
            ServiceListing.provider_id == profile.id,
            ServiceListing.status == 'approved',
            ServiceBooking.booking_status.in_(['requested', 'accepted'])
        ).count()
        
        return jsonify({'active_count': active_count}), 200
        
    except Exception as e:
        print(f"Error getting active service bookings count: {e}")
        return jsonify({'active_count': 0}), 200

@provider_bp.route('/provider/service/<int:listing_id>/bookings', methods=['GET'])
@require_provider_auth
def get_service_bookings(listing_id):
    """Get all bookings for a service listing"""
    try:
        user = get_current_user()
        profile = ProviderProfile.query.filter_by(user_id=user.id).first()
        
        if not profile:
            return jsonify({'success': False, 'message': 'Profile not found'}), 404
            
        listing = ServiceListing.query.filter_by(id=listing_id, provider_id=profile.id, status='approved').first()
        
        if not listing:
            return jsonify({'success': False, 'message': 'Listing not found, unauthorized, or not approved'}), 404
            
        bookings = ServiceBooking.query.filter_by(service_listing_id=listing.id).order_by(ServiceBooking.created_at.desc()).all()
        
        results = []
        for booking in bookings:
            customer = User.query.get(booking.customer_id)
            
            results.append({
                'id': booking.id,
                'customer_name': customer.username if customer else 'Unknown',
                'customer_phone': customer.phone if customer else 'N/A',
                'service_title': listing.service_title,
                'service_category': listing.service_category,
                'booking_date': booking.booking_date.strftime('%Y-%m-%d') if booking.booking_date else '',
                'booking_time': booking.booking_time.strftime('%H:%M') if booking.booking_time else '',
                'booking_status': booking.booking_status,
                'address': booking.address,
                'notes': booking.notes or '',
                'quoted_price': float(booking.quoted_price) if booking.quoted_price else 0,
                'created_at': booking.created_at.strftime('%Y-%m-%d %H:%M') if booking.created_at else ''
            })
            
        return jsonify(results), 200

    except Exception as e:
        print(f"Error fetching service bookings: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@provider_bp.route('/provider/service-booking/<int:booking_id>/update-status', methods=['POST'])
@require_provider_auth
def update_service_booking_status(booking_id):
    """Update service booking status with valid transitions only"""
    try:
        user = get_current_user()
        profile = ProviderProfile.query.filter_by(user_id=user.id).first()
        
        if not profile:
            return jsonify({'success': False, 'message': 'Profile not found'}), 404
        
        data = request.get_json()
        new_status = data.get('new_status')
        
        if not new_status:
            return jsonify({'success': False, 'message': 'New status required'}), 400
        
        # Valid transitions
        valid_transitions = {
            'requested': ['accepted', 'cancelled'],
            'accepted': ['completed', 'cancelled']
        }
        
        # Secure query: verify ownership through service_listing and require approved status
        booking = db.session.query(ServiceBooking).join(
            ServiceListing, ServiceBooking.service_listing_id == ServiceListing.id
        ).filter(
            ServiceBooking.id == booking_id,
            ServiceListing.provider_id == profile.id,
            ServiceListing.status == 'approved'
        ).first()
        
        if not booking:
            return jsonify({'success': False, 'message': 'Booking not found, unauthorized, or service not approved'}), 404
        
        # Check if transition is valid
        if booking.booking_status not in valid_transitions:
            return jsonify({'success': False, 'message': 'Booking cannot be updated'}), 400
            
        if new_status not in valid_transitions[booking.booking_status]:
            return jsonify({'success': False, 'message': f'Invalid status transition from {booking.booking_status} to {new_status}'}), 400
        
        booking.booking_status = new_status
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Status updated', 'new_status': new_status}), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error updating service booking status: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500
