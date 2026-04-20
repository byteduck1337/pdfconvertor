import { downloadBlob, readFileAsArrayBuffer, showNotification, escapeHtml } from './utils.js';

let mergeFiles = []; // { file, name, arrayBuffer }

export function initMerge() {
    const container = document.getElementById('merge');
    // Уже есть базовая разметка в HTML, но можно дополнить
    
    const dropZone = document.getElementById('mergeDropZone');
    const input = document.getElementById('mergeFileInput');
    const listDiv = document.getElementById('mergeFileList');
    const mergeBtn = document.getElementById('mergeBtn');
    const clearBtn = document.getElementById('clearMergeBtn');
    
    dropZone.addEventListener('click', () => input.click());
    dropZone.addEventListener('dragover', e => e.preventDefault());
    dropZone.addEventListener('drop', async e => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
        await addFiles(files);
    });
    
    input.addEventListener('change', async e => {
        await addFiles(Array.from(e.target.files));
    });
    
    async function addFiles(files) {
        for (const file of files) {
            const arrayBuffer = await readFileAsArrayBuffer(file);
            mergeFiles.push({ file, name: file.name, arrayBuffer });
        }
        renderFileList();
    }
    
    function renderFileList() {
        listDiv.innerHTML = '';
        mergeFiles.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'file-item';
            div.innerHTML = `
                <span class="handle"><i class="fas fa-grip-lines"></i></span>
                <span class="name">${escapeHtml(item.name)}</span>
                <span class="remove" data-index="${index}"><i class="fas fa-times"></i></span>
            `;
            listDiv.appendChild(div);
        });
        
        // Удаление
        document.querySelectorAll('.remove').forEach(btn => {
            btn.addEventListener('click', e => {
                const idx = e.currentTarget.dataset.index;
                mergeFiles.splice(idx, 1);
                renderFileList();
            });
        });
        
        // Drag & drop для сортировки (простая реализация)
        // Можно добавить SortableJS, но для краткости опустим
    }
    
    clearBtn.addEventListener('click', () => {
        mergeFiles = [];
        renderFileList();
        input.value = '';
        showNotification('Список очищен', 'info');
    });
    
    mergeBtn.addEventListener('click', async () => {
        if (mergeFiles.length < 2) {
            showNotification('Добавьте минимум 2 PDF файла', 'warning');
            return;
        }
        
        try {
            const { PDFDocument } = PDFLib;
            const mergedPdf = await PDFDocument.create();
            
            for (const item of mergeFiles) {
                const pdf = await PDFDocument.load(item.arrayBuffer);
                const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
                copiedPages.forEach(page => mergedPdf.addPage(page));
            }
            
            const pdfBytes = await mergedPdf.save();
            downloadBlob(new Blob([pdfBytes], { type: 'application/pdf' }), 'merged.pdf');
            showNotification(`Объединено ${mergeFiles.length} файлов`, 'success');
        } catch (err) {
            showNotification('Ошибка объединения: ' + err.message, 'error');
        }
    });
}