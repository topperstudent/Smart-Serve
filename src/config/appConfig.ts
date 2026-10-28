/**
 * SmartServe Centralized Application & Routing Configuration
 * Ensures all QR codes and customer links use the permanent production base URL:
 * https://smart-serve-peach.vercel.app/
 */

export const APP_CONFIG = {
  // Production Base URL for all customer-facing QR codes and public links
  // Configurable in one place; never uses AI Studio auth bridge or temporary Cloud Run URLs
  PRODUCTION_BASE_URL:
    (import.meta.env.VITE_PUBLIC_APP_URL as string) || 'https://smart-serve-peach.vercel.app',

  /**
   * Generates the canonical, permanent QR code URL for any restaurant table
   * @param restaurantId The stable restaurant identifier
   * @param tableId The unique table identifier (e.g. 't1', 't2')
   */
  getCustomerTableUrl(restaurantId: string, tableId: string): string {
    const cleanBase = this.PRODUCTION_BASE_URL.replace(/\/+$/, '');
    return `${cleanBase}/?restaurant=${encodeURIComponent(restaurantId)}&table=${encodeURIComponent(tableId)}`;
  },

  /**
   * Generates a preview customer URL suitable for testing in current origin or production
   */
  getPreviewTableUrl(restaurantId: string, tableId: string): string {
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : this.PRODUCTION_BASE_URL;
    return `${currentOrigin}/?restaurant=${encodeURIComponent(restaurantId)}&table=${encodeURIComponent(tableId)}`;
  },
};
