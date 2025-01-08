/**
 * Job Scraper Extension - Background Service Worker
 * 
 * This background script manages content script injection and tab tracking.
 * It handles:
 * - Tracking which tabs have content scripts loaded
 * - Injecting content scripts when needed
 * - Cleaning up tab state on updates/removal
 * - Message passing between components
 */

console.log('[Job Scraper] Background script loaded');

/**
 * Set to track tab IDs that have the content script loaded
 * @type {Set<number>}
 */
const loadedTabs = new Set();

/**
 * Listens for messages from content scripts
 * Tracks when content scripts successfully load in tabs
 */
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.action === 'CONTENT_SCRIPT_LOADED' && sender.tab) {
	console.log('[Job Scraper] Content script loaded in tab:', sender.tab.id);
	loadedTabs.add(sender.tab.id);
  }
});

/**
 * Listens for tab updates to track content script status
 * When a tab is updated (e.g. refreshed or navigated), we need to track the content script status
 * This ensures we don't try to re-inject scripts unnecessarily and maintain accurate state
 * 
 * @param {number} tabId - The ID of the tab that was updated
 * @param {object} changeInfo - Contains properties that specify the change
 * @param {string} changeInfo.status - The loading status of the tab ('loading'|'complete') 
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  // When page load completes, remove tab from tracked set since content script needs to be reinjected
  if (changeInfo.status === 'complete') {
	loadedTabs.delete(tabId);
  }
});

/**
 * Cleans up tab tracking when tabs are closed
 * @param {number} tabId - ID of the closed tab
 */
chrome.tabs.onRemoved.addListener((tabId) => {
  loadedTabs.delete(tabId);
});

/**
 * Injects the content script into a specified tab
 * @param {number} tabId - ID of the tab to inject into
 * @returns {Promise<boolean>} True if injection succeeded, false otherwise
 */
async function injectContentScript(tabId) {
  try {
	await chrome.scripting.executeScript({
	  target: { tabId },
	  files: ['content.js']
	});
	console.log('[Job Scraper] Content script injected into tab:', tabId);
	return true;
  } catch (error) {
	console.error('[Job Scraper] Injection error:', error);
	return false;
  }
}

/**
 * Handles messages requesting content script injection
 * Responds with injection status:
 * - already_loaded: Script was previously loaded
 * - injected: Script was just injected successfully
 * - failed: Injection attempt failed
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'ensureContentScriptLoaded') {
	const tabId = request.tabId;
	
	if (loadedTabs.has(tabId)) {
	  sendResponse({ success: true, status: 'already_loaded' });
	} else {
	  injectContentScript(tabId)
		.then(success => {
		  sendResponse({ success, status: success ? 'injected' : 'failed' });
		});
	}
	return true; // Keep message channel open
  }
});