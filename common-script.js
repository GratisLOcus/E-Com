// common-script.js - Centralized JavaScript for Artisan Gallery with Firebase Backend

// Import Firebase services
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, query, onSnapshot, addDoc, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";

// Explicit Firebase configuration provided by the user.
// This will override any environment-provided __firebase_config to ensure direct connection.
const firebaseConfig = {
    apiKey: "AIzaSyDN-3iibgf3trZeElUzbWXSQ-y2PR_PoPM",
    authDomain: "iskandra-art-database.firebaseapp.com",
    projectId: "iskandra-art-database", // Ensure this is your actual project ID
    storageBucket: "iskandra-art-database.firebasestorage.app",
    messagingSenderId: "1043022436962",
    appId: "1:1043022436962:web:ecc2c6e12da18ecbd3cf3b",
    measurementId: "G-4EPVRY3TXK"
};

// Global Firebase variables (initialAuthToken is still environment-provided if available)
// FIX: Use firebaseConfig.projectId directly for appId to ensure consistency with rules
const appId = firebaseConfig.projectId; 
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;


// Firebase App Initialization
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

let userId = null; // To store the current user's ID
let isAuthReady = false; // Flag to indicate if authentication is ready

// --- Utility Functions ---

/**
 * Displays a custom message box instead of alert().
 * @param {string} message The message to display.
 * @param {string} type 'success', 'error', 'info'
 */
function showMessageBox(message, type = 'info') {
    const messageBox = document.createElement('div');
    messageBox.className = `fixed bottom-4 right-4 p-4 rounded-lg shadow-lg text-white z-[1000] transition-transform transform translate-y-full opacity-0`;

    if (type === 'success') {
        messageBox.classList.add('bg-green-500');
    } else if (type === 'error') {
        messageBox.classList.add('bg-red-500');
    } else {
        messageBox.classList.add('bg-gray-800');
    }

    messageBox.textContent = message;
    document.body.appendChild(messageBox);

    // Animate in
    setTimeout(() => {
        messageBox.classList.remove('translate-y-full', 'opacity-0');
        messageBox.classList.add('translate-y-0', 'opacity-100');
    }, 100);

    // Animate out and remove
    setTimeout(() => {
        messageBox.classList.remove('translate-y-0', 'opacity-100');
        messageBox.classList.add('translate-y-full', 'opacity-0');
        messageBox.addEventListener('transitionend', () => messageBox.remove());
    }, 4000);
}


/**
 * Generates a unique ID (e.g., for new Firestore documents).
 * @returns {string} A unique ID.
 */
function generateUniqueId() {
    return doc(collection(db, "temp")).id;
}

/**
 * Toggles the visibility of the admin panel.
 */
function toggleAdminPanel() {
    const adminPanel = document.getElementById('admin-panel');
    if (adminPanel) {
        adminPanel.classList.toggle('show-admin');
        document.body.classList.toggle('no-scroll', adminPanel.classList.contains('show-admin'));
        if (adminPanel.classList.contains('show-admin')) {
            // If the panel is shown, ensure correct sections are visible based on auth state
            updateAdminPanelVisibility();
        }
    }
}

/**
 * Updates the visibility of admin sections based on user login status.
 */
function updateAdminPanelVisibility() {
    const adminLoginSection = document.getElementById('admin-login-section');
    const adminSettingsSection = document.getElementById('admin-settings-section');
    const adminAddArtworkSection = document.getElementById('admin-add-artwork-section');
    const adminManageArtworkSection = document.getElementById('admin-manage-artwork-section');
    const adminManageGallerySection = document.getElementById('admin-manage-gallery-section'); // NEW
    const adminLogoutBtn = document.getElementById('admin-logout-btn');

    if (auth.currentUser && !auth.currentUser.isAnonymous) {
        // User is logged in (not anonymous)
        adminLoginSection?.classList.add('hidden');
        adminSettingsSection?.classList.remove('admin-section-hidden');
        adminAddArtworkSection?.classList.remove('admin-section-hidden');
        adminManageArtworkSection?.classList.remove('admin-section-hidden');
        adminManageGallerySection?.classList.remove('admin-section-hidden'); // NEW
        adminLogoutBtn?.classList.remove('admin-section-hidden');
        document.getElementById('admin-login-message')?.classList.add('hidden');
    } else {
        // User is not logged in or is anonymous
        adminLoginSection?.classList.remove('hidden');
        adminSettingsSection?.classList.add('admin-section-hidden');
        adminAddArtworkSection?.classList.add('admin-section-hidden');
        adminManageArtworkSection?.classList.add('admin-section-hidden');
        adminManageGallerySection?.classList.add('admin-section-hidden'); // NEW
        adminLogoutBtn?.classList.add('admin-section-hidden');
        document.getElementById('admin-login-message')?.classList.remove('hidden');
    }
}


/**
 * Renders an artwork card for display on shop/home pages.
 * @param {object} artwork - The artwork data.
 * @param {boolean} isAdmin - Whether to render admin controls.
 * @returns {string} HTML string for the artwork card.
 */
function renderArtworkCard(artwork, isAdmin = false) {
    // Check if artwork.imageUrl is a valid URL before using it.
    // If not, use the placeholder image.
    const isValidUrl = artwork.imageUrl && (artwork.imageUrl.startsWith('http://') || artwork.imageUrl.startsWith('https://'));
    const imageUrl = isValidUrl ? artwork.imageUrl : `https://placehold.co/400x300/e0e0e0/555555?text=No+Image`;

    // Log the image URL for debugging
    // console.log(`Rendering artwork: ${artwork.name}, Image URL: ${imageUrl}`);

    let adminControls = '';
    if (isAdmin) {
        adminControls = `
            <div class="mt-4 flex justify-around space-x-2">
                <button data-id="${artwork.id}" class="edit-artwork-btn bg-gray-200 text-black py-2 px-4 rounded hover:bg-gray-300 transition text-sm">Edit</button>
                <button data-id="${artwork.id}" class="delete-artwork-btn bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600 transition text-sm">Delete</button>
            </div>
        `;
    }

    return `
        <div class="artwork-card bg-white rounded-lg shadow-md overflow-hidden relative">
            <div class="relative pb-3/4 min-h-40 overflow-hidden"> <!-- Added min-h-40 for robustness -->
                <a href="product.html?id=${artwork.id}" class="block">
                    <img src="${imageUrl}" alt="${artwork.name}" class="absolute h-full w-full object-cover transition-transform duration-300 hover:scale-105" onerror="this.onerror=null;this.src='https://placehold.co/400x300/e0e0e0/555555?text=No+Image';">
                </a>
                <div class="artwork-overlay absolute inset-0 flex flex-col items-center justify-center gap-2 transition-opacity duration-300">
                    <button class="add-to-cart-btn bg-white text-black py-2 px-4 rounded-full hover:bg-gray-200 transition" data-id="${artwork.id}" data-name="${artwork.name}" data-price="${artwork.price}" data-image="${imageUrl}">
                        Add to Cart
                    </button>
                    <a href="product.html?id=${artwork.id}" class="view-product-btn bg-white text-black py-2 px-4 rounded-full hover:bg-gray-200 transition">
                        View Product
                    </a>
                </div>
            </div>
            <div class="p-4">
                <h3 class="text-xl font-semibold mb-1">${artwork.name}</h3>
                <p class="text-gray-600 text-sm mb-2">${artwork.description.substring(0, 70)}...</p>
                <p class="text-lg font-bold text-black">$${artwork.price.toFixed(2)}</p>
                ${adminControls}
            </div>
        </div>
    `;
}

/**
 * Renders a cart item.
 * @param {object} item - The cart item data.
 * @returns {string} HTML string for the cart item.
 */
function renderCartItem(item) {
    const isValidUrl = item.image && (item.image.startsWith('http://') || item.image.startsWith('https://'));
    const imageUrl = isValidUrl ? item.image : `https://placehold.co/100x100/e0e0e0/555555?text=No+Image`;

    return `
        <div class="flex items-center border-b pb-4 mb-4">
            <img src="${imageUrl}" alt="${item.name}" class="w-24 h-24 object-contain rounded-md mr-4" onerror="this.onerror=null;this.src='https://placehold.co/100x100/e0e0e0/555555?text=No+Image';">
            <div class="flex-grow">
                <h4 class="font-semibold text-lg">${item.name}</h4>
                <p class="text-gray-600 text-sm">$${item.price.toFixed(2)}</p>
                <div class="flex items-center mt-2">
                    <button data-id="${item.id}" class="decrease-quantity-btn bg-gray-200 text-gray-800 w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-300 transition">-</button>
                    <span class="mx-3 text-lg font-medium">${item.quantity}</span>
                    <button data-id="${item.id}" class="increase-quantity-btn bg-gray-200 text-gray-800 w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-300 transition">+</button>
                </div>
            </div>
            <button data-id="${item.id}" class="remove-from-cart-btn text-red-500 hover:text-red-700 ml-4">
                <i class="fas fa-trash-alt"></i>
            </button>
        </div>
    `;
}

/**
 * Renders an About Gallery item.
 * @param {object} image - The gallery image data.
 * @param {boolean} isAdmin - Whether to render admin controls.
 * @returns {string} HTML string for the gallery image card.
 */
function renderAboutGalleryItem(image, isAdmin = false) {
    const isValidUrl = image.imageUrl && (image.imageUrl.startsWith('http://') || image.imageUrl.startsWith('https://'));
    const imageUrl = isValidUrl ? image.imageUrl : `https://placehold.co/400x300/e0e0e0/555555?text=No+Image`;

    let adminControls = '';
    if (isAdmin) {
        adminControls = `
            <div class="absolute top-2 right-2 flex space-x-2">
                <button data-id="${image.id}" class="edit-gallery-image-admin-btn bg-blue-500 text-white p-2 rounded-full text-xs hover:bg-blue-600 transition" title="Edit Gallery Image">
                    <i class="fas fa-edit"></i>
                </button>
                <button data-id="${image.id}" data-image-url="${image.imageUrl}" class="delete-gallery-image-admin-btn bg-red-500 text-white p-2 rounded-full text-xs hover:bg-red-600 transition" title="Delete Gallery Image">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
    }

    return `
        <div class="relative bg-white rounded-lg shadow-md overflow-hidden">
            <img src="${imageUrl}" alt="${image.description || 'Gallery Image'}" class="w-full h-48 object-cover rounded-t-lg" onerror="this.onerror=null;this.src='https://placehold.co/400x300/e0e0e0/555555?text=No+Image';">
            <div class="p-4">
                <p class="text-gray-700 text-sm">${image.description || 'No description provided.'}</p>
            </div>
            ${adminControls}
        </div>
    `;
}


// --- Firebase Authentication ---

// Listen for authentication state changes
onAuthStateChanged(auth, (user) => {
    isAuthReady = true; // Auth state is now known
    if (user) {
        userId = user.uid;
        console.log("Auth State Changed: User logged in:", userId, user.isAnonymous ? "(Anonymous)" : "(Authenticated)");
    } else {
        userId = null;
        console.log("Auth State Changed: User logged out or is anonymous.");
    }
    updateAdminPanelVisibility(); // Update UI based on auth state
    loadWebsiteSettings(); // Load settings once auth is ready
    loadArtworks(); // Load artworks once auth is ready
    loadAboutContent(); // Load about content once auth is ready
    loadCartItems(); // Load cart items once auth is ready
    loadAboutGallery(); // NEW: Load about gallery content
    loadHeroImage(); // NEW: Load hero image content
});

/**
 * Handles admin login.
 */
async function handleAdminLogin(event) {
    event.preventDefault();
    const email = document.getElementById('admin-email-input').value;
    const password = document.getElementById('admin-password-input').value;
    const loginMessage = document.getElementById('admin-login-message');

    if (!email || !password) {
        loginMessage.textContent = "Please enter both email and password.";
        loginMessage.classList.add('text-red-500');
        return;
    }

    loginMessage.textContent = "Logging in...";
    loginMessage.classList.remove('text-red-500', 'text-green-500');
    loginMessage.classList.add('text-gray-500');

    try {
        await signInWithEmailAndPassword(auth, email, password);
        loginMessage.textContent = "Login successful!";
        loginMessage.classList.remove('text-red-500', 'text-gray-500');
        loginMessage.classList.add('text-green-500');
        updateAdminPanelVisibility();
        // Clear login form
        document.getElementById('admin-email-input').value = '';
        document.getElementById('admin-password-input').value = '';

    } catch (error) {
        console.error("Admin login error:", error);
        loginMessage.textContent = `Login failed: ${error.message}`;
        loginMessage.classList.remove('text-green-500', 'text-gray-500');
        loginMessage.classList.add('text-red-500');
    }
}

/**
 * Handles admin logout.
 */
async function handleAdminLogout() {
    try {
        await signOut(auth);
        showMessageBox("Logged out successfully.", "success");
        updateAdminPanelVisibility();
    } catch (error) {
        console.error("Admin logout error:", error);
        showMessageBox(`Logout failed: ${error.message}`, "error");
    }
}

// --- Website Settings (Firestore) ---

/**
 * Loads website settings (like name) from Firestore.
 */
async function loadWebsiteSettings() {
    if (!isAuthReady) return; // Wait for auth to be ready
    console.log("loadWebsiteSettings called. userId:", userId);
    const websiteSettingsDocRef = doc(db, `artifacts/${appId}/public/data/websiteSettings`, 'general');

    try {
        const docSnap = await getDoc(websiteSettingsDocRef);
        if (docSnap.exists()) {
            const settings = docSnap.data();
            // Apply settings to header and footer
            document.querySelectorAll('[data-setting="websiteName"]').forEach(el => {
                el.textContent = settings.websiteName || "WBI"; // Use WBI as default as per user's request
            });
            // Update admin panel input if it exists
            const websiteNameInput = document.getElementById('website-name-input');
            if (websiteNameInput) {
                websiteNameInput.value = settings.websiteName || "WBI";
            }
        } else {
            // console.log("No website settings found, using default.");
            // Set default if not found
            await setDoc(websiteSettingsDocRef, { websiteName: "WBI" }, { merge: true }); // Use WBI as default
            document.querySelectorAll('[data-setting="websiteName"]').forEach(el => {
                el.textContent = "WBI";
            });
        }
    } catch (error) {
        console.error("Error loading website settings:", error);
    }
}

/**
 * Updates the website name in Firestore.
 */
async function updateWebsiteName() {
    if (!auth.currentUser || auth.currentUser.isAnonymous) {
        showMessageBox("Authentication required to update settings.", "error");
        return;
    }
    const websiteNameInput = document.getElementById('website-name-input');
    const newWebsiteName = websiteNameInput ? websiteNameInput.value.trim() : '';

    if (!newWebsiteName) {
        showMessageBox("Website name cannot be empty.", "error");
        return;
    }

    const websiteSettingsDocRef = doc(db, `artifacts/${appId}/public/data/websiteSettings`, 'general');
    try {
        await setDoc(websiteSettingsDocRef, { websiteName: newWebsiteName }, { merge: true });
        showMessageBox("Website name updated successfully!", "success");
        loadWebsiteSettings(); // Reload to update all displayed names
    } catch (error) {
        console.error("Error updating website name:", error);
        showMessageBox(`Failed to update website name: ${error.message}`, "error");
    }
}

// --- Hero Image Management (NEW) ---

/**
 * Loads the hero image from Firestore and applies it to the hero section.
 */
async function loadHeroImage() {
    if (!isAuthReady) return;
    const heroDocRef = doc(db, `artifacts/${appId}/public/data/websiteSettings`, 'heroImage');
    const heroSection = document.getElementById('hero-section');
    const heroImagePreview = document.getElementById('hero-image-preview'); // Admin panel preview
    const heroImagePreviewContainer = document.getElementById('hero-image-preview-container'); // Admin panel preview container

    try {
        const docSnap = await getDoc(heroDocRef);
        let imageUrl = '';
        if (docSnap.exists()) {
            const data = docSnap.data();
            imageUrl = data.imageUrl || '';
        }

        const defaultHeroImageUrl = 'https://placehold.co/1200x500/cccccc/333333?text=Hero+Image';
        const finalImageUrl = imageUrl && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) ? imageUrl : defaultHeroImageUrl;

        if (heroSection) {
            heroSection.style.backgroundImage = `url('${finalImageUrl}')`;
            // No direct background-size change here, it's handled by CSS
        }

        // Populate admin panel inputs
        if (heroImagePreview && heroImagePreviewContainer) {
            if (imageUrl) {
                heroImagePreview.src = imageUrl;
                heroImagePreview.dataset.originalUrl = imageUrl;
                heroImagePreviewContainer.classList.remove('hidden');
            } else {
                heroImagePreview.src = '';
                delete heroImagePreview.dataset.originalUrl;
                heroImagePreviewContainer.classList.add('hidden');
            }
        }

    } catch (error) {
        console.error("Error loading hero image:", error);
        if (heroSection) {
            heroSection.style.backgroundImage = `url('https://placehold.co/1200x500/ff0000/ffffff?text=Error+Loading')`;
        }
    }
}

/**
 * Updates the hero image in Firestore and Storage.
 */
async function updateHeroImage() {
    if (!auth.currentUser || auth.currentUser.isAnonymous) {
        showMessageBox("Authentication required to update hero image.", "error");
        return;
    }

    const heroImageUpload = document.getElementById('hero-image-upload');
    const removeHeroImageBtn = document.getElementById('remove-hero-image-btn');
    const currentImageUrlElement = document.getElementById('hero-image-preview');
    const originalFirebaseImageUrl = currentImageUrlElement?.dataset.originalUrl || '';

    const imageFile = heroImageUpload ? heroImageUpload.files[0] : null;

    const heroDocRef = doc(db, `artifacts/${appId}/public/data/websiteSettings`, 'heroImage');
    let imageUrlToSave = originalFirebaseImageUrl;

    try {
        if (removeHeroImageBtn && removeHeroImageBtn.dataset.removed === 'true') {
            if (originalFirebaseImageUrl && (originalFirebaseImageUrl.startsWith('http://') || originalFirebaseImageUrl.startsWith('https://')) && !originalFirebaseImageUrl.includes('placehold.co')) {
                const oldImageRef = ref(storage, originalFirebaseImageUrl);
                await deleteObject(oldImageRef).catch(e => console.warn("Could not delete old hero image, it might not exist:", e));
            }
            imageUrlToSave = '';
            removeHeroImageBtn.dataset.removed = 'false';
        } else if (imageFile) {
            if (originalFirebaseImageUrl && (originalFirebaseImageUrl.startsWith('http://') || originalFirebaseImageUrl.startsWith('https://')) && !originalFirebaseImageUrl.includes('placehold.co')) {
                const oldImageRef = ref(storage, originalFirebaseImageUrl);
                await deleteObject(oldImageRef).catch(e => console.warn("Could not delete old hero image, it might not exist:", e));
            }

            const imageRef = ref(storage, `artifacts/${appId}/hero_images/${generateUniqueId()}_${imageFile.name}`);
            const snapshot = await uploadBytes(imageRef, imageFile);
            imageUrlToSave = await getDownloadURL(snapshot.ref);
            showMessageBox("Hero image uploaded.", "info");
        }

        await setDoc(heroDocRef, { imageUrl: imageUrlToSave }, { merge: true });
        showMessageBox("Hero image updated successfully!", "success");
        loadHeroImage(); // Reload to update displayed image
    } catch (error) {
        console.error("Error updating hero image:", error);
        showMessageBox(`Failed to update hero image: ${error.message}`, "error");
    }
}


// --- About Us Content (Firestore & Storage) ---

/**
 * Loads the about us content from Firestore and image from Storage.
 */
async function loadAboutContent() {
    if (!isAuthReady) return;
    console.log("loadAboutContent called. userId:", userId);
    const aboutDocRef = doc(db, `artifacts/${appId}/public/data/pages`, 'about');
    const aboutPageContentDiv = document.getElementById('about-page-content');
    const aboutImagePreview = document.getElementById('about-image-preview'); // Admin panel preview
    const aboutImagePreviewContainer = document.getElementById('about-image-preview-container'); // Admin panel preview container

    // Main image on about.html
    const aboutPageMainImage = document.querySelector('section.bg-gray-100 .md\\:w-1\\/2 img');
    const aboutContentInput = document.getElementById('about-content-input'); // Admin panel textarea

    try {
        const docSnap = await getDoc(aboutDocRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            let contentHtml = data.content || '<p>Our story begins with a passion for art and a desire to connect unique creations with appreciative homes. We are dedicated to showcasing exceptional pieces from talented artists around the world, making art accessible and enjoyable for everyone.</p>';
            let imageUrl = data.imageUrl || '';

            // Render on about.html (text content) - Uses innerHTML for formatting
            if (aboutPageContentDiv) {
                aboutPageContentDiv.innerHTML = contentHtml;
            }

            // Render on about.html (main image)
            if (aboutPageMainImage) {
                const isValidUrl = imageUrl && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'));
                aboutPageMainImage.src = isValidUrl ? imageUrl : `https://placehold.co/600x400/e0e0e0/555555?text=About+Image`;
                if (isValidUrl) {
                    aboutPageMainImage.dataset.originalUrl = imageUrl;
                } else {
                    delete aboutPageMainImage.dataset.originalUrl;
                }
                if (!isValidUrl) { // Only set alt if using placeholder
                    aboutPageMainImage.alt = "About Us Placeholder Image";
                }
            }

            // Populate admin panel inputs
            if (aboutContentInput) {
                aboutContentInput.value = data.content || '';
            }
            if (aboutImagePreview && aboutImagePreviewContainer) {
                const isValidUrl = imageUrl && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'));
                if (isValidUrl) {
                    aboutImagePreview.src = imageUrl;
                    aboutImagePreview.dataset.originalUrl = imageUrl; // Store original URL on the admin preview image
                    aboutImagePreviewContainer.classList.remove('hidden');
                } else {
                    aboutImagePreview.src = '';
                    delete aboutImagePreview.dataset.originalUrl; // Remove if no image
                    aboutImagePreviewContainer.classList.add('hidden');
                }
            }
        } else {
            // Set default if no content exists
            const defaultContent = '<p>Our story begins with a passion for art and a desire to connect unique creations with appreciative homes. We are dedicated to showcasing exceptional pieces from talented artists around the world, making art accessible and enjoyable for everyone.</p>';
            await setDoc(aboutDocRef, { content: defaultContent, imageUrl: '' }, { merge: true });
            if (aboutPageContentDiv) {
                aboutPageContentDiv.innerHTML = defaultContent;
            }
        }
    } catch (error) {
        console.error("Error loading about content:", error);
        if (aboutPageContentDiv) {
            aboutPageContentDiv.innerHTML = `<p class="text-center text-red-500">Failed to load about content. Please try again later.</p>`;
        }
        if (aboutPageMainImage) {
            aboutPageMainImage.src = `https://placehold.co/600x400/e0e0e0/555555?text=Error+Loading`;
        }
    }
}

/**
 * Updates the about us content and optional image in Firestore and Storage.
 */
async function updateAboutContent() {
    if (!auth.currentUser || auth.currentUser.isAnonymous) {
        showMessageBox("Authentication required to update about page.", "error");
        return;
    }

    const aboutContentInput = document.getElementById('about-content-input');
    const aboutImageUpload = document.getElementById('about-image-upload');
    const removeAboutImageBtn = document.getElementById('remove-about-image-btn');
    const currentImageUrlElement = document.getElementById('about-image-preview'); // Get the element to access data-original-url
    const originalFirebaseImageUrl = currentImageUrlElement?.dataset.originalUrl || ''; // Get stored original Firebase URL

    const newContent = aboutContentInput ? aboutContentInput.value.trim() : '';
    const imageFile = aboutImageUpload ? aboutImageUpload.files[0] : null;

    if (!newContent) {
        showMessageBox("About Us content cannot be empty.", "error");
        return;
    }

    const aboutDocRef = doc(db, `artifacts/${appId}/public/data/pages`, 'about');
    let imageUrlToSave = originalFirebaseImageUrl; // Start with the original Firebase URL from Firestore

    try {
        // Handle image removal
        if (removeAboutImageBtn && removeAboutImageBtn.dataset.removed === 'true') {
            // Only attempt to delete if there was an actual Firebase Storage URL previously
            if (originalFirebaseImageUrl && (originalFirebaseImageUrl.startsWith('http://') || originalFirebaseImageUrl.startsWith('https://')) && !originalFirebaseImageUrl.includes('placehold.co')) {
                const oldImageRef = ref(storage, originalFirebaseImageUrl);
                await deleteObject(oldImageRef).catch(e => console.warn("Could not delete old about image, it might not exist:", e));
            }
            imageUrlToSave = ''; // Clear the image URL
            removeAboutImageBtn.dataset.removed = 'false'; // Reset flag
        } else if (imageFile) {
            // Handle new image upload
            // Delete old image if it exists and is a Firebase Storage URL
            if (originalFirebaseImageUrl && (originalFirebaseImageUrl.startsWith('http://') || originalFirebaseImageUrl.startsWith('https://')) && !originalFirebaseImageUrl.includes('placehold.co')) {
                const oldImageRef = ref(storage, originalFirebaseImageUrl);
                await deleteObject(oldImageRef).catch(e => console.warn("Could not delete old about image, it might not exist:", e));
            }

            const imageRef = ref(storage, `artifacts/${appId}/about_images/${generateUniqueId()}_${imageFile.name}`);
            const snapshot = await uploadBytes(imageRef, imageFile);
            imageUrlToSave = await getDownloadURL(snapshot.ref);
            showMessageBox("About image uploaded.", "info");
        }

        await setDoc(aboutDocRef, {
            content: newContent,
            imageUrl: imageUrlToSave
        }, { merge: true });

        showMessageBox("About page updated successfully!", "success");
        loadAboutContent(); // Reload to update displayed content
    } catch (error) {
        console.error("Error updating about page:", error);
        showMessageBox(`Failed to update about page: ${error.message}`, "error");
    }
}


// --- Artwork Management (Firestore & Storage) ---

/**
 * Handles adding a new artwork.
 */
async function handleAddArtwork(event) {
    event.preventDefault();
    if (!auth.currentUser || auth.currentUser.isAnonymous) {
        showMessageBox("Admin login required to add artwork.", "error");
        return;
    }

    const name = document.getElementById('product-name-input').value;
    const description = document.getElementById('product-description-input').value;
    const price = parseFloat(document.getElementById('product-price-input').value);
    const imageFile = document.getElementById('product-image-upload').files[0];
    const statusMessage = document.getElementById('artwork-status-message');

    if (!name || !description || isNaN(price) || price < 0) {
        statusMessage.textContent = "Please fill all required fields correctly.";
        statusMessage.classList.add('text-red-500');
        return;
    }

    statusMessage.textContent = "Adding artwork...";
    statusMessage.classList.remove('text-red-500');
    statusMessage.classList.add('text-gray-500');

    let imageUrl = '';
    try {
        if (imageFile) {
            const imageRef = ref(storage, `artifacts/${appId}/artwork_images/${generateUniqueId()}_${imageFile.name}`);
            const snapshot = await uploadBytes(imageRef, imageFile);
            imageUrl = await getDownloadURL(snapshot.ref);
            // showMessageBox("Image uploaded successfully!", "success");
        }

        const newArtwork = {
            name,
            description,
            price,
            imageUrl,
            createdAt: new Date(),
            updatedAt: new Date(),
            isFeatured: false // Default to not featured
        };

        await addDoc(collection(db, `artifacts/${appId}/public/data/artworks`), newArtwork);
        statusMessage.textContent = "Artwork added successfully!";
        statusMessage.classList.remove('text-gray-500');
        statusMessage.classList.add('text-green-500');
        // Clear form
        document.getElementById('add-artwork-form').reset();
        document.getElementById('product-image-upload').value = ''; // Clear file input
        showMessageBox("Artwork added successfully!", "success");

    } catch (error) {
        console.error("Error adding artwork:", error);
        statusMessage.textContent = `Failed to add artwork: ${error.message}`;
        statusMessage.classList.remove('text-gray-500');
        statusMessage.classList.add('text-red-500');
        showMessageBox(`Failed to add artwork: ${error.message}`, "error");
    }
}

/**
 * Loads and displays all artworks from Firestore, with real-time updates.
 */
function loadArtworks() {
    if (!isAuthReady) return;
    console.log("loadArtworks called. userId:", userId);

    const allArtworksContainer = document.getElementById('all-artworks');
    const featuredArtworksContainer = document.getElementById('featured-artworks');
    const adminArtworkListContainer = document.getElementById('artwork-list-container');
    const initialShopLoadingMessage = document.getElementById('initial-shop-loading-message');

    // Hide initial loading message on shop page if present
    if (initialShopLoadingMessage) {
        initialShopLoadingMessage.classList.add('hidden');
    }

    const artworksCollectionRef = collection(db, `artifacts/${appId}/public/data/artworks`);

    onSnapshot(artworksCollectionRef, (snapshot) => {
        const artworks = [];
        snapshot.forEach(doc => {
            artworks.push({ id: doc.id, ...doc.data() });
        });

        // Sort by creation date (newest first)
        artworks.sort((a, b) => (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0));

        // Display on shop page
        if (allArtworksContainer) {
            if (artworks.length > 0) {
                allArtworksContainer.innerHTML = artworks.map(artwork => renderArtworkCard(artwork, false)).join('');
            } else {
                allArtworksContainer.innerHTML = `<div class="col-span-full text-center text-gray-600 py-12">No artworks available yet.</div>`;
            }
        }

        // Display featured artworks on home page (first 4)
        if (featuredArtworksContainer) {
            const featured = artworks.filter(a => a.isFeatured).slice(0, 4);
            if (featured.length > 0) {
                featuredArtworksContainer.innerHTML = featured.map(artwork => renderArtworkCard(artwork, false)).join('');
            } else {
                // If no explicitly featured, show the latest 4
                featuredArtworksContainer.innerHTML = artworks.slice(0, 4).map(artwork => renderArtworkCard(artwork, false)).join('');
                if (artworks.length === 0) {
                     featuredArtworksContainer.innerHTML = `<div class="col-span-full text-center text-gray-600 py-12">No artworks available yet.</div>`;
                }
            }
        }

        // Display in admin panel
        if (adminArtworkListContainer && auth.currentUser && !auth.currentUser.isAnonymous) {
            if (artworks.length > 0) {
                adminArtworkListContainer.innerHTML = artworks.map(artwork => `
                    <div class="flex items-center justify-between border p-3 rounded-md shadow-sm">
                        <div class="flex items-center">
                            <img src="${artwork.imageUrl || `https://placehold.co/50x50/e0e0e0/555555?text=No+Img`}" class="w-12 h-12 object-cover rounded mr-4" onerror="this.onerror=null;this.src='https://placehold.co/50x50/e0e0e0/555555?text=No+Img';">
                            <div>
                                <p class="font-semibold">${artwork.name}</p>
                                <p class="text-sm text-gray-600">$${artwork.price.toFixed(2)}</p>
                            </div>
                        </div>
                        <div class="flex space-x-2">
                             <button data-id="${artwork.id}" data-featured="${artwork.isFeatured}" class="toggle-featured-btn bg-blue-500 text-white py-1 px-3 rounded hover:bg-blue-600 transition text-xs">
                                ${artwork.isFeatured ? 'Unfeature' : 'Feature'}
                            </button>
                            <button data-id="${artwork.id}" class="edit-artwork-admin-btn bg-gray-200 text-black py-1 px-3 rounded hover:bg-gray-300 transition text-xs">Edit</button>
                            <button data-id="${artwork.id}" class="delete-artwork-admin-btn bg-red-500 text-white py-1 px-3 rounded hover:bg-red-600 transition text-xs">Delete</button>
                        </div>
                    </div>
                `).join('');
            } else {
                adminArtworkListContainer.innerHTML = `<p class="text-center text-gray-500 py-6">No artworks added yet.</p>`;
            }
        }
    }, (error) => {
        console.error("Error loading artworks:", error);
        if (allArtworksContainer) {
            allArtworksContainer.innerHTML = `<div class="col-span-full text-center text-red-500 py-12">Failed to load artworks.</div>`;
        }
        if (featuredArtworksContainer) {
            featuredArtworksContainer.innerHTML = `<div class="col-span-full text-center text-red-500 py-12">Failed to load featured artworks.</div>`;
        }
        if (adminArtworkListContainer) {
            adminArtworkListContainer.innerHTML = `<p class="text-center text-red-500 py-6">Failed to load artworks for management.</p>`;
        }
    });
}

/**
 * Deletes an artwork from Firestore and its image from Storage.
 * @param {string} artworkId - The ID of the artwork to delete.
 * @param {string} imageUrl - The URL of the artwork image.
 */
async function deleteArtwork(artworkId, imageUrl) {
    if (!auth.currentUser || auth.currentUser.isAnonymous) {
        showMessageBox("Admin login required to delete artwork.", "error");
        return;
    }

    const confirmDelete = await showConfirmModal("Are you sure you want to delete this artwork? This action cannot be undone.");
    if (!confirmDelete) return;

    try {
        // Delete image from Storage if it exists and is not a placeholder
        const isValidUrl = imageUrl && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'));
        if (isValidUrl && !imageUrl.includes('placehold.co')) {
            const imageRef = ref(storage, imageUrl);
            await deleteObject(imageRef).catch(e => console.warn("Could not delete artwork image, it might not exist:", e));
        }

        // Delete document from Firestore
        await deleteDoc(doc(db, `artifacts/${appId}/public/data/artworks`, artworkId));
        showMessageBox("Artwork deleted successfully!", "success");
    }
    catch (error) {
        console.error("Error deleting artwork:", error);
        showMessageBox(`Failed to delete artwork: ${error.message}`, "error");
    }
}

/**
 * Handles toggling the 'isFeatured' status of an artwork.
 * @param {string} artworkId - The ID of the artwork.
 * @param {boolean} currentFeaturedStatus - The current featured status.
 */
async function toggleArtworkFeatured(artworkId, currentFeaturedStatus) {
    if (!auth.currentUser || auth.currentUser.isAnonymous) {
        showMessageBox("Admin login required to feature/unfeature artwork.", "error");
        return;
    }

    const artworkRef = doc(db, `artifacts/${appId}/public/data/artworks`, artworkId);
    try {
        await updateDoc(artworkRef, { isFeatured: !currentFeaturedStatus });
        showMessageBox(`Artwork ${!currentFeaturedStatus ? 'featured' : 'unfeatured'} successfully!`, "success");
    } catch (error) {
        console.error("Error toggling featured status:", error);
        showMessageBox(`Failed to toggle featured status: ${error.message}`, "error");
    }
}


/**
 * Opens the edit artwork modal and populates it with data.
 * @param {string} artworkId - The ID of the artwork to edit.
 */
async function openEditArtworkModal(artworkId) {
    if (!auth.currentUser || auth.currentUser.isAnonymous) {
        showMessageBox("Admin login required to edit artwork.", "error");
        return;
    }

    const editModal = document.getElementById('edit-artwork-modal');
    const editArtworkIdInput = document.getElementById('edit-artwork-id');
    const editProductNameInput = document.getElementById('edit-product-name-input');
    const editProductDescriptionInput = document.getElementById('edit-product-description-input');
    const editProductPriceInput = document.getElementById('edit-product-price-input');
    const editImagePreview = document.getElementById('edit-image-preview');
    const editImagePreviewContainer = document.getElementById('edit-image-preview-container');
    const removeEditImageBtn = document.getElementById('remove-edit-image-btn');
    const editArtworkStatusMessage = document.getElementById('edit-artwork-status-message');

    editArtworkStatusMessage.textContent = '';
    removeEditImageBtn.dataset.removed = 'false'; // Reset removal flag

    try {
        const artworkDocRef = doc(db, `artifacts/${appId}/public/data/artworks`, artworkId);
        const docSnap = await getDoc(artworkDocRef);

        if (docSnap.exists()) {
            const artwork = docSnap.data();
            editArtworkIdInput.value = artworkId;
            editProductNameInput.value = artwork.name;
            editProductDescriptionInput.value = artwork.description;
            editProductPriceInput.value = artwork.price;

            const isValidUrl = artwork.imageUrl && (artwork.imageUrl.startsWith('http://') || artwork.imageUrl.startsWith('https://'));
            if (isValidUrl) {
                editImagePreview.src = artwork.imageUrl;
                editImagePreview.dataset.originalUrl = artwork.imageUrl; // Store original URL on edit preview image
                editImagePreviewContainer.classList.remove('hidden');
            } else {
                editImagePreview.src = '';
                delete editImagePreview.dataset.originalUrl; // Remove if no image
                editImagePreviewContainer.classList.add('hidden');
            }

            editModal.classList.remove('hidden');
            document.body.classList.add('no-scroll');
        } else {
            showMessageBox("Artwork not found.", "error");
        }
    } catch (error) {
        console.error("Error opening edit modal:", error);
        showMessageBox(`Failed to load artwork for editing: ${error.message}`, "error");
    }
}

/**
 * Closes the edit artwork modal.
 */
function closeEditArtworkModal() {
    document.getElementById('edit-artwork-modal').classList.add('hidden');
    document.body.classList.remove('no-scroll');
    document.getElementById('edit-artwork-form').reset();
    document.getElementById('edit-product-image-upload').value = '';
    document.getElementById('edit-image-preview-container').classList.add('hidden');
    document.getElementById('remove-edit-image-btn').dataset.removed = 'false';
}

/**
 * Handles saving changes to an artwork.
 */
async function handleSaveArtworkChanges(event) {
    event.preventDefault();
    if (!auth.currentUser || auth.currentUser.isAnonymous) {
        showMessageBox("Admin login required to save artwork changes.", "error");
        return;
    }

    const artworkId = document.getElementById('edit-artwork-id').value;
    const name = document.getElementById('edit-product-name-input').value;
    const description = document.getElementById('edit-product-description-input').value;
    const price = parseFloat(document.getElementById('edit-product-price-input').value);
    const imageFile = document.getElementById('edit-product-image-upload').files[0];
    const removeEditImageBtn = document.getElementById('remove-edit-image-btn');
    const currentImageUrlElement = document.getElementById('edit-image-preview'); // Get the element to access data-original-url
    const originalFirebaseImageUrl = currentImageUrlElement?.dataset.originalUrl || ''; // Get stored original Firebase URL
    const statusMessage = document.getElementById('edit-artwork-status-message');

    if (!artworkId || !name || !description || isNaN(price) || price < 0) {
        statusMessage.textContent = "Please fill all required fields correctly.";
        statusMessage.classList.add('text-red-500');
        return;
    }

    statusMessage.textContent = "Saving changes...";
    statusMessage.classList.remove('text-red-500');
    statusMessage.classList.add('text-gray-500');

    const artworkRef = doc(db, `artifacts/${appId}/public/data/artworks`, artworkId);
    let imageUrlToUpdate = originalFirebaseImageUrl; // Default to original Firebase URL from Firestore

    try {
        // Handle image removal
        if (removeEditImageBtn.dataset.removed === 'true') {
            // Only attempt to delete if there was an actual Firebase Storage URL previously
            const isValidOriginalUrl = originalFirebaseImageUrl && (originalFirebaseImageUrl.startsWith('http://') || originalFirebaseImageUrl.startsWith('https://'));
            if (isValidOriginalUrl && !originalFirebaseImageUrl.includes('placehold.co')) {
                const oldImageRef = ref(storage, originalFirebaseImageUrl);
                await deleteObject(oldImageRef).catch(e => console.warn("Could not delete old image, it might not exist:", e));
            }
            imageUrlToUpdate = ''; // Clear the image URL
            removeEditImageBtn.dataset.removed = 'false'; // Reset flag
        } else if (imageFile) {
            // Handle new image upload
            // Delete old image if it exists and is a Firebase Storage URL
            const isValidOriginalUrl = originalFirebaseImageUrl && (originalFirebaseImageUrl.startsWith('http://') || originalFirebaseImageUrl.startsWith('https://'));
            if (isValidOriginalUrl && !originalFirebaseImageUrl.includes('placehold.co')) {
                const oldImageRef = ref(storage, originalFirebaseImageUrl);
                await deleteObject(oldImageRef).catch(e => console.warn("Could not delete old image, it might not exist:", e));
            }

            const imageRef = ref(storage, `artifacts/${appId}/artwork_images/${generateUniqueId()}_${imageFile.name}`);
            const snapshot = await uploadBytes(imageRef, imageFile);
            imageUrlToUpdate = await getDownloadURL(snapshot.ref);
            showMessageBox("New image uploaded.", "info");
        }

        await updateDoc(artworkRef, {
            name,
            description,
            price,
            imageUrl: imageUrlToUpdate,
            updatedAt: new Date()
        });

        statusMessage.textContent = "Changes saved successfully!";
        statusMessage.classList.remove('text-gray-500');
        statusMessage.classList.add('text-green-500');
        showMessageBox("Artwork updated successfully!", "success");
        closeEditArtworkModal(); // Close modal after saving
    } catch (error) {
        console.error("Error saving artwork changes:", error);
        statusMessage.textContent = `Failed to save changes: ${error.message}`;
        statusMessage.classList.remove('text-gray-500');
        statusMessage.classList.add('text-red-500');
        showMessageBox(`Failed to update artwork: ${error.message}`, "error");
    }
}


/**
 * Fetches and displays a single product's details on the product page.
 */
async function loadProductDetails() {
    if (!isAuthReady) return;
    console.log("loadProductDetails called. userId:", userId);

    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    const productDetailContainer = document.getElementById('product-detail-container');

    if (!productId || !productDetailContainer) {
        // console.warn("Product ID not found in URL or container not present.");
        if (productDetailContainer) {
            productDetailContainer.innerHTML = `<p class="text-center text-red-500 py-12">Product not found.</p>`;
        }
        return;
    }

    try {
        const productDocRef = doc(db, `artifacts/${appId}/public/data/artworks`, productId);
        const docSnap = await getDoc(productDocRef);

        if (docSnap.exists()) {
            const product = { id: docSnap.id, ...docSnap.data() };
            const defaultImageUrl = `https://placehold.co/600x400/e0e0e0/555555?text=Product+Image`;
            // Add URL validation before using the image URL
            const isValidUrl = product.imageUrl && (product.imageUrl.startsWith('http://') || product.imageUrl.startsWith('https://'));
            const imageUrl = isValidUrl ? product.imageUrl : defaultImageUrl;

            productDetailContainer.innerHTML = `
                <div class="flex flex-col md:flex-row gap-8 items-start">
                    <div class="md:w-1/2">
                        <img src="${imageUrl}" alt="${product.name}" class="w-full h-auto object-cover rounded-lg shadow-md" onerror="this.onerror=null;this.src='${defaultImageUrl}';">
                    </div>
                    <div class="md:w-1/2">
                        <h1 class="text-4xl font-light mb-4">${product.name}</h1>
                        <p class="text-2xl font-bold text-black mb-6">$${product.price.toFixed(2)}</p>
                        <p class="text-gray-700 leading-relaxed mb-8">${product.description}</p>
                        <button id="add-to-cart-product-page-btn"
                                data-id="${product.id}"
                                data-name="${product.name}"
                                data-price="${product.price}"
                                data-image="${imageUrl}"
                                class="bg-black text-white py-3 px-8 rounded-full hover:bg-gray-800 transition">
                            Add to Cart
                        </button>
                    </div>
                </div>
            `;
            // Add event listener to the "Add to Cart" button on the product page
            document.getElementById('add-to-cart-product-page-btn')?.addEventListener('click', (event) => handleAddToCart(event.currentTarget));

        } else {
            productDetailContainer.innerHTML = `<p class="text-center text-gray-600 py-12">Product not found.</p>`;
        }
    } catch (error) {
        console.error("Error loading product details:", error);
        productDetailContainer.innerHTML = `<p class="text-center text-red-500 py-12">Failed to load product details.</p>`;
    }
}

/**
 * Handles search functionality.
 */
async function handleSearch() {
    const searchInput = document.getElementById('search-input');
    const query = searchInput.value.toLowerCase().trim();
    const allArtworksContainer = document.getElementById('all-artworks');
    const featuredArtworksContainer = document.getElementById('featured-artworks'); // This is on index.html

    if (!query) {
        // If query is empty, reload all artworks (handled by onSnapshot in loadArtworks)
        loadArtworks();
        return;
    }

    if (!isAuthReady) return;

    try {
        const artworksCollectionRef = collection(db, `artifacts/${appId}/public/data/artworks`);
        const q = artworksCollectionRef; // Fetch all, then filter client-side for simple search

        const querySnapshot = await getDocs(q);
        let results = [];
        querySnapshot.forEach(doc => {
            const artwork = { id: doc.id, ...doc.data() };
            if (artwork.name.toLowerCase().includes(query) || artwork.description.toLowerCase().includes(query)) {
                results.push(artwork);
            }
        });

        if (results.length > 0) {
            // Display results on the shop page if applicable
            if (allArtworksContainer) {
                allArtworksContainer.innerHTML = results.map(artwork => renderArtworkCard(artwork, false)).join('');
                document.getElementById('initial-shop-loading-message')?.classList.add('hidden');
            }
            // If on homepage, update featured to show search results (or clear if no match)
            if (featuredArtworksContainer) {
                featuredArtworksContainer.innerHTML = results.slice(0, 4).map(artwork => renderArtworkCard(artwork, false)).join('');
            }
            if (!allArtworksContainer && !featuredArtworksContainer) {
                // If on other page (e.g., product page) and search is used, perhaps navigate to shop page with results
                // This is a basic implementation, can be enhanced with URL params or dedicated search results page
                window.location.href = `shop.html?search=${encodeURIComponent(query)}`;
            }

        } else {
            const noResultsMessage = `<div class="col-span-full text-center text-gray-600 py-12">No artworks found matching "${query}".</div>`;
            if (allArtworksContainer) {
                allArtworksContainer.innerHTML = noResultsMessage;
            }
            if (featuredArtworksContainer) {
                featuredArtworksContainer.innerHTML = noResultsMessage;
            }
        }
    } catch (error) {
        console.error("Error during search:", error);
        showMessageBox(`Search failed: ${error.message}`, "error");
        const errorMessage = `<div class="col-span-full text-center text-red-500 py-12">Error during search. Please try again.</div>`;
        if (allArtworksContainer) {
            allArtworksContainer.innerHTML = errorMessage;
        }
        if (featuredArtworksContainer) {
            featuredArtworksContainer.innerHTML = errorMessage;
        }
    }
}


// --- Cart Functionality (Firestore) ---

/**
 * Stores cart items in Firestore for the current user.
 * @param {Array} cartItems - Array of cart item objects.
 */
async function saveCartToFirestore(cartItems) {
    if (!userId) {
        console.log("User not authenticated, not saving cart to Firestore.");
        return; // Do not save cart if user is not authenticated (anonymous or logged in)
    }
    try {
        console.time("Firestore: saveCartToFirestore - setDoc"); // Start timer for setDoc
        const cartDocRef = doc(db, `artifacts/${appId}/users/${userId}/cart`, 'currentCart');
        // Firestore has a 1MB limit per document. If cart grows too large, consider
        // splitting it into multiple documents or using a subcollection.
        console.time("JSON.stringify: cartItems"); // Start timer for JSON.stringify
        const itemsJson = JSON.stringify(cartItems);
        console.timeEnd("JSON.stringify: cartItems"); // End timer for JSON.stringify
        await setDoc(cartDocRef, { items: itemsJson }, { merge: false }); // Overwrite completely
        console.timeEnd("Firestore: saveCartToFirestore - setDoc"); // End timer for setDoc
        console.log("Cart saved to Firestore.");
    } catch (error) {
        console.error("Error saving cart to Firestore:", error);
        showMessageBox("Failed to save cart. Please try again.", "error");
    }
}

/**
 * Loads cart items from Firestore for the current user.
 */
function loadCartItems() {
    const cartItemsContainer = document.getElementById('cart-items-container');
    const cartLoadingMessage = document.getElementById('cart-loading-message');
    const cartEmptyMessage = document.getElementById('cart-empty-message');

    console.log("loadCartItems called. Current userId:", userId); // Debug log

    if (!userId) {
        console.log("loadCartItems: userId is null, setting cart count to 0 and returning.");
        if (cartLoadingMessage) cartLoadingMessage.classList.add('hidden');
        if (cartItemsContainer) cartItemsContainer.innerHTML = `<p class="text-center text-gray-600 text-lg py-12">Please log in or sign up to manage your cart.</p>`;
        const cartCountSpanOnHeader = document.getElementById('cart-count'); // Reference the header cart count specifically
        if (cartCountSpanOnHeader) {
            cartCountSpanOnHeader.textContent = '0';
            console.log("Header cart count set to 0 due to null userId.");
        }
        updateCartTotals([]);
        // Ensure PayPal buttons are not rendered if user is not logged in/no cart
        if (typeof paypal !== 'undefined' && paypal.Buttons) {
            const paypalButtonContainer = document.getElementById('paypal-button-container');
            if (paypalButtonContainer) {
                paypalButtonContainer.innerHTML = ''; // Clear PayPal buttons
            }
        }
        return;
    }

    if (cartLoadingMessage) cartLoadingMessage.classList.remove('hidden');
    if (cartEmptyMessage) cartEmptyMessage.classList.add('hidden');

    const cartDocRef = doc(db, `artifacts/${appId}/users/${userId}/cart`, 'currentCart');

    // Use onSnapshot for real-time updates to the cart
    onSnapshot(cartDocRef, (docSnap) => {
        console.log("Cart snapshot updated for userId:", userId); // Debug log for snapshot
        let cartItems = [];
        if (docSnap.exists()) {
            try {
                console.time("JSON.parse: cartData"); // Start timer for JSON.parse
                const data = docSnap.data();
                if (data && data.items) {
                    cartItems = JSON.parse(data.items);
                }
                console.timeEnd("JSON.parse: cartData"); // End timer for JSON.parse
            } catch (e) {
                console.error("Error parsing cart data from Firestore:", e);
                cartItems = [];
            }
        }
        console.log("Cart items from snapshot:", cartItems); // Debug log

        // Update cart UI on cart.html
        if (cartItemsContainer) {
            if (cartItems.length > 0) {
                cartItemsContainer.innerHTML = cartItems.map(item => renderCartItem(item)).join('');
                if (cartEmptyMessage) cartEmptyMessage.classList.add('hidden');
            } else {
                cartItemsContainer.innerHTML = ''; // Clear container
                if (cartEmptyMessage) cartEmptyMessage.classList.remove('hidden');
            }
        }

        // Update cart count in header (present on all pages)
        const cartCountSpan = document.getElementById('cart-count');
        if (cartCountSpan) {
            const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
            cartCountSpan.textContent = totalItems.toString();
            console.log("Cart count (header) updated to:", totalItems); // Debug log
        } else {
            console.warn("Cart count span (ID: cart-count) not found in the header on this page. This is expected if the header is not present.");
        }

        // Update cart totals on cart page
        updateCartTotals(cartItems);

        // Render PayPal buttons only if on cart page and cart is not empty
        const currentPage = window.location.pathname.split('/').pop();
        if (currentPage === 'cart.html') {
            renderPayPalButtons(cartItems);
        }

        if (cartLoadingMessage) cartLoadingMessage.classList.add('hidden');

    }, (error) => {
        console.error("Error loading cart items with onSnapshot:", error);
        if (cartLoadingMessage) cartLoadingMessage.classList.add('hidden');
        if (cartItemsContainer) {
             cartItemsContainer.innerHTML = `<p class="text-center text-red-500 py-12">Failed to load cart items.</p>`;
        }
        if (cartEmptyMessage) cartEmptyMessage.classList.add('hidden');
        // Ensure header cart count is set to 0 on error
        const cartCountSpanOnHeader = document.getElementById('cart-count');
        if (cartCountSpanOnHeader) {
            cartCountSpanOnHeader.textContent = '0';
        }
    });
}


/**
 * Updates the subtotal, shipping, and total displayed in the cart summary.
 * @param {Array} cartItems - The current array of cart items.
 */
function updateCartTotals(cartItems) {
    const cartSubtotalSpan = document.getElementById('cart-subtotal');
    const cartShippingSpan = document.getElementById('cart-shipping');
    const cartTotalSpan = document.getElementById('cart-total');
    const checkoutBtn = document.getElementById('checkout-btn'); // This might be removed in favor of PayPal

    // Check if on cart.html before trying to update these elements
    const onCartPage = window.location.pathname.split('/').pop() === 'cart.html';

    let subtotal = 0;
    if (cartItems && cartItems.length > 0) {
        subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }
    const shipping = subtotal > 0 ? 10.00 : 0.00; // Flat rate shipping, only if items are in cart
    const total = subtotal + shipping;

    if (onCartPage) {
        if (cartSubtotalSpan) cartSubtotalSpan.textContent = `$${subtotal.toFixed(2)}`;
        if (cartShippingSpan) cartShippingSpan.textContent = `$${shipping.toFixed(2)}`;
        if (cartTotalSpan) cartTotalSpan.textContent = `$${total.toFixed(2)}`;
    }

    // This button might be removed, but keeping its logic for now if it exists
    if (checkoutBtn) {
        checkoutBtn.disabled = cartItems.length === 0;
        checkoutBtn.classList.toggle('opacity-50', cartItems.length === 0);
        checkoutBtn.classList.toggle('cursor-not-allowed', cartItems.length === 0);
    }
    
    // Store the calculated total for PayPal
    if (onCartPage) {
         const paypalButtonContainer = document.getElementById('paypal-button-container');
         if (paypalButtonContainer) {
             paypalButtonContainer.dataset.currentTotal = total.toFixed(2);
         }
    }
}


/**
 * Handles adding an item to the cart.
 * @param {HTMLElement} button - The button element that was clicked.
 */
async function handleAddToCart(button) { // Modified: Accepts the button element directly
    if (!userId) {
        showMessageBox("Please log in or sign up to add items to cart.", "info");
        return;
    }

    const itemId = button.dataset.id;
    const itemName = button.dataset.name;
    const itemPrice = parseFloat(button.dataset.price);
    const itemImage = button.dataset.image;

    if (!itemId || !itemName || isNaN(itemPrice)) {
        console.error("Invalid item data for adding to cart.");
        showMessageBox("Could not add item. Missing product details.", "error");
        return;
    }

    console.log(`Attempting to add item: ${itemName} (ID: ${itemId}) to cart for user: ${userId}`); // Debug log

    // Fetch current cart from Firestore
    console.time("Firestore: handleAddToCart - getDoc"); // Start timer for getDoc
    const cartDocRef = doc(db, `artifacts/${appId}/users/${userId}/cart`, 'currentCart');
    const docSnap = await getDoc(cartDocRef);
    console.timeEnd("Firestore: handleAddToCart - getDoc"); // End timer for getDoc

    let cartItems = [];
    if (docSnap.exists()) {
        try {
            console.time("JSON.parse: handleAddToCart - existing items"); // Start timer for JSON.parse
            cartItems = JSON.parse(docSnap.data().items);
            console.timeEnd("JSON.parse: handleAddToCart - existing items"); // End timer for JSON.parse
            console.log("Existing cart items:", cartItems); // Debug log
        }
        catch (e) {
            console.error("Error parsing existing cart data:", e);
        }
    }

    const existingItemIndex = cartItems.findIndex(item => item.id === itemId);

    if (existingItemIndex > -1) {
        cartItems[existingItemIndex].quantity += 1;
    } else {
        cartItems.push({ id: itemId, name: itemName, price: itemPrice, image: itemImage, quantity: 1 });
    }

    await saveCartToFirestore(cartItems); // This will trigger the onSnapshot in loadCartItems
    showMessageBox(`${itemName} added to cart!`, "success");
    // loadCartItems is implicitly called by onSnapshot after saveCartToFirestore
}

/**
 * Handles removing an item from the cart.
 * @param {HTMLElement} button - The button element that was clicked.
 */
async function handleRemoveFromCart(button) { // Modified: Accepts the button element directly
    if (!userId) {
        showMessageBox("You need to be logged in to modify your cart.", "error");
        return;
    }

    const itemId = button.dataset.id;

    console.log(`Attempting to remove item: (ID: ${itemId}) from cart for user: ${userId}`); // Debug log

    console.time("Firestore: handleRemoveFromCart - getDoc"); // Start timer
    const cartDocRef = doc(db, `artifacts/${appId}/users/${userId}/cart`, 'currentCart');
    const docSnap = await getDoc(cartDocRef);
    console.timeEnd("Firestore: handleRemoveFromCart - getDoc"); // End timer

    let cartItems = [];
    if (docSnap.exists()) {
        try {
            console.time("JSON.parse: handleRemoveFromCart - existing items"); // Start timer
            cartItems = JSON.parse(docSnap.data().items);
            console.timeEnd("JSON.parse: handleRemoveFromCart - existing items"); // End timer
        } catch (e) {
            console.error("Error parsing existing cart data:", e);
            showMessageBox("Error loading cart for removal.", "error");
            return;
        }
    }

    const updatedCartItems = cartItems.filter(item => item.id !== itemId);

    // PERSIST THE CHANGE TO FIRESTORE
    await saveCartToFirestore(updatedCartItems); // This will trigger the onSnapshot in loadCartItems
    showMessageBox("Item removed from cart.", "success");
    // loadCartItems is implicitly called by onSnapshot after saveCartToFirestore
}


/**
 * Handles increasing the quantity of an item in the cart.
 * @param {HTMLElement} button - The button element that was clicked.
 */
async function handleIncreaseQuantity(button) {
    if (!userId) {
        showMessageBox("Please log in or sign up to modify your cart.", "info");
        return;
    }

    const itemId = button.dataset.id;
    console.log(`Attempting to increase quantity for item: ${itemId} for user: ${userId}`);

    const cartDocRef = doc(db, `artifacts/${appId}/users/${userId}/cart`, 'currentCart');
    const docSnap = await getDoc(cartDocRef);
    let cartItems = [];
    if (docSnap.exists()) {
        try {
            cartItems = JSON.parse(docSnap.data().items);
        } catch (e) {
            console.error("Error parsing existing cart data for quantity increase:", e);
            showMessageBox("Error modifying cart.", "error");
            return;
        }
    }

    const itemIndex = cartItems.findIndex(item => item.id === itemId);
    if (itemIndex > -1) {
        cartItems[itemIndex].quantity += 1;
        await saveCartToFirestore(cartItems); // This will trigger onSnapshot
        showMessageBox(`Quantity for ${cartItems[itemIndex].name} increased.`, "success");
        // loadCartItems is implicitly called by onSnapshot after saveCartToFirestore
    } else {
        showMessageBox("Item not found in cart.", "error");
    }
}

/**
 * Handles decreasing the quantity of an item in the cart.
 * @param {HTMLElement} button - The button element that was clicked.
 */
async function handleDecreaseQuantity(button) {
    if (!userId) {
        showMessageBox("Please log in or sign up to modify your cart.", "info");
        return;
    }

    const itemId = button.dataset.id;
    console.log(`Attempting to decrease quantity for item: ${itemId} for user: ${userId}`);

    const cartDocRef = doc(db, `artifacts/${appId}/users/${userId}/cart`, 'currentCart');
    const docSnap = await getDoc(cartDocRef);
    let cartItems = [];
    if (docSnap.exists()) {
        try {
            cartItems = JSON.parse(docSnap.data().items);
        } catch (e) {
            console.error("Error parsing existing cart data for quantity decrease:", e);
            showMessageBox("Error modifying cart.", "error");
            return;
        }
    }

    const itemIndex = cartItems.findIndex(item => item.id === itemId);
    if (itemIndex > -1) {
        if (cartItems[itemIndex].quantity > 1) {
            cartItems[itemIndex].quantity -= 1;
            showMessageBox(`Quantity for ${cartItems[itemIndex].name} decreased.`, "success");
        } else {
            // If quantity becomes 0, remove the item
            cartItems.splice(itemIndex, 1);
            showMessageBox("Item removed from cart.", "success");
        }
        await saveCartToFirestore(cartItems); // This will trigger onSnapshot
        // loadCartItems is implicitly called by onSnapshot after saveCartToFirestore
    } else {
        showMessageBox("Item not found in cart.", "error");
    }
}


/**
 * Renders PayPal buttons. Call this after cart totals are updated.
 * @param {Array} cartItems The current cart items.
 */
function renderPayPalButtons(cartItems) {
    const paypalButtonContainer = document.getElementById('paypal-button-container');
    // Ensure we get the latest total from the UI element that updateCartTotals sets
    const currentTotalElement = document.getElementById('cart-total');
    const currentTotal = parseFloat(currentTotalElement?.textContent?.replace('$', '') || '0');

    // Clear existing buttons to prevent duplicates if the function is called multiple times
    if (paypalButtonContainer) {
        paypalButtonContainer.innerHTML = '';
    }

    if (cartItems.length === 0 || currentTotal <= 0) {
        console.log("No items in cart or total is zero, not rendering PayPal buttons.");
        return;
    }

    if (typeof paypal === 'undefined' || !paypal.Buttons) {
        console.warn("PayPal SDK not loaded yet or Buttons object is not available. Skipping PayPal button rendering.");
        return;
    }

    console.log("Rendering PayPal buttons with total:", currentTotal);

    paypal.Buttons({
        style: {
            layout: 'vertical', // or 'horizontal'
            color: 'blue',      // 'gold', 'blue', 'silver', 'white', 'black'
            shape: 'rect',      // 'rect', 'pill'
            label: 'paypal'     // 'paypal', 'checkout', 'buynow', 'pay'
        },
        createOrder: function(data, actions) {
            console.log("PayPal createOrder triggered.");
            return actions.order.create({
                purchase_units: [{
                    amount: {
                        value: currentTotal.toFixed(2), // Ensure this is a string with 2 decimal places
                        currency_code: 'USD' // Change if your currency is different
                    },
                    // Optionally, you can break down items for more detailed PayPal transactions
                    // items: cartItems.map(item => ({
                    //     name: item.name,
                    //     quantity: item.quantity.toString(),
                    //     unit_amount: {
                    //         currency_code: 'USD',
                    //         value: item.price.toFixed(2)
                    //     }
                    // }))
                }]
            });
        },
        onApprove: async function(data, actions) {
            console.log("PayPal onApprove triggered. Order ID:", data.orderID);
            try {
                const orderDetails = await actions.order.capture();
                console.log("Order captured successfully:", orderDetails);
                showMessageBox("Payment successful! Your order has been placed.", "success");

                // Clear the cart in Firestore after successful payment
                const cartDocRef = doc(db, `artifacts/${appId}/users/${userId}/cart`, 'currentCart');
                await setDoc(cartDocRef, { items: JSON.stringify([]) }, { merge: false });
                console.log("Cart cleared after successful payment.");

                // Optionally, save order history for the user (similar to handleCheckout)
                const ordersCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/orders`);
                await addDoc(ordersCollectionRef, {
                    items: JSON.stringify(cartItems), // Save the cart items that were just purchased
                    total: currentTotal.toFixed(2),
                    orderDate: new Date(),
                    paypalOrderId: data.orderID,
                    status: 'Completed (PayPal)'
                });
                console.log("Order history saved.");

                // Redirect or update UI after successful payment
                setTimeout(() => window.location.href = 'index.html', 3000); // Redirect to home page
            } catch (error) {
                console.error("Error capturing PayPal order:", error);
                showMessageBox(`Payment failed: ${error.message}`, "error");
            }
        },
        onError: function(err) {
            console.error("PayPal onError:", err);
            showMessageBox("An error occurred during PayPal checkout. Please try again.", "error");
        },
        onCancel: function(data) {
            console.log("PayPal payment cancelled:", data);
            showMessageBox("PayPal payment cancelled.", "info");
        }
    }).render('#paypal-button-container'); // Render the buttons into the div
}


/**
 * Handles the checkout process. (Placeholder - no actual payment integration)
 * This function is now superseded by PayPal, but keeping it for context.
 */
async function handleCheckout() {
    // This function is largely superseded by PayPal integration.
    // Keeping it for completeness but it's not actively called by new cart.html.
    if (!userId) {
        showMessageBox("Please log in or sign up to proceed with checkout.", "error");
        return;
    }

    console.time("Firestore: handleCheckout - getDoc"); // Start timer
    const cartDocRef = doc(db, `artifacts/${appId}/users/${userId}/cart`, 'currentCart');
    const docSnap = await getDoc(cartDocRef);
    console.timeEnd("Firestore: handleCheckout - getDoc"); // End timer

    let cartItems = [];
    if (docSnap.exists()) {
        try {
            console.time("JSON.parse: handleCheckout - existing items"); // Start timer
            cartItems = JSON.parse(docSnap.data().items);
        } catch (e) {
            console.error("Error parsing cart for checkout:", e);
            showMessageBox("Failed to process checkout. Cart data is invalid.", "error");
            return;
        }
    }

    if (cartItems.length === 0) {
        showMessageBox("Your cart is empty. Please add items before checking out.", "info");
        return;
    }

    const confirmCheckout = await showConfirmModal("Proceed to checkout? (This is a demo checkout, no real payment will occur.)");
    if (!confirmCheckout) return;

    try {
        // In a real app, this would involve sending cart data to a backend for payment processing.
        // For this demo, we'll just clear the cart and show a success message.

        // Optionally, save order history for the user
        console.time("Firestore: handleCheckout - addDoc order history"); // Start timer
        const ordersCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/orders`);
        await addDoc(ordersCollectionRef, {
            items: JSON.stringify(cartItems),
            total: document.getElementById('cart-total')?.textContent, // Get current displayed total
            orderDate: new Date(),
            status: 'Completed (Demo)'
        });
        console.timeEnd("Firestore: handleCheckout - addDoc order history"); // End timer

        // Clear the cart after successful "checkout"
        await setDoc(cartDocRef, { items: JSON.stringify([]) }, { merge: false });

        showMessageBox("Checkout successful! Your order has been placed (demo).", "success");
        // Optionally redirect to an order confirmation page
        // setTimeout(() => window.location.href = 'index.html', 2000);
    } catch (error) {
        console.error("Error during checkout:", error);
        showMessageBox(`Checkout failed: ${error.message}`, "error");
    } finally {
        // Explicitly call loadCartItems after checkout to reset the count to 0
        loadCartItems();
    }
}

// --- About Gallery Functionality (NEW) ---

/**
 * Handles adding a new gallery image.
 */
async function handleAddGalleryImage(event) {
    event.preventDefault();
    if (!auth.currentUser || auth.currentUser.isAnonymous) {
        showMessageBox("Admin login required to add gallery images.", "error");
        return;
    }

    const imageFile = document.getElementById('gallery-image-upload').files[0];
    const description = document.getElementById('gallery-image-description').value.trim();
    const statusMessage = document.getElementById('gallery-image-status-message');

    if (!imageFile) {
        statusMessage.textContent = "Please select an image file.";
        statusMessage.classList.add('text-red-500');
        return;
    }

    statusMessage.textContent = "Uploading image...";
    statusMessage.classList.remove('text-red-500');
    statusMessage.classList.add('text-gray-500');

    let imageUrl = '';
    try {
        const imageRef = ref(storage, `artifacts/${appId}/about_gallery_images/${generateUniqueId()}_${imageFile.name}`);
        const snapshot = await uploadBytes(imageRef, imageFile);
        imageUrl = await getDownloadURL(snapshot.ref);
        
        const newGalleryImage = {
            imageUrl,
            description,
            createdAt: new Date(),
        };

        await addDoc(collection(db, `artifacts/${appId}/public/data/aboutGallery`), newGalleryImage);
        statusMessage.textContent = "Gallery image added successfully!";
        statusMessage.classList.remove('text-gray-500');
        statusMessage.classList.add('text-green-500');
        document.getElementById('add-gallery-image-form').reset(); // Clear form
        showMessageBox("Gallery image added!", "success");

    } catch (error) {
        console.error("Error adding gallery image:", error);
        statusMessage.textContent = `Failed to add gallery image: ${error.message}`;
        statusMessage.classList.remove('text-gray-500');
        statusMessage.classList.add('text-red-500');
        showMessageBox(`Failed to add gallery image: ${error.message}`, "error");
    }
}

/**
 * Loads and displays about gallery images.
 */
function loadAboutGallery() {
    if (!isAuthReady) return;
    console.log("loadAboutGallery called. userId:", userId);

    const aboutGalleryContainer = document.getElementById('about-gallery-container');
    const adminGalleryListContainer = document.getElementById('gallery-list-container');
    const initialGalleryLoadingMessage = document.getElementById('initial-gallery-loading-message');

    if (initialGalleryLoadingMessage) {
        initialGalleryLoadingMessage.classList.add('hidden');
    }

    const galleryCollectionRef = collection(db, `artifacts/${appId}/public/data/aboutGallery`);

    onSnapshot(galleryCollectionRef, (snapshot) => {
        const galleryImages = [];
        snapshot.forEach(doc => {
            galleryImages.push({ id: doc.id, ...doc.data() });
        });

        // Sort by creation date (newest first)
        galleryImages.sort((a, b) => (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0));

        // Display on about.html
        if (aboutGalleryContainer) {
            if (galleryImages.length > 0) {
                aboutGalleryContainer.innerHTML = galleryImages.map(image => renderAboutGalleryItem(image, false)).join('');
            } else {
                aboutGalleryContainer.innerHTML = `<div class="col-span-full text-center text-gray-600 py-12">No gallery images available yet.</div>`;
            }
        }

        // Display in admin panel
        if (adminGalleryListContainer && auth.currentUser && !auth.currentUser.isAnonymous) {
            if (galleryImages.length > 0) {
                adminGalleryListContainer.innerHTML = galleryImages.map(image => `
                    <div class="flex items-center justify-between border p-3 rounded-md shadow-sm">
                        <div class="flex items-center">
                            <img src="${image.imageUrl || `https://placehold.co/50x50/e0e0e0/555555?text=No+Img`}" class="w-12 h-12 object-cover rounded mr-4" onerror="this.onerror=null;this.src='https://placehold.co/50x50/e0e0e0/555555?text=No+Img';">
                            <div>
                                <p class="font-semibold">${image.description.substring(0, 50)}...</p>
                            </div>
                        </div>
                        <div class="flex space-x-2">
                            <button data-id="${image.id}" class="edit-gallery-image-admin-btn bg-gray-200 text-black py-1 px-3 rounded hover:bg-gray-300 transition text-xs">Edit</button>
                            <button data-id="${image.id}" data-image-url="${image.imageUrl}" class="delete-gallery-image-admin-btn bg-red-500 text-white py-1 px-3 rounded hover:bg-red-600 transition text-xs">Delete</button>
                        </div>
                    </div>
                `).join('');
            } else {
                adminGalleryListContainer.innerHTML = `<p class="text-center text-gray-500 py-6">No gallery images added yet.</p>`;
            }
        }
    }, (error) => {
        console.error("Error loading about gallery images:", error);
        if (aboutGalleryContainer) {
            aboutGalleryContainer.innerHTML = `<div class="col-span-full text-center text-red-500 py-12">Failed to load gallery images.</div>`;
        }
        if (adminGalleryListContainer) {
            adminGalleryListContainer.innerHTML = `<p class="text-center text-red-500 py-6">Failed to load gallery images for management.</p>`;
        }
    });
}

/**
 * Opens the edit gallery image modal and populates it with data.
 * @param {string} imageId - The ID of the gallery image to edit.
 */
async function openEditGalleryImageModal(imageId) {
    if (!auth.currentUser || auth.currentUser.isAnonymous) {
        showMessageBox("Admin login required to edit gallery images.", "error");
        return;
    }

    const editModal = document.getElementById('edit-gallery-image-modal');
    const editImageIdInput = document.getElementById('edit-gallery-image-id');
    const editImageDescriptionInput = document.getElementById('edit-gallery-image-description-input');
    const editImagePreview = document.getElementById('edit-gallery-image-preview');
    const editImagePreviewContainer = document.getElementById('edit-gallery-image-preview-container');
    const removeEditImageBtn = document.getElementById('remove-edit-gallery-image-btn');
    const statusMessage = document.getElementById('edit-gallery-image-status-message');

    statusMessage.textContent = '';
    removeEditImageBtn.dataset.removed = 'false'; // Reset removal flag

    try {
        const galleryImageDocRef = doc(db, `artifacts/${appId}/public/data/aboutGallery`, imageId);
        const docSnap = await getDoc(galleryImageDocRef);

        if (docSnap.exists()) {
            const imageData = docSnap.data();
            editImageIdInput.value = imageId;
            editImageDescriptionInput.value = imageData.description || '';

            const isValidUrl = imageData.imageUrl && (imageData.imageUrl.startsWith('http://') || imageData.imageUrl.startsWith('https://'));
            if (isValidUrl) {
                editImagePreview.src = imageData.imageUrl;
                editImagePreview.dataset.originalUrl = imageData.imageUrl; // Store original URL
                editImagePreviewContainer.classList.remove('hidden');
            } else {
                editImagePreview.src = '';
                delete editImagePreview.dataset.originalUrl;
                editImagePreviewContainer.classList.add('hidden');
            }

            editModal.classList.remove('hidden');
            document.body.classList.add('no-scroll');
        } else {
            showMessageBox("Gallery image not found.", "error");
        }
    } catch (error) {
        console.error("Error opening edit gallery image modal:", error);
        showMessageBox(`Failed to load gallery image for editing: ${error.message}`, "error");
    }
}

/**
 * Closes the edit gallery image modal.
 */
function closeEditGalleryImageModal() {
    document.getElementById('edit-gallery-image-modal').classList.add('hidden');
    document.body.classList.remove('no-scroll');
    document.getElementById('edit-gallery-image-form').reset();
    document.getElementById('edit-gallery-image-upload').value = '';
    document.getElementById('edit-gallery-image-preview-container').classList.add('hidden');
    document.getElementById('remove-edit-gallery-image-btn').dataset.removed = 'false';
}

/**
 * Handles saving changes to a gallery image.
 */
async function handleSaveGalleryImageChanges(event) {
    event.preventDefault();
    if (!auth.currentUser || auth.currentUser.isAnonymous) {
        showMessageBox("Admin login required to save gallery image changes.", "error");
        return;
    }

    const imageId = document.getElementById('edit-gallery-image-id').value;
    const description = document.getElementById('edit-gallery-image-description-input').value.trim();
    const imageFile = document.getElementById('edit-gallery-image-upload').files[0];
    const removeImageBtn = document.getElementById('remove-edit-gallery-image-btn');
    const currentImageUrlElement = document.getElementById('edit-gallery-image-preview');
    const originalFirebaseImageUrl = currentImageUrlElement?.dataset.originalUrl || '';
    const statusMessage = document.getElementById('edit-gallery-image-status-message');

    if (!imageId) {
        statusMessage.textContent = "Image ID is missing.";
        statusMessage.classList.add('text-red-500');
        return;
    }

    statusMessage.textContent = "Saving changes...";
    statusMessage.classList.remove('text-red-500');
    statusMessage.classList.add('text-gray-500');

    const galleryImageRef = doc(db, `artifacts/${appId}/public/data/aboutGallery`, imageId);
    let imageUrlToUpdate = originalFirebaseImageUrl;

    try {
        if (removeImageBtn.dataset.removed === 'true') {
            const isValidOriginalUrl = originalFirebaseImageUrl && (originalFirebaseImageUrl.startsWith('http://') || originalFirebaseImageUrl.startsWith('https://')) && !originalFirebaseImageUrl.includes('placehold.co');
            if (isValidOriginalUrl) {
                const oldImageRef = ref(storage, originalFirebaseImageUrl);
                await deleteObject(oldImageRef).catch(e => console.warn("Could not delete old gallery image, it might not exist:", e));
            }
            imageUrlToUpdate = '';
            removeImageBtn.dataset.removed = 'false';
        } else if (imageFile) {
            const isValidOriginalUrl = originalFirebaseImageUrl && (originalFirebaseImageUrl.startsWith('http://') || originalFirebaseImageUrl.startsWith('https://'));
            if (isValidOriginalUrl && !originalFirebaseImageUrl.includes('placehold.co')) {
                const oldImageRef = ref(storage, originalFirebaseImageUrl);
                await deleteObject(oldImageRef).catch(e => console.warn("Could not delete old gallery image, it might not exist:", e));
            }

            const newImageRef = ref(storage, `artifacts/${appId}/about_gallery_images/${generateUniqueId()}_${imageFile.name}`);
            const snapshot = await uploadBytes(newImageRef, imageFile);
            imageUrlToUpdate = await getDownloadURL(snapshot.ref);
            showMessageBox("New gallery image uploaded.", "info");
        }

        await updateDoc(galleryImageRef, {
            description,
            imageUrl: imageUrlToUpdate,
            updatedAt: new Date()
        });

        statusMessage.textContent = "Changes saved successfully!";
        statusMessage.classList.remove('text-gray-500');
        statusMessage.classList.add('text-green-500');
        showMessageBox("Gallery image updated successfully!", "success");
        closeEditGalleryImageModal();
    } catch (error) {
        console.error("Error saving gallery image changes:", error);
        statusMessage.textContent = `Failed to save changes: ${error.message}`;
        statusMessage.classList.remove('text-gray-500');
        statusMessage.classList.add('text-red-500');
        showMessageBox(`Failed to update gallery image: ${error.message}`, "error");
    }
}

/**
 * Deletes a gallery image from Firestore and Storage.
 * @param {string} imageId - The ID of the gallery image to delete.
 * @param {string} imageUrl - The URL of the gallery image to delete from storage.
 */
async function deleteAboutGalleryImage(imageId, imageUrl) {
    if (!auth.currentUser || auth.currentUser.isAnonymous) {
        showMessageBox("Admin login required to delete gallery images.", "error");
        return;
    }

    const confirmDelete = await showConfirmModal("Are you sure you want to delete this gallery image? This action cannot be undone.");
    if (!confirmDelete) return;

    try {
        const isValidUrl = imageUrl && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) && !imageUrl.includes('placehold.co');
        if (isValidUrl) {
            const imageRef = ref(storage, imageUrl);
            await deleteObject(imageRef).catch(e => console.warn("Could not delete gallery image from storage, it might not exist:", e));
        }

        await deleteDoc(doc(db, `artifacts/${appId}/public/data/aboutGallery`, imageId));
        showMessageBox("Gallery image deleted successfully!", "success");
    } catch (error) {
        console.error("Error deleting gallery image:", error);
        showMessageBox(`Failed to delete gallery image: ${error.message}`, "error");
    }
}


// --- Contact Form (Firestore) ---

/**
 * Handles submission of the contact form.
 */
async function handleContactFormSubmit(event) {
    event.preventDefault();
    const name = document.getElementById('contact-name').value;
    const email = document.getElementById('contact-email').value;
    const subject = document.querySelector('#contact form div:nth-child(3) input').value; // Subject input, needs a proper ID or better selector
    const message = document.getElementById('contact-message').value;
    const statusMessage = document.getElementById('contact-status-message');
    const sendMessageBtn = document.getElementById('send-message-btn');

    if (!name || !email || !message) {
        statusMessage.textContent = "Please fill in all required fields.";
        statusMessage.classList.add('text-red-500');
        return;
    }

    statusMessage.textContent = "Sending message...";
    statusMessage.classList.remove('text-red-500', 'text-green-500');
    statusMessage.classList.add('text-gray-500');
    sendMessageBtn.disabled = true;

    try {
        await addDoc(collection(db, `artifacts/${appId}/public/data/contactMessages`), {
            name,
            email,
            subject,
            message,
            timestamp: new Date(),
            read: false // Admin can mark as read
        });
        statusMessage.textContent = "Message sent successfully! We'll get back to you soon.";
        statusMessage.classList.remove('text-gray-500');
        statusMessage.classList.add('text-green-500');
        document.getElementById('contact-form').reset(); // Clear form
        showMessageBox("Message sent!", "success");
    }
    catch (error) {
        console.error("Error sending contact message:", error);
        statusMessage.textContent = `Failed to send message: ${error.message}`;
        statusMessage.classList.remove('text-gray-500');
        statusMessage.classList.add('text-red-500');
        showMessageBox("Failed to send message. Please try again.", "error");
    } finally {
        sendMessageBtn.disabled = false;
    }
}


// --- Custom Confirmation Modal ---

let resolveConfirmModal; // To hold the resolve function of the Promise

/**
 * Shows a custom confirmation modal instead of window.confirm().
 * @param {string} message The message to display.
 * @returns {Promise<boolean>} A promise that resolves to true if confirmed, false otherwise.
 */
function showConfirmModal(message) {
    return new Promise(resolve => {
        resolveConfirmModal = resolve; // Store the resolve function

        const modalHtml = `
            <div id="custom-confirm-modal" class="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-[1000]">
                <div class="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full relative">
                    <p class="text-lg text-gray-800 mb-6">${message}</p>
                    <div class="flex justify-end space-x-4">
                        <button id="confirm-cancel-btn" class="bg-gray-200 text-gray-800 py-2 px-4 rounded hover:bg-gray-300 transition">Cancel</button>
                        <button id="confirm-ok-btn" class="bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600 transition">OK</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        document.body.classList.add('no-scroll');

        const modal = document.getElementById('custom-confirm-modal');
        document.getElementById('confirm-ok-btn').onclick = () => {
            modal.remove();
            document.body.classList.remove('no-scroll');
            resolveConfirmModal(true);
        };
        document.getElementById('confirm-cancel-btn').onclick = () => {
            modal.remove();
            document.body.classList.remove('no-scroll');
            resolveConfirmModal(false);
        };
    });
}


// --- Event Listeners and Initial Load ---

document.addEventListener('DOMContentLoaded', async () => {
    // Initial Firebase Auth setup (signInWithCustomToken if available, else anonymous)
    try {
        console.log("DOMContentLoaded: Initializing Firebase Auth...");
        if (initialAuthToken) {
            await signInWithCustomToken(auth, initialAuthToken);
        } else {
            await signInAnonymously(auth);
        }
        console.log("DOMContentLoaded: Firebase Auth initialized.");
    } catch (error) {
        console.error("DOMContentLoaded: Firebase initial auth failed:", error);
        showMessageBox("Failed to connect to Firebase. Some features may not work.", "error");
    }

    // Admin Panel Toggle
    document.getElementById('admin-toggle')?.addEventListener('click', toggleAdminPanel);
    document.getElementById('close-admin')?.addEventListener('click', toggleAdminPanel);

    // Admin Login/Logout
    document.getElementById('admin-login-form')?.addEventListener('submit', handleAdminLogin);
    document.getElementById('admin-logout-btn')?.addEventListener('click', handleAdminLogout);

    // Website Settings
    document.getElementById('update-website-name')?.addEventListener('click', updateWebsiteName);
    document.getElementById('update-about-content')?.addEventListener('click', updateAboutContent);

    // Hero Image update and removal in admin (NEW)
    document.getElementById('update-hero-image')?.addEventListener('click', updateHeroImage);
    const removeHeroImageBtn = document.getElementById('remove-hero-image-btn');
    if (removeHeroImageBtn) {
        removeHeroImageBtn.addEventListener('click', () => {
            document.getElementById('hero-image-preview').src = '';
            document.getElementById('hero-image-preview-container').classList.add('hidden');
            document.getElementById('hero-image-upload').value = '';
            removeHeroImageBtn.dataset.removed = 'true';
        });
    }

    // About Us Image removal in admin
    const removeAboutImageBtn = document.getElementById('remove-about-image-btn');
    if (removeAboutImageBtn) {
        removeAboutImageBtn.addEventListener('click', () => {
            document.getElementById('about-image-preview').src = '';
            document.getElementById('about-image-preview-container').classList.add('hidden');
            document.getElementById('about-image-upload').value = ''; // Clear file input
            removeAboutImageBtn.dataset.removed = 'true'; // Set flag for saving
        });
    }

    // Add Artwork
    document.getElementById('add-artwork-form')?.addEventListener('submit', handleAddArtwork);

    // Search
    document.getElementById('search-button')?.addEventListener('click', handleSearch);
    document.getElementById('search-input')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });

    // Delegated event listeners for dynamically added elements (Admin)
    document.addEventListener('click', async (event) => {
        // Edit Artwork button in Admin Panel
        if (event.target.classList.contains('edit-artwork-admin-btn')) {
            openEditArtworkModal(event.target.dataset.id);
        }
        // Delete Artwork button in Admin Panel
        if (event.target.classList.contains('delete-artwork-admin-btn')) {
            const artworkId = event.target.dataset.id;
            // Get current artwork data to retrieve image URL for deletion
            const artworkDoc = await getDoc(doc(db, `artifacts/${appId}/public/data/artworks`, artworkId));
            if (artworkDoc.exists()) {
                const artworkData = artworkDoc.data();
                deleteArtwork(artworkId, artworkData.imageUrl);
            } else {
                showMessageBox("Artwork not found for deletion.", "error");
            }
        }
        // Toggle Featured Status button in Admin Panel
        if (event.target.classList.contains('toggle-featured-btn')) {
            const artworkId = event.target.dataset.id;
            const currentFeaturedStatus = event.target.dataset.featured === 'true';
            toggleArtworkFeatured(artworkId, currentFeaturedStatus);
        }
        // NEW: Edit Gallery Image button in Admin Panel
        if (event.target.classList.contains('edit-gallery-image-admin-btn')) {
            openEditGalleryImageModal(event.target.dataset.id);
        }
        // NEW: Delete Gallery Image button in Admin Panel
        if (event.target.classList.contains('delete-gallery-image-admin-btn')) {
            const imageId = event.target.dataset.id;
            const imageUrl = event.target.dataset.imageUrl; // Retrieve the image URL directly from data-attribute
            deleteAboutGalleryImage(imageId, imageUrl);
        }
    });

    // Edit Artwork Modal close button
    document.getElementById('close-edit-modal-btn')?.addEventListener('click', closeEditArtworkModal);
    // Save Artwork Changes button in Edit Modal
    document.getElementById('save-artwork-changes-btn')?.addEventListener('click', handleSaveArtworkChanges);
    // Remove image button in edit modal
    const removeEditImageBtn = document.getElementById('remove-edit-image-btn');
    if (removeEditImageBtn) {
        removeEditImageBtn.addEventListener('click', () => {
            document.getElementById('edit-image-preview').src = '';
            document.getElementById('edit-image-preview-container').classList.add('hidden');
            document.getElementById('edit-product-image-upload').value = ''; // Clear file input
            removeEditImageBtn.dataset.removed = 'true'; // Set flag for saving
        });
    }

    // NEW: Add Gallery Image
    document.getElementById('add-gallery-image-form')?.addEventListener('submit', handleAddGalleryImage);

    // NEW: Edit Gallery Image Modal close button
    document.getElementById('close-edit-gallery-modal-btn')?.addEventListener('click', closeEditGalleryImageModal);
    // NEW: Save Gallery Image Changes button in Edit Modal
    document.getElementById('save-gallery-image-changes-btn')?.addEventListener('click', handleSaveGalleryImageChanges);
    // NEW: Remove gallery image button in edit modal
    const removeEditGalleryImageBtn = document.getElementById('remove-edit-gallery-image-btn');
    if (removeEditGalleryImageBtn) {
        removeEditGalleryImageBtn.addEventListener('click', () => {
            document.getElementById('edit-gallery-image-preview').src = '';
            document.getElementById('edit-gallery-image-preview-container').classList.add('hidden');
            document.getElementById('edit-gallery-image-upload').value = '';
            removeEditGalleryImageBtn.dataset.removed = 'true';
        });
    }

    // Cart and Product Page Add to Cart/Remove from Cart, Quantity Buttons
    document.addEventListener('click', (event) => {
        // Check if the clicked element or its closest parent is the add-to-cart-btn
        const addToCartButton = event.target.closest('.add-to-cart-btn');
        if (addToCartButton) {
            handleAddToCart(addToCartButton); // Pass the button element directly
            return; // Prevent further bubbling for this event
        }
        
        // Check if the clicked element or its closest parent is the remove-from-cart-btn
        const removeButton = event.target.closest('.remove-from-cart-btn'); // Use closest
        if (removeButton) {
            handleRemoveFromCart(removeButton); // Pass the actual button
            return; // Prevent further bubbling for this event
        }

        // Check for increase quantity button
        const increaseButton = event.target.closest('.increase-quantity-btn');
        if (increaseButton) {
            handleIncreaseQuantity(increaseButton);
            return;
        }

        // Check for decrease quantity button
        const decreaseButton = event.target.closest('.decrease-quantity-btn');
        if (decreaseButton) {
            handleDecreaseQuantity(decreaseButton);
            return;
        }
    });

    // Checkout Button (likely replaced by PayPal, but still here for robustness)
    document.getElementById('checkout-btn')?.addEventListener('click', handleCheckout);

    // Contact Form Submit
    document.getElementById('contact-form')?.addEventListener('submit', handleContactFormSubmit);

    // Load content based on current page
    const currentPage = window.location.pathname.split('/').pop();
    console.log("Current page:", currentPage); // Debug log
    if (currentPage === 'product.html') {
        loadProductDetails();
    } else if (currentPage === 'cart.html') {
        // Load PayPal SDK only on the cart page
        const script = document.createElement('script');
        // IMPORTANT: Replace 'YOUR_PAYPAL_CLIENT_ID' with your actual PayPal client ID
        script.src = `https://www.paypal.com/sdk/js?client-id=YOUR_PAYPAL_CLIENT_ID&currency=USD`; 
        script.onload = () => {
            console.log("PayPal SDK loaded.");
            // loadCartItems will be called by onAuthStateChanged and will render buttons
        };
        script.onerror = () => {
            console.error("Failed to load PayPal SDK.");
            showMessageBox("Failed to load PayPal checkout. Please try again later.", "error");
        };
        document.head.appendChild(script);
    } else if (currentPage === 'about.html') {
        // loadAboutContent and loadAboutGallery are already called in onAuthStateChanged
    } else if (currentPage === 'shop.html' || currentPage === 'index.html' || currentPage === '') {
        // loadArtworks is already called in onAuthStateChanged, which is fine as it uses onSnapshot
    }
});

// Ensure website name is set even before Firebase load for quick display
document.querySelectorAll('[data-setting="websiteName"]').forEach(el => {
    el.textContent = "WBI"; // Set to "WBI" as default
});
document.getElementById('page-title').textContent = document.title; // Ensure title is set
