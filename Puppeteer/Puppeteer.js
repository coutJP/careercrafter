const puppeteer = require('puppeteer');
const fs = require('fs');

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve, reject) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto('https://www.linkedin.com', { timeout: 90000 });

  // Login
  await page.waitForSelector('#session_key', { timeout: 60000 }); // Increased timeout
  await page.type('#session_key', 'Jeanpaul_mansour@outlook.com');
  await page.waitForSelector('#session_password', { timeout: 60000 }); // Increased timeout
  await page.type('#session_password', 'Jcmansour#2001');
  await page.waitForSelector('.sign-in-form__submit-btn--full-width', { timeout: 60000 }); // Increased timeout
  await page.click('.sign-in-form__submit-btn--full-width');
  await page.waitForNavigation();

  // Navigate to search page
  await page.goto('https://www.linkedin.com/search/results/people/', { timeout: 90000 });

  // Wait for the search button to appear
  await page.waitForSelector('#global-nav-search', { timeout: 60000 });

  // Click the search button
  await page.click('#global-nav-search');

  // Wait for the search input field to appear
  await page.waitForSelector('.search-global-typeahead__input', { timeout: 60000 });

  // Type the search query
  await page.type('.search-global-typeahead__input', 'Saint Joseph University of Beirut');

  // Press enter to perform the search
  await page.keyboard.press('Enter');

  // Wait for the navigation to complete
  await page.waitForNavigation({ timeout: 60000 });

  const allProfileURLs = [];

  // Loop through multiple pages
  for (let currentPage = 1; currentPage <= 3; currentPage++) { // Modify the end page number as needed
    await page.waitForSelector('.app-aware-link', { timeout: 60000 });

    // Scroll to load more profiles
    await autoScroll(page);

    // Scrape profile URLs from the current page
    const profileURLs = await page.evaluate(() => {
      const urls = [];
      const resultElements = document.querySelectorAll('.app-aware-link');
      for (const element of resultElements) {
        const url = element.href;
        if (url.startsWith('https://www.linkedin.com/in/') && !urls.includes(url)) {
          urls.push(url);
        }
      }
      return urls;
    });

    allProfileURLs.push(...profileURLs);

    // Go to the next page if not the last one
    if (currentPage < 3) { // Modify the end page number as needed
      await Promise.all([
        page.waitForNavigation(),
        page.click('.artdeco-pagination__button--next')
      ]);
    }
  }

  // Store the unique profile URLs in a JSON file
  const uniqueProfileURLs = Array.from(new Set(allProfileURLs)); // Remove duplicates
  fs.writeFileSync('profile_urls.json', JSON.stringify(uniqueProfileURLs, null, 2));

  console.log('Unique profile URLs stored in profile_urls.json');

  // Close the browser
  await browser.close();
})();
