/**
 * Cache management for job tracker extension
 * Implements caching for API calls and job data
 */

const CACHE_PREFIX = 'job_tracker_cache_';
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Generates a cache key for a given URL
 * @param {string} url - The URL to generate a cache key for
 * @returns {string} The cache key
 */
function generateCacheKey(url) {
  return CACHE_PREFIX + btoa(url);
}

/**
 * Checks if a cached item is still valid
 * @param {Object} cachedItem - The cached item to check
 * @returns {boolean} Whether the item is still valid
 */
function isValidCache(cachedItem) {
  if (!cachedItem || !cachedItem.timestamp) return false;
  const now = Date.now();
  return (now - cachedItem.timestamp) < CACHE_EXPIRY;
}

/**
 * Caches data with the given key
 * @param {string} key - The key to cache the data under
 * @param {any} data - The data to cache
 * @returns {Promise<void>}
 */
async function setCacheItem(key, data) {
  const cacheItem = {
    data,
    timestamp: Date.now()
  };
  await chrome.storage.local.set({ [key]: cacheItem });
}

/**
 * Gets cached data for the given key
 * @param {string} key - The key to get cached data for
 * @returns {Promise<any|null>} The cached data or null if not found/expired
 */
async function getCacheItem(key) {
  const result = await chrome.storage.local.get(key);
  const cachedItem = result[key];
  
  if (!isValidCache(cachedItem)) {
    await chrome.storage.local.remove(key);
    return null;
  }
  
  return cachedItem.data;
}

/**
 * Wraps a fetch call with caching
 * @param {string} url - The URL to fetch
 * @param {Object} options - Fetch options
 * @returns {Promise<Response>} The fetch response
 */
async function cachedFetch(url, options = {}) {
  const cacheKey = generateCacheKey(url);
  
  // Don't cache POST requests or if cache is explicitly disabled
  if (options.method === 'POST' || options.cache === 'no-store') {
    return fetch(url, options);
  }
  
  // Try to get from cache first
  const cachedData = await getCacheItem(cacheKey);
  if (cachedData) {
    return new Response(new Blob([JSON.stringify(cachedData)]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // If not in cache, fetch and cache the response
  const response = await fetch(url, options);
  const data = await response.clone().json();
  await setCacheItem(cacheKey, data);
  
  return response;
}

/**
 * Clears all cached data
 * @returns {Promise<void>}
 */
async function clearCache() {
  const storage = await chrome.storage.local.get(null);
  const cacheKeys = Object.keys(storage).filter(key => key.startsWith(CACHE_PREFIX));
  await chrome.storage.local.remove(cacheKeys);
}

export {
  cachedFetch,
  clearCache,
  setCacheItem,
  getCacheItem
}; 