const CLOUD_NAME = "ddogbnwfz";
const UPLOAD_PRESET = "home-studio";

/**
 * Inject Cloudinary performance transformations into an existing image URL.
 * Adds q_auto (quality), f_auto (format, e.g. WebP/AVIF), and w_500 (width cap).
 * Also applies compression params to Unsplash (images.unsplash.com) URLs.
 * Safe to call on any URL — returns non-Cloudinary/non-Unsplash URLs unchanged.
 * @param {string} url - Original image URL
 * @param {string} [transforms='q_auto,f_auto,w_500'] - Override default Cloudinary transforms
 * @returns {string} Optimized URL
 */
export function optimizeCloudinaryUrl(url, transforms = 'q_auto,f_auto,w_500') {
    if (!url || typeof url !== 'string') return url;

    // Optimize Unsplash static delivery URLs (images.unsplash.com)
    if (url.includes('images.unsplash.com')) {
        // Avoid double-applying if already has our compression params
        if (url.includes('w=500') && url.includes('q=60')) return url;
        // Strip any existing w= and q= params, then append our targets
        const cleanUrl = url.replace(/[&?]w=\d+/g, '').replace(/[&?]q=\d+/g, '');
        const separator = cleanUrl.includes('?') ? '&' : '?';
        return `${cleanUrl}${separator}w=500&q=60`;
    }

    // Only transform genuine Cloudinary delivery URLs
    if (!url.includes('res.cloudinary.com')) return url;
    // Avoid double-injecting transforms
    if (url.includes(transforms.split(',')[0])) return url;
    // Insert transforms immediately after /upload/ (or /image/upload/)
    return url.replace(/(\/upload\/)/, `$1${transforms}/`);
}

/**
 * Upload an image file to Cloudinary
 * @param {File} file 
 * @returns {Promise<string>} Secure URL of the uploaded image
 */
export async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: formData
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "Failed to upload image to Cloudinary.");
    }

    return data.secure_url;
  } catch (error) {
    console.error("Cloudinary Upload Error:", error);
    throw error;
  }
}