/*
 * Home Studio - WhatsApp Checkout Handler
 * Formats user cart details and address metadata into an elegant luxury purchase manifest
 * and redirects to the WhatsApp checkout service.
 */

const WHATSAPP_CONTACT_PHONE = "+91 7681040945"; // Replace with brand phone number in production

/**
 * Compile order summary and redirect to WhatsApp Web / App API
 * @param {Object} customerInfo - Form details: { name, email, phone, address, city, notes }
 * @param {Array} cartItems - Current products in cart
 * @param {Object} totals - Total prices
 */
export function checkoutViaWhatsApp(customerInfo, cartItems, totals) {
    if (cartItems.length === 0) return;

    // Formatting values
    const formatPrice = (val) => {
        const num = parseFloat(val);
        if (isNaN(num)) return '₹0';
        if (num % 1 === 0) {
            return '₹' + num.toLocaleString('en-IN');
        } else {
            return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
    };

    // 1. Build Header
    let msg = `✨ *NEW ORDER - HOME STUDIO* ✨\n`;
    msg += `─────────────────────────\n\n`;

    // 2. Customer Info block
    msg += `👤 *CUSTOMER DETAILS*:\n`;
    msg += `• *Name:* ${customerInfo.name}\n`;
    msg += `• *Email:* ${customerInfo.email}\n`;
    msg += `• *Phone:* ${customerInfo.phone}\n`;
    msg += `• *Shipping Address:* ${customerInfo.address}, ${customerInfo.city}\n`;
    if (customerInfo.notes) {
        msg += `• *Delivery Note:* _"${customerInfo.notes}"_\n`;
    }
    msg += `\n`;

    // 3. Cart Items block
    msg += `🛋️ *ITEMS ORDERED*:\n`;
    cartItems.forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        const optionsStr = item.selectedOptions && Object.keys(item.selectedOptions).length > 0
            ? ` (${Object.entries(item.selectedOptions).map(([key, val]) => `${key}: ${val}`).join(', ')})`
            : '';
        msg += `${index + 1}. *${item.name}*${optionsStr}\n`;
        msg += `   _Qty:_ ${item.quantity} × ${formatPrice(item.price)} = *${formatPrice(itemTotal)}*\n`;
    });
    msg += `\n`;
    msg += `─────────────────────────\n`;

    // 4. Summary Math
    msg += `📊 *SUMMARY*:\n`;
    msg += `• *Subtotal:* ${formatPrice(totals.subtotal)}\n`;
    msg += `• *Shipping:* FREE (Complimentary Valet)\n`;
    msg += `• *Total Amount:* *${formatPrice(totals.subtotal)}*\n\n`;
    msg += `─────────────────────────\n`;
    msg += `🏷️ _Order sent from Home Studio Luxury Portal. Please verify stock availability to complete payment._`;

    // 5. Build URL link and redirect
    const encodedMessage = encodeURIComponent(msg);
    const whatsappUrl = `https://wa.me/${WHATSAPP_CONTACT_PHONE}?text=${encodedMessage}`;

    // Redirect user to the compiled WhatsApp instance
    window.open(whatsappUrl, '_blank');
}
