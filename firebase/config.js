/*
 * Home Studio - Firebase Configurations
 * Connects client-side interface to Firebase Cloud Services (Auth, Storage, and Firestore)
 */

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const defaultFirebaseConfig = {
    apiKey: "AIzaSyCntetVthZqhqDK-ELNXTWaNPlH3wNzEZc",
    authDomain: "homestudio-b9066.firebaseapp.com",
    projectId: "homestudio-b9066",
    storageBucket: "homestudio-b9066.firebasestorage.app",
    messagingSenderId: "713403986365",
    appId: "1:713403986365:web:4a8be8e9aa6ee26d6b22d4",
    measurementId: "G-FWZBN6RJC4"
};

// Enable window-level overrides for client-only environment injection
const firebaseConfig = (typeof window !== 'undefined' && window.FIREBASE_CONFIG) 
    ? window.FIREBASE_CONFIG 
    : defaultFirebaseConfig;

let app = null;
let db = null;
let storage = null;
let auth = null;

// Gracefully handle unconfigured credentials so development fallback functions
if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY") {
    try {
        console.log("[Firebase Config] Checking initialization parameters...");
        console.log(`[Firebase Config] Target Project ID: ${firebaseConfig.projectId}`);
        
        if (getApps().length === 0) {
            app = initializeApp(firebaseConfig);
            console.log("[Firebase Config] New app instance initialized successfully.");
        } else {
            app = getApp();
            console.log("[Firebase Config] Re-using existing initialized app instance.");
        }
        
        db = getFirestore(app);
        storage = getStorage(app);
        auth = getAuth(app);
        
        console.log("[Firebase Config] Services bound: Firestore, Storage, Auth.");
    } catch (err) {
        console.error("[Firebase Config] Critical initialization failure:", err);
    }
} else {
    console.info("[Firebase Config] No credentials supplied. Fallback to Local JSON Mock mode.");
}

export { app, db, storage, auth };
export default firebaseConfig;
