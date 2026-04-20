import { downloadBlob, readFileAsArrayBuffer, showNotification, escapeHtml } from './utils.js';

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
                <button id="applyEditBtn">Применить</button>
            </div>
            
            <div class="canvas-container">
                <canvas id="pdfCanvas"></canvas>
            </div>
            
            <div style="display:flex; justify-content:center; gap:20px; margin:15px 0;">
                <button id="prevPageBtn"><i class="fas fa-chevron-left"></i> Пред.</button>
                <span id="pageInfo">Страница 0 / 0</span>
                <button id="nextPageBtn">След. <i class="fas fa-chevron-right"></i></button>
            </div>
            
            <div id="statusArea" class="status"></div>
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
    
    // Инициализация PDF.js worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
    
    const selectBtn = document.getElementById('selectPdfBtn');
    const fileInput = document.getElementById('pdfInput');
    const dropZone = document.getElementById('pdfDropZone');
    
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
    
    // Обработчики кнопок
    document.getElementById('savePdfBtn').addEventListener('click', savePdf);
    document.getElementById('rotateCwBtn').addEventListener('click', rotatePage);
    document.getElementById('extractTextBtn').addEventListener('click', extractAndShowText);
    document.getElementById('prevPageBtn').addEventListener('click', () => changePage(-1));
    document.getElementById('nextPageBtn').addEventListener('click', () => changePage(1));
    document.getElementById('applyEditBtn').addEventListener('click', applyEdit);
    
    // Режимы
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentMode = btn.dataset.mode;
            updateStatus();
        });
    });
    
    // Обработчики canvas
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
    
    // Функции
    async function loadPdf(file) {
        try {
            const arrayBuffer = await readFileAsArrayBuffer(file);
            pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
            pdfJsDoc = await pdfjsLib.getDocument({ data: arrayBuffer.slice(0) }).promise;
            totalPages = pdfJsDoc.numPages;
            currentPage = 1;
            await renderPage();
            updatePageInfo();
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
        
        // Извлекаем текстовые элементы для выделения
        const textContent = await page.getTextContent();
        extractedItems = textContent.items.map(item => {
            const tx = item.transform;
            // Координаты в пикселях canvas
            const x = tx[4] * scale;
            const y = canvas.height - (tx[5] * scale); // Инверсия Y
            const width = (item.width || 0) * scale;
            const height = (item.height || Math.abs(tx[0]) * 1.2) * scale;
            return {
                text: item.str,
                x, y, width, height,
                original: item
            };
        });
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
        }
    }
    
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
    }
    
    function onMouseMove(e) {
        if (!isSelecting) return;
        // Можно рисовать прямоугольник выделения
    }
    
    function onMouseUp(e) {
        if (!isSelecting) return;
        isSelecting = false;
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
            updateStatus(`Выделено: "${selected.text.substring(0, 30)}..."`);
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
        
        // Сортировка и объединение текста
        items.sort((a, b) => b.y - a.y || a.x - b.x);
        const text = items.map(i => i.text).join(' ');
        return { text, items, bounds: { minX, maxX, minY, maxY } };
    }
    
    async function onCanvasClick(e) {
        if (!pdfDoc) return;
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
            await addWatermark();
        }
    }
    
    async function applyEdit() {
        if (currentMode === 'edit' && selectedTextRange) {
            await replaceText();
        }
    }
    
    async function replaceText() {
        const newText = document.getElementById('editTextInput').value.trim();
        if (!newText) return;
        // Реализация замены через pdf-lib
        const pages = pdfDoc.getPages();
        const page = pages[currentPage - 1];
        const { height } = page.getSize();
        
        // Получаем настройки шрифта
        const fontName = document.getElementById('fontSelect').value;
        let font;
        if (fontName === 'times') font = await pdfDoc.embedFont(PDFLib.StandardFonts.TimesRoman);
        else if (fontName === 'courier') font = await pdfDoc.embedFont(PDFLib.StandardFonts.Courier);
        else font = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
        
        const fontSize = parseInt(document.getElementById('fontSize').value);
        const colorName = document.getElementById('fontColor').value;
        const color = { black: { r:0,g:0,b:0 }, red: { r:1,g:0,b:0 }, blue: { r:0,g:0,b:1 }, green: { r:0,g:1,b:0 } }[colorName];
        
        // Координаты в системе PDF (пересчёт из canvas)
        const pdfX = selectedTextRange.items[0].x / scale;
        const pdfY = height - (selectedTextRange.items[0].y / scale);
        
        // Закрашиваем старый текст
        page.drawRectangle({
            x: pdfX - 2,
            y: pdfY - fontSize - 2,
            width: (selectedTextRange.bounds.maxX - selectedTextRange.bounds.minX)/scale + 4,
            height: fontSize + 4,
            color: { r:1, g:1, b:1 }
        });
        
        // Рисуем новый текст
        page.drawText(newText, {
            x: pdfX,
            y: pdfY - fontSize,
            size: fontSize,
            font,
            color
        });
        
        await saveAndReload();
        showNotification('Текст заменён', 'success');
        selectedTextRange = null;
    }
    
    async function addTextAt(x, y) {
        const text = document.getElementById('editTextInput').value.trim();
        if (!text) { showNotification('Введите текст', 'warning'); return; }
        
        const pages = pdfDoc.getPages();
        const page = pages[currentPage - 1];
        const { height } = page.getSize();
        const pdfX = x / scale;
        const pdfY = height - (y / scale);
        
        // ... аналогично настройка шрифта и рисование
        const font = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
        const fontSize = parseInt(document.getElementById('fontSize').value);
        page.drawText(text, { x: pdfX, y: pdfY - fontSize, size: fontSize, font });
        
        await saveAndReload();
        showNotification('Текст добавлен', 'success');
    }
    
    async function deleteTextAt(x, y) {
        const item = extractedItems.find(i => 
            x >= i.x && x <= i.x + i.width && y >= i.y && y <= i.y + i.height
        );
        if (!item) { showNotification('Текст не найден', 'warning'); return; }
        
        const pages = pdfDoc.getPages();
        const page = pages[currentPage - 1];
        const { height } = page.getSize();
        const pdfX = item.x / scale;
        const pdfY = height - (item.y / scale);
        
        page.drawRectangle({
            x: pdfX - 2,
            y: pdfY - item.height/scale - 2,
            width: item.width/scale + 4,
            height: item.height/scale + 4,
            color: { r:1, g:1, b:1 }
        });
        
        await saveAndReload();
        showNotification(`Текст "${item.text}" удалён`, 'success');
    }
    
    async function rotatePage() {
        const pages = pdfDoc.getPages();
        const page = pages[currentPage - 1];
        const rotation = page.getRotation();
        page.setRotation({ angle: (rotation.angle + 90) % 360 });
        await saveAndReload();
        showNotification('Страница повёрнута', 'success');
    }
    
    async function addWatermark() {
        const text = prompt('Введите текст водяного знака:', 'КОНФИДЕНЦИАЛЬНО');
        if (!text) return;
        
        const pages = pdfDoc.getPages();
        const page = pages[currentPage - 1];
        const { width, height } = page.getSize();
        const font = await pdfDoc.embedFont(PDFLib.StandardFonts.HelveticaBold);
        
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
    }
    
    async function saveAndReload() {
        const pdfBytes = await pdfDoc.save();
        pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);
        pdfJsDoc = await pdfjsLib.getDocument({ data: pdfBytes.slice(0) }).promise;
        await renderPage();
    }
    
    async function savePdf() {
        if (!pdfDoc) return;
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
    
    function updateStatus(msg) {
        document.getElementById('statusArea').innerHTML = msg || getModeDescription();
    }
    
    function getModeDescription() {
        const desc = {
            edit: 'Режим редактирования: выделите текст и нажмите "Применить"',
            add: 'Режим добавления: введите текст и кликните на страницу',
            delete: 'Режим удаления: кликните по тексту для удаления',
            watermark: 'Режим водяного знака: нажмите на страницу для добавления'
        };
        return desc[currentMode] || '';
    }
    updateStatus();
}