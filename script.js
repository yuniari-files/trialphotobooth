// script.js

const frames = [
    document.getElementById('frame-1'),
    document.getElementById('frame-2'),
    document.getElementById('frame-3'),
    document.getElementById('frame-4')
];

const video = document.getElementById('webcam');
const timerEl = document.getElementById('timer');
const canvas = document.getElementById('capture-canvas');
const context = canvas.getContext('2d');

let capturedPhotos = [];
let selectedTemplate = null;
let finalImageDataURL = null;

// Konfigurasi koordinat dan rotasi (dalam derajat)
const templateConfig = {
    "template1.png": [
        { x: 0.17, y: 0.112, w: 0.75, h: 0.24, rotate: -4 },
        { x: 0.28, y: 0.38, w: 0.67, h: 0.26, rotate: -4},
        { x: 0.35, y: 0.652, w: 0.67, h: 0.24, rotate: -4 }
    ],
    "template2.png": [
        { x: 0.18, y: 0.065, w: 0.66, h: 0.27, rotate: -0.1 },
        { x: 0.19, y: 0.38, w: 0.66, h: 0.27, rotate: 0.1 },
        { x: 0.17, y: 0.7, w: 0.67, h: 0.28, rotate: -0.25 }
    ],
    "template3.png": [
        { x: 0.24, y: 0.047, w: 0.72, h: 0.30, rotate: 10 }, // Miring kiri
        { x: 0.03, y: 0.36, w: 0.66, h: 0.28, rotate: -4 },   // Miring kanan
        { x: 0.18, y: 0.675, w: 0.72, h: 0.29, rotate: -0.07 }  // Miring kiri sedikit
    ],
    "template4.png": [
        { x: 0.12, y: 0.15, w: 0.74, h: 0.23, rotate: 0 },
        { x: 0.20, y: 0.38, w: 0.66, h: 0.25, rotate: 0 },
        { x: 0.22, y: 0.63, w: 0.66, h: 0.23, rotate: 0 }
    ]
};

async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
    } catch (err) {
        alert("Gagal mengakses kamera! Pastikan izin diberikan.");
    }
}

// 3. Navigasi Frame
function showFrame(index) {
    frames.forEach((f, i) => f.classList.toggle('hidden', i !== index));
}

// 4. Proses Pengambilan Foto
document.getElementById('btn-start').addEventListener('click', async () => {
    capturedPhotos = [];
    timerEl.classList.remove('hidden');
    for (let i = 0; i < 3; i++) {
        await runCountdown(3);
        takePhoto();
    }
    timerEl.classList.add('hidden');
    displayPreviews();
    showFrame(1); // Ke Frame 2
});

function runCountdown(seconds) {
    return new Promise(resolve => {
        let count = seconds;
        timerEl.innerText = count;
        const interval = setInterval(() => {
            count--;
            if (count > 0) timerEl.innerText = count;
            else { clearInterval(interval); resolve(); }
        }, 1000);
    });
}

function takePhoto() {
    const flashOverlay = document.getElementById('flash-overlay');
    flashOverlay.classList.remove('flash-active');
    void flashOverlay.offsetWidth;
    flashOverlay.classList.add('flash-active');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.save();
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    context.restore();
    capturedPhotos.push(canvas.toDataURL('image/png'));
}

function displayPreviews() {
    capturedPhotos.forEach((photo, index) => {
        const slot = document.getElementById(`prev-${index + 1}`);
        if(slot) slot.innerHTML = `<img src="${photo}" style="width:100%; height:100%; object-fit:cover;" />`;
    });
}

// 5. Pilih Template (Frame 3)
document.querySelectorAll('.template-item').forEach(item => {
    item.addEventListener('click', () => {
        document.querySelectorAll('.template-item').forEach(t => t.classList.remove('selected'));
        item.classList.add('selected');
        selectedTemplate = item.querySelector('img').src;
    });
});

document.getElementById('btn-next-to-4').addEventListener('click', () => {
    if (!selectedTemplate) return alert("Pilih template dulu ya!");
    generateFinalImage();
    showFrame(3); // Ke Frame 4
});

// 6. Logic Penyatuan Foto (Canvas Magic)
async function generateFinalImage() {
    const finalCanvas = document.createElement('canvas');
    const finalCtx = finalCanvas.getContext('2d');
    
    // Cleaning FileName
    let fileName = decodeURIComponent(selectedTemplate.split('/').pop()).split('?')[0].toLowerCase();
    const config = templateConfig[fileName];

    if (!config) {
        alert("Konfigurasi file " + fileName + " tidak ditemukan!");
        return;
    }

    const templateImg = await new Promise(resolve => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.src = selectedTemplate;
    });

    finalCanvas.width = templateImg.width;
    finalCanvas.height = templateImg.height;

    // Gambar foto di layer bawah dengan rotasi
    for (let i = 0; i < capturedPhotos.length; i++) {
        const slot = config[i];
        const img = await new Promise(resolve => {
            const imgObj = new Image();
            imgObj.onload = () => resolve(imgObj);
            imgObj.src = capturedPhotos[i];
        });

        const drawW = slot.w * finalCanvas.width;
        const drawH = slot.h * finalCanvas.height;
        const centerX = (slot.x * finalCanvas.width) + (drawW / 2);
        const centerY = (slot.y * finalCanvas.height) + (drawH / 2);

        // Center Crop logic 4:3
        const imgRatio = img.width / img.height;
        const slotRatio = drawW / drawH;
        let sX, sY, sW, sH;
        if (imgRatio > slotRatio) {
            sW = img.height * slotRatio; sH = img.height;
            sX = (img.width - sW) / 2; sY = 0;
        } else {
            sW = img.width; sH = img.width / slotRatio;
            sX = 0; sY = (img.height - sH) / 2;
        }

        finalCtx.save();
        finalCtx.translate(centerX, centerY);
        finalCtx.rotate((slot.rotate * Math.PI) / 180);
        finalCtx.drawImage(img, sX, sY, sW, sH, -drawW / 2, -drawH / 2, drawW, drawH);
        finalCtx.restore();
    }

    // Overlay Template di paling atas
    finalCtx.drawImage(templateImg, 0, 0);

    // Simpan ke variabel global & tampilkan
    finalImageDataURL = finalCanvas.toDataURL('image/png');
    document.getElementById('final-image-wrapper').innerHTML = `<img src="${finalImageDataURL}" style="width:100%; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);"/>`;
    generateQRCode(finalImageDataURL);
}

document.getElementById('btn-download').addEventListener('click', () => {
    if (!finalImageDataURL) return;
    const link = document.createElement('a');
    link.href = finalImageDataURL;
    link.download = 'yuni-photobooth.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

// 8. Global Listeners
document.getElementById('btn-retake').addEventListener('click', () => showFrame(0));

// Tambahkan baris ini di sini agar rapi dan pasti jalan
document.getElementById('btn-next-to-3').addEventListener('click', () => {
    showFrame(2); // Pindah ke Frame 3 (Pilih Template)
});

document.getElementById('btn-home').addEventListener('click', () => {
    finalImageDataURL = null; 
    showFrame(0);
});

startCamera();