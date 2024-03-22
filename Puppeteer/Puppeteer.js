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




async function scrapeEducation(browser, page, profilesData) {
  const allProfileDetails = [];

  try {
    for (const profile of profilesData) {
      const profileUrl = profile.url.split('?')[0];
      const educationUrl = profileUrl + '/details/education/';
      await page.goto(educationUrl, { timeout: 90000 });
      console.log('educationurl', educationUrl)

      await new Promise(resolve => setTimeout(resolve, 2000));

      const profileDetails = await page.evaluate(() => {
        const educationItems = Array.from(document.querySelectorAll('li.pvs-list__paged-list-item'));
        const educationData = educationItems.map(item => {
          const instituteNameElement = item.querySelector('span[aria-hidden="true"]');
          const majorElement = item.querySelector('.t-14.t-normal > span[aria-hidden="true"]');
          const datesElement = item.querySelector('span.t-14.t-normal > .pvs-entity__caption-wrapper');

          const instituteName = instituteNameElement ? instituteNameElement.textContent.trim() : '';
          const major = majorElement ? majorElement.textContent.trim() : ''; // Check if majorElement exists
          const dates = datesElement ? datesElement.textContent.trim() : '';

          return { instituteName, major, dates };
        }).filter(entry => entry.instituteName && entry.dates); // Filter out entries where instituteName or dates is empty

        return educationData;
      });

      allProfileDetails.push({
        profileUrl: profile.url,
        name: profile.name,
        bio: profile.bio,
        location: profile.location,
        Education: profileDetails
      });

    }
  } catch (error) {
    console.error('Error scraping profiles:', error);
  }

  fs.writeFileSync('profile_details_322.json', JSON.stringify(allProfileDetails, null, 2));
  console.log('Profile details stored in profile_details.json');
}





async function scrape(pages) {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto('https://www.linkedin.com', { timeout: 90000 });

  await page.waitForSelector('#session_key', { timeout: 60000 });
  await page.type('#session_key', 'jeanpaul_mansour@outlook.com');
  await page.waitForSelector('#session_password', { timeout: 60000 });
  await page.type('#session_password', 'Jcmansour#2001');
  await page.waitForSelector('.sign-in-form__submit-btn--full-width', { timeout: 60000 });
  await page.click('.sign-in-form__submit-btn--full-width');
  await page.waitForNavigation();

  await page.goto('https://www.linkedin.com/search/results/people/', { timeout: 90000 });

  await page.waitForSelector('#global-nav-search', { timeout: 9000 });

  await page.click('#global-nav-search');

  await page.waitForSelector('.search-global-typeahead__input', { timeout: 9000 });

  await page.type('.search-global-typeahead__input', 'Saint Joseph University of Beirut');

  await page.keyboard.press('Enter');

  await page.waitForNavigation({ timeout: 9000 });

  const allProfiles = [];

  for (let currentPage = 2; currentPage <= pages; currentPage++) {
    await page.waitForSelector('.app-aware-link', { timeout: 9000 });
    await autoScroll(page);

    const profiles = await page.evaluate(() => {
      const profilesData = [];
      const resultElements = document.querySelectorAll('.UHelMngAnTaGCJmIUDImPjrLaTrheTRhlkzGnVU');

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

    if (currentPage < pages) {
      await Promise.all([
        page.waitForNavigation(),
        page.click('.artdeco-pagination__button--next')
      ]);
    }
  }

  fs.writeFileSync('profiles_322.json', JSON.stringify(allProfiles, null, 2));
  console.log('Profile data stored in profiles.json');

  await scrapeEducation(browser, page, allProfiles);
  await browser.close();
}

scrape(10);
