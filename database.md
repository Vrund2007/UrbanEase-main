# UrbanEase Database Documentation

This document describes the relational database structure for all UrbanEase tables based on the latest production schema.

UrbanEase connects:

* House / PG / Hostel providers
* Tiffin providers
* Local service providers
* Customers
* Admins

The system supports listings, provider verification, ordering, bookings, reviews, and saved items.

---

# 1. users

Stores all platform users including customers, providers, and admins.

| Column       | Type                            | Description       |
| ------------ | ------------------------------- | ----------------- |
| id (PK)      | INT                             | Unique user ID    |
| username     | VARCHAR(100)                    | Username          |
| email        | VARCHAR(150) UNIQUE             | Email             |
| password     | VARCHAR(255)                    | Password hash     |
| phone        | VARCHAR(10)                     | Phone number      |
| account_type | ENUM(customer, provider, admin) | Role              |
| status       | ENUM(active, suspended)         | Account status    |
| created_at   | TIMESTAMP                       | Created timestamp |

---

# 2. provider_profiles

Stores additional information for provider accounts.

| Column              | Type                              | Description         |
| ------------------- | --------------------------------- | ------------------- |
| id (PK)             | INT                               | Provider profile ID |
| user_id (FK) UNIQUE | INT                               | References users.id |
| business_name       | VARCHAR(150)                      | Business name       |
| aadhaar_number      | CHAR(12) UNIQUE                   | Aadhaar number      |
| business_license    | VARCHAR(100)                      | License file/path   |
| verification_status | ENUM(pending, verified, rejected) | Verification state  |
| verified_at         | TIMESTAMP                         | Verification time   |
| created_at          | TIMESTAMP                         | Created timestamp   |

**Relationship:** One-to-one with users (provider accounts only).

---

# 3. provider_profile_pics

Stores provider profile image.

| Column                  | Type      | Description                     |
| ----------------------- | --------- | ------------------------------- |
| id (PK)                 | INT       | Image ID                        |
| provider_id (FK) UNIQUE | INT       | References provider_profiles.id |
| image_path              | TEXT      | File path                       |
| created_at              | TIMESTAMP | Upload time                     |

**Relationship:** One-to-one with provider_profiles.

---

# 4. house_listings

Stores house / PG / hostel listings.

| Column           | Type                              | Description                     |
| ---------------- | --------------------------------- | ------------------------------- |
| id (PK)          | INT                               | Listing ID                      |
| provider_id (FK) | INT                               | References provider_profiles.id |
| title            | VARCHAR(200)                      | Title                           |
| description      | TEXT                              | Description                     |
| price            | DECIMAL                           | Price                           |
| location         | VARCHAR(200)                      | Location                        |
| type             | ENUM(PG, Hostel, Apartment)       | Listing type                    |
| status           | ENUM(pending, approved, rejected) | Approval status                 |
| approved_at      | TIMESTAMP                         | Approval time                   |
| created_at       | TIMESTAMP                         | Created timestamp               |

**Relationship:** One provider → many listings.

---

# 5. hostel_details

Hostel-specific attributes.

| Column            | Type                       | Description       |
| ----------------- | -------------------------- | ----------------- |
| id (PK)           | INT                        | Record ID         |
| listing_id UNIQUE | INT FK → house_listings.id | Listing reference |
| gender            | ENUM(boys, girls, coed)    | Gender type       |
| room_type         | ENUM(single, double, dorm) | Room type         |
| wifi              | BOOLEAN                    | WiFi              |
| attached_bathroom | BOOLEAN                    | Attached bathroom |
| food_included     | BOOLEAN                    | Food included     |
| laundry           | BOOLEAN                    | Laundry           |
| created_at        | TIMESTAMP                  | Created time      |

---

# 6. apartment_details

Apartment-specific attributes.

| Column            | Type                               | Description |
| ----------------- | ---------------------------------- | ----------- |
| id (PK)           | INT                                | Record ID   |
| listing_id UNIQUE | INT FK → house_listings.id         | Listing     |
| listing_purpose   | ENUM(rent, sale)                   | Purpose     |
| bhk               | ENUM(1,2,3,4+)                     | BHK         |
| tenant_preference | ENUM(family, bachelor, any)        | Tenant      |
| furnishing        | ENUM(furnished, semi, unfurnished) | Furnishing  |
| created_at        | TIMESTAMP                          | Created     |

---

# 7. pg_details

PG-specific attributes.

| Column            | Type                       | Description |
| ----------------- | -------------------------- | ----------- |
| id (PK)           | INT                        | Record ID   |
| listing_id UNIQUE | INT FK → house_listings.id | Listing     |
| gender            | ENUM(boys, girls, coed)    | Gender      |
| ac_available      | BOOLEAN                    | AC          |
| sharing           | ENUM(1,2,3,4+)             | Sharing     |
| food_included     | BOOLEAN                    | Food        |
| laundry           | BOOLEAN                    | Laundry     |
| created_at        | TIMESTAMP                  | Created     |

---

# 8. house_images

Images for house listings.

| Column          | Type      | Description |
| --------------- | --------- | ----------- |
| id (PK)         | INT       | Image ID    |
| listing_id (FK) | INT       | Listing     |
| image_path      | TEXT      | Path        |
| created_at      | TIMESTAMP | Upload      |

---

# 9. tiffin_listings

Tiffin provider listings.

| Column                  | Type                              | Description   |
| ----------------------- | --------------------------------- | ------------- |
| id (PK)                 | INT                               | Listing       |
| provider_id (FK)        | INT                               | Provider      |
| delivery_radius         | NUMERIC                           | KM radius     |
| fast_delivery_available | BOOLEAN                           | Fast delivery |
| kitchen_open            | BOOLEAN                           | Kitchen open  |
| status                  | ENUM(pending, approved, rejected) | Status        |
| approved_at             | TIMESTAMP                         | Approved      |
| diet_type               | ENUM(veg, non-veg, both)          | Diet          |
| available_days          | TEXT                              | Days          |
| created_at              | TIMESTAMP                         | Created       |

---

# 10. tiffin_images

Images for tiffin listings.

| Column                 | Type      | Description |
| ---------------------- | --------- | ----------- |
| id (PK)                | INT       | Image       |
| tiffin_listing_id (FK) | INT       | Listing     |
| image_path             | TEXT      | Path        |
| created_at             | TIMESTAMP | Upload      |

---

# 11. meals

Meals under a tiffin listing.

| Column                 | Type                           | Description |
| ---------------------- | ------------------------------ | ----------- |
| id (PK)                | INT                            | Meal        |
| tiffin_listing_id (FK) | INT                            | Listing     |
| meal_name              | VARCHAR(150)                   | Name        |
| description            | TEXT                           | Details     |
| meal_category          | ENUM(breakfast, lunch, dinner) | Category    |
| diet_type              | ENUM(veg, non-veg, jain)       | Diet        |
| price                  | DECIMAL                        | Price       |
| is_available           | BOOLEAN                        | Available   |
| meal_image_path        | TEXT                           | Image       |
| created_at             | TIMESTAMP                      | Created     |

---

# 12. orders

Customer meal orders.

| Column                 | Type                                                            | Description |
| ---------------------- | --------------------------------------------------------------- | ----------- |
| id (PK)                | INT                                                             | Order       |
| customer_id (FK)       | INT                                                             | User        |
| tiffin_listing_id (FK) | INT                                                             | Listing     |
| meal_id (FK)           | INT                                                             | Meal        |
| quantity               | INT                                                             | Qty         |
| base_price             | DECIMAL                                                         | Base        |
| fast_delivery          | BOOLEAN                                                         | Fast        |
| fast_delivery_charge   | DECIMAL                                                         | Charge      |
| total_price            | DECIMAL                                                         | Total       |
| order_status           | ENUM(placed, preparing, out_for_delivery, delivered, cancelled) | Status      |
| delivery_address       | TEXT                                                            | Address     |
| order_date             | TIMESTAMP                                                       | Time        |

---

# 13. tiffin_reviews

Reviews for tiffin listings.

| Column                 | Type      | Description |
| ---------------------- | --------- | ----------- |
| id (PK)                | INT       | Review      |
| customer_id (FK)       | INT       | User        |
| tiffin_listing_id (FK) | INT       | Listing     |
| rating                 | INT (1–5) | Rating      |
| comment                | TEXT      | Comment     |
| created_at             | TIMESTAMP | Created     |

**Constraint:** One review per customer per listing.

---

# 14. service_listings

Local service providers.

| Column            | Type                                                                                                                   | Description |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------- |
| id (PK)           | INT                                                                                                                    | Listing     |
| provider_id (FK)  | INT                                                                                                                    | Provider    |
| service_category  | ENUM(electrician, plumber, carpenter, ac_repair, cleaning, packers_movers, wifi_installation, gas_connection, laundry) | Category    |
| service_title     | VARCHAR(200)                                                                                                           | Title       |
| description       | TEXT                                                                                                                   | Details     |
| base_price        | DECIMAL                                                                                                                | Price       |
| service_radius    | NUMERIC                                                                                                                | Radius      |
| availability_days | TEXT                                                                                                                   | Days        |
| status            | ENUM(pending, approved, rejected)                                                                                      | Status      |
| approved_at       | TIMESTAMP                                                                                                              | Approved    |
| created_at        | TIMESTAMP                                                                                                              | Created     |

---

# 15. service_bookings

Bookings for services.

| Column                  | Type                                            | Description |
| ----------------------- | ----------------------------------------------- | ----------- |
| id (PK)                 | INT                                             | Booking     |
| customer_id (FK)        | INT                                             | User        |
| service_listing_id (FK) | INT                                             | Listing     |
| booking_date            | DATE                                            | Date        |
| booking_time            | TIME                                            | Time        |
| booking_status          | ENUM(requested, accepted, completed, cancelled) | Status      |
| address                 | TEXT                                            | Address     |
| notes                   | TEXT                                            | Notes       |
| quoted_price            | DECIMAL                                         | Price       |
| created_at              | TIMESTAMP                                       | Created     |

---

# 16. saved_houses

Saved house listings.

| Column                | Type      | Description |
| --------------------- | --------- | ----------- |
| id (PK)               | INT       | Record      |
| customer_id (FK)      | INT       | User        |
| house_listing_id (FK) | INT       | Listing     |
| created_at            | TIMESTAMP | Saved       |

**Constraint:** Unique(customer_id, house_listing_id)

---

# 17. saved_meals

Saved meals.

| Column           | Type      | Description |
| ---------------- | --------- | ----------- |
| id (PK)          | INT       | Record      |
| customer_id (FK) | INT       | User        |
| meal_id (FK)     | INT       | Meal        |
| created_at       | TIMESTAMP | Saved       |

**Constraint:** Unique(customer_id, meal_id)

---

# 18. saved_services

Saved services.

| Column                  | Type      | Description |
| ----------------------- | --------- | ----------- |
| id (PK)                 | INT       | Record      |
| customer_id (FK)        | INT       | User        |
| service_listing_id (FK) | INT       | Listing     |
| created_at              | TIMESTAMP | Saved       |

**Constraint:** Unique(customer_id, service_listing_id)

---

# 19. customer_addresses

Saved customer addresses.

| Column           | Type      | Description |
| ---------------- | --------- | ----------- |
| id (PK)          | INT       | Address     |
| customer_id (FK) | INT       | User        |
| address_line     | TEXT      | Address     |
| is_default       | BOOLEAN   | Default     |
| created_at       | TIMESTAMP | Created     |

---

# Image Naming Convention

All uploaded images follow:

`<type>_<listing_id>_<timestamp>.<extension>`

Examples:

* house_123_20240101123045.jpg
* tiffin_45_20240102154022.png
* meal_78_20240103122010.jpg
