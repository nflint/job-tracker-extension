import { cachedFetch, clearCache } from './cache.js';

let currentTab = null;
let currentDataType = 'job'; // 'job' or 'profile'

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

function formatExperience(experience) {
  return experience.map(job => 
    `${job.title} at ${job.company}\n${job.duration}\n${job.description}`
  ).join('\n\n');
}

function formatEducation(education) {
  return education.map(edu => 
    `${edu.school}\n${edu.degree}\n${edu.duration}`
  ).join('\n\n');
}

function formatSkills(skills) {
  return skills.map(skill => skill.text).join(', ');
}

async function autofillForm() {
  try {
	showStatus('Connecting to page...', 'info');
	
	await ensureContentScriptLoaded();
	
	const response = await chrome.tabs.sendMessage(currentTab.id, { 
	  action: 'scrapeJob' 
	});

	if (!response || !response.success) {
	  throw new Error(response?.error || 'Failed to scrape data');
	}

	currentDataType = response.type;
	document.getElementById('jobForm').style.display = response.type === 'job' ? 'block' : 'none';
	document.getElementById('profileForm').style.display = response.type === 'profile' ? 'block' : 'none';

	const data = response.data;
	if (response.type === 'profile') {
	  document.getElementById('profileName').value = data.name || '';
	  document.getElementById('headline').value = data.headline || '';
	  document.getElementById('about').value = data.about || '';
	  document.getElementById('experience').value = formatExperience(data.experience || []);
	  document.getElementById('education').value = formatEducation(data.education || []);
	  document.getElementById('skills').value = formatSkills(data.skills || []);
	} else {
	  document.getElementById('role').value = data.role || '';
	  document.getElementById('company').value = data.company || '';
	  document.getElementById('link').value = data.link || currentTab.url;
	  document.getElementById('description').value = data.description || '';
	}
	
	showStatus('Data auto-filled successfully!', 'success');
  } catch (error) {
	console.error('[Job Scraper] Autofill error:', error);
	showStatus('Error: ' + error.message, 'error');
  }
}

async function saveData() {
  try {
	// Get appropriate webhook based on data type
	const { jobWebhook, profileWebhook, resume, email } = await chrome.storage.sync.get(
	  ['jobWebhook', 'profileWebhook', 'resume', 'email']
	);

	const webhookUrl = currentDataType === 'job' ? jobWebhook : profileWebhook;
	
	if (!webhookUrl) {
	  showStatus(`Please configure ${currentDataType} webhook URL in settings`, 'error');
	  return;
	}

	let data;
	if (currentDataType === 'profile') {
	  data = {
		type: 'profile',
		name: document.getElementById('profileName').value.trim(),
		headline: document.getElementById('headline').value.trim(),
		about: document.getElementById('about').value.trim(),
		experience: document.getElementById('experience').value.trim(),
		education: document.getElementById('education').value.trim(),
		skills: document.getElementById('skills').value.trim(),
		link: currentTab.url,
		timestamp: new Date().toISOString(),
		email: email || '',
		source: new URL(currentTab.url).hostname,
		browser: navigator.userAgent,
		scrapeDate: new Date().toISOString()
	  };

	  if (!data.name) {
		showStatus('Profile name is required', 'error');
		return;
	  }
	} else {
	  data = {
		type: 'job',
		role: document.getElementById('role').value.trim(),
		company: document.getElementById('company').value.trim(),
		link: document.getElementById('link').value.trim(),
		description: document.getElementById('description').value.trim(),
		notes: document.getElementById('notes').value.trim(),
		rating: document.getElementById('rating').value,
		timestamp: new Date().toISOString(),
		resume: resume || '',
		email: email || '',
		source: new URL(document.getElementById('link').value.trim()).hostname,
		browser: navigator.userAgent,
		scrapeDate: new Date().toISOString()
	  };

	  if (!data.role || !data.company) {
		showStatus('Role and company are required for job listings', 'error');
		return;
	  }
	}

	showStatus('Sending data...', 'info');

	const response = await cachedFetch(webhookUrl, {
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

	console.log(`[Job Scraper] ${currentDataType} data saved successfully:`, {
	  ...data,
	  resume: data.resume ? `Resume included (length: ${data.resume.length})` : 'No resume',
	  email: data.email ? 'Email included' : 'No email'
	});

	showStatus('Data saved successfully!', 'success');
	clearForm();
  } catch (error) {
	console.error('[Job Scraper] Save error:', error);
	showStatus('Error saving data: ' + error.message, 'error');
  }
}

document.addEventListener('DOMContentLoaded', async function() {
  try {
	console.log('[Job Scraper] Initializing popup...');
	
	const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
	currentTab = tabs[0];
	
	const isSupported = currentTab.url.match(/linkedin\.com|indeed\.com|ziprecruiter\.com|greenhouse\.io/);
	
	if (!isSupported) {
	  document.getElementById('autofill').disabled = true;
	  showStatus('This page is not supported for scraping', 'info');
	}

	const config = await chrome.storage.sync.get(['jobWebhook', 'profileWebhook', 'resume', 'email']);
	if (!config.jobWebhook && !config.profileWebhook) {
	  showStatus('Please configure webhook URLs in settings', 'error');
	}

	document.getElementById('link').value = currentTab.url;
	
	console.log('[Job Scraper] Setting up event listeners...');
	
	const autofillButton = document.getElementById('autofill');
	const saveButton = document.getElementById('save');
	const optionsButton = document.getElementById('openOptions');

	if (autofillButton) autofillButton.addEventListener('click', autofillForm);
	if (saveButton) saveButton.addEventListener('click', saveData);
	if (optionsButton) optionsButton.addEventListener('click', openOptions);

	ensureContentScriptLoaded().catch(console.error);
	
	console.log('[Job Scraper] Popup initialized successfully');
  } catch (error) {
	console.error('[Job Scraper] Initialization error:', error);
	showStatus('Failed to initialize popup', 'error');
  }
});

function clearForm() {
  if (currentDataType === 'profile') {
	document.getElementById('profileName').value = '';
	document.getElementById('headline').value = '';
	document.getElementById('about').value = '';
	document.getElementById('experience').value = '';
	document.getElementById('education').value = '';
	document.getElementById('skills').value = '';
  } else {
	document.getElementById('role').value = '';
	document.getElementById('company').value = '';
	document.getElementById('description').value = '';
	document.getElementById('notes').value = '';
	document.getElementById('rating').value = '3';
  }
  
  clearCache().catch(console.error);
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
  if (chrome.runtime.openOptionsPage) {
    chrome.runtime.openOptionsPage();
  } else {
    window.open(chrome.runtime.getURL('options.html'));
  }
}

document.addEventListener('keydown', function(e) {
  if (e.ctrlKey && e.key === 'Enter') {
	saveData();
  } else if (e.ctrlKey && e.key === 'b') {
	autofillForm();
  }
});