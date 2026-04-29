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

// Timeout function taaki video ya kharab link par AI atke nahi
const fetchImageWithTimeout = (url, timeout = 5000) => {
    return Promise.race([
        faceapi.fetchImage(url),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
    ]);
};

scanBtn.addEventListener('click', async () => {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);

    const stream = video.srcObject;
    if (stream) stream.getTracks().forEach(track => track.stop());

    const capturedImg = document.createElement('img');
    capturedImg.src = canvas.toDataURL('image/png');
    capturedImg.style.width = '100%'; capturedImg.style.display = 'block';
    video.parentNode.replaceChild(capturedImg, video);

    scanBtn.disabled = true;
    scanner.style.display = 'block'; 
    status.innerText = "📸 फोटो क्लिक हो गई! चेकिंग चालू है... (बड़ी फाइल्स के कारण 30-40 सेकंड लग सकते हैं)";
    gallery.innerHTML = '';
    
    try {
        const detection = await faceapi.detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();
        if (!detection) {
            status.innerText = "चेहरा साफ नहीं दिखा। पेज रिफ्रेश करें!";
            scanner.style.display = 'none'; return;
        }

        const userDescriptor = detection.descriptor;
        const response = await fetch('photos%20link.txt');
        const textData = await response.text();
        
        const regex = /\/d\/([a-zA-Z0-9_-]+)\/view/g;
        let match; const photoIds = [];
        while ((match = regex.exec(textData)) !== null) {
            if (!photoIds.includes(match[1])) photoIds.push(match[1]);
        }

        let foundCount = 0;

        for (let i = 0; i < photoIds.length; i++) {
            const id = photoIds[i];
            // Safe URL use kar rahe hain
            const scanUrl = `https://drive.google.com/uc?export=view&id=${id}`; 
            
            try {
                // Agar 5 second me load nahi hua (jaise MP4), to chhod dega
                const img = await fetchImageWithTimeout(scanUrl, 5000);
                const photoMatches = await faceapi.detectAllFaces(img, new faceapi.TinyFaceDetectorOptions({ inputSize: 160 })).withFaceLandmarks().withFaceDescriptors();
                
                for (const face of photoMatches) {
                    if (faceapi.euclideanDistance(userDescriptor, face.descriptor) < 0.45) { 
                        const imgContainer = document.createElement('div');
                        imgContainer.className = 'photo-card';
                        imgContainer.innerHTML = `<img src="${scanUrl}"><a href="${scanUrl}" class="download-btn" download target="_blank">डाउनलोड करें</a>`;
                        gallery.appendChild(imgContainer);
                        foundCount++;
                        break; 
                    }
                }
            } catch (e) {
                console.log(`Skipped ${id} (Video or Drive Blocked)`);
            }
        }
        status.innerText = foundCount > 0 ? `बधाई हो! आपकी ${foundCount} फोटो मिल गईं।` : "इस एल्बम में आपकी कोई फोटो नहीं मिली।";
    } catch (error) {
        status.innerText = "तकनीकी समस्या! कृपया रिफ्रेश करें।";
    } finally {
        scanner.style.display = 'none'; 
    }
});

init();
