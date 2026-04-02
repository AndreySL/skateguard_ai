import os
from pathlib import Path

# Пути
BASE_DIR = Path(__file__).parent
STATIC_DIR = BASE_DIR / "static"
WEB_DIR = BASE_DIR / "web"
RESULTS_DIR = STATIC_DIR / "results"
UPLOAD_DIR = STATIC_DIR / "uploads"
VIDEO_RESULTS_DIR = STATIC_DIR / "video_results"
HISTORY_FILE = BASE_DIR / "history.json"

# Создание директорий
for dir_path in [RESULTS_DIR, UPLOAD_DIR, VIDEO_RESULTS_DIR, STATIC_DIR]:
    dir_path.mkdir(parents=True, exist_ok=True)

# ID классов COCO (YOLO)
PERSON_CLASS = 0
BICYCLE_CLASS = 1
CAR_CLASS = 2
MOTORCYCLE_CLASS = 3
BUS_CLASS = 5
TRUCK_CLASS = 7
TRAFFIC_LIGHT_CLASS = 9
STOP_SIGN_CLASS = 11
PARKING_METER_CLASS = 12
SKATEBOARD_CLASS = 36

VEHICLE_CLASSES = [CAR_CLASS, TRUCK_CLASS, BUS_CLASS, MOTORCYCLE_CLASS]

# Настройки CORS
CORS_ORIGINS = ["*"]