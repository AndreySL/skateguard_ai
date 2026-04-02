// Управление UI и отображение результатов
export class UI {
    constructor() {
        this.elements = {
            skateCount: document.getElementById('skate-count'),
            personCount: document.getElementById('person-count'),
            violationCount: document.getElementById('violation-count'),
            confidence: document.getElementById('confidence'),
            violationStatus: document.getElementById('violation-status'),
            violationReason: document.getElementById('violation-reason'),
            violationReasonText: document.getElementById('violation-reason-text'),
            terrainInfo: document.getElementById('terrain-info'),
            terrainTypeText: document.getElementById('terrain-type-text'),
            videoStats: document.getElementById('video-stats'),
            videoStatsText: document.getElementById('video-stats-text'),
            imagePreview: document.getElementById('image-preview'),
            videoPreview: document.getElementById('video-preview'),
            progressBar: document.getElementById('progress-bar'),
            progressFill: document.getElementById('progress-fill'),
            processBtn: document.getElementById('process-btn')
        };
    }

    resetAllStats() {
        this.elements.skateCount.textContent = '0';
        this.elements.personCount.textContent = '0';
        this.elements.violationCount.textContent = '0';
        this.elements.confidence.textContent = '0%';
        this.elements.violationStatus.innerHTML = '';
        this.elements.violationReason.style.display = 'none';
        this.elements.terrainInfo.style.display = 'none';
        this.elements.videoStats.style.display = 'none';
    }

    resetPreviews() {
        this.elements.imagePreview.style.display = 'none';
        this.elements.videoPreview.style.display = 'none';
        this.elements.videoPreview.src = '';
        this.elements.imagePreview.src = '';
    }

    setImagePreview(src) {
        this.elements.imagePreview.src = src;
        this.elements.imagePreview.style.display = 'block';
        this.elements.videoPreview.style.display = 'none';
    }

    setVideoPreview(src) {
        this.elements.videoPreview.src = src;
        this.elements.videoPreview.style.display = 'block';
        this.elements.imagePreview.style.display = 'none';
    }

    showProgress() {
        this.elements.progressBar.style.display = 'block';
        this.elements.progressFill.style.width = '0%';
    }

    updateProgress(percent) {
        this.elements.progressFill.style.width = percent + '%';
    }

    hideProgress() {
        this.elements.progressBar.style.display = 'none';
    }

    setProcessButtonLoading(isLoading) {
        if (isLoading) {
            this.elements.processBtn.innerHTML = '<span class="loading"></span> Анализ...';
            this.elements.processBtn.disabled = true;
        } else {
            this.elements.processBtn.innerHTML = '🚀 Запустить анализ';
            this.elements.processBtn.disabled = false;
        }
    }

    displayImageResults(result) {
        this.elements.skateCount.textContent = result.skateboards || 0;
        this.elements.personCount.textContent = result.persons || 0;
        this.elements.violationCount.textContent = result.violation ? 1 : 0;
        this.elements.confidence.textContent = (result.confidence || 0) + '%';

        if (result.violation) {
            this.elements.violationStatus.innerHTML = '<span class="violation-badge violation-yes">⚠️ НАРУШЕНИЕ!</span>';
        } else {
            this.elements.violationStatus.innerHTML = '<span class="violation-badge violation-no">✅ Нарушений не обнаружено</span>';
        }

        if (result.violation && result.violation_reason) {
            this.elements.violationReason.style.display = 'block';
            this.elements.violationReasonText.textContent = result.violation_reason;
        } else {
            this.elements.violationReason.style.display = 'none';
        }

        if (result.location_type) {
            this.elements.terrainInfo.style.display = 'block';
            let terrainText = result.location_type;
            if (result.location_details) {
                terrainText += ` | ${JSON.stringify(result.location_details)}`;
            }
            this.elements.terrainTypeText.textContent = terrainText;
        } else {
            this.elements.terrainInfo.style.display = 'none';
        }

        this.elements.videoStats.style.display = 'none';

        if (result.result_url) {
            this.setImagePreview(result.result_url);
        }
    }

    displayVideoResults(result) {
        this.elements.violationCount.textContent = result.has_violation ? 1 : 0;
        this.elements.skateCount.textContent = result.avg_skateboards || 0;
        this.elements.personCount.textContent = result.avg_persons || 0;
        this.elements.confidence.textContent = 'N/A';

        if (result.has_violation) {
            this.elements.violationStatus.innerHTML = '<span class="violation-badge violation-yes">⚠️ ВИДЕО: НАРУШЕНИЕ!</span>';
        } else {
            this.elements.violationStatus.innerHTML = '<span class="violation-badge violation-no">✅ Видео: нарушений не обнаружено</span>';
        }

        this.elements.violationReason.style.display = 'none';
        this.elements.terrainInfo.style.display = 'none';
        this.elements.videoStats.style.display = 'block';
        this.elements.videoStatsText.innerHTML = `
            📊 Длительность: ${result.duration} сек<br>
            🎬 Всего кадров: ${result.total_frames}<br>
            ⚠️ Кадров с нарушением: ${result.violation_percentage}%<br>
            🛹 В среднем скейтбордов: ${result.avg_skateboards}
        `;

        if (result.result_url) {
            this.setVideoPreview(result.result_url);
        }
    }

    showAlert(message, type, container = document.body) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type}`;
        alertDiv.textContent = message;
        container.appendChild(alertDiv);
        setTimeout(() => alertDiv.remove(), 5000);
    }
}