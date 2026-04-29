const video = document.getElementById('video');
const scanBtn = document.getElementById('scan-btn');
const status = document.getElementById('status');
const gallery = document.getElementById('gallery');
const scanner = document.getElementById('scanner');

const MODEL_URL = 'https://cdn.jsdelivr.net/gh/cgarciagl/face-api.js@0.22.2/weights';

async function init() {
    try {
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);
        status.innerText = "सिस्टम तैयार है! कैमरा चालू हो रहा है...";
        startCamera();
    } catch (err) {
        status.innerText = "लोड होने में समस्या: " + err.message;
    }
}

function startCamera() {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
        .then(stream => {
            video.srcObject = stream;
            scanBtn.disabled = false;
            status.innerText = "तैयार! अपनी फोटो खोजने के लिए बटन दबाएं।";
        })
        .catch(err => {
            status.innerText = "कैमरा परमिशन दें!";
        });
}

scanBtn.addEventListener('click', async () => {
    // 1. Snapshot Capture
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);

    // 2. Stop Camera
    const stream = video.srcObject;
    if (stream) stream.getTracks().forEach(track => track.stop());

    // 3. Replace Video with Captured Image
    const capturedImg = document.createElement('img');
    capturedImg.src = canvas.toDataURL('image/png');
    capturedImg.style.width = '100%';
    video.parentNode.replaceChild(capturedImg, video);

    scanBtn.disabled = true;
    scanner.style.display = 'block'; 
    status.innerText = "फोटो मिल गई! आपकी यादें खोजी जा रही हैं...";
    gallery.innerHTML = '';
    
    try {
        const detection = await faceapi.detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();
        
        if (!detection) {
            status.innerText = "चेहरा साफ नहीं दिखा। कृपया रिफ्रेश करके फिर से कोशिश करें।";
            scanner.style.display = 'none';
            return;
        }

        const userDescriptor = detection.descriptor;
        
        // JADU: Ab hum seedha data.json fetch karenge (no more 700 photo download)
        const response = await fetch('data.json');
        const database = await response.json();
        
        let foundCount = 0;
        const MAX_DISTANCE = 0.45; // Accuracy fix

        for (const entry of database) {
            let isMatch = false;
            // Har photo ke andar ke sabhi faces se match karna
            for (const faceData of entry.faces) {
                const distance = faceapi.euclideanDistance(userDescriptor, new Float32Array(faceData));
                if (distance < MAX_DISTANCE) {
                    isMatch = true;
                    break;
                }
            }

            if (isMatch) {
                // Direct high-speed viewing link
                const imgUrl = `https://drive.google.com/thumbnail?id=${entry.id}&sz=w800`;
                const downloadUrl = `https://drive.google.com/uc?export=view&id=${entry.id}`;
                
                const imgContainer = document.createElement('div');
                imgContainer.className = 'photo-card';
                imgContainer.innerHTML = `
                    <img src="${imgUrl}" alt="Photo">
                    <a href="${downloadUrl}" class="download-btn" target="_blank">डाउनलोड एचडी</a>
                `;
                gallery.appendChild(imgContainer);
                foundCount++;
            }
        }
        status.innerText = foundCount > 0 ? `मिल गई! आपकी ${foundCount} फोटो मिलीं।` : "एल्बम में आपकी कोई फोटो नहीं मिली।";
    } catch (error) {
        status.innerText = "तकनीकी समस्या! कृपया रिफ्रेश करें।";
    } finally {
        scanner.style.display = 'none'; 
    }
});

init();
