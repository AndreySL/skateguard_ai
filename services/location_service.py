from typing import List, Dict, Any, Optional
import numpy as np
from ultralytics import YOLO
from config import (
    PERSON_CLASS, TRAFFIC_LIGHT_CLASS, STOP_SIGN_CLASS, PARKING_METER_CLASS,
    VEHICLE_CLASSES
)

def analyze_location_type(
    model: Optional[YOLO], 
    image: np.ndarray, 
    skateboard_bbox: Optional[List[int]] = None
) -> Dict[str, Any]:
    if model is None:
        return {
            "is_forbidden": False, "reason": "", "location_type": "unknown",
            "confidence": 0, "details": {}, "stats": {},
            "location_display_text": "❌ Модель не загружена"
        }

    results = model(image, conf=0.4, verbose=False)
    result = results[0]

    stats = {
        "cars": 0, "trucks": 0, "buses": 0, "motorcycles": 0,
        "bicycles": 0, "total_vehicles": 0, "persons": 0,
        "traffic_lights": 0, "stop_signs": 0, "parking_meters": 0
    }
    
    vehicle_boxes = []

    if result.boxes is not None:
        for box in result.boxes:
            x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
            cls = int(box.cls[0])
            
            if cls in VEHICLE_CLASSES:
                stats[f"{result.names[cls]}s"] = stats.get(f"{result.names[cls]}s", 0) + 1
                stats["total_vehicles"] += 1
                vehicle_boxes.append([x1, y1, x2, y2])
            elif cls == PERSON_CLASS:
                stats["persons"] += 1
            elif cls == TRAFFIC_LIGHT_CLASS:
                stats["traffic_lights"] += 1
            elif cls == STOP_SIGN_CLASS:
                stats["stop_signs"] += 1
            elif cls == PARKING_METER_CLASS:
                stats["parking_meters"] += 1

    has_road_indicators = stats["traffic_lights"] > 0 or stats["stop_signs"] > 0 or stats["parking_meters"] > 0
    is_road = stats["total_vehicles"] >= 1 or has_road_indicators

    location_type = "unknown"
    is_forbidden = False
    reason = ""
    details = {}

    if is_road:
        location_type = "road"
        details["vehicle_count"] = stats["total_vehicles"]
        if skateboard_bbox is not None:
            is_forbidden = True
            reason = "🚫 Катание на ПРОЕЗЖЕЙ ЧАСТИ запрещено!"
    elif stats["persons"] >= 3:
        location_type = "crowded_area"
        details["person_count"] = stats["persons"]
        is_forbidden = True
        reason = f"🚫 Катание в МЕСТАХ СКОПЛЕНИЯ ЛЮДЕЙ ({stats['persons']} чел.) запрещено!"
    elif stats["total_vehicles"] >= 1 and skateboard_bbox is not None:
        sx1, sy1, sx2, sy2 = skateboard_bbox
        skate_center = ((sx1 + sx2) / 2, (sy1 + sy2) / 2)
        
        for vbox in vehicle_boxes:
            vx1, vy1, vx2, vy2 = vbox
            dist_x = abs(skate_center[0] - ((vx1 + vx2) / 2))
            dist_y = abs(skate_center[1] - ((vy1 + vy2) / 2))
            
            if dist_x < 200 and dist_y < 150:
                location_type = "dangerous_near_road"
                details["distance_to_vehicle"] = f"{int((dist_x + dist_y)/2)}px"
                is_forbidden = True
                reason = "🚫 Катание в ОПАСНОЙ БЛИЗОСТИ ОТ ДОРОГИ запрещено!"
                break
    else:
        location_type = "safe_area"
        is_forbidden = False

    labels_map = {
        "road": f"🚗 ПРОЕЗЖАЯ ЧАСТЬ | Авто: {stats['total_vehicles']}",
        "crowded_area": f"👥 МЕСТО СКОПЛЕНИЯ | Людей: {stats['persons']}",
        "dangerous_near_road": f"⚠️ ОПАСНО У ДОРОГИ | Дист: {details.get('distance_to_vehicle', '?')}",
        "safe_area": "✅ БЕЗОПАСНАЯ ТЕРРИТОРИЯ",
        "unknown": "❓ ТИП МЕСТНОСТИ НЕ ОПРЕДЕЛЁН"
    }

    return {
        "is_forbidden": is_forbidden,
        "reason": reason,
        "location_type": location_type,
        "confidence": 0.8 if is_forbidden else 0.7,
        "details": details,
        "stats": stats,
        "location_display_text": labels_map.get(location_type, "Неизвестно")
    }