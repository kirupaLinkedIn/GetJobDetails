import { test, Page } from '@playwright/test'
import * as selector from '../../selectors/allSelectors.json'
import * as fs from 'fs'

//pending works
//1. Handle Pagination
//2. Get the questions and fill if current CTC, Expected CTC and Notice Period
//3. Handle multiple roles
//4. Handle non designed popup


//https://www.linkedin.com/jobs/search/?currentJobId=4084959132&f_AL=true&geoId=105214831&keywords=Automation%20Tester&origin=JOB_SEARCH_PAGE_JOB_FILTER&refresh=true&start=25
//Apply to Simple Energy

const handleEasyApplyPopupForAdvanced = async (page: Page) => {
  const easyJobPopUp = await page.locator("div[role='dialog']")
  if (!(await easyJobPopUp.isVisible())) {
    console.log('Easy Apply popup is not present.')
    return
  }
  console.log('Easy Apply popup is present.')

  const nextButton = page.locator('div[role="dialog"] button:has-text("Next")')
  const reviewButton = page.locator('div[role="dialog"] button:has-text("Review")')
  const submitApplication = page.locator('div[role="dialog"] button:has-text("Submit application")')
  const doneButton = page.locator('div[role="dialog"] button:has-text("Done")')

  const allDropdown = page.locator("div[role='dialog'] select")
  const allInputFields = page.locator("div[role='dialog'] input")
  const allYesRadioButtons = page.locator(
    'div[role="dialog"] input[type="radio"] + label:has-text("Yes"), div[role="dialog"] input[type="radio"] + label:has-text("True")'
  )
  const allQuestionsInput = page.locator("div[role='dialog'] label")

  let filledQuestions: { question: string; value: string }[] = []

  // Load existing questions from JSON file (if exists)
  const fileName = 'filled_questions.json'
  if (fs.existsSync(fileName)) {
    const data = fs.readFileSync(fileName, 'utf-8')
    filledQuestions = JSON.parse(data)
  }

  const handleInputFields = async () => {
    const inputCount = await allInputFields.count()

    for (let i = 0; i < inputCount; i++) {
      const input = allInputFields.nth(i)
      const inputType = await input.getAttribute('type')
      if (inputType === 'file') continue

      const value = await input.inputValue()
      if (!value) {
        const question = await allQuestionsInput.nth(i).innerText()

        // Fill input field and log the action
        await input.fill('8')

        // Store the filled question (including duplicates)
        filledQuestions.push({ question, value: '8' })
      }
    }

    // Save updated list of all filled questions to JSON file
    fs.writeFileSync(fileName, JSON.stringify(filledQuestions, null, 2))
    console.log(`All filled questions saved to ${fileName}`)
  }

  const handleRadioButtons = async () => {
    const radioCount = await allYesRadioButtons.count()
    for (let i = 0; i < radioCount; i++) {
      const radio = allYesRadioButtons.nth(i)
      await radio.click()
    }
  }

  const handleDropdowns = async () => {
    const dropdownCount = await allDropdown.count()
    for (let i = 0; i < dropdownCount; i++) {
      const dropdown = allDropdown.nth(i)
      await dropdown.selectOption({ index: 1 })
    }
  }

  while (true) {
    await handleInputFields()
    await handleRadioButtons()
    await handleDropdowns()

    if (await nextButton.isVisible()) {
      await nextButton.click()
    } else if (await reviewButton.isVisible()) {
      await reviewButton.click()
    } else if (await submitApplication.isVisible()) {
      await submitApplication.click()
      console.log('Waiting for Done button...')
      await doneButton.waitFor({ state: 'visible' })
      await doneButton.click()
      console.log('Done button clicked. Exiting loop...')
      break
    } else if (await doneButton.isVisible()) {
      await doneButton.click()
      console.log('Done button clicked. Exiting loop...')
      break
    } else {
      console.log('No actionable button found.')
      break
    }
  }
}

const listOFJobSearchTitles = ['playwright']

test('Easy Apply Test', async ({ browser }) => {
  // Go to LinkedIn Login page using auth.json
  const context = await browser.newContext({
    storageState: './auth.json',
  })

  const page = await context.newPage()

  const { width, height } = await page.evaluate(() => ({
    width: window.screen.width,
    height: window.screen.height,
  }))

  await page.setViewportSize({ width, height })

  await page.goto('https://www.linkedin.com/feed/')

  //search field for all titles
  await page.locator(selector.searchfield).fill(listOFJobSearchTitles[0])
  await page.keyboard.press('Enter')

  //click on jobs button
  await page.locator(selector.jobsButton).click()

  // Apply filters
  await page
  .locator("//input[@autocomplete='address-level2']")
  .fill('Bengaluru, Karnataka, India');

  await page.keyboard.press("Enter")
  //24 Hours
  await page.locator(selector.timeFilter).click()
  await page.locator(selector['24hours']).click()
  await page.locator(selector.ApplyFilters).click()
  await page.waitForTimeout(2000)

  //Experience Level
  await page.locator(selector.experienceLevel).click()
  await page.locator(selector.associateLevel).click()
  await page.locator(selector.midSeniorLevel).click()
  await page.locator(selector.ApplyFilters2).click()

  //Easy Apply Filter
  await page.locator(selector.EasyApply).click()
  await page.waitForTimeout(2000)

  // Function to process job listings
  const processJobListings = async () => {
    //Scroll slowly to Load all 25 jobs
    await page.locator(selector.scrollToPagination).hover()
    for (let i = 0; i < 10; i++) {
      await page.mouse.wheel(0, 500)
      await page.waitForTimeout(1000)
    }

    // Get all designations and company names
    const allDesignations = page.locator(selector.AllDesignations)
    const allCompanyNames = page.locator(selector.allCompanyNames)

    let uniqueJobs: { [key: string]: string } = {}

    // Read existing uniqueJobs from file if it exists
    if (fs.existsSync('uniqueJobs.json')) {
      const data = fs.readFileSync('uniqueJobs.json', 'utf-8')
      uniqueJobs = JSON.parse(data)
    }

    const count = await allDesignations.count()

    for (let i = 0; i < count; i++) {
      const designation = allDesignations.nth(i)
      const companyName = allCompanyNames.nth(i)

      const companyNameText = await companyName.innerText()

      if (!uniqueJobs[companyNameText]) {
        const designationText = await designation.innerText()
        uniqueJobs[companyNameText] = designationText
        console.log('------------')
        console.log(designationText)
        console.log(companyNameText)
        // Click on the designation
        await designation.click()

        const applyButton = await page.locator(selector.easyApplyBlueButton)
        if (applyButton && (await applyButton.isVisible())) {
          const easyApplyButton = await applyButton.textContent()
          console.log(easyApplyButton)
          await applyButton.click();

          // Write the updated uniqueJobs to a file
          fs.writeFileSync('uniqueJobs.json', JSON.stringify(uniqueJobs, null, 2));
          
          // Function to Handle Easy Apply Popup
          await handleEasyApplyPopupForAdvanced(page)
        } else {
          console.log('Easy Apply button not found, skipping this job.')
        }
      }
    }
  }

  // Process jobs on the first page
  await processJobListings()

  // Handle pagination
  while (true) {
    const nextPageButtons = await page.locator('//ul[contains(@class,"artdeco-pagination")]/li')
    for (let i = 0; i < (await nextPageButtons.count()); i++) {
      const nextPageButton = nextPageButtons.nth(i)
      if (await nextPageButton.isVisible()) {
        console.log("-------------xxxxxxxxxxxxxx");
        await nextPageButton.click()
        await page.waitForTimeout(3000) // Wait for the next page to load
        await processJobListings()
      } else {
        console.log('No more pages available.')
        break
      }
    }
  }


})