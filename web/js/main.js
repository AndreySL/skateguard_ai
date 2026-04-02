import { API } from './api.js';
import { UI } from './ui.js';
import { Camera } from './camera.js';
import { MediaHandler } from './media-handler.js';
import { HistoryManager } from './history.js';
import { PlaceholderManager } from './placeholder.js';

class SkateGuard {
    constructor() {
        this.video = document.getElementById('video');
        this.videoPreview = document.getElementById('video-preview');
        this.imagePreview = document.getElementById('image-preview');
        this.fileInput = document.getElementById('file-input');
        this.videoInput = document.getElementById('video-input');
        this.processBtn = document.getElementById('process-btn');
        this.cameraBtn = document.getElementById('camera-btn');
        this.stopCameraBtn = document.getElementById('stop-camera');
        this.historyList = document.getElementById('history-list');
        this.progressBar = document.getElementById('progress-bar');
        this.progressFill = document.getElementById('progress-fill');
        
        this.stream = null;
        this.currentFile = null;
        this.currentFileType = null;
        this.currentVideoId = null;
        this.statusInterval = null;
        this.apiBase = 'http://localhost:8000';

        this.init();
    }

    async init() {
        this.bindEvents();
        await this.loadHistory();
        this.resetAllStats();
        this.processBtn.disabled = true;
    }

    bindEvents() {
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e, 'image'));
        this.videoInput.addEventListener('change', (e) => this.handleFileSelect(e, 'video'));
        this.cameraBtn.addEventListener('click', () => this.startCamera());
        this.stopCameraBtn.addEventListener('click', () => this.stopCamera());
        this.processBtn.addEventListener('click', () => this.processMedia());
        
        document.getElementById('refresh-history').addEventListener('click', () => this.loadHistory());
        document.getElementById('export-pdf').addEventListener('click', () => this.exportPDF());
        document.getElementById('export-excel').addEventListener('click', () => this.exportExcel());
        document.getElementById('clear-history').addEventListener('click', () => this.clearHistory());
    }

    resetAllStats() {
        document.getElementById('skate-count').textContent = '0';
        document.getElementById('person-count').textContent = '0';
        document.getElementById('violation-count').textContent = '0';
        document.getElementById('confidence').textContent = '0%';
        
        const statusDiv = document.getElementById('violation-status');
        statusDiv.innerHTML = '';
        
        document.getElementById('violation-reason').style.display = 'none';
        document.getElementById('terrain-info').style.display = 'none';
        document.getElementById('video-stats').style.display = 'none';
    }

    resetBeforeNewUpload() {
        this.resetAllStats();
        this.imagePreview.style.display = 'none';
        this.videoPreview.style.display = 'none';
        this.videoPreview.src = '';
        this.imagePreview.src = '';
        this.stopCamera();
        this.currentFile = null;
        this.currentFileType = null;
        // НЕ БЛОКИРУЕМ КНОПКУ ЗДЕСЬ! Она будет активирована после загрузки файла
        this.progressBar.style.display = 'none';
        
        if (this.statusInterval) {
            clearInterval(this.statusInterval);
            this.statusInterval = null;
        }
    }

    handleFileSelect(e, type) {
        const file = e.target.files[0];
        if (!file) return;

        this.resetBeforeNewUpload();
        this.currentFile = file;
        this.currentFileType = type;

        if (type === 'image') {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.imagePreview.src = e.target.result;
                this.imagePreview.style.display = 'block';
                // Скрываем заглушку если она есть
                const placeholder = document.getElementById('media-placeholder');
                if (placeholder) {
                    placeholder.style.display = 'none';
                }
            };
            reader.readAsDataURL(file);
            this.showAlert(`Изображение загружено: ${file.name}`, 'success');
        } else if (type === 'video') {
            const url = URL.createObjectURL(file);
            this.videoPreview.src = url;
            this.videoPreview.style.display = 'block';
            // Скрываем заглушку если она есть
            const placeholder = document.getElementById('media-placeholder');
            if (placeholder) {
                placeholder.style.display = 'none';
            }
            this.showAlert(`Видео загружено: ${file.name}. Нажмите "Анализ"`, 'success');
        }

        // АКТИВИРУЕМ КНОПКУ после загрузки файла
        this.processBtn.disabled = false;
    }

    async startCamera() {
        this.resetBeforeNewUpload();
        
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ 
                video: { width: 640, height: 480 } 
            });
            this.video.srcObject = this.stream;
            this.video.style.display = 'block';
            this.cameraBtn.disabled = true;
            this.stopCameraBtn.disabled = false;
            this.processBtn.disabled = false;
            this.currentFileType = 'camera';
            this.currentFile = null;
            
            // Скрываем заглушку
            const placeholder = document.getElementById('media-placeholder');
            if (placeholder) {
                placeholder.style.display = 'none';
            }
            
            this.showAlert('Камера запущена. Нажмите "Анализ" для захвата кадра', 'success');
        } catch (err) {
            this.showAlert('Ошибка доступа к камере: ' + err.message, 'error');
        }
    }

    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        this.video.style.display = 'none';
        this.cameraBtn.disabled = false;
        this.stopCameraBtn.disabled = true;
        // Не блокируем кнопку здесь, только если нет файла
        if (!this.currentFile) {
            this.processBtn.disabled = true;
            // Показываем заглушку
            const placeholder = document.getElementById('media-placeholder');
            if (placeholder && !this.imagePreview.src && !this.videoPreview.src) {
                placeholder.style.display = 'flex';
            }
        }
    }

    async processMedia() {
        if (!this.currentFile && this.currentFileType !== 'camera') {
            this.showAlert('Сначала загрузите изображение, видео или включите камеру', 'error');
            return;
        }

        this.processBtn.disabled = true;
        this.processBtn.innerHTML = '<span class="loading"></span> Анализ...';
        
        try {
            let fileToSend = this.currentFile;
            let endpoint = '/process_image';
            
            if (this.currentFileType === 'camera' && this.video.srcObject) {
                const canvas = document.createElement('canvas');
                canvas.width = this.video.videoWidth;
                canvas.height = this.video.videoHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(this.video, 0, 0);
                const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg'));
                fileToSend = new File([blob], 'camera_capture.jpg', { type: 'image/jpeg' });
                endpoint = '/process_image';
            } else if (this.currentFileType === 'video') {
                endpoint = '/process_video';
            }
            
            if (!fileToSend) {
                this.showAlert('Сначала загрузите изображение, видео или включите камеру', 'error');
                this.processBtn.disabled = false;
                this.processBtn.innerHTML = '🚀 Запустить анализ';
                return;
            }
            
            const formData = new FormData();
            formData.append('file', fileToSend);
            
            const response = await fetch(`${this.apiBase}${endpoint}`, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`Сервер ответил: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.type === 'image' || endpoint === '/process_image') {
                this.displayResults(result);
                await this.loadHistory();
                this.processBtn.innerHTML = '🚀 Запустить анализ';
                this.processBtn.disabled = false;
            } else if (result.video_id) {
                this.currentVideoId = result.video_id;
                this.progressBar.style.display = 'block';
                this.progressFill.style.width = '0%';
                this.startStatusPolling();
            }
            
        } catch (error) {
            console.error('Ошибка:', error);
            this.showAlert('Ошибка при анализе: ' + error.message, 'error');
            this.processBtn.innerHTML = '🚀 Запустить анализ';
            this.processBtn.disabled = false;
            this.progressBar.style.display = 'none';
        }
    }
    
    startStatusPolling() {
        if (this.statusInterval) {
            clearInterval(this.statusInterval);
        }
        
        this.statusInterval = setInterval(async () => {
            try {
                const response = await fetch(`${this.apiBase}/video_status/${this.currentVideoId}`);
                const data = await response.json();
                
                if (data.status === 'completed') {
                    clearInterval(this.statusInterval);
                    this.statusInterval = null;
                    this.progressFill.style.width = '100%';
                    setTimeout(() => {
                        this.progressBar.style.display = 'none';
                        this.displayResults(data.result);
                        this.loadHistory();
                    }, 500);
                    this.processBtn.innerHTML = '🚀 Запустить анализ';
                    this.processBtn.disabled = false;
                } else if (data.status === 'error') {
                    clearInterval(this.statusInterval);
                    this.statusInterval = null;
                    this.progressBar.style.display = 'none';
                    this.showAlert('Ошибка обработки видео: ' + (data.error || 'Неизвестная ошибка'), 'error');
                    this.processBtn.innerHTML = '🚀 Запустить анализ';
                    this.processBtn.disabled = false;
                } else if (data.progress !== undefined) {
                    this.progressFill.style.width = data.progress + '%';
                }
            } catch (error) {
                console.error('Ошибка опроса статуса:', error);
            }
        }, 1000);
    }
    
    displayResults(result) {
        if (result.type === 'image') {
            document.getElementById('skate-count').textContent = result.skateboards || 0;
            document.getElementById('person-count').textContent = result.persons || 0;
            document.getElementById('violation-count').textContent = result.violation ? 1 : 0;
            document.getElementById('confidence').textContent = (result.confidence || 0) + '%';
            
            const statusDiv = document.getElementById('violation-status');
            if (result.violation) {
                statusDiv.innerHTML = '<span class="violation-badge violation-yes">⚠️ НАРУШЕНИЕ!</span>';
                this.showAlert(`⚠️ НАРУШЕНИЕ! ${result.violation_reason || ''}`, 'error');
            } else {
                statusDiv.innerHTML = '<span class="violation-badge violation-no">✅ Нарушений не обнаружено</span>';
                this.showAlert(`✅ Нарушений не обнаружено`, 'success');
            }
            
            if (result.violation && result.violation_reason) {
                document.getElementById('violation-reason').style.display = 'block';
                document.getElementById('violation-reason-text').textContent = result.violation_reason;
            } else {
                document.getElementById('violation-reason').style.display = 'none';
            }
            
            if (result.location_type) {
                document.getElementById('terrain-info').style.display = 'block';
                let terrainText = result.location_type;
                if (result.location_details) {
                    terrainText += ` | ${JSON.stringify(result.location_details)}`;
                }
                document.getElementById('terrain-type-text').textContent = terrainText;
            } else {
                document.getElementById('terrain-info').style.display = 'none';
            }
            
            document.getElementById('video-stats').style.display = 'none';
            
            if (result.result_url) {
                this.imagePreview.src = result.result_url;
                this.imagePreview.style.display = 'block';
                this.videoPreview.style.display = 'none';
            }
            
        } else if (result.type === 'video') {
            document.getElementById('violation-count').textContent = result.has_violation ? 1 : 0;
            document.getElementById('skate-count').textContent = result.avg_skateboards || 0;
            document.getElementById('person-count').textContent = result.avg_persons || 0;
            document.getElementById('confidence').textContent = 'N/A';
            
            const statusDiv = document.getElementById('violation-status');
            if (result.has_violation) {
                statusDiv.innerHTML = '<span class="violation-badge violation-yes">⚠️ ВИДЕО: НАРУШЕНИЕ!</span>';
                this.showAlert(`⚠️ В видео обнаружены нарушения в ${result.violation_percentage}% кадров!`, 'error');
            } else {
                statusDiv.innerHTML = '<span class="violation-badge violation-no">✅ Видео: нарушений не обнаружено</span>';
                this.showAlert(`✅ Видео проанализировано. Нарушений нет.`, 'success');
            }
            
            document.getElementById('violation-reason').style.display = 'none';
            document.getElementById('terrain-info').style.display = 'none';
            document.getElementById('video-stats').style.display = 'block';
            document.getElementById('video-stats-text').innerHTML = `
                📊 Длительность: ${result.duration} сек<br>
                🎬 Всего кадров: ${result.total_frames}<br>
                ⚠️ Кадров с нарушением: ${result.violation_percentage}%<br>
                🛹 В среднем скейтбордов: ${result.avg_skateboards}
            `;
            
            if (result.result_url) {
                this.videoPreview.src = result.result_url;
                this.videoPreview.style.display = 'block';
                this.imagePreview.style.display = 'none';
            }
        }
    }
    
    async loadHistory() {
        try {
            const response = await fetch(`${this.apiBase}/history?limit=50`);
            if (!response.ok) throw new Error('Ошибка загрузки истории');
            
            const history = await response.json();
            
            if (history.length === 0) {
                this.historyList.innerHTML = '<div style="text-align: center; padding: 2rem; color: #6c757d;">Нет данных. Загрузите изображение или видео для анализа.</div>';
                return;
            }
            
            this.historyList.innerHTML = history.map(entry => `
                <div class="history-item">
                    <div>
                        <strong>${entry.timestamp}</strong><br>
                        ${entry.type === 'image' ? '📷' : '🎬'} ${(entry.name || '').substring(0, 30)}<br>
                        ${entry.type === 'image' ? 
                            `🛹 ${entry.skateboards_detected || 0} скейтбордов | 👤 ${entry.persons_detected || 0} людей` :
                            `🎬 Длит: ${entry.duration || 0}с | ⚠️ ${entry.violation_percentage || 0}% нарушений`
                        }
                    </div>
                    <div style="text-align: right;">
                        <div style="color: ${entry.violation ? '#dc3545' : '#28a745'}; font-weight: bold;">
                            ${entry.violation ? '⚠️ Нарушение' : '✅ OK'}
                        </div>
                    </div>
                </div>
            `).join('');
            
        } catch (error) {
            console.error('Ошибка загрузки истории:', error);
            this.historyList.innerHTML = '<div style="text-align: center; padding: 2rem; color: #dc3545;">⚠️ Ошибка загрузки истории. Убедитесь, что сервер запущен.</div>';
        }
    }
    
    async exportPDF() {
        window.open(`${this.apiBase}/report/pdf`, '_blank');
    }
    
    async exportExcel() {
        window.open(`${this.apiBase}/report/excel`, '_blank');
    }
    
    async clearHistory() {
        if (!confirm('Вы уверены, что хотите очистить всю историю?')) return;
        try {
            await fetch(`${this.apiBase}/clear_history`, { method: 'POST' });
            this.showAlert('История очищена', 'success');
            await this.loadHistory();
        } catch (error) {
            this.showAlert('Ошибка при очистке истории', 'error');
        }
    }
    
    showAlert(message, type) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type}`;
        alertDiv.textContent = message;
        document.body.appendChild(alertDiv);
        setTimeout(() => alertDiv.remove(), 5000);
    }
}

// Инициализация приложения после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    new SkateGuard();
});