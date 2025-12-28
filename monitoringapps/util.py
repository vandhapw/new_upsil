def serialize_sensor_sn(doc):
    return {
        "id": doc.get("id"),
        "ozone": doc.get("ozone"),
        "temperature": doc.get("temperature"),
        "humidity": doc.get("humidity"),
        "dust": doc.get("dust"),
        "co2": doc.get("co2"),
        "voc": doc.get("voc"),
        "serial_number": doc.get("serial_number"),
        "active": doc.get("active"),
        "m_enable": doc.get("m_enabled"),
        "s_enable": doc.get("s_enable"),
        "timestamp": doc.get("timestamp"),
        "last_time": doc.get("last_time"),
    }
