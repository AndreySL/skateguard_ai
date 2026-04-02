// API взаимодействие с бэкендом
export class API {
    constructor(baseUrl = 'http://localhost:8000') {
        this.baseUrl = baseUrl;
    }

    async processImage(file) {
        const formData = new FormData();
        formData.append('file', file);
        const response = await fetch(`${this.baseUrl}/process_image`, {
            method: 'POST',
            body: formData
        });
        if (!response.ok) throw new Error(`Сервер ответил: ${response.status}`);
        return await response.json();
    }

    async processVideo(file) {
        const formData = new FormData();
        formData.append('file', file);
        const response = await fetch(`${this.baseUrl}/process_video`, {
            method: 'POST',
            body: formData
        });
        if (!response.ok) throw new Error(`Сервер ответил: ${response.status}`);
        return await response.json();
    }

    async getVideoStatus(videoId) {
        const response = await fetch(`${this.baseUrl}/video_status/${videoId}`);
        return await response.json();
    }

    async getHistory(limit = 50) {
        const response = await fetch(`${this.baseUrl}/history?limit=${limit}`);
        if (!response.ok) throw new Error('Ошибка загрузки истории');
        return await response.json();
    }

    async clearHistory() {
        const response = await fetch(`${this.baseUrl}/clear_history`, { method: 'POST' });
        return await response.json();
    }

    exportPDF() {
        window.open(`${this.baseUrl}/report/pdf`, '_blank');
    }

    exportExcel() {
        window.open(`${this.baseUrl}/report/excel`, '_blank');
    }
}