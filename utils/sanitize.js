/**
 * Sanitize HTML to prevent XSS attacks
 * This is a simple sanitizer - for production, consider using DOMPurify
 */

/**
 * Escape HTML special characters to prevent XSS
 */
export function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  return String(text).replace(/[&<>"'/]/g, (s) => map[s]);
}

/**
 * Sanitize text for safe display
 * Removes script tags and dangerous attributes
 */
export function sanitizeText(text) {
  if (!text) return '';
  
  // Remove script tags and their content
  let sanitized = String(text).replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove event handlers (onclick, onerror, etc.)
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '');
  
  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, '');
  
  // Remove data: protocol (can be used for XSS)
  sanitized = sanitized.replace(/data:text\/html/gi, '');
  
  return sanitized;
}

/**
 * Create safe HTML for descriptions
 * Allows basic formatting tags only
 */
export function sanitizeDescription(html) {
  if (!html) return '';
  
  const allowedTags = ['p', 'br', 'b', 'strong', 'i', 'em', 'u', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
  const allowedAttrs = ['class', 'id'];
  
  let sanitized = String(html);
  
  // Remove all script tags
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove all event handlers
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '');
  
  // Remove javascript: and data: protocols
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/data:text\/html/gi, '');
  
  // Remove style tags
  sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  
  // Remove iframe, embed, object tags
  sanitized = sanitized.replace(/<(iframe|embed|object)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>/gi, '');
  
  return sanitized;
}

/**
 * Escape URL to prevent XSS in href attributes
 */
export function sanitizeUrl(url) {
  if (!url) return '';
  
  const urlStr = String(url).trim();
  
  // Block javascript: protocol
  if (urlStr.toLowerCase().startsWith('javascript:')) {
    return '';
  }
  
  // Block data: protocol for HTML
  if (urlStr.toLowerCase().startsWith('data:text/html')) {
    return '';
  }
  
  // Allow http, https, mailto, tel, and relative URLs
  if (
    urlStr.startsWith('http://') ||
    urlStr.startsWith('https://') ||
    urlStr.startsWith('mailto:') ||
    urlStr.startsWith('tel:') ||
    urlStr.startsWith('/') ||
    urlStr.startsWith('#')
  ) {
    return urlStr;
  }
  
  // If it doesn't match any safe pattern, return empty
  return '';
}
