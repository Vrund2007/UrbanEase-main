# UrbanEase

UrbanEase is a full-stack relocation support platform designed to help users settle into a new city seamlessly. The platform connects customers with verified providers offering housing, tiffin services, and local home services, all managed through a centralized admin moderation system.

## Overview

Moving to a new city comes with challenges: finding accommodation, locating reliable meal services, and connecting with local service providers. UrbanEase addresses these pain points by providing a unified platform where users can discover housing options, order home-cooked meals, and book essential services like electricians, plumbers, and cleaners.

The platform supports three distinct user roles, each with tailored functionality:

- **Customers**: Browse listings, place orders, book services, and manage saved items
- **Providers**: Create and manage listings, handle orders and bookings, and track business performance
- **Admins**: Verify providers, approve listings, and moderate platform activity

## Tech Stack

**Frontend**
- HTML5
- CSS3
- JavaScript (ES6+)
- Bootstrap (selective components)

**Backend**
- Python 3.x
- Flask (web framework)
- Flask-SQLAlchemy (ORM)
- Flask-CORS (cross-origin support)
- Flask-Mail (email notifications)
- ReportLab (PDF generation)

**Database**
- PostgreSQL

**Deployment**
- Render (cloud platform)
- Gunicorn (WSGI server)

## Project Structure

```
UrbanEase/
│
├── backend/
│   ├── admin.py              # Admin dashboard routes and logic
│   ├── authorization.py      # Authentication, database models, and app initialization
│   ├── customer.py           # Customer dashboard and booking routes
│   ├── provider.py           # Provider dashboard and listing management
│   ├── run.py                # Application entry point
│   └── .env                  # Environment variables (not in version control)
│
├── templates/
│   ├── dashboards/
│   │   ├── admin/            # Admin panel templates
│   │   ├── customer/         # Customer dashboard and profile pages
│   │   └── provider/         # Provider dashboard templates
│   ├── housing/
│   │   ├── apartment/        # Apartment listing pages
│   │   ├── hostel/           # Hostel listing pages
│   │   └── pg/               # PG listing pages
│   ├── tiffin/               # Tiffin service and meal ordering pages
│   ├── services/             # Local service booking pages
│   ├── payment/              # Payment processing templates
│   ├── saved/                # Saved items pages
│   ├── home/                 # Landing, login, and signup pages
│   └── partials/             # Reusable template components (navbar, etc.)
│
├── static/
│   ├── css/                  # Stylesheets for all pages
│   ├── js/                   # Client-side JavaScript modules
│   └── images/
│       ├── database_images/  # User-uploaded images (listings, profiles)
│       └── website_images/   # Static website assets
│
├── requirements.txt          # Python dependencies
├── Procfile                  # Render deployment configuration
└── database.md               # Database schema documentation
```

### Key Files

- **backend/run.py**: Registers all blueprints (admin, provider, customer) and initializes the Flask application
- **backend/authorization.py**: Contains database models, authentication logic, and Flask app configuration
- **backend/admin.py**: Handles provider verification, listing approvals, and platform moderation
- **backend/provider.py**: Manages provider onboarding, listing creation, and order/booking management
- **backend/customer.py**: Implements customer browsing, ordering, booking, and saved items functionality
- **Procfile**: Specifies the Gunicorn command for Render deployment
- **requirements.txt**: Lists all Python package dependencies

## Features

### Authentication and Authorization
- Secure user registration and login system
- Role-based access control (customer, provider, admin)
- Session management with Flask sessions
- Password hashing for security

### Provider Verification Workflow
- Providers submit business details and Aadhaar verification
- Admin reviews and approves/rejects provider applications
- Verified providers gain access to listing creation
- Profile picture upload and management

### Housing Listings
- Three property types: Hostels, PGs, and Apartments
- Type-specific details (gender preference, BHK configuration, amenities)
- Multiple image uploads per listing
- Location-based search and filtering
- Admin approval workflow before listings go live

### Tiffin Services
- Kitchen registration with delivery radius configuration
- Meal management (breakfast, lunch, dinner categories)
- Diet type classification (veg, non-veg, Jain)
- Fast delivery option with additional charges
- Kitchen open/close status control

### Meal Ordering
- Browse meals by category and diet preference
- Add to cart and place orders
- Delivery address management
- Order status tracking (placed, preparing, out for delivery, delivered)
- PDF bill generation for completed orders
- Order history and reordering

### Local Service Bookings
- Nine service categories: electrician, plumber, carpenter, AC repair, cleaning, packers and movers, WiFi installation, gas connection, laundry
- Service radius and availability configuration
- Date and time slot booking
- Booking status workflow (requested, accepted, completed, cancelled)
- Custom notes and address specification

### Saved Items
- Save houses, meals, and services for later
- Dedicated saved items dashboard
- Quick access to favorite listings

### Admin Dashboard
- Pending provider verification queue
- Listing approval interface (houses, tiffins, services)
- Platform-wide statistics and monitoring
- User account management

### Provider Dashboard
- Listing creation and management
- Order and booking notifications
- Kitchen status control for tiffin providers
- Performance metrics and earnings tracking

### Customer Dashboard
- Active orders and bookings overview
- Saved items management
- Profile and address management
- Order history with PDF downloads

## Database Architecture

The database consists of 19 interconnected tables designed to support the platform's multi-sided marketplace model.

### Core Tables

**users**: Central user table storing all accounts (customers, providers, admins) with role-based account types and status management.

**provider_profiles**: Extended profile information for provider accounts, including business details, Aadhaar verification, and approval status.

**provider_profile_pics**: One-to-one relationship storing provider profile images.

### Housing Tables

**house_listings**: Main table for all housing listings with type classification (Hostel, PG, Apartment) and admin approval workflow.

**hostel_details**, **pg_details**, **apartment_details**: Type-specific tables storing specialized attributes for each housing category. Each has a one-to-one relationship with house_listings.

**house_images**: Stores multiple images per housing listing.

### Tiffin and Meal Tables

**tiffin_listings**: Kitchen registrations with delivery configuration and operational status.

**meals**: Individual meal items linked to tiffin listings, with pricing and availability management.

**tiffin_images**: Multiple images per tiffin listing.

**orders**: Customer meal orders with quantity, pricing, delivery options, and status tracking.

**tiffin_reviews**: Customer ratings and reviews for tiffin services.

### Service Tables

**service_listings**: Local service provider registrations with category classification and service radius.

**service_bookings**: Customer bookings for services with date/time scheduling and status workflow.

### Saved Items Tables

**saved_houses**, **saved_meals**, **saved_services**: Track customer-saved items with unique constraints to prevent duplicates.

### Supporting Tables

**customer_addresses**: Saved delivery addresses with default address designation.

### Key Relationships

- One provider can create multiple listings across all categories (houses, tiffins, services)
- Each housing listing connects to exactly one type-specific detail table based on property type
- Tiffin listings contain multiple meals, and each meal can be ordered multiple times
- Customers can save multiple items and place multiple orders/bookings
- Foreign key constraints maintain referential integrity across all relationships

## Local Setup Instructions

### Prerequisites

- Python 3.8 or higher
- PostgreSQL 12 or higher
- Git

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd UrbanEase
```

### Step 2: Create Virtual Environment

```bash
python -m venv venv
```

Activate the virtual environment:

**Windows:**
```bash
venv\Scripts\activate
```

**macOS/Linux:**
```bash
source venv/bin/activate
```

### Step 3: Install Dependencies

```bash
pip install -r requirements.txt
```

### Step 4: Configure Environment Variables

Create a `.env` file in the `backend/` directory:

```bash
cd backend
```

Create the file with the following content:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/urbanease
SECRET_KEY=your-secret-key-here
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password
```

Replace the placeholders:
- `username`: Your PostgreSQL username
- `password`: Your PostgreSQL password
- `your-secret-key-here`: Generate a random secret key (use `python -c "import secrets; print(secrets.token_hex(32))"`)
- `your-email@gmail.com`: Gmail address for sending notifications
- `your-app-password`: Gmail app password (not your regular password)

### Step 5: Setup PostgreSQL Database

Open PostgreSQL command line or pgAdmin and create the database:

```sql
CREATE DATABASE urbanease;
```

### Step 6: Initialize Database Schema

The application uses Flask-SQLAlchemy with automatic table creation. When you run the application for the first time, all tables will be created automatically based on the models defined in `backend/authorization.py`.

Navigate to the project root directory:

```bash
cd ..
```

### Step 7: Run the Flask Server

```bash
python backend/run.py
```

The server will start on `http://localhost:5000`

### Step 8: Access the Application

Open your web browser and navigate to:

```
http://localhost:5000
```

You should see the UrbanEase landing page.

### Creating the First Admin Account

Since the platform requires an admin to verify providers, you'll need to create an admin account manually in the database:

```sql
INSERT INTO users (username, email, password, phone, account_type, status, created_at)
VALUES ('admin', 'admin@urbanease.com', 'hashed-password', '1234567890', 'admin', 'active', NOW());
```

Note: Replace `'hashed-password'` with a properly hashed password using your authentication system.

## Environment Variables

The application requires the following environment variables:

### DATABASE_URL
PostgreSQL connection string in the format:
```
postgresql://username:password@host:port/database_name
```

**Local development example:**
```
postgresql://postgres:mypassword@localhost:5432/urbanease
```

**Render deployment example:**
```
postgresql://user:pass@dpg-xxxxx.oregon-postgres.render.com/dbname
```

### SECRET_KEY
Flask secret key used for session management and security. Generate a strong random key:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

### MAIL_USERNAME
Email address used for sending notifications (Gmail recommended).

### MAIL_PASSWORD
App-specific password for the email account. For Gmail:
1. Enable 2-factor authentication
2. Generate an app password at https://myaccount.google.com/apppasswords
3. Use the generated 16-character password

## Running the Application

The application entry point is `backend/run.py`, which performs the following initialization:

1. Imports the Flask app instance and database from `authorization.py`
2. Registers three blueprints:
   - `admin_bp`: Admin routes for verification and approvals
   - `provider_bp`: Provider routes for listing management
   - `customer_bp`: Customer routes for browsing and ordering
3. Creates all database tables using `db.create_all()` within the app context
4. Starts the Flask development server on port 5000

To run the application:

```bash
python backend/run.py
```

For production deployment, the application uses Gunicorn as specified in the Procfile.

## Deployment on Render

### Prerequisites
- GitHub repository with your code
- Render account (free tier available)

### Deployment Steps

1. **Push Code to GitHub**
   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```

2. **Create PostgreSQL Database on Render**
   - Log in to Render dashboard
   - Click "New +" and select "PostgreSQL"
   - Choose a name (e.g., `urbanease-db`)
   - Select the free tier
   - Click "Create Database"
   - Copy the "Internal Database URL" from the database dashboard

3. **Create Web Service on Render**
   - Click "New +" and select "Web Service"
   - Connect your GitHub repository
   - Configure the service:
     - **Name**: urbanease
     - **Environment**: Python 3
     - **Build Command**: `pip install -r requirements.txt`
     - **Start Command**: (automatically detected from Procfile)
   
4. **Configure Environment Variables**
   In the Render dashboard, add the following environment variables:
   - `DATABASE_URL`: Paste the Internal Database URL from step 2
   - `SECRET_KEY`: Your generated secret key
   - `MAIL_USERNAME`: Your email address
   - `MAIL_PASSWORD`: Your email app password

5. **Deploy**
   - Click "Create Web Service"
   - Render will automatically build and deploy your application
   - Access your app at the provided URL (e.g., `https://urbanease.onrender.com`)

### Procfile Configuration

The `Procfile` tells Render how to run the application:

```
web: gunicorn backend.run:app
```

This command:
- Uses Gunicorn as the production WSGI server
- Points to the `app` object in `backend/run.py`
- Automatically binds to the PORT environment variable provided by Render

### Static Files and Templates

Flask automatically serves static files from the `static/` directory and renders templates from the `templates/` directory. No additional configuration is needed for Render deployment.

### Database Migrations

On first deployment, the application automatically creates all tables using `db.create_all()` in `run.py`. For subsequent schema changes, consider implementing Flask-Migrate for proper database migrations.

### Monitoring and Logs

- View application logs in the Render dashboard under the "Logs" tab
- Monitor database performance in the PostgreSQL dashboard
- Set up health checks and alerts in Render settings

## User Roles and Capabilities

### Customer

Customers are end-users looking for housing, meals, and services in their new city.

**Capabilities:**
- Browse approved housing listings (hostels, PGs, apartments) with filtering
- Search tiffin services and view available meals
- Place meal orders with delivery address and fast delivery options
- Track order status in real-time
- Book local services with date and time preferences
- Save favorite houses, meals, and services for quick access
- Manage multiple delivery addresses
- View order history and download PDF bills
- Update profile information
- Leave reviews for tiffin services

**Workflow:**
1. Sign up and create a customer account
2. Browse listings or search by location/category
3. Save items of interest or proceed to order/book
4. Complete orders with delivery details
5. Track status and receive notifications
6. Access past orders and saved items from dashboard

### Provider

Providers are business owners offering housing, tiffin services, or local services.

**Capabilities:**
- Complete business verification with Aadhaar and license details
- Upload profile picture and business information
- Create and manage multiple listings across categories
- Upload multiple images per listing
- Set pricing, availability, and service radius
- Receive and manage customer orders (for tiffin providers)
- Accept and complete service bookings
- Control kitchen operational status (open/closed)
- Add, edit, and remove meals from tiffin listings
- View earnings and performance metrics
- Respond to customer inquiries

**Workflow:**
1. Sign up as a provider
2. Submit verification documents and await admin approval
3. Once verified, create listings with detailed information
4. Wait for admin approval of each listing
5. Manage incoming orders and bookings
6. Update listing availability and pricing as needed
7. Track business performance through dashboard

### Admin

Admins are platform moderators responsible for maintaining quality and trust.

**Capabilities:**
- Review and verify provider applications
- Approve or reject provider verification requests
- Review and approve housing listings before they go live
- Review and approve tiffin service listings
- Review and approve local service listings
- Monitor platform activity and user behavior
- Suspend or reactivate user accounts
- View platform-wide statistics
- Manage reported content and disputes
- Access all user and listing data for moderation

**Workflow:**
1. Log in to admin dashboard
2. Review pending provider verifications
3. Verify business documents and approve/reject applications
4. Review pending listings across all categories
5. Approve quality listings and reject inappropriate content
6. Monitor active orders and bookings for issues
7. Handle user reports and disputes
8. Maintain platform integrity and user trust

---

## Contributing

This project is currently maintained as a personal portfolio project. If you'd like to contribute or report issues, please reach out through the repository's issue tracker.

## License

This project is developed for educational and portfolio purposes.

## Contact

For questions or feedback about UrbanEase, please open an issue in the repository.
