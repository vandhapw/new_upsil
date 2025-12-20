# production/utils/eda.py
import math
from django.utils.dateparse import parse_datetime
from datetime import datetime, time, timedelta

def safe_parse_datetime(value):
    """
    Accepts:
    - YYYY-MM-DD
    - ISO datetime
    - Unix timestamp (seconds or ms)
    """
    if not value:
        return None

    # Unix timestamp
    if isinstance(value, str) and value.isdigit():
        ts = int(value)
        if ts > 10**12:  # milliseconds
            ts = ts / 1000
        return datetime.utcfromtimestamp(ts)

    # Full ISO datetime
    dt = parse_datetime(value)
    if dt:
        return dt

    # Date only (YYYY-MM-DD)
    try:
        d = datetime.strptime(value, "%Y-%m-%d").date()
        return datetime.combine(d, time.min)
    except Exception:
        return None
    
def normalize_date_range(request, default_days=7, max_days=365):
    start = safe_parse_datetime(request.GET.get("start"))
    end = safe_parse_datetime(request.GET.get("end"))

    now = datetime.utcnow()

    if not end:
        end = now
    if not start:
        start = end - timedelta(days=default_days)

    range_days = (end - start).days

    if range_days > max_days:
        return None, None, {
            "error": "Date range too large",
            "max_days": max_days,
            "received_days": range_days
        }

    return start, end, None


def choose_time_format(range_days):
    if range_days <= 2:
        return "%Y-%m-%d %H:%M"
    elif range_days <= 31:
        return "%Y-%m-%d %H:00"
    else:
        return "%Y-%m-%d"


def safe_mean(arr):
    return sum(arr) / len(arr) if arr else 0

def safe_std(arr):
    if len(arr) < 2:
        return 0
    mean = safe_mean(arr)
    return math.sqrt(sum((x - mean) ** 2 for x in arr) / (len(arr) - 1))

def percentiles(arr, p):
    if not arr:
        return 0
    arr = sorted(arr)
    k = (len(arr) - 1) * p
    f = math.floor(k)
    c = math.ceil(k)
    if f == c:
        return arr[int(k)]
    return arr[f] * (c - k) + arr[c] * (k - f)
