const video = document.getElementById('video');
const scanBtn = document.getElementById('scan-btn');
const status = document.getElementById('status');
const gallery = document.getElementById('gallery');

// 1. Models Load Karein
async function init() {
    try {
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
            faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
            faceapi.nets.faceRecognitionNet.loadFromUri('/models')
        ]);
        status.innerText = "Models Ready! Starting Camera...";
        startCamera();
    } catch (err) {
        status.innerText = "Model loading failed: " + err;
    }
}

function startCamera() {
    navigator.mediaDevices.getUserMedia({ video: {} })
        .then(stream => {
            video.srcObject = stream;
            scanBtn.disabled = false;
            status.innerText = "Camera Ready. Take a Selfie!";
        })
        .catch(err => status.innerText = "Camera access denied.");
}

scanBtn.addEventListener('click', async () => {
    status.innerText = "Matching faces... Please wait.";
    gallery.innerHTML = '';
    
    const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();
    
    if (!detection) {
        status.innerText = "Face not detected. Try again!";
        return;
    }

    const userDescriptor = detection.descriptor;
    const response = await fetch('photos.json');
    const photoIds = await response.json();

    let foundCount = 0;

    for (const id of photoIds) {
        // Direct Download/View Link for Google Drive
        const imgUrl = `https://lh3.googleusercontent.com/d/${id}`;
        
        try {
            const img = await faceapi.fetchImage(imgUrl);
            const photoMatch = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();
            
            if (photoMatch) {
                const distance = faceapi.euclideanDistance(userDescriptor, photoMatch.descriptor);
                if (distance < 0.55) { // Threshold for matching
                    const imgContainer = document.createElement('div');
                    imgContainer.innerHTML = `<img src="${imgUrl}"><br><a href="${imgUrl}" download target="_blank" style="font-size:12px; text-decoration:none; color:blue;">Download</a>`;
                    gallery.appendChild(imgContainer);
                    foundCount++;
                }
            }
        } catch (e) {
            console.log("Skipping image: " + id);
        }
    }
    status.innerText = foundCount > 0 ? `Found ${foundCount} photos!` : "No matching photos found.";
});

init();
