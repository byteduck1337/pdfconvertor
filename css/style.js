/* Общие стили */
:root {
    --primary: #667eea;
    --primary-dark: #5a67d8;
    --secondary: #764ba2;
    --success: #48bb78;
    --danger: #f56565;
    --warning: #ed8936;
    --light: #f7fafc;
    --dark: #1a202c;
    --gray: #a0aec0;
    --border-radius: 16px;
    --box-shadow: 0 10px 30px rgba(0,0,0,0.1);
}

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
    padding: 20px;
    color: var(--dark);
}

.container {
    max-width: 1400px;
    margin: 0 auto;
}

/* Анимации */
@keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
}

/* Заголовок */
.header {
    text-align: center;
    color: white;
    margin-bottom: 30px;
    animation: fadeIn 0.6s;
}

.header h1 {
    font-size: 2.8rem;
    margin-bottom: 10px;
    text-shadow: 2px 2px 10px rgba(0,0,0,0.2);
}

/* Табы */
.tabs {
    display: flex;
    gap: 12px;
    margin-bottom: 30px;
    flex-wrap: wrap;
}

.tab-btn {
    background: rgba(255,255,255,0.15);
    backdrop-filter: blur(10px);
    color: white;
    border: none;
    padding: 12px 28px;
    border-radius: 40px;
    cursor: pointer;
    font-size: 1rem;
    font-weight: 600;
    transition: all 0.3s;
    border: 1px solid rgba(255,255,255,0.1);
}

.tab-btn i {
    margin-right: 8px;
}

.tab-btn:hover {
    background: rgba(255,255,255,0.3);
    transform: translateY(-2px);
}

.tab-btn.active {
    background: white;
    color: var(--primary);
    box-shadow: var(--box-shadow);
}

.tab-content {
    display: none;
    animation: fadeIn 0.4s;
}

.tab-content.active {
    display: block;
}

/* Карточки инструментов */
.tool-card {
    background: white;
    border-radius: var(--border-radius);
    padding: 28px;
    box-shadow: var(--box-shadow);
    margin-bottom: 25px;
    transition: transform 0.2s;
}

.tool-card:hover {
    transform: translateY(-5px);
}

.tool-card h3 {
    color: var(--primary-dark);
    margin-bottom: 20px;
    font-size: 1.6rem;
    border-bottom: 2px solid #e2e8f0;
    padding-bottom: 12px;
}

/* Drag & Drop зоны */
.drop-zone {
    border: 3px dashed #cbd5e0;
    border-radius: var(--border-radius);
    padding: 40px 20px;
    text-align: center;
    background: #f8fafc;
    transition: all 0.3s;
    cursor: pointer;
    margin-bottom: 20px;
}

.drop-zone:hover, .drop-zone.dragover {
    border-color: var(--primary);
    background: #edf2f7;
}

.drop-zone i {
    color: var(--primary);
    margin-bottom: 15px;
}

/* Кнопки */
button {
    background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 40px;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.3s;
    margin: 5px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}

button i {
    margin-right: 8px;
}

button:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 15px rgba(102,126,234,0.4);
}

button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
}

.secondary-btn {
    background: #e2e8f0;
    color: var(--dark);
}

.danger-btn {
    background: linear-gradient(135deg, #f56565 0%, #c53030 100%);
}

/* Превью изображений */
.image-preview-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 15px;
    margin: 20px 0;
}

.image-preview-item {
    position: relative;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    transition: all 0.2s;
    background: white;
}

.image-preview-item img {
    width: 100%;
    height: 120px;
    object-fit: cover;
}

.image-preview-item .remove-btn {
    position: absolute;
    top: 5px;
    right: 5px;
    background: rgba(0,0,0,0.5);
    color: white;
    border-radius: 50%;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    padding: 0;
}

/* PDF редактор */
.pdf-toolbar {
    display: flex;
    gap: 15px;
    margin-bottom: 20px;
    flex-wrap: wrap;
}

.canvas-container {
    position: relative;
    display: inline-block;
    max-width: 100%;
    background: #f0f0f0;
    border-radius: 12px;
    overflow: auto;
    box-shadow: inset 0 0 10px rgba(0,0,0,0.05);
}

#pdfCanvas {
    display: block;
    margin: 0 auto;
    cursor: crosshair;
    box-shadow: 0 5px 15px rgba(0,0,0,0.1);
}

.edit-controls {
    background: #f7fafc;
    padding: 15px;
    border-radius: 12px;
    margin: 15px 0;
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
}

.edit-controls select, .edit-controls input {
    padding: 10px 15px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 14px;
}

.mode-selector {
    display: flex;
    gap: 8px;
}

.mode-btn {
    background: #cbd5e0;
    padding: 8px 16px;
    font-size: 14px;
}

.mode-btn.active {
    background: var(--success);
}

/* Список файлов для объединения */
.file-list {
    margin: 15px 0;
}

.file-item {
    display: flex;
    align-items: center;
    padding: 12px;
    background: #f7fafc;
    border-radius: 8px;
    margin-bottom: 8px;
}

.file-item .handle {
    margin-right: 15px;
    cursor: grab;
    color: var(--gray);
}

.file-item .name {
    flex: 1;
}

.file-item .remove {
    color: var(--danger);
    cursor: pointer;
    padding: 5px;
}

/* Статус и уведомления */
.status {
    padding: 12px;
    border-radius: 8px;
    margin-top: 15px;
    background: #edf2f7;
}

.status.success {
    background: #c6f6d5;
    color: #22543d;
}

.status.error {
    background: #fed7d7;
    color: #742a2a;
}

/* Адаптивность */
@media (max-width: 768px) {
    .header h1 { font-size: 2rem; }
    .tool-card { padding: 18px; }
    .edit-controls { flex-direction: column; align-items: stretch; }
}