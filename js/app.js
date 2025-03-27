// DOM elementleri
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('file-input');
const uploadContainer = document.getElementById('upload-container');
const imagePreview = document.getElementById('image-preview');
const imageComparison = document.getElementById('image-comparison');
const loading = document.getElementById('loading');
const originalImage = document.getElementById('original-image');
const enhancedImage = document.getElementById('enhanced-image');
const enhancedLabel = document.getElementById('enhanced-label');
const newImageBtn = document.getElementById('new-image');
const downloadBtn = document.getElementById('download-image');
const scale2xBtn = document.getElementById('scale-2x');
const scale4xBtn = document.getElementById('scale-4x');
const slider = document.getElementById('slider');


let currentScale = '2x';
let originalImageData = null;
let enhancedImageData = null;
let isDragging = false;


dropzone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleImageUpload);
dropzone.addEventListener('dragover', handleDragOver);
dropzone.addEventListener('drop', handleDrop);
newImageBtn.addEventListener('click', resetUpload);
downloadBtn.addEventListener('click', downloadEnhancedImage);
scale2xBtn.addEventListener('click', () => changeScale('2x'));
scale4xBtn.addEventListener('click', () => changeScale('4x'));

// Slider için event listeners
slider.addEventListener('mousedown', () => {
    isDragging = true;
});

document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    
    const rect = imageComparison.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = (x / rect.width) * 100;
    
    if (percent < 5) return;
    if (percent > 95) return;
    
    updateSliderPosition(percent);
});

document.addEventListener('mouseup', () => {
    isDragging = false;
});

// Sayfa yüklendiğinde görüntü karşılaştırmasını gizle
window.addEventListener('DOMContentLoaded', () => {
    imageComparison.classList.add('hidden');
});

// Görüntü yükleme fonksiyonu
function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        originalImageData = e.target.result;
        uploadContainer.classList.add('hidden');
        imagePreview.classList.remove('hidden');
        loading.classList.remove('hidden');
        imageComparison.classList.add('hidden');
        
        // Görüntüyü işle
        processImage();
    };
    reader.readAsDataURL(file);
}

// Drag and drop fonksiyonları
function handleDragOver(e) {
    e.preventDefault();
    dropzone.style.backgroundColor = '#bee3f8';
}

function handleDrop(e) {
    e.preventDefault();
    dropzone.style.backgroundColor = '#ebf8ff';
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        fileInput.files = e.dataTransfer.files;
        handleImageUpload({ target: { files: [e.dataTransfer.files[0]] } });
    }
}

// Görüntü işleme
function processImage() {
    enhanceImage(originalImageData)
        .then(enhancedData => {
            enhancedImageData = enhancedData;
            
            // Görüntüleri hazırla
            originalImage.style.backgroundImage = `url(${originalImageData})`;
            enhancedImage.style.backgroundImage = `url(${enhancedImageData})`;
            
            // Arayüzü güncelle
            loading.classList.add('hidden');
            imageComparison.classList.remove('hidden');
            
            // Slider'ı varsayılan konuma getir
            updateSliderPosition(50);
        })
        .catch(error => {
            console.error("Görüntü işleme hatası:", error);
            alert("Görüntü işlenirken bir hata oluştu.");
            loading.classList.add('hidden');
        });
}

// Görüntü iyileştirme
function enhanceImage(imageData) {
    return new Promise((resolve, reject) => {
        try {
            const img = new Image();
            
            img.onload = () => {
                // Canvas oluştur
                const canvas = document.createElement('canvas');
                
                // Ölçeklendirme faktörünü belirle
                const scaleFactor = currentScale === '2x' ? 2 : 4;
                
                // Canvas boyutlarını ayarla
                canvas.width = img.width * scaleFactor;
                canvas.height = img.height * scaleFactor;
                
                // Canvas bağlamını al
                const ctx = canvas.getContext('2d');
                
                // Görüntüyü daha yüksek çözünürlükte çiz
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                
                // Filtreleri uygula
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const enhancedData = applyFilters(imageData);
                ctx.putImageData(enhancedData, 0, 0);
                
                // İşlenmiş görüntüyü döndür
                resolve(canvas.toDataURL('image/jpeg', 0.95));
            };
            
            img.onerror = () => {
                reject(new Error("Görüntü yüklenemedi"));
            };
            
            img.src = imageData;
        } catch (error) {
            reject(error);
        }
    });
}

// Filtreleri uygulama 
function applyFilters(imageData) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    

    const contrast = 1.2; 
    const brightness = 5; 
    
    for (let i = 0; i < data.length; i += 4) {
        // Kırmızı
        data[i] = contrastAdjust(data[i], contrast, brightness);
        // Yeşil
        data[i + 1] = contrastAdjust(data[i + 1], contrast, brightness);
        // Mavi
        data[i + 2] = contrastAdjust(data[i + 2], contrast, brightness);
      
    }
    
    // Keskinleştirm
    const tempData = new Uint8ClampedArray(data);
    const kernel = [-1, -1, -1, -1, 9, -1, -1, -1, -1]; 
    
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const pixel = (y * width + x) * 4;
            
            for (let rgb = 0; rgb < 3; rgb++) {
                let val = 0;
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const idx = ((y + ky) * width + (x + kx)) * 4 + rgb;
                        val += tempData[idx] * kernel[(ky + 1) * 3 + (kx + 1)];
                    }
                }
                data[pixel + rgb] = Math.min(255, Math.max(0, val));
            }
        }
    }
    
    return imageData;
}

// Kontrast ayarlama
function contrastAdjust(value, contrast, brightness) {
    value = value + brightness;
    value = (value - 128) * contrast + 128;
    return Math.min(255, Math.max(0, Math.round(value)));
}

// Ölçek değiştirme
function changeScale(scale) {
    if (currentScale === scale) return;
    
    currentScale = scale;
    
    // Buton durumlarını güncelle
    if (scale === '2x') {
        scale2xBtn.classList.add('active');
        scale4xBtn.classList.remove('active');
    } else {
        scale2xBtn.classList.remove('active');
        scale4xBtn.classList.add('active');
    }
    
 
    enhancedLabel.textContent = `${scale} İyileştirilmiş`;
    
    // Eğer görüntü yüklüyse
    if (originalImageData) {
    
        loading.classList.remove('hidden');
        imageComparison.classList.add('hidden');
        
        // Yeniden işle
        enhanceImage(originalImageData)
            .then(enhancedData => {
                enhancedImageData = enhancedData;
                enhancedImage.style.backgroundImage = `url(${enhancedImageData})`;
                
                // Yükleme  gizle
                loading.classList.add('hidden');
                imageComparison.classList.remove('hidden');
            })
            .catch(error => {
                console.error("Ölçeklendirme hatası:", error);
                loading.classList.add('hidden');
            });
    }
}

// Slider pozisyonunu güncelleme
function updateSliderPosition(percent) {
    slider.style.left = `${percent}%`;
    originalImage.style.clipPath = `inset(0 ${100 - percent}% 0 0)`;
    enhancedImage.style.clipPath = `inset(0 0 0 ${percent}%)`;
}

// Sıfırlama
function resetUpload() {
    uploadContainer.classList.remove('hidden');
    imagePreview.classList.add('hidden');
    fileInput.value = '';
}

// İyileştirilmiş görüntüyü indir
function downloadEnhancedImage() {
    if (!enhancedImageData) return;
    
    // İndirme bağlantısı
    const link = document.createElement('a');
    link.href = enhancedImageData;
    link.download = 'iyilestirilmis_goruntu.jpg';
    

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
