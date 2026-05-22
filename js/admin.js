/*
 * Home Studio — Admin Panel Controller
 * Handles Firebase Auth, Firestore role verification,
 * Cloudinary image upload, and product CRUD.
 *
 * Imports from firebase.js (NOT directly from firebase/config.js) per project convention.
 */

import { db, auth, checkAdminRole, saveProductToFirestore, mapFirestoreProductToUI, clearProductsCollection, getProductFromFirestore, updateProductInFirestore, deleteProductFromFirestore } from './firebase.js';
import { uploadToCloudinary } from './cloudinary.js';

// ─── DOM References ──────────────────────────────────────────────────────────
const loginOverlay    = document.getElementById('login-overlay');
const adminPanel      = document.getElementById('admin-panel');
const loginEmailEl    = document.getElementById('login-email');
const loginPasswordEl = document.getElementById('login-password');
const loginBtn        = document.getElementById('login-btn');
const loginBtnText    = document.getElementById('login-btn-text');
const loginSpinner    = document.getElementById('login-spinner');
const loginError      = document.getElementById('login-error');
const loginErrorText  = document.getElementById('login-error-text');
const logoutBtn       = document.getElementById('logout-btn');
const adminEmailBadge = document.getElementById('admin-email-badge');

const productForm     = document.getElementById('product-form');
const submitBtn       = document.getElementById('submit-btn');
const submitBtnText   = document.getElementById('submit-btn-text');
const submitSpinner   = document.getElementById('submit-spinner');
const resetFormBtn    = document.getElementById('reset-form-btn');
const refreshListBtn  = document.getElementById('refresh-list-btn');
const productListEl   = document.getElementById('product-list');
const imageInput      = document.getElementById('f-image');
const imgGrid         = document.getElementById('img-grid');
const imgAddTile      = document.getElementById('img-add-tile');
const imgCountBadge   = document.getElementById('img-count-badge');
const mrpInput        = document.getElementById('f-mrp');
const priceInput      = document.getElementById('f-price');
const discountWrap    = document.getElementById('discount-preview-wrap');
const discountValue   = document.getElementById('discount-value');
const savingsValue    = document.getElementById('savings-value');

// Dynamic Specs & Package DOM references
const specsContainer = document.getElementById('specs-container');
const packageContainer = document.getElementById('package-container');
const addSpecBtn = document.getElementById('add-spec-btn');
const addPackageBtn = document.getElementById('add-package-btn');

// Edit Mode alert elements
const editModeAlert = document.getElementById('edit-mode-alert');
const editProductTitleBadge = document.getElementById('edit-product-title-badge');
const cancelEditBtn = document.getElementById('cancel-edit-btn');

// ─── Multi-image state ───────────────────────────────────────────────────────
const MAX_IMAGES = 5;
let productImages = []; // Array<File | string>
let editProductId = null; // Stores ID if in edit mode

// ─── Toast Utility ───────────────────────────────────────────────────────────
function showToast(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `admin-toast ${type}`;

    const icons = {
        success: `<svg class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>`,
        error:   `<svg class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>`,
        info:    `<svg class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z"/></svg>`
    };

    toast.innerHTML = `${icons[type] || icons.info}<span>${message}</span>`;
    container.appendChild(toast);
    requestAnimationFrame(() => { requestAnimationFrame(() => toast.classList.add('show')); });

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, duration);
}

// ─── Auth State Guard ────────────────────────────────────────────────────────
async function initAuthGuard() {
    if (!auth) {
        console.error('[Admin] Firebase Auth is not initialized.');
        showLoginError('Firebase Auth is not configured. Check firebase/config.js.');
        return;
    }

    const { onAuthStateChanged } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");

    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            showLoginPanel();
            return;
        }

        // Verify admin role in Firestore users collection
        const isAdmin = await checkAdminRole(user.uid);
        if (!isAdmin) {
            console.warn(`[Admin] UID ${user.uid} is not an admin. Redirecting.`);
            showLoginError('Access denied. Your account does not have admin privileges.');
            await handleLogout(false); // sign out silently
            return;
        }

        showAdminPanel(user);
    });
}

function showLoginPanel() {
    loginOverlay.classList.remove('hidden');
    adminPanel.classList.add('hidden');
}

function showAdminPanel(user) {
    loginOverlay.classList.add('hidden');
    adminPanel.classList.remove('hidden');
    if (adminEmailBadge) {
        adminEmailBadge.textContent = user.email;
        adminEmailBadge.classList.remove('hidden');
    }
    loadRecentProducts();
}

// ─── Login ───────────────────────────────────────────────────────────────────
function showLoginError(msg) {
    loginError.classList.remove('hidden');
    loginErrorText.textContent = msg;
}
function clearLoginError() { loginError.classList.add('hidden'); }

async function handleLogin() {
    const email    = loginEmailEl.value.trim();
    const password = loginPasswordEl.value;

    if (!email || !password) {
        showLoginError('Please enter your email and password.');
        return;
    }

    clearLoginError();
    loginBtn.disabled = true;
    loginBtnText.textContent = 'Signing in…';
    loginSpinner.classList.remove('hidden');

    try {
        const { signInWithEmailAndPassword } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");
        await signInWithEmailAndPassword(auth, email, password);
        // onAuthStateChanged will handle the rest
    } catch (err) {
        console.error('[Admin Login]', err);
        const messages = {
            'auth/invalid-credential':      'Incorrect email or password.',
            'auth/user-not-found':          'No account found with this email.',
            'auth/wrong-password':          'Incorrect password.',
            'auth/too-many-requests':       'Too many failed attempts. Please try again later.',
            'auth/network-request-failed':  'Network error. Check your connection.',
            'auth/invalid-email':           'Please enter a valid email address.',
        };
        showLoginError(messages[err.code] || `Login failed: ${err.message}`);
    } finally {
        loginBtn.disabled = false;
        loginBtnText.textContent = 'Sign In';
        loginSpinner.classList.add('hidden');
    }
}

async function handleLogout(showMessage = true) {
    try {
        const { signOut } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");
        await signOut(auth);
        if (showMessage) showToast('Signed out successfully.', 'info');
    } catch (err) {
        console.error('[Admin Logout]', err);
    }
}

// ─── Dynamic Spec & Package Builders ──────────────────────────────────────────
function addSpecRow(key = '', val = '') {
    const row = document.createElement('div');
    row.className = 'flex items-center gap-3 spec-row fade-up';
    row.innerHTML = `
        <input type="text" placeholder="Key (e.g. Material)" value="${key}" class="form-input flex-grow spec-key" required>
        <input type="text" placeholder="Value (e.g. 100% Cotton)" value="${val}" class="form-input flex-grow spec-value" required>
        <button type="button" class="remove-spec-btn p-2 text-white/30 hover:text-red-400 transition-colors" title="Delete Spec Row">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
        </button>
    `;
    row.querySelector('.remove-spec-btn').addEventListener('click', () => {
        row.remove();
    });
    specsContainer.appendChild(row);
}

function addPackageRow(item = '') {
    const row = document.createElement('div');
    row.className = 'flex items-center gap-3 package-row fade-up';
    row.innerHTML = `
        <input type="text" placeholder="Item (e.g. 1x Fitted Sheet)" value="${item}" class="form-input flex-grow package-item" required>
        <button type="button" class="remove-package-btn p-2 text-white/30 hover:text-red-400 transition-colors" title="Delete Item">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
        </button>
    `;
    row.querySelector('.remove-package-btn').addEventListener('click', () => {
        row.remove();
    });
    packageContainer.appendChild(row);
}

// ─── Multi-image Grid ────────────────────────────────────────────────────────
function renderImageGrid() {
    // Update count badge
    imgCountBadge.textContent = `${productImages.length} / ${MAX_IMAGES} photos`;

    // Remove all existing slots (keep the add-tile)
    imgGrid.querySelectorAll('.img-slot').forEach(s => s.remove());

    // Re-insert slots before the add-tile
    productImages.forEach((img, index) => {
        const slot = document.createElement('div');
        slot.className = 'img-slot';
        slot.dataset.index = index;

        const dataUrl = img instanceof File ? URL.createObjectURL(img) : img;
        slot.innerHTML = `
            <img src="${dataUrl}" alt="Photo ${index + 1}" loading="lazy">
            <span class="img-primary-badge">Primary</span>
            <button type="button" class="img-remove-btn" data-index="${index}" aria-label="Remove photo">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                    <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
            </button>`;

        slot.querySelector('.img-remove-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            removeImage(index);
        });

        imgGrid.insertBefore(slot, imgAddTile);
    });

    // Hide add-tile when at max; show when below
    imgAddTile.style.display = productImages.length >= MAX_IMAGES ? 'none' : '';
}

function removeImage(index) {
    productImages.splice(index, 1);
    renderImageGrid();
}

function addFiles(files) {
    const remaining = MAX_IMAGES - productImages.length;
    if (remaining <= 0) {
        showToast(`Maximum ${MAX_IMAGES} photos allowed.`, 'error', 3000);
        return;
    }
    const toAdd = Array.from(files)
        .filter(f => f.type.startsWith('image/'))
        .slice(0, remaining);

    if (toAdd.length === 0) return;
    productImages.push(...toAdd);
    renderImageGrid();

    if (files.length > remaining) {
        showToast(`Only ${remaining} slot(s) remaining. Added first ${toAdd.length} photo(s).`, 'info', 4000);
    }
}

// Init grid
renderImageGrid();

// ─── Discount Preview ────────────────────────────────────────────────────────
function updateDiscountPreview() {
    const mrp   = parseFloat(mrpInput.value);
    const price = parseFloat(priceInput.value);
    if (mrp > 0 && price > 0 && mrp > price) {
        const pct = Math.round(((mrp - price) / mrp) * 100);
        discountValue.textContent = `${pct}% OFF`;
        savingsValue.textContent  = `(Save ₹${(mrp - price).toLocaleString('en-IN')})`;
        discountWrap.style.display = 'block';
    } else {
        discountWrap.style.display = 'none';
    }
}

// ─── Edit Mode Controllers ──────────────────────────────────────────────────
async function editProduct(productId) {
    showToast("Loading product details for edit...", "info");
    try {
        const product = await getProductFromFirestore(productId);
        if (!product) {
            showToast("Product not found.", "error");
            return;
        }

        // Set edit state variables
        editProductId = productId;

        // Change Section Title text and submit button text
        const formHeaderTitle = adminPanel.querySelector('h2.font-cormorant');
        if (formHeaderTitle) {
            formHeaderTitle.textContent = "Edit Product";
        }
        submitBtnText.textContent = "Save Changes";

        // Populate basic info
        document.getElementById('f-title').value = product.name || '';
        document.getElementById('f-description').value = product.description || '';
        document.getElementById('f-category').value = product.category || '';
        document.getElementById('f-rating').value = product.rating || '4.8';

        // Pricing
        mrpInput.value = product.originalPrice || '';
        priceInput.value = product.price || '';
        updateDiscountPreview();

        // Toggles
        document.getElementById('f-is-new-launch').checked = product.isNewLaunch || false;
        document.getElementById('f-is-bestseller').checked = product.isBestseller || false;

        // Image state mapping (holds both pre-existing URL strings and new local Files)
        productImages = [...(product.images || [])];
        renderImageGrid();

        // Populate specifications (key-value)
        specsContainer.innerHTML = '';
        if (product.specifications && typeof product.specifications === 'object') {
            Object.entries(product.specifications).forEach(([key, val]) => {
                addSpecRow(key, val);
            });
        }

        // Populate package contents (string array)
        packageContainer.innerHTML = '';
        if (Array.isArray(product.packageElements)) {
            product.packageElements.forEach(item => {
                addPackageRow(item);
            });
        }

        // Show Edit Alert Banner
        if (editModeAlert && editProductTitleBadge) {
            editProductTitleBadge.textContent = product.name || 'Untitled';
            editModeAlert.classList.remove('hidden');
        }

        // Scroll to form smoothly
        productForm.scrollIntoView({ behavior: 'smooth' });
        showToast("✏️ Edit mode active", "info");

    } catch (err) {
        console.error("Error in editProduct:", err);
        showToast(`Error loading product: ${err.message}`, "error");
    }
}

function exitEditMode() {
    editProductId = null;
    
    // Reset Header and submit button
    const formHeaderTitle = adminPanel.querySelector('h2.font-cormorant');
    if (formHeaderTitle) {
        formHeaderTitle.textContent = "Add New Product";
    }
    submitBtnText.textContent = "Save to Firestore";

    // Hide edit alert
    if (editModeAlert) {
        editModeAlert.classList.add('hidden');
    }

    // Reset Form
    productForm.reset();
    productImages = [];
    specsContainer.innerHTML = '';
    packageContainer.innerHTML = '';
    renderImageGrid();
    discountWrap.style.display = 'none';
}

// ─── Product Form Submit ──────────────────────────────────────────────────────
async function handleFormSubmit(e) {
    e.preventDefault();

    const title       = document.getElementById('f-title').value.trim();
    const description = document.getElementById('f-description').value.trim();
    const category    = document.getElementById('f-category').value;
    const rating      = document.getElementById('f-rating').value;
    const mrp         = parseFloat(mrpInput.value);
    const price       = parseFloat(priceInput.value);
    const isNewLaunch = document.getElementById('f-is-new-launch').checked;
    const isBestseller = document.getElementById('f-is-bestseller').checked;
    const hasImages   = productImages.length > 0;

    // Validation
    if (!title || !description || !category || !mrp || !price) {
        showToast('Please fill in all required fields.', 'error');
        return;
    }
    if (price > mrp) {
        showToast('Final price cannot be greater than MRP.', 'error');
        return;
    }
    if (!hasImages) {
        showToast('Please upload at least one product image.', 'error');
        return;
    }

    // Extract dynamic specs
    const specifications = {};
    const specRows = specsContainer.querySelectorAll('.spec-row');
    specRows.forEach(row => {
        const key = row.querySelector('.spec-key').value.trim();
        const val = row.querySelector('.spec-value').value.trim();
        if (key) {
            specifications[key] = val;
        }
    });

    // Extract dynamic package elements
    const packageElements = [];
    const packageRows = packageContainer.querySelectorAll('.package-row');
    packageRows.forEach(row => {
        const item = row.querySelector('.package-item').value.trim();
        if (item) {
            packageElements.push(item);
        }
    });

    // Set loading state
    submitBtn.disabled = true;
    submitSpinner.classList.remove('hidden');
    
    try {
        // Step 1: Upload any local File objects in productImages to Cloudinary
        const newFilesToUpload = productImages.filter(img => img instanceof File);
        
        if (newFilesToUpload.length > 0) {
            submitBtnText.textContent = `Uploading ${newFilesToUpload.length} image${newFilesToUpload.length > 1 ? 's' : ''}…`;
            showToast(`Uploading ${newFilesToUpload.length} new photo${newFilesToUpload.length > 1 ? 's' : ''} to Cloudinary…`, 'info', 12000);
        }

        const uploadPromises = productImages.map(async (img) => {
            if (img instanceof File) {
                return await uploadToCloudinary(img);
            }
            return img; // Already a Cloudinary URL string
        });
        
        const imageUrls = await Promise.all(uploadPromises);
        const primaryUrl = imageUrls[0] || 'assets/images/placeholder.jpg';

        // Step 2: Build Firestore payload
        const discountPct = mrp > price ? `${Math.round(((mrp - price) / mrp) * 100)}% OFF` : '';
        const badge = isNewLaunch ? 'New Launch' : isBestseller ? 'Bestseller' : '';

        const productData = {
            title,
            description,
            category,
            rating,
            price,
            originalPrice: mrp,
            discount: discountPct,
            image: primaryUrl,
            images: imageUrls,
            isNewLaunch,
            isBestseller,
            badge,
            isNew: isNewLaunch,
            specifications,
            packageElements
        };

        // Step 3: Add or Update product in Firestore
        if (editProductId) {
            submitBtnText.textContent = 'Saving Changes…';
            await updateProductInFirestore(editProductId, productData);
            showToast(`✓ Product successfully updated! ID: ${editProductId}`, 'success', 6000);
            exitEditMode();
        } else {
            submitBtnText.textContent = 'Saving to Firestore…';
            const newId = await saveProductToFirestore(productData);
            showToast(`✓ Product saved with ${imageUrls.length} photo${imageUrls.length > 1 ? 's' : ''}! ID: ${newId}`, 'success', 6000);
            
            // Clean up and reset
            productForm.reset();
            productImages = [];
            specsContainer.innerHTML = '';
            packageContainer.innerHTML = '';
            renderImageGrid();
            discountWrap.style.display = 'none';
        }

        // Refresh the product list
        loadRecentProducts();

    } catch (err) {
        console.error('[Admin Submit]', err);
        showToast(`Failed: ${err.message}`, 'error', 8000);
    } finally {
        submitBtn.disabled = false;
        submitSpinner.classList.add('hidden');
        submitBtnText.textContent = editProductId ? 'Save Changes' : 'Save to Firestore';
    }
}

// ─── Recent Products List ────────────────────────────────────────────────────
async function loadRecentProducts() {
    if (!productListEl) return;
    productListEl.innerHTML = '<p class="text-white/20 text-xs text-center py-8">Loading…</p>';

    try {
        const { collection, getDocs, query, orderBy, limit } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");

        let docs;
        try {
            const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'), limit(10));
            const snap = await getDocs(q);
            docs = snap.docs;
        } catch {
            // Index not built yet — fallback to unordered
            const q2 = query(collection(db, 'products'), limit(10));
            const snap2 = await getDocs(q2);
            docs = snap2.docs;
        }

        if (docs.length === 0) {
            productListEl.innerHTML = '<p class="text-white/20 text-xs text-center py-8">No products yet. Add your first product above.</p>';
            return;
        }

        productListEl.innerHTML = docs.map(doc => {
            const d = doc.data();
            const flags = [
                d.isNewLaunch  ? `<span class="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider" style="background:rgba(107,27,27,0.25);color:#e87a7a;">New Launch</span>` : '',
                d.isBestseller ? `<span class="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider" style="background:rgba(234,179,8,0.15);color:#fbbf24;">Bestseller</span>` : '',
            ].filter(Boolean).join('');

            return `
            <div class="product-row">
                <img class="product-thumb" src="${d.image || 'assets/images/placeholder.jpg'}" alt="${d.title || ''}" loading="lazy">
                <div class="flex-grow min-w-0">
                    <p class="text-white/80 text-sm font-medium truncate">${d.title || 'Untitled'}</p>
                    <div class="flex items-center gap-2 mt-1 flex-wrap">
                        <span class="text-white/30 text-[10px] uppercase tracking-wider">${d.category || '—'}</span>
                        ${flags}
                    </div>
                </div>
                <div class="text-right shrink-0">
                    <p class="text-white/70 text-sm font-semibold">₹${(d.price || 0).toLocaleString('en-IN')}</p>
                    ${d.originalPrice > d.price ? `<p class="text-white/25 text-xs line-through">₹${(d.originalPrice || 0).toLocaleString('en-IN')}</p>` : ''}
                </div>
                <div class="flex items-center gap-1 shrink-0 ml-2">
                    <button type="button" class="edit-product-btn p-1.5 text-white/40 hover:text-amber-400 hover:bg-white/5 rounded-lg transition-all active:scale-95" data-id="${doc.id}" title="Edit Product">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                    </button>
                    <button type="button" class="delete-product-btn p-1.5 text-white/30 hover:text-red-400 hover:bg-white/5 rounded-lg transition-all active:scale-95" data-id="${doc.id}" title="Delete Product">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
            </div>`;
        }).join('');

        // Attach click listeners to edit buttons
        productListEl.querySelectorAll('.edit-product-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                editProduct(id);
            });
        });

        // Attach click listeners to delete buttons
        productListEl.querySelectorAll('.delete-product-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                if (confirm("Are you sure you want to delete this product?")) {
                    try {
                        await deleteProductFromFirestore(id);
                        showToast("Product deleted successfully.", "success");
                        // If we are currently editing the deleted product, exit edit mode!
                        if (editProductId === id) {
                            exitEditMode();
                        }
                        loadRecentProducts();
                    } catch (err) {
                        console.error(err);
                        showToast(`Failed to delete product: ${err.message}`, "error");
                    }
                }
            });
        });

    } catch (err) {
        console.error('[Admin] loadRecentProducts failed:', err);
        productListEl.innerHTML = `<p class="text-white/20 text-xs text-center py-8">Could not load products. ${err.message}</p>`;
    }
}

// ─── Event Listeners ─────────────────────────────────────────────────────────
loginBtn.addEventListener('click', handleLogin);
loginPasswordEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleLogin(); });
loginEmailEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') loginPasswordEl.focus(); });

logoutBtn.addEventListener('click', () => handleLogout(true));

productForm.addEventListener('submit', handleFormSubmit);

resetFormBtn.addEventListener('click', () => {
    if (editProductId) {
        exitEditMode();
        showToast('Edit mode exited and form cleared.', 'info', 2000);
    } else {
        productForm.reset();
        productImages = [];
        renderImageGrid();
        specsContainer.innerHTML = '';
        packageContainer.innerHTML = '';
        discountWrap.style.display = 'none';
        showToast('Form cleared.', 'info', 2000);
    }
});

// Image input: click on add-tile opens file picker
imageInput.addEventListener('change', (e) => addFiles(e.target.files));
imgAddTile.addEventListener('click', () => imageInput.click());

// Drag & drop onto the add-tile
imgAddTile.addEventListener('dragover',  (e) => { e.preventDefault(); imgAddTile.classList.add('drag-over'); });
imgAddTile.addEventListener('dragleave', () => imgAddTile.classList.remove('drag-over'));
imgAddTile.addEventListener('drop', (e) => {
    e.preventDefault();
    imgAddTile.classList.remove('drag-over');
    addFiles(e.dataTransfer.files);
});

mrpInput.addEventListener('input', updateDiscountPreview);
priceInput.addEventListener('input', updateDiscountPreview);

refreshListBtn.addEventListener('click', loadRecentProducts);

const clearAllBtn = document.getElementById('clear-all-btn');
if (clearAllBtn) {
    clearAllBtn.addEventListener('click', async () => {
        if (!confirm("Are you absolutely sure you want to delete ALL products from the database? This cannot be undone.")) return;
        
        clearAllBtn.disabled = true;
        showToast("Deleting all products...", "info");
        try {
            const count = await clearProductsCollection();
            showToast(`Successfully deleted ${count} products.`, "success");
            if (editProductId) exitEditMode();
            loadRecentProducts();
        } catch (err) {
            console.error(err);
            showToast(`Failed to clear database: ${err.message}`, "error");
        } finally {
            clearAllBtn.disabled = false;
        }
    });
}

// Add spec & package button listeners
addSpecBtn.addEventListener('click', () => addSpecRow());
addPackageBtn.addEventListener('click', () => addPackageRow());

// Cancel edit button listener
if (cancelEditBtn) {
    cancelEditBtn.addEventListener('click', exitEditMode);
}

// Clear login error on input
loginEmailEl.addEventListener('input', clearLoginError);
loginPasswordEl.addEventListener('input', clearLoginError);

// ─── Init ────────────────────────────────────────────────────────────────────
initAuthGuard();

