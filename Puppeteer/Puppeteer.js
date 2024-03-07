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
  await page.type('#session_key', 'jeanpaul_mansour@outlook.com');
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

  const allProfiles = []; // Define an array to store profile objects

  // Loop through multiple pages
  for (let currentPage = 1; currentPage <= 10; currentPage++) {
    await page.waitForSelector('.app-aware-link', { timeout: 60000 });
    await autoScroll(page);
  
    // Scrape profile URLs and names from the current page
    const profiles = await page.evaluate(() => {
      const profilesData = [];
      const resultElements = document.querySelectorAll('.app-aware-link');
  
      // Iterate over the result elements to extract URLs and names
      resultElements.forEach(element => {
        const url = element.href;
        if (url.startsWith('https://www.linkedin.com/in/')) {
            const nameElement = element.querySelector('span[dir="ltr"] > span[aria-hidden="true"]');
            if (nameElement) {
            const name = nameElement.innerText.trim();
            profilesData.push({ url, name }); // Push the URL and name into the profilesData array
          }
        }
      });
  
      return profilesData;
    });
  
    allProfiles.push(...profiles);
  
    // Go to the next page if not the last one
    if (currentPage < 10) {
      await Promise.all([
        page.waitForNavigation(),
        page.click('.artdeco-pagination__button--next')
      ]);
    }
  }
  
  // Store the unique profile URLs in a JSON file
  fs.writeFileSync('profiles.json', JSON.stringify(allProfiles, null, 2));
  
  console.log('Profile data stored in profiles.json');
  

  // Close the browser
  await browser.close();
})();
