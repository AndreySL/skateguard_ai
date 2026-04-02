import uvicorn
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from config import STATIC_DIR, WEB_DIR, CORS_ORIGINS

app = FastAPI(title="SkateGuard AI")

# Middleware
app.add_middleware(CORSMiddleware, allow_origins=CORS_ORIGINS, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# Статика
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
app.mount("/web", StaticFiles(directory=WEB_DIR), name="web")

# Подключение роутеров
from routers.base_router import router as base_router
from routers.media_router import router as media_router
from routers.history_router import router as history_router
from routers.report_router import router as report_router

app.include_router(base_router)
app.include_router(media_router)
app.include_router(history_router)
app.include_router(report_router)

if __name__ == "__main__":
    print("=" * 70)
    print(f"🌐 Сервер: http://localhost:8000")
    print("=" * 70)
    uvicorn.run(app, host="0.0.0.0", port=8000)