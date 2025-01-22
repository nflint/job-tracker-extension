/**
 * LinkedIn Profile Scraper Module
 * Handles scraping of LinkedIn profile information
 */

const PROFILE_SELECTORS = {
  name: {
    selector: 'h1.text-heading-xlarge',
    type: 'text'
  },
  headline: {
    selector: '.text-body-medium',
    type: 'text'
  },
  about: {
    selector: '#about ~ .display-flex .display-flex.ph5.pv3 .pv-shared-text-with-see-more',
    type: 'html'
  },
  experience: {
    selector: '#experience ~ .pvs-list__outer-container .pvs-entity',
    type: 'list',
    fields: {
      title: '.t-bold .visually-hidden',
      company: '.t-normal .visually-hidden',
      duration: '.t-normal.t-black--light .visually-hidden',
      description: '.pvs-list__outer-container .visually-hidden'
    }
  },
  education: {
    selector: '#education ~ .pvs-list__outer-container .pvs-entity',
    type: 'list',
    fields: {
      school: '.t-bold .visually-hidden',
      degree: '.t-normal .visually-hidden',
      duration: '.t-normal.t-black--light .visually-hidden'
    }
  },
  skills: {
    selector: '#skills ~ .pvs-list__outer-container .pvs-entity .visually-hidden',
    type: 'list'
  },
  location: {
    selector: '.text-body-small.inline.t-black--light.break-words',
    type: 'text'
  }
};

/**
 * Extracts text content from an element
 * @param {Element} element - DOM element to extract from
 * @returns {string} Extracted text content
 */
function extractText(element) {
  return element ? element.textContent.trim() : '';
}

/**
 * Extracts HTML content and cleans it
 * @param {Element} element - DOM element to extract from
 * @returns {string} Cleaned HTML content
 */
function extractHTML(element) {
  if (!element) return '';
  
  const content = element.innerHTML
    .replace(/<button[^>]*>.*?<\/button>/g, '')
    .replace(/<span class="visually-hidden">/g, '')
    .replace(/<\/span>/g, '')
    .trim();
    
  return cleanHTML(content);
}

/**
 * Extracts a list of items using provided field selectors
 * @param {Element} container - Container element
 * @param {Object} fields - Field selectors
 * @returns {Array} Extracted items
 */
function extractList(container, fields) {
  if (!container) return [];
  
  const items = Array.from(container.querySelectorAll(PROFILE_SELECTORS.experience.selector));
  
  return items.map(item => {
    const result = {};
    
    if (fields) {
      for (const [field, selector] of Object.entries(fields)) {
        const element = item.querySelector(selector);
        result[field] = extractText(element);
      }
    } else {
      result.text = extractText(item);
    }
    
    return result;
  }).filter(item => Object.values(item).some(value => value)); // Filter out empty items
}

/**
 * Cleans HTML content
 * @param {string} html - Raw HTML content
 * @returns {string} Cleaned text
 */
function cleanHTML(html) {
  if (!html) return '';
  
  const temp = document.createElement('div');
  temp.innerHTML = html;

  // Remove unwanted elements
  const unwanted = temp.querySelectorAll('script, style, button');
  unwanted.forEach(el => el.remove());

  // Convert breaks and paragraphs to newlines
  const content = temp.innerHTML
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, ' ') // Remove remaining HTML tags
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return content
    .split(/\n+/)
    .map(line => line.trim())
    .filter(line => line)
    .join('\n');
}

/**
 * Scrapes profile information from the current page
 * @returns {Object} Scraped profile data
 */
function scrapeProfile() {
  console.log('[LinkedIn Scraper] Starting profile scrape...');
  const profile = {};
  
  for (const [section, config] of Object.entries(PROFILE_SELECTORS)) {
    console.log(`[LinkedIn Scraper] Scraping ${section}...`);
    const element = document.querySelector(config.selector);
    
    if (config.type === 'text') {
      profile[section] = extractText(element);
    } else if (config.type === 'html') {
      profile[section] = extractHTML(element);
    } else if (config.type === 'list') {
      profile[section] = extractList(element, config.fields);
    }
    
    console.log(`[LinkedIn Scraper] ${section}:`, profile[section]);
  }
  
  // Add metadata
  profile.url = window.location.href;
  profile.scrapedAt = new Date().toISOString();
  
  return profile;
}

/**
 * Checks if the current page is a LinkedIn profile
 * @returns {boolean} Whether current page is a profile
 */
function isProfilePage() {
  return window.location.href.match(/linkedin\.com\/in\/[^/]+\/?$/i) !== null;
}

export {
  scrapeProfile,
  isProfilePage
}; 