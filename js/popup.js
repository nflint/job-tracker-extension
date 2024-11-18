// popup.js
let currentTab = null;

async function ensureContentScriptLoaded() {
  if (!currentTab?.id) {
	throw new Error('No active tab');
  }

  console.log('[Job Scraper] Ensuring content script is loaded...');
  
  // First try to ping existing content script
  try {
	const response = await chrome.tabs.sendMessage(currentTab.id, { action: 'ping' });
	if (response?.status === 'ready') {
	  console.log('[Job Scraper] Content script already loaded');
	  return true;
	}
  } catch (error) {
	console.log('[Job Scraper] Content script not responding, will inject');
  }

  // If ping failed, try to inject
  const result = await chrome.runtime.sendMessage({ 
	action: 'ensureContentScriptLoaded',
	tabId: currentTab.id
  });

  if (!result.success) {
	throw new Error('Failed to inject content script');
  }

  // Wait a bit for script to initialize
  await new Promise(resolve => setTimeout(resolve, 100));
  return true;
}

async function autofillForm() {
  try {
	showStatus('Connecting to page...', 'info');
	
	// Ensure content script is loaded
	await ensureContentScriptLoaded();
	
	// Try to scrape the data
	const response = await chrome.tabs.sendMessage(currentTab.id, { 
	  action: 'scrapeJob' 
	});

	if (!response || !response.success) {
	  throw new Error(response?.error || 'Failed to scrape job data');
	}

	const data = response.data;
	
	// Populate form fields
	document.getElementById('role').value = data.role || '';
	document.getElementById('company').value = data.company || '';
	document.getElementById('link').value = data.link || currentTab.url;
	document.getElementById('description').value = data.description || '';
	
	showStatus('Data auto-filled successfully!', 'success');
  } catch (error) {
	console.error('[Job Scraper] Autofill error:', error);
	showStatus('Error: ' + error.message, 'error');
	
	// If we got a connection error, suggest refresh
	if (error.message.includes('connect')) {
	  showStatus('Please refresh the page and try again', 'error');
	}
  }
}

// Initialize popup
document.addEventListener('DOMContentLoaded', async function() {
  try {
	// Get current tab
	const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
	currentTab = tabs[0];
	
	// Check if we're on a supported page
	const isSupported = currentTab.url.match(/linkedin\.com|indeed\.com|ziprecruiter\.com|greenhouse\.io/);
	
	if (!isSupported) {
	  showStatus('This page is not supported for job scraping', 'error');
	  document.getElementById('autofill').disabled = true;
	  return;
	}

	// Load saved webhook URL
	const result = await chrome.storage.sync.get(['webhookUrl']);
	if (!result.webhookUrl) {
	  showStatus('Please configure webhook URL in settings', 'error');
	}

	// Set current URL
	document.getElementById('link').value = currentTab.url;
	
	// Add event listeners
	document.getElementById('save').addEventListener('click', sendToZapier);
	document.getElementById('autofill').addEventListener('click', autofillForm);
	document.getElementById('openOptions').addEventListener('click', () => {
	  chrome.runtime.openOptionsPage();
	});

	// Try to pre-load content script
	ensureContentScriptLoaded().catch(console.error);
	
  } catch (error) {
	console.error('[Job Scraper] Initialization error:', error);
	showStatus('Error initializing extension', 'error');
  }
});

// Rest of your existing popup.js code (sendToZapier, showStatus, etc.)...