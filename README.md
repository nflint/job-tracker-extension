
# Job Application Tracker Extension
 
 A Chrome extension that helps you track job applications by scraping job listings and sending them to a webhook of your choice. The extension supports LinkedIn, Indeed, ZipRecruiter, and Greenhouse job boards.
 
 ## Features
 
 - Automatic job detail scraping from supported job sites
 - Custom webhook integration
 - Resume and email storage for automatic submission
 - Job rating system (1-5 stars)
 - Notes field for tracking application details
 - Simple and intuitive popup interface
 - Configuration page for webhook URL and personal details
 
 ## Supported Job Sites
 
 - LinkedIn (`*.linkedin.com/jobs/*`)
 - Indeed (`*.indeed.com/*`)
 - ZipRecruiter (`*.ziprecruiter.com/jobs/*`, `*.ziprecruiter.com/job/*`)
 - Greenhouse (`boards.greenhouse.io/*/jobs/*`)
 
 ## Installation
 
 ### Local Development
 
 1. Clone this repository:
 ```bash
 git clone https://github.com/nflint/job-tracker-extension
 cd job-tracker-extension
 ```
 
 2. Load the extension in Chrome:
    - Open Chrome and navigate to `chrome://extensions/`
    - Enable "Developer mode" in the top right
    - Click "Load unpacked"
    - Select the extension directory
 
 ### Files Structure
 ```
 job-tracker-extension/
 ├── manifest.json
 ├── popup.html
 ├── options.html
 ├── background.js
 ├── content.js
 ├── css/
 │   ├── popup.css
 │   └── options.css
 └── js/
     ├── popup.js
     └── options.js
 ```
 
 ## Configuration
 
 1. Click the extension icon and select "Settings"
 2. Enter your webhook URL (e.g., Zapier webhook) 
 3. Enter your email address - this is only used as an ad-hoc user id
 4. Paste your resume text for job matching - in markdown preferably, its better for ai parsing
 5. Click "Save Settings"
 
 ## Usage
 
 1. Navigate to a supported job listing page
 2. Click the extension icon
 3. Click "Autofill from Page" to scrape job details
 4. Add any notes and select a rating
 5. Click "Save Job" to send to your webhook
 
 ### Keyboard Shortcuts
 - `Ctrl + Enter`: Save job
 - `Ctrl + B`: Autofill from page
 
 ## Webhook Data Format
 
 The extension sends the following data to your webhook:
 
 ```json
 {
   "role": "Job Title",
   "company": "Company Name",
   "link": "Job Listing URL",
   "description": "Full job description",
   "notes": "Your notes",
   "rating": "1-5",
   "timestamp": "ISO timestamp",
   "resume": "Stored resume text",
   "email": "Stored email",
   "source": "Job board domain",
   "browser": "User agent string",
   "scrapeDate": "ISO timestamp"
 }
 ```
 
 ## Development
 
 ### Running Locally
 
 You will need to run this locally. I plan on publishing a version of this to the chrome store at some point but this will probably be with the finished app (when it's finished). Currently it will only work with Zapier (for my initial testing purposes), but you can change that to easily work with any service. In order to do so you will need to update the `manifest.json` around line 15: 
 
 ```json
 "host_permissions": [
    "https://*.linkedin.com/*",
    "https://*.indeed.com/*",
    "https://*.greenhouse.io/*",
    "https://*.ziprecruiter.com/*",
    "https://hooks.zapier.com/*", 
    "https://YOUR.WEBHOOK.com/*"  ///add a line here!
   ],
```
 
 1. Download or clone via git
 
 2. Load in Chrome:
 - Open `chrome://extensions/`
 - Enable Developer Mode
 - Click "Load unpacked"
 - Select the extension directory
 
 ### Testing
 
 1. Navigate to a supported job site
 2. Open Developer Tools (`F12`)
 3. Check the Console for messages prefixed with `[Job Scraper]`
 4. Verify data is being scraped and sent correctly
 
 You can use Zapier for testing - they have a free tier that should be sufficient. 
 
 ### Debugging
 
 If the extension isn't working:
 
 1. Check the console for error messages
 2. Verify you're on a supported job site
 3. Ensure webhook URL is configured
 4. Try refreshing the page
 5. Reload the extension
 
 ## Permissions
 
 The extension requires the following permissions:
 
 - `activeTab`: For accessing the current tab's content
 - `storage`: For saving configuration
 - `scripting`: For injecting content scripts
 - `tabs`: For accessing tab information
 
 ## Host Permissions
 
 More can be added in `manifest.js`
 
 - `https://*.linkedin.com/*`
 - `https://*.indeed.com/*`
 - `https://*.greenhouse.io/*`
 - `https://*.ziprecruiter.com/*`
 - Webhook URL domain
 
 ## Contributing
 
 1. Fork the repository
 2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
 3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
 4. Push to the branch (`git push origin feature/AmazingFeature`)
 5. Open a Pull Request
 
 ## License
 
 This project is licensed under the MIT License - see the LICENSE file for details.
 
 ## Acknowledgments
 
 - Built using Chrome Extensions Manifest V3
 - Uses the chrome.scripting API for content script injection
 - Implements modern async/await patterns for Chrome APIs
 - I was able to create this in 1/3 of the time, with only a vague notion of what I wanted to build thanks to AI!
 
 ## Support
 
 For support, please open an issue in the repository.