import time
import cv2
import numpy as np
from typing import Dict, Any, List, Optional
from ultralytics import YOLO
from config import PERSON_CLASS, SKATEBOARD_CLASS, VEHICLE_CLASSES, UPLOAD_DIR, VIDEO_RESULTS_DIR
from services.location_service import analyze_location_type

# Глобальный статус видео (в идеале заменить на Redis в продакшене)
video_status = {}

class YOLOService:
    def __init__(self, model_path: str = "yolov8n.pt"):
        print("Загрузка моделей YOLO...")
        try:
            self.model = YOLO(model_path)
            print("✅ Модель детекции загружена успешно")
        except Exception as e:
            print(f"❌ Ошибка загрузки модели: {e}")
            self.model = None

    def process_image(self, image: np.ndarray) -> Dict[str, Any]:
        if self.model is None:
            return self._empty_result(image)

        results = self.model(image, conf=0.4, verbose=False)
        result = results[0]
        
        skateboards, persons, vehicles = [], [], []
        
        if result.boxes is not None:
            for box in result.boxes:
                x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                cls, conf = int(box.cls[0]), float(box.conf[0])
                
                if cls == PERSON_CLASS:
                    persons.append({"bbox": [x1, y1, x2, y2], "confidence": conf})
                elif cls == SKATEBOARD_CLASS:
                    skateboards.append({"bbox": [x1, y1, x2, y2], "confidence": conf})
                elif cls in VEHICLE_CLASSES:
                    vehicles.append({"bbox": [x1, y1, x2, y2], "class": result.names[cls]})

        skate_bbox = skateboards[0]["bbox"] if skateboards else None
        location_analysis = analyze_location_type(self.model, image, skate_bbox)

        violation = bool(skateboards and location_analysis["is_forbidden"])
        violation_reason = location_analysis["reason"] if violation else ""

        annotated = result.plot()
        self._draw_overlay(annotated, location_analysis, skateboards, persons, vehicles, violation)

        confidences = [d["confidence"] for d in persons + skateboards]
        avg_conf = (sum(confidences) / len(confidences) * 100) if confidences else 0

        return {
            "skateboards": len(skateboards), "persons": len(persons), "vehicles": len(vehicles),
            "violation": violation, "violation_reason": violation_reason,
            "confidence_avg": round(avg_conf, 1),
            "location_type": location_analysis["location_type"],
            "location_details": location_analysis["details"],
            "location_stats": location_analysis["stats"],
            "location_display_text": location_analysis["location_display_text"],
            "annotated_image": annotated
        }

    def process_video(self, video_path: str, output_path: str, video_id: str) -> Dict[str, Any]:
        cap = out = None
        try:
            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened(): raise Exception("Не удалось открыть видео")

            fps = int(cap.get(cv2.CAP_PROP_FPS)) or 30
            width, height = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)), int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 100

            out = cv2.VideoWriter(output_path, cv2.VideoWriter_fourcc(*'mp4v'), fps, (width, height))
            
            frame_count = 0
            violations, skates, ppl = [], [], []
            last_result = {}

            while True:
                ret, frame = cap.read()
                if not ret: break

                if frame_count % 5 == 0:
                    try:
                        last_result = self.process_image(frame)
                        violations.append(last_result["violation"])
                        skates.append(last_result["skateboards"])
                        ppl.append(last_result["persons"])
                        frame = last_result["annotated_image"]
                    except Exception:
                        violations.append(False); skates.append(0); ppl.append(0)
                else:
                    cv2.putText(frame, f"Skateboards: {skates[-1] if skates else 0}", (10, 30),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)
                    if violations and violations[-1]:
                        cv2.putText(frame, "VIOLATION!", (10, 130), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)

                cv2.putText(frame, f"Frame: {frame_count}", (10, height - 30), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
                out.write(frame)
                frame_count += 1

                if total_frames > 0:
                    video_status[video_id] = {"progress": int(frame_count / total_frames * 100), "status": "processing"}
                if frame_count % 30 == 0: time.sleep(0.01)

            res = {
                "total_frames": frame_count,
                "has_violation": any(violations),
                "violation_percentage": round((sum(violations) / len(violations) * 100), 1) if violations else 0,
                "avg_skateboards": round((sum(skates) / len(skates)), 2) if skates else 0,
                "avg_persons": round((sum(ppl) / len(ppl)), 2) if ppl else 0,
                "fps": fps, "duration": round(frame_count / fps, 2) if fps > 0 else 0
            }
            video_status[video_id] = {"progress": 100, "status": "completed", "result": res}
            return res
        except Exception as e:
            video_status[video_id] = {"progress": 0, "status": "error", "error": str(e)}
            raise
        finally:
            if cap: cap.release()
            if out: out.release()
            cv2.destroyAllWindows()

    def _draw_overlay(self, img, loc, skates, ppl, veh, viol):
        color = (0, 0, 255) if loc["is_forbidden"] else (0, 255, 0)
        cv2.putText(img, f"Location: {loc['location_type']}", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
        cv2.putText(img, f"Skateboards: {len(skates)} | People: {len(ppl)}", (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 0), 2)
        if loc["stats"].get("total_vehicles", 0) > 0:
            cv2.putText(img, f"Vehicles nearby: {loc['stats']['total_vehicles']}", (10, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 165, 255), 2)
        if viol:
            cv2.putText(img, "VIOLATION!", (10, 130), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 3)

    def _empty_result(self, image):
        return {
            "skateboards": 0, "persons": 0, "vehicles": 0, "violation": False,
            "violation_reason": "Модель не загружена", "confidence_avg": 0,
            "location_type": "unknown", "location_details": {}, "location_stats": {},
            "location_display_text": "❌ Модель не загружена", "annotated_image": image
        }

# Инициализация сервиса
yolo_service = YOLOService()