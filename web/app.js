// ===== DOM Elements =====
const videoEl = document.getElementById('webcam');
const canvasEl = document.getElementById('output-canvas');
const ctx = canvasEl.getContext('2d');
const postureStatus = document.getElementById('posture-status');
const statusCard = document.getElementById('status-card');
const angleValue = document.getElementById('angle-value');
const alertCounter = document.getElementById('alert-counter');
const thresholdSlider = document.getElementById('threshold-slider');
const thresholdDisplay = document.getElementById('threshold-display');
const cameraOverlay = document.getElementById('camera-overlay-text');

// ===== State =====
let slouchThreshold = parseFloat(thresholdSlider.value);
let alertCount = 0;
let isAnalyzing = false;
let lastStatus = "GOOD";

// ===== Slider: Update threshold secara live =====
thresholdSlider.addEventListener('input', () => {
    slouchThreshold = parseFloat(thresholdSlider.value);
    thresholdDisplay.textContent = thresholdSlider.value;
});

// ===== Inisialisasi Kamera =====
async function setupCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480 },
            audio: false
        });
        videoEl.srcObject = stream;
        return new Promise((resolve) => {
            videoEl.onloadedmetadata = () => {
                resolve(videoEl);
            };
        });
    } catch (err) {
        console.error("Gagal mengakses webcam:", err);
        cameraOverlay.textContent = "Webcam access denied";
        throw err;
    }
}

// ===== Gambar Segitiga + Titik berdasarkan data server =====
function drawPose(landmarks, color) {
    if (!landmarks) return;

    const W = canvasEl.width;
    const H = canvasEl.height;

    // Denormalisasi koordinat dari server (0..1) ke pixel canvas
    const A = { x: landmarks.nose.x * W, y: landmarks.nose.y * H };
    const B = { x: landmarks.left_shoulder.x * W, y: landmarks.left_shoulder.y * H };
    const C = { x: landmarks.right_shoulder.x * W, y: landmarks.right_shoulder.y * H };

    // Gambar Segitiga
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(A.x, A.y);
    ctx.lineTo(B.x, B.y);
    ctx.lineTo(C.x, C.y);
    ctx.closePath();
    ctx.stroke();

    // Gambar titik sendi
    [A, B, C].forEach(pt => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 6, 0, 2 * Math.PI);
        ctx.fillStyle = '#ef4444';
        ctx.fill();
    });
}

// ===== Update Dashboard UI =====
function updateUI(status, angle, isSlouching) {
    angleValue.textContent = `${angle.toFixed(1)}°`;

    if (status === "NO_POSE") {
        postureStatus.textContent = 'No Pose';
        postureStatus.className = 'status-text';
        statusCard.className = 'card';
        return;
    }

    if (isSlouching) {
        postureStatus.textContent = 'SLOUCHING';
        postureStatus.className = 'status-text bad';
        statusCard.className = 'card bad';
    } else {
        postureStatus.textContent = 'Good';
        postureStatus.className = 'status-text good';
        statusCard.className = 'card good';
    }
}

// ===== Ambil Frame, Kirim ke Server, & Render Hasil =====
async function captureAndAnalyze() {
    if (isAnalyzing) return;
    isAnalyzing = true;

    // Pastikan ukuran canvas sinkron dengan video
    if (canvasEl.width !== videoEl.videoWidth || canvasEl.height !== videoEl.videoHeight) {
        canvasEl.width = videoEl.videoWidth;
        canvasEl.height = videoEl.videoHeight;
    }

    // Buat canvas offscreen/sementara untuk capture frame ke JPEG
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvasEl.width;
    tempCanvas.height = canvasEl.height;
    const tempCtx = tempCanvas.getContext('2d');
    
    // Gambar frame dari video ke temp canvas
    tempCtx.drawImage(videoEl, 0, 0, tempCanvas.width, tempCanvas.height);
    
    // Convert ke base64 (JPEG kualitas 0.6 agar size kecil & transfer cepat)
    const base64Frame = tempCanvas.toDataURL('image/jpeg', 0.6);

    try {
        const res = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                image: base64Frame,
                threshold: slouchThreshold
            })
        });

        if (res.ok) {
            const data = await res.json();
            
            // Bersihkan canvas utama sebelum digambar ulang
            ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
            
            // Sembunyikan text "Starting camera..."
            cameraOverlay.style.opacity = '0';

            const color = data.is_slouching ? '#ef4444' : '#22c55e';
            
            // Render visualisasi pose
            if (data.landmarks) {
                drawPose(data.landmarks, color);
            }
            
            // Update Dashboard
            updateUI(data.status, data.angle, data.is_slouching);

            // Perbarui counter notifikasi jika terdeteksi perubahan dari tidak slouching ke slouching
            if (data.is_slouching && lastStatus !== "SLOUCHING") {
                alertCount++;
                alertCounter.textContent = alertCount;
            }
            lastStatus = data.status;
        }
    } catch (err) {
        console.warn("Koneksi API Gagal:", err);
    } finally {
        isAnalyzing = false;
    }
}

// ===== Entry Point =====
async function main() {
    await setupCamera();
    videoEl.play();
    
    // Kirim frame ke server setiap 150ms (~6-7 FPS)
    // Cukup responsif dan tidak membebani network / CPU server
    setInterval(captureAndAnalyze, 150);
}

main();
