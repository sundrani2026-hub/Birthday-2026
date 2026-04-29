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
        status.innerText = "कैमरा चालू हो रहा है...";
        startCamera();
    } catch (err) {
        status.innerText = "सिस्टम लोड होने में समस्या: " + err.message;
    }
}

function startCamera() {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
        .then(stream => {
            video.srcObject = stream;
            scanBtn.disabled = false;
            status.innerText = "तैयार! अपनी फोटो खोजने के लिए स्कैन बटन दबाएं।";
        })
        .catch(err => {
            status.innerText = "कैमरा की अनुमति नहीं मिली! कृपया परमिशन दें।";
        });
}

scanBtn.addEventListener('click', async () => {
    // 1. Snapshot
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // 2. Stop Camera
    const stream = video.srcObject;
    if (stream) {
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
    }

    // 3. Show Captured Image
    const capturedImg = document.createElement('img');
    capturedImg.src = canvas.toDataURL('image/png');
    capturedImg.style.width = '100%';
    capturedImg.style.display = 'block';
    video.parentNode.replaceChild(capturedImg, video);

    scanBtn.disabled = true;
    scanner.style.display = 'block'; 
    status.innerText = "📸 फोटो क्लिक हो गई! आपकी पुरानी फोटो खोजी जा रही हैं... (कृपया कुछ सेकंड प्रतीक्षा करें)";
    gallery.innerHTML = '';
    
    try {
        const detection = await faceapi.detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();
        
        if (!detection) {
            status.innerText = "चेहरा साफ नहीं दिखा। पेज रिफ्रेश करें और फिर से कोशिश करें!";
            scanner.style.display = 'none';
            return;
        }

        const userDescriptor = detection.descriptor;
        
        const response = await fetch('photos%20link.txt');
        const textData = await response.text();
        
        const regex = /\/d\/([a-zA-Z0-9_-]+)\/view/g;
        let match;
        const photoIds = [];
        while ((match = regex.exec(textData)) !== null) {
            if (!photoIds.includes(match[1])) {
                photoIds.push(match[1]);
            }
        }

        let foundCount = 0;
        const MAX_DISTANCE = 0.45; // Strict accuracy

        for (const id of photoIds) {
            // SPEED HACK: Sirf scan karne ke liye Drive Thumbnail fetch kar rahe hain (Size: < 100kb instead of 10MB)
            const scanUrl = `https://drive.google.com/thumbnail?id=${id}&sz=w500`; 
            // Download ke liye Original Quality ka link
            const originalDownloadUrl = `https://drive.google.com/uc?export=view&id=${id}`; 
            
            try {
                const img = await faceapi.fetchImage(scanUrl);
                const photoMatches = await faceapi.detectAllFaces(img, new faceapi.TinyFaceDetectorOptions({ inputSize: 320 })).withFaceLandmarks().withFaceDescriptors();
                
                let isMatchFound = false;
                for (const face of photoMatches) {
                    const distance = faceapi.euclideanDistance(userDescriptor, face.descriptor);
                    if (distance < MAX_DISTANCE) { 
                        isMatchFound = true;
                        break; 
                    }
                }

                if (isMatchFound) {
                    const imgContainer = document.createElement('div');
                    imgContainer.className = 'photo-card';
                    imgContainer.innerHTML = `
                        <img src="${scanUrl}" alt="Birthday Photo">
                        <a href="${originalDownloadUrl}" class="download-btn" download target="_blank">डाउनलोड करें</a>
                    `;
                    gallery.appendChild(imgContainer);
                    foundCount++;
                }
            } catch (e) {
                console.log("Loading error: " + id);
            }
        }
        status.innerText = foundCount > 0 ? `बधाई हो! आपकी ${foundCount} फोटो मिल गईं।` : "इस एल्बम में आपकी कोई फोटो नहीं मिली।";
    } catch (error) {
        status.innerText = "सिस्टम में कुछ तकनीकी समस्या हुई। पेज को रिफ्रेश करें।";
    } finally {
        scanner.style.display = 'none'; 
    }
});

init();
