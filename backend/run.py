from authorization import app, db
from admin import admin_bp
from provider import provider_bp
from customer import customer_bp

                              
app.register_blueprint(admin_bp)

                                 
app.register_blueprint(provider_bp)

                                 
app.register_blueprint(customer_bp)

                                                                         
                                                                                               
with app.app_context():
    db.create_all()

if __name__ == '__main__':
                                      
    app.run(debug=True, port=5000)
