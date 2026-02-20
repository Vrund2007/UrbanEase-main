from flask import Blueprint, jsonify, request, session, redirect, render_template
from backend.authorization import db, User, app
from backend.admin import ProviderProfile, ProviderProfilePic, HouseListing, HouseImage, HostelDetails, PGDetails, ApartmentDetails, TiffinListing, TiffinImage, ServiceListing, Meal, Order, ServiceBooking
from werkzeug.utils import secure_filename
import os
import time

provider_bp = Blueprint('provider', __name__)

                                                                   
IMAGES_FOLDER = os.path.join(app.static_folder, 'images', 'database_images')
ALLOWED_EXTENSIONS = {'jpg', 'jpeg'}
MAX_FILE_SIZE = 5 * 1024 * 1024       

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
            return jsonify({'success': False, 'message': 'Not authenticated', 'redirect': '/login'}), 401
        if user.account_type not in ['provider', 'service_provider']:
            return jsonify({'success': False, 'message': 'Not authorized', 'redirect': '/'}), 403
        return f(*args, **kwargs)
    return decorated_function

                

@provider_bp.route('/provider/dashboard')
def provider_dashboard():
    """Serve provider dashboard - requires authentication"""
    user = get_current_user()
    
    if not user:
        return redirect('/login')
    if user.account_type not in ['provider', 'service_provider']:
        return redirect('/')
    return render_template('dashboards/provider/provider.html')

@provider_bp.route('/provider/api/status', methods=['GET'])
@require_provider_auth
def get_provider_status():
    """Get provider verification status and profile data"""
    try:
        user_id = session.get('user_id')
        
                              
        profile = ProviderProfile.query.filter_by(user_id=user_id).first()
        
        if not profile:
            return jsonify({
                'has_profile': False,
                'verification_status': None,
                'profile': None
            }), 200
        
                                       
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
        
                                                                                      
        business_name = request.form.get('business_name')
        aadhaar_number = request.form.get('aadhaar_number')
        business_license = request.form.get('business_license')
        
                                  
        if not all([business_name, aadhaar_number]):
            return jsonify({'success': False, 'message': 'Missing required fields'}), 400
        
                                             
        if not aadhaar_number.isdigit() or len(aadhaar_number) != 12:
            return jsonify({'success': False, 'message': 'Invalid Aadhaar number. Must be 12 digits.'}), 400
        
                                    
        existing_profile = ProviderProfile.query.filter_by(user_id=user_id).first()
        
                                                              
        aadhaar_exists = ProviderProfile.query.filter(
            ProviderProfile.aadhaar_number == aadhaar_number,
            ProviderProfile.user_id != user_id
        ).first()
        
        if aadhaar_exists:
            return jsonify({'success': False, 'message': 'This Aadhaar number is already registered'}), 400
        
                            
        profile_image_path = None
        if 'profile_photo' in request.files:
            file = request.files['profile_photo']
            if file and file.filename:
                                    
                if not allowed_file(file.filename):
                    return jsonify({'success': False, 'message': 'Only JPEG images are allowed'}), 400
                
                                    
                if file.content_type not in ['image/jpeg', 'image/jpg']:
                    return jsonify({'success': False, 'message': 'Only JPEG images are allowed'}), 400
                
                                 
                file.seek(0, 2)               
                file_size = file.tell()
                file.seek(0)                      
                
                if file_size > MAX_FILE_SIZE:
                    return jsonify({'success': False, 'message': 'File size must be less than 5MB'}), 400
                
                                          
                timestamp = int(time.time())
                                                                
                temp_filename = f"provider_temp_{timestamp}.jpg"
        
        if existing_profile:
                                                                     
            existing_profile.business_name = business_name
            existing_profile.aadhaar_number = aadhaar_number
            existing_profile.business_license = business_license
            existing_profile.verification_status = 'pending'
            existing_profile.verified_at = None
            
            profile_id = existing_profile.id
        else:
                                
            new_profile = ProviderProfile(
                user_id=user_id,
                business_name=business_name,
                aadhaar_number=aadhaar_number,
                business_license=business_license,
                verification_status='pending'
            )
            db.session.add(new_profile)
            db.session.flush()              
            profile_id = new_profile.id
        
                                                   
        if 'profile_photo' in request.files:
            file = request.files['profile_photo']
            if file and file.filename:
                timestamp = int(time.time())
                filename = f"provider_{profile_id}_{timestamp}.jpg"
                filepath = os.path.join(IMAGES_FOLDER, filename)
                
                                         
                os.makedirs(IMAGES_FOLDER, exist_ok=True)
                
                file.save(filepath)
                profile_image_path = filename
                
                                                   
                existing_pic = ProviderProfilePic.query.filter_by(provider_id=profile_id).first()
                if existing_pic:
                                               
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
    return redirect('/login')

                               

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
                                        
            first_image = HouseImage.query.filter_by(listing_id=listing.id).first()
            preview_image = first_image.image_path if first_image else None
            
                                        
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
            
                       
        title = request.form.get('title')
        description = request.form.get('description')
        price = request.form.get('price')
        location = request.form.get('location')
        type_ = request.form.get('type')
        
                                  
        if not all([title, description, price, location, type_]):
            return jsonify({'success': False, 'message': 'Missing required fields'}), 400
            
                                                     
        payment_status = request.form.get('payment_status')
        if payment_status != 'success':
            return jsonify({'success': False, 'message': 'Payment required before listing'}), 402

                        
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
        db.session.flush()         
        
        listing_id = new_listing.id
        
                                                
        if type_ == 'Hostel':
            hostel_details = HostelDetails(
                listing_id=listing_id,
                gender=request.form.get('gender'),
                room_type=request.form.get('room_type'),
                wifi=request.form.get('wifi') == 'true',
                attached_bathroom=request.form.get('attached_bathroom') == 'true',
                food_included=request.form.get('food_included') == 'true',
                laundry=request.form.get('laundry') == 'true'
            )
            db.session.add(hostel_details)
        elif type_ == 'PG':
            pg_details = PGDetails(
                listing_id=listing_id,
                gender=request.form.get('gender'),
                ac_available=request.form.get('ac_available') == 'true',
                sharing=request.form.get('sharing'),
                food_included=request.form.get('food_included') == 'true',
                laundry=request.form.get('laundry') == 'true'
            )
            db.session.add(pg_details)
        elif type_ == 'Apartment':
            apartment_details = ApartmentDetails(
                listing_id=listing_id,
                listing_purpose=request.form.get('listing_purpose'),
                bhk=request.form.get('bhk'),
                tenant_preference=request.form.get('tenant_preference'),
                furnishing=request.form.get('furnishing')
            )
            db.session.add(apartment_details)
        
                       
        if 'images' not in request.files:
            db.session.rollback()
            return jsonify({'success': False, 'message': 'At least one image is required'}), 400
            
        files = request.files.getlist('images')
        
        if not files or files[0].filename == '':
            db.session.rollback()
            return jsonify({'success': False, 'message': 'At least one image is required'}), 400
            
                                 
        os.makedirs(IMAGES_FOLDER, exist_ok=True)
            
        for file in files:
            if file and allowed_file(file.filename):
                timestamp = int(time.time())
                                                              
                unique_ts = f"{timestamp}_{files.index(file)}"
                filename = f"house_{listing_id}_{unique_ts}.jpg"
                filepath = os.path.join(IMAGES_FOLDER, filename)
                
                                                           
                file.seek(0, 2)
                size = file.tell()
                file.seek(0)
                
                if size > MAX_FILE_SIZE:
                    continue                                   
                
                file.save(filepath)
                
                                     
                                                                
                                                                 
                                                                                                        
                                                                                              
                                                                                  
                                                                                   
                                              
                                                      
                                                                                                   
                                                                                                                
                                                                                                                                  
                                                                                              
                                                                                                                           
                                                                                     
                                                                                                                 
                                                                                  
                                                                                                                                                        
                                                    
                
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
            'order_count': 0,              
            'booking_count': 0              
        }), 200
        
    except Exception as e:
        print(f"Error fetching dashboard stats: {e}")
        return jsonify({'error': 'Internal Server Error'}), 500

                               

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

                                 
        payment_status = request.form.get('payment_status')
        if payment_status != 'success':
            return jsonify({'success': False, 'message': 'Payment required before listing'}), 402

                       
        delivery_radius = request.form.get('delivery_radius')
        fast_delivery = request.form.get('fast_delivery') == 'true'
        diet_type = request.form.get('diet_type')
        available_days = request.form.get('available_days')
        
        if not all([delivery_radius, diet_type, available_days]):
             return jsonify({'success': False, 'message': 'Missing required fields'}), 400

                        
        new_listing = TiffinListing(
            provider_id=profile.id,
            delivery_radius=delivery_radius,
            fast_delivery_available=fast_delivery,
            diet_type=diet_type,
            available_days=available_days,
            status='pending'
        )
        
        db.session.add(new_listing)
        db.session.flush()         
        
                       
        files = request.files.getlist('images')
        
                                 
        os.makedirs(IMAGES_FOLDER, exist_ok=True)
            
        for file in files:
            if file and allowed_file(file.filename):
                timestamp = int(time.time())
                unique_ts = f"{timestamp}_{files.index(file)}"
                filename = f"tiffin_{new_listing.id}_{unique_ts}.jpg"
                filepath = os.path.join(IMAGES_FOLDER, filename)
                
                                 
                file.seek(0, 2)
                size = file.tell()
                file.seek(0)
                
                if size > MAX_FILE_SIZE:
                    continue 
                
                file.save(filepath)
                
                                     
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

                   
        meal_name = request.form.get('meal_name')
        meal_category = request.form.get('meal_category')
        diet_type = request.form.get('diet_type')
        price = request.form.get('price')
        
        if not all([meal_name, meal_category, diet_type, price]):
             return jsonify({'success': False, 'message': 'Missing required fields'}), 400

                     
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
            
                                                 
        listing = TiffinListing.query.filter_by(id=meal.tiffin_listing_id, provider_id=profile.id).first()
        if not listing:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        
                       
        data = request.form
        meal.meal_name = data.get('meal_name', meal.meal_name)
        meal.description = data.get('description', meal.description)
        meal.meal_category = data.get('meal_category', meal.meal_category)
        meal.diet_type = data.get('diet_type', meal.diet_type)
        meal.price = data.get('price', meal.price)
        meal.is_available = data.get('is_available') == 'true'
        
                                      
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

                       

@provider_bp.route('/provider/orders/active-count', methods=['GET'])
@require_provider_auth
def get_active_orders_count():
    """Get count of active orders for the provider"""
    try:
        user = get_current_user()
        profile = ProviderProfile.query.filter_by(user_id=user.id).first()
        
        if not profile:
            return jsonify({'active_count': 0}), 200
        
                                                                      
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
        
                           
        valid_transitions = {
            'placed': 'preparing',
            'preparing': 'out_for_delivery',
            'out_for_delivery': 'delivered'
        }
        
                                                               
        order = db.session.query(Order).join(
            TiffinListing, Order.tiffin_listing_id == TiffinListing.id
        ).filter(
            Order.id == order_id,
            TiffinListing.provider_id == profile.id
        ).first()
        
        if not order:
            return jsonify({'success': False, 'message': 'Order not found or unauthorized'}), 404
        
                                      
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

                                 
        payment_status = request.form.get('payment_status')
        if payment_status != 'success':
            return jsonify({'success': False, 'message': 'Payment required before listing'}), 402

                       
        service_category = request.form.get('service_category')
        service_title = request.form.get('service_title')
        description = request.form.get('description')
        base_price = request.form.get('base_price')
        service_radius = request.form.get('service_radius')
        availability_days = request.form.get('availability_days')
        
        if not all([service_category, service_title, description, base_price, service_radius, availability_days]):
             return jsonify({'success': False, 'message': 'Missing required fields'}), 400

                        
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

                                 

@provider_bp.route('/provider/service-bookings/active-count', methods=['GET'])
@require_provider_auth
def get_active_service_bookings_count():
    """Get count of active service bookings for the provider"""
    try:
        user = get_current_user()
        profile = ProviderProfile.query.filter_by(user_id=user.id).first()
        
        if not profile:
            return jsonify({'active_count': 0}), 200
        
                                                                                   
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
        
                           
        valid_transitions = {
            'requested': ['accepted', 'cancelled'],
            'accepted': ['completed', 'cancelled']
        }
        
                                                                                            
        booking = db.session.query(ServiceBooking).join(
            ServiceListing, ServiceBooking.service_listing_id == ServiceListing.id
        ).filter(
            ServiceBooking.id == booking_id,
            ServiceListing.provider_id == profile.id,
            ServiceListing.status == 'approved'
        ).first()
        
        if not booking:
            return jsonify({'success': False, 'message': 'Booking not found, unauthorized, or service not approved'}), 404
        
                                      
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
