import { test, expect, Page } from '@playwright/test';
import selectors from '../selectors/allSelectors.json';
import fs from 'fs';

// Read search keywords from JSON file
const keywords: string[] = JSON.parse(fs.readFileSync('./selectors/allKeywords.json', 'utf-8')).keywords;

// Define the type for job details
type JobDetail = {
  SearchKeyword: string;
  Designation: string;
  CompanyName: string;
  Location: string;
  JobPostedTime: string;
  NoOfApplicants: string;
  TypeOfApply: string;
  IsWorkday: string;
  Other: string;
};

// Initialize the CSV file with headers
const csvFilePath = './jobDetails_all.csv';
const csvHeader = Object.keys({} as JobDetail).join(',');
fs.writeFileSync(csvFilePath, csvHeader + '\n', 'utf-8');

// Run tests in parallel for each keyword
test.describe.parallel('Search and Save Jobs to CSV', () => {
  for (const keyword of keywords) {
    test(`Search jobs for: ${keyword}`, async ({ browser }) => {
      const context = await browser.newContext({
        storageState: './auth.json',
      });

      const page = await context.newPage();
      await page.goto(selectors.linkedinurl);

      // Search for the keyword
      await page.locator(selectors.searchfield).fill(keyword);
      await page.keyboard.press('Enter');
      await page.locator(selectors.jobsButton).click();

      // Apply filters
      await page.locator(selectors.timeFilter).click();
      await page.locator(selectors['24hours']).click();
      await page.locator(selectors.ApplyFilters).click();
      await page.waitForTimeout(2000);

      // Scroll down to load jobs
      await page.locator(selectors.scrollToPagination).hover();
      for (let i = 0; i < 10; i++) {
        await page.mouse.wheel(0, 500);
        await page.waitForTimeout(1000);
      }

      // Extract job details
      const jobDetails: JobDetail[] = [];
      const allDesignations = await page.$$(selectors.AllDesignations);

      for (const designation of allDesignations) {
        const title = await designation.textContent();

        const job: JobDetail = {
          SearchKeyword: keyword,
          Designation: title?.trim() || 'N/A',
          CompanyName: 'N/A',
          Location: 'N/A',
          JobPostedTime: 'N/A',
          NoOfApplicants: 'N/A',
          TypeOfApply: 'N/A',
          IsWorkday: 'N/A',
          Other: 'N/A',
        };

        await designation.click();
        await page.waitForTimeout(2000);

        // Extract details
        const companyNameElement = await page.$('.job-details-jobs-unified-top-card__company-name a');
        if (companyNameElement) {
          const companyName = await companyNameElement.textContent();
          job.CompanyName = companyName?.trim() || 'N/A';
        }

        const locationElements = await page.$$('(//div[contains(@class,"t-black--light mt2")]/child::span)[1]');
        if (locationElements[0]) {
          const location = await locationElements[0].textContent();
          job.Location = location?.trim() || 'N/A';
        }

        const jobPostedTimeElement = await page.$('.tvm__text.tvm__text--positive strong');
        if (jobPostedTimeElement) {
          const jobPostedTime = await jobPostedTimeElement.textContent();
          job.JobPostedTime = jobPostedTime?.trim() || 'N/A';
        }

        const noOfApplicantsElement = await page.$('(//div[contains(@class,"t-black--light mt2")]/child::span)[5]');
        if (noOfApplicantsElement) {
          const noOfApplicants = await noOfApplicantsElement.textContent();
          job.NoOfApplicants = noOfApplicants?.trim() || 'N/A';
        }

        const applyButton = await page.$('.jobs-apply-button .artdeco-button__text');
        if (applyButton) {
          const applyType = await applyButton.textContent();
          job.TypeOfApply = applyType?.trim() || 'N/A';
        }

        const applyLink = await page.$('.jobs-apply-button');
        if (applyLink) {
          const href = await applyLink.getAttribute('href');
          job.IsWorkday = href?.includes('workday') ? 'Yes' : 'No';
        }

        const jobDescriptionElement = await page.$('.jobs-description-content__text--stretch');
        if (jobDescriptionElement) {
          const jobDescription = await jobDescriptionElement.textContent();
          job.Other = jobDescription?.trim() || 'N/A';
        }

        jobDetails.push(job);
      }

      // Check if jobDetails is not empty before writing to CSV
      if (jobDetails.length > 0) {
        // Convert jobDetails to CSV format
        const csvRows = jobDetails.map((job) =>
          Object.values(job)
            .map((value) => `"${value}"`)
            .join(',')
        );

        // Append job details to the CSV file
        fs.appendFileSync(csvFilePath, csvRows.join('\n') + '\n', 'utf-8');

        console.log(`Job details for "${keyword}" appended to ${csvFilePath}`);
      } else {
        console.log(`No jobs found for keyword: "${keyword}"`);
      }
    });
  }
});