import logging
import math
import yaml
from typing import Any, Dict, Tuple

# Menginisialisasi logging terstruktur
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("stop-bungkuk")

def load_config(config_path: str) -> Dict[str, Any]:
    """Membaca file konfigurasi YAML secara aman."""
    try:
        with open(config_path, 'r') as file:
            config = yaml.safe_load(file)
            logger.info(f"Konfigurasi berhasil dimuat dari: {config_path}")
            return config
    except Exception as e:
        logger.error(f"Gagal memuat konfigurasi dari {config_path}: {e}")
        raise e

def calculate_angle(
    a: Tuple[float, float], 
    b: Tuple[float, float], 
    c: Tuple[float, float]
) -> float:
    """Menghitung sudut (derajat) di titik B dari tiga titik koordinat A, B, C.
    
    Titik B bertindak sebagai sudut/vertex utama (misal: Hidung).
    """
    # Vektor BA
    ba_x = a[0] - b[0]
    ba_y = a[1] - b[1]
    
    # Vektor BC
    bc_x = c[0] - b[0]
    bc_y = c[1] - b[1]
    
    # Dot product dan Magnitudo
    dot_product = ba_x * bc_x + ba_y * bc_y
    mag_ba = math.sqrt(ba_x**2 + ba_y**2)
    mag_bc = math.sqrt(bc_x**2 + bc_y**2)
    
    if mag_ba == 0.0 or mag_bc == 0.0:
        return 0.0
        
    cosine_angle = dot_product / (mag_ba * mag_bc)
    cosine_angle = max(-1.0, min(1.0, cosine_angle))
    
    angle = math.degrees(math.acos(cosine_angle))
    return angle
