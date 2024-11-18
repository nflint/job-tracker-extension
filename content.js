// content.js
console.log('[Job Scraper] Content script loaded and running');

// Immediately notify that the content script is ready
chrome.runtime.sendMessage({ action: 'CONTENT_SCRIPT_LOADED' });

// Set up message listener
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
	console.log('[Job Scraper] Message received:', request);
	
	if (request.action === 'scrapeJob') {
	  console.log('[Job Scraper] Starting job scraping...');
	  try {
		const data = scrapeJobData();
		console.log('[Job Scraper] Scraped data:', data);
		sendResponse({ success: true, data: data });
	  } catch (error) {
		console.error('[Job Scraper] Scraping error:', error);
		sendResponse({ success: false, error: error.message });
	  }
	} else if (request.action === 'ping') {
	  sendResponse({ status: 'ready' });
	}
	return true; // Keep the message channel open
  }
);

// Rest of your existing content.js code...