/*
 * Home Studio — Navbar Controller (Robust Event Delegation Edition)
 * - Uses document-level event delegation for rock-solid dynamic component binding
 * - Sticky scroll shadow on header
 * - Mobile nav drawer open / close
 * - Active link highlight
 */

// Global flag to prevent multiple listener attachments
if (typeof window.__navbarEventDelegationSetup === 'undefined') {
    window.__navbarEventDelegationSetup = false;
}

export function initNavbar() {
    console.log('[Home Studio Navbar] initNavbar() called');
    
    // 1. Set up event delegation (only once)
    setupNavbarDelegation();

    // 2. Set up sticky scroll shadow
    setupScrollShadow();

    // 3. Highlight active navigation links
    highlightActiveLinks();

    // 4. Force hamburger visibility — runs after navbar.html injection
    //    Uses setProperty('important') which is absolute max priority
    document.addEventListener('componentsLoaded', forceHamburgerVisibility);
    window.addEventListener('resize', forceHamburgerVisibility);
    // Also run immediately in case injection already completed
    forceHamburgerVisibility();
}

function forceHamburgerVisibility() {
    const btn = document.getElementById('mobile-menu-btn');
    if (!btn) return;
    if (window.innerWidth < 1024) {
        btn.style.setProperty('display', 'flex', 'important');
        btn.style.setProperty('align-items', 'center', 'important');
        btn.style.setProperty('justify-content', 'center', 'important');
    } else {
        btn.style.setProperty('display', 'none', 'important');
    }
}

function setupNavbarDelegation() {
    if (window.__navbarEventDelegationSetup) {
        console.log('[Home Studio Navbar] Event delegation already initialized.');
        return;
    }
    window.__navbarEventDelegationSetup = true;
    console.log('[Home Studio Navbar] Initializing document-level event delegation.');

    // Dynamic drawer selectors
    const getDrawerElements = () => {
        return {
            hamburgerBtn: document.getElementById('mobile-menu-btn'),
            closeBtn: document.getElementById('mobile-nav-close-btn'),
            backdrop: document.getElementById('mobile-nav-backdrop'),
            drawer: document.getElementById('mobile-nav-drawer')
        };
    };

    function openDrawer() {
        const { drawer, backdrop, closeBtn } = getDrawerElements();
        console.log('[Home Studio Navbar] openDrawer() called', { drawer: !!drawer, backdrop: !!backdrop });
        
        if (drawer) drawer.classList.add('open');
        if (backdrop) backdrop.classList.add('open');
        document.body.style.overflow = 'hidden';
        if (closeBtn) closeBtn.focus();
    }

    function closeDrawer() {
        const { drawer, backdrop, hamburgerBtn } = getDrawerElements();
        console.log('[Home Studio Navbar] closeDrawer() called', { drawer: !!drawer, backdrop: !!backdrop });
        
        if (drawer) drawer.classList.remove('open');
        if (backdrop) backdrop.classList.remove('open');
        document.body.style.overflow = '';
        if (hamburgerBtn) hamburgerBtn.focus();
    }

    // Capture clicks at the document level
    document.addEventListener('click', (e) => {
        // Find closest matching interactive element
        const hamburgerClick = e.target.closest('#mobile-menu-btn');
        const closeClick = e.target.closest('#mobile-nav-close-btn');
        const backdropClick = e.target.closest('#mobile-nav-backdrop');

        if (hamburgerClick) {
            e.preventDefault();
            openDrawer();
            return;
        }

        if (closeClick) {
            e.preventDefault();
            closeDrawer();
            return;
        }

        if (backdropClick) {
            e.preventDefault();
            closeDrawer();
            return;
        }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const { drawer } = getDrawerElements();
            if (drawer && drawer.classList.contains('open')) {
                closeDrawer();
            }
        }
    });
}

function setupScrollShadow() {
    const onScroll = () => {
        const header = document.querySelector('header');
        if (header) {
            header.classList.toggle('shadow-md', window.scrollY > 20);
        }
    };
    
    // Listen to scroll events
    window.addEventListener('scroll', onScroll, { passive: true });
    // Run once immediately
    onScroll();
    
    // Also run when components load
    document.addEventListener('componentsLoaded', onScroll);
}

function highlightActiveLinks() {
    const runHighlight = () => {
        const path = window.location.pathname;
        document.querySelectorAll('nav a, .mnav-links a').forEach(link => {
            const href = link.getAttribute('href');
            if (href && href !== '#' && (path.endsWith(href) || (path === '/' && href === 'index.html'))) {
                link.classList.add('text-luxury-gold');
            } else {
                link.classList.remove('text-luxury-gold');
            }
        });
    };

    // Run immediately if DOM is ready
    runHighlight();

    // Also listen to componentsLoaded event to highlight newly injected links
    document.addEventListener('componentsLoaded', runHighlight);
}
