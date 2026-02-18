from flask import Blueprint, session, redirect, render_template
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

from admin import HouseListing, HouseImage, SavedHouse, HostelDetails, PGDetails, ApartmentDetails

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
        
    return render_template(
        'tiffin/tiffin.html', 
        username=username, 
        listings=listings_data,
        search_location=search_location
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
