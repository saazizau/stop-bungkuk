// ===== DOM Elements =====
const videoEl = document.getElementById('webcam');
const canvasEl = document.getElementById('output-canvas');
const ctx = canvasEl.getContext('2d');
const postureStatus = document.getElementById('posture-status');
const statusCard = document.getElementById('status-card');
const statusDesc = document.getElementById('posture-desc');
const iconStatusContainer = document.querySelector('.icon-status');
const angleValue = document.getElementById('angle-value');
const angleBadge = document.getElementById('angle-badge');
const alertCounter = document.getElementById('alert-counter');
const thresholdSlider = document.getElementById('threshold-slider');
const thresholdDisplay = document.getElementById('threshold-display');
const cameraOverlay = document.getElementById('camera-overlay-text');

// ===== SVGs for Status Card =====
const SVG_CHECK = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="check-icon"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
const SVG_WARNING = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="warning-icon"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
const SVG_SEARCH = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="search-icon"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;

// ===== State =====
let slouchThreshold = parseFloat(thresholdSlider.value);
let alertCount = 0;
let isAnalyzing = false;
let lastStatus = "GOOD";

// Chart State
let alertsThisMinute = 0;
const chartLabels = [];
const chartData = [];
let alertsChart = null;

// Notification State
let lastNotificationTime = 0;
const COOLDOWN_SECS = 7.0;
let swRegistration = null;

// Shared AudioContext to bypass Chrome/Edge Autoplay Policies
let sharedAudioCtx = null;

function getAudioContext() {
    if (!sharedAudioCtx) {
        sharedAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (sharedAudioCtx.state === 'suspended') {
        sharedAudioCtx.resume();
    }
    return sharedAudioCtx;
}

// Bind interaction events to resume/unlock the AudioContext
['click', 'touchstart', 'mousedown', 'keydown'].forEach(event => {
    document.addEventListener(event, () => {
        try {
            getAudioContext();
        } catch (e) {
            // silent catch
        }
    }, { once: true });
});

function playAudioAlert() {
    try {
        const ctx = getAudioContext();
        if (!ctx || ctx.state === 'suspended') {
            console.warn("AudioContext is suspended. Click/interact with the page to enable sound.");
            return;
        }
        
        const playBeep = (time, frequency, duration, volume = 0.08) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.type = 'triangle'; // Richer sound than 'sine'
            osc.frequency.setValueAtTime(frequency, time);
            
            gain.gain.setValueAtTime(volume, time);
            gain.gain.setValueAtTime(volume, time + duration - 0.02);
            gain.gain.exponentialRampToValueAtTime(0.00001, time + duration);
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.start(time);
            osc.stop(time + duration);
        };

        const now = ctx.currentTime;
        // Urgent/triggering pattern: 3 rapid high-pitched digital beeps
        playBeep(now, 880, 0.08, 0.08);
        playBeep(now + 0.12, 880, 0.08, 0.08);
        playBeep(now + 0.24, 1100, 0.18, 0.06);
    } catch (e) {
        console.warn("Failed to play audio alert:", e);
    }
}

function updateNotificationUI() {
    const badge = document.getElementById('notif-status-badge');
    const desc = document.getElementById('notif-status-desc');
    const reqBtn = document.getElementById('btn-request-notif');
    
    if (!window.Notification) {
        badge.textContent = "Tidak Didukung";
        badge.className = "badge badge-warning";
        if (desc) desc.textContent = "Browser Anda tidak mendukung Notifikasi Desktop.";
        reqBtn.disabled = true;
        return;
    }
    
    if (Notification.permission === "granted") {
        badge.textContent = "Aktif";
        badge.className = "badge badge-ideal";
        if (desc) desc.textContent = "Notifikasi desktop aktif & suara aktif.";
        reqBtn.textContent = "Izin Diberikan";
        reqBtn.disabled = true;
    } else if (Notification.permission === "denied") {
        badge.textContent = "Diblokir";
        badge.className = "badge badge-warning";
        if (desc) desc.textContent = "Izin diblokir. Harap aktifkan lewat setelan browser.";
        reqBtn.textContent = "Izin Diblokir";
        reqBtn.disabled = true;
    } else {
        badge.textContent = "Butuh Akses";
        badge.className = "badge badge-warning";
        if (desc) desc.textContent = "Klik 'Minta Izin' untuk mengaktifkan notifikasi pop-up.";
        reqBtn.textContent = "Minta Izin";
        reqBtn.disabled = false;
    }
}

// Bind manual notification requests
document.getElementById('btn-request-notif').addEventListener('click', () => {
    if (window.Notification) {
        Notification.requestPermission().then(permission => {
            updateNotificationUI();
            if (permission === "granted") {
                // Play sound to trigger/warm up AudioContext
                playAudioAlert();
            }
        });
    }
});

// Bind test notifications
document.getElementById('btn-test-notif').addEventListener('click', () => {
    // Play audio alert
    playAudioAlert();
    
    // Get username
    const nameInput = document.getElementById('user-name-input');
    const userName = nameInput ? nameInput.value.trim() : "Teman";
    const nameToShow = userName || "Teman";

    // Show test desktop notification
    if (window.Notification) {
        const title = "Test Notifikasi!";
        const options = {
            body: `Halo ${nameToShow}! Notifikasi Stop Bungkuk berfungsi dengan baik!`,
            tag: "slouch-test-alert",
            renotify: true
        };

        if (Notification.permission === "granted") {
            if (swRegistration) {
                swRegistration.showNotification(title, options);
            } else {
                try {
                    new Notification(title, options);
                } catch (e) {
                    console.warn("Notification error:", e);
                }
            }
        } else if (Notification.permission === "default") {
            Notification.requestPermission().then(permission => {
                updateNotificationUI();
                if (permission === "granted") {
                    if (swRegistration) {
                        swRegistration.showNotification(title, options);
                    } else {
                        new Notification(title, options);
                    }
                }
            });
        } else {
            alert("Suara telah diputar! Notifikasi desktop diblokir di browser Anda. Harap aktifkan di pengaturan browser Anda jika ingin menerima notifikasi pop-up.");
        }
    } else {
        alert("Suara telah diputar! Browser Anda tidak mendukung notifikasi desktop.");
    }
});

function sendBrowserNotification() {
    const now = Date.now();
    if (now - lastNotificationTime > COOLDOWN_SECS * 1000) {
        // Play sound alert immediately
        playAudioAlert();

        if (Notification.permission === "granted") {
            const nameInput = document.getElementById('user-name-input');
            const userName = nameInput ? nameInput.value.trim() : "Teman";
            const nameToShow = userName || "Teman";

            const title = "Peringatan Postur!";
            const options = {
                body: `Ayo tegakkan punggungmu, ${nameToShow}!`,
                tag: "slouch-alert",
                renotify: true
            };

            if (swRegistration) {
                swRegistration.showNotification(title, options);
            } else {
                try {
                    new Notification(title, options);
                } catch (e) {
                    console.warn("Notification error:", e);
                }
            }
        }
        lastNotificationTime = now;
    }
}


// Initialize labels and data with zeros for the last 5 minutes as a starting baseline
const now = new Date();
for (let i = 4; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60000);
    const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    chartLabels.push(timeStr);
    chartData.push(0);
}

// ===== Slider Event =====
thresholdSlider.addEventListener('input', () => {
    slouchThreshold = parseFloat(thresholdSlider.value);
    thresholdDisplay.textContent = thresholdSlider.value;
});

// ===== Initialize Chart.js =====
function initChart() {
    const chartCtx = document.getElementById('alerts-chart').getContext('2d');
    alertsChart = new Chart(chartCtx, {
        type: 'line',
        data: {
            labels: chartLabels,
            datasets: [{
                label: 'Alerts per minute',
                data: chartData,
                borderColor: '#ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.05)',
                borderWidth: 2,
                pointRadius: 3,
                pointHoverRadius: 5,
                pointBackgroundColor: '#ef4444',
                pointBorderColor: '#09090b',
                pointBorderWidth: 1.5,
                tension: 0.25,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#18181b',
                    titleColor: '#fafafa',
                    bodyColor: '#a1a1aa',
                    borderColor: '#27272a',
                    borderWidth: 1,
                    displayColors: false,
                    titleFont: { family: 'Geist Mono', size: 10 },
                    bodyFont: { family: 'Geist Mono', size: 11 }
                }
            },
            scales: {
                x: {
                    grid: { color: '#27272a', drawTicks: false },
                    ticks: { color: '#71717a', font: { family: 'Geist Mono', size: 9 } }
                },
                y: {
                    grid: { color: '#27272a', drawTicks: false },
                    ticks: { color: '#71717a', font: { family: 'Geist Mono', size: 9 }, stepSize: 1 },
                    min: 0,
                    suggestedMax: 5
                }
            }
        }
    });
}

// ===== Minute Aggregator Interval =====
setInterval(() => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    chartLabels.push(timeStr);
    chartData.push(alertsThisMinute);
    
    if (chartLabels.length > 10) {
        chartLabels.shift();
        chartData.shift();
    }
    
    if (alertsChart) {
        alertsChart.update();
    }
    
    // Reset counter for next minute
    alertsThisMinute = 0;
}, 60000);

// ===== Camera Setup =====
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

// ===== Draw Pose landmarks =====
function drawPose(landmarks, color) {
    if (!landmarks) return;

    const W = canvasEl.width;
    const H = canvasEl.height;

    const A = { x: landmarks.nose.x * W, y: landmarks.nose.y * H };
    const B = { x: landmarks.left_shoulder.x * W, y: landmarks.left_shoulder.y * H };
    const C = { x: landmarks.right_shoulder.x * W, y: landmarks.right_shoulder.y * H };

    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(A.x, A.y);
    ctx.lineTo(B.x, B.y);
    ctx.lineTo(C.x, C.y);
    ctx.closePath();
    ctx.stroke();

    [A, B, C].forEach(pt => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 6, 0, 2 * Math.PI);
        ctx.fillStyle = '#ef4444';
        ctx.fill();
    });
}

// ===== Update UI Elements =====
function updateUI(status, angle, isSlouching) {
    angleValue.textContent = angle > 0 ? `${angle.toFixed(1)}°` : '—°';

    if (status === "NO_POSE") {
        postureStatus.textContent = 'No Pose';
        postureStatus.className = 'status-text';
        statusDesc.textContent = 'Pose tidak terdeteksi oleh kamera.';
        statusCard.className = 'card';
        iconStatusContainer.innerHTML = SVG_SEARCH;
        
        angleBadge.textContent = 'No Pose';
        angleBadge.className = 'badge badge-warning';
        return;
    }

    if (isSlouching) {
        postureStatus.textContent = 'SLOUCHING';
        postureStatus.className = 'status-text bad';
        statusDesc.textContent = 'Postur tubuhmu membungkuk. Tegakkan badan!';
        statusCard.className = 'card status-bad';
        iconStatusContainer.innerHTML = SVG_WARNING;
        
        angleBadge.textContent = 'Slouching';
        angleBadge.className = 'badge badge-warning';
    } else {
        postureStatus.textContent = 'Good';
        postureStatus.className = 'status-text good';
        statusDesc.textContent = 'Postur tubuhmu dalam kondisi baik.';
        statusCard.className = 'card status-good';
        iconStatusContainer.innerHTML = SVG_CHECK;
        
        angleBadge.textContent = 'Ideal';
        angleBadge.className = 'badge badge-ideal';
    }
}

// ===== Main Analysis Loop =====
async function captureAndAnalyze() {
    if (isAnalyzing) return;
    isAnalyzing = true;

    if (canvasEl.width !== videoEl.videoWidth || canvasEl.height !== videoEl.videoHeight) {
        canvasEl.width = videoEl.videoWidth;
        canvasEl.height = videoEl.videoHeight;
    }

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvasEl.width;
    tempCanvas.height = canvasEl.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(videoEl, 0, 0, tempCanvas.width, tempCanvas.height);
    
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
            
            ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
            cameraOverlay.style.opacity = '0';

            const color = data.is_slouching ? '#ef4444' : '#10b981';
            
            if (data.landmarks) {
                drawPose(data.landmarks, color);
            }
            
            updateUI(data.status, data.angle, data.is_slouching);

            if (data.is_slouching && lastStatus !== "SLOUCHING") {
                alertCount++;
                alertsThisMinute++;
                if (alertCounter) alertCounter.textContent = alertCount;
            }
            if (data.is_slouching) {
                sendBrowserNotification();
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
    initChart();
    
    // Register Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => {
                console.log('Service Worker registered with scope:', reg.scope);
                swRegistration = reg;
            })
            .catch(err => {
                console.error('Service Worker registration failed:', err);
            });
    }

    // Update permission status UI at startup
    updateNotificationUI();
    
    // Request browser notification permission (will update UI when resolved or on interaction)
    if (window.Notification && Notification.permission !== "granted" && Notification.permission !== "denied") {
        Notification.requestPermission().then(() => {
            updateNotificationUI();
        });
    }
    
    await setupCamera();
    videoEl.play();
    setInterval(captureAndAnalyze, 150);
}

main();
