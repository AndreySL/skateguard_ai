// Обработка файлов и медиа
export class MediaHandler {
    constructor(ui, camera) {
        this.ui = ui;
        this.camera = camera;
        this.currentFile = null;
        this.currentFileType = null;
    }

    handleFileSelect(file, type) {
        if (!file) return;

        this.reset();
        this.currentFile = file;
        this.currentFileType = type;

        if (type === 'image') {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.ui.setImagePreview(e.target.result);
            };
            reader.readAsDataURL(file);
            this.ui.showAlert(`Изображение загружено: ${file.name}`, 'success');
        } else if (type === 'video') {
            const url = URL.createObjectURL(file);
            this.ui.setVideoPreview(url);
            this.ui.showAlert(`Видео загружено: ${file.name}. Нажмите "Анализ"`, 'success');
        }

        return true;
    }

    async getFileForProcessing() {
        if (this.currentFileType === 'camera' && this.camera.isActive()) {
            return await this.camera.captureFrame();
        }
        return this.currentFile;
    }

    getEndpoint() {
        if (this.currentFileType === 'video') {
            return 'video';
        }
        return 'image';
    }

    reset() {
        this.currentFile = null;
        this.currentFileType = null;
        this.ui.resetAllStats();
        this.ui.resetPreviews();
    }

    hasFile() {
        return this.currentFile !== null || this.currentFileType === 'camera';
    }
}