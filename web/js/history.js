// Управление историей
export class HistoryManager {
    constructor(api, ui, historyListElement) {
        this.api = api;
        this.ui = ui;
        this.historyList = historyListElement;
    }

    async load() {
        try {
            const history = await this.api.getHistory(50);

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

    async clear() {
        if (!confirm('Вы уверены, что хотите очистить всю историю?')) return;
        try {
            await this.api.clearHistory();
            this.ui.showAlert('История очищена', 'success');
            await this.load();
        } catch (error) {
            this.ui.showAlert('Ошибка при очистке истории', 'error');
        }
    }

    exportPDF() {
        this.api.exportPDF();
    }

    exportExcel() {
        this.api.exportExcel();
    }
}