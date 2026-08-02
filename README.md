# 🪑 Stop Bungkuk

A real-time posture monitoring application using a webcam, MediaPipe, Python, and FastAPI.
Built as an ML Engineering learning project by **Sabrina**.

---

## 📖 Background

Sitting for long hours without proper posture can lead to chronic back pain.
**Stop Bungkuk** acts as a personal *posture guard* that actively monitors your body position
and sends a desktop notification when it detects slouching — before your back starts complaining.

> **Detection Approach**: The app calculates the angle of a triangle formed by three anatomical keypoints —
> **Nose (A)**, **Left Shoulder (B)**, and **Right Shoulder (C)** — using MediaPipe Pose.
> If the angle at the Nose vertex exceeds the configured `slouch_angle_limit`, the posture is flagged as slouching.

---

## ✨ Features (v2 — Server-side Inference Web App)

- 📸 **Webcam Streaming**: Native browser webcam capture via HTML5 `getUserMedia`.
- 🧠 **Server-Side ML Inference**: MediaPipe Python running on the FastAPI backend (Fast, scalable, and customizable).
- 📐 **Angle-Based Logic**: Real-time slouch detection based on geometric angles (Nose-Shoulder Triangle).
- 🎛️ **Live Threshold Tuning**: Interactive UI slider to adjust the slouch angle threshold on the fly.
- 🔔 **Desktop Notification**: Automatic alerts sent to the OS via Python `plyer` with a *cooldown* mechanism to prevent spam.
- 📊 **Structured Logging**: Complete logging of frame analysis results and status transitions.
- ⚙️ **Configuration-Driven**: Core settings loaded from `configs/config.yaml`.
- 🛡️ **Pydantic Validation**: Strong typing and validation schema for configuration file parsing.

---

## 🏗️ Project Architecture

```
stop-bungkuk/
├── app.py                  # FastAPI server & endpoints (/api/analyze)
├── configs/
│   └── config.yaml         # Centralized configuration file
├── src/
│   ├── __init__.py
│   ├── config.py           # Configuration validation schema (Pydantic)
│   ├── detector.py         # PostureDetector (MediaPipe Python + OpenCV decoding)
│   ├── notifier.py         # Desktop notification module (plyer)
│   └── utils.py            # Utility functions (load_config, calculate_angle)
├── web/                    # Frontend files
│   ├── index.html          # Web UI dashboard structure
│   ├── style.css           # Modern glassy UI stylesheet
│   └── app.js              # Camera capture frame loop & API caller
├── notebooks/              # Exploration and experiments
├── requirements.txt
└── .gitignore
```

---

## ⚙️ Configuration (`configs/config.yaml`)

All application behavior is controlled from this single file:

```yaml
camera:
  device_index: 0      # Webcam index
  width: 640
  height: 480

thresholds:
  slouch_angle_limit: 70.0   # Angle threshold (degrees) — above this value = slouching
  consecutive_frames: 30     # Number of consecutive slouch frames before a notification is sent
  cooldown_secs: 7.0         # Minimum interval between notifications (seconds)

logging:
  level: "INFO"

web:
  host: "127.0.0.1"
  port: 8000
```

---

## 🚀 Getting Started

### 1. Clone & Set Up Virtual Environment

```bash
git clone <repo-url>
cd stop-bungkuk

python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Run the Server

```bash
python app.py
```

Setelah server berjalan, buka browser di **`http://127.0.0.1:8000`** untuk mengaktifkan monitoring.

---

## 🗺️ Roadmap

This project is developed incrementally following an end-to-end MLOps workflow:

| Phase | Technology | Status |
|-------|------------|--------|
| **1. Local Detection (CLI)** | Python, MediaPipe, OpenCV, Plyer | ✅ Done |
| **2. Web App Dashboard** | HTML, CSS, Vanilla JS | ✅ Done |
| **3. Serving / Server-side API** | FastAPI, Uvicorn, MediaPipe Python | ✅ Done |
| **4. Containerization** | Docker, Docker Compose | 📋 Planned |
| **5. Experiment Tracking** | MLflow | 📋 Planned |
| **6. Monitoring** | Evidently AI | 📋 Planned |

---

## 🧠 How Detection Works (Server-side Pipeline)

```
Browser (web/app.js)                     FastAPI (app.py)
   │                                           │
   ├── Capture Webcam Frame                    │
   ├── Convert to JPEG & Base64                │
   ├── POST /api/analyze (JSON) ─────────────► │
   │                                           ├── base64 decode to bytes
   │                                           ├── cv2 image decoding
   │                                           ├── MediaPipe Pose inference
   │                                           ├── Calculate Nose-Shoulder Angle
   │                                           ├── Evaluate consecutive frames
   │                                           ├── Trigger desktop notification
   │    JSON (landmarks, angle, status)        │
   │ ◄─────────────────────────────────────────┤
   ▼
Render landmarks to Canvas
Update Dashboard UI
```

---

## 📦 Main Dependencies

| Library | Version | Purpose |
|---------|---------|---------|
| `opencv-python` | >=4.8.0 | Image decoding from client base64 data |
| `mediapipe` | ==0.10.14 | Pose detection & body landmark extraction |
| `pydantic` | >=2.0 | Configuration schema validation |
| `pyyaml` | >=6.0 | YAML file parsing |
| `plyer` | >=2.1 | Cross-platform desktop notifications |
| `fastapi` | >=0.110.0 | High performance web API framework |
| `uvicorn` | >=0.29.0 | ASGI web server |

---

## 📝 Developer Notes

- **Zero-Inference Client**: Browser client does not load any heavy tensorflow/mediapipe models. This reduces device CPU usage and battery drain significantly.
- **Dynamic Parameters**: Slouch threshold changes in the UI slider are passed dynamically in each frame request header, allowing real-time tuning.
- **Type hints** are used throughout all Python files for better readability and IDE support.

---

*Built with ☕ and a passion for learning MLOps by Sabrina.*
