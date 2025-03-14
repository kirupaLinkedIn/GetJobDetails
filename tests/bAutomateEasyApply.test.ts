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
  const closeButton = page.locator("(//button[@aria-label='Dismiss'])[1]")

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
    const answers = {
      
        "What is your total experience?": "9 years",
        "What is your current CTC (LPA)?": "26 LPA",
        "How many members you are handling currently as a QA Lead?": "8",
        "Total exp in Selenium?": "8 years",
        "What is your expected CTC (LPA)?": "30 LPA",
        "What is your official Notice Period (0 / 7/ 15 / 20 / 30 / 45 / 60 / 75 / 90) days?": "7 days",
        "Are you currently located in Bangalore?": "yes",
        "Are you sure you are available for Face to Face interview in our Bangalore office (Marathahalli)?": "yes",
        "Total Exp as Automation Test Lead?": "5 years",
        "Do you have experience as QA Automation Lead?": "yes",
        "Do you have experience in QA Automation?": "yes",
        "Do you have experience in team handling and dealing with client?": "yes",
        "Do you have experience in Katelon studio?": "yes",
        "Are you interested in joining this long-term contract role?": "yes",
        "What is your current CTC salary in Lakh Per Annum?": "26 LPA",
        "What is your expected CTC salary in Lakh Per Annum (that will have PF, TDS deductions)?": "30 LPA",
        "How many years of work experience do you have with Regressions, Load, Performance Tests?": "8 years",
        "How many years of work experience do you have with Testing Tools like Zephyr/XRay?": "8 years",
        "What are your annual salary expectations in LPA?": "30 LPA",
        "How many years of experience you have using Provar?": "8 years",
        "How many years of experience you have in Automation Testing?": "8 years",
        "Street address line 1": "123 Main St",
        "City": "Bangalore",
        "State": "Karnataka",
        "I don't wish to answer": "",
        "Your Name": "John Doe",
        "How many years of total experience do you have?": "9 years",
        "How many years of relevant experience do you have?": "8 years",
        "How did you hear about us?": "LinkedIn",
        "If other, please list source:": "",
        "No": "8",
        "Current CTC:": "26 LPA",
        "Expected CTC:": "30 LPA",
        "Notice period:": "7 days",
        "Required Skillset:": "Selenium, Java, TestNG, Automation Testing",
        "Certification (Preferred):": "ISTQB Certified",
        "I Acknowledge": "yes",
        "MY SIGNATURE IS EVIDENCE THAT I HAVE READ AND AGREE WITH THE ABOVE STATEMENTS.": "John Doe",
        "Kindly mention your Notice Period in months. (0.5 for 15 Days)": "0.5 months",
        "Manager wants someone who can join Immediately or within 15-30 days, can you join that soon?": "yes",
        "How many years of work experience do you have with Java Development?": "8 years",
        "How many years of work experience do you have as a Test Lead?": "5 years",
        "Do you have work experience in cutting-edge ERP technology in the pharmaceutical sector?": "no",
        "How many years of work experience do you have in Manual Testing?": "8 years",
        "If yes, who is your current employer?": "Teamware solutions Corp",
        "If yes, please provide their name(s), their relationship to you and department(s) they work in (if known):": "",
        "If yes, please provide a list/details of the potential conflict of interest:": "",
        "How many years of experience do you have as a QA Engineer?": "9 years",
        "What is the duration of your current notice period?": "7 days",
        "What is your expected CTC per annum?": "30 LPA",
        "Years of Experience in Playwright.": "2 years",
        "Current CTC (In LPA)": "26 LPA",
        "Expected CTC (In LPA)": "30 LPA",
        "Notice Period (In days)": "7 days",
        "How many years of work experience do you have with QA Automation?": "8 years",
        "How many years of work experience do you have with Python (Programming Language)?": "3 years",
        "How many years of work experience do you have with Robot Framework?": "2 years",
        "How many years of work experience do you have with Bash?": "3 years",
        "How many years of work experience do you have with NETCONF?": "1 year",
        "Current company": "ABC Corp",
        "What is your current location?": "Bangalore",
        "Are you related to a current DAT employee?": "no",
        "How soon will you be able to join?": "7 days",
        "How many years of work experience do you have with Mobile Testing?": "4 years",
        "What is your overall IT experience?": "9 years",
        "What is your total years of experience in Automation Testing?": "8 years",
        "How soon can you Join us(In Days)?": "7 days",
        "What is your Current Salary?": "26 LPA",
        "What is your Expected Salary?": "30 LPA",
        "How many years of IT Services and IT Consulting experience do you currently have?": "9 years",
        "How Many years of exp do you have as Incentive Compensation & Sales Performance Management Tester?": "1 year",
        "How soon you can join(days)?": "7 days",
        "What is your CTC?": "8",
        "What is your ECTC?": "30 LPA",
        "How many years of work experience do you have with SAP Products?": "2 years",
        "How many years of work experience do you have with SAP Implementation?": "2 years",
        "How many years of work experience do you have with SAP Quality Management (QM)?": "2 years",
        "How many years of work experience do you have with Oracle Database?": "3 years",
        "API Testing": "yes",
        "How many years of experience do you have in Automation testing?": "8 years",
        "How many years of experience in Mobile testing?": "4 years",
        "How many years of experience in Web testing?": "8 years",
        "How many years of work experience do you have with PL/SQL?": "3 years",
        "How many years of work experience do you have with SAP Testing?": "2 years",
        "Do you have experience with UFT (Unified Functional Testing)? This is a mandatory skill.": "yes",
        "How many years of work experience do you have with FIX Protocol?": "1 year",
        "How many years of work experience do you have with Unix or Linux?": "3 years",
        "How many years of Investment Management experience do you currently have?": "1 year",
        "How many years of work experience do you have with Purchase Orders?": "2 years",
        "How many years of work experience do you have with Stock Ledger?": "2 years",
        "How many years of work experience do you have with Test Automation?": "8 years",
        "Are you willing to work from Manyata Tech Park (Bangalore) on a hybrid basis?": "yes",
        "Relevant Experience in Salesforce Testing?": "2 years",
        "Relevant Experience in Manual Testing?": "8 years",
        "How many years of experience into Guidewire Automation Testing?": "1 year",
        "How many years of experience into Java Selenium?": "8 years",
        "How many years of experience into TestNg?": "8 years",
        "Notice Period - LWD - 150225 / In Days 15": "15 days",
        "Relevant experience in Testing with Banking Domain?": "2 years",
        "Mobile phone number": "8",
        "Preferred location": "Bangalore",
        "Years of total experience": "9 years",
        "Years of relevant experience": "8 years",
        "10 Grade %": "85%",
        "12 Grade %": "90%",
        "Highest qualification name": "Bachelor of Technology",
        "What is your Current CTC?": "26 LPA",
        "What is your Expectations of CTC?": "30 LPA",
        "What is you are Notice Period?": "7 days",
        "How many years of experience do you have in Quality Analyst?": "9 years",
        "How many years of work experience do you have with Azure Databricks?": "1 year",
        "How many years of work experience do you have with Java?": "8 years",
        "How many years of work experience do you have with Rest API?": "3 years",
        "How many years of work experience do you have with Pyspark?": "1 year",
        "How many years of work experience do you have with Auditing?": "1 year",
        "Is your notice period higher than 30 days?": "no",
        "How many years of work experience do you have with Global System for Mobile Communications (GSM)?": "1 year",
        "How many years of work experience do you have with Network Switches?": "2 years",
        "How many years of work experience do you have with Test Coverage?": "8 years",
        "How many years of experience do you have in technical content writing?": "2 years",
        "Do you have experience writing code (Python, Java, React, etc) snippets in your work?": "yes",
        "Do you have experience writing kids' content?": "no",
        "How many years of experience do you have in Copywriting and Content Writing role?": "2 years",
        "How many years of work experience do you have with Web Authoring Tools?": "2 years",
        "How many years of work experience do you have with Technical Documentation?": "2 years",
        "Relevant years of experience in Technical Writing?": "2 years",
        "How many years of work experience do you have with Underwriting?": "1 year",
        "How many years of work experience do you have with Mortgage Underwriting?": "1 year",
        "How many years of work experience do you have with Mortgages?": "1 year",
        "First name": "8",
        "How many years of work experience do you have with Quality Engineering?": "9 years",
        "How many years of work experience do you have with Salesforce Sales Cloud?": "2 years",
        "How many years of work experience do you have with JSON?": "3 years",
        "Your Over all IT Experience?": "9 years",
        "How many years of work experience do you have with Mobile Automation?": "8",
        "How many years of work experience do you have in SDET?": "8",
        "How many years of work experience do you have in Automation Testing?": "8",
        "How many years of work experience do you have with Selenium?": "8",
        "How many years of experience do you have in Rest API?": "8",
        "Are you okay to work on 6 months contract?": "8",
        "What is your current job mode (WFH/WFO/Hybrid)?": "8",
        "This position requires mandatory experience at Cypress. Please share share your exact Cypress experience (in years).": "8",
        "Would you be comfortable with Hybrid model (3 days work-from-office: non-negotiable)?\nWould you be comfortable with Hybrid model (3 days work-from-office: non-negotiable)?\n ": "8",
        "What is your notice period": "8",
        "City\nCity": "8",
        "How many years of experience do you have in relation to the duties and responsibilities of this job?\nHow many years of experience do you have in relation to the duties and responsibilities of this job?\n ": "8",
        "How many days is your official notice period? ": "8",
        "City\nCity\n ": "bengaluru",
        "How many years of work experience do you have with IT Industry?": "8",
        "How many years of work experience do you have with Automation Testing?": "8",
        "How many years of work experience do you have with Python?": "8",
        "ow many years of work experience do you have with Playwright?": "8",
        "How many years of work experience do you have with Communication?": "8",
        "How many years of work experience do you have with Tableau?": "8",
        "How many years of work experience do you have with Salesforce.com Administration?": "8",
        "How many years of work experience do you have with SOQL?": "8",
        "How many years of work experience do you have with Records Management?": "8",
        "How many years of work experience do you have with Data Privacy?": "8",
        "How many years of work experience do you have with Project Management?": "8",
        "How many years of work experience do you have with BFSI?": "8",
        "UAT testing": "8",
        "tester": "8",
        "What is your Notice Period?": "8",
        "What is your current CTC?": "8",
        "What are your salary expectations?": "8",
        "Selenium with Java": "8",
        "What is your cctc ?": "8",
        "What is your expected ctc ?": "8",
        "What is your Notice period ?": "8",
        "How many years of work experience do you have with Network Protocols?": "8",
        "What is your level of proficiency in English?\nWhat is your level of proficiency in English?\n ": "8",
        "Are you comfortable with 5-days a week WFO @ Bhartiya City?\nAre you comfortable with 5-days a week WFO @ Bhartiya City?\n ": "8",
        "How many years of work experience do you have with Clinical Trial Management System (CTMS)?": "8",
        "How many years of Health Care Provider experience do you currently have?": "8",
        "How many years of work experience do you have with UI Testing?": "8",
        "Are you comfortable working in a hybrid work mode? The job location is Kalyani Magnum Tech Park, JP Nagara. (3 days WFO) - IF NO, PLEASE DO NOT APPLY\nAre you comfortable working in a hybrid work mode? The job location is Kalyani Magnum Tech Park, JP Nagara. (3 days WFO) - IF NO, PLEASE DO NOT APPLY\n ": "8",
        "You must come face to face for 3rd round of discussion. Apply only if you are willing to visit.\nYou must come face to face for 3rd round of discussion. Apply only if you are willing to visit.\n ": "8",
        "What are you salary expectations?": "8",
        "How many years of work experience do you have with QA Engineering?": "8",
        "What are your salary expectations in LPA?": "8",
        "What is your current CTC (in LPA)?": "8",
        "How many days is your notice period?": "8",
        "How many years of work experience do you have with Agile Environment?": "8",
        "LinkedIn Profile": "8",
        "Website": "8",
        "What is the experience you have with Automation?": "8",
        "What is your current ctc?": "8",
        "What are your expectations?": "8",
        "What is your notice period?": "8",
        "How many years of expereince do you have in QA Engineering?": "8",
        "How many years of expereince do you have in Web3/Blockchain?": "8",
        "Are you comfortable working 6 days on-site?\nAre you comfortable working 6 days on-site?\n ": "8",
        "What is your Notice Period (in days)?": "8",
        "How many years of work experience do you have with Internal Audits?": "8",
        "How many years of work experience do you have with ISO 9001?": "8",
        "Current CTC?": "8",
        "Expected CTC": "8",
        "How many years of work experience do you have with Piping and Instrumentation Drawing (P&ID)?": "8",
        "How many years of work experience do you have with SCADA?": "8",
        "How many years of work experience do you have with Field Instruments?": "8",
        "Please indicate the number of years you have in system test automation in the industry": "8"
      
    }
    for (let i = 0; i < inputCount; i++) {
      const input = allInputFields.nth(i)
      const inputType = await input.getAttribute('type')
      if (inputType === 'file') continue
      const value = await input.inputValue()
      if (!value) {
      const question = await allQuestionsInput.nth(i).innerText()
      if (await page.locator("(//label/span[contains(text(),'City')])[1]").isVisible()) {
        await page.locator("//input[contains(@id,'single-typeahead-entity-form-component')]").fill('Bengaluru, Karnataka, India')
        await page.keyboard.press('ArrowDown')
        await page.keyboard.press('Enter')
      } else if (answers[question]){

          await input.fill(answers[question])
      }else {
        await input.fill('8')
      }
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
