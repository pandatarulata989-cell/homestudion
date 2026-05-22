/*
 * Home Studio - Scroll Reveal Engine
 * Hooks up elements using IntersectionObserver to trigger luxurious entrance animations
 */

export function initAnimations() {
    setupScrollReveals();
}

function setupScrollReveals() {
    const revealElements = document.querySelectorAll('.reveal-on-scroll');
    if (revealElements.length === 0) return;

    const observerOptions = {
        root: null, // use browser viewport
        rootMargin: '0px 0px -80px 0px', // trigger slightly before entering view
        threshold: 0.1 // 10% element visible
    };

    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const element = entry.target;
                
                // Add visible class
                element.classList.add('is-visible');
                
                // Optional: Handle children delay staggering if it's a parent container
                const staggerChildren = element.querySelectorAll('.reveal-stagger');
                if (staggerChildren.length > 0) {
                    staggerChildren.forEach((child, index) => {
                        child.style.transitionDelay = `${index * 100}ms`;
                        child.classList.add('is-visible');
                    });
                }

                // Stop observing this element once animated
                observer.unobserve(element);
            }
        });
    }, observerOptions);

    revealElements.forEach(element => {
        revealObserver.observe(element);
    });
}
