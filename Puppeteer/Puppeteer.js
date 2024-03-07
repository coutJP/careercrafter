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

async function scrape(pages) {
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
  for (let currentPage = 2; currentPage <= pages; currentPage++) {
    await page.waitForSelector('.app-aware-link', { timeout: 60000 });
    await autoScroll(page);
  
    // Scrape profile URLs, names, bios, and locations from the current page
    const profiles = await page.evaluate(() => {
      const profilesData = [];
      const resultElements = document.querySelectorAll('.AVvkMmLYlGVJqvYtIJLOZQcCAQmRvUerU');
  
      resultElements.forEach(element => {
        const profileElement = element.querySelector('a');
        const url = profileElement.href;
        if (url.startsWith('https://www.linkedin.com/in/')) {
          const nameElement = element.querySelector('span[dir="ltr"] > span[aria-hidden="true"]');
          const bioElement = element.querySelector('.entity-result__primary-subtitle');
          const locationElement = element.querySelector('.entity-result__secondary-subtitle');
          if (nameElement) {
            const name = nameElement.innerText.trim();
            const bio = bioElement?.textContent.trim(); 
            const location = locationElement?.textContent.trim();
            profilesData.push({ url, name, bio, location }); 
          }
        }
      });
  
      return profilesData;
    });
  
    allProfiles.push(...profiles);
  
    // Go to the next page if not the last one
    if (currentPage < pages) {
      await Promise.all([
        page.waitForNavigation(),
        page.click('.artdeco-pagination__button--next')
      ]);
    }
  }
  
  fs.writeFileSync('profiles.json', JSON.stringify(allProfiles, null, 2));
  
  console.log('Profile data stored in profiles.json');
  


  await browser.close();
}

scrape(10);
