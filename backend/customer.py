from flask import Blueprint, session, redirect, render_template, request, jsonify, send_file
from authorization import db, User
from sqlalchemy import text

customer_bp = Blueprint('customer', __name__)


def get_current_user():
    """Get current logged-in user from session"""
    user_id = session.get('user_id')
    if not user_id:
        return None
    return User.query.get(user_id)


# --- Routes ---

@customer_bp.route('/customer/dashboard')
def customer_dashboard():
    """Serve customer dashboard - requires authentication"""
    user = get_current_user()

    if not user:
        return redirect('/login')

    if user.account_type != 'customer':
        return redirect('/')

    return render_template('dashboards/customer/customer.html', username=user.username)


@customer_bp.route('/customer/logout', methods=['POST', 'GET'])
def customer_logout():
    """Clear session and redirect to login"""
    session.clear()
    return redirect('/login')

# --- Housing Routes ---

from admin import (
    HouseListing, HouseImage, SavedHouse, HostelDetails, PGDetails, ApartmentDetails,
    ServiceListing, SavedService, ServiceBooking,
    TiffinListing, Meal, Order, ProviderProfile
)

@customer_bp.route('/housing/hostel')
def browse_hostels():
    from flask import request
    
    user = get_current_user()
    username = user.username if user else "Guest"

    # Read search query params
    search_location = request.args.get('location', '').strip()
    search_budget = request.args.get('budget', '').strip()

    # Build dynamic query with JOIN to hostel_details
    base_query = """
        SELECT hl.*, 
               hd.gender, hd.room_type, hd.wifi, hd.attached_bathroom, hd.food_included, hd.laundry,
               (SELECT image_path 
                FROM house_images 
                WHERE listing_id = hl.id 
                ORDER BY created_at ASC 
                LIMIT 1) AS main_image
        FROM house_listings hl
        JOIN hostel_details hd ON hl.id = hd.listing_id
        WHERE hl.type = 'Hostel'
        AND hl.status = 'approved'
    """
    
    params = {}
    
    # Location filter (partial match, case-insensitive)
    if search_location:
        base_query += " AND LOWER(hl.location) LIKE LOWER(:location)"
        params['location'] = f"%{search_location}%"
    
    # Budget filter
    if search_budget == '1':
        base_query += " AND hl.price >= 0 AND hl.price <= 5000"
    elif search_budget == '2':
        base_query += " AND hl.price > 5000 AND hl.price <= 10000"
    elif search_budget == '3':
        base_query += " AND hl.price > 10000 AND hl.price <= 15000"
    elif search_budget == '4':
        base_query += " AND hl.price > 15000"
    
    base_query += " ORDER BY hl.created_at DESC"
    
    results = db.session.execute(text(base_query), params).fetchall()
    
    listings_data = []
    for row in results:
        image_path = row[-1] if row[-1] else 'placeholder.jpg'
        
        listings_data.append({
            'id': row[0],
            'title': row[2],
            'description': row[3] or '',
            'price': row[4],
            'location': row[5],
            'image_path': image_path,
            'gender': row[7],
            'room_type': row[8],
            'wifi': row[9],
            'attached_bathroom': row[10],
            'food_included': row[11],
            'laundry': row[12]
        })
        
    return render_template(
        'housing/hostel/hostel.html', 
        username=username, 
        listings=listings_data,
        search_location=search_location,
        search_budget=search_budget
    )


@customer_bp.route('/housing/hostel/<int:listing_id>/details')
def hostel_details(listing_id):
    """Return JSON details for a specific hostel listing"""
    from flask import jsonify
    
    user = get_current_user()
    if not user:
        return jsonify({'success': False, 'message': 'Not authenticated'}), 401
    if user.account_type != 'customer':
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403

    try:
        # Fetch listing + provider + user + profile pic + hostel_details
        query = text("""
            SELECT hl.id, hl.title, hl.description, hl.price, hl.location, hl.type,
                   hl.status, hl.created_at,
                   pp.business_name, pp.verification_status,
                   u.phone, u.email,
                   ppic.image_path AS provider_profile_pic,
                   hd.gender, hd.room_type, hd.wifi, hd.attached_bathroom, hd.food_included, hd.laundry
            FROM house_listings hl
            JOIN provider_profiles pp ON hl.provider_id = pp.id
            JOIN users u ON pp.user_id = u.id
            LEFT JOIN provider_profile_pics ppic ON pp.id = ppic.provider_id
            JOIN hostel_details hd ON hl.id = hd.listing_id
            WHERE hl.id = :listing_id
            AND hl.type = 'Hostel'
            AND hl.status = 'approved'
        """)
        
        result = db.session.execute(query, {'listing_id': listing_id}).fetchone()
        
        if not result:
            return jsonify({'success': False, 'message': 'Listing not found'}), 404
        
        # Fetch all images
        images_query = text("""
            SELECT image_path
            FROM house_images
            WHERE listing_id = :listing_id
            ORDER BY created_at ASC
        """)
        images = db.session.execute(images_query, {'listing_id': listing_id}).fetchall()
        image_list = [row[0] for row in images]
        
        return jsonify({
            'success': True,
            'listing': {
                'id': result[0],
                'title': result[1],
                'description': result[2] or '',
                'price': float(result[3]),
                'location': result[4],
                'type': result[5],
                'created_at': result[7].strftime('%B %d, %Y') if result[7] else None,
                'images': image_list,
                'gender': result[13],
                'room_type': result[14],
                'wifi': result[15],
                'attached_bathroom': result[16],
                'food_included': result[17],
                'laundry': result[18]
            },
            'provider': {
                'business_name': result[8],
                'verification_status': result[9],
                'phone': result[10],
                'email': result[11],
                'profile_pic': result[12]
            }
        }), 200
        
    except Exception as e:
        print(f"Error fetching hostel details: {e}")
        return jsonify({'success': False, 'message': 'Server error'}), 500


@customer_bp.route('/housing/hostel/<int:listing_id>/save', methods=['POST'])
def save_hostel(listing_id):
    """Save a hostel listing for the current customer"""
    from flask import request, jsonify
    
    user = get_current_user()
    if not user:
        return jsonify({'success': False, 'message': 'Not authenticated'}), 401
    if user.account_type != 'customer':
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403

    try:
        # 1. Validate listing exists and is approved
        listing = HouseListing.query.filter_by(id=listing_id, type='Hostel', status='approved').first()
        if not listing:
            return jsonify({'success': False, 'message': 'Listing not found or not available'}), 404

        # 2. Check if already saved
        existing_save = SavedHouse.query.filter_by(customer_id=user.id, house_listing_id=listing_id).first()
        if existing_save:
            return jsonify({'success': True, 'already_saved': True, 'message': 'Hostel already saved'}), 200

        # 3. Create new save
        new_save = SavedHouse(customer_id=user.id, house_listing_id=listing_id)
        db.session.add(new_save)
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Hostel saved successfully'}), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error saving hostel: {e}")
        return jsonify({'success': False, 'message': 'Server error'}), 500


@customer_bp.route('/housing/hostel/<int:listing_id>/unsave', methods=['DELETE'])
def unsave_hostel(listing_id):
    """Remove a saved hostel listing for the current customer"""
    from flask import jsonify
    
    user = get_current_user()
    if not user:
        return jsonify({'success': False, 'message': 'Not authenticated'}), 401
    
    try:
        # Delete if exists
        save_entry = SavedHouse.query.filter_by(customer_id=user.id, house_listing_id=listing_id).first()
        
        if save_entry:
            db.session.delete(save_entry)
            db.session.commit()
            return jsonify({'success': True, 'removed': True, 'message': 'Hostel removed from saved list'}), 200
        else:
            return jsonify({'success': True, 'removed': False, 'message': 'Hostel was not saved'}), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error unsaving hostel: {e}")
        return jsonify({'success': False, 'message': 'Server error'}), 500


@customer_bp.route('/housing/hostel/<int:listing_id>/is-saved', methods=['GET'])
def is_hostel_saved(listing_id):
    """Check if a hostel is saved by the current customer"""
    from flask import jsonify
    
    user = get_current_user()
    if not user:
        return jsonify({'saved': False}), 200
    
    try:
        exists = SavedHouse.query.filter_by(customer_id=user.id, house_listing_id=listing_id).first() is not None
        return jsonify({'saved': exists}), 200
        
    except Exception as e:
        print(f"Error checking saved status: {e}")
        return jsonify({'saved': False}), 200


# --- PG Routes ---

@customer_bp.route('/housing/pg')
def browse_pgs():
    from flask import request
    
    user = get_current_user()
    username = user.username if user else "Guest"

    # Read search query params
    search_location = request.args.get('location', '').strip()
    search_budget = request.args.get('budget', '').strip()

    # Build dynamic query with JOIN to pg_details
    base_query = """
        SELECT hl.*, 
               pd.gender, pd.ac_available, pd.sharing, pd.food_included, pd.laundry,
               (SELECT image_path 
                FROM house_images 
                WHERE listing_id = hl.id 
                ORDER BY created_at ASC 
                LIMIT 1) AS main_image
        FROM house_listings hl
        JOIN pg_details pd ON hl.id = pd.listing_id
        WHERE hl.type = 'PG'
        AND hl.status = 'approved'
    """
    
    params = {}
    
    # Location filter
    if search_location:
        base_query += " AND LOWER(hl.location) LIKE LOWER(:location)"
        params['location'] = f"%{search_location}%"
    
    # Budget filter
    if search_budget == '1':
        base_query += " AND hl.price >= 0 AND hl.price <= 5000"
    elif search_budget == '2':
        base_query += " AND hl.price > 5000 AND hl.price <= 10000"
    elif search_budget == '3':
        base_query += " AND hl.price > 10000 AND hl.price <= 15000"
    elif search_budget == '4':
        base_query += " AND hl.price > 15000"
    
    base_query += " ORDER BY hl.created_at DESC"
    
    results = db.session.execute(text(base_query), params).fetchall()
    
    listings_data = []
    for row in results:
        image_path = row[-1] if row[-1] else 'placeholder.jpg'
        
        listings_data.append({
            'id': row[0],
            'title': row[2],
            'description': row[3] or '',
            'price': row[4],
            'location': row[5],
            'image_path': image_path,
            'gender': row[7],
            'ac_available': row[8],
            'sharing': row[9],
            'food_included': row[10],
            'laundry': row[11]
        })
        
    return render_template(
        'housing/pg/pg.html', 
        username=username, 
        listings=listings_data,
        search_location=search_location,
        search_budget=search_budget
    )


@customer_bp.route('/housing/pg/<int:listing_id>/details')
def pg_details(listing_id):
    """Return JSON details for a specific PG listing"""
    from flask import jsonify
    
    user = get_current_user()
    if not user:
        return jsonify({'success': False, 'message': 'Not authenticated'}), 401
    if user.account_type != 'customer':
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403

    try:
        # Fetch listing + provider + user + profile pic + pg_details
        query = text("""
            SELECT hl.id, hl.title, hl.description, hl.price, hl.location, hl.type,
                   hl.status, hl.created_at,
                   pp.business_name, pp.verification_status,
                   u.phone, u.email,
                   ppic.image_path AS provider_profile_pic,
                   pd.gender, pd.ac_available, pd.sharing, pd.food_included, pd.laundry
            FROM house_listings hl
            JOIN provider_profiles pp ON hl.provider_id = pp.id
            JOIN users u ON pp.user_id = u.id
            LEFT JOIN provider_profile_pics ppic ON pp.id = ppic.provider_id
            JOIN pg_details pd ON hl.id = pd.listing_id
            WHERE hl.id = :listing_id
            AND hl.type = 'PG'
            AND hl.status = 'approved'
        """)
        
        result = db.session.execute(query, {'listing_id': listing_id}).fetchone()
        
        if not result:
            return jsonify({'success': False, 'message': 'Listing not found'}), 404
        
        # Fetch all images
        images_query = text("""
            SELECT image_path
            FROM house_images
            WHERE listing_id = :listing_id
            ORDER BY created_at ASC
        """)
        images = db.session.execute(images_query, {'listing_id': listing_id}).fetchall()
        image_list = [row[0] for row in images]
        
        return jsonify({
            'success': True,
            'listing': {
                'id': result[0],
                'title': result[1],
                'description': result[2] or '',
                'price': float(result[3]),
                'location': result[4],
                'type': result[5],
                'created_at': result[7].strftime('%B %d, %Y') if result[7] else None,
                'images': image_list,
                'gender': result[13],
                'ac_available': result[14],
                'sharing': result[15],
                'food_included': result[16],
                'laundry': result[17]
            },
            'provider': {
                'business_name': result[8],
                'verification_status': result[9],
                'phone': result[10],
                'email': result[11],
                'profile_pic': result[12]
            }
        }), 200
        
    except Exception as e:
        print(f"Error fetching PG details: {e}")
        return jsonify({'success': False, 'message': 'Server error'}), 500


@customer_bp.route('/housing/pg/<int:listing_id>/save', methods=['POST'])
def save_pg(listing_id):
    """Save a PG listing for the current customer"""
    from flask import jsonify
    
    user = get_current_user()
    if not user:
        return jsonify({'success': False, 'message': 'Not authenticated'}), 401
    if user.account_type != 'customer':
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403

    try:
        # 1. Validate listing exists and is approved PG
        listing = HouseListing.query.filter_by(id=listing_id, type='PG', status='approved').first()
        if not listing:
            return jsonify({'success': False, 'message': 'Listing not found or not available'}), 404

        # 2. Check if already saved
        existing_save = SavedHouse.query.filter_by(customer_id=user.id, house_listing_id=listing_id).first()
        if existing_save:
            return jsonify({'success': True, 'already_saved': True, 'message': 'PG already saved'}), 200

        # 3. Create new save
        new_save = SavedHouse(customer_id=user.id, house_listing_id=listing_id)
        db.session.add(new_save)
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'PG saved successfully'}), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error saving PG: {e}")
        return jsonify({'success': False, 'message': 'Server error'}), 500


@customer_bp.route('/housing/pg/<int:listing_id>/unsave', methods=['DELETE'])
def unsave_pg(listing_id):
    """Remove a saved PG listing for the current customer"""
    from flask import jsonify
    
    user = get_current_user()
    if not user:
        return jsonify({'success': False, 'message': 'Not authenticated'}), 401
    
    try:
        # Delete if exists
        save_entry = SavedHouse.query.filter_by(customer_id=user.id, house_listing_id=listing_id).first()
        
        if save_entry:
            db.session.delete(save_entry)
            db.session.commit()
            return jsonify({'success': True, 'removed': True, 'message': 'PG removed from saved list'}), 200
        else:
            return jsonify({'success': True, 'removed': False, 'message': 'PG was not saved'}), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error unsaving PG: {e}")
        return jsonify({'success': False, 'message': 'Server error'}), 500


@customer_bp.route('/housing/pg/<int:listing_id>/is-saved', methods=['GET'])
def is_pg_saved(listing_id):
    """Check if a PG is saved by the current customer"""
    from flask import jsonify
    
    user = get_current_user()
    if not user:
        return jsonify({'saved': False}), 200
    
    try:
        exists = SavedHouse.query.filter_by(customer_id=user.id, house_listing_id=listing_id).first() is not None
        return jsonify({'saved': exists}), 200
        
    except Exception as e:
        print(f"Error checking saved status: {e}")
        return jsonify({'saved': False}), 200


# --- Apartment Routes ---

@customer_bp.route('/housing/apartment')
def browse_apartments():
    from flask import request
    
    user = get_current_user()
    if not user:
        return redirect('/login')
    if user.account_type != 'customer':
        return redirect('/')

    username = user.username

    # Read search query params
    search_location = request.args.get('location', '').strip()
    search_budget = request.args.get('budget', '').strip()

    # Build dynamic query with JOIN to apartment_details
    base_query = """
        SELECT hl.*, 
               ad.listing_purpose, ad.bhk, ad.tenant_preference, ad.furnishing,
               (SELECT image_path 
                FROM house_images 
                WHERE listing_id = hl.id 
                ORDER BY created_at ASC 
                LIMIT 1) AS main_image
        FROM house_listings hl
        JOIN apartment_details ad ON hl.id = ad.listing_id
        WHERE hl.type = 'Apartment'
        AND hl.status = 'approved'
    """
    
    params = {}
    
    # Location filter
    if search_location:
        base_query += " AND LOWER(hl.location) LIKE LOWER(:location)"
        params['location'] = f"%{search_location}%"
    
    # Budget filter
    if search_budget == '1':
        base_query += " AND hl.price >= 0 AND hl.price <= 5000"
    elif search_budget == '2':
        base_query += " AND hl.price > 5000 AND hl.price <= 10000"
    elif search_budget == '3':
        base_query += " AND hl.price > 10000 AND hl.price <= 15000"
    elif search_budget == '4':
        base_query += " AND hl.price > 15000"
    
    base_query += " ORDER BY hl.created_at DESC"
    
    results = db.session.execute(text(base_query), params).fetchall()
    
    listings_data = []
    for row in results:
        image_path = row[-1] if row[-1] else 'placeholder.jpg'
        
        listings_data.append({
            'id': row[0],
            'title': row[2],
            'description': row[3] or '',
            'price': row[4],
            'location': row[5],
            'image_path': image_path,
            'listing_purpose': row[7],
            'bhk': row[8],
            'tenant_preference': row[9],
            'furnishing': row[10]
        })
        
    return render_template(
        'housing/apartment/apartment.html', 
        username=username, 
        listings=listings_data,
        search_location=search_location,
        search_budget=search_budget
    )


@customer_bp.route('/housing/apartment/<int:listing_id>/details')
def apartment_details(listing_id):
    """Return JSON details for a specific Apartment listing"""
    from flask import jsonify
    
    user = get_current_user()
    if not user:
        return jsonify({'success': False, 'message': 'Not authenticated'}), 401
    if user.account_type != 'customer':
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403

    try:
        # Fetch listing + provider + user + profile pic + apartment_details
        query = text("""
            SELECT hl.id, hl.title, hl.description, hl.price, hl.location, hl.type,
                   hl.status, hl.created_at,
                   pp.business_name, pp.verification_status,
                   u.phone, u.email,
                   ppic.image_path AS provider_profile_pic,
                   ad.listing_purpose, ad.bhk, ad.tenant_preference, ad.furnishing
            FROM house_listings hl
            JOIN provider_profiles pp ON hl.provider_id = pp.id
            JOIN users u ON pp.user_id = u.id
            LEFT JOIN provider_profile_pics ppic ON pp.id = ppic.provider_id
            JOIN apartment_details ad ON hl.id = ad.listing_id
            WHERE hl.id = :listing_id
            AND hl.type = 'Apartment'
            AND hl.status = 'approved'
        """)
        
        result = db.session.execute(query, {'listing_id': listing_id}).fetchone()
        
        if not result:
            return jsonify({'success': False, 'message': 'Listing not found'}), 404
        
        # Fetch all images
        images_query = text("""
            SELECT image_path
            FROM house_images
            WHERE listing_id = :listing_id
            ORDER BY created_at ASC
        """)
        images = db.session.execute(images_query, {'listing_id': listing_id}).fetchall()
        image_list = [row[0] for row in images]
        
        return jsonify({
            'success': True,
            'listing': {
                'id': result[0],
                'title': result[1],
                'description': result[2] or '',
                'price': float(result[3]),
                'location': result[4],
                'type': result[5],
                'created_at': result[7].strftime('%B %d, %Y') if result[7] else None,
                'images': image_list,
                'listing_purpose': result[13],
                'bhk': result[14],
                'tenant_preference': result[15],
                'furnishing': result[16]
            },
            'provider': {
                'business_name': result[8],
                'verification_status': result[9],
                'phone': result[10],
                'email': result[11],
                'profile_pic': result[12]
            }
        }), 200
        
    except Exception as e:
        print(f"Error fetching Apartment details: {e}")
        return jsonify({'success': False, 'message': 'Server error'}), 500


@customer_bp.route('/housing/apartment/<int:listing_id>/save', methods=['POST'])
def save_apartment(listing_id):
    """Save an Apartment listing for the current customer"""
    from flask import jsonify
    
    user = get_current_user()
    if not user:
        return jsonify({'success': False, 'message': 'Not authenticated'}), 401
    if user.account_type != 'customer':
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403

    try:
        # 1. Validate listing exists and is approved Apartment
        listing = HouseListing.query.filter_by(id=listing_id, type='Apartment', status='approved').first()
        if not listing:
            return jsonify({'success': False, 'message': 'Listing not found or not available'}), 404

        # 2. Check if already saved
        existing_save = SavedHouse.query.filter_by(customer_id=user.id, house_listing_id=listing_id).first()
        if existing_save:
            return jsonify({'success': True, 'already_saved': True, 'message': 'Apartment already saved'}), 200

        # 3. Create new save
        new_save = SavedHouse(customer_id=user.id, house_listing_id=listing_id)
        db.session.add(new_save)
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Apartment saved successfully'}), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error saving Apartment: {e}")
        return jsonify({'success': False, 'message': 'Server error'}), 500


@customer_bp.route('/housing/apartment/<int:listing_id>/unsave', methods=['DELETE'])
def unsave_apartment(listing_id):
    """Remove a saved Apartment listing for the current customer"""
    from flask import jsonify
    
    user = get_current_user()
    if not user:
        return jsonify({'success': False, 'message': 'Not authenticated'}), 401
    
    try:
        # Delete if exists
        save_entry = SavedHouse.query.filter_by(customer_id=user.id, house_listing_id=listing_id).first()
        
        if save_entry:
            db.session.delete(save_entry)
            db.session.commit()
            return jsonify({'success': True, 'removed': True, 'message': 'Apartment removed from saved list'}), 200
        else:
            return jsonify({'success': True, 'removed': False, 'message': 'Apartment was not saved'}), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error unsaving Apartment: {e}")
        return jsonify({'success': False, 'message': 'Server error'}), 500


@customer_bp.route('/housing/apartment/<int:listing_id>/is-saved', methods=['GET'])
def is_apartment_saved(listing_id):
    """Check if an Apartment is saved by the current customer"""
    from flask import jsonify

    user = get_current_user()
    if not user:
        return jsonify({'saved': False}), 200

    try:
        exists = SavedHouse.query.filter_by(customer_id=user.id, house_listing_id=listing_id).first() is not None
        return jsonify({'saved': exists}), 200

    except Exception as e:
        print(f"Error checking saved status: {e}")
        return jsonify({'saved': False}), 200


# --- Services Routes ---

@customer_bp.route('/services')
def browse_services():
    from flask import request

    user = get_current_user()
    if not user:
        return redirect('/login')
    if user.account_type != 'customer':
        return redirect('/')

    username = user.username

    query = text("""
        SELECT sl.id, sl.provider_id, sl.service_category, sl.service_title, sl.description,
               sl.base_price, sl.service_radius, sl.availability_days,
               pp.business_name,
               ppic.image_path AS provider_image
        FROM service_listings sl
        JOIN provider_profiles pp ON sl.provider_id = pp.id
        LEFT JOIN provider_profile_pics ppic ON pp.id = ppic.provider_id
        WHERE sl.status = 'approved'
        ORDER BY sl.created_at DESC
    """)
    results = db.session.execute(query).fetchall()

    saved_ids = set()
    if user:
        saved = SavedService.query.filter_by(customer_id=user.id).all()
        saved_ids = {s.service_listing_id for s in saved}

    listings_data = []
    for row in results:
        listings_data.append({
            'id': row[0],
            'provider_id': row[1],
            'service_category': row[2],
            'service_title': row[3],
            'description': row[4] or '',
            'base_price': float(row[5]) if row[5] else 0,
            'service_radius': float(row[6]) if row[6] else 0,
            'availability_days': row[7] or '',
            'business_name': row[8],
            'provider_image': row[9],
            'is_saved': row[0] in saved_ids
        })

    return render_template(
        'services/services.html',
        username=username,
        listings=listings_data
    )


@customer_bp.route('/services/<int:service_id>/save', methods=['POST'])
def save_service(service_id):
    from flask import jsonify

    user = get_current_user()
    if not user:
        return jsonify({'success': False, 'message': 'Not authenticated'}), 401
    if user.account_type != 'customer':
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403

    try:
        listing = ServiceListing.query.filter_by(id=service_id, status='approved').first()
        if not listing:
            return jsonify({'success': False, 'message': 'Listing not found or not available'}), 404

        existing_save = SavedService.query.filter_by(customer_id=user.id, service_listing_id=service_id).first()
        if existing_save:
            return jsonify({'success': True, 'already_saved': True, 'message': 'Service already saved'}), 200

        new_save = SavedService(customer_id=user.id, service_listing_id=service_id)
        db.session.add(new_save)
        db.session.commit()
        return jsonify({'success': True, 'message': 'Service saved successfully'}), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error saving service: {e}")
        return jsonify({'success': False, 'message': 'Server error'}), 500


@customer_bp.route('/services/<int:service_id>/unsave', methods=['DELETE'])
def unsave_service(service_id):
    from flask import jsonify

    user = get_current_user()
    if not user:
        return jsonify({'success': False, 'message': 'Not authenticated'}), 401

    try:
        save_entry = SavedService.query.filter_by(customer_id=user.id, service_listing_id=service_id).first()
        if save_entry:
            db.session.delete(save_entry)
            db.session.commit()
            return jsonify({'success': True, 'removed': True, 'message': 'Service removed from saved list'}), 200
        else:
            return jsonify({'success': True, 'removed': False, 'message': 'Service was not saved'}), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error unsaving service: {e}")
        return jsonify({'success': False, 'message': 'Server error'}), 500


@customer_bp.route('/services/<int:service_id>/is-saved', methods=['GET'])
def is_service_saved(service_id):
    user = get_current_user()
    if not user:
        return jsonify({'saved': False}), 200

    try:
        exists = SavedService.query.filter_by(customer_id=user.id, service_listing_id=service_id).first() is not None
        return jsonify({'saved': exists}), 200
    except Exception as e:
        print(f"Error checking saved status: {e}")
        return jsonify({'saved': False}), 200


@customer_bp.route('/services/<int:service_id>/book', methods=['POST'])
def book_service(service_id):
    """Create a service booking for the current customer"""
    user = get_current_user()
    if not user:
        return jsonify({'success': False, 'message': 'Not authenticated'}), 401
    if user.account_type != 'customer':
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403

    try:
        listing = ServiceListing.query.filter_by(id=service_id, status='approved').first()
        if not listing:
            return jsonify({'success': False, 'message': 'Service not found or not available'}), 404

        data = request.get_json() or {}
        booking_date = data.get('booking_date', '').strip()
        booking_time_str = data.get('booking_time', '').strip()
        address = data.get('address', '').strip()
        notes = (data.get('notes') or '').strip()

        if not booking_date:
            return jsonify({'success': False, 'message': 'Booking date is required'}), 400
        if not booking_time_str:
            return jsonify({'success': False, 'message': 'Booking time is required'}), 400
        if not address:
            return jsonify({'success': False, 'message': 'Service address is required'}), 400

        from datetime import datetime
        try:
            dt = datetime.strptime(booking_date, '%Y-%m-%d')
            booking_date_obj = dt.date()
        except ValueError:
            return jsonify({'success': False, 'message': 'Invalid booking date format'}), 400

        try:
            t = datetime.strptime(booking_time_str, '%H:%M')
            booking_time_obj = t.time()
        except ValueError:
            return jsonify({'success': False, 'message': 'Invalid booking time format'}), 400

        quoted_price = float(listing.base_price) if listing.base_price else 0

        new_booking = ServiceBooking(
            customer_id=user.id,
            service_listing_id=service_id,
            booking_date=booking_date_obj,
            booking_time=booking_time_obj,
            address=address,
            notes=notes if notes else None,
            quoted_price=quoted_price,
            booking_status='requested'
        )
        db.session.add(new_booking)
        db.session.commit()

        return jsonify({'success': True, 'message': 'Service booked successfully'}), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error booking service: {e}")
        return jsonify({'success': False, 'message': 'Server error'}), 500


@customer_bp.route('/services/bookings')
def service_bookings():
    """My Service Bookings page for the logged-in customer"""
    user = get_current_user()
    if not user:
        return redirect('/login')
    if user.account_type != 'customer':
        return redirect('/')

    query = text("""
        SELECT sb.id, sb.booking_date, sb.booking_time, sb.address, sb.notes,
               sb.quoted_price, sb.booking_status, sb.created_at,
               sl.service_title, sl.base_price,
               pp.business_name
        FROM service_bookings sb
        JOIN service_listings sl ON sb.service_listing_id = sl.id
        JOIN provider_profiles pp ON sl.provider_id = pp.id
        WHERE sb.customer_id = :customer_id
        ORDER BY sb.created_at DESC
    """)
    results = db.session.execute(query, {'customer_id': user.id}).fetchall()

    bookings_data = []
    for row in results:
        bookings_data.append({
            'id': row[0],
            'booking_date': row[1].strftime('%Y-%m-%d') if row[1] else None,
            'booking_time': row[2].strftime('%H:%M') if row[2] else None,
            'address': row[3] or '',
            'notes': row[4] or '',
            'quoted_price': float(row[5]) if row[5] else 0,
            'booking_status': row[6],
            'created_at': row[7].strftime('%B %d, %Y %I:%M %p') if row[7] else None,
            'service_title': row[8],
            'base_price': float(row[9]) if row[9] else 0,
            'business_name': row[10]
        })

    return render_template('services/my_bookings.html', username=user.username, bookings=bookings_data)


# --- Tiffin Routes ---

@customer_bp.route('/tiffin')
def browse_tiffins():
    from flask import request
    
    user = get_current_user()
    if not user:
        return redirect('/login')
    if user.account_type != 'customer':
        return redirect('/')

    username = user.username

    # Read search query params (only location requested in prompt)
    search_location = request.args.get('location', '').strip()

    # Build dynamic query
    # Only status='approved' AND kitchen_open=TRUE
    base_query = """
        SELECT tl.id, tl.delivery_radius, tl.fast_delivery_available, tl.diet_type, tl.available_days,
               pp.business_name,
               (SELECT image_path 
                FROM tiffin_images 
                WHERE tiffin_listing_id = tl.id 
                ORDER BY created_at ASC 
                LIMIT 1) AS main_image
        FROM tiffin_listings tl
        JOIN provider_profiles pp ON tl.provider_id = pp.id
        WHERE tl.status = 'approved'
        AND tl.kitchen_open = TRUE
    """
    
    params = {}
    
    # Note: TiffinListing doesn't currently support 'location' column in schema provided.
    # Searching by business name if location provided, or ignored if not feasible.
    # User asked for "Search bar: [ Enter Location ]" but schema is missing it.
    # We will pass search_location to template for UI state, but backend filter might be limited.
    # If ProviderProfile had address, we could join.
    # For now, we return all valid kitchens.

    base_query += " ORDER BY tl.created_at DESC"
    
    results = db.session.execute(text(base_query), params).fetchall()
    
    listings_data = []
    for row in results:
        image_path = row[6] if row[6] else 'placeholder.jpg'
        
        listings_data.append({
            'id': row[0],
            'delivery_radius': float(row[1]) if row[1] else 0,
            'fast_delivery_available': row[2],
            'diet_type': row[3],
            'available_days': row[4],
            'business_name': row[5],
            'image_path': image_path
        })
        
    # Fetch default address for pre-fill (if available)
    default_address = ''
    try:
        addr_row = db.session.execute(text("""
            SELECT address_line
            FROM customer_addresses
            WHERE customer_id = :customer_id
            ORDER BY is_default DESC, created_at DESC
            LIMIT 1
        """), {'customer_id': user.id}).fetchone()
        if addr_row and addr_row[0]:
            default_address = addr_row[0]
    except Exception as e:
        # Address table might not exist in some environments; fail open (no prefill)
        print(f"Error fetching default address: {e}")

    return render_template(
        'tiffin/tiffin.html',
        username=username,
        listings=listings_data,
        search_location=search_location,
        default_address=default_address
    )


@customer_bp.route('/tiffin/<int:tiffin_id>/details')
def tiffin_details(tiffin_id):
    """Return JSON details for a specific Tiffin Kitchen"""
    from flask import jsonify
    
    user = get_current_user()
    if not user:
        return jsonify({'success': False, 'message': 'Not authenticated'}), 401
    
    try:
        # Fetch listing + provider + user + profile pic
        query = text("""
            SELECT tl.id, tl.delivery_radius, tl.fast_delivery_available, tl.diet_type, 
                   tl.available_days, tl.created_at,
                   pp.business_name, pp.verification_status,
                   u.phone, u.email,
                   ppic.image_path AS provider_profile_pic
            FROM tiffin_listings tl
            JOIN provider_profiles pp ON tl.provider_id = pp.id
            JOIN users u ON pp.user_id = u.id
            LEFT JOIN provider_profile_pics ppic ON pp.id = ppic.provider_id
            WHERE tl.id = :tiffin_id
            AND tl.status = 'approved'
            AND tl.kitchen_open = TRUE
        """)
        
        result = db.session.execute(query, {'tiffin_id': tiffin_id}).fetchone()
        
        if not result:
            return jsonify({'success': False, 'message': 'Kitchen not found or closed'}), 404
        
        # Fetch all images
        images_query = text("""
            SELECT image_path
            FROM tiffin_images
            WHERE tiffin_listing_id = :tiffin_id
            ORDER BY created_at ASC
        """)
        images = db.session.execute(images_query, {'tiffin_id': tiffin_id}).fetchall()
        image_list = [row[0] for row in images]
        
        return jsonify({
            'success': True,
            'listing': {
                'id': result[0],
                'delivery_radius': float(result[1]) if result[1] else 0,
                'fast_delivery_available': result[2],
                'diet_type': result[3],
                'available_days': result[4],
                'created_at': result[5].strftime('%B %d, %Y') if result[5] else None,
                'images': image_list
            },
            'provider': {
                'business_name': result[6],
                'verification_status': result[7],
                'phone': result[8],
                'email': result[9],
                'profile_pic': result[10]
            }
        }), 200
        
    except Exception as e:
        print(f"Error fetching Tiffin details: {e}")
        return jsonify({'success': False, 'message': 'Server error'}), 500


@customer_bp.route('/tiffin/<int:tiffin_id>/meals')
def get_tiffin_meals(tiffin_id):
    """Return JSON list of available meals for a Tiffin Kitchen"""
    from flask import jsonify
    
    user = get_current_user()
    if not user:
        return jsonify({'success': False, 'message': 'Not authenticated'}), 401
    
    try:
        query = text("""
            SELECT id, meal_name, meal_category, diet_type, price, description, meal_image_path
            FROM meals
            WHERE tiffin_listing_id = :tiffin_id
            AND is_available = TRUE
            ORDER BY created_at DESC
        """)
        
        results = db.session.execute(query, {'tiffin_id': tiffin_id}).fetchall()
        
        meals_data = []
        for row in results:
            meals_data.append({
                'id': row[0],
                'meal_name': row[1],
                'meal_category': row[2],
                'diet_type': row[3],
                'price': float(row[4]),
                'description': row[5] or '',
                'image_path': row[6] if row[6] else 'placeholder.jpg'
            })
            
        return jsonify({'success': True, 'meals': meals_data}), 200
        
    except Exception as e:
        print(f"Error fetching meals: {e}")
        return jsonify({'success': False, 'message': 'Server error'}), 500


@customer_bp.route('/meals/<int:meal_id>/order', methods=['POST'])
def order_meal(meal_id):
    """Create an order for a meal (customer only)"""
    user = get_current_user()
    if not user:
        return jsonify({'success': False, 'message': 'Not authenticated'}), 401
    if user.account_type != 'customer':
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403

    data = request.get_json() or {}

    try:
        quantity = int(data.get('quantity', 1))
    except Exception:
        quantity = 1

    delivery_address = (data.get('delivery_address') or '').strip()
    fast_delivery_requested = bool(data.get('fast_delivery'))

    if quantity < 1:
        return jsonify({'success': False, 'message': 'Quantity must be at least 1'}), 400
    if not delivery_address:
        return jsonify({'success': False, 'message': 'Delivery address is required'}), 400

    # Never trust frontend: validate meal & listing
    meal = Meal.query.get(meal_id)
    if not meal:
        return jsonify({'success': False, 'message': 'Meal not found'}), 404

    if not meal.is_available:
        return jsonify({'success': False, 'message': 'Meal is currently unavailable'}), 400

    listing = TiffinListing.query.filter_by(
        id=meal.tiffin_listing_id,
        status='approved',
        kitchen_open=True
    ).first()

    if not listing:
        return jsonify({'success': False, 'message': 'Kitchen is closed or not approved'}), 400

    # Fast delivery allowed only if listing supports it
    fast_delivery = fast_delivery_requested and bool(listing.fast_delivery_available)

    from decimal import Decimal
    base_price = Decimal(str(meal.price))
    fast_delivery_charge = Decimal('20.00') if fast_delivery else Decimal('0.00')
    total_price = (base_price * Decimal(quantity)) + fast_delivery_charge

    try:
        new_order = Order(
            customer_id=user.id,
            tiffin_listing_id=meal.tiffin_listing_id,
            meal_id=meal.id,
            quantity=quantity,
            base_price=base_price,
            fast_delivery=fast_delivery,
            fast_delivery_charge=fast_delivery_charge,
            total_price=total_price,
            delivery_address=delivery_address,
            order_status='placed'
        )
        db.session.add(new_order)
        db.session.commit()

        return jsonify({'success': True, 'message': 'Order placed successfully', 'order_id': new_order.id}), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error creating order: {e}")
        return jsonify({'success': False, 'message': 'Server error'}), 500


@customer_bp.route('/orders')
def my_orders():
    """My Food Orders page for the logged-in customer"""
    user = get_current_user()
    if not user:
        return redirect('/login')
    if user.account_type != 'customer':
        return redirect('/')

    query = text("""
        SELECT o.*,
               m.meal_name,
               m.diet_type,
               m.meal_category,
               pp.business_name,
               u.phone AS provider_phone
        FROM orders o
        JOIN meals m ON o.meal_id = m.id
        JOIN tiffin_listings tl ON o.tiffin_listing_id = tl.id
        JOIN provider_profiles pp ON tl.provider_id = pp.id
        JOIN users u ON pp.user_id = u.id
        WHERE o.customer_id = :customer_id
        ORDER BY o.order_date DESC
    """)

    results = db.session.execute(query, {'customer_id': user.id}).mappings().all()

    orders_data = []
    for r in results:
        order_date = r.get('order_date')
        orders_data.append({
            'id': r.get('id'),
            'quantity': r.get('quantity'),
            'base_price': float(r.get('base_price') or 0),
            'fast_delivery': bool(r.get('fast_delivery')),
            'fast_delivery_charge': float(r.get('fast_delivery_charge') or 0),
            'total_price': float(r.get('total_price') or 0),
            'order_status': r.get('order_status'),
            'delivery_address': r.get('delivery_address') or '',
            'order_date': order_date.strftime('%B %d, %Y %I:%M %p') if order_date else '',
            'meal_name': r.get('meal_name'),
            'diet_type': r.get('diet_type'),
            'meal_category': r.get('meal_category'),
            'provider_business_name': r.get('business_name'),
            'provider_phone': r.get('provider_phone')
        })

    return render_template('tiffin/my_orders.html', username=user.username, orders=orders_data)


@customer_bp.route('/orders/<int:order_id>/bill')
def download_order_bill(order_id):
    """Generate and download an order bill PDF for the logged-in customer"""
    user = get_current_user()
    if not user:
        return redirect('/login')
    if user.account_type != 'customer':
        return redirect('/')

    # Secure ownership check + details fetch
    query = text("""
        SELECT o.id AS order_id, o.order_date, o.order_status, o.quantity, o.base_price,
               o.fast_delivery, o.fast_delivery_charge, o.total_price, o.delivery_address,
               m.meal_name, m.meal_category, m.diet_type,
               pp.business_name,
               pu.phone AS provider_phone,
               cu.username AS customer_name,
               cu.phone AS customer_phone
        FROM orders o
        JOIN meals m ON o.meal_id = m.id
        JOIN tiffin_listings tl ON o.tiffin_listing_id = tl.id
        JOIN provider_profiles pp ON tl.provider_id = pp.id
        JOIN users pu ON pp.user_id = pu.id
        JOIN users cu ON o.customer_id = cu.id
        WHERE o.id = :order_id
        AND o.customer_id = :customer_id
        LIMIT 1
    """)

    row = db.session.execute(query, {'order_id': order_id, 'customer_id': user.id}).mappings().fetchone()
    if not row:
        return redirect('/orders')

    # Build PDF
    import io
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import letter
    import textwrap

    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter

    left = 50
    y = height - 60

    c.setFont('Helvetica-Bold', 20)
    c.drawString(left, y, 'UrbanEase')
    y -= 10
    c.setFont('Helvetica', 11)
    c.drawString(left, y, 'Meal Order Bill')

    y -= 25
    c.setLineWidth(1)
    c.line(left, y, width - left, y)
    y -= 20

    def draw_kv(label, value, y_pos):
        c.setFont('Helvetica-Bold', 11)
        c.drawString(left, y_pos, f"{label}:")
        c.setFont('Helvetica', 11)
        c.drawString(left + 160, y_pos, str(value))
        return y_pos - 16

    order_date = row.get('order_date')
    order_date_str = order_date.strftime('%B %d, %Y %I:%M %p') if order_date else ''

    y = draw_kv('Order ID', row.get('order_id'), y)
    y = draw_kv('Order Date', order_date_str, y)
    y = draw_kv('Status', (row.get('order_status') or '').replace('_', ' ').title(), y)

    y -= 10
    c.setFont('Helvetica-Bold', 12)
    c.drawString(left, y, 'Customer')
    y -= 18
    y = draw_kv('Name', row.get('customer_name') or '', y)
    y = draw_kv('Phone', row.get('customer_phone') or '', y)

    # Customer address (multi-line)
    c.setFont('Helvetica-Bold', 11)
    c.drawString(left, y, 'Address:')
    c.setFont('Helvetica', 11)
    addr = row.get('delivery_address') or ''
    wrapped = textwrap.wrap(addr, width=70) or ['']
    first_line_y = y
    for idx, line_txt in enumerate(wrapped):
        c.drawString(left + 160, first_line_y - (idx * 14), line_txt)
    y = first_line_y - (len(wrapped) * 14) - 6

    y -= 4
    c.setFont('Helvetica-Bold', 12)
    c.drawString(left, y, 'Provider')
    y -= 18
    y = draw_kv('Business Name', row.get('business_name') or '', y)
    y = draw_kv('Phone', row.get('provider_phone') or '', y)

    y -= 4
    c.setFont('Helvetica-Bold', 12)
    c.drawString(left, y, 'Meal')
    y -= 18
    y = draw_kv('Meal Name', row.get('meal_name') or '', y)
    y = draw_kv('Category', (row.get('meal_category') or '').title(), y)
    y = draw_kv('Diet Type', (row.get('diet_type') or '').title(), y)

    y -= 4
    c.setFont('Helvetica-Bold', 12)
    c.drawString(left, y, 'Pricing')
    y -= 18

    base_price = float(row.get('base_price') or 0)
    qty = int(row.get('quantity') or 0)
    fast_charge = float(row.get('fast_delivery_charge') or 0)
    total = float(row.get('total_price') or 0)

    y = draw_kv('Price per meal', f"INR {base_price:.2f}", y)
    y = draw_kv('Quantity', qty, y)
    y = draw_kv('Fast delivery charge', f"INR {fast_charge:.2f}", y)
    y = draw_kv('Total', f"INR {total:.2f}", y)

    y -= 16
    c.setLineWidth(0.8)
    c.line(left, y, width - left, y)

    y -= 25
    c.setFont('Helvetica', 11)
    c.drawString(left, y, 'Thank you for ordering with UrbanEase')

    c.showPage()
    c.save()

    buffer.seek(0)
    filename = f"UrbanEase_Bill_Order_{order_id}.pdf"
    return send_file(buffer, mimetype='application/pdf', as_attachment=True, download_name=filename)
