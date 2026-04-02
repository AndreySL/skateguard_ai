from fastapi import APIRouter
from fastapi.responses import JSONResponse
from utils.history import load_history, save_history

router = APIRouter()

@router.get("/history")
async def get_history(limit: int = 50):
    return JSONResponse(load_history()[:limit])

@router.post("/clear_history")
async def clear_history():
    save_history([])
    return JSONResponse({"success": True})