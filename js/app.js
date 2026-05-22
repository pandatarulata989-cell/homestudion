/*
 * Home Studio - Main Application Entry (ES Module)
 * Bootstraps the application, loads modular components, and manages global scripts
 */

import { initNavbar } from './navbar.js';
import { initAnimations } from './animations.js';
import { initCart } from './cart.js';

const bootstrap = async () => {
    // 1. Dynamic component loading
    await loadHTMLComponents();
    
    // 2. Initialize global modules
    initNavbar();
    initAnimations();
    initCart();
    
    // 3. Performance optimizations (Image fallback lazy loading, scroll tweaks)
    initPerformance();
    
    // 4. Hide full-page pre-loader
    const loader = document.getElementById('full-page-loader');
    if (loader) {
        loader.classList.add('opacity-0', 'pointer-events-none');
        setTimeout(() => loader.remove(), 500);
    }
    
    console.log('Home Studio luxury platform loaded successfully.');
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
} else {
    bootstrap();
}


/**
 * Dynamic HTML Component Injector
 * Finds elements with [data-include="path/to/file.html"] and embeds their contents
 */
async function loadHTMLComponents() {
    const placeholders = document.querySelectorAll('[data-include]');
    if (placeholders.length === 0) return;

    const loadPromises = Array.from(placeholders).map(async (placeholder) => {
        const filePath = placeholder.getAttribute('data-include');
        try {
            const response = await fetch(filePath, { cache: 'no-store' });
            if (!response.ok) throw new Error(`Failed to load ${filePath}: ${response.statusText}`);
            const html = await response.text();
            
            // Replace placeholder with ALL imported component children
            // (some components like navbar have multiple root siblings: wrapper + backdrop + drawer)
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html.trim();

            if (tempDiv.children.length > 0) {
                // Carry over ID/class from placeholder onto the first child only
                const first = tempDiv.firstElementChild;
                if (placeholder.id) first.id = placeholder.id;
                if (placeholder.className) first.className += ' ' + placeholder.className;

                // Insert every child element before the placeholder, then remove it
                const children = Array.from(tempDiv.children);
                console.log(`[Home Studio App] Injecting component ${filePath} with ${children.length} elements:`, children.map(el => el.id || el.tagName));
                children.forEach(child => {
                    placeholder.parentNode.insertBefore(child, placeholder);
                });
                placeholder.remove();
            } else {
                placeholder.outerHTML = html;
            }

        } catch (error) {
            console.error(`Component injection error for path "${filePath}":`, error);
            placeholder.innerHTML = `<div class="p-4 text-center border border-dashed border-red-200 text-red-800 bg-red-50/50 rounded-lg text-sm">Failed to load system component: ${filePath}</div>`;
        }
    });

    await Promise.all(loadPromises);
    // Dispatch event indicating navbar, footer, etc. are loaded in DOM
    window.__componentsLoaded = true;
    document.dispatchEvent(new CustomEvent('componentsLoaded'));
}

/**
 * Performance optimization setups
 */
function initPerformance() {
    // Intersection Observer for image lazy-loading fallback (for old browsers)
    if (!('loading' in HTMLImageElement.prototype)) {
        const lazyImages = document.querySelectorAll('img[loading="lazy"]');
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const image = entry.target;
                        if (image.dataset.src) {
                            image.src = image.dataset.src;
                            image.removeAttribute('data-src');
                        }
                        imageObserver.unobserve(image);
                    }
                });
            });
            lazyImages.forEach(img => imageObserver.observe(img));
        }
    }
}
