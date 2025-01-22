document.addEventListener('DOMContentLoaded', loadSettings);
document.getElementById('save').addEventListener('click', saveSettings);

function loadSettings() {
  chrome.storage.sync.get(['jobWebhook', 'profileWebhook', 'email', 'resume'], function(data) {
	if (data.jobWebhook) {
	  document.getElementById('jobWebhook').value = data.jobWebhook;
	}
	if (data.profileWebhook) {
	  document.getElementById('profileWebhook').value = data.profileWebhook;
	}
	if (data.email) {
	  document.getElementById('email').value = data.email;
	}
	if (data.resume) {
	  document.getElementById('resume').value = data.resume;
	}
  });
}

function saveSettings() {
  const jobWebhook = document.getElementById('jobWebhook').value.trim();
  const profileWebhook = document.getElementById('profileWebhook').value.trim();
  const email = document.getElementById('email').value.trim();
  const resume = document.getElementById('resume').value.trim();

  if (!jobWebhook && !profileWebhook) {
    showStatus('At least one webhook URL is required', 'error');
    return;
  }

  chrome.storage.sync.set({
	jobWebhook,
	profileWebhook,
	email,
	resume
  }, function() {
	showStatus('Settings saved successfully!', 'success');
  });
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
