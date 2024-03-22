const puppeteer = require('puppeteer');
const fs = require('fs');

class LinkedInScraper {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async init() {
    this.browser = await puppeteer.launch({ headless: false });
    this.page = await this.browser.newPage();
    await this.page.goto('https://www.linkedin.com', { timeout: 90000 });
    await this.login();
  }

  async login() {
    await this.page.waitForSelector('#session_key', { timeout: 60000 });
    await this.page.type('#session_key', 'jeanpaul_mansour@outlook.com');
    await this.page.waitForSelector('#session_password', { timeout: 60000 });
    await this.page.type('#session_password', 'Jcmansour#2001');
    await this.page.waitForSelector('.sign-in-form__submit-btn--full-width', { timeout: 60000 });
    await this.page.click('.sign-in-form__submit-btn--full-width');
    await this.page.waitForNavigation();
  }

  async search(query) {
    await this.page.goto('https://www.linkedin.com/search/results/people/', { timeout: 90000 });
    await this.page.waitForSelector('#global-nav-search', { timeout: 9000 });
    await this.page.click('#global-nav-search');
    await this.page.waitForSelector('.search-global-typeahead__input', { timeout: 9000 });
    await this.page.type('.search-global-typeahead__input', query);
    await this.page.keyboard.press('Enter');
    await this.page.waitForNavigation({ timeout: 9000 });
  }

  async scrapeProfiles(pages) {
    const allProfiles = [];
    for (let currentPage = 2; currentPage <= pages; currentPage++) {
      await this.page.waitForSelector('.app-aware-link', { timeout: 9000 });
      await this.autoScroll();
      const profiles = await this.page.evaluate(() => {
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
          this.page.waitForNavigation(),
          this.page.click('.artdeco-pagination__button--next')
        ]);
      }
    }
    return allProfiles;
  }

  async autoScroll() {
    await this.page.evaluate(async () => {
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

  async scrapeEducation(profilesData) {
    const allEducationDetails = [];
    try {
      for (const profile of profilesData) {
        const profileUrl = profile.url.split('?')[0];
        const educationUrl = profileUrl + '/details/education/';
        await this.page.goto(educationUrl, { timeout: 90000 });
        await new Promise(resolve => setTimeout(resolve, 2000));
        const educationDetails = await this.page.evaluate(() => {
          const educationItems = Array.from(document.querySelectorAll('li.pvs-list__paged-list-item'));
          const educationData = educationItems.map(item => {
            const instituteNameElement = item.querySelector('span[aria-hidden="true"]');
            const majorElement = item.querySelector('.t-14.t-normal > span[aria-hidden="true"]');
            const datesElement = item.querySelector('span.t-14.t-normal > .pvs-entity__caption-wrapper');
            const instituteName = instituteNameElement ? instituteNameElement.textContent.trim() : '';
            const major = majorElement ? majorElement.textContent.trim() : '';
            const dates = datesElement ? datesElement.textContent.trim() : '';
            return { instituteName, major, dates };
          }).filter(entry => entry.instituteName && entry.dates);
          return educationData;
        });
        allEducationDetails.push({
          profileUrl: profile.url,
          name: profile.name,
          bio: profile.bio,
          location: profile.location,
          Education: educationDetails
        });
      }
    } catch (error) {
      console.error('Error scraping education details:', error);
    }
    fs.writeFileSync('profile_details_322.json', JSON.stringify(allEducationDetails, null, 2));
    console.log('Profile details stored in profile_details.json');
  }

  async scrapeExperience(profilesData) {
    const allExperienceDetails = [];
    try {
      for (const profile of profilesData) {
        const profileUrl = profile.url.split('?')[0];
        const experienceUrl = profileUrl + '/details/experience/';
        await this.page.goto(experienceUrl, { timeout: 90000 });
        await new Promise(resolve => setTimeout(resolve, 2000));
        const experienceDetails = await this.page.evaluate(() => {
          const experienceItems = Array.from(document.querySelectorAll('li.pvs-list__paged-list-item'));
          const experienceData = experienceItems.map(item => {
            const positionElement = item.querySelector('span[aria-hidden="true"]');
            const companyElement = item.querySelector('.t-14.t-normal > span[aria-hidden="true"]');
            const datesElement = item.querySelector('span.t-14.t-normal > .pvs-entity__caption-wrapper');
            const position = positionElement ? positionElement.textContent.trim() : '';
            const company = companyElement ? companyElement.textContent.trim() : '';
            const dates = datesElement ? datesElement.textContent.trim() : '';
            return { position, company, dates };
          }).filter(entry => entry.position && entry.dates);
          return experienceData;
        });
        allExperienceDetails.push({
          profileUrl: profile.url,
          name: profile.name,
          bio: profile.bio,
          location: profile.location,
          Experience: experienceDetails
        });
      }
    } catch (error) {
      console.error('Error scraping experience details:', error);
    }
    fs.writeFileSync('profile_experience_322.json', JSON.stringify(allExperienceDetails, null, 2));
    console.log('Profile experience stored in profile_experience_322.json');
  }

  async scrapeData(pages, query) {
    try {
      await this.init();
      await this.search(query);
      const allProfiles = await this.scrapeProfiles(pages);
      await this.scrapeEducation(allProfiles);
      await this.scrapeExperience(allProfiles);
    } catch (error) {
      console.error('Error during scraping:', error);
    } finally {
      await this.browser.close();
    }
  }
}




(async () => {
  const scraper = new LinkedInScraper();
  await scraper.scrapeData(2, 'Saint Joseph University of Beirut');
})();

