// Управление камерой
export class Camera {
    constructor(videoElement) {
        this.video = videoElement;
        this.stream = null;
    }

    async start() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480 }
            });
            this.video.srcObject = this.stream;
            this.video.style.display = 'block';
            return true;
        } catch (err) {
            throw new Error('Ошибка доступа к камере: ' + err.message);
        }
    }

    stop() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        this.video.style.display = 'none';
        this.video.srcObject = null;
    }

    captureFrame() {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            canvas.width = this.video.videoWidth;
            canvas.height = this.video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(this.video, 0, 0);
            canvas.toBlob(blob => {
                resolve(new File([blob], 'camera_capture.jpg', { type: 'image/jpeg' }));
            }, 'image/jpeg');
        });
    }

    isActive() {
        return this.stream !== null;
    }
}