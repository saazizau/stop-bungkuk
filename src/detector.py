import cv2
import mediapipe as mp
import logging
from typing import Any, Dict
from src.config import AppConfig
from src.notifier import PostureNotifier
from src.utils import calculate_angle

logger = logging.getLogger("stop-bungkuk.detector")

class PostureDetector:
    def __init__(self, config: AppConfig) -> None:
        """Inisialisasi detektor postur dengan konfigurasi."""
        self.config = config
        
        # Konfigurasi Kamera
        self.device_index: int = config.camera.device_index
        self.width: int = config.camera.width
        self.height: int = config.camera.height
        
        # Konfigurasi Thresholds
        self.threshold_angle: float = config.thresholds.slouch_angle_limit
        self.alert_frame_limit: int = config.thresholds.consecutive_frames
        
        # Inisialisasi Notifier
        self.notifier = PostureNotifier(config.thresholds)
        
        # Inisialisasi MediaPipe Pose
        self.mp_pose = mp.solutions.pose
        self.pose = self.mp_pose.Pose(
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        
        # Counter
        self.slouch_frame_count: int = 0
        
        logger.info("PostureDetector berhasil dikonfigurasi.")

    def process_frame(self, image_bytes: bytes) -> Dict[str, Any]:
        """Memproses satu frame gambar (bytes) dari web API dan mengembalikan analisis posturnya."""
        import numpy as np
        # Decode bytes ke OpenCV image
        nparr = np.frombuffer(image_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if frame is None:
            return {"status": "NO_FRAME", "angle": 0.0, "is_slouching": False, "landmarks": None}

        # Convert ke RGB untuk MediaPipe
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.pose.process(rgb_frame)
        
        angle = 0.0
        is_slouching = False
        landmarks_data = None
        status = "GOOD"

        if results.pose_landmarks:
            landmarks = results.pose_landmarks.landmark
            
            # Ambil Koordinat Hidung, Bahu Kiri, Bahu Kanan
            nose = landmarks[self.mp_pose.PoseLandmark.NOSE]
            left_shoulder = landmarks[self.mp_pose.PoseLandmark.LEFT_SHOULDER]
            right_shoulder = landmarks[self.mp_pose.PoseLandmark.RIGHT_SHOULDER]
            
            A = (nose.x, nose.y)
            B = (left_shoulder.x, left_shoulder.y)
            C = (right_shoulder.x, right_shoulder.y)
            
            # Hitung Sudut
            angle = calculate_angle(B, A, C)
            
            # Status Bungkuk
            if angle >= self.threshold_angle:
                self.slouch_frame_count += 1
            else:
                self.slouch_frame_count = 0
                
            is_slouching = self.slouch_frame_count >= self.alert_frame_limit
            status = "SLOUCHING" if is_slouching else "GOOD"
            
            # Notifikasi
            if is_slouching:
                self.notifier.send_notification()

            # Return Landmark
            landmarks_data = {
                "nose": {"x": nose.x, "y": nose.y},
                "left_shoulder": {"x": left_shoulder.x, "y": left_shoulder.y},
                "right_shoulder": {"x": right_shoulder.x, "y": right_shoulder.y}
            }
        else:
            status = "NO_POSE"
            self.slouch_frame_count = 0

        return {
            "status": status,
            "angle": angle,
            "is_slouching": is_slouching,
            "landmarks": landmarks_data
        }
