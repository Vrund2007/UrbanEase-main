from flask import Blueprint, jsonify, request, render_template
from authorization import db, User

admin_bp = Blueprint('admin', __name__)


@admin_bp.route('/admin')
def admin_dashboard():
    return render_template('dashboards/admin/admin.html')

class ProviderProfile(db.Model):
    __tablename__ = 'provider_profiles'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True)
    business_name = db.Column(db.String(150), nullable=False)
    aadhaar_number = db.Column(db.String(12), nullable=False, unique=True)
    business_license = db.Column(db.String(100))
    verification_status = db.Column(db.String(20), default='pending', nullable=False)
    verified_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    user = db.relationship('User', backref=db.backref('provider_profile', uselist=False))

class ProviderProfilePic(db.Model):
    __tablename__ = 'provider_profile_pics'
    id = db.Column(db.Integer, primary_key=True)
    provider_id = db.Column(db.Integer, db.ForeignKey('provider_profiles.id'), nullable=False, unique=True)
    image_path = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    provider = db.relationship('ProviderProfile', backref=db.backref('profile_pic', uselist=False))

class HouseListing(db.Model):
    __tablename__ = 'house_listings'
    id = db.Column(db.Integer, primary_key=True)
    provider_id = db.Column(db.Integer, db.ForeignKey('provider_profiles.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    price = db.Column(db.Numeric(10, 2), nullable=False)
    location = db.Column(db.String(200), nullable=False)
    type = db.Column(db.String(20), nullable=False)
    status = db.Column(db.String(20), nullable=False, default='pending')
    approved_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    provider = db.relationship('ProviderProfile', backref=db.backref('house_listings', lazy=True))

class SavedHouse(db.Model):
    __tablename__ = 'saved_houses'
    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    house_listing_id = db.Column(db.Integer, db.ForeignKey('house_listings.id'), nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    __table_args__ = (db.UniqueConstraint('customer_id', 'house_listing_id', name='unique_customer_listing'),)

    customer = db.relationship('User', backref=db.backref('saved_houses', lazy=True))
    listing = db.relationship('HouseListing', backref=db.backref('saved_by', lazy=True))

class HouseImage(db.Model):
    __tablename__ = 'house_images'
    id = db.Column(db.Integer, primary_key=True)
    listing_id = db.Column(db.Integer, db.ForeignKey('house_listings.id'), nullable=False)
    image_path = db.Column(db.String(500), nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    listing = db.relationship('HouseListing', backref=db.backref('images', lazy=True))

class HostelDetails(db.Model):
    __tablename__ = 'hostel_details'
    id = db.Column(db.Integer, primary_key=True)
    listing_id = db.Column(db.Integer, db.ForeignKey('house_listings.id'), nullable=False, unique=True)
    gender = db.Column(db.String(10), nullable=False)
    room_type = db.Column(db.String(20), nullable=False)
    wifi = db.Column(db.Boolean, nullable=False, default=False)
    attached_bathroom = db.Column(db.Boolean, nullable=False, default=False)
    food_included = db.Column(db.Boolean, nullable=False, default=False)
    laundry = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    listing = db.relationship('HouseListing', backref=db.backref('hostel_details', uselist=False))

class PGDetails(db.Model):
    __tablename__ = 'pg_details'
    id = db.Column(db.Integer, primary_key=True)
    listing_id = db.Column(db.Integer, db.ForeignKey('house_listings.id'), nullable=False, unique=True)
    gender = db.Column(db.String(10), nullable=False)
    ac_available = db.Column(db.Boolean, nullable=False, default=False)
    sharing = db.Column(db.String(10), nullable=False)
    food_included = db.Column(db.Boolean, nullable=False, default=False)
    laundry = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    listing = db.relationship('HouseListing', backref=db.backref('pg_details', uselist=False))

class ApartmentDetails(db.Model):
    __tablename__ = 'apartment_details'
    id = db.Column(db.Integer, primary_key=True)
    listing_id = db.Column(db.Integer, db.ForeignKey('house_listings.id'), nullable=False, unique=True)
    listing_purpose = db.Column(db.String(10), nullable=False)
    bhk = db.Column(db.String(10), nullable=False)
    tenant_preference = db.Column(db.String(20), nullable=False)
    furnishing = db.Column(db.String(20), nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    listing = db.relationship('HouseListing', backref=db.backref('apartment_details', uselist=False))

class TiffinListing(db.Model):
    __tablename__ = 'tiffin_listings'
    id = db.Column(db.Integer, primary_key=True)
    provider_id = db.Column(db.Integer, db.ForeignKey('provider_profiles.id'), nullable=False)
    delivery_radius = db.Column(db.Numeric(5, 2))
    fast_delivery_available = db.Column(db.Boolean, nullable=False, default=False)
    status = db.Column(db.String(20), nullable=False, default='pending')
    approved_at = db.Column(db.DateTime)
    diet_type = db.Column(db.String(20), nullable=False)
    available_days = db.Column(db.Text, nullable=False)
    kitchen_open = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    provider = db.relationship('ProviderProfile', backref=db.backref('tiffin_listings', lazy=True))

class TiffinImage(db.Model):
    __tablename__ = 'tiffin_images'
    id = db.Column(db.Integer, primary_key=True)
    tiffin_listing_id = db.Column(db.Integer, db.ForeignKey('tiffin_listings.id'), nullable=False)
    image_path = db.Column(db.String(500), nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    listing = db.relationship('TiffinListing', backref=db.backref('images', lazy=True))

class ServiceListing(db.Model):
    __tablename__ = 'service_listings'
    id = db.Column(db.Integer, primary_key=True)
    provider_id = db.Column(db.Integer, db.ForeignKey('provider_profiles.id'), nullable=False)
    service_category = db.Column(db.String(50), nullable=False)
    service_title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    base_price = db.Column(db.Numeric(10, 2), nullable=False)
    service_radius = db.Column(db.Numeric(5, 2))
    availability_days = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), nullable=False, default='pending')
    approved_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    provider = db.relationship('ProviderProfile', backref=db.backref('service_listings', lazy=True))

class Meal(db.Model):
    __tablename__ = 'meals'
    id = db.Column(db.Integer, primary_key=True)
    tiffin_listing_id = db.Column(db.Integer, db.ForeignKey('tiffin_listings.id'), nullable=False)
    meal_name = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text)
    meal_category = db.Column(db.String(20), nullable=False)
    diet_type = db.Column(db.String(20), nullable=False)
    price = db.Column(db.Numeric(10, 2), nullable=False)
    is_available = db.Column(db.Boolean, default=True)
    meal_image_path = db.Column(db.Text)
    created_at = db.Column(db.DateTime, server_default=db.func.now())

class Order(db.Model):
    __tablename__ = 'orders'
    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    tiffin_listing_id = db.Column(db.Integer, db.ForeignKey('tiffin_listings.id'), nullable=False)
    meal_id = db.Column(db.Integer, db.ForeignKey('meals.id'), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    base_price = db.Column(db.Numeric(10, 2), nullable=False)
    fast_delivery = db.Column(db.Boolean, default=False, nullable=False)
    fast_delivery_charge = db.Column(db.Numeric(10, 2), default=0)
    total_price = db.Column(db.Numeric(10, 2), nullable=False)
    order_status = db.Column(db.String(30), default='placed', nullable=False)
    delivery_address = db.Column(db.Text, nullable=False)
    order_date = db.Column(db.DateTime, server_default=db.func.now())

    customer = db.relationship('User', foreign_keys=[customer_id])
    tiffin_listing = db.relationship('TiffinListing', foreign_keys=[tiffin_listing_id])
    meal = db.relationship('Meal', foreign_keys=[meal_id])



class SavedService(db.Model):
    __tablename__ = 'saved_services'
    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    service_listing_id = db.Column(db.Integer, db.ForeignKey('service_listings.id'), nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    __table_args__ = (db.UniqueConstraint('customer_id', 'service_listing_id', name='unique_customer_service'),)

    customer = db.relationship('User', backref=db.backref('saved_services', lazy=True))
    service_listing = db.relationship('ServiceListing', backref=db.backref('saved_by', lazy=True))


class SavedKitchen(db.Model):
    __tablename__ = 'saved_kitchens'
    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    tiffin_listing_id = db.Column(db.Integer, db.ForeignKey('tiffin_listings.id'), nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    __table_args__ = (db.UniqueConstraint('customer_id', 'tiffin_listing_id', name='unique_customer_kitchen'),)

    customer = db.relationship('User', backref=db.backref('saved_kitchens', lazy=True))
    tiffin_listing = db.relationship('TiffinListing', backref=db.backref('saved_by', lazy=True))

class ServiceBooking(db.Model):
    __tablename__ = 'service_bookings'
    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    service_listing_id = db.Column(db.Integer, db.ForeignKey('service_listings.id'), nullable=False)
    booking_date = db.Column(db.Date, nullable=False)
    booking_time = db.Column(db.Time, nullable=False)
    booking_status = db.Column(db.String(20), default='requested', nullable=False)
    address = db.Column(db.Text, nullable=False)
    notes = db.Column(db.Text)
    quoted_price = db.Column(db.Numeric(10, 2))
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    customer = db.relationship('User', foreign_keys=[customer_id])
    service_listing = db.relationship('ServiceListing', foreign_keys=[service_listing_id])

@admin_bp.route('/admin/api/pending-providers/count', methods=['GET'])
def get_pending_providers_count():
    try:
        count = ProviderProfile.query.filter_by(verification_status='pending').count()
        return jsonify({'count': count}), 200
    except Exception as e:
        print(f"Error fetching pending providers count: {e}")
        return jsonify({'error': 'Internal Server Error', 'details': str(e)}), 500

@admin_bp.route('/admin/api/pending-providers', methods=['GET'])
def get_pending_providers():
    try:
        pending_profiles = ProviderProfile.query.filter_by(verification_status='pending').all()
        
        results = []
        for profile in pending_profiles:
            results.append({
                'id': profile.id,
                'business_name': profile.business_name
            })
        
        return jsonify(results), 200
    except Exception as e:
        print(f"Error fetching pending providers: {e}")
        return jsonify({'error': 'Internal Server Error', 'details': str(e)}), 500

@admin_bp.route('/admin/api/pending-houses/count', methods=['GET'])
def get_pending_houses_count():
    try:
        count = HouseListing.query.filter_by(status='pending').count()
        return jsonify({'count': count}), 200
    except Exception as e:
        print(f"Error fetching pending houses count: {e}")
        return jsonify({'error': 'Internal Server Error', 'details': str(e)}), 500

@admin_bp.route('/admin/api/pending-houses', methods=['GET'])
def get_pending_houses():
    try:
        listings = db.session.query(HouseListing, ProviderProfile)\
            .join(ProviderProfile, HouseListing.provider_id == ProviderProfile.id)\
            .filter(HouseListing.status == 'pending')\
            .all()
        
        results = []
        for listing, provider in listings:
            results.append({
                'id': listing.id,
                'title': listing.title,
                'provider_business_name': provider.business_name
            })
        
        return jsonify(results), 200
    except Exception as e:
        print(f"Error fetching pending houses: {e}")
        return jsonify({'error': 'Internal Server Error', 'details': str(e)}), 500

@admin_bp.route('/admin/api/pending-tiffins/count', methods=['GET'])
def get_pending_tiffins_count():
    try:
        count = TiffinListing.query.filter_by(status='pending').count()
        return jsonify({'count': count}), 200
    except Exception as e:
        print(f"Error fetching pending tiffins count: {e}")
        return jsonify({'error': 'Internal Server Error', 'details': str(e)}), 500

@admin_bp.route('/admin/api/pending-tiffins', methods=['GET'])
def get_pending_tiffins():
    try:
        listings = db.session.query(TiffinListing, ProviderProfile)\
            .join(ProviderProfile, TiffinListing.provider_id == ProviderProfile.id)\
            .filter(TiffinListing.status == 'pending')\
            .all()
        
        results = []
        for listing, provider in listings:
            results.append({
                'id': listing.id,
                'provider_business_name': provider.business_name,
                'diet_type': listing.diet_type
            })
        
        return jsonify(results), 200
    except Exception as e:
        print(f"Error fetching pending tiffins: {e}")
        return jsonify({'error': 'Internal Server Error', 'details': str(e)}), 500

@admin_bp.route('/admin/api/pending-services/count', methods=['GET'])
def get_pending_services_count():
    try:
        count = ServiceListing.query.filter_by(status='pending').count()
        return jsonify({'count': count}), 200
    except Exception as e:
        print(f"Error fetching pending services count: {e}")
        return jsonify({'error': 'Internal Server Error', 'details': str(e)}), 500

@admin_bp.route('/admin/api/pending-services', methods=['GET'])
def get_pending_services():
    try:
        listings = db.session.query(ServiceListing, ProviderProfile)\
            .join(ProviderProfile, ServiceListing.provider_id == ProviderProfile.id)\
            .filter(ServiceListing.status == 'pending')\
            .all()
        
        results = []
        for listing, provider in listings:
            results.append({
                'id': listing.id,
                'service_category': listing.service_category,
                'service_title': listing.service_title,
                'provider_business_name': provider.business_name
            })
        
        return jsonify(results), 200
    except Exception as e:
        print(f"Error fetching pending services: {e}")
        return jsonify({'error': 'Internal Server Error', 'details': str(e)}), 500

@admin_bp.route('/admin/api/provider-profiles', methods=['GET'])
def get_provider_profiles():
    try:
        profiles = db.session.query(ProviderProfile, User)\
            .join(User, ProviderProfile.user_id == User.id)\
            .all()
        
        results = []
        for profile, user in profiles:
            results.append({
                'id': profile.id,
                'username': user.username,
                'business_name': profile.business_name,
                'aadhaar_number': profile.aadhaar_number,
                'business_license': profile.business_license or "N/A",
                'verification_status': profile.verification_status,
                'verified_at': profile.verified_at.strftime('%Y-%m-%d') if profile.verified_at else None,
                'created_at': profile.created_at.strftime('%Y-%m-%d') if profile.created_at else None
            })
            
        return jsonify(results), 200

    except Exception as e:
        print(f"Error fetching provider profiles: {e}")
        return jsonify({'error': 'Internal Server Error', 'details': str(e)}), 500

@admin_bp.route('/admin/api/users', methods=['GET'])
def get_users():
    try:
        users = User.query.all()
        results = []
        for user in users:
            results.append({
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'phone': user.phone,
                'account_type': user.account_type,
                'status': user.status,
                'created_at': user.created_at.strftime('%Y-%m-%d') if user.created_at else None
            })
        return jsonify(results), 200
    except Exception as e:
        print(f"Error fetching users: {e}")
        return jsonify({'error': 'Internal Server Error', 'details': str(e)}), 500

@admin_bp.route('/admin/api/users/<int:user_id>/suspend', methods=['POST'])
def suspend_user(user_id):
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'success': False, 'message': 'User not found'}), 404
            
        if user.account_type == 'admin':
            return jsonify({'success': False, 'message': 'Cannot suspend admin accounts'}), 403
            
        if user.status == 'suspended':
             return jsonify({'success': False, 'message': 'User is already suspended', 'updated_status': user.status}), 200

        user.status = 'suspended'
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'User suspended successfully', 'updated_status': user.status}), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error suspending user: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@admin_bp.route('/admin/api/house-listings', methods=['GET'])
def get_house_listings():
    try:
        listings = db.session.query(HouseListing, ProviderProfile, User)\
            .join(ProviderProfile, HouseListing.provider_id == ProviderProfile.id)\
            .join(User, ProviderProfile.user_id == User.id)\
            .all()

        results = []
        for listing, provider, user in listings:
            results.append({
                'id': listing.id,
                'provider_business_name': provider.business_name,
                'provider_username': user.username,
                'title': listing.title,
                'price': float(listing.price),
                'location': listing.location,
                'type': listing.type,
                'status': listing.status,
                'approved_at': listing.approved_at.strftime('%Y-%m-%d') if listing.approved_at else None,
                'created_at': listing.created_at.strftime('%Y-%m-%d') if listing.created_at else None
            })
        
        return jsonify(results), 200

    except Exception as e:
        print(f"Error fetching house listings: {e}")
        return jsonify({'error': 'Internal Server Error', 'details': str(e)}), 500

@admin_bp.route('/admin/api/tiffin-listings', methods=['GET'])
def get_tiffin_listings():
    try:
        listings = db.session.query(TiffinListing, ProviderProfile, User)\
            .join(ProviderProfile, TiffinListing.provider_id == ProviderProfile.id)\
            .join(User, ProviderProfile.user_id == User.id)\
            .all()

        results = []
        for listing, provider, user in listings:
            results.append({
                'id': listing.id,
                'provider_business_name': provider.business_name,
                'provider_username': user.username,
                'delivery_radius': float(listing.delivery_radius) if listing.delivery_radius else 0.0,
                'fast_delivery_available': listing.fast_delivery_available,
                'diet_type': listing.diet_type,
                'available_days': listing.available_days,
                'status': listing.status,
                'approved_at': listing.approved_at.strftime('%Y-%m-%d') if listing.approved_at else None,
                'created_at': listing.created_at.strftime('%Y-%m-%d') if listing.created_at else None
            })
        
        return jsonify(results), 200

    except Exception as e:
        print(f"Error fetching tiffin listings: {e}")
        return jsonify({'error': 'Internal Server Error', 'details': str(e)}), 500

@admin_bp.route('/admin/api/service-listings', methods=['GET'])
def get_service_listings():
    try:
        listings = db.session.query(ServiceListing, ProviderProfile, User)\
            .join(ProviderProfile, ServiceListing.provider_id == ProviderProfile.id)\
            .join(User, ProviderProfile.user_id == User.id)\
            .all()

        results = []
        for listing, provider, user in listings:
            results.append({
                'id': listing.id,
                'provider_business_name': provider.business_name,
                'provider_username': user.username,
                'service_category': listing.service_category,
                'service_title': listing.service_title,
                'base_price': float(listing.base_price),
                'service_radius': float(listing.service_radius) if listing.service_radius else None,
                'availability_days': listing.availability_days,
                'status': listing.status,
                'approved_at': listing.approved_at.strftime('%Y-%m-%d') if listing.approved_at else None,
                'created_at': listing.created_at.strftime('%Y-%m-%d') if listing.created_at else None
            })
        
        return jsonify(results), 200

    except Exception as e:
        print(f"Error fetching service listings: {e}")
        return jsonify({'error': 'Internal Server Error', 'details': str(e)}), 500

@admin_bp.route('/admin/api/orders', methods=['GET'])
def get_orders():
    try:
        orders = db.session.query(Order, User, ProviderProfile, Meal)\
            .join(User, Order.customer_id == User.id)\
            .join(TiffinListing, Order.tiffin_listing_id == TiffinListing.id)\
            .join(ProviderProfile, TiffinListing.provider_id == ProviderProfile.id)\
            .join(Meal, Order.meal_id == Meal.id)\
            .order_by(Order.order_date.desc())\
            .all()

        results = []
        for order, customer, provider, meal in orders:
            results.append({
                'id': order.id,
                'customer_username': customer.username,
                'provider_business_name': provider.business_name,
                'meal_name': meal.meal_name,
                'quantity': order.quantity,
                'base_price': float(order.base_price),
                'fast_delivery': order.fast_delivery,
                'fast_delivery_charge': float(order.fast_delivery_charge) if order.fast_delivery_charge else 0.0,
                'total_price': float(order.total_price),
                'order_status': order.order_status,
                'delivery_address': order.delivery_address,
                'order_date': order.order_date.strftime('%Y-%m-%d') if order.order_date else None
            })
        
        return jsonify(results), 200

    except Exception as e:
        print(f"Error fetching orders: {e}")
        return jsonify({'error': 'Internal Server Error', 'details': str(e)}), 500

@admin_bp.route('/admin/api/service-bookings', methods=['GET'])
def get_service_bookings():
    try:
        bookings = db.session.query(ServiceBooking, User, ServiceListing, ProviderProfile)\
            .join(User, ServiceBooking.customer_id == User.id)\
            .join(ServiceListing, ServiceBooking.service_listing_id == ServiceListing.id)\
            .join(ProviderProfile, ServiceListing.provider_id == ProviderProfile.id)\
            .order_by(ServiceBooking.created_at.desc())\
            .all()

        results = []
        for booking, customer, service, provider in bookings:
            results.append({
                'id': booking.id,
                'customer_username': customer.username,
                'provider_business_name': provider.business_name,
                'service_title': service.service_title,
                'booking_date': booking.booking_date.strftime('%Y-%m-%d') if booking.booking_date else None,
                'booking_time': booking.booking_time.strftime('%H:%M') if booking.booking_time else None,
                'booking_status': booking.booking_status,
                'address': booking.address,
                'notes': booking.notes,
                'quoted_price': float(booking.quoted_price) if booking.quoted_price else None,
                'created_at': booking.created_at.strftime('%Y-%m-%d') if booking.created_at else None
            })
        
        return jsonify(results), 200

    except Exception as e:
        print(f"Error fetching service bookings: {e}")
        return jsonify({'error': 'Internal Server Error', 'details': str(e)}), 500

@admin_bp.route('/admin/api/provider/<int:provider_id>', methods=['GET'])
def get_provider_details(provider_id):
    try:
        result = db.session.query(ProviderProfile, User)\
            .join(User, ProviderProfile.user_id == User.id)\
            .filter(ProviderProfile.id == provider_id)\
            .first()
        
        if not result:
            return jsonify({'success': False, 'message': 'Provider not found'}), 404
        
        profile, user = result
        
        profile_pic = ProviderProfilePic.query.filter_by(provider_id=provider_id).first()
        profile_image = profile_pic.image_path if profile_pic else None
        
        return jsonify({
            'id': profile.id,
            'business_name': profile.business_name,
            'aadhaar_number': profile.aadhaar_number,
            'business_license': profile.business_license or 'N/A',
            'email': user.email,
            'phone': user.phone,
            'created_at': profile.created_at.strftime('%Y-%m-%d') if profile.created_at else None,
            'profile_image': profile_image
        }), 200
        
    except Exception as e:
        print(f"Error fetching provider details: {e}")
        return jsonify({'error': 'Internal Server Error', 'details': str(e)}), 500

@admin_bp.route('/admin/api/provider/<int:provider_id>/approve', methods=['POST'])
def approve_provider(provider_id):
    try:
        provider = ProviderProfile.query.get(provider_id)
        if not provider:
            return jsonify({'success': False, 'message': 'Provider not found'}), 404
        
        provider.verification_status = 'verified'
        provider.verified_at = db.func.now()
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Provider approved successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error approving provider: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@admin_bp.route('/admin/api/provider/<int:provider_id>/reject', methods=['POST'])
def reject_provider(provider_id):
    try:
        provider = ProviderProfile.query.get(provider_id)
        if not provider:
            return jsonify({'success': False, 'message': 'Provider not found'}), 404
        
        provider.verification_status = 'rejected'
        provider.verified_at = None
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Provider rejected successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error rejecting provider: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@admin_bp.route('/admin/api/service/<int:service_id>', methods=['GET'])
def get_service_details(service_id):
    try:
        result = db.session.query(ServiceListing, ProviderProfile, User)\
            .join(ProviderProfile, ServiceListing.provider_id == ProviderProfile.id)\
            .join(User, ProviderProfile.user_id == User.id)\
            .filter(ServiceListing.id == service_id)\
            .first()
        
        if not result:
            return jsonify({'success': False, 'message': 'Service not found'}), 404
        
        service, provider, user = result
        
        return jsonify({
            'id': service.id,
            'service_category': service.service_category,
            'service_title': service.service_title,
            'description': service.description or 'N/A',
            'base_price': float(service.base_price),
            'service_radius': float(service.service_radius) if service.service_radius else None,
            'availability_days': service.availability_days,
            'provider_business_name': provider.business_name,
            'provider_email': user.email,
            'provider_phone': user.phone,
            'created_at': service.created_at.strftime('%Y-%m-%d') if service.created_at else None
        }), 200
        
    except Exception as e:
        print(f"Error fetching service details: {e}")
        return jsonify({'error': 'Internal Server Error', 'details': str(e)}), 500

@admin_bp.route('/admin/api/service/<int:service_id>/approve', methods=['POST'])
def approve_service(service_id):
    try:
        service = ServiceListing.query.get(service_id)
        if not service:
            return jsonify({'success': False, 'message': 'Service not found'}), 404
        
        service.status = 'approved'
        service.approved_at = db.func.now()
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Service approved successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error approving service: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@admin_bp.route('/admin/api/service/<int:service_id>/reject', methods=['POST'])
def reject_service(service_id):
    try:
        service = ServiceListing.query.get(service_id)
        if not service:
            return jsonify({'success': False, 'message': 'Service not found'}), 404
        
        service.status = 'rejected'
        service.approved_at = None
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Service rejected successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error rejecting service: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@admin_bp.route('/admin/api/tiffin/<int:tiffin_id>', methods=['GET'])
def get_tiffin_details(tiffin_id):
    try:
        result = db.session.query(TiffinListing, ProviderProfile, User)\
            .join(ProviderProfile, TiffinListing.provider_id == ProviderProfile.id)\
            .join(User, ProviderProfile.user_id == User.id)\
            .filter(TiffinListing.id == tiffin_id)\
            .first()
        
        if not result:
            return jsonify({'success': False, 'message': 'Tiffin not found'}), 404
        
        tiffin, provider, user = result
        
        return jsonify({
            'id': tiffin.id,
            'provider_business_name': provider.business_name,
            'provider_email': user.email,
            'provider_phone': user.phone,
            'business_license': provider.business_license or 'N/A',
            'delivery_radius': float(tiffin.delivery_radius) if tiffin.delivery_radius else None,
            'fast_delivery_available': tiffin.fast_delivery_available,
            'available_days': tiffin.available_days,
            'diet_type': tiffin.diet_type,
            'created_at': tiffin.created_at.strftime('%Y-%m-%d') if tiffin.created_at else None
        }), 200
        
    except Exception as e:
        print(f"Error fetching tiffin details: {e}")
        return jsonify({'error': 'Internal Server Error', 'details': str(e)}), 500

@admin_bp.route('/admin/api/tiffin/<int:tiffin_id>/approve', methods=['POST'])
def approve_tiffin(tiffin_id):
    try:
        tiffin = TiffinListing.query.get(tiffin_id)
        if not tiffin:
            return jsonify({'success': False, 'message': 'Tiffin not found'}), 404
        
        tiffin.status = 'approved'
        tiffin.approved_at = db.func.now()
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Tiffin approved successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error approving tiffin: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@admin_bp.route('/admin/api/tiffin/<int:tiffin_id>/reject', methods=['POST'])
def reject_tiffin(tiffin_id):
    try:
        tiffin = TiffinListing.query.get(tiffin_id)
        if not tiffin:
            return jsonify({'success': False, 'message': 'Tiffin not found'}), 404
        
        tiffin.status = 'rejected'
        tiffin.approved_at = None
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Tiffin rejected successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error rejecting tiffin: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@admin_bp.route('/admin/api/house/<int:house_id>', methods=['GET'])
def get_house_details(house_id):
    try:
        result = db.session.query(HouseListing, ProviderProfile, User)\
            .join(ProviderProfile, HouseListing.provider_id == ProviderProfile.id)\
            .join(User, ProviderProfile.user_id == User.id)\
            .filter(HouseListing.id == house_id)\
            .first()
        
        if not result:
            return jsonify({'success': False, 'message': 'House listing not found'}), 404
        
        house, provider, user = result
        
        images = HouseImage.query.filter_by(listing_id=house_id).all()
        image_paths = [{'image_path': img.image_path} for img in images]
        
        return jsonify({
            'id': house.id,
            'title': house.title,
            'description': house.description or 'N/A',
            'price': float(house.price),
            'location': house.location,
            'type': house.type,
            'created_at': house.created_at.strftime('%Y-%m-%d') if house.created_at else None,
            'provider_business_name': provider.business_name,
            'business_license': provider.business_license or 'N/A',
            'provider_phone': user.phone,
            'provider_email': user.email,
            'images': image_paths
        }), 200
        
    except Exception as e:
        print(f"Error fetching house details: {e}")
        return jsonify({'error': 'Internal Server Error', 'details': str(e)}), 500

@admin_bp.route('/admin/api/house/<int:house_id>/approve', methods=['POST'])
def approve_house(house_id):
    try:
        house = HouseListing.query.get(house_id)
        if not house:
            return jsonify({'success': False, 'message': 'House listing not found'}), 404
        
        house.status = 'approved'
        house.approved_at = db.func.now()
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'House approved successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error approving house: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@admin_bp.route('/admin/api/house/<int:house_id>/reject', methods=['POST'])
def reject_house(house_id):
    try:
        house = HouseListing.query.get(house_id)
        if not house:
            return jsonify({'success': False, 'message': 'House listing not found'}), 404
        
        house.status = 'rejected'
        house.approved_at = None
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'House rejected successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error rejecting house: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500