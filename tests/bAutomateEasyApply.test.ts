//@ts-nocheck
import { test, expect, Page } from '@playwright/test'
import selectors from '../selectors/allSelectors.json'
import fs from 'fs'

// Read search keywords from JSON file
const keywords: string[] = JSON.parse(
  fs.readFileSync('./selectors/allEasyApplyKey.json', 'utf-8')
).keywords

// Define the type for job details
type JobDetail = {
  SearchKeyword: string
  Designation: string
  CompanyName: string
  Location: string
  JobPostedTime: string
  NoOfApplicants: string
  TypeOfApply: string
  IsWorkday: string
  Other: string
}

// Initialize CSV files with headers
const easyApplyFilePath = './easy_apply_jobs.csv'
const csvHeader = Object.keys({} as JobDetail).join(',')

// Write headers to both CSV files
fs.writeFileSync(easyApplyFilePath, csvHeader + '\n', 'utf-8')

test.describe.parallel('Automate Easy Apply with 24 hour filter', () => {
  for (const keyword of keywords) {
    test(`Search jobs for: ${keyword}`, async ({ browser }) => {
      const context = await browser.newContext({
        storageState: './auth.json',
      })

      const page = await context.newPage()
      await page.goto(selectors.linkedinurl)

      // Search for the keyword
      await page.locator(selectors.searchfield).fill(keyword)
      await page.keyboard.press('Enter')
      await page.locator(selectors.jobsButton).click()

      // Apply filters
      await page.locator(selectors.timeFilter).click()
      await page.locator(selectors['24hours']).click()
      await page.locator(selectors.ApplyFilters).click()
      await page.waitForTimeout(2000)
      await page
        .locator("//input[@autocomplete='address-level2']")
        .fill('Bengaluru, Karnataka, India')
      await page.locator(selectors.EasyApply).click()
      await page.waitForTimeout(2000)
      await page.locator("//button[normalize-space()='Search']").click();
      await page.waitForTimeout(2000)


      // Handle pagination
      while (true) {
        const nextPageButtons = await page.locator('//ul[contains(@class,"artdeco-pagination")]/li')
        for (let i = 0; i < (await nextPageButtons.count()); i++) {
          const nextPageButton = nextPageButtons.nth(i)
          if (await nextPageButton.isVisible()) {
            await nextPageButton.click()
            await page.waitForTimeout(3000) // Wait for the next page to load
            // Scroll down to load jobs
            await page.locator(selectors.scrollToPagination).hover()
            for (let i = 0; i < 10; i++) {
              await page.mouse.wheel(0, 500)
              await page.waitForTimeout(1000)
            }

            // Get 25 designations on a page
            const allDesignations = await page.$$(selectors.AllDesignations)

            for (const designation of allDesignations) {
              const title = await designation.textContent()

              // Click on designation one by one
              await designation.click()
              await page.waitForTimeout(2000)

              const applyButton = await page.$('.jobs-apply-button .artdeco-button__text')

              if (applyButton) {
                const easyApplyButton = await applyButton.textContent()
                console.log(easyApplyButton)
                await applyButton.click();
              // Handle Easy Apply popup
              await handleEasyApplyPopup1(page)
              }


            }
          } else {
            console.log('No more pages available.')
            break
          }
        }
      }
    })
  }
});

async function handleEasyApplyPopup(page: Page) {
  //keypoints
  //1. Validate the popup is present
  //2. If present, then check anyone of the blue buttons is present
  //3. Get the progress bar value
  //3. click on whichever blue button is present
  //4. Get the progress bar value, it should be greater than previous value
  //5. If its the same value , then the dialog is throwing some error due to
  //a. Inputfields is not filled
  //b. radio button is not selected
  //c. Dropdown value is not selected

  //6. First check how many input fields are present, then get the value of the input fields
  //a. if its empty , get the number of input fields and question asked for the input field and print in console
  //b. Now fill the input field with values like 8
  //7. If its a radio button, then click on radio button with value yes or true
  //8. If its dropdown, get the number of dropdowns present in the dialog box
  //a. select the first option present in the dropdown

  //9. After clearing all these errors, click again on the blue buttons whichever is present
  //10. check the progress bar now and it should be increasing
  //11. continue this process untill done button is clicked

  //Note: there might be multiple next button will come after clicking one after other so handle it by checking
  //any of the blue button category is present then click on the corresponding button

  //popup dialog
  const easyJobPopUp = await page.locator("//div[contains(@role,'dialog')]")

  // Blue Buttons
  const nextButton = await page.locator(
    "//div[contains(@role,'dialog')]//following::button[contains(.,'Next')]"
  )
  const reviewButton = await page.locator(
    "//div[contains(@role,'dialog')]//following::button[contains(.,'Review')]"
  )
  const submitApplication = await page.locator(
    "//div[contains(@role,'dialog')]//descendant::button[contains(.,'Submit application')]"
  )
  const doneButton = await page.locator(
    "//div[contains(@role,'dialog')]//descendant::button[contains(.,'Done')]"
  )

  // All Non-filled fields
  const allDropdown = await page.locator("//div[contains(@role,'dialog')]//descendant::select")
  const allInputFields = await page.locator("//div[contains(@role,'dialog')]//descendant::input")
  const allYesRadioButtons = await page.locator(
    "//div[contains(@role,'dialog')]//descendant::div[contains(@data-test-text-selectable-option,'0')]"
  )

  // All questions
  const allQuestionsInput = await page.locator(
    "/div[contains(@role,'dialog')]//descendant::input/preceding-sibling::label"
  )
  const allQuestionsDropdown = await page.locator(
    "/div[contains(@role,'dialog')]//descendant::select/preceding-sibling::label"
  )

  // Progress bar
  const progressBar = await page.locator('.artdeco-completeness-meter-linear__progress-element')
  const progressText = await page.locator('//span[@role="note"]')
}

const handleEasyApplyPopup1 = async (page: Page) => {
  console.log('Checking if Easy Apply popup is present...')
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

  let filledQuestions = []

  const handleInputFields = async () => {
    const inputCount = await allInputFields.count()
    for (let i = 0; i < inputCount; i++) {
      const input = allInputFields.nth(i)
      const inputType = await input.getAttribute('type')
      if (inputType === 'file') continue
      const value = await input.inputValue()
      if (!value) {
        const question = await allQuestionsInput.nth(i).innerText()
        await input.fill('8')
        console.log(`Filled question: "${question}" with value: 8`)
        filledQuestions.push(`Filled question: "${question}" with value: 8`)
      }
    }
  }

  const handleRadioButtons = async () => {
    const radioCount = await allYesRadioButtons.count()
    for (let i = 0; i < radioCount; i++) {
      const radio = allYesRadioButtons.nth(i)
      await radio.click()
      console.log(`Selected radio button: "${await radio.innerText()}"`)
    }
  }

  const handleDropdowns = async () => {
    const dropdownCount = await allDropdown.count()
    for (let i = 0; i < dropdownCount; i++) {
      const dropdown = allDropdown.nth(i)
      await dropdown.selectOption({ index: 1 })
      console.log(`Selected first option in dropdown ${i + 1}`)
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

  fs.appendFileSync('filled_questions.txt', filledQuestions.join('\n'))
  console.log('Filled questions saved to filled_questions.txt')
  console.log('Easy Apply process completed.')
}

test.describe.parallel('Automate Easy Apply without 24 hour filter', () => {
  for (const keyword of keywords) {
    test(`Search jobs for: ${keyword}`, async ({ browser }) => {
      const context = await browser.newContext({
        storageState: './auth.json',
      })

      const page = await context.newPage()
      await page.goto(selectors.linkedinurl)

      // Search for the keyword
      await page.locator(selectors.searchfield).fill(keyword)
      await page.keyboard.press('Enter')
      await page.locator(selectors.jobsButton).click()

      // Apply filters
      // await page.locator(selectors.timeFilter).click();
      // await page.locator(selectors['24hours']).click();
      // await page.locator(selectors.ApplyFilters).click();
      // await page.waitForTimeout(2000);
      await page.locator(selectors.EasyApply).click()
      await page.waitForTimeout(2000)

      // Function to process job listings
      const processJobListings = async () => {
        await page.locator(selectors.scrollToPagination).hover()
        for (let i = 0; i < 10; i++) {
          await page.mouse.wheel(0, 500)
          await page.waitForTimeout(1000)
        }

        // Get all job designations
        const allDesignations = await page.$$(selectors.AllDesignations)

        for (const designation of allDesignations) {
          const title = await designation.textContent()

          // Click on each job listing
          await designation.click()
          await page.waitForTimeout(2000)

          const applyButton = await page.$('.jobs-apply-button .artdeco-button__text')
          if (applyButton) {
            await applyButton.click()
            await handleEasyApplyPopup2(page)
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
  }
})

const handleEasyApplyPopup2 = async (page: Page) => {
  console.log('Checking if Easy Apply popup is present...')
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

  let filledQuestions = []

  const handleInputFields = async () => {
    const inputCount = await allInputFields.count()
    for (let i = 0; i < inputCount; i++) {
      const input = allInputFields.nth(i)
      const inputType = await input.getAttribute('type')
      if (inputType === 'file') continue
      const value = await input.inputValue()
      if (!value) {
        const question = await allQuestionsInput.nth(i).innerText()
        await input.fill('8')
        console.log(`Filled question: "${question}" with value: 8`)
        filledQuestions.push(`Filled question: "${question}" with value: 8`)
      }
    }
  }

  const handleRadioButtons = async () => {
    const radioCount = await allYesRadioButtons.count()
    for (let i = 0; i < radioCount; i++) {
      const radio = allYesRadioButtons.nth(i)
      await radio.click()
      console.log(`Selected radio button: "${await radio.innerText()}"`)
    }
  }

  const handleDropdowns = async () => {
    const dropdownCount = await allDropdown.count()
    for (let i = 0; i < dropdownCount; i++) {
      const dropdown = allDropdown.nth(i)
      await dropdown.selectOption({ index: 1 })
      console.log(`Selected first option in dropdown ${i + 1}`)
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

  fs.appendFileSync('filled_questions.txt', filledQuestions.join('\n'))
  console.log('Filled questions saved to filled_questions.txt')
  console.log('Easy Apply process completed.')
}
