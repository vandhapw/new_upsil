def serialize_sensor_sn(doc):
    return {
        "id": doc.get("id"),
        "ozone": doc.get("ozone"),
        "temperature": doc.get("temperature"),
        "humidity": doc.get("humidity"),
        "dust": doc.get("dust"),
        "co2": doc.get("co2"),
        "voc": doc.get("voc"),
        "serial_num": doc.get("serial_num"),
        "active": doc.get("active"),
        "m_enable": doc.get("m_enabled"),
        "s_enable": doc.get("s_enable"),
        "timestamp": doc.get("timestamp"),
    }
