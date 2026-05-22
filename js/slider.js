/*
 * Home Studio - Reusable Slider Module
 * Generates touch-friendly, drag-scrollable carousels for collections and products
 */

export class ProductSlider {
    /**
     * @param {string|HTMLElement} container - Selector or element of the wrapper
     * @param {Object} options - Slider configuration options
     */
    constructor(container, options = {}) {
        this.container = typeof container === 'string' ? document.querySelector(container) : container;
        if (!this.container) return;

        this.track = this.container.querySelector('.slider-track');
        this.prevBtn = this.container.querySelector('.slider-prev');
        this.nextBtn = this.container.querySelector('.slider-next');
        
        this.options = {
            scrollStep: 320, // default scroll distance in px
            autoplay: false,
            autoplayDelay: 5000,
            ...options
        };

        this.isDown = false;
        this.startX = 0;
        this.scrollLeft = 0;

        this.init();
    }

    init() {
        if (!this.track) return;

        // 1. Mouse Drag to Scroll (Desktop UX)
        this.track.addEventListener('mousedown', (e) => {
            this.isDown = true;
            this.track.classList.add('cursor-grabbing');
            this.startX = e.pageX - this.track.offsetLeft;
            this.scrollLeft = this.track.scrollLeft;
        });

        this.track.addEventListener('mouseleave', () => {
            this.isDown = false;
            this.track.classList.remove('cursor-grabbing');
        });

        this.track.addEventListener('mouseup', () => {
            this.isDown = false;
            this.track.classList.remove('cursor-grabbing');
        });

        this.track.addEventListener('mousemove', (e) => {
            if (!this.isDown) return;
            e.preventDefault();
            const x = e.pageX - this.track.offsetLeft;
            const walk = (x - this.startX) * 1.5; // multiplier for scrolling speed
            this.track.scrollLeft = this.scrollLeft - walk;
        });

        // 2. Buttons Click to Scroll
        if (this.prevBtn) {
            this.prevBtn.addEventListener('click', () => this.scroll('left'));
        }
        if (this.nextBtn) {
            this.nextBtn.addEventListener('click', () => this.scroll('right'));
        }

        // 3. Toggle Button Visibilities on Scroll
        this.track.addEventListener('scroll', () => this.updateButtonVisibility());
        this.updateButtonVisibility();

        // 4. Optional Autoplay
        if (this.options.autoplay) {
            this.startAutoplay();
        }
    }

    scroll(direction) {
        const step = this.options.scrollStep;
        const targetScroll = direction === 'left' 
            ? this.track.scrollLeft - step 
            : this.track.scrollLeft + step;
            
        this.track.scrollTo({
            left: targetScroll,
            behavior: 'smooth'
        });
    }

    updateButtonVisibility() {
        const buffer = 10; // offset tolerance
        
        if (this.prevBtn) {
            if (this.track.scrollLeft <= buffer) {
                this.prevBtn.classList.add('opacity-30', 'pointer-events-none');
            } else {
                this.prevBtn.classList.remove('opacity-30', 'pointer-events-none');
            }
        }

        if (this.nextBtn) {
            const maxScroll = this.track.scrollWidth - this.track.clientWidth;
            if (this.track.scrollLeft >= maxScroll - buffer) {
                this.nextBtn.classList.add('opacity-30', 'pointer-events-none');
            } else {
                this.nextBtn.classList.remove('opacity-30', 'pointer-events-none');
            }
        }
    }

    startAutoplay() {
        this.autoplayInterval = setInterval(() => {
            const maxScroll = this.track.scrollWidth - this.track.clientWidth;
            if (this.track.scrollLeft >= maxScroll - 10) {
                // Loop back to start
                this.track.scrollTo({ left: 0, behavior: 'smooth' });
            } else {
                this.scroll('right');
            }
        }, this.options.autoplayDelay);

        // Pause on user interact
        this.track.addEventListener('mouseenter', () => clearInterval(this.autoplayInterval));
        this.track.addEventListener('mouseleave', () => this.startAutoplay());
    }
}
