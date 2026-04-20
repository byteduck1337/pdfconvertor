// Главный модуль приложения
import { initConverter } from './converter.js';
import { initPdfEditor } from './pdfEditor.js';
import { initMerge } from './merge.js'; // мы создадим merge.js отдельно

// Инициализация вкладок
function initTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.dataset.tab;
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(tabId).classList.add('active');
        });
    });
}

// Загрузка модулей
document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initConverter();
    initPdfEditor();
    initMerge();
    
    console.log('PDF Мастер готов к работе!');
});