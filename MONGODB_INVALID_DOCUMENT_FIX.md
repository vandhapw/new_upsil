# Fix for MongoDB "Invalid Document" Error

## Error Message
```
bson.errors.InvalidDocument: Invalid document {'destination': {'city': 'Semarang', 'country': 'South Korea', 'country_code': {}, ...
```

## Root Causes

### 1. ❌ `country_code` was an empty dict `{}` instead of a string
**Problem**: 
```python
'country_code': data.get('destination', {}).get('country_code', {})  # Wrong default: {}
```

MongoDB BSON expects `country_code` to be a string, but it was getting an empty dictionary `{}` as the default value.

**Expected**: `'country_code': 'id'` or `'country_code': 'kr'` or `'country_code': ''`  
**Got**: `'country_code': {}`

### 2. ❌ `country_code` was in the wrong location
**Problem**: Code was trying to access `data['destination']['country_code']`  
**Actual location**: `data['destination']['properties']['country_code']`

The `country_code` field is nested inside the `properties` object, not directly under `destination`.

### 3. ❌ Incorrect coordinate extraction
**Problem**: Used tuple `(lat, lon)` in optimize_data, which could cause issues  
**Solution**: Use list `[lat, lon]` consistently for MongoDB

## Solution Applied

### Changed in `tourism/views.py` (lines 905-990)

#### Before:
```python
optimize_data = {
    'destination': {
        'city': data.get('destination', {}).get('properties', {}).get('city', 'Unknown'),
        'country': data.get('destination', {}).get('country', 'Unknown'),
        'country_code': data.get('destination', {}).get('country_code', {}),  # ❌ Wrong path, wrong default
        'country_place_id': data.get('destination', {}).get('place_id', 'Unknown'),
        'city_place_id': data.get('destination', {}).get('properties', {}).get('place_id', 'Unknown'),
        'city_coordinates': (data.get('destination', {}).get('properties', {}).get('lat', 0), 
                            data.get('destination', {}).get('properties', {}).get('lon', 0))  # ❌ Tuple
    },
    # ... rest
}
```

#### After:
```python
# Extract destination data with proper fallbacks
destination = data.get('destination', {})
dest_properties = destination.get('properties', {})
dest_coordinates = destination.get('coordinates', {})

optimize_data = {
    'destination': {
        'city': dest_properties.get('city', destination.get('name', 'Unknown')),
        'country': destination.get('country', dest_properties.get('country', 'Unknown')),
        'country_code': dest_properties.get('country_code', destination.get('country_code', '')),  # ✅ Correct path, string default
        'country_place_id': destination.get('place_id', dest_properties.get('place_id', 'Unknown')),
        'city_place_id': dest_properties.get('place_id', destination.get('place_id', 'Unknown')),
        'city_coordinates': [  # ✅ List
            dest_properties.get('lat', dest_coordinates.get('latitude', 0)),
            dest_properties.get('lon', dest_coordinates.get('longitude', 0))
        ]
    },
    # ... rest
}
```

### Key Changes:

1. **Fixed `country_code` extraction**:
   - Path: `dest_properties.get('country_code', ...)` instead of `destination.get('country_code', ...)`
   - Default: `''` (empty string) instead of `{}` (empty dict)

2. **Fixed `city_coordinates` format**:
   - Changed from tuple `(lat, lon)` to list `[lat, lon]`
   - Added fallback chain: `properties.lat` → `coordinates.latitude` → `0`

3. **Enhanced error handling**:
   ```python
   try:
       result = trip_optimization_collection.insert_one(save_data)
       # ... success handling
   except Exception as mongo_error:
       print(f"MongoDB Error: {str(mongo_error)}")
       print(f"Problematic data structure: {save_data}")
       return JsonResponse({
           'error': 'Database error',
           'details': str(mongo_error)
       }, status=500)
   ```

## Data Structure Reference

### Correct Input Structure (from Frontend):
```json
{
    "destination": {
        "place_id": "...",
        "name": "Semarang",
        "country": "Indonesia",
        "coordinates": {
            "latitude": -6.9903988,
            "longitude": 110.4229104
        },
        "properties": {
            "country": "Indonesia",
            "country_code": "id",  ← HERE
            "city": "Semarang",
            "lat": -6.9903988,
            "lon": 110.4229104,
            // ...
        }
    }
}
```

### What MongoDB Gets (Saved):
```json
{
    "destination": {
        "city": "Semarang",
        "country": "Indonesia",
        "country_code": "id",  ← String, not {}
        "country_place_id": "...",
        "city_place_id": "...",
        "city_coordinates": [-6.9903988, 110.4229104]  ← List of numbers
    }
}
```

## Testing Steps

1. **Restart Django server** to load updated code:
   ```powershell
   # Stop server (Ctrl+C) then restart
   python manage.py runserver
   ```

2. **Clear browser cache and refresh**

3. **Select a destination** (e.g., Semarang, Indonesia)

4. **Submit trip data**

5. **Check Django terminal** for any errors

6. **Expected result**: 
   - ✅ No "Invalid document" error
   - ✅ Data successfully saved to MongoDB
   - ✅ Returns `inserted_id` in response

## What Was Fixed

### ✅ Type Errors Fixed:
- `country_code: {}` → `country_code: 'id'` (or appropriate country code)
- `city_coordinates: (lat, lon)` → `city_coordinates: [lat, lon]`

### ✅ Data Extraction Fixed:
- Correct path to nested `country_code` in `properties`
- Multiple fallback paths for all fields
- Proper coordinate extraction from multiple possible locations

### ✅ Error Handling Enhanced:
- Catches MongoDB-specific errors
- Logs problematic data structure
- Returns detailed error messages to frontend

## Common Country Codes

For reference, proper `country_code` values:
- Indonesia: `'id'`
- South Korea: `'kr'`
- Japan: `'jp'`
- Thailand: `'th'`
- Malaysia: `'my'`

## Notes

- MongoDB BSON cannot serialize Python dictionaries as values for certain fields
- Always use primitive types (string, number, list, null) for database fields
- Tuples `()` should be converted to lists `[]` for MongoDB compatibility
- Empty string `''` is valid, empty dict `{}` causes type errors
