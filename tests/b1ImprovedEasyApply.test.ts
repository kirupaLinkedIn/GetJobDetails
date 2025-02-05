import { test, expect, Page } from '@playwright/test'
import selectors from '../selectors/allSelectors.json'
import fs from 'fs'

// Read search keywords from JSON file
const keywords: string[] = JSON.parse(
  fs.readFileSync('./selectors/allEasyApplyKey.json', 'utf-8')
).keywords

// Initialize applied companies set from file or an empty array
let appliedCompanies: Set<string>
try {
  const appliedJobsData = fs.readFileSync('./appliedCompanies.json', 'utf-8')
  appliedCompanies = new Set(JSON.parse(appliedJobsData))
} catch (error) {
  console.log("No applied companies file or malformed file. Initializing as empty set.")
  appliedCompanies = new Set()
}

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

const easyApplyFilePath = './easy_apply_jobs.csv'
const csvHeader = Object.keys({} as JobDetail).join(',')
fs.writeFileSync(easyApplyFilePath, csvHeader + '\n', 'utf-8')

test.describe.parallel('Improved Automate Easy Apply with 24 hour filter', () => {
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
      await page.locator("//button[normalize-space()='Search']").click()
      await page.waitForTimeout(2000)

      // Handle pagination
      while (true) {
        const nextPageButtons = await page.locator('//ul[contains(@class,"artdeco-pagination")]/li')
        for (let i = 0; i < (await nextPageButtons.count()); i++) {
          const nextPageButton = nextPageButtons.nth(i)
          if (await nextPageButton.isVisible()) {
            await nextPageButton.click()
            await page.waitForTimeout(3000)
            await page.locator(selectors.scrollToPagination).hover()
            for (let i = 0; i < 10; i++) {
              await page.mouse.wheel(0, 500)
              await page.waitForTimeout(1000)
            }

            // Get 25 designations on a page
            const allDesignations = await page.$$(selectors.AllDesignations)

            for (const designation of allDesignations) {
              const title = await designation.textContent()

              // Get company name
              const companyNameElement = await page.$('.job-details-jobs-unified-top-card__company-name a')
              let companyName = ''
              if (companyNameElement) {
                companyName = await companyNameElement.textContent() || 'N/A'
              }

              // Check if the company has already been applied to
              if (appliedCompanies.has(companyName.trim())) {
                console.log(`Already applied for a job at company: ${companyName}`)
                continue  // Skip applying to this job
              }

              // Click on the designation
              await designation.click()
              await page.waitForTimeout(2000)

              const applyButton = await page.$('.jobs-apply-button .artdeco-button__text')
              if (applyButton) {
                const easyApplyButton = await applyButton.textContent()
                console.log(easyApplyButton)
                await applyButton.click()
              }

              // Handle Easy Apply popup
              await handleEasyApplyPopup1(page)

              // Mark this company as applied by adding it to the appliedCompanies set
              appliedCompanies.add(companyName.trim())
              fs.writeFileSync('./appliedCompanies.json', JSON.stringify(Array.from(appliedCompanies), null, 2), 'utf-8')
            }
          } else {
            console.log('No more pages available.')
            break
          }
        }
      }
    })
  }
})


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