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
            status.innerText = "तैयार! अपनी फोटो खींचने के लिए बटन दबाएं।";
        })
        .catch(err => {
            status.innerText = "कैमरा की अनुमति नहीं मिली! कृपया परमिशन दें।";
        });
}

scanBtn.addEventListener('click', async () => {
    // 1. Snapshot Capture Karna
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // 2. Camera Band Karna (Taaki user aaram se wait kar sake)
    const stream = video.srcObject;
    if (stream) {
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
    }

    // 3. Live video ki jagah Captured Photo dikhana
    const capturedImg = document.createElement('img');
    capturedImg.src = canvas.toDataURL('image/png');
    capturedImg.style.width = '100%';
    capturedImg.style.display = 'block';
    video.parentNode.replaceChild(capturedImg, video);

    // UI Update
    scanBtn.disabled = true;
    scanner.style.display = 'block'; 
    status.innerText = "📸 फोटो क्लिक हो गई! अब आप फोन नीचे रख सकते हैं। AI आपकी पुरानी फोटो खोज रहा है... (इसमें 1-2 मिनट लग सकते हैं)";
    gallery.innerHTML = '';
    
    try {
        // Live video ki jagah ab is static canvas se face match hoga
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

        for (const id of photoIds) {
            // Fast Google Drive direct image link
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
                console.log("Photo load hone me waqt lag raha hai: " + id);
            }
        }
        status.innerText = foundCount > 0 ? `बधाई हो! आपकी ${foundCount} फोटो मिल गईं। नीचे देखें 👇` : "आपकी कोई फोटो नहीं मिली।";
    } catch (error) {
        status.innerText = "सिस्टम में कुछ गड़बड़ी हुई। पेज को रिफ्रेश करें।";
    } finally {
        scanner.style.display = 'none'; 
    }
});

init();
