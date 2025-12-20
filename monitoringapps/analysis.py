from django.shortcuts import render
from django.http import JsonResponse
from pymongo import MongoClient
from production.utils import get_mongo_client
import json
from datetime import datetime,timedelta
import math
from django.utils.dateparse import parse_datetime
import csv
from django.http import StreamingHttpResponse 
import numpy as np
from .utils.eda import safe_mean, safe_std, percentiles, safe_parse_datetime, normalize_date_range, choose_time_format

from statsmodels.tsa.seasonal import seasonal_decompose
import pandas as pd


client = get_mongo_client()
db = client['server_db']
collection = db['plalion_klaen_sensor']

def iaq_trend_safe(request):
    start = safe_parse_datetime(request.GET.get("start"))
    end = safe_parse_datetime(request.GET.get("end"))
    
    if not start or not end:
        return JsonResponse({"error": "Invalid date range"}, status=400)

    if (end - start).days > 60:
        return JsonResponse({"error": "Date range too large"}, status=400)

    pipeline = [
        {"$match": {"timestamp": {"$gte": start, "$lte": end}}},
        {"$group": {
            "_id": {"$hour": "$timestamp"},
            "co2": {"$avg": "$co2"},
            "voc": {"$avg": "$voc"},
            "temperature": {"$avg": "$temperature"},
            "humidity": {"$avg": "$humidity"},
            "dust": {"$avg": "$dust"},
            "ozone": {"$avg": "$ozone"}
        }},
        {"$sort": {"_id": 1}}
    ]

    return JsonResponse(list(collection.aggregate(pipeline)), safe=False)


def iaq_summary(request):
    start, end, error = normalize_date_range(request, default_days=7, max_days=365)
    if error:
        return JsonResponse(error, status=400)

    cursor = collection.find(
        {"timestamp": {"$gte": start, "$lte": end}},
        {
            "co2": 1, "voc": 1, "temperature": 1,
            "humidity": 1, "dust": 1, "ozone": 1
        }
    )

    data = {k: [] for k in ["co2","voc","temperature","humidity","dust","ozone"]}

    for d in cursor:
        for k in data:
            if k in d and isinstance(d[k], (int, float)):
                data[k].append(d[k])

    def safe_mean(arr): return round(sum(arr)/len(arr), 2) if arr else None

    summary = {
        k: {
            "mean": safe_mean(v),
            "min": min(v) if v else None,
            "max": max(v) if v else None
        }
        for k, v in data.items()
    }

    return JsonResponse(summary)

def iaq_trend(request):
    start, end, error = normalize_date_range(request, default_days=7, max_days=365)
    if error:
        return JsonResponse(error, status=400)

    range_days = (end - start).days
    fmt = choose_time_format(range_days)

    pipeline = [
        {"$match": {"timestamp": {"$gte": start, "$lte": end}}},
        {"$group": {
            "_id": {"$dateToString": {"format": fmt, "date": "$timestamp"}},
            "co2": {"$avg": "$co2"},
            "voc": {"$avg": "$voc"},
            "temperature": {"$avg": "$temperature"},
            "humidity": {"$avg": "$humidity"},
            "dust": {"$avg": "$dust"},
            "ozone": {"$avg": "$ozone"},
        }},
        {"$sort": {"_id": 1}}
    ]

    return JsonResponse(list(collection.aggregate(pipeline)), safe=False)


def iaq_distribution(request):
    start, end, error = normalize_date_range(
        request,
        default_days=7,
        max_days=365
    )
    if error:
        return JsonResponse(error, status=400)

    field = request.GET.get("field", "co2")
    bins = int(request.GET.get("bins", 20))

    # Step 1: get min & max (cheap aggregation)
    stats = list(collection.aggregate([
        {"$match": {
            "timestamp": {"$gte": start, "$lte": end},
            field: {"$exists": True, "$ne": None}
        }},
        {"$group": {
            "_id": None,
            "min": {"$min": f"${field}"},
            "max": {"$max": f"${field}"}
        }}
    ]))

    if not stats or stats[0]["min"] is None:
        return JsonResponse({"error": "No data"}, status=400)

    min_v = stats[0]["min"]
    max_v = stats[0]["max"]

    if min_v == max_v:
        return JsonResponse({
            "bins": [min_v],
            "counts": [1]
        })

    # Step 2: build bucket boundaries
    step = (max_v - min_v) / bins
    boundaries = [min_v + i * step for i in range(bins + 1)]

    # Step 3: bucket aggregation
    pipeline = [
        {"$match": {
            "timestamp": {"$gte": start, "$lte": end},
            field: {"$exists": True, "$ne": None}
        }},
        {"$bucket": {
            "groupBy": f"${field}",
            "boundaries": boundaries,
            "default": "overflow",
            "output": {
                "count": {"$sum": 1}
            }
        }}
    ]

    result = list(collection.aggregate(pipeline))

    # Step 4: format output
    labels = []
    counts = []

    for r in result:
        if r["_id"] == "overflow":
            continue
        labels.append(round(r["_id"], 2))
        counts.append(r["count"])

    return JsonResponse({
        "field": field,
        "bins": labels,
        "counts": counts,
        "range": {
            "min": min_v,
            "max": max_v
        }
    })



def iaq_correlation(request):
    # Same date logic as other endpoints
    start, end, error = normalize_date_range(
        request,
        default_days=7,
        max_days=90
    )
    if error:
        return JsonResponse(error, status=400)

    fields = ["co2", "voc", "temperature", "humidity", "dust", "ozone"]

    # SAMPLE, never full scan
    pipeline = [
        {
            "$match": {
                "timestamp": {"$gte": start, "$lte": end}
            }
        },
        {"$sample": {"size": 10000}},
        {
            "$project": {
                "_id": 0,
                **{f: 1 for f in fields}
            }
        }
    ]

    rows = []
    for d in collection.aggregate(pipeline):
        try:
            row = [float(d[f]) for f in fields]
            rows.append(row)
        except (KeyError, TypeError, ValueError):
            continue

    if len(rows) < 50:
        return JsonResponse({
            "error": "Not enough data for correlation"
        }, status=400)

    data = np.array(rows)

    # Correlation matrix
    corr = np.corrcoef(data, rowvar=False)

    return JsonResponse({
        "fields": fields,
        "matrix": np.round(corr, 4).tolist(),
        "samples_used": len(rows),
        "start": start.isoformat(),
        "end": end.isoformat(),
    })

def iaq_data_quality(request):
    start, end, error = normalize_date_range(
        request,
        default_days=7,
        max_days=90
    )
    if error:
        return JsonResponse(error, status=400)

    fields = ["co2", "voc", "temperature", "humidity", "dust", "ozone"]

    total_docs = collection.count_documents({
        "timestamp": {"$gte": start, "$lte": end}
    })

    if total_docs == 0:
        return JsonResponse({
            "error": "No data in selected range"
        }, status=400)

    # Count missing per field (MongoDB side)
    pipeline = [
        {"$match": {"timestamp": {"$gte": start, "$lte": end}}},
        {"$group": {
            "_id": None,
            **{
                f"{f}_missing": {
                    "$sum": {
                        "$cond": [
                            {"$or": [
                                {"$eq": [f"${f}", None]},
                                {"$not": [f"${f}"]}
                            ]},
                            1,
                            0
                        ]
                    }
                }
                for f in fields
            }
        }}
    ]

    missing_result = list(collection.aggregate(pipeline))[0]

    # Build response
    quality = {}
    for f in fields:
        missing = missing_result.get(f"{f}_missing", 0)
        quality[f] = {
            "missing": missing,
            "missing_ratio": round(missing / total_docs, 4)
        }

    return JsonResponse({
        "range": {
            "start": start.isoformat(),
            "end": end.isoformat(),
            "records": total_docs
        },
        "quality": quality
    })


def iaq_autocorrelation(request):
    start, end, error = normalize_date_range(request, default_days=7, max_days=90)
    if error:
        return JsonResponse(error, status=400)

    field = request.GET.get("field", "co2")
    max_lag = int(request.GET.get("lag", 48))

    cursor = collection.find(
        {"timestamp": {"$gte": start, "$lte": end}},
        {field: 1, "_id": 0}
    ).sort("timestamp", 1).limit(20000)

    series = [d[field] for d in cursor if isinstance(d.get(field), (int, float))]

    if len(series) < max_lag + 2:
        return JsonResponse({"error": "Not enough data"}, status=400)

    x = np.array(series) - np.mean(series)
    denom = np.sum(x ** 2)

    acf = [
        round(float(np.sum(x[:-lag or None] * x[lag:]) / denom), 4)
        for lag in range(max_lag + 1)
    ]

    return JsonResponse({
        "field": field,
        "lags": list(range(max_lag + 1)),
        "acf": acf
    })
    
def iaq_seasonal_decompose(request):
    start, end, error = normalize_date_range(request, default_days=7, max_days=90)
    if error:
        return JsonResponse(error, status=400)

    field = request.GET.get("field", "co2")
    period = int(request.GET.get("period", 1440))  # 1 day for 1-min data

    cursor = collection.find(
        {"timestamp": {"$gte": start, "$lte": end}},
        {"timestamp": 1, field: 1, "_id": 0}
    ).sort("timestamp", 1)

    rows = [(d["timestamp"], d[field]) for d in cursor
            if isinstance(d.get(field), (int, float))]

    if len(rows) < period * 2:
        return JsonResponse({"error": "Not enough data"}, status=400)

    df = pd.DataFrame(rows, columns=["timestamp", field])
    df.set_index("timestamp", inplace=True)
    df = df.resample("1min").mean().interpolate()

    result = seasonal_decompose(df[field], model="additive", period=period)

    return JsonResponse({
        "field": field,
        "observed": result.observed.dropna().tolist(),
        "trend": result.trend.dropna().tolist(),
        "seasonal": result.seasonal.dropna().tolist(),
        "residual": result.resid.dropna().tolist(),
    })