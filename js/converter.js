import { downloadBlob, readFileAsDataURL, showNotification, escapeHtml } from './utils.js';

let images = []; // массив { file, dataUrl, width, height, rotation }
let pageSize = 'fit'; // 'fit', 'a4', 'letter'

export function initConverter() {
    const container = document.getElementById('convert');
    container.innerHTML = `
        <div class="tool-card">
            <h3><i class="fas fa-images"></i> Конвертация изображений в PDF</h3>
            <div class="drop-zone" id="imageDropZone">
                <i class="fas fa-cloud-upload-alt fa-3x"></i>
                <p>Перетащите изображения сюда или <strong>кликните для выбора</strong></p>
                <input type="file" id="imageInput" multiple accept="image/jpeg,image/png,image/gif,image/webp" style="display:none;">
            </div>
            
            <div class="options-panel">
                <label>Размер страницы:</label>
                <select id="pageSizeSelect">
                    <option value="fit">По размеру изображения</option>
                    <option value="a4">A4 (595x842 pt)</option>
                    <option value="letter">Letter (612x792 pt)</option>
                </select>
                <label style="margin-left:15px;">Качество JPEG:</label>
                <input type="range" id="jpegQuality" min="0.1" max="1.0" step="0.1" value="0.9">
                <span id="qualityValue">90%</span>
            </div>
            
            <div id="imagePreview" class="image-preview-grid"></div>
            
            <div class="action-buttons">
                <button id="convertBtn"><i class="fas fa-file-pdf"></i> Конвертировать в PDF</button>
                <button id="clearImagesBtn" class="secondary-btn"><i class="fas fa-trash-alt"></i> Очистить</button>
            </div>
        </div>
    `;
    
    const dropZone = document.getElementById('imageDropZone');
    const input = document.getElementById('imageInput');
    const previewDiv = document.getElementById('imagePreview');
    const convertBtn = document.getElementById('convertBtn');
    const clearBtn = document.getElementById('clearImagesBtn');
    const pageSizeSelect = document.getElementById('pageSizeSelect');
    const qualitySlider = document.getElementById('jpegQuality');
    const qualitySpan = document.getElementById('qualityValue');
    
    // Настройки
    pageSizeSelect.addEventListener('change', e => pageSize = e.target.value);
    qualitySlider.addEventListener('input', e => {
        qualitySpan.textContent = Math.round(e.target.value * 100) + '%';
    });
    
    // Drag & Drop
    dropZone.addEventListener('click', () => input.click());
    dropZone.addEventListener('dragover', e => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', e => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        handleFiles(e.dataTransfer.files);
    });
    
    input.addEventListener('change', e => handleFiles(e.target.files));
    
    async function handleFiles(files) {
        const fileArray = Array.from(files).filter(f => f.type.startsWith('image/'));
        for (const file of fileArray) {
            const dataUrl = await readFileAsDataURL(file);
            // Получаем размеры
            const img = new Image();
            img.src = dataUrl;
            await new Promise(resolve => { img.onload = resolve; });
            images.push({
                file,
                dataUrl,
                width: img.width,
                height: img.height,
                rotation: 0
            });
        }
        renderPreview();
    }
    
    function renderPreview() {
        previewDiv.innerHTML = '';
        images.forEach((img, index) => {
            const item = document.createElement('div');
            item.className = 'image-preview-item';
            item.innerHTML = `
                <img src="${escapeHtml(img.dataUrl)}" alt="preview" style="transform: rotate(${img.rotation}deg);">
                <div class="image-actions">
                    <button class="rotate-btn" data-index="${index}" title="Повернуть"><i class="fas fa-undo-alt"></i></button>
                    <button class="remove-btn" data-index="${index}" title="Удалить"><i class="fas fa-times"></i></button>
                </div>
            `;
            previewDiv.appendChild(item);
        });
        
        // Обработчики кнопок
        document.querySelectorAll('.rotate-btn').forEach(btn => {
            btn.addEventListener('click', e => {
                const idx = e.currentTarget.dataset.index;
                images[idx].rotation = (images[idx].rotation + 90) % 360;
                renderPreview();
            });
        });
        document.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', e => {
                const idx = e.currentTarget.dataset.index;
                images.splice(idx, 1);
                renderPreview();
            });
        });
    }
    
    clearBtn.addEventListener('click', () => {
        images = [];
        renderPreview();
        input.value = '';
        showNotification('Список изображений очищен', 'info');
    });
    
    convertBtn.addEventListener('click', async () => {
        if (images.length === 0) {
            showNotification('Добавьте хотя бы одно изображение', 'warning');
            return;
        }
        
        try {
            const { PDFDocument } = PDFLib;
            const pdfDoc = await PDFDocument.create();
            const jpegQuality = parseFloat(qualitySlider.value);
            
            for (const img of images) {
                let imageEmbed;
                // Определяем тип
                if (img.file.type === 'image/png') {
                    imageEmbed = await pdfDoc.embedPng(img.dataUrl);
                } else {
                    // Для JPEG можно применить сжатие
                    const compressed = await compressImage(img.dataUrl, jpegQuality);
                    imageEmbed = await pdfDoc.embedJpg(compressed);
                }
                
                let pageWidth, pageHeight;
                const imgWidth = img.width;
                const imgHeight = img.height;
                
                if (pageSize === 'fit') {
                    pageWidth = imgWidth;
                    pageHeight = imgHeight;
                } else {
                    // Стандартные размеры в точках
                    const sizes = { a4: [595, 842], letter: [612, 792] };
                    [pageWidth, pageHeight] = sizes[pageSize];
                    
                    // Масштабируем изображение, чтобы вписать в страницу с сохранением пропорций
                    const scale = Math.min(pageWidth / imgWidth, pageHeight / imgHeight);
                    const scaledWidth = imgWidth * scale;
                    const scaledHeight = imgHeight * scale;
                    const x = (pageWidth - scaledWidth) / 2;
                    const y = (pageHeight - scaledHeight) / 2;
                    
                    const page = pdfDoc.addPage([pageWidth, pageHeight]);
                    page.drawImage(imageEmbed, { x, y, width: scaledWidth, height: scaledHeight });
                    continue;
                }
                
                // Для fit просто добавляем страницу размером с изображение
                let page = pdfDoc.addPage([pageWidth, pageHeight]);
                // Учитываем поворот
                if (img.rotation % 180 !== 0) {
                    page.setSize(pageHeight, pageWidth);
                }
                const { width, height } = page.getSize();
                page.drawImage(imageEmbed, {
                    x: 0, y: 0,
                    width: img.rotation % 180 === 0 ? width : height,
                    height: img.rotation % 180 === 0 ? height : width,
                    rotate: img.rotation ? { angle: img.rotation } : undefined
                });
            }
            
            const pdfBytes = await pdfDoc.save();
            downloadBlob(new Blob([pdfBytes], { type: 'application/pdf' }), 'converted.pdf');
            showNotification('PDF успешно создан!', 'success');
        } catch (error) {
            console.error(error);
            showNotification('Ошибка конвертации: ' + error.message, 'error');
        }
    });
}

// Функция сжатия JPEG (через canvas)
function compressImage(dataUrl, quality) {
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            canvas.toBlob(blob => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.readAsDataURL(blob);
            }, 'image/jpeg', quality);
        };
        img.src = dataUrl;
    });
}