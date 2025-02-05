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
  ApplyURL: string;
  Other: string;
};

// Initialize CSV files with headers if they are empty
const easyApplyFilePath = './easy_apply_jobs.csv';
const applyFilePath = './apply_jobs.csv';
const csvHeader = Object.keys({} as JobDetail).join(',');

const ensureCSVHeader = (filePath: string) => {
  if (!fs.existsSync(filePath) || fs.readFileSync(filePath, 'utf-8').trim() === '') {
    fs.writeFileSync(filePath, csvHeader + '\n', 'utf-8');
  }
};
ensureCSVHeader(easyApplyFilePath);
ensureCSVHeader(applyFilePath);

// Function to extract job details from a single page
const extractJobDetails = async (page: Page, keyword: string, context) => {
  const easyApplyJobs: JobDetail[] = [];
  const applyJobs: JobDetail[] = [];
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
      ApplyURL: 'N/A',
      Other: 'N/A',
    };

    await designation.click();
    await page.waitForTimeout(2000);

    // Extract details
    const companyNameElement = await page.$('.job-details-jobs-unified-top-card__company-name a');
    if (companyNameElement) {
      job.CompanyName = (await companyNameElement.textContent())?.trim() || 'N/A';
    }

    const locationElement = await page.$('(//div[contains(@class,"t-black--light mt2")]/child::span)[1]');
    if (locationElement) {
      job.Location = (await locationElement.textContent())?.trim() || 'N/A';
    }

    const jobPostedTimeElement = await page.$('.tvm__text.tvm__text--positive strong');
    if (jobPostedTimeElement) {
      job.JobPostedTime = (await jobPostedTimeElement.textContent())?.trim() || 'N/A';
    }

    const noOfApplicantsElement = await page.$('(//div[contains(@class,"t-black--light mt2")]/child::span)[5]');
    if (noOfApplicantsElement) {
      job.NoOfApplicants = (await noOfApplicantsElement.textContent())?.trim() || 'N/A';
    }

    const applyButton = await page.$('.jobs-apply-button .artdeco-button__text');
    if (applyButton) {
      job.TypeOfApply = (await applyButton.textContent())?.trim() || 'N/A';
    }

    // Get the apply button text
    const applyButtonText = applyButton ? (await applyButton.textContent())?.trim().toLowerCase() : '';

    if (!applyButtonText.includes('easy apply')) {
    const applyLink = await page.$('.jobs-apply-button');
    if (applyLink) {
        console.log("Clicking apply button...");
        const existingPages = context.pages();
        await applyLink.click();

        try {
        console.log("Waiting for new tab...");
        const newPage = await context.waitForEvent('page', { timeout: 5000 });
        await newPage.waitForLoadState();
        job.ApplyURL = newPage.url();
        console.log("New tab URL:", job.ApplyURL);
        await newPage.close();
        } catch (error) {
        console.log("No new tab opened within timeout.");
        }
    }
    } else {
    console.log("Skipping Easy Apply job...");
    }


    const jobDescriptionElement = await page.$('.jobs-description-content__text--stretch');
    if (jobDescriptionElement) {
      job.Other = (await jobDescriptionElement.textContent())?.trim() || 'N/A';
    }

    // Categorize jobs based on TypeOfApply
    if (job.TypeOfApply.toLowerCase().includes('easy apply')) {
      easyApplyJobs.push(job);
    } else {
      applyJobs.push(job);
    }
  }

  return { easyApplyJobs, applyJobs };
};

// Function to write jobs to CSV
const writeJobsToCSV = (filePath: string, jobs: JobDetail[]) => {
  if (jobs.length > 0) {
    const csvRows = jobs.map((job) =>
      Object.values(job)
        .map((value) => `"${value}"`)
        .join(',')
    );
    fs.appendFileSync(filePath, csvRows.join('\n') + '\n', 'utf-8');
  }
};

// Run tests in parallel for each keyword
test.describe.parallel('Get All workday Jobs', () => {
  for (const keyword of keywords) {
    test(`Search jobs for: ${keyword}`, async ({ browser }) => {
      const context = await browser.newContext({
        storageState: './auth.json',
      });

      const page = await context.newPage();
      await page.goto(selectors.linkedinurl);

      console.log(`Searching jobs for: ${keyword}`);
      await page.locator(selectors.searchfield).fill(keyword);
      await page.keyboard.press('Enter');
      await page.locator(selectors.jobsButton).click();

      // Apply filters
      await page.locator(selectors.timeFilter).click();
      await page.locator(selectors['24hours']).click();
      await page.locator(selectors.ApplyFilters).click();
      await page.waitForTimeout(2000);

      // Get the total number of pages
      const paginationItems = await page.$$('//ul[contains(@class,"artdeco-pagination")]/li');
      const totalPages = paginationItems.length - 2;

      for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
        console.log(`Processing page ${pageNumber} of ${totalPages} for keyword "${keyword}"`);
        await page.locator(selectors.scrollToPagination).hover();
        for (let i = 0; i < 10; i++) {
          await page.mouse.wheel(0, 500);
          await page.waitForTimeout(1000);
        }

        const { easyApplyJobs, applyJobs } = await extractJobDetails(page, keyword, context);
        writeJobsToCSV(easyApplyFilePath, easyApplyJobs);
        writeJobsToCSV(applyFilePath, applyJobs);
      }
      console.log(`Job details for "${keyword}" categorized and saved.`);
    });
  }
});
