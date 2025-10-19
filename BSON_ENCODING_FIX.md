# Fix for MongoDB BSON Encoding Error: NumPy and datetime.time Objects

## Error Message
```json
{
    "error": "Database error",
    "details": "Invalid document {...} | cannot encode object: datetime.time(8, 0), of type: <class 'datetime.time'>"
}
```

## Root Cause

MongoDB's BSON encoder **cannot serialize**:
1. **NumPy data types**: `np.float64()`, `np.int64()`, `np.ndarray()`
2. **Python datetime.time objects**: `datetime.time(8, 0)`
3. **Python datetime.date objects**: `datetime.date(2025, 10, 20)`

These types appear in the `optimize_result` data returned from `calculate_distance_matrix_test()`.

## Problematic Data Examples

From your error message:
```python
'best_fitness': np.float64(10768.8),  # ❌ NumPy type
'total_distance': np.float64(15384.0),  # ❌ NumPy type
'start_time': datetime.time(8, 0),  # ❌ datetime.time
'end_time': datetime.time(9, 42),  # ❌ datetime.time
```

## Solution Applied

### 1. Serialize `optimize_result` Before Saving

**File**: `tourism/views.py` (lines ~938-943)

#### Before:
```python
distance_matrix_data = calculate_distance_matrix_test(data=optimize_data)

save_data = {
    # ...
    'optimize_result': distance_matrix_data,  # ❌ Contains non-serializable types
    # ...
}
```

#### After:
```python
distance_matrix_data = calculate_distance_matrix_test(data=optimize_data)

# Serialize optimize_result to make it MongoDB-compatible
serialized_distance_matrix = serialize_for_mongodb(distance_matrix_data)

save_data = {
    # ...
    'optimize_result': serialized_distance_matrix,  # ✅ All types converted
    # ...
}
```

### 2. Enhanced `serialize_for_mongodb()` Function

**File**: `tourism/views.py` (lines ~285-308)

#### Added Support For:
```python
def serialize_for_mongodb(data):
    """
    Convert data structure to be MongoDB-compatible
    """
    import json
    from datetime import datetime, time, date  # ✅ Added time and date
    import numpy as np
    
    def json_serializer(obj):
        """Handle non-serializable objects"""
        if isinstance(obj, datetime):
            return obj.isoformat()  # "2025-10-20T02:14:01.358304"
        elif isinstance(obj, time):  # ✅ NEW: Handle datetime.time
            return obj.isoformat()  # "08:00:00"
        elif isinstance(obj, date):  # ✅ NEW: Handle datetime.date
            return obj.isoformat()  # "2025-10-20"
        elif isinstance(obj, np.integer):
            return int(obj)  # np.int64 → int
        elif isinstance(obj, np.floating):
            return float(obj)  # np.float64 → float
        elif isinstance(obj, np.ndarray):
            return obj.tolist()  # array → list
        elif hasattr(obj, '__dict__'):
            return obj.__dict__
        else:
            return str(obj)
    
    # Convert to JSON and back to handle non-serializable objects
    json_str = json.dumps(data, default=json_serializer)
    clean_data = json.loads(json_str)
    
    # Convert all keys to strings for MongoDB
    return convert_keys_to_strings(clean_data)
```

## What Gets Converted

### NumPy Types → Python Native:
```python
np.float64(10768.8)  → 10768.8 (float)
np.int64(2)          → 2 (int)
np.ndarray([1, 2])   → [1, 2] (list)
```

### datetime Objects → ISO String:
```python
datetime.time(8, 0)              → "08:00:00"
datetime.time(9, 42)             → "09:42:00"
datetime.date(2025, 10, 20)      → "2025-10-20"
datetime.datetime(2025, 10, 20)  → "2025-10-20T02:14:01.358304"
```

### Dictionary Keys → Strings:
```python
{0: 'value', 1: 'value'}  → {'0': 'value', '1': 'value'}
```

## Files Changed

### `tourism/views.py`

**Change 1** (Line ~285): Enhanced serializer
```python
# Added imports
from datetime import datetime, time, date

# Added handlers in json_serializer
elif isinstance(obj, time):
    return obj.isoformat()
elif isinstance(obj, date):
    return obj.isoformat()
```

**Change 2** (Line ~938-943): Serialize before saving
```python
distance_matrix_data = calculate_distance_matrix_test(data=optimize_data)

# NEW: Serialize the result
serialized_distance_matrix = serialize_for_mongodb(distance_matrix_data)

save_data = {
    # ...
    'optimize_result': serialized_distance_matrix,  # Use serialized version
    # ...
}
```

## Testing Steps

1. **Restart Django server**:
   ```powershell
   # Stop with Ctrl+C, then restart
   python manage.py runserver
   ```

2. **Clear browser cache and refresh**

3. **Submit a trip** with hotels and attractions

4. **Check Django terminal** - should see no encoding errors

5. **Verify in MongoDB**:
   ```python
   # In Python shell or MongoDB Compass
   # Check that optimize_result contains:
   # - Regular floats (not np.float64)
   # - Time strings (not datetime.time objects)
   ```

## Expected Result

### ✅ Before Serialization (Raw Data):
```python
{
    'best_fitness': np.float64(10768.8),
    'start_time': datetime.time(8, 0),
    'path_coordinates': np.array([[-7.0, 110.4], [-6.9, 110.3]])
}
```

### ✅ After Serialization (MongoDB-Compatible):
```python
{
    'best_fitness': 10768.8,
    'start_time': '08:00:00',
    'path_coordinates': [[-7.0, 110.4], [-6.9, 110.3]]
}
```

## Why This Works

1. **JSON Round-Trip**: Converting to JSON and back ensures all types are JSON-compatible (which are also MongoDB-compatible)

2. **Custom Serializer**: The `json_serializer` function handles each non-standard type:
   - Converts NumPy types to Python natives
   - Converts datetime objects to ISO strings
   - Handles nested structures recursively

3. **String Keys**: MongoDB requires string keys for dictionaries, so `convert_keys_to_strings()` ensures compliance

## Common BSON Encoding Errors Fixed

✅ **NumPy Types**:
- `np.float64` → `float`
- `np.int32`, `np.int64` → `int`
- `np.ndarray` → `list`

✅ **datetime Types**:
- `datetime.datetime` → ISO string
- `datetime.time` → "HH:MM:SS"
- `datetime.date` → "YYYY-MM-DD"

✅ **Special Objects**:
- Objects with `__dict__` → dictionary
- Non-serializable → string representation

## Notes

- The serialization happens **before** MongoDB insertion, not during
- All nested structures are handled recursively
- The original `distance_matrix_data` is not modified, only the copy that gets saved
- ISO format strings can be parsed back to datetime objects if needed

## Verification

After the fix, you should be able to:
1. ✅ Save trip data without encoding errors
2. ✅ Store optimization results with timing data
3. ✅ View saved data in MongoDB without type errors
4. ✅ Retrieve and display historical trip data

The data is now fully MongoDB BSON-compatible! 🎉
