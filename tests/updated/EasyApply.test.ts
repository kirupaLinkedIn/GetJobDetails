import { test, Page } from '@playwright/test';
import * as selector from '../../selectors/allSelectors.json';
import * as fs from 'fs';

let page

// Function to handle the Easy Apply popup
const handleEasyApplyPopupForAdvanced = async (page: Page) => {
  const easyJobPopUp = await page.locator("div[role='dialog']");
  if (!(await easyJobPopUp.isVisible())) {
    console.log('Easy Apply popup is not present.');
    return;
  }
  console.log('Easy Apply popup is present.');

  const nextButton = page.locator('div[role="dialog"] button:has-text("Next")');
  const reviewButton = page.locator('div[role="dialog"] button:has-text("Review")');
  const submitApplication = page.locator('div[role="dialog"] button:has-text("Submit application")');
  const doneButton = page.locator('div[role="dialog"] button:has-text("Done")');

  const allDropdown = page.locator("div[role='dialog'] select");
  const allInputFields = page.locator("div[role='dialog'] input");
  const allYesRadioButtons = page.locator(
    'div[role="dialog"] input[type="radio"] + label:has-text("Yes"), div[role="dialog"] input[type="radio"] + label:has-text("True")'
  );
  const allQuestionsInput = page.locator("div[role='dialog'] label");

  let filledQuestions: { question: string; value: string }[] = [];

  const fileName = 'filled_questions.json';
  if (fs.existsSync(fileName)) {
    const data = fs.readFileSync(fileName, 'utf-8');
    filledQuestions = JSON.parse(data);
  }

  const handleInputFields = async () => {
    const inputCount = await allInputFields.count();
    for (let i = 0; i < inputCount; i++) {
      const input = allInputFields.nth(i);
      const inputType = await input.getAttribute('type');
      if (inputType === 'file') continue;

      const value = await input.inputValue();
      if (!value) {
        const question = await allQuestionsInput.nth(i).innerText();
        await input.fill('8');
        filledQuestions.push({ question, value: '8' });
      }
    }
    fs.writeFileSync(fileName, JSON.stringify(filledQuestions, null, 2));
    console.log(`All filled questions saved to ${fileName}`);
  };

  const handleRadioButtons = async () => {
    const radioCount = await allYesRadioButtons.count();
    for (let i = 0; i < radioCount; i++) {
      await allYesRadioButtons.nth(i).click();
    }
  };

  const handleDropdowns = async () => {
    const dropdownCount = await allDropdown.count();
    for (let i = 0; i < dropdownCount; i++) {
      await allDropdown.nth(i).selectOption({ index: 1 });
    }
  };

  while (true) {
    await handleInputFields();
    await handleRadioButtons();
    await handleDropdowns();

    if (await nextButton.isVisible()) {
      await nextButton.click();
    } else if (await reviewButton.isVisible()) {
      await reviewButton.click();
    } else if (await submitApplication.isVisible()) {
      await submitApplication.click();
      console.log('Waiting for Done button...');
      await doneButton.waitFor({ state: 'visible' });
      await doneButton.click();
      console.log('Application submitted.');
      break;
    } else if (await doneButton.isVisible()) {
      await doneButton.click();
      console.log('Done button clicked.');
      break;
    } else {
      console.log('No actionable button found.');
      break;
    }
  }
};

const processJobListings = async () => {
  await page.locator(selector.scrollToPagination).hover();
  for (let i = 0; i < 10; i++) {
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(1000);
  }

  const allDesignations = page.locator(selector.AllDesignations);
  const allCompanyNames = page.locator(selector.allCompanyNames);

  let uniqueJobs: { [key: string]: string } = {};

  if (fs.existsSync('uniqueJobs.json')) {
    const data = fs.readFileSync('uniqueJobs.json', 'utf-8');
    uniqueJobs = JSON.parse(data);
  }

  const count = await allDesignations.count();
  for (let i = 0; i < count; i++) {
    const designation = allDesignations.nth(i);
    const companyName = allCompanyNames.nth(i);

    const companyNameText = await companyName.innerText();

    if (!uniqueJobs[companyNameText]) {
      const designationText = await designation.innerText();
      uniqueJobs[companyNameText] = designationText;
      console.log(`Applying for: ${designationText} at ${companyNameText}`);

      await designation.click();
      const applyButton = page.locator(selector.easyApplyBlueButton);
      if (applyButton && (await applyButton.isVisible())) {
        await applyButton.click();
        fs.writeFileSync('uniqueJobs.json', JSON.stringify(uniqueJobs, null, 2));
        await handleEasyApplyPopupForAdvanced(page);
      } else {
        console.log('Easy Apply button not found, skipping.');
      }
    }
  }
};


// List of job titles to search
const listOFJobSearchTitles = ['qa lead'];

test('Easy Apply Test for multiple job titles', async ({ browser }) => {
  const context = await browser.newContext({
    storageState: './auth.json',
  });

  page = await context.newPage();
  await page.goto('https://www.linkedin.com/feed/');

  for (const jobTitle of listOFJobSearchTitles) {
    console.log(`\n\n=== Searching for jobs: ${jobTitle} ===`);

    await page.locator(selector.searchfield).fill(jobTitle);
    await page.keyboard.press('Enter');

    await page.locator(selector.jobsButton).click();

    await page.locator(selector.timeFilter).click();
    await page.locator(selector['24hours']).click();
    await page.locator(selector.ApplyFilters).click();
    await page.waitForTimeout(2000);

    await page.locator(selector.experienceLevel).click();
    await page.locator(selector.associateLevel).click();
    await page.locator(selector.midSeniorLevel).click();
    await page.locator(selector.ApplyFilters2).click();

    await page.locator("//input[@autocomplete='address-level2']").fill('Bengaluru, Karnataka, India');
    await page.keyboard.press("Enter");

    await page.locator(selector.EasyApply).click();
    await page.waitForTimeout(2000);



      const nextPageButtons = await page.locator('//ul[contains(@class,"artdeco-pagination")]/li');

      for (let i = 0; i < (await nextPageButtons.count()); i++) {
        const nextPageButton = nextPageButtons.nth(i);
        if (await nextPageButton.isVisible()) {
          await nextPageButton.click();
          await page.waitForTimeout(3000);
          await processJobListings();
        }
      }
  }
});
