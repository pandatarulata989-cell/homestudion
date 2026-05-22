/*
 * Home Studio - Products Controller
 * Interfaces with Firebase Firestore database or local mock products.json database
 */

import { getProducts as getFirebaseProducts, mapFirestoreProductToUI, getProductFromFirestore, getProductsByCategory as getFirebaseProductsByCategory } from './firebase.js';
import { optimizeCloudinaryUrl } from './cloudinary.js';

/**
 * Fetch all products from either Firebase Firestore or local fallback JSON
 * @returns {Promise<Array>} List of product objects
 */
export async function getProducts() {
    return await getFirebaseProducts();
}

/**
 * Fetch products matching a category from Firestore
 * @param {string} category - Category string (or 'all')
 * @returns {Promise<Array>} List of products
 */
export async function getProductsByCategory(category) {
    return await getFirebaseProductsByCategory(category);
}

/**
 * Fetch a single product by ID
 * @param {string} id - Product ID
 * @returns {Promise<Object|null>} Product detail
 */
export async function getProductById(id) {
    // 1. Try directly from Firestore for speed and admin-added items support
    const directProduct = await getProductFromFirestore(id);
    if (directProduct) return directProduct;

    // 2. Fallback to searching the full list (e.g. mock mode or offline fallback)
    const allProducts = await getProducts();
    return allProducts.find(product => String(product.id) === String(id)) || null;
}

/**
 * Sorts products based on options
 * @param {Array} products - Array of product objects
 * @param {string} sortBy - Criteria ('price-low', 'price-high', 'newest', 'alphabetical')
 * @returns {Array} Sorted array
 */
export function sortProducts(products, sortBy) {
    const list = [...products];
    switch (sortBy) {
        case 'price-low':
            return list.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
        case 'price-high':
            return list.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
        case 'newest':
            return list.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
        case 'alphabetical':
            return list.sort((a, b) => a.name.localeCompare(b.name));
        default:
            return list;
    }
}

/**
 * Filters products based on options
 * @param {Array} products - Array of product objects
 * @param {Object} filters - Filter criteria (category, priceRange, search)
 * @returns {Array} Filtered array
 */
export function filterProducts(products, { category = 'all', priceMax = null, search = '' }) {
    return products.filter(product => {
        // Category Filter
        const matchesCategory = category === 'all' || 
            product.category.toLowerCase() === category.toLowerCase();
            
        // Price Filter
        const matchesPrice = !priceMax || parseFloat(product.price) <= priceMax;
        
        // Search Filter
        const matchesSearch = !search || 
            product.name.toLowerCase().includes(search.toLowerCase()) || 
            product.description.toLowerCase().includes(search.toLowerCase());
            
        return matchesCategory && matchesPrice && matchesSearch;
    });
}

/**
 * Render dynamic product card markup using template styling
 * @param {Object} product - Single product data
 * @returns {string} HTML string
 */
export function createProductCardMarkup(product) {
    const formatter = {
        format: (val) => {
            const num = parseFloat(val);
            if (isNaN(num)) return '₹0';
            if (num % 1 === 0) {
                return '₹' + num.toLocaleString('en-IN');
            } else {
                return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            }
        }
    };

    const isNewLaunch = product.badge === 'New Launch' || product.isNew;
    const badgeText = product.badge || (isNewLaunch ? 'New Launch' : 'Bestseller');
    
    // Top-Left Badge (bg-red-800 text-white text-xs px-2 py-1 absolute top-0 left-0 rounded-br-lg z-10)
    const badgeMarkup = `<span class="bg-red-800 text-white text-xs px-2 py-1 absolute top-0 left-0 rounded-br-lg font-bold uppercase tracking-wider z-10">${badgeText}</span>`;

    // Top-Right Rating (bg-white text-xs px-2 py-1 absolute top-2 right-2 rounded-full flex items-center gap-1 z-10)
    const ratingMarkup = `<span class="bg-white text-xs px-2 py-1 absolute top-2 right-2 rounded-full flex items-center gap-1 shadow-sm text-gray-800 font-bold z-10"><span class="text-amber-500">★</span> ${product.rating || '4.8'}</span>`;

    // Bottom-Right Cart Icon (absolute -bottom-4 right-3 bg-[#2a1c15] text-white p-2.5 rounded-full border-2 border-white shadow-xl shadow-black/40 z-10)
    const cartIconMarkup = `
        <button class="add-to-cart-quick absolute -bottom-4 right-3 bg-[#2a1c15] text-white p-2.5 rounded-full border-2 border-white shadow-xl shadow-black/40 z-10 hover:bg-[#402a1f] active:scale-95 transition-all duration-300 flex items-center justify-center cursor-pointer" aria-label="Add to cart">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
            </svg>
        </button>
    `;

    const hoverImage = product.images && product.images[1] ? product.images[1] : null;
    
    const imageAreaMarkup = hoverImage 
        ? `<div class="relative aspect-[4/5] lg:aspect-none lg:h-72 w-full overflow-hidden bg-luxury-beige">
             ${badgeMarkup}
             ${ratingMarkup}
             <a href="product.html?id=${product.id}" class="block w-full h-full">
                 <img src="${optimizeCloudinaryUrl(product.image || product.images[0])}" alt="${product.name}" loading="lazy" class="w-full h-full object-cover transition-all duration-[1.5s] ease-out group-hover:scale-105 group-hover:opacity-0 absolute inset-0">
                 <img src="${optimizeCloudinaryUrl(hoverImage)}" alt="${product.name}" loading="lazy" class="w-full h-full object-cover transition-all duration-[1.5s] ease-out group-hover:scale-105 opacity-0 group-hover:opacity-100 absolute inset-0">
             </a>
             ${cartIconMarkup}
           </div>`
        : `<div class="relative aspect-[4/5] lg:aspect-none lg:h-72 w-full overflow-hidden bg-luxury-beige">
             ${badgeMarkup}
             ${ratingMarkup}
             <a href="product.html?id=${product.id}" class="block w-full h-full">
                 <img src="${optimizeCloudinaryUrl(product.image || (product.images && product.images[0]) || 'assets/images/placeholder.jpg')}" alt="${product.name}" loading="lazy" class="w-full h-full object-cover transition-transform duration-[1.5s] ease-out group-hover:scale-105">
             </a>
             ${cartIconMarkup}
           </div>`;

    let discountMarkup = '';
    if (product.discount) {
        discountMarkup = `<span class="bg-[#a65656] text-white text-[10px] px-1 rounded inline-block mt-1 font-semibold uppercase tracking-wider">${product.discount}</span>`;
    } else if (product.originalPrice && product.originalPrice > product.price) {
        const pct = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
        if (pct > 0) {
            discountMarkup = `<span class="bg-[#a65656] text-white text-[10px] px-1 rounded inline-block mt-1 font-semibold uppercase tracking-wider">${pct}% OFF</span>`;
        }
    }

    return `
        <div class="relative bg-[#f4efe8] rounded-2xl overflow-hidden flex flex-col justify-between group transition-all duration-500 hover:-translate-y-1.5 hover:shadow-md snap-start min-w-[165px] max-w-[220px] md:min-w-[240px] lg:min-w-0 w-[46%] md:w-[30%] lg:w-full pb-[44px]" data-id="${product.id}" data-product-id="${product.id}">
            <!-- Image Container -->
            ${imageAreaMarkup}

            <!-- Text & Price Content -->
            <div class="p-3 flex-grow flex flex-col justify-between">
                <div>
                    <!-- Title (Truncate to 2 lines) -->
                    <a href="product.html?id=${product.id}" class="hover:text-[#8b3232] transition-colors block">
                        <h3 class="text-sm font-medium leading-tight mb-1 text-dark-brown/90 font-sans line-clamp-2 min-h-[36px]">
                            ${product.name}
                        </h3>
                    </a>

                    <!-- Prices -->
                    <div class="flex items-center gap-2 mt-1 flex-wrap">
                        ${product.originalPrice && product.originalPrice > product.price ? `
                            <span class="line-through text-gray-500 text-xs font-medium">${formatter.format(product.originalPrice)}</span>
                        ` : ''}
                        <span class="font-bold text-[#8b3232] text-sm">${formatter.format(product.price)}</span>
                    </div>

                    <!-- Discount Badge -->
                    ${discountMarkup ? `<div class="mt-1">${discountMarkup}</div>` : ''}
                </div>
            </div>

            <!-- Bottom Banner -->
            <div class="absolute bottom-0 left-0 w-full bg-[#a65656] text-white text-xs text-center py-1.5 font-bold z-10 uppercase tracking-widest">
                Limited Time Offer
            </div>
        </div>
    `;
}

/**
 * Render skeleton card markup for dynamic loading state
 * @returns {string} HTML string
 */
export function createSkeletonCardMarkup() {
    return `
        <div class="bg-white rounded-2xl overflow-hidden shadow-sm border border-luxury-gold/5 flex flex-col justify-between animate-pulse snap-start min-w-[285px] lg:min-w-0 w-full">
            <!-- Image Area Skeleton -->
            <div class="relative aspect-[4/5] w-full bg-[#f3eee6]/50"></div>
            
            <!-- Details Skeleton -->
            <div class="p-5 flex-grow flex flex-col justify-between">
                <div class="mb-4">
                    <!-- Category Skeleton -->
                    <div class="h-2.5 w-1/3 bg-[#f3eee6] rounded-full mb-3"></div>
                    <!-- Title Skeleton -->
                    <div class="h-3 w-3/4 bg-[#f3eee6] rounded-full mb-2"></div>
                    <div class="h-3 w-1/2 bg-[#f3eee6] rounded-full mb-4"></div>
                    <!-- Price Skeleton -->
                    <div class="h-4 w-1/4 bg-[#f3eee6] rounded-full"></div>
                </div>
                <!-- Button Skeleton -->
                <div class="h-10 w-full bg-[#f3eee6] rounded-xl mt-4"></div>
            </div>
        </div>
    `;
}

/**
 * Render dynamic premium category product card markup using 2-column styling
 * @param {Object} product - Single product data
 * @returns {string} HTML string
 */
export function createCategoryProductCardMarkup(product) {
    const formatter = {
        format: (val) => {
            const num = parseFloat(val);
            if (isNaN(num)) return '₹0';
            if (num % 1 === 0) {
                return '₹' + num.toLocaleString('en-IN');
            } else {
                return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            }
        }
    };

    const isNewLaunch = product.badge === 'New Launch' || product.isNew;
    const badgeText = product.badge || (isNewLaunch ? 'New Launch' : 'Bestseller');
    
    // Top-Left Badge (bg-red-800 text-white text-xs px-2 py-1 absolute top-0 left-0 rounded-br-lg z-10)
    const badgeMarkup = `<span class="bg-red-800 text-white text-xs px-2 py-1 absolute top-0 left-0 rounded-br-lg font-bold uppercase tracking-wider z-10">${badgeText}</span>`;

    // Top-Right Rating (bg-white text-xs px-2 py-1 absolute top-2 right-2 rounded-full flex items-center gap-1 z-10)
    const ratingMarkup = `<span class="bg-white text-xs px-2 py-1 absolute top-2 right-2 rounded-full flex items-center gap-1 shadow-sm text-gray-800 font-bold z-10"><span class="text-amber-500">★</span> ${product.rating || '4.8'}</span>`;

    // Bottom-Right Cart Icon (absolute -bottom-4 right-3 bg-[#2a1c15] text-white p-2.5 rounded-full border-2 border-white shadow-xl shadow-black/40 z-10)
    const cartIconMarkup = `
        <button class="add-to-cart-quick absolute -bottom-4 right-3 bg-[#2a1c15] text-white p-2.5 rounded-full border-2 border-white shadow-xl shadow-black/40 z-10 hover:bg-[#402a1f] active:scale-95 transition-all duration-300 flex items-center justify-center cursor-pointer" aria-label="Add to cart">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
            </svg>
        </button>
    `;

    const hoverImage = product.images && product.images[1] ? product.images[1] : null;
    
    const imageAreaMarkup = hoverImage 
        ? `<div class="relative aspect-[4/5] lg:aspect-none lg:h-72 w-full overflow-hidden bg-luxury-beige">
             ${badgeMarkup}
             ${ratingMarkup}
             <a href="product.html?id=${product.id}" class="block w-full h-full">
                 <img src="${optimizeCloudinaryUrl(product.image || product.images[0])}" alt="${product.name}" loading="lazy" class="w-full h-full object-cover transition-all duration-[1.5s] ease-out group-hover:scale-105 group-hover:opacity-0 absolute inset-0">
                 <img src="${optimizeCloudinaryUrl(hoverImage)}" alt="${product.name}" loading="lazy" class="w-full h-full object-cover transition-all duration-[1.5s] ease-out group-hover:scale-105 opacity-0 group-hover:opacity-100 absolute inset-0">
             </a>
             ${cartIconMarkup}
           </div>`
        : `<div class="relative aspect-[4/5] lg:aspect-none lg:h-72 w-full overflow-hidden bg-luxury-beige">
             ${badgeMarkup}
             ${ratingMarkup}
             <a href="product.html?id=${product.id}" class="block w-full h-full">
                 <img src="${optimizeCloudinaryUrl(product.image || (product.images && product.images[0]) || 'assets/images/placeholder.jpg')}" alt="${product.name}" loading="lazy" class="w-full h-full object-cover transition-transform duration-[1.5s] ease-out group-hover:scale-105">
             </a>
             ${cartIconMarkup}
           </div>`;

    let discountMarkup = '';
    if (product.discount) {
        discountMarkup = `<span class="bg-[#a65656] text-white text-[10px] px-1 rounded inline-block mt-1 font-semibold uppercase tracking-wider">${product.discount}</span>`;
    } else if (product.originalPrice && product.originalPrice > product.price) {
        const pct = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
        if (pct > 0) {
            discountMarkup = `<span class="bg-[#a65656] text-white text-[10px] px-1 rounded inline-block mt-1 font-semibold uppercase tracking-wider">${pct}% OFF</span>`;
        }
    }

    return `
        <div class="relative bg-[#f4efe8] rounded-2xl overflow-hidden flex flex-col justify-between group transition-all duration-500 hover:-translate-y-1.5 hover:shadow-md w-full pb-[44px]" data-id="${product.id}" data-product-id="${product.id}">
            <!-- Image Container -->
            ${imageAreaMarkup}

            <!-- Text & Price Content -->
            <div class="p-3 flex-grow flex flex-col justify-between">
                <div>
                    <!-- Title (Truncate to 2 lines) -->
                    <a href="product.html?id=${product.id}" class="hover:text-[#8b3232] transition-colors block">
                        <h3 class="text-sm font-medium leading-tight mb-1 text-dark-brown/90 font-sans line-clamp-2 min-h-[36px]">
                            ${product.name}
                        </h3>
                    </a>

                    <!-- Prices -->
                    <div class="flex items-center gap-2 mt-1 flex-wrap">
                        ${product.originalPrice && product.originalPrice > product.price ? `
                            <span class="line-through text-gray-500 text-xs font-medium">${formatter.format(product.originalPrice)}</span>
                        ` : ''}
                        <span class="font-bold text-[#8b3232] text-sm">${formatter.format(product.price)}</span>
                    </div>

                    <!-- Discount Badge -->
                    ${discountMarkup ? `<div class="mt-1">${discountMarkup}</div>` : ''}
                </div>
            </div>

            <!-- Bottom Banner -->
            <div class="absolute bottom-0 left-0 w-full bg-[#a65656] text-white text-xs text-center py-1.5 font-bold z-10 uppercase tracking-widest">
                Limited Time Offer
            </div>
        </div>
    `;
}

/**
 * Render category skeleton card markup for dynamic loading state
 * @returns {string} HTML string
 */
export function createCategorySkeletonCardMarkup() {
    return `
        <div class="relative bg-[#f4efe8] rounded-2xl overflow-hidden flex flex-col justify-between animate-pulse w-full pb-[44px]">
            <!-- Image Area Skeleton -->
            <div class="relative aspect-[4/5] w-full bg-[#e8e0d5]">
                <div class="absolute top-0 left-0 w-20 h-6 bg-[#ded4c7] rounded-br-lg"></div>
                <div class="absolute top-2 right-2 w-12 h-6 bg-[#ded4c7] rounded-full"></div>
                <div class="absolute -bottom-4 right-3 w-9 h-9 bg-[#ded4c7] rounded-full"></div>
            </div>
            
            <!-- Details Skeleton -->
            <div class="p-3 flex-grow flex flex-col justify-between">
                <div>
                    <!-- Title Skeleton -->
                    <div class="h-3 w-11/12 bg-[#e8e0d5] rounded mb-1.5"></div>
                    <div class="h-3 w-8/12 bg-[#e8e0d5] rounded mb-3"></div>
                    <!-- Price Skeleton -->
                    <div class="h-4 w-5/12 bg-[#e8e0d5] rounded mb-2"></div>
                    <!-- Discount Skeleton -->
                    <div class="h-4 w-4/12 bg-[#e8e0d5] rounded"></div>
                </div>
            </div>
            <!-- Bottom Banner Skeleton -->
            <div class="absolute bottom-0 left-0 w-full h-8 bg-[#ded4c7]"></div>
        </div>
    `;
}
