let currentTab = null;

async function ensureContentScriptLoaded() {
  if (!currentTab?.id) {
	throw new Error('No active tab');
  }

  console.log('[Job Scraper] Ensuring content script is loaded...');
  
  try {
	const response = await chrome.tabs.sendMessage(currentTab.id, { action: 'ping' });
	if (response?.status === 'ready') {
	  console.log('[Job Scraper] Content script already loaded');
	  return true;
	}
  } catch (error) {
	console.log('[Job Scraper] Content script not responding, will inject');
  }

  const result = await chrome.runtime.sendMessage({ 
	action: 'ensureContentScriptLoaded',
	tabId: currentTab.id
  });

  if (!result.success) {
	throw new Error('Failed to inject content script');
  }

  await new Promise(resolve => setTimeout(resolve, 100));
  return true;
}

async function autofillForm() {
  try {
	showStatus('Connecting to page...', 'info');
	
	await ensureContentScriptLoaded();
	
	const response = await chrome.tabs.sendMessage(currentTab.id, { 
	  action: 'scrapeJob' 
	});

	if (!response || !response.success) {
	  throw new Error(response?.error || 'Failed to scrape job data');
	}

	const data = response.data;
	
	document.getElementById('role').value = data.role || '';
	document.getElementById('company').value = data.company || '';
	document.getElementById('link').value = data.link || currentTab.url;
	document.getElementById('description').value = data.description || '';
	
	showStatus('Data auto-filled successfully!', 'success');
  } catch (error) {
	console.error('[Job Scraper] Autofill error:', error);
	showStatus('Error: ' + error.message, 'error');
  }
}

async function saveJob() {
  try {
	// Get webhook URL, resume, and email from storage
	const { webhookUrl, resume, email } = await chrome.storage.sync.get(['webhookUrl', 'resume', 'email']);
	
	if (!webhookUrl) {
	  showStatus('Please configure webhook URL in settings', 'error');
	  return;
	}

	const data = {
	  role: document.getElementById('role').value.trim(),
	  company: document.getElementById('company').value.trim(),
	  link: document.getElementById('link').value.trim(),
	  description: document.getElementById('description').value.trim(),
	  notes: document.getElementById('notes').value.trim(),
	  rating: document.getElementById('rating').value,
	  timestamp: new Date().toISOString(),
	  // Add resume and email if they exist
	  resume: resume || '',
	  email: email || '',
	  // Add metadata
	  source: new URL(document.getElementById('link').value.trim()).hostname,
	  browser: navigator.userAgent,
	  scrapeDate: new Date().toISOString()
	};

	if (!data.role || !data.company) {
	  showStatus('Please fill in at least the role and company fields.', 'error');
	  return;
	}

	showStatus('Sending data...', 'info');

	const response = await fetch(webhookUrl, {
	  method: 'POST',
	  headers: {
		'Content-Type': 'application/json',
		'Accept': 'application/json'
	  },
	  body: JSON.stringify(data)
	});

	if (!response.ok) {
	  throw new Error(`Failed to send data: ${response.status}`);
	}

	// Log successful submission for debugging
	console.log('[Job Scraper] Job saved successfully with data:', {
	  ...data,
	  resume: data.resume ? 'Resume included (length: ' + data.resume.length + ')' : 'No resume',
	  email: data.email ? 'Email included' : 'No email'
	});

	showStatus('Job saved successfully!', 'success');
	clearForm();
  } catch (error) {
	console.error('[Job Scraper] Save error:', error);
	showStatus('Error saving job: ' + error.message, 'error');
  }
}

// Update initialization to check for resume and email
document.addEventListener('DOMContentLoaded', async function() {
  try {
	console.log('[Job Scraper] Initializing popup...');
	
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

	// Load saved configuration
	const config = await chrome.storage.sync.get(['webhookUrl', 'resume', 'email']);
	if (!config.webhookUrl) {
	  showStatus('Please configure webhook URL in settings', 'error');
	}
	if (!config.resume || !config.email) {
	  showStatus('Resume or email not configured in settings', 'info');
	}

	// Set current URL
	document.getElementById('link').value = currentTab.url;
	
	console.log('[Job Scraper] Setting up event listeners...');
	
	// Add button event listeners
	const autofillButton = document.getElementById('autofill');
	const saveButton = document.getElementById('save');
	const optionsButton = document.getElementById('openOptions');

	if (autofillButton) autofillButton.addEventListener('click', autofillForm);
	if (saveButton) saveButton.addEventListener('click', saveJob);
	if (optionsButton) optionsButton.addEventListener('click', openOptions);

	// Try to pre-load content script
	ensureContentScriptLoaded().catch(console.error);
	
	console.log('[Job Scraper] Popup initialized successfully');
  } catch (error) {
	console.error('[Job Scraper] Initialization error:', error);
	showStatus('Error initializing extension', 'error');
  }
});

// Rest of your existing popup.js code remains the same...

function clearForm() {
  document.getElementById('role').value = '';
  document.getElementById('company').value = '';
  document.getElementById('description').value = '';
  document.getElementById('notes').value = '';
  document.getElementById('rating').value = '3';
}

function showStatus(message, type) {
  const statusElement = document.getElementById('status');
  statusElement.textContent = message;
  statusElement.style.display = 'block';
  statusElement.className = `status ${type}`;
  
  if (type !== 'error') {
	setTimeout(() => {
	  statusElement.style.display = 'none';
	}, 3000);
  }
}

function openOptions() {
  chrome.runtime.openOptionsPage();
}

// Initialize popup
document.addEventListener('DOMContentLoaded', async function() {
  try {
	console.log('[Job Scraper] Initializing popup...');
	
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
	
	console.log('[Job Scraper] Setting up event listeners...');
	
	// Add button event listeners
	const autofillButton = document.getElementById('autofill');
	const saveButton = document.getElementById('save');
	const optionsButton = document.getElementById('openOptions');

	if (autofillButton) autofillButton.addEventListener('click', autofillForm);
	if (saveButton) saveButton.addEventListener('click', saveJob);
	if (optionsButton) optionsButton.addEventListener('click', openOptions);

	// Try to pre-load content script
	ensureContentScriptLoaded().catch(console.error);
	
	console.log('[Job Scraper] Popup initialized successfully');
  } catch (error) {
	console.error('[Job Scraper] Initialization error:', error);
	showStatus('Error initializing extension', 'error');
  }
});

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
  if (e.ctrlKey && e.key === 'Enter') {
	saveJob();
  } else if (e.ctrlKey && e.key === 'b') {
	autofillForm();
  }
});