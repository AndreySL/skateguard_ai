// Управление заглушкой медиа-контейнера
export class PlaceholderManager {
    constructor() {
        this.mediaContainer = document.getElementById('media-container');
        this.imagePreview = document.getElementById('image-preview');
        this.videoPreview = document.getElementById('video-preview');
        this.liveVideo = document.getElementById('video');
        this.placeholder = document.getElementById('media-placeholder');
        
        this.observer = null;
        this.styleObserver = null;
        
        this.init();
    }
    
    init() {
        if (!this.mediaContainer) {
            console.warn('Media container not found');
            return;
        }
        
        this.setupObservers();
        this.checkMediaVisibility();
    }
    
    // Проверка наличия медиа-контента
    checkMediaVisibility() {
        const hasImage = this.imagePreview.style.display === 'block' && this.imagePreview.src;
        const hasVideo = this.videoPreview.style.display === 'block' && this.videoPreview.src;
        const hasLiveVideo = this.liveVideo.style.display === 'block' && this.liveVideo.srcObject;
        
        if (hasImage || hasVideo || hasLiveVideo) {
            this.hide();
        } else {
            this.show();
        }
    }
    
    // Показать заглушку
    show() {
        if (this.mediaContainer && this.placeholder) {
            this.mediaContainer.classList.remove('has-media');
        }
    }
    
    // Скрыть заглушку
    hide() {
        if (this.mediaContainer && this.placeholder) {
            this.mediaContainer.classList.add('has-media');
        }
    }
    
    // Настройка наблюдателей за изменениями
    setupObservers() {
        // Наблюдатель за атрибутами элементов
        this.observer = new MutationObserver(() => this.checkMediaVisibility());
        
        if (this.imagePreview) {
            this.observer.observe(this.imagePreview, { 
                attributes: true, 
                attributeFilter: ['style', 'src'] 
            });
        }
        
        if (this.videoPreview) {
            this.observer.observe(this.videoPreview, { 
                attributes: true, 
                attributeFilter: ['style', 'src'] 
            });
        }
        
        if (this.liveVideo) {
            this.observer.observe(this.liveVideo, { 
                attributes: true, 
                attributeFilter: ['style', 'srcObject'] 
            });
        }
        
        // Отдельный наблюдатель за стилями display
        this.styleObserver = new MutationObserver(() => this.checkMediaVisibility());
        
        if (this.imagePreview) {
            this.styleObserver.observe(this.imagePreview, { 
                attributes: true, 
                attributeFilter: ['style'] 
            });
        }
        
        if (this.videoPreview) {
            this.styleObserver.observe(this.videoPreview, { 
                attributes: true, 
                attributeFilter: ['style'] 
            });
        }
        
        if (this.liveVideo) {
            this.styleObserver.observe(this.liveVideo, { 
                attributes: true, 
                attributeFilter: ['style'] 
            });
        }
    }
    
    // Обновить заглушку (можно изменить текст или иконку)
    updatePlaceholder(icon = '📷', text = 'Загрузите изображение или видео', hint = 'Нажмите на кнопки выше, чтобы начать анализ') {
        if (this.placeholder) {
            const iconDiv = this.placeholder.querySelector('.placeholder-icon');
            const textDiv = this.placeholder.querySelector('.placeholder-text');
            const hintDiv = this.placeholder.querySelector('.placeholder-hint');
            
            if (iconDiv) iconDiv.textContent = icon;
            if (textDiv) textDiv.textContent = text;
            if (hintDiv) hintDiv.textContent = hint;
        }
    }
    
    // Показать заглушку с сообщением об ошибке
    showError(message = 'Ошибка загрузки медиа') {
        this.updatePlaceholder('⚠️', message, 'Попробуйте загрузить другой файл');
        this.show();
        
        // Возвращаем стандартный вид через 3 секунды
        setTimeout(() => {
            this.updatePlaceholder();
            this.checkMediaVisibility();
        }, 3000);
    }
    
    // Показать заглушку с загрузкой
    showLoading() {
        this.updatePlaceholder('⏳', 'Загрузка...', 'Пожалуйста, подождите');
        this.show();
    }
    
    // Очистить наблюдатели
    destroy() {
        if (this.observer) {
            this.observer.disconnect();
        }
        if (this.styleObserver) {
            this.styleObserver.disconnect();
        }
    }
}