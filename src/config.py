from pydantic import BaseModel, Field

class CameraConfig(BaseModel):
    device_index: int = Field(default=0, ge=0)
    width: int = Field(default=640, gt=0)
    height: int = Field(default=480, gt=0)

class ThresholdsConfig(BaseModel):
    slouch_angle_limit: float = Field(default=70.0, ge=0.0, le=180.0)
    consecutive_frames: int = Field(default=10, gt=0)
    cooldown_secs: float = Field(default=7.0, ge=0.0)

class LoggingConfig(BaseModel):
    level: str = Field(default="INFO")

class WebConfig(BaseModel):
    host: str = Field(default="127.0.0.1")
    port: int = Field(default=8000, gt=0, le=65535)

class AppConfig(BaseModel):
    """Skema konfigurasi utama aplikasi."""
    camera: CameraConfig
    thresholds: ThresholdsConfig
    logging: LoggingConfig
    web: WebConfig     
