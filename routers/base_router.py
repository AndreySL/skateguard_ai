from fastapi import APIRouter
from fastapi.responses import HTMLResponse, JSONResponse
from pathlib import Path
from services.yolo_service import yolo_service

router = APIRouter()

@router.get("/", response_class=HTMLResponse)
async def serve_frontend():
    html_path = Path(__file__).parent.parent / "index.html"
    if html_path.exists():
        return HTMLResponse(content=html_path.read_text(encoding='utf-8'))
    return HTMLResponse(content="<h1>index.html не найден</h1>", status_code=404)

@router.get("/health")
async def health_check():
    return JSONResponse({"status": "ok", "model_loaded": yolo_service.model is not None})