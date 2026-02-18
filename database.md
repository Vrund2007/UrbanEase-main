# UrbanEase Database Documentation

This document describes the relational database structure for all the tables UrbanEase platform.

UrbanEase connects:

- House/PG/Hostel providers
- Tiffin service providers
- Local service providers (electrician, plumber, etc.)
- Customers
- Admins

The system supports listings, provider verification, meal ordering, service bookings, reviews, and saved items functionality.

---

# 1. users

Stores all platform users including customers, providers, and admins.


| Column       | Type                             | Description                |
| ------------ | -------------------------------- | -------------------------- |
| id (PK)      | INT                              | Unique user identifier     |
| username     | VARCHAR                          | Unique username            |
| email        | VARCHAR                          | Unique email address       |
| password     | VARCHAR                          | Password                   |
| phone        | VARCHAR                          | Contact number             |
| account_type | ENUM (customer, provider, admin) | User role                  |
| status       | ENUM (active, suspended)         | Account status             |
| created_at   | TIMESTAMP                        | Account creation timestamp |


---

# 2. provider_profiles

Stores additional information for provider accounts.


| Column              | Type                               | Description                  |
| ------------------- | ---------------------------------- | ---------------------------- |
| id (PK)             | INT                                | Unique provider profile ID   |
| user_id (FK)        | INT                                | References users.id          |
| provider_type       | ENUM (house, tiffin, other)        | Type of services offered     |
| business_name       | VARCHAR                            | Registered business name     |
| aadhaar_number      | VARCHAR                            | Aadhaar ID                   |
| business_license    | VARCHAR                            | License details or file path |
| verification_status | ENUM (pending, verified, rejected) | Verification state           |
| verified_at         | TIMESTAMP                          | Verification timestamp       |
| created_at          | TIMESTAMP                          | Profile creation timestamp   |


Relationship:  
One-to-one relationship with users table (only for providers).

---

# 3. provider_profile_pics

Stores profile pictures for providers.


| Column           | Type      | Description                     |
| ---------------- | --------- | ------------------------------- |
| id (PK)          | INT       | Image ID                        |
| provider_id (FK) | INT       | References provider_profiles.id |
| image_path       | TEXT      | File path or URL                |
| created_at       | TIMESTAMP | Upload timestamp                |


Relationship:  
One-to-one relationship with provider_profiles.

---

# 4. house_listings

Stores house rental listings submitted by providers.


| Column           | Type                               | Description                     |
| ---------------- | ---------------------------------- | ------------------------------- |
| id (PK)          | INT                                | Unique listing ID               |
| provider_id (FK) | INT                                | References provider_profiles.id |
| title            | VARCHAR                            | Listing title                   |
| description      | TEXT                               | Property description            |
| price            | DECIMAL                            | Monthly rent                    |
| location         | VARCHAR                            | Property location               |
| type             | ENUM (PG, Hostel, Apartment)       | Property type                   |
| status           | ENUM (pending, approved, rejected) | Approval status                 |
| approved_at      | TIMESTAMP                          | Approval timestamp              |
| created_at       | TIMESTAMP                          | Listing creation timestamp      |


Relationship:  
One provider can create multiple house listings.

---

# 5. hostel_details

Stores specific details for hostel-type listings.


| Column            | Type                        | Description                           |
| ----------------- | --------------------------- | ------------------------------------- |
| id (PK)           | INT                         | Detail record ID                      |
| listing_id (FK)   | INT                         | References house_listings.id (UNIQUE) |
| gender            | ENUM (boys, girls, coed)    | Gender preference                     |
| room_type         | ENUM (single, double, dorm) | Type of room                          |
| wifi              | BOOLEAN                     | WiFi availability                     |
| attached_bathroom | BOOLEAN                     | Attached bathroom available           |
| food_included     | BOOLEAN                     | Food included in rent                 |
| laundry           | BOOLEAN                     | Laundry service available             |
| created_at        | TIMESTAMP                   | Record creation timestamp             |


Relationship:  
One-to-one relationship with house_listings (only for Hostel type).

---

# 6. apartment_details

Stores specific details for apartment-type listings.


| Column            | Type                                | Description                           |
| ----------------- | ----------------------------------- | ------------------------------------- |
| id (PK)           | INT                                 | Detail record ID                      |
| listing_id (FK)   | INT                                 | References house_listings.id (UNIQUE) |
| listing_purpose   | ENUM (rent, sale)                   | Purpose of listing                    |
| bhk               | ENUM (1, 2, 3, 4+)                  | BHK configuration                     |
| tenant_preference | ENUM (family, bachelor, any)        | Preferred tenant type                 |
| furnishing        | ENUM (furnished, semi, unfurnished) | Furnishing status                     |
| created_at        | TIMESTAMP                           | Record creation timestamp             |


Relationship:  
One-to-one relationship with house_listings (only for Apartment type).

---

# 7. pg_details

Stores specific details for PG-type listings.


| Column          | Type                     | Description                           |
| --------------- | ------------------------ | ------------------------------------- |
| id (PK)         | INT                      | Detail record ID                      |
| listing_id (FK) | INT                      | References house_listings.id (UNIQUE) |
| gender          | ENUM (boys, girls, coed) | Gender preference                     |
| ac_available    | BOOLEAN                  | AC availability                       |
| sharing         | ENUM (1, 2, 3, 4+)       | Sharing configuration                 |
| food_included   | BOOLEAN                  | Food included in rent                 |
| laundry         | BOOLEAN                  | Laundry service available             |
| created_at      | TIMESTAMP                | Record creation timestamp             |


Relationship:  
One-to-one relationship with house_listings (only for PG type).

---

# 8. house_images

Stores images associated with house listings.


| Column          | Type      | Description                  |
| --------------- | --------- | ---------------------------- |
| id (PK)         | INT       | Image ID                     |
| listing_id (FK) | INT       | References house_listings.id |
| image_path      | TEXT      | File path or URL             |
| created_at      | TIMESTAMP | Upload timestamp             |


Relationship:  
One house listing can have multiple images.

---

# 9. tiffin_listings

Stores tiffin service listings.


| Column                  | Type                               | Description                     |
| ----------------------- | ---------------------------------- | ------------------------------- |
| id (PK)                 | INT                                | Tiffin listing ID               |
| provider_id (FK)        | INT                                | References provider_profiles.id |
| delivery_radius         | NUMERIC                            | Delivery coverage in kilometers |
| fast_delivery_available | BOOLEAN                            | Fast delivery option            |
| kitchen_open            | BOOLEAN                            | Kitchen operational status      |
| status                  | ENUM (pending, approved, rejected) | Approval status                 |
| approved_at             | TIMESTAMP                          | Approval timestamp              |
| diet_type               | ENUM (veg, non-veg, both)          | Service diet type               |
| available_days          | TEXT                               | Days of availability            |
| created_at              | TIMESTAMP                          | Listing creation timestamp      |


Relationship:  
One provider can create multiple tiffin listings.

---

# 10. tiffin_images

Stores images related to tiffin listings.


| Column                 | Type      | Description                   |
| ---------------------- | --------- | ----------------------------- |
| id (PK)                | INT       | Image ID                      |
| tiffin_listing_id (FK) | INT       | References tiffin_listings.id |
| image_path             | TEXT      | File path or URL              |
| created_at             | TIMESTAMP | Upload timestamp              |


Relationship:  
One tiffin listing can have multiple images.

---

# 11. meals

Stores individual meal items offered under a tiffin listing.


| Column                 | Type                            | Description                   |
| ---------------------- | ------------------------------- | ----------------------------- |
| id (PK)                | INT                             | Meal ID                       |
| tiffin_listing_id (FK) | INT                             | References tiffin_listings.id |
| meal_name              | VARCHAR                         | Name of the meal              |
| description            | TEXT                            | Meal description              |
| meal_category          | ENUM (breakfast, lunch, dinner) | Category                      |
| diet_type              | ENUM (veg, non-veg, jain)       | Diet classification           |
| price                  | DECIMAL                         | Price per unit                |
| is_available           | BOOLEAN                         | Availability status           |
| meal_image_path        | TEXT                            | Image path                    |
| created_at             | TIMESTAMP                       | Creation timestamp            |


Relationship:  
One tiffin listing can have multiple meals.

---

# 12. orders

Stores customer orders for meals.


| Column                 | Type                                                             | Description                   |
| ---------------------- | ---------------------------------------------------------------- | ----------------------------- |
| id (PK)                | INT                                                              | Order ID                      |
| customer_id (FK)       | INT                                                              | References users.id           |
| tiffin_listing_id (FK) | INT                                                              | References tiffin_listings.id |
| meal_id (FK)           | INT                                                              | References meals.id           |
| quantity               | INT                                                              | Number of units ordered       |
| base_price             | DECIMAL                                                          | Base price per unit           |
| fast_delivery          | BOOLEAN                                                          | Fast delivery selected        |
| fast_delivery_charge   | DECIMAL                                                          | Additional charge             |
| total_price            | DECIMAL                                                          | Final calculated price        |
| order_status           | ENUM (placed, preparing, out_for_delivery, delivered, cancelled) | Current status                |
| delivery_address       | TEXT                                                             | Delivery address              |
| order_date             | TIMESTAMP                                                        | Order timestamp               |


Relationship:  
One customer can place multiple orders.  
One meal can be ordered multiple times.

---

# 13. tiffin_reviews

Stores customer reviews for tiffin listings.


| Column                 | Type      | Description                   |
| ---------------------- | --------- | ----------------------------- |
| id (PK)                | INT       | Review ID                     |
| customer_id (FK)       | INT       | References users.id           |
| tiffin_listing_id (FK) | INT       | References tiffin_listings.id |
| rating                 | INT (1-5) | Rating value                  |
| comment                | TEXT      | Review comment                |
| created_at             | TIMESTAMP | Review timestamp              |


Relationship:  
One tiffin listing can have multiple reviews.  
Each customer can review a tiffin listing only once.

---

# 14. service_listings

Stores local service providers (electrician, plumber, etc.).


| Column            | Type                                                                                                                    | Description                     |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| id (PK)           | INT                                                                                                                     | Service listing ID              |
| provider_id (FK)  | INT                                                                                                                     | References provider_profiles.id |
| service_category  | ENUM (electrician, plumber, carpenter, ac_repair, cleaning, packers_movers, wifi_installation, gas_connection, laundry) | Service type                    |
| service_title     | VARCHAR                                                                                                                 | Service title                   |
| description       | TEXT                                                                                                                    | Service details                 |
| base_price        | DECIMAL                                                                                                                 | Base service charge             |
| service_radius    | NUMERIC                                                                                                                 | Service coverage radius         |
| availability_days | TEXT                                                                                                                    | Available working days          |
| status            | ENUM (pending, approved, rejected)                                                                                      | Approval status                 |
| approved_at       | TIMESTAMP                                                                                                               | Approval timestamp              |
| created_at        | TIMESTAMP                                                                                                               | Creation timestamp              |


Relationship:  
One provider can create multiple service listings.

---

# 15. service_bookings

Stores bookings for local services.


| Column                  | Type                                             | Description                    |
| ----------------------- | ------------------------------------------------ | ------------------------------ |
| id (PK)                 | INT                                              | Booking ID                     |
| customer_id (FK)        | INT                                              | References users.id            |
| service_listing_id (FK) | INT                                              | References service_listings.id |
| booking_date            | DATE                                             | Booking date                   |
| booking_time            | TIME                                             | Booking time                   |
| booking_status          | ENUM (requested, accepted, completed, cancelled) | Current status                 |
| address                 | TEXT                                             | Service address                |
| notes                   | TEXT                                             | Additional instructions        |
| quoted_price            | DECIMAL                                          | Final quoted price             |
| created_at              | TIMESTAMP                                        | Booking creation timestamp     |


Relationship:  
One customer can make multiple bookings.  
One service listing can have multiple bookings.

---

# 16. saved_houses

Stores houses saved by customers.


| Column                | Type      | Description                  |
| --------------------- | --------- | ---------------------------- |
| id (PK)               | INT       | Record ID                    |
| customer_id (FK)      | INT       | References users.id          |
| house_listing_id (FK) | INT       | References house_listings.id |
| created_at            | TIMESTAMP | Save timestamp               |


Relationship:  
One customer can save multiple houses.  
Each customer can save a house only once.

---

# 17. saved_meals

Stores meals saved by customers.


| Column           | Type      | Description         |
| ---------------- | --------- | ------------------- |
| id (PK)          | INT       | Record ID           |
| customer_id (FK) | INT       | References users.id |
| meal_id (FK)     | INT       | References meals.id |
| created_at       | TIMESTAMP | Save timestamp      |


Relationship:  
One customer can save multiple meals.  
Each customer can save a meal only once.

---

# 18. saved_services

Stores services saved by customers.


| Column                  | Type      | Description                    |
| ----------------------- | --------- | ------------------------------ |
| id (PK)                 | INT       | Record ID                      |
| customer_id (FK)        | INT       | References users.id            |
| service_listing_id (FK) | INT       | References service_listings.id |
| created_at              | TIMESTAMP | Save timestamp                 |


Relationship:  
One customer can save multiple services.  
Each customer can save a service only once.

---

# 19. customer_addresses

Stores saved delivery addresses for customers.


| Column           | Type      | Description                |
| ---------------- | --------- | -------------------------- |
| id (PK)          | INT       | Address ID                 |
| customer_id (FK) | INT       | References users.id        |
| address_line     | TEXT      | Full address               |
| is_default       | BOOLEAN   | Default address indicator  |
| created_at       | TIMESTAMP | Address creation timestamp |


Relationship:  
One customer can save multiple addresses.

---

# Database Relationships Summary

- users → provider_profiles (1:1 for provider accounts)
- provider_profiles → provider_profile_pics (1:1)
- provider_profiles → house_listings (1:N)
- provider_profiles → tiffin_listings (1:N)
- provider_profiles → service_listings (1:N)
- house_listings → hostel_details (1:1, for Hostel type)
- house_listings → apartment_details (1:1, for Apartment type)
- house_listings → pg_details (1:1, for PG type)
- house_listings → house_images (1:N)
- tiffin_listings → tiffin_images (1:N)
- tiffin_listings → meals (1:N)
- users → orders (1:N)
- meals → orders (1:N)
- tiffin_listings → tiffin_reviews (1:N)
- users → service_bookings (1:N)
- service_listings → service_bookings (1:N)
- users → saved_houses (1:N)
- users → saved_meals (1:N)
- users → saved_services (1:N)
- users → customer_addresses (1:N)

---

# Image File Naming Convention

All image files uploaded to the system follow this naming pattern:

`<type>_<listing_id>_<timestamp>.<extension>`

Examples:

- `house_123_20240101123045.jpg`
- `tiffin_45_20240102154022.png`
- `meal_78_20240103122010.jpg`