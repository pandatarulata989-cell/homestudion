/*
 * Home Studio - Hero Carousel & Transitions
 * Manages full-screen imagery transitions, overlay text fades, and slide navigation
 */

export function initHero() {
    const heroSection = document.getElementById('hero-section');
    if (!heroSection) return;

    setupHeroSlider();
}

function setupHeroSlider() {
    const slides = document.querySelectorAll('.hero-slide');
    const dots = document.querySelectorAll('.hero-dot');
    const prevBtn = document.getElementById('hero-prev');
    const nextBtn = document.getElementById('hero-next');
    
    if (slides.length === 0) return;

    let currentSlide = 0;
    let autoplayTimer = null;
    const AUTOPLAY_INTERVAL = 6000; // 6 seconds per slide

    const showSlide = (index) => {
        // Handle out of bounds
        let nextIndex = index;
        if (index >= slides.length) nextIndex = 0;
        if (index < 0) nextIndex = slides.length - 1;

        // Reset classes
        slides.forEach((slide, idx) => {
            slide.classList.add('opacity-0', 'pointer-events-none');
            slide.classList.remove('opacity-100', 'pointer-events-auto');
            
            // Toggle sub-animations inside slides
            const animatedTexts = slide.querySelectorAll('.hero-anim-text');
            animatedTexts.forEach(text => {
                text.classList.remove('animate-fade-in-up');
                // Force layout reflow to restart animation on slide change
                void text.offsetWidth;
            });
        });

        // Set active slide
        slides[nextIndex].classList.remove('opacity-0', 'pointer-events-none');
        slides[nextIndex].classList.add('opacity-100', 'pointer-events-auto');
        
        // Trigger animations in active slide
        slides[nextIndex].querySelectorAll('.hero-anim-text').forEach((text, i) => {
            text.classList.add('animate-fade-in-up');
            // Stagger animations based on index
            text.style.animationDelay = `${(i + 1) * 200}ms`;
        });

        // Update dots
        if (dots.length > 0) {
            dots.forEach(dot => dot.classList.remove('bg-luxury-gold', 'scale-125'));
            dots[nextIndex].classList.add('bg-luxury-gold', 'scale-125');
        }

        currentSlide = nextIndex;
        resetAutoplay();
    };

    const nextSlide = () => showSlide(currentSlide + 1);
    const prevSlide = () => showSlide(currentSlide - 1);

    const resetAutoplay = () => {
        if (autoplayTimer) clearInterval(autoplayTimer);
        autoplayTimer = setInterval(nextSlide, AUTOPLAY_INTERVAL);
    };

    // Event Listeners
    if (prevBtn) prevBtn.addEventListener('click', prevSlide);
    if (nextBtn) nextBtn.addEventListener('click', nextSlide);

    dots.forEach((dot, idx) => {
        dot.addEventListener('click', () => showSlide(idx));
    });

    // Initialize first slide and start autoplay
    showSlide(0);
}
