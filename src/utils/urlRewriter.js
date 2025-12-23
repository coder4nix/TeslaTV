/**
 * URL Rewriter Utility
 * Rewrites URLs to use local proxy for Mixed Content and CORS issues
 */

/**
 * Check if we need to use proxy (HTTPS page with HTTP content or cross-origin)
 */
const needsProxy = () => {
  const serverSettings = localStorage.getItem('adminServerSettings');
  if (!serverSettings) return false;

  const { serverUrl, port } = JSON.parse(serverSettings);
  let baseUrl = serverUrl?.endsWith('/') ? serverUrl.slice(0, -1) : serverUrl;

  // Relative URLs already use proxy
  if (baseUrl?.startsWith('/')) return false;

  if (baseUrl && !baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
    baseUrl = 'http://' + baseUrl;
  }

  const isPageHttps = window.location.protocol === 'https:';
  const isServerHttp = baseUrl?.startsWith('http://');

  // Check cross-origin
  try {
    const serverUrlObj = new URL(port ? `${baseUrl}:${port}` : baseUrl);
    const isCrossOrigin = window.location.origin !== serverUrlObj.origin;
    return (isPageHttps && isServerHttp) || isCrossOrigin;
  } catch (e) {
    return isPageHttps && isServerHttp;
  }
};

/**
 * Get IPTV server host for URL matching
 */
const getIptvServerHost = () => {
  const serverSettings = localStorage.getItem('adminServerSettings');
  if (!serverSettings) return null;

  const { serverUrl, port } = JSON.parse(serverSettings);
  let baseUrl = serverUrl?.endsWith('/') ? serverUrl.slice(0, -1) : serverUrl;

  if (!baseUrl) return null;
  if (baseUrl.startsWith('/')) return null;

  if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
    baseUrl = 'http://' + baseUrl;
  }

  try {
    const urlObj = new URL(port ? `${baseUrl}:${port}` : baseUrl);
    return urlObj.host;
  } catch (e) {
    return null;
  }
};

/**
 * Rewrite image URL to use proxy
 * @param {string} url - Original image URL
 * @returns {string} - Rewritten URL for proxy or original
 */
export const rewriteImageUrl = (url) => {
  if (!url) return url;

  // Skip if already relative or data URL
  if (url.startsWith('/') || url.startsWith('data:')) return url;

  // Skip placeholder URLs
  if (url.includes('placeholder.com')) return url;

  // Only rewrite if proxy is needed
  if (!needsProxy()) return url;

  try {
    const urlObj = new URL(url);
    const iptvHost = getIptvServerHost();

    // Only rewrite URLs from our IPTV server
    if (iptvHost && urlObj.host === iptvHost) {
      // Rewrite to use /images/ proxy (which Nginx forwards to IPTV server)
      if (urlObj.pathname.startsWith('/images/')) {
        return urlObj.pathname + urlObj.search;
      }
      // For other paths, use /api/ prefix
      return '/api' + urlObj.pathname + urlObj.search;
    }

    // For external image URLs, we can't proxy them
    // Return original and let browser handle it (may fail due to Mixed Content)
    return url;
  } catch (e) {
    console.warn('[urlRewriter] Failed to parse URL:', url, e);
    return url;
  }
};

/**
 * Rewrite stream URL to use proxy
 * @param {string} url - Original stream URL
 * @returns {string} - Rewritten URL for proxy or original
 */
export const rewriteStreamUrl = (url) => {
  if (!url) return url;

  // Skip if already relative
  if (url.startsWith('/')) return url;

  // Only rewrite if proxy is needed
  if (!needsProxy()) return url;

  try {
    const urlObj = new URL(url);
    const iptvHost = getIptvServerHost();

    // Only rewrite URLs from our IPTV server
    if (iptvHost && urlObj.host === iptvHost) {
      // Use appropriate proxy based on path
      if (urlObj.pathname.startsWith('/play/') ||
          urlObj.pathname.startsWith('/live/') ||
          urlObj.pathname.startsWith('/movie/') ||
          urlObj.pathname.startsWith('/series/')) {
        return urlObj.pathname + urlObj.search;
      }
      // Default to /api/ prefix
      return '/api' + urlObj.pathname + urlObj.search;
    }

    return url;
  } catch (e) {
    console.warn('[urlRewriter] Failed to parse stream URL:', url, e);
    return url;
  }
};

/**
 * Rewrite any URL from IPTV server to use proxy
 * @param {string} url - Original URL
 * @returns {string} - Rewritten URL
 */
export const rewriteUrl = (url) => {
  if (!url) return url;

  // Check if it's an image URL
  if (url.includes('/images/') || /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(url)) {
    return rewriteImageUrl(url);
  }

  // Otherwise treat as stream URL
  return rewriteStreamUrl(url);
};

export default {
  rewriteImageUrl,
  rewriteStreamUrl,
  rewriteUrl
};
