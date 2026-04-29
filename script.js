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
    status.innerText = "Matching faces... Please wait. (Photos zyada hain, thoda time lag sakta hai)";
    gallery.innerHTML = '';
    
    const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();
    
    if (!detection) {
        status.innerText = "Face not detected. Try again!";
        return;
    }

    const userDescriptor = detection.descriptor;
    
    // JADUU: Seedha aapki text file se IDs nikalna
    const response = await fetch('photos%20link.txt');
    const textData = await response.text();
    
    // Regex ka use karke sirf ID nikalna
    const regex = /\/d\/([a-zA-Z0-9_-]+)\/view/g;
    let match;
    const photoIds = [];
    while ((match = regex.exec(textData)) !== null) {
        if (!photoIds.includes(match[1])) {
            photoIds.push(match[1]); // Duplicate IDs hatane ke liye
        }
    }

    let foundCount = 0;

    for (const id of photoIds) {
        // Google Drive Image Direct & Fast Link
        const imgUrl = `https://lh3.googleusercontent.com/d/${id}`;
        
        try {
            const img = await faceapi.fetchImage(imgUrl);
            const photoMatch = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();
            
            if (photoMatch) {
                const distance = faceapi.euclideanDistance(userDescriptor, photoMatch.descriptor);
                if (distance < 0.55) { // Threshold for matching
                    const imgContainer = document.createElement('div');
                    imgContainer.innerHTML = `
                        <img src="${imgUrl}" style="width:100%; border-radius:8px; border:2px solid #ddd;">
                        <br>
                        <a href="${imgUrl}" download target="_blank" style="font-size:14px; text-decoration:none; color:#25d366; font-weight:bold;">Download Photo</a>
                    `;
                    gallery.appendChild(imgContainer);
                    foundCount++;
                }
            }
        } catch (e) {
            console.log("Loading delay for ID: " + id);
        }
    }
    status.innerText = foundCount > 0 ? `Mil Gayi! ${foundCount} photos aapki hain.` : "Aapki koi photo nahi mili.";
});

init();
