# Cloudinary configuration
import os
import cloudinary
import cloudinary.uploader
import cloudinary.api

# Load Cloudinary configuration from environment variables
def configure_cloudinary():
    cloudinary.config(
        cloud_name=os.getenv('CLOUD_NAME', 'dol7leoig'),
        api_key=os.getenv('API_KEY', '181995356638281'),
        api_secret=os.getenv('API_SECRET', 'itp5EtA-M7xPP5PUbMHRhyxwPmo')
    )
