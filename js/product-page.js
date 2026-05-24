/*
 * Home Studio - Product Detail Page (PDP) Controller
 * Dynamically handles product loading from Firestore, interactive options selection,
 * desktop image zooming, mobile gallery swipe touch gestures, and WhatsApp Inquiry pipeline.
 */

import { getProductById } from './products.js';
import { addToCart, showCartNotification } from './cart.js';

/// Dynamic Thumbnail Gallery system configured via Firestore variantImages

// WhatsApp brand number configuration
const WHATSAPP_PHONE_NUMBER = "15550199";

// Begin fetching product details IMMEDIATELY from URL parameter for faster load times
const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get('id') || 'hs-007'; // Fallback to premium bedding default ID
const productPromise = getProductById(productId);

async function init() {
    const skeleton = document.getElementById('pdp-skeleton');
    const content = document.getElementById('pdp-content');
    const errorContainer = document.getElementById('pdp-error');

    try {
        const product = await productPromise;
        
        // Hide loader animation
        if (skeleton) skeleton.classList.add('hidden');

        if (!product) {
            // Display error boundaries
            if (errorContainer) {
                errorContainer.classList.remove('hidden');
                errorContainer.classList.add('flex');
            }
            if (content) content.classList.add('hidden');
            return;
        }

        // Show main product layout
        if (content) content.classList.remove('hidden');
        if (errorContainer) errorContainer.classList.add('hidden');

        // Global states
        let selectedSize = "";
        let productQuantity = 1;
        let activeImagesList = [];
        let activeImageIdx = 0;
        const whatsappBtn = document.getElementById('whatsapp-cta-btn');

        // 1. Hydrate UI text & metadata fields
        document.getElementById('breadcrumb-product-name').textContent = product.name;
        document.getElementById('product-detail-name').textContent = product.name;
        document.getElementById('product-detail-category').textContent = 
            product.category === 'sheets' ? 'Bed Sheets Collection' : product.category;
        document.getElementById('product-detail-description').textContent = product.description;

        // Format currency
        const priceFormatter = {
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

        const isBedding = (productId === 'hs-007' || product.category === 'sheets');

        // Toggle Size Guide button visibility based on category
        const sizeChartTrigger = document.getElementById('size-chart-trigger');
        if (sizeChartTrigger) {
            sizeChartTrigger.style.display = isBedding ? 'flex' : 'none';
        }

        // Hydrate dynamic specifications list & package elements
        const specsGrid = document.getElementById('specs-grid');
        const packageList = document.getElementById('package-contents-list');
        
        // 1. Dynamic Specifications
        if (specsGrid) {
            if (product.specifications && Object.keys(product.specifications).length > 0) {
                specsGrid.innerHTML = Object.entries(product.specifications).map(([key, val]) => `
                    <div>
                        <span class="text-[#2c221e]/40 block text-[9px] uppercase tracking-widest font-semibold mb-0.5">${key}</span>
                        <span class="font-semibold">${val}</span>
                    </div>
                `).join('');
            } else if (isBedding) {
                specsGrid.innerHTML = `
                    <div>
                        <span class="text-[#2c221e]/40 block text-[9px] uppercase tracking-widest font-semibold mb-0.5">Thread Count</span>
                        <span class="font-semibold">600 TC Egyptian Satin</span>
                    </div>
                    <div>
                        <span class="text-[#2c221e]/40 block text-[9px] uppercase tracking-widest font-semibold mb-0.5">Material</span>
                        <span class="font-semibold">100% Organic Giza Cotton</span>
                    </div>
                    <div>
                        <span class="text-[#2c221e]/40 block text-[9px] uppercase tracking-widest font-semibold mb-0.5">Weave Type</span>
                        <span class="font-semibold">Sateen Luxury Gloss Finish</span>
                    </div>
                    <div>
                        <span class="text-[#2c221e]/40 block text-[9px] uppercase tracking-widest font-semibold mb-0.5">Wash Care</span>
                        <span class="font-semibold">Machine Wash Gentle (Warm)</span>
                    </div>
                `;
            } else {
                specsGrid.innerHTML = `
                    <div>
                        <span class="text-[#2c221e]/40 block text-[9px] uppercase tracking-widest font-semibold mb-0.5">Collection</span>
                        <span class="font-semibold uppercase tracking-wider">${product.category} Series</span>
                    </div>
                    <div>
                        <span class="text-[#2c221e]/40 block text-[9px] uppercase tracking-widest font-semibold mb-0.5">Warranty</span>
                        <span class="font-semibold">2 Year Premium Warranty</span>
                    </div>
                    <div>
                        <span class="text-[#2c221e]/40 block text-[9px] uppercase tracking-widest font-semibold mb-0.5">Assembly</span>
                        <span class="font-semibold">Complimentary White-Glove</span>
                    </div>
                    <div>
                        <span class="text-[#2c221e]/40 block text-[9px] uppercase tracking-widest font-semibold mb-0.5">Delivery</span>
                        <span class="font-semibold">Insured (3-5 Business Days)</span>
                    </div>
                `;
            }
        }

        // 2. Dynamic Package Elements
        if (packageList) {
            if (product.packageElements && product.packageElements.length > 0) {
                packageList.innerHTML = product.packageElements.map(item => `
                    <li>${item}</li>
                `).join('');
            } else if (isBedding) {
                packageList.innerHTML = `
                    <li>1 Double Bedsheet: 274 cm x 274 cm (108" x 108")</li>
                    <li>2 Matching Pillow Covers: 46 cm x 69 cm (18" x 27")</li>
                `;
            } else {
                packageList.innerHTML = `
                    <li>1 Premium ${product.name}</li>
                    <li>1 Authenticity Certificate & Warranty Card</li>
                    <li>Complimentary White-Glove assembly tools & kit</li>
                `;
            }
        }

        // Pricing math calculations
        function updatePricingForSize(size) {
            let basePrice = parseFloat(product.price);
            if (isBedding) {
                if (size && size.includes('Queen')) {
                    basePrice = 3199;
                } else if (size && size.includes('Super King')) {
                    basePrice = 3999;
                } else {
                    basePrice = 3599; // King size
                }
            }
            
            let discountPercent = 0;
            if (product.discount !== undefined && product.discount !== null && product.discount !== '') {
                const match = String(product.discount).match(/(\d+)/);
                discountPercent = match ? parseInt(match[1]) : 0;
            } else if (isBedding) {
                discountPercent = 20; // Default fallback for bedding sheets to preserve design
            }

            const discountPrice = basePrice;
            const originalPrice = discountPercent > 0 
                ? Math.round(discountPrice / (1 - discountPercent / 100))
                : discountPrice;
            const promoPrice = Math.round(discountPrice * 0.95); // 5% extra discount

            // Hydrate prices text fields
            document.getElementById('product-detail-price').textContent = priceFormatter.format(discountPrice);
            document.getElementById('mobile-sticky-price').textContent = priceFormatter.format(discountPrice);
            
            const promoPriceEl = document.getElementById('promo-price');
            if (promoPriceEl) promoPriceEl.textContent = priceFormatter.format(promoPrice);

            const originalPriceEl = document.getElementById('product-detail-original-price');
            const discountBadgeEl = document.getElementById('product-detail-discount-badge');

            if (originalPriceEl) {
                if (originalPrice > discountPrice) {
                    originalPriceEl.textContent = priceFormatter.format(originalPrice);
                    originalPriceEl.style.display = 'inline';
                } else {
                    originalPriceEl.style.display = 'none';
                }
            }

            if (discountBadgeEl) {
                if (discountPercent > 0) {
                    discountBadgeEl.textContent = `${discountPercent}% OFF`;
                    discountBadgeEl.style.display = 'inline-block';
                } else {
                    discountBadgeEl.style.display = 'none';
                }
            }
            
            // Keep the price of the product instance updated so adding to bag reflects the size price
            product.currentSelectedPrice = basePrice;
            
            // Update WhatsApp Link Inquiry values dynamically
            updateWhatsAppLink();
        }

        // 2. Set Up Sizes Selector
        const sizeSelector = document.getElementById('product-size');
        const sizeSelectionBlock = document.getElementById('size-selection-block');
        const sizesList = product.sizes || [];

        if (sizesList && sizesList.length > 0) {
            if (sizeSelectionBlock) sizeSelectionBlock.classList.remove('hidden');
            sizeSelector.innerHTML = sizesList.map((size) => {
                return `<option value="${size}">${size}</option>`;
            }).join('');
            selectedSize = sizeSelector.value;
        } else {
            selectedSize = "";
            if (sizeSelectionBlock) {
                sizeSelectionBlock.classList.add('hidden');
            }
        }

        // Initial price calculations
        updatePricingForSize(selectedSize);

        // 3. Set Up Images Gallery and Swipe Behaviors
        const verticalContainer = document.getElementById('vertical-thumbnails-container');
        const horizontalContainer = document.getElementById('horizontal-thumbnails-container');
        const mainImg = document.getElementById('product-main-image');

        function updateGalleryImages() {
            activeImagesList = (product.variantImages && Array.isArray(product.variantImages) && product.variantImages.length > 0)
                ? product.variantImages.map((url, idx) => ({ title: `Design Variant ${idx + 1}`, url }))
                : (product.images && Array.isArray(product.images) && product.images.length > 0)
                    ? product.images.map((url, idx) => ({ title: `Design Variant ${idx + 1}`, url }))
                    : [{ title: product.name, url: product.image || 'assets/images/placeholder.jpg' }];
            
            activeImageIdx = 0;
            
            // Set variantImages[0] as default src
            if (activeImagesList.length > 0) {
                mainImg.src = activeImagesList[0].url;
            }
            
            renderGalleryUI();
        }

        function renderGalleryUI() {
            if (activeImagesList.length === 0) return;

            // Set hero photo
            const activeImage = activeImagesList[activeImageIdx];
            mainImg.src = activeImage.url;
            mainImg.alt = `${product.name} - ${activeImage.title}`;

            const thumbnailBtnClass = (idx) => {
                const isActive = idx === activeImageIdx;
                const borderClass = isActive ? 'border-black' : 'border-transparent';
                return `thumb-btn w-16 h-16 rounded-md border-2 ${borderClass} hover:border-gray-800 cursor-pointer object-cover transition-all duration-300`;
            };

            // Build Vertical Strip (Desktop)
            verticalContainer.innerHTML = activeImagesList.map((img, idx) => `
                <button 
                    type="button" 
                    class="${thumbnailBtnClass(idx)} flex-shrink-0 overflow-hidden focus:outline-none" 
                    data-idx="${idx}"
                    aria-label="View ${img.title}">
                    <img src="${img.url}" alt="${img.title}" loading="lazy" class="w-full h-full object-cover rounded-sm">
                </button>
            `).join('');

            // Build Horizontal Strip (Mobile swipeable)
            horizontalContainer.innerHTML = activeImagesList.map((img, idx) => `
                <button 
                    type="button" 
                    class="${thumbnailBtnClass(idx)} flex-shrink-0 overflow-hidden focus:outline-none snap-center" 
                    data-idx="${idx}"
                    aria-label="View ${img.title}">
                    <img src="${img.url}" alt="${img.title}" loading="lazy" class="w-full h-full object-cover rounded-sm">
                </button>
            `).join('');

            // Bind click events on all thumbnail buttons
            const allThumbButtons = document.querySelectorAll('.thumb-btn');
            allThumbButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    const targetIdx = parseInt(btn.getAttribute('data-idx'));
                    switchToImageIndex(targetIdx);
                });
            });
        }

        function switchToImageIndex(idx) {
            if (idx === activeImageIdx) return;
            activeImageIdx = idx;

            const targetImg = activeImagesList[activeImageIdx];

            // Smooth opacity transition
            mainImg.style.opacity = '0.3';
            setTimeout(() => {
                mainImg.src = targetImg.url;
                mainImg.alt = `${product.name} - ${targetImg.title}`;
                mainImg.style.opacity = '1';
            }, 120);

            // Sync active thumbnails border
            const allThumbButtons = document.querySelectorAll('.thumb-btn');
            allThumbButtons.forEach(b => {
                const buttonIdx = parseInt(b.getAttribute('data-idx'));
                if (buttonIdx === activeImageIdx) {
                    b.classList.add('border-black');
                    b.classList.remove('border-transparent');
                    b.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                } else {
                    b.classList.remove('border-black');
                    b.classList.add('border-transparent');
                }
            });
            
            // Sync WhatsApp preview image
            updateWhatsAppLink();
        }

        // Run initial gallery hydration
        updateGalleryImages();

        // Bind Size dropdown updates
        sizeSelector.addEventListener('change', () => {
            selectedSize = sizeSelector.value;
            updatePricingForSize(selectedSize);
            
            // Update package contents display dynamically based on size selected for Bedding
            if (!isBedding) return;
            if (product.packageElements && product.packageElements.length > 0) return; // Prevent overwriting custom elements
            const packageList = document.getElementById('package-contents-list');
            if (packageList) {
                if (selectedSize.includes('Queen')) {
                    packageList.innerHTML = `
                        <li>1 Queen Size Bedsheet: 228 cm x 254 cm (90" x 100")</li>
                        <li>2 Pillow Covers: 46 cm x 69 cm (18" x 27")</li>
                    `;
                } else if (selectedSize.includes('Super King')) {
                    packageList.innerHTML = `
                        <li>1 Super King Bedsheet: 274 cm x 305 cm (108" x 120")</li>
                        <li>2 Pillow Covers: 46 cm x 69 cm (18" x 27")</li>
                    `;
                } else {
                    packageList.innerHTML = `
                        <li>1 King Size Bedsheet: 274 cm x 274 cm (108" x 108")</li>
                        <li>2 Pillow Covers: 46 cm x 69 cm (18" x 27")</li>
                    `;
                }
            }
        });

        // 5. Quantity Selectors Action Binds
        const qtyInput = document.getElementById('product-qty');
        const qtyMinusBtn = document.getElementById('qty-minus');
        const qtyPlusBtn = document.getElementById('qty-plus');

        if (qtyPlusBtn && qtyMinusBtn && qtyInput) {
            qtyPlusBtn.addEventListener('click', () => {
                productQuantity = parseInt(qtyInput.value) + 1;
                qtyInput.value = productQuantity;
                updateWhatsAppLink();
            });
            qtyMinusBtn.addEventListener('click', () => {
                const cur = parseInt(qtyInput.value);
                if (cur > 1) {
                    productQuantity = cur - 1;
                    qtyInput.value = productQuantity;
                    updateWhatsAppLink();
                }
            });
        }

        // 6. Interactive Desktop Zoom Magnifier
        const mainImgContainer = document.getElementById('main-image-container');
        if (mainImgContainer && window.innerWidth >= 1024) {
            mainImgContainer.addEventListener('mousemove', (e) => {
                const rect = mainImgContainer.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;
                mainImg.style.transformOrigin = `${x}% ${y}%`;
                mainImg.style.transform = 'scale(1.5)';
            });
            mainImgContainer.addEventListener('mouseleave', () => {
                mainImg.style.transform = 'scale(1)';
                mainImg.style.transformOrigin = 'center center';
            });
        }

        // 7. Mobile Swipe Gestures on Hero Image Box
        let touchStartX = 0;
        let touchStartY = 0;

        if (mainImgContainer) {
            mainImgContainer.addEventListener('touchstart', (e) => {
                touchStartX = e.changedTouches[0].screenX;
                touchStartY = e.changedTouches[0].screenY;
            }, { passive: true });

            mainImgContainer.addEventListener('touchend', (e) => {
                const touchEndX = e.changedTouches[0].screenX;
                const touchEndY = e.changedTouches[0].screenY;
                
                const deltaX = touchEndX - touchStartX;
                const deltaY = touchEndY - touchStartY;

                // Ensure swipe is horizontal and meets threshold
                if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
                    if (deltaX < 0) {
                        // Swiped Left -> Show Next image
                        const nextIdx = (activeImageIdx + 1) % activeImagesList.length;
                        switchToImageIndex(nextIdx);
                    } else {
                        // Swiped Right -> Show Previous image
                        const prevIdx = (activeImageIdx - 1 + activeImagesList.length) % activeImagesList.length;
                        switchToImageIndex(prevIdx);
                    }
                }
            }, { passive: true });
        }

        // 8. Size Chart Modal Interactions
        const sizeChartModal = document.getElementById('size-chart-modal');
        const sizeChartCloseBtn = document.getElementById('size-chart-close-btn');

        if (sizeChartTrigger && sizeChartModal && sizeChartCloseBtn) {
            const toggleSizeModal = (isOpen) => {
                const innerContent = sizeChartModal.querySelector('.bg-\\[\\#faf8f5\\]');
                if (isOpen) {
                    sizeChartModal.classList.remove('pointer-events-none', 'opacity-0');
                    sizeChartModal.classList.add('opacity-100', 'pointer-events-auto');
                    innerContent.classList.remove('scale-95');
                    innerContent.classList.add('scale-100');
                } else {
                    sizeChartModal.classList.remove('opacity-100', 'pointer-events-auto');
                    sizeChartModal.classList.add('opacity-0', 'pointer-events-none');
                    innerContent.classList.remove('scale-100');
                    innerContent.classList.add('scale-95');
                }
            };

            sizeChartTrigger.addEventListener('click', () => toggleSizeModal(true));
            sizeChartCloseBtn.addEventListener('click', () => toggleSizeModal(false));
            sizeChartModal.addEventListener('click', (e) => {
                if (e.target === sizeChartModal) toggleSizeModal(false);
            });
        }

        // 9. Add to Bag & Buy Now Checkout Pipeline
        const executeAddToCart = () => {
            const selectedOptions = {};
            if (selectedSize) selectedOptions["Size"] = selectedSize;
            
            // Build custom checkout object reflecting exact swatch selection photo
            const cartProduct = {
                ...product,
                price: product.currentSelectedPrice || product.price,
                image: mainImg.src // Matches current image URL corresponding to chosen variant
            };
            
            addToCart(cartProduct, productQuantity, selectedOptions);
            showCartNotification(product.name);
        };

        // Desktop Button bindings
        const addBtn = document.getElementById('add-to-bag-btn');
        const buyBtn = document.getElementById('buy-now-btn');

        if (addBtn) addBtn.addEventListener('click', executeAddToCart);
        if (buyBtn) {
            buyBtn.addEventListener('click', () => {
                executeAddToCart();
                window.location.href = 'checkout.html';
            });
        }

        // Mobile Sticky Button bindings
        const stickyAddBtn = document.getElementById('mobile-sticky-add-btn');
        const stickyBuyBtn = document.getElementById('mobile-sticky-buy-btn');

        if (stickyAddBtn) stickyAddBtn.addEventListener('click', executeAddToCart);
        if (stickyBuyBtn) {
            stickyBuyBtn.addEventListener('click', () => {
                executeAddToCart();
                window.location.href = 'checkout.html';
            });
        }

        // 10. WhatsApp Checkout/Inquiry pipeline
        function updateWhatsAppLink() {
            if (!whatsappBtn) return;
            
            const currentURL = window.location.href;
            const itemPrice = priceFormatter.format(product.currentSelectedPrice || product.price);
            
            const optionsText = [
                selectedSize ? `*Size*: ${selectedSize}` : null
            ].filter(Boolean).join('\n');
 
            const message = `Hi Home Studio, I am interested in inquiring about this product:
 
*Product*: ${product.name}
${optionsText}
*Quantity*: ${productQuantity}
*Price*: ${itemPrice}
 
Link: ${currentURL}`;
 
            const encodedMessage = encodeURIComponent(message);
            whatsappBtn.href = `https://wa.me/${WHATSAPP_PHONE_NUMBER}?text=${encodedMessage}`;
        }

        // Initial setup for WhatsApp link
        updateWhatsAppLink();

    } catch (err) {
        console.error("Critical error in PDP dynamic hydrator script:", err);
        if (skeleton) skeleton.classList.add('hidden');
        if (errorContainer) {
            errorContainer.classList.remove('hidden');
            errorContainer.classList.add('flex');
        }
        if (content) content.classList.add('hidden');
    }
}

if (window.__componentsLoaded) {
    init();
} else {
    document.addEventListener('componentsLoaded', init);
}
