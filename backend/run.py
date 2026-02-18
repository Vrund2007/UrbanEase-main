from authorization import app, db
from admin import admin_bp
from provider import provider_bp
from customer import customer_bp

# Register the admin blueprint
app.register_blueprint(admin_bp)

# Register the provider blueprint
app.register_blueprint(provider_bp)

# Register the customer blueprint
app.register_blueprint(customer_bp)

# Ensure all tables are created (including ProviderProfile from admin.py)
# This is necessary because authorization.py's db.create_all() runs before admin.py is imported
with app.app_context():
    db.create_all()

if __name__ == '__main__':
    # Running on port 5000 as required
    app.run(debug=True, port=5000)
