from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
import hashlib
import time
from production.utils import get_mongo_client

client = get_mongo_client()
db = client['server_db']
user_collection = db['user']

def generate_verification_link(user_data, request):
    from django.urls import reverse 
    
    # Use the 'id' field from MongoDB document
    uid = urlsafe_base64_encode(force_bytes(user_data['id']))
    
    # Create a custom token since we're not using Django User model
    token_string = f"{user_data['id']}{user_data['email']}{int(time.time())}"
    token = hashlib.sha256(token_string.encode()).hexdigest()[:20]  # Use first 20 chars
    
    print('Generated UID:', uid)  # Debugging line
    print('Generated Token:', token)  # Debugging line
    
    verification_url = request.build_absolute_uri(
        reverse('account:verify_email', kwargs={'uidb64': uid, 'token': token})
    )

    print("Verification URL:", verification_url)  # Debugging line
    
    # Store the token in MongoDB for later verification
    client = get_mongo_client()
    db = client['server_db']
    user_collection = db['user']
    
    # Store the verification token with the user
    user_collection.update_one(
        {'id': user_data['id']}, 
        {'$set': {'verification_token': token, 'token_created_at': time.time()}}
    )
    
    return verification_url