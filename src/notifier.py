import logging
import time
from typing import Any, Dict
from plyer import notification
from src.config import ThresholdsConfig

logger = logging.getLogger("stop-bungkuk.notifier")

class PostureNotifier:
    def __init__(self, config: ThresholdsConfig) -> None:
        """Inisialisasi sistem notifikasi dengan konfigurasi."""
        self.config = config
        
        # Ambil nilai cooldown dari konfigurasi
        self.cooldown_secs: float = config.cooldown_secs
        self.last_notif_time: float = 0.0
        
        logger.info(f"Notifier diaktifkan dengan cooldown: {self.cooldown_secs} detik.")

    def send_notification(self) -> None:
        """Mengirim notifikasi desktop jika waktu cooldown telah terlampaui."""
        current_time = time.time()
        
        if current_time - self.last_notif_time > self.cooldown_secs:
            try:
                notification.notify(
                    title="Peringatan Postur!",
                    message="Ayo tegakkan punggungmu, Sabrina!",
                    app_name="Stop Bungkuk",
                    timeout=3
                )
                self.last_notif_time = current_time
                logger.info("Notifikasi desktop dikirim.")
            except Exception as e:
                logger.error(f"Gagal mengirim notifikasi desktop: {e}")

