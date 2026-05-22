/*
 * Home Studio - Firebase Integrations
 * Shared interface layer for Firebase Authentication, Firestore Database, and Storage Bucket uploads
 */

import { db, storage, auth } from '../firebase/config.js';

// Re-export services so modules only need to import this file
export { db, storage, auth };

const MOCK_PRODUCTS_PATH = 'data/products.json';

/**
 * Check if Firebase is fully connected and ready
 * @returns {boolean}
 */
export function isFirebaseReady() {
    return !!db;
}

/**
 * Map Firestore product document schema to the format expected by the frontend UI
 * @param {Object} docData - Document data from Firestore
 * @param {string} id - Document ID
 * @returns {Object} Clean UI product object
 */
export function mapFirestoreProductToUI(docData, id) {
    const images = docData.images || (docData.image ? [docData.image] : ["assets/images/placeholder.jpg"]);
    const price = parseFloat(docData.price) || 0;
    const originalPrice = docData.originalPrice ? parseFloat(docData.originalPrice) : price;
    const discount = docData.discount || (originalPrice > price ? `${Math.round(((originalPrice - price) / originalPrice) * 100)}% OFF` : "");
    const isNewLaunch = docData.isNewLaunch || false;
    const isBestseller = docData.isBestseller || false;
    
    return {
        id: id || docData.id,
        name: docData.title || docData.name || "",
        price: price,
        originalPrice: originalPrice,
        currency: docData.currency || "INR",
        category: docData.category || "",
        description: docData.description || "",
        image: docData.image || images[0] || "assets/images/placeholder.jpg",
        images: images,
        isNew: isNewLaunch || docData.isNew || docData.badge === "New" || docData.badge === "New Launch" || false,
        isNewLaunch: isNewLaunch,
        isBestseller: isBestseller,
        badge: docData.badge || (isNewLaunch || docData.isNew ? "New Launch" : isBestseller ? "Bestseller" : ""),
        rating: docData.rating || "4.5",
        discount: discount,
        specifications: docData.specifications || {},
        packageElements: docData.packageElements || [],
        options: docData.options || {
            "Fabric Color": docData.colors || [],
            "Size": docData.sizes || []
        },
        sizes: docData.sizes || (docData.options?.Size) || [],
        colors: docData.colors || (docData.options?.["Fabric Color"]) || []
    };
}

/**
 * Fetch all products from Firestore
 * @returns {Promise<Array>} List of mapped products
 */
const HOMEPAGE_PRODUCT_LIMIT = 10;


export async function getProducts({ limitCount = HOMEPAGE_PRODUCT_LIMIT } = {}) {
    if (!isFirebaseReady()) return [];
    try {
        const { collection, getDocs, query, limit, orderBy } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
        const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'), limit(limitCount));
        const snap = await getDocs(q);
        console.log(`[Firestore] getProducts: ${snap.docs.length} results.`);
        return snap.docs.map(doc => mapFirestoreProductToUI(doc.data(), doc.id));
    } catch (err) {
        console.warn('[Firestore] getProducts ordered query failed — falling back without orderBy:', err.message);
        try {
            const { collection: col2, getDocs: gd2, query: q2, limit: l2 } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
            const fallback = q2(col2(db, 'products'), l2(limitCount));
            const snap2 = await gd2(fallback);
            return snap2.docs.map(doc => mapFirestoreProductToUI(doc.data(), doc.id));
        } catch (innerErr) {
            console.error('[Firestore] getProducts fallback failed:', innerErr);
            return [];
        }
    }
}

/**
 * Fetch products marked as Bestsellers from Firestore
 * @param {number} limitCount
 * @returns {Promise<Array>}
 */
export async function getBestsellers(limitCount = 8) {
    if (!isFirebaseReady()) return [];
    try {
        const { collection, getDocs, query, where, limit } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
        const q = query(
            collection(db, 'products'),
            where('isBestseller', '==', true),
            limit(limitCount)
        );
        const snap = await getDocs(q);
        console.log(`[Firestore] getBestsellers: ${snap.docs.length} results.`);
        return snap.docs.map(doc => mapFirestoreProductToUI(doc.data(), doc.id));
    } catch (err) {
        console.error('[Firestore] getBestsellers failed:', err);
        return [];
    }
}

/**
 * Fetch products marked as New Launches from Firestore, ordered by createdAt desc
 * @param {number} limitCount
 * @returns {Promise<Array>}
 */
export async function getNewLaunches(limitCount = 8) {
    if (!isFirebaseReady()) return [];
    try {
        const { collection, getDocs, query, where, orderBy, limit } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
        try {
            const q = query(
                collection(db, 'products'),
                where('isNewLaunch', '==', true),
                orderBy('createdAt', 'desc'),
                limit(limitCount)
            );
            const snap = await getDocs(q);
            console.log(`[Firestore] getNewLaunches: ${snap.docs.length} results.`);
            return snap.docs.map(doc => mapFirestoreProductToUI(doc.data(), doc.id));
        } catch (indexErr) {
            // Fallback without orderBy when composite index is not yet built
            console.warn('[Firestore] getNewLaunches ordered query failed — falling back (build index in Firebase console):', indexErr.message);
            const { collection: col2, getDocs: gd2, query: q2, where: w2, limit: l2 } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
            const fallback = q2(col2(db, 'products'), w2('isNewLaunch', '==', true), l2(limitCount));
            const snap2 = await gd2(fallback);
            return snap2.docs.map(doc => mapFirestoreProductToUI(doc.data(), doc.id));
        }
    } catch (err) {
        console.error('[Firestore] getNewLaunches failed:', err);
        return [];
    }
}

/**
 * Fetch products filtered by category using where() or all products if 'all'
 * @param {string} category - Category slug
 * @returns {Promise<Array>} List of mapped products
 */
export async function getProductsByCategory(category) {
    if (!isFirebaseReady()) return [];
    try {
        const { collection, getDocs, query, where, orderBy } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
        
        let q;
        if (!category || category === 'all') {
            q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
        } else {
            const variations = [
                category.toLowerCase(),
                category.toUpperCase(),
                category.charAt(0).toUpperCase() + category.slice(1).toLowerCase()
            ];
            const uniqueVariations = [...new Set(variations)];
            
            q = query(
                collection(db, 'products'),
                where('category', 'in', uniqueVariations),
                orderBy('createdAt', 'desc')
            );
        }
        
        let snap;
        try {
            snap = await getDocs(q);
        } catch (indexErr) {
            console.warn(`[Firestore] getProductsByCategory (${category}) ordered query failed — falling back without orderBy:`, indexErr.message);
            if (!category || category === 'all') {
                q = query(collection(db, 'products'));
            } else {
                const variations = [
                    category.toLowerCase(),
                    category.toUpperCase(),
                    category.charAt(0).toUpperCase() + category.slice(1).toLowerCase()
                ];
                const uniqueVariations = [...new Set(variations)];
                q = query(collection(db, 'products'), where('category', 'in', uniqueVariations));
            }
            snap = await getDocs(q);
        }
        
        console.log(`[Firestore] getProductsByCategory (${category}): ${snap.docs.length} results.`);
        return snap.docs.map(doc => mapFirestoreProductToUI(doc.data(), doc.id));
    } catch (err) {
        console.error(`[Firestore] getProductsByCategory (${category}) failed:`, err);
        return [];
    }
}

/**
 * Verify a Firebase Auth UID has role: "admin" in the users collection
 * @param {string} uid
 * @returns {Promise<boolean>}
 */
export async function checkAdminRole(uid) {
    if (!uid || !isFirebaseReady()) return false;
    try {
        const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
        const userSnap = await getDoc(doc(db, 'users', uid));
        return userSnap.exists() && userSnap.data().role === 'admin';
    } catch (err) {
        console.error('[Firestore] checkAdminRole failed:', err);
        return false;
    }
}

/**
 * Save a new product document to Firestore products collection
 * @param {Object} productData - Validated product payload
 * @returns {Promise<string>} New document ID
 */
export async function saveProductToFirestore(productData) {
    if (!isFirebaseReady()) throw new Error('Firebase is not ready.');
    const { collection, addDoc, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
    const docRef = await addDoc(collection(db, 'products'), {
        ...productData,
        currency: 'INR',
        createdAt: serverTimestamp()
    });
    console.log(`[Firestore] Product saved. ID: ${docRef.id}`);
    return docRef.id;
}

/**
 * Fetch a single product directly from Firestore
 * @param {string} productId - Product ID
 * @returns {Promise<Object|null>} Mapped product object or null
 */
export async function getProductFromFirestore(productId) {
    if (!isFirebaseReady()) {
        console.warn("[Firestore DB] Firebase not configured. Cannot perform direct lookup.");
        return null;
    }
    
    try {
        const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
        console.log(`[Firestore DB] Performing direct lookup for product ID: ${productId}`);
        const docRef = doc(db, 'products', productId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            console.log(`[Firestore DB] Product found: ${docSnap.id}`);
            return mapFirestoreProductToUI(docSnap.data(), docSnap.id);
        } else {
            console.log(`[Firestore DB] Product ID: ${productId} not found in Firestore.`);
            return null;
        }
    } catch (err) {
        console.error(`[Firestore DB] Error fetching single product ${productId}:`, err);
        return null;
    }
}

/* ==========================================================================
   Firestore - Orders Collection
   ========================================================================== */

/**
 * Save customer order details to database
 * @param {Object} customerInfo 
 * @param {Array} cartItems 
 * @param {number} totalAmount 
 * @returns {Promise<string|null>} Created order reference ID
 */
export async function saveOrderToFirestore(customerInfo, cartItems, totalAmount) {
    if (!isFirebaseReady()) return null;
    
    try {
        const { collection, addDoc, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
        console.log("[Firestore DB] Saving customer order details...");
        const orderRef = await addDoc(collection(db, 'orders'), {
            customer: customerInfo,
            items: cartItems.map(item => ({
                id: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                options: item.selectedOptions || {}
            })),
            total: totalAmount,
            status: 'pending',
            createdAt: serverTimestamp()
        });
        console.log(`[Firestore DB] Order logged successfully. Ref ID: ${orderRef.id}`);
        return orderRef.id;
    } catch (err) {
        console.error("[Firestore DB] Error logging order:", err);
        if (err.code === 'permission-denied') {
            console.error("[Firestore Rules] PERMISSION DENIED: Write access to 'orders' is blocked. Check security rules in the console.");
        }
        throw err;
    }
}

/* ==========================================================================
   Firebase - File Storage Upload
   ========================================================================== */

/**
 * Upload single image binary to Firebase Storage bucket
 * @param {File} file - File object from input
 * @param {string} path - Upload path directory (e.g. 'products/')
 * @returns {Promise<string|null>} Downloadable URL
 */
export async function uploadImageToStorage(file, path = 'products/') {
    if (!storage) {
        console.warn("Firebase Storage is not initialized. Using local temporary object URL fallback.");
        // Returns a local temporary Object URL so newly added mock items display in the browser.
        return URL.createObjectURL(file);
    }
    
    try {
        const { ref, uploadBytes, getDownloadURL } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js");
        const uniqueName = `${Date.now()}_${file.name}`;
        const storageRef = ref(storage, `${path}${uniqueName}`);
        
        const snapshot = await uploadBytes(storageRef, file);
        const downloadUrl = await getDownloadURL(snapshot.ref);
        return downloadUrl;
    } catch (err) {
        console.error("Error uploading image to storage:", err);
        throw err;
    }
}

/* ==========================================================================
   Firestore - Product Management (CRUD)
   ========================================================================== */

/**
 * Add a new product listing (Admin feature)
 * @param {Object} productData 
 */
export async function addProductToFirestore(productData) {
    if (!isFirebaseReady()) {
        throw new Error("Firebase is not initialized. Cannot add product.");
    }
    
    try {
        const { collection, addDoc, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
        console.log("[Firestore DB] Uploading new product listing...", productData);
        const docRef = await addDoc(collection(db, 'products'), {
            ...productData,
            createdAt: serverTimestamp()
        });
        console.log(`[Firestore DB] Product created. Document ID: ${docRef.id}`);
        return docRef.id;
    } catch (err) {
        console.error("[Firestore DB] Error adding product:", err);
        if (err.code === 'permission-denied') {
            console.error("[Firestore Rules] PERMISSION DENIED: Write/create access to 'products' is blocked. Check security rules.");
        }
        throw err;
    }
}

/**
 * Update an existing product listing (Admin feature)
 * @param {string} productId 
 * @param {Object} updatedFields 
 */
export async function updateProductInFirestore(productId, updatedFields) {
    if (!isFirebaseReady()) return false;
    
    try {
        const { doc, updateDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
        console.log(`[Firestore DB] Updating product ID: ${productId} with fields:`, updatedFields);
        const docRef = doc(db, 'products', productId);
        await updateDoc(docRef, updatedFields);
        console.log("[Firestore DB] Product document update complete.");
        return true;
    } catch (err) {
        console.error("[Firestore DB] Error updating product:", err);
        if (err.code === 'permission-denied') {
            console.error("[Firestore Rules] PERMISSION DENIED: Update access to 'products' is blocked. Check security rules.");
        }
        throw err;
    }
}

/**
 * Delete product listing from Firestore (Admin feature)
 * @param {string} productId 
 */
export async function deleteProductFromFirestore(productId) {
    if (!isFirebaseReady()) {
        throw new Error("Firebase is not initialized. Cannot delete product.");
    }
    
    try {
        const { doc, deleteDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
        console.log(`[Firestore DB] Requesting deletion of product ID: ${productId}`);
        const docRef = doc(db, 'products', productId);
        await deleteDoc(docRef);
        console.log("[Firestore DB] Product deleted successfully.");
        return true;
    } catch (err) {
        console.error("[Firestore DB] Error deleting product:", err);
        if (err.code === 'permission-denied') {
            console.error("[Firestore Rules] PERMISSION DENIED: Delete access to 'products' is blocked. Check security rules.");
        }
        throw err;
    }
}

/* ==========================================================================
   Firestore - Database Seeding Utility
   ========================================================================== */

/**
 * Seeding Script to populate Firestore collections with default inventory,
 * categories, and register a default admin user account role.
 * @param {string} adminEmail
 * @param {string} adminPassword
 */
export async function seedDatabase(adminEmail = 'admin@homestudio.com', adminPassword = 'Password123') {
    if (!isFirebaseReady()) {
        throw new Error("Firebase is not initialized. Cannot seed database.");
    }
    
    console.log("Starting Firestore database seeding...");
    
    try {
        const { collection, doc, writeBatch, serverTimestamp, setDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
        
        // 1. Seed Categories
        const categoriesList = ['sheets', 'pillows', 'duvets', 'comforters', 'curtains', 'candles', 'living', 'bedroom', 'dining', 'lighting', 'decor'];
        const categoryBatch = writeBatch(db);
        categoriesList.forEach(cat => {
            const catRef = doc(collection(db, 'categories'), cat);
            categoryBatch.set(catRef, { name: cat, active: true });
        });
        await categoryBatch.commit();
        console.log("Categories collection seeded successfully.");
        
        // 2. Fetch and Seed Products
        const response = await fetch(MOCK_PRODUCTS_PATH);
        if (!response.ok) throw new Error("Failed to load products.json to seed.");
        const data = await response.json();
        const mockProducts = data.products || data;
        
        const productsBatch = writeBatch(db);
        mockProducts.forEach(prod => {
            // Map UI schema to firestore collection schema
            const productDoc = doc(collection(db, 'products'), prod.id);
            productsBatch.set(productDoc, {
                title: prod.name,
                price: parseFloat(prod.price),
                category: prod.category,
                description: prod.description,
                images: prod.images || (prod.image ? [prod.image] : ["assets/images/placeholder.jpg"]),
                sizes: prod.options?.Size || prod.sizes || [],
                colors: prod.options?.["Fabric Color"] || prod.options?.Fabric || prod.colors || [],
                badge: prod.badge || (prod.isNew ? 'New Launch' : ''),
                originalPrice: prod.originalPrice ? parseFloat(prod.originalPrice) : parseFloat(prod.price),
                discount: prod.discount || '',
                rating: prod.rating || '4.5',
                createdAt: serverTimestamp()
            });
        });
        await productsBatch.commit();
        console.log("Products collection seeded successfully.");
        
        console.log("Database seeding completed successfully!");
        alert("Firestore database seeded successfully!");
        return true;
    } catch (err) {
        console.error("Failed to seed database:", err);
        alert(`Failed to seed database: ${err.message}`);
        throw err;
    }
}

/**
 * Delete all documents in the Firestore products collection (Admin feature)
 * @returns {Promise<number>} Count of deleted products
 */
export async function clearProductsCollection() {
    if (!isFirebaseReady()) throw new Error("Firebase is not initialized.");
    const { collection, getDocs, deleteDoc, doc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
    console.log("[Firestore DB] Requesting clear of all products...");
    const snap = await getDocs(collection(db, 'products'));
    const deletePromises = snap.docs.map(d => deleteDoc(doc(db, 'products', d.id)));
    await Promise.all(deletePromises);
    console.log(`[Firestore DB] Cleared ${snap.docs.length} products.`);
    return snap.docs.length;
}

