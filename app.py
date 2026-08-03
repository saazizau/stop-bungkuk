import logging
import base64
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel

from src.utils import load_config
from src.config import AppConfig
from src.detector import PostureDetector

# --- Setup Logging ---
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("stop-bungkuk")

# --- Load Config & Init ---
raw_config = load_config("configs/config.yaml")
config = AppConfig(**raw_config)
detector = PostureDetector(config)

# --- FastAPI App ---
app = FastAPI(title="Stop Bungkuk API")

# Sajikan folder web/ sebagai file statis (CSS, JS)
app.mount("/static", StaticFiles(directory="web"), name="static")

# --- Schema untuk request body dari browser ---
class FramePayload(BaseModel):
    image: str  # Data base64 URL dari canvas (e.g. "data:image/jpeg;base64,...")
    threshold: float | None = None

# --- Endpoint: Halaman utama ---
@app.get("/")
def serve_index() -> FileResponse:
    return FileResponse("web/index.html")

# --- Endpoint: Service Worker ---
@app.get("/sw.js")
def serve_sw() -> FileResponse:
    return FileResponse("web/sw.js")

# --- Endpoint: Analisis frame dari browser (Server-side Inference) ---
@app.post("/api/analyze")
def analyze_frame(payload: FramePayload) -> dict:
    try:
        # Format payload.image biasanya: "data:image/jpeg;base64,xxxx"
        if "," in payload.image:
            header, encoded = payload.image.split(",", 1)
        else:
            encoded = payload.image
            
        image_bytes = base64.b64decode(encoded)
    except Exception as e:
        logger.error(f"Gagal melakukan decode base64: {e}")
        raise HTTPException(status_code=400, detail="Format base64 tidak valid")

    # Update threshold jika dikirim oleh browser
    if payload.threshold is not None:
        detector.threshold_angle = payload.threshold

    # Jalankan inferensi pose di server
    analysis = detector.process_frame(image_bytes)
    
    # Log singkat status deteksi
    logger.info(f"Analisis frame selesai — Status: {analysis['status']}, Sudut: {analysis['angle']:.1f}°")
    
    return analysis

# --- Entry point ---
if __name__ == "__main__":
    uvicorn.run(
        "app:app",
        host=config.web.host,
        port=config.web.port,
        reload=True    # Auto-reload saat file berubah (mode dev)
    )
