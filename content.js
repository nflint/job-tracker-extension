/**
 * Job Scraper Content Script
 * 
 * This content script runs on supported job listing pages to scrape job details.
 * It handles:
 * - Extracting job details like title, company, and description
 * - Cleaning and formatting the extracted content
 * - Communicating with the extension background script
 */

console.log('[Job Scraper] Content script loaded and running');

/**
 * Selector configurations for supported job sites
 * Each site has selectors for role, company and description fields
 * @type {Object.<string, Object>}
 */
const SELECTORS = {
  'linkedin.com': {
	role: {
	  selector: 'h1.job-details-jobs-unified-top-card__job-title, .job-details-jobs-unified-top-card__job-title, .jobs-unified-top-card__job-title',
	  type: 'text'
	},
	company: {
	  selector: '.jobs-unified-top-card__company-name, .job-details-jobs-unified-top-card__company-name',
	  type: 'text'
	},
	description: {
	  selector: '.jobs-description__content, .jobs-box__html-content',
	  type: 'html'
	}
  },
  'indeed.com': {
	role: {
	  selector: '.jobsearch-JobInfoHeader-title',
	  type: 'text'
	},
	company: {
	  selector: '[data-company-name], .jobsearch-InlineCompanyRating > div:first-child',
	  type: 'text'
	},
	description: {
	  selector: '#jobDescriptionText',
	  type: 'html'
	}
  },
  'ziprecruiter.com': {
	role: {
	  selector: '.job_title, .hiring_job_title',
	  type: 'text'
	},
	company: {
	  selector: '.company_name, .hiring_company_text',
	  type: 'text'
	},
	description: {
	  selector: '.job_description, [class*="whitespace-pre-line break-words"]',
	  type: 'html'
	}
  }
};

// Notify that the content script is ready
chrome.runtime.sendMessage({ action: 'CONTENT_SCRIPT_LOADED' });

/**
 * Sets up message listeners for communication with the extension
 * Handles scraping requests and ping checks
 */
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

/**
 * Gets the hostname from the current URL and matches it to supported domains
 * @param {string} url - The URL to parse
 * @returns {string|null} Matching domain from SELECTORS or null if not supported
 */
function getHostname(url) {
  const hostname = new URL(url).hostname;
  console.log('[Job Scraper] Current hostname:', hostname);
  const domain = Object.keys(SELECTORS).find(domain => hostname.includes(domain)) || null;
  console.log('[Job Scraper] Matched domain:', domain);
  return domain;
}

/**
 * Extracts content from a DOM element based on the specified type
 * @param {Element} element - DOM element to extract from
 * @param {string} type - Type of content ('text' or 'html')
 * @param {string} field - Name of the field being extracted
 * @returns {string} Extracted and cleaned content
 */
function extractContent(element, type, field) {
  console.log(`[Job Scraper] Extracting ${field} content:`, { element, type });
  
  if (!element) {
	console.log(`[Job Scraper] No element found for ${field}`);
	return '';
  }
  
  const rawContent = type === 'html' ? element.innerHTML : element.textContent;
  console.log(`[Job Scraper] Raw ${field} content:`, rawContent);
  
  if (type === 'html') {
	return cleanHTML(rawContent);
  }
  
  return rawContent.trim();
}

/**
 * Cleans HTML content by removing unwanted tags and formatting
 * @param {string} html - Raw HTML content
 * @returns {string} Cleaned and formatted text content
 */
function cleanHTML(html) {
  if (!html) return '';
  
  const temp = document.createElement('div');
  temp.innerHTML = html;

  // Remove script and style tags
  const scriptsAndStyles = temp.querySelectorAll('script, style');
  scriptsAndStyles.forEach(element => element.remove());

  // Convert <br> and </p> tags to newlines
  const content = temp.innerHTML
	.replace(/<br\s*\/?>/gi, '\n')
	.replace(/<\/p>/gi, '\n\n');

  // Strip remaining HTML tags
  const textContent = content
	.replace(/<[^>]+>/g, ' ')
	.replace(/&nbsp;/g, ' ')
	.replace(/\s+/g, ' ')
	.trim();

  // Clean up whitespace
  return textContent
	.split(/\n+/)
	.map(line => line.trim())
	.filter(line => line)
	.join('\n');
}

/**
 * Main function to scrape job data from the current page
 * Uses domain-specific selectors to extract job details
 * @returns {Object} Scraped job data including role, company, description and link
 * @throws {Error} If the website is not supported
 */
function scrapeJobData() {
  console.log('[Job Scraper] Starting job data scrape...');
  
  const domain = getHostname(window.location.href);
  if (!domain) {
	console.log('[Job Scraper] No matching domain found');
	throw new Error('This website is not supported');
  }

  console.log('[Job Scraper] Using selectors for domain:', domain);
  const selectors = SELECTORS[domain];
  const data = {};

  // Log all elements we find before extraction
  console.log('[Job Scraper] Finding elements...');
  for (const [field, config] of Object.entries(selectors)) {
	console.log(`[Job Scraper] Looking for ${field} with selector:`, config.selector);
	const element = document.querySelector(config.selector);
	console.log(`[Job Scraper] ${field} element:`, element);
	
	// Try alternative methods if the main selector fails
	if (!element && field === 'role') {
	  console.log('[Job Scraper] Trying alternative methods to find role...');
	  // Try finding by h1 tag
	  const h1Element = document.querySelector('h1');
	  if (h1Element) {
		console.log('[Job Scraper] Found role in h1:', h1Element.textContent);
		data[field] = h1Element.textContent.trim();
		continue;
	  }
	}
	
	data[field] = extractContent(element, config.type, field);
  }

  console.log('[Job Scraper] Final scraped data:', data);

  return {
	...data,
	link: window.location.href
  };
}