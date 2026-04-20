import { downloadBlob, readFileAsArrayBuffer, showNotification } from './utils.js';

// Глобальные переменные модуля
let pdfDoc = null;              // PDFDocument из pdf-lib
let pdfJsDoc = null;            // PDFDocumentProxy из pdf.js
let currentPage = 1;
let totalPages = 0;
let scale = 1.5;
let currentMode = 'edit';       // 'edit', 'add', 'delete', 'watermark'
let selectedTextRange = null;
let extractedItems = [];
let renderTask = null;
let isSelecting = false;
let selectionStart = null;
let canvas, ctx;

export function initPdfEditor() {
    const container = document.getElementById('edit');
    container.innerHTML = `
        <div class="tool-card">
            <h3><i class="fas fa-edit"></i> Редактор PDF</h3>
            
            <div class="pdf-toolbar">
                <div class="drop-zone" id="pdfDropZone" style="padding:15px; flex:1;">
                    <i class="fas fa-cloud-upload-alt"></i>
                    <span>Перетащите PDF или <button id="selectPdfBtn" class="secondary-btn" style="margin-left:10px;">Выбрать файл</button></span>
                    <input type="file" id="pdfInput" accept=".pdf" style="display:none;">
                </div>
                <button id="savePdfBtn"><i class="fas fa-save"></i> Сохранить</button>
                <button id="rotateCwBtn" title="Повернуть по часовой"><i class="fas fa-redo-alt"></i></button>
                <button id="extractTextBtn"><i class="fas fa-copy"></i> Извлечь текст</button>
            </div>
            
            <div class="mode-selector">
                <button class="mode-btn active" data-mode="edit"><i class="fas fa-pencil-alt"></i> Редактировать</button>
                <button class="mode-btn" data-mode="add"><i class="fas fa-plus"></i> Добавить</button>
                <button class="mode-btn" data-mode="delete"><i class="fas fa-eraser"></i> Удалить</button>
                <button class="mode-btn" data-mode="watermark"><i class="fas fa-stamp"></i> Водяной знак</button>
            </div>
            
            <div class="edit-controls">
                <input type="text" id="editTextInput" placeholder="Текст для вставки" style="flex:2;">
                <select id="fontSelect">
                    <option value="helvetica">Helvetica</option>
                    <option value="times">Times Roman</option>
                    <option value="courier">Courier</option>
                </select>
                <input type="number" id="fontSize" value="16" min="8" max="72">
                <select id="fontColor">
                    <option value="black">Черный</option>
                    <option value="red">Красный</option>
                    <option value="blue">Синий</option>
                    <option value="green">Зеленый</option>
                </select>
                <button id="applyEditBtn" class="primary-btn">Применить</button>
            </div>
            
            <div class="canvas-container">
                <canvas id="pdfCanvas"></canvas>
                <div id="selectionBox" style="position:absolute; border:2px dashed #00f; pointer-events:none; display:none;"></div>
            </div>
            
            <div style="display:flex; justify-content:center; gap:20px; margin:15px 0;">
                <button id="prevPageBtn"><i class="fas fa-chevron-left"></i> Пред.</button>
                <span id="pageInfo">Страница 0 / 0</span>
                <button id="nextPageBtn">След. <i class="fas fa-chevron-right"></i></button>
            </div>
            
            <div id="statusArea" class="status">
                <i class="fas fa-info-circle"></i> Загрузите PDF для начала работы.
            </div>
            <div id="extractedTextPanel" style="display:none; margin-top:20px;">
                <h4>Извлечённый текст:</h4>
                <pre id="extractedTextContent" style="background:#f0f0f0; padding:15px; border-radius:8px; max-height:200px; overflow:auto;"></pre>
                <button id="copyExtractedBtn"><i class="fas fa-copy"></i> Копировать</button>
                <button id="closeExtractedBtn">Закрыть</button>
            </div>
        </div>
    `;
    
    canvas = document.getElementById('pdfCanvas');
    ctx = canvas.getContext('2d');
    
    // Настройка PDF.js worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@2.16.105/build/pdf.worker.min.js';
    
    // Элементы управления
    const selectBtn = document.getElementById('selectPdfBtn');
    const fileInput = document.getElementById('pdfInput');
    const dropZone = document.getElementById('pdfDropZone');
    const saveBtn = document.getElementById('savePdfBtn');
    const rotateBtn = document.getElementById('rotateCwBtn');
    const extractBtn = document.getElementById('extractTextBtn');
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    const applyBtn = document.getElementById('applyEditBtn');
    const editInput = document.getElementById('editTextInput');
    
    // Обработчики загрузки файла
    selectBtn.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', e => e.preventDefault());
    dropZone.addEventListener('drop', e => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file?.type === 'application/pdf') loadPdf(file);
    });
    fileInput.addEventListener('change', e => {
        if (e.target.files[0]) loadPdf(e.target.files[0]);
    });
    
    // Кнопки
    saveBtn.addEventListener('click', savePdf);
    rotateBtn.addEventListener('click', rotatePage);
    extractBtn.addEventListener('click', extractAndShowText);
    prevBtn.addEventListener('click', () => changePage(-1));
    nextBtn.addEventListener('click', () => changePage(1));
    applyBtn.addEventListener('click', applyEdit);
    
    // Переключение режимов
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentMode = btn.dataset.mode;
            updateStatus();
            clearSelection();
        });
    });
    
    // События canvas
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('click', onCanvasClick);
    
    // Копирование извлечённого текста
    document.getElementById('copyExtractedBtn').addEventListener('click', () => {
        const text = document.getElementById('extractedTextContent').textContent;
        navigator.clipboard.writeText(text).then(() => showNotification('Текст скопирован', 'success'));
    });
    document.getElementById('closeExtractedBtn').addEventListener('click', () => {
        document.getElementById('extractedTextPanel').style.display = 'none';
    });
    
    // Функция загрузки PDF
    async function loadPdf(file) {
        try {
            const arrayBuffer = await readFileAsArrayBuffer(file);
            pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
            pdfJsDoc = await pdfjsLib.getDocument({ data: arrayBuffer.slice(0) }).promise;
            totalPages = pdfJsDoc.numPages;
            currentPage = 1;
            await renderPage();
            updatePageInfo();
            updateStatus(`PDF "${file.name}" загружен. Выберите режим работы.`);
            showNotification(`PDF "${file.name}" загружен`, 'success');
        } catch (err) {
            showNotification('Ошибка загрузки PDF: ' + err.message, 'error');
        }
    }
    
    async function renderPage() {
        if (!pdfJsDoc) return;
        if (renderTask) {
            await renderTask.cancel();
            renderTask = null;
        }
        const page = await pdfJsDoc.getPage(currentPage);
        const viewport = page.getViewport({ scale });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const renderContext = { canvasContext: ctx, viewport };
        renderTask = page.render(renderContext);
        await renderTask.promise;
        renderTask = null;
        
        // Извлечение текстовых элементов с правильными координатами
        const textContent = await page.getTextContent();
        extractedItems = textContent.items.map(item => {
            // Трансформация: [scaleX, skewY, skewX, scaleY, translateX, translateY]
            const tx = item.transform;
            // В pdf.js Y отсчитывается от нижнего левого угла, нам нужен от верхнего левого для canvas
            const x = tx[4] * scale;
            const y = canvas.height - (tx[5] * scale);
            const width = item.width * scale;
            const height = (item.height || Math.abs(tx[0]) * 1.2) * scale;
            return {
                text: item.str,
                x, y, width, height,
                original: item,
                // сохраняем оригинальные координаты для pdf-lib
                pdfX: tx[4],
                pdfY: tx[5],
                fontSize: Math.abs(tx[0])
            };
        });
        clearSelection();
    }
    
    function updatePageInfo() {
        document.getElementById('pageInfo').textContent = `Страница ${currentPage} / ${totalPages}`;
    }
    
    async function changePage(delta) {
        const newPage = currentPage + delta;
        if (newPage >= 1 && newPage <= totalPages) {
            currentPage = newPage;
            await renderPage();
            updatePageInfo();
            updateStatus();
        }
    }
    
    // Обработчики выделения (для режима редактирования)
    function onMouseDown(e) {
        if (currentMode !== 'edit') return;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        selectionStart = {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
        isSelecting = true;
        document.getElementById('selectionBox').style.display = 'none';
    }
    
    function onMouseMove(e) {
        if (!isSelecting) return;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const currentX = (e.clientX - rect.left) * scaleX;
        const currentY = (e.clientY - rect.top) * scaleY;
        
        const box = document.getElementById('selectionBox');
        const left = Math.min(selectionStart.x, currentX);
        const top = Math.min(selectionStart.y, currentY);
        const width = Math.abs(currentX - selectionStart.x);
        const height = Math.abs(currentY - selectionStart.y);
        
        box.style.display = 'block';
        box.style.left = left + 'px';
        box.style.top = top + 'px';
        box.style.width = width + 'px';
        box.style.height = height + 'px';
    }
    
    function onMouseUp(e) {
        if (!isSelecting) return;
        isSelecting = false;
        const box = document.getElementById('selectionBox');
        box.style.display = 'none';
        
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const end = {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
        
        const selected = findTextInArea(selectionStart, end);
        if (selected) {
            selectedTextRange = selected;
            document.getElementById('editTextInput').value = selected.text;
            updateStatus(`Выделено: "${selected.text.substring(0, 30)}..." Введите новый текст и нажмите "Применить".`);
            highlightSelection(selected);
        } else {
            updateStatus('Текст не найден в выделенной области. Попробуйте ещё раз.');
        }
    }
    
    function findTextInArea(p1, p2) {
        const minX = Math.min(p1.x, p2.x);
        const maxX = Math.max(p1.x, p2.x);
        const minY = Math.min(p1.y, p2.y);
        const maxY = Math.max(p1.y, p2.y);
        
        const items = extractedItems.filter(item => {
            return item.x < maxX && (item.x + item.width) > minX &&
                   item.y < maxY && (item.y + item.height) > minY;
        });
        if (items.length === 0) return null;
        
        // Сортировка по позиции
        items.sort((a, b) => b.y - a.y || a.x - b.x);
        const text = items.map(i => i.text).join(' ');
        return { text, items, bounds: { minX, maxX, minY, maxY } };
    }
    
    function highlightSelection(selected) {
        // Визуально подсвечиваем выделение на canvas (просто обводим рамкой)
        ctx.save();
        ctx.strokeStyle = '#00f';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]);
        ctx.strokeRect(
            selected.bounds.minX,
            selected.bounds.minY,
            selected.bounds.maxX - selected.bounds.minX,
            selected.bounds.maxY - selected.bounds.minY
        );
        ctx.restore();
    }
    
    function clearSelection() {
        selectedTextRange = null;
        document.getElementById('selectionBox').style.display = 'none';
        if (pdfJsDoc) renderPage(); // перерисовываем без выделения
    }
    
    // Клик по canvas (для добавления/удаления/водяного знака)
    async function onCanvasClick(e) {
        if (!pdfDoc) {
            showNotification('Сначала загрузите PDF', 'warning');
            return;
        }
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const clickX = (e.clientX - rect.left) * scaleX;
        const clickY = (e.clientY - rect.top) * scaleY;
        
        if (currentMode === 'add') {
            await addTextAt(clickX, clickY);
        } else if (currentMode === 'delete') {
            await deleteTextAt(clickX, clickY);
        } else if (currentMode === 'watermark') {
            // Водяной знак добавляется по клику в центр страницы или в место клика? 
            // Сделаем диалог с выбором текста и опции размещения по центру.
            await addWatermarkDialog();
        }
    }
    
    async function applyEdit() {
        if (currentMode === 'edit' && selectedTextRange) {
            await replaceText();
        } else if (currentMode === 'edit') {
            showNotification('Сначала выделите текст для редактирования', 'warning');
        } else {
            // Если не режим редактирования, то кнопка "Применить" может использоваться для добавления
            if (currentMode === 'add') {
                showNotification('Кликните на страницу, чтобы добавить текст', 'info');
            }
        }
    }
    
    async function replaceText() {
        const newText = document.getElementById('editTextInput').value.trim();
        if (!newText) {
            showNotification('Введите новый текст', 'warning');
            return;
        }
        
        try {
            const pages = pdfDoc.getPages();
            const page = pages[currentPage - 1];
            const { height } = page.getSize();
            
            // Настройки шрифта
            const fontName = document.getElementById('fontSelect').value;
            let font;
            if (fontName === 'times') font = await pdfDoc.embedFont(PDFLib.StandardFonts.TimesRoman);
            else if (fontName === 'courier') font = await pdfDoc.embedFont(PDFLib.StandardFonts.Courier);
            else font = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
            
            const fontSize = parseInt(document.getElementById('fontSize').value);
            const colorName = document.getElementById('fontColor').value;
            const color = { 
                black: { r:0,g:0,b:0 }, 
                red: { r:1,g:0,b:0 }, 
                blue: { r:0,g:0,b:1 }, 
                green: { r:0,g:1,b:0 } 
            }[colorName];
            
            // Вычисляем прямоугольник, охватывающий все выделенные элементы
            const firstItem = selectedTextRange.items[0];
            const lastItem = selectedTextRange.items[selectedTextRange.items.length-1];
            const minPdfX = Math.min(...selectedTextRange.items.map(i => i.pdfX));
            const maxPdfX = Math.max(...selectedTextRange.items.map(i => i.pdfX + i.width/scale));
            const minPdfY = Math.min(...selectedTextRange.items.map(i => i.pdfY));
            const maxPdfY = Math.max(...selectedTextRange.items.map(i => i.pdfY + i.fontSize));
            
            // Закрашиваем область
            page.drawRectangle({
                x: minPdfX - 2,
                y: minPdfY - 2,
                width: maxPdfX - minPdfX + 4,
                height: maxPdfY - minPdfY + 4,
                color: { r:1, g:1, b:1 }
            });
            
            // Рисуем новый текст, используя координаты первого элемента как начало
            page.drawText(newText, {
                x: firstItem.pdfX,
                y: firstItem.pdfY,
                size: fontSize,
                font,
                color
            });
            
            await saveAndReload();
            showNotification('Текст успешно заменён', 'success');
            updateStatus('Текст заменён. Продолжайте редактирование.');
            clearSelection();
        } catch (error) {
            console.error(error);
            showNotification('Ошибка при замене текста: ' + error.message, 'error');
        }
    }
    
    async function addTextAt(x, y) {
        const text = document.getElementById('editTextInput').value.trim();
        if (!text) {
            showNotification('Введите текст в поле перед добавлением', 'warning');
            return;
        }
        
        try {
            const pages = pdfDoc.getPages();
            const page = pages[currentPage - 1];
            const { height } = page.getSize();
            
            // Преобразование координат: canvas (Y сверху) -> pdf-lib (Y снизу)
            const pdfX = x / scale;
            const pdfY = height - (y / scale);
            
            const fontName = document.getElementById('fontSelect').value;
            let font;
            if (fontName === 'times') font = await pdfDoc.embedFont(PDFLib.StandardFonts.TimesRoman);
            else if (fontName === 'courier') font = await pdfDoc.embedFont(PDFLib.StandardFonts.Courier);
            else font = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
            
            const fontSize = parseInt(document.getElementById('fontSize').value);
            const colorName = document.getElementById('fontColor').value;
            const color = { 
                black: { r:0,g:0,b:0 }, 
                red: { r:1,g:0,b:0 }, 
                blue: { r:0,g:0,b:1 }, 
                green: { r:0,g:1,b:0 } 
            }[colorName];
            
            page.drawText(text, {
                x: pdfX,
                y: pdfY - fontSize, // корректировка, чтобы текст был над точкой клика
                size: fontSize,
                font,
                color
            });
            
            await saveAndReload();
            showNotification('Текст добавлен', 'success');
            updateStatus(`Текст "${text}" добавлен.`);
        } catch (error) {
            console.error(error);
            showNotification('Ошибка добавления текста: ' + error.message, 'error');
        }
    }
    
    async function deleteTextAt(x, y) {
        // Ищем текст, в который попал клик
        const item = extractedItems.find(i => 
            x >= i.x && x <= i.x + i.width && y >= i.y && y <= i.y + i.height
        );
        if (!item) {
            showNotification('Не найден текст для удаления. Попробуйте кликнуть точно по тексту.', 'warning');
            return;
        }
        
        try {
            const pages = pdfDoc.getPages();
            const page = pages[currentPage - 1];
            const { height } = page.getSize();
            
            const pdfX = item.pdfX;
            const pdfY = item.pdfY;
            const width = item.width / scale;
            const heightRect = item.height / scale;
            
            // Закрашиваем белым прямоугольником
            page.drawRectangle({
                x: pdfX - 2,
                y: pdfY - 2,
                width: width + 4,
                height: heightRect + 4,
                color: { r:1, g:1, b:1 }
            });
            
            await saveAndReload();
            showNotification(`Текст "${item.text}" удалён`, 'success');
            updateStatus(`Текст удалён.`);
        } catch (error) {
            console.error(error);
            showNotification('Ошибка удаления: ' + error.message, 'error');
        }
    }
    
    async function addWatermarkDialog() {
        const text = prompt('Введите текст водяного знака:', 'КОНФИДЕНЦИАЛЬНО');
        if (!text) return;
        
        try {
            const pages = pdfDoc.getPages();
            const page = pages[currentPage - 1];
            const { width, height } = page.getSize();
            const font = await pdfDoc.embedFont(PDFLib.StandardFonts.HelveticaBold);
            
            // Размещаем по центру под углом
            page.drawText(text, {
                x: width/2 - 150,
                y: height/2,
                size: 60,
                font,
                color: { r:0.8, g:0.8, b:0.8 },
                opacity: 0.3,
                rotate: { angle: 45, type: 'degrees' }
            });
            
            await saveAndReload();
            showNotification('Водяной знак добавлен', 'success');
            updateStatus('Водяной знак добавлен на страницу.');
        } catch (error) {
            console.error(error);
            showNotification('Ошибка добавления водяного знака: ' + error.message, 'error');
        }
    }
    
    async function rotatePage() {
        if (!pdfDoc) return;
        try {
            const pages = pdfDoc.getPages();
            const page = pages[currentPage - 1];
            const rotation = page.getRotation();
            page.setRotation({ angle: (rotation.angle + 90) % 360 });
            await saveAndReload();
            showNotification('Страница повёрнута на 90°', 'success');
        } catch (error) {
            showNotification('Ошибка поворота: ' + error.message, 'error');
        }
    }
    
    async function saveAndReload() {
        const pdfBytes = await pdfDoc.save();
        // Обновляем pdfDoc и pdfJsDoc
        pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);
        pdfJsDoc = await pdfjsLib.getDocument({ data: pdfBytes.slice(0) }).promise;
        await renderPage();
        updatePageInfo();
    }
    
    async function savePdf() {
        if (!pdfDoc) {
            showNotification('Нет загруженного PDF', 'warning');
            return;
        }
        const pdfBytes = await pdfDoc.save();
        downloadBlob(new Blob([pdfBytes], { type: 'application/pdf' }), 'edited.pdf');
        showNotification('PDF сохранён', 'success');
    }
    
    async function extractAndShowText() {
        if (!pdfJsDoc) return;
        const page = await pdfJsDoc.getPage(currentPage);
        const content = await page.getTextContent();
        const text = content.items.map(item => item.str).join(' ');
        document.getElementById('extractedTextContent').textContent = text;
        document.getElementById('extractedTextPanel').style.display = 'block';
    }
    
    function updateStatus(message) {
        const statusEl = document.getElementById('statusArea');
        if (message) {
            statusEl.innerHTML = `<i class="fas fa-info-circle"></i> ${message}`;
        } else {
            const descriptions = {
                edit: 'Режим редактирования: выделите текст мышью, затем измените его в поле и нажмите "Применить".',
                add: 'Режим добавления: введите текст в поле, выберите шрифт/размер/цвет и кликните в нужное место на странице.',
                delete: 'Режим удаления: кликните по тексту, который хотите удалить.',
                watermark: 'Режим водяного знака: нажмите на страницу, чтобы добавить водяной знак (по центру).'
            };
            statusEl.innerHTML = `<i class="fas fa-info-circle"></i> ${descriptions[currentMode]}`;
        }
    }
    
    // Инициализация статуса
    updateStatus('Загрузите PDF файл для начала работы.');
}
