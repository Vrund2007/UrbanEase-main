from backend.authorization import app, db
from backend.admin import admin_bp
from backend.provider import provider_bp
from backend.customer import customer_bp
from backend.cloudinary_config import configure_cloudinary

# Initialize Cloudinary
configure_cloudinary()

app.register_blueprint(admin_bp)
app.register_blueprint(provider_bp)
app.register_blueprint(customer_bp)

with app.app_context():
    db.create_all()

if __name__ == '__main__':
    app.run(debug=True, port=5000)