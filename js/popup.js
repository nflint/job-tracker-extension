document.addEventListener('DOMContentLoaded', function() {
  // Load saved webhook URL
  chrome.storage.sync.get(['webhookUrl'], function(result) {
	if (!result.webhookUrl) {
	  showStatus('Please configure Zapier webhook URL in settings', 'error');
	}
  });

  // Get current tab URL
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
	document.getElementById('link').value = tabs[0].url;
  });

  document.getElementById('save').addEventListener('click', sendToZapier);
  document.getElementById('autofill').addEventListener('click', autofillForm);
  document.getElementById('openOptions').addEventListener('click', function() {
	chrome.runtime.openOptionsPage();
  });
});

async function autofillForm() {
  try {
	const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
	
	const result = await chrome.tabs.sendMessage(tab.id, { action: 'scrapeJob' });
	
	if (!result) {
	  showStatus('Unable to scrape job data from this page', 'error');
	  return;
	}

	document.getElementById('role').value = result.role || '';
	document.getElementById('company').value = result.company || '';
	document.getElementById('link').value = result.link || tab.url;
	document.getElementById('description').value = result.description || '';
	showStatus('Data auto-filled successfully!', 'success');
  } catch (error) {
	showStatus('Error auto-filling data: ' + error.message, 'error');
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
	  }
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
  
  setTimeout(() => {
	statusElement.style.display = 'none';
  }, 3000);
}

function clearForm() {
  document.getElementById('role').value = '';
  document.getElementById('company').value = '';
  document.getElementById('description').value = '';
  document.getElementById('notes').value = '';
  document.getElementById('rating').value = '3';
}

document.addEventListener('keydown', function(e) {
  if (e.ctrlKey && e.key === 'Enter') {
	sendToZapier();
  } else if (e.ctrlKey && e.key === 'b') {
	autofillForm();
  }
});
