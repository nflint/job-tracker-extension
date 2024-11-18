console.log('[Job Scraper] Background script loaded');

// Keep track of tabs with content script loaded
const loadedTabs = new Set();

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.action === 'CONTENT_SCRIPT_LOADED' && sender.tab) {
	console.log('[Job Scraper] Content script loaded in tab:', sender.tab.id);
	loadedTabs.add(sender.tab.id);
  }
});

// Listen for tab updates to track content script status
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'complete') {
	loadedTabs.delete(tabId);
  }
});

// Clean up when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
  loadedTabs.delete(tabId);
});

// Helper function to inject content script
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

// Message handler for script injection requests
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