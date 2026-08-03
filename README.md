---
title: Stop Bungkuk
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 8000
pinned: false
---

# Stop Bungkuk

A real-time posture monitoring application using a webcam, MediaPipe, Python, and FastAPI. Built as an ML Engineering learning project.

---

## Background

Sitting for long hours without proper posture can lead to chronic back pain. **Stop Bungkuk** acts as a lightweight posture guard that actively monitors your body position and sends a desktop notification when it detects slouching.

### Detection Logic
The application calculates the angle of a triangle formed by three anatomical keypoints:
* **Nose (A)**
* **Left Shoulder (B)**
* **Right Shoulder (C)**

Using MediaPipe Pose, it computes the angle at the Nose vertex. If this angle exceeds the configured `slouch_angle_limit` for a set number of consecutive frames, the posture is flagged as slouching, and a notification is dispatched.

---

## Features

* **Webcam Streaming**: Native browser webcam capture via HTML5 `getUserMedia`.
* **Server-Side Inference**: MediaPipe Python runs on the FastAPI backend, reducing CPU usage on the client side.
* **Live Threshold Tuning**: Interactive UI slider to adjust the slouch angle threshold in real time.
* **Desktop Notifications**: Automatic alerts sent to the OS via Python `plyer` with a built-in cooldown mechanism to prevent spam.
* **Configuration Validation**: Robust configuration schema validation using Pydantic.
* **Docker Support**: Containerized environment for simplified deployment and dependency isolation.

---

## Project Structure

```
stop-bungkuk/
├── app.py                  # FastAPI server & endpoints (/api/analyze)
├── caption.md              # LinkedIn post caption draft
├── configs/
│   └── config.yaml         # Centralized configuration file
├── src/
│   ├── __init__.py
│   ├── config.py           # Configuration validation schema (Pydantic)
│   ├── detector.py         # PostureDetector (MediaPipe Pose extraction)
│   ├── notifier.py         # Desktop notification module (plyer)
│   └── utils.py            # Utility functions (load_config, calculate_angle)
├── web/                    # Frontend assets
│   ├── index.html          # Web UI dashboard
│   ├── style.css           # Modern dashboard styles
│   └── app.js              # Camera capture frame loop & API client
├── notebooks/              # Exploration and experiments
├── Dockerfile              # Docker container setup
├── requirements.txt
└── .gitignore
```

---

## Configuration (`configs/config.yaml`)

Application behavior is managed through a single YAML file:

```yaml
camera:
  device_index: 0            # Webcam index
  width: 640
  height: 480

thresholds:
  slouch_angle_limit: 70.0   # Angle threshold (degrees) — above this value = slouching
  consecutive_frames: 10     # Number of consecutive slouch frames before a notification is sent
  cooldown_secs: 7.0         # Minimum interval between notifications (seconds)

logging:
  level: "INFO"

web:
  host: "127.0.0.1"
  port: 7860
```

---

## Getting Started

### Local Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/saazizau/stop-bungkuk.git
   cd stop-bungkuk
   ```

2. **Set up virtual environment:**
   ```bash
   python -m venv .venv
   # Windows:
   .venv\Scripts\activate
   # macOS/Linux:
   source .venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the server:**
   ```bash
   python app.py
   ```
   Open `http://127.0.0.1:7860` in your web browser.

---

### Running with Docker

1. **Build the Docker image:**
   ```bash
   docker build -t stop-bungkuk:latest .
   ```

2. **Run the container:**
   ```bash
   docker run -p 7860:7860 stop-bungkuk:latest
   ```
   Access the application at `http://localhost:7860`.

---

## Technical Details

### Server-Side Pipeline

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

### Main Dependencies

* **`opencv-python`**: Image decoding from client base64 data.
* **`mediapipe`**: Pose detection and body landmark extraction.
* **`pydantic`**: Configuration schema validation.
* **`pyyaml`**: YAML file parsing.
* **`plyer`**: Cross-platform desktop notifications.
* **`fastapi`**: Web API framework.
* **`uvicorn`**: ASGI web server.
