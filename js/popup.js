document.addEventListener('DOMContentLoaded', async function() {
  // Check if we're on a supported page
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const isSupported = tab.url.match(/linkedin\.com|indeed\.com|ziprecruiter\.com|greenhouse\.io/);
  
  if (!isSupported) {
	showStatus('This page is not supported for job scraping', 'error');
	document.getElementById('autofill').disabled = true;
  }

  // Load saved webhook URL
  chrome.storage.sync.get(['webhookUrl'], function(result) {
	if (!result.webhookUrl) {
	  showStatus('Please configure Zapier webhook URL in settings', 'error');
	}
  });

  // Get current tab URL
  document.getElementById('link').value = tab.url;
  
  document.getElementById('save').addEventListener('click', sendToZapier);
  document.getElementById('autofill').addEventListener('click', autofillForm);
  document.getElementById('openOptions').addEventListener('click', function() {
	chrome.runtime.openOptionsPage();
  });
});

async function autofillForm() {
  try {
	const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
	
	// First, inject the content script if it's not already injected
	try {
	  await chrome.scripting.executeScript({
		target: { tabId: tab.id },
		files: ['content.js']
	  });
	} catch (error) {
	  console.log('Content script already injected or failed to inject:', error);
	}
	
	// Now try to send the message
	const result = await new Promise((resolve, reject) => {
	  chrome.tabs.sendMessage(tab.id, { action: 'scrapeJob' }, (response) => {
		if (chrome.runtime.lastError) {
		  reject(new Error(chrome.runtime.lastError.message));
		  return;
		}
		resolve(response);
	  });
	});
	
	if (!result) {
	  showStatus('Unable to scrape job data from this page', 'error');
	  return;
	}

	// Populate form fields
	document.getElementById('role').value = result.role || '';
	document.getElementById('company').value = result.company || '';
	document.getElementById('link').value = result.link || tab.url;
	document.getElementById('description').value = result.description || '';
	showStatus('Data auto-filled successfully!', 'success');
  } catch (error) {
	console.error('Autofill error:', error);
	showStatus('Error: Could not connect to page. Please refresh and try again.', 'error');
  }
}

async function sendToZapier() {
  const { webhookUrl } = await chrome.storage.sync.get(['webhookUrl']);
  
  if (!webhookUrl) {
	showStatus('Please configure Zapier webhook URL in settings', 'error');
	return;
  }

  const data = {
	role: document.getElementById('role').value.trim(),
	company: document.getElementById('company').value.trim(),
	link: document.getElementById('link').value.trim(),
	description: document.getElementById('description').value.trim(),
	notes: document.getElementById('notes').value.trim(),
	rating: document.getElementById('rating').value,
	timestamp: new Date().toISOString()
  };

  // Basic validation
  if (!data.role || !data.company) {
	showStatus('Please fill in at least the role and company fields.', 'error');
	return;
  }

  try {
	const response = await fetch(webhookUrl, {
	  method: 'POST',
	  body: JSON.stringify(data),
	  headers: {
		'Content-Type': 'application/json',
		'Accept': 'application/json'
	  },
	  mode: 'cors'
	});

	if (!response.ok) {
	  throw new Error(`Failed to send data: ${response.status}`);
	}

	showStatus('Job listing sent successfully!', 'success');
	clearForm();
  } catch (error) {
	console.error('Error details:', error);
	showStatus('Error sending data: ' + error.message, 'error');
  }
}

function showStatus(message, type) {
  const statusElement = document.getElementById('status');
  statusElement.textContent = message;
  statusElement.style.display = 'block';
  statusElement.className = 'status ' + type;
  
  if (type !== 'error') {  // Don't auto-hide error messages
	setTimeout(() => {
	  statusElement.style.display = 'none';
	}, 3000);
  }
}

function clearForm() {
  document.getElementById('role').value = '';
  document.getElementById('company').value = '';
  document.getElementById('description').value = '';
  document.getElementById('notes').value = '';
  document.getElementById('rating').value = '3';
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
  if (e.ctrlKey && e.key === 'Enter') {
	sendToZapier();
  } else if (e.ctrlKey && e.key === 'b') {
	autofillForm();
  }
});