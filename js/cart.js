/*
 * Home Studio - Cart Module
 * Manages standard cart state, localStorage persistence, quantity mutations, and price math
 */

const CART_STORAGE_KEY = 'home_studio_cart';

export function initCart() {
    // 1. Initial Cart Counter Update
    updateCartUI();

    // 2. Register global event listener for dynamic product card clicks
    document.addEventListener('click', async (e) => {
        const quickAddBtn = e.target.closest('.add-to-cart-quick');
        if (quickAddBtn) {
            const card = quickAddBtn.closest('[data-product-id]');
            if (card) {
                const productId = card.getAttribute('data-product-id');
                const { getProductById } = await import('./products.js');
                const product = await getProductById(productId);
                
                if (product) {
                    addToCart(product, 1);
                    // Dispatched feedback animation / notification can occur here
                    showCartNotification(product.name);
                }
            }
        }
    });
}

/**
 * Get current items in cart
 * @returns {Array} Array of cart objects
 */
export function getCart() {
    const rawData = localStorage.getItem(CART_STORAGE_KEY);
    return rawData ? JSON.parse(rawData) : [];
}

/**
 * Save items back to localStorage and trigger updates
 * @param {Array} cartItems 
 */
export function saveCart(cartItems) {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
    updateCartUI();
    // Dispatch general event so detail pages, cart drawers, or cart pages can update
    document.dispatchEvent(new CustomEvent('cartUpdated', { detail: cartItems }));
}

/**
 * Add product to cart
 * @param {Object} product - Product object
 * @param {number} qty - Quantity
 * @param {Object} selectedOptions - e.g., { color: 'Beige' }
 */
export function addToCart(product, qty = 1, selectedOptions = {}) {
    const cart = getCart();
    
    // Check if item with same ID and options already exists
    const existingIndex = cart.findIndex(item => 
        String(item.id) === String(product.id) && 
        JSON.stringify(item.selectedOptions || {}) === JSON.stringify(selectedOptions)
    );

    if (existingIndex > -1) {
        cart[existingIndex].quantity += qty;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: parseFloat(product.price),
            image: product.image,
            currency: product.currency || 'INR',
            selectedOptions,
            quantity: qty
        });
    }

    saveCart(cart);
}

/**
 * Update quantity of a cart item
 * @param {string} id - Product ID
 * @param {number} newQty - New quantity
 * @param {Object} selectedOptions - Item options matching original
 */
export function updateQuantity(id, newQty, selectedOptions = {}) {
    let cart = getCart();
    const index = cart.findIndex(item => 
        String(item.id) === String(id) && 
        JSON.stringify(item.selectedOptions || {}) === JSON.stringify(selectedOptions)
    );

    if (index > -1) {
        if (newQty <= 0) {
            cart.splice(index, 1);
        } else {
            cart[index].quantity = parseInt(newQty);
        }
        saveCart(cart);
    }
}

/**
 * Remove product from cart entirely
 * @param {string} id 
 * @param {Object} selectedOptions 
 */
export function removeFromCart(id, selectedOptions = {}) {
    let cart = getCart();
    cart = cart.filter(item => 
        !(String(item.id) === String(id) && 
          JSON.stringify(item.selectedOptions || {}) === JSON.stringify(selectedOptions))
    );
    saveCart(cart);
}

/**
 * Clear all items from the cart
 */
export function clearCart() {
    saveCart([]);
}

/**
 * Calculate totals
 * @returns {Object} { subtotal, count }
 */
export function getCartTotals() {
    const cart = getCart();
    return cart.reduce((totals, item) => {
        totals.subtotal += item.price * item.quantity;
        totals.count += item.quantity;
        return totals;
    }, { subtotal: 0, count: 0 });
}

/**
 * Helper to update header indicators (badges, mobile indicators)
 */
export function updateCartUI() {
    const { count } = getCartTotals();
    const countBadges = document.querySelectorAll('.cart-count-badge');
    
    countBadges.forEach(badge => {
        badge.textContent = count;
        if (count > 0) {
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    });
}

/**
 * Toast / Pop Notification when adding items
 */
export function showCartNotification(productName) {
    // Create element if not existing
    let notificationContainer = document.getElementById('cart-toast-container');
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.id = 'cart-toast-container';
        notificationContainer.className = 'fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none';
        document.body.appendChild(notificationContainer);
    }

    const toast = document.createElement('div');
    toast.className = 'bg-dark-brown text-cream text-sm px-6 py-4 rounded shadow-lg pointer-events-auto border border-luxury-gold/20 flex items-center justify-between gap-4 animate-fade-in-up';
    toast.innerHTML = `
        <div class="flex items-center gap-2">
            <svg class="w-4 h-4 text-luxury-gold" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
            </svg>
            <span>"${productName}" added to bag.</span>
        </div>
        <a href="cart.html" class="text-luxury-gold uppercase tracking-widest text-xs font-semibold hover:underline">View Bag</a>
    `;

    notificationContainer.appendChild(toast);

    // Fade out and remove after 3.5s
    setTimeout(() => {
        toast.classList.add('animate-fade-out');
        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    }, 3500);
}
