def serialize_user(doc):
    return {
        "id": doc.get("id"),
        "firstName": doc.get("firstName"),
        "lastName": doc.get("lastName"),
        "username": doc.get("username"),
        "email": doc.get("email"),
        "photo": doc.get("photo"),
        "user_group": doc.get("user_group"),
        "type": doc.get("type"),
        "is_active": doc.get("is_active"),
        "created_at": doc.get("created_at"),
        "updated_at": doc.get("updated_at"),
        "registered_at": doc.get("registered_at"),
        "user_category": doc.get("user_category"),
    }
