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
        status.innerText = "AI लोड होने में समस्या: " + err.message;
    }
}

function startCamera() {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
        .then(stream => {
            video.srcObject = stream;
            scanBtn.disabled = false;
            status.innerText = "तैयार! अपनी फोटो ढूँढने के लिए स्कैन बटन दबाएं।";
        })
        .catch(err => {
            status.innerText = "कैमरा की अनुमति नहीं मिली! कृपया परमिशन दें।";
        });
}

scanBtn.addEventListener('click', async () => {
    status.innerText = "फोटो खोजी जा रही हैं... कृपया 1-2 मिनट प्रतीक्षा करें।";
    gallery.innerHTML = '';
    scanner.style.display = 'block'; 
    
    try {
        const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();
        
        if (!detection) {
            status.innerText = "चेहरा साफ नहीं दिखा। रोशनी में आएं और फिर से कोशिश करें!";
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

        for (const id of photoIds) {
            const imgUrl = `https://lh3.googleusercontent.com/d/${id}`; 
            
            try {
                const img = await faceapi.fetchImage(imgUrl);
                const photoMatch = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();
                
                if (photoMatch) {
                    const distance = faceapi.euclideanDistance(userDescriptor, photoMatch.descriptor);
                    if (distance < 0.55) { 
                        const imgContainer = document.createElement('div');
                        imgContainer.className = 'photo-card';
                        imgContainer.innerHTML = `
                            <img src="${imgUrl}" alt="Birthday Photo">
                            <a href="${imgUrl}" class="download-btn" download target="_blank">डाउनलोड करें</a>
                        `;
                        gallery.appendChild(imgContainer);
                        foundCount++;
                    }
                }
            } catch (e) {
                console.log("Photo Skip Hui: " + id);
            }
        }
        status.innerText = foundCount > 0 ? `बधाई हो! आपकी ${foundCount} फोटो मिल गईं।` : "आपकी कोई फोटो नहीं मिली।";
    } catch (error) {
        status.innerText = "सिस्टम में कुछ गड़बड़ी हुई। पेज को रिफ्रेश करें।";
    } finally {
        scanner.style.display = 'none'; 
    }
});

init();
