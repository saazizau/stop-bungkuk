import logging
import time
from typing import Any, Dict
from plyer import notification
from src.config import ThresholdsConfig

logger = logging.getLogger("stop-bungkuk.notifier")

class PostureNotifier:
    def __init__(self, config: ThresholdsConfig) -> None:
        self.config = config
        
        # Ambil nilai cooldown dari konfigurasi
        self.cooldown_secs: float = config.cooldown_secs
        self.last_notif_time: float = 0.0
        self.supported: bool = True
        
        logger.info(f"Notifier diaktifkan dengan cooldown: {self.cooldown_secs} detik.")

    def send_notification(self) -> None:
        """Mengirim notifikasi desktop jika waktu cooldown telah terlampaui."""
        if not self.supported:
            return

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
                self.supported = False
                logger.warning(
                    f"Notifikasi desktop tidak didukung di lingkungan ini (misal: Docker headless): {e}. "
                    "Notifikasi desktop lokal akan dinonaktifkan. Notifikasi browser di frontend tetap berjalan."
                )


