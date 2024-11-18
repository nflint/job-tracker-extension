document.addEventListener('DOMContentLoaded', loadSettings);
document.getElementById('save').addEventListener('click', saveSettings);

function loadSettings() {
  chrome.storage.sync.get(['webhookUrl', 'email', 'resume'], function(data) {
	if (data.webhookUrl) {
	  document.getElementById('webhook').value = data.webhookUrl;
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
  const webhookUrl = document.getElementById('webhook').value.trim();
  const email = document.getElementById('email').value.trim();
  const resume = document.getElementById('resume').value.trim();

  chrome.storage.sync.set({
	webhookUrl,
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
