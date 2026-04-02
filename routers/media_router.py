import os
import uuid
import threading
from datetime import datetime
from pathlib import Path
import cv2
import numpy as np
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from config import RESULTS_DIR, UPLOAD_DIR, VIDEO_RESULTS_DIR
from services.yolo_service import yolo_service, video_status
from utils.history import add_to_history

router = APIRouter()

@router.post("/process_image")
async def process_image(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        img = cv2.imdecode(np.frombuffer(contents, np.uint8), cv2.IMREAD_COLOR)
        if img is None: 
            raise HTTPException(400, "Не удалось декодировать изображение")

        result = yolo_service.process_image(img)
        
        # Сохраняем картинку отдельно
        unique_name = f"{uuid.uuid4()}.jpg"
        cv2.imwrite(os.path.join(RESULTS_DIR, unique_name), result["annotated_image"])

        add_to_history({
            "id": str(uuid.uuid4()), 
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "type": "image", "name": file.filename, 
            "skateboards_detected": result["skateboards"],
            "persons_detected": result["persons"], 
            "vehicles_detected": result["vehicles"],
            "violation": result["violation"], 
            "violation_reason": result["violation_reason"],
            "location_type": result["location_type"], 
            "location_display_text": result["location_display_text"],
            "confidence": result["confidence_avg"]
        })

        # ВАЖНО: Не используем **result, чтобы не попробовать сериализовать NumPy массив в JSON
        return JSONResponse({
            "success": True,
            "type": "image",
            "skateboards": result["skateboards"],
            "persons": result["persons"],
            "vehicles": result["vehicles"],
            "violation": result["violation"],
            "violation_reason": result["violation_reason"],
            "location_type": result["location_type"],
            "location_display_text": result["location_display_text"],
            "location_details": result["location_details"],
            "location_stats": result["location_stats"],
            "confidence": result["confidence_avg"],
            "result_url": f"/static/results/{unique_name}"
        })
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc() 
        raise HTTPException(500, str(e))
    
@router.post("/process_video")
async def process_video(file: UploadFile = File(...)):
    video_id = str(uuid.uuid4())
    video_ext = Path(file.filename).suffix or '.mp4'
    temp_path = os.path.join(UPLOAD_DIR, f"input_{video_id}{video_ext}")
    out_path = os.path.join(VIDEO_RESULTS_DIR, f"result_{video_id}.mp4")

    try:
        with open(temp_path, "wb") as f:
            f.write(await file.read())

        video_status[video_id] = {"progress": 0, "status": "starting"}

        def bg_process():
            try:
                res = yolo_service.process_video(temp_path, out_path, video_id)
                add_to_history({
                    "id": video_id, "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    "type": "video", "name": file.filename, "duration": res["duration"],
                    "total_frames": res["total_frames"], "violation": res["has_violation"],
                    "violation_percentage": res["violation_percentage"],
                    "avg_skateboards": res["avg_skateboards"], "avg_persons": res["avg_persons"]
                })
                if os.path.exists(temp_path): os.remove(temp_path)
            except Exception as e:
                video_status[video_id].update({"status": "error", "error": str(e)})

        threading.Thread(target=bg_process, daemon=True).start()
        return JSONResponse({"success": True, "video_id": video_id, "message": "Видео принято в обработку"})
    except Exception as e:
        if os.path.exists(temp_path): os.remove(temp_path)
        raise HTTPException(500, str(e))

@router.get("/video_status/{video_id}")
async def get_status(video_id: str):
    if video_id not in video_status:
        return JSONResponse({"status": "not_found"})
    
    status = video_status[video_id]
    if status["status"] == "completed" and "result" in status:
        return JSONResponse({
            "status": "completed", "progress": 100,
            "result": {**status["result"], "type": "video", "result_url": f"/static/video_results/result_{video_id}.mp4"}
        })
    if status["status"] == "error":
        return JSONResponse({"status": "error", "error": status.get("error", "Неизвестно")})
    
    return JSONResponse({"status": "processing", "progress": status.get("progress", 0)})