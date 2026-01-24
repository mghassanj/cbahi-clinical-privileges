import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * New Request Page Object for multi-step request wizard
 */
export class NewRequestPage extends BasePage {
  readonly wizardSteps: Locator;
  readonly nextButton: Locator;
  readonly prevButton: Locator;
  readonly saveAsDraftButton: Locator;
  readonly submitButton: Locator;
  readonly cancelButton: Locator;

  // Step 1: Personal Info
  readonly nameField: Locator;
  readonly emailField: Locator;
  readonly departmentField: Locator;

  // Step 2: Application Type
  readonly newApplicationRadio: Locator;
  readonly reapplicationRadio: Locator;
  readonly reapplicationReason: Locator;

  // Step 3: Privileges
  readonly privilegeCheckboxes: Locator;
  readonly selectAllButton: Locator;
  readonly deselectAllButton: Locator;

  // Step 4: Documents
  readonly fileUploadInput: Locator;
  readonly uploadedFilesList: Locator;

  // Step 5: Review
  readonly reviewSummary: Locator;
  readonly confirmCheckbox: Locator;

  constructor(page: Page, locale: 'en' | 'ar' = 'en') {
    super(page, locale);

    // Wizard navigation
    this.wizardSteps = page.locator('[data-testid="wizard-step"], .wizard-step');
    this.nextButton = page.locator('button:has-text("Next"), button:has-text("التالي")');
    this.prevButton = page.locator('button:has-text("Previous"), button:has-text("السابق"), button:has-text("Back")');
    this.saveAsDraftButton = page.locator('button:has-text("Save as Draft"), button:has-text("حفظ كمسودة")');
    this.submitButton = page.locator('button:has-text("Submit"), button:has-text("إرسال")');
    this.cancelButton = page.locator('button:has-text("Cancel"), button:has-text("إلغاء")');

    // Step 1
    this.nameField = page.locator('input[name="name"], [data-testid="name-field"]');
    this.emailField = page.locator('input[name="email"], [data-testid="email-field"]');
    this.departmentField = page.locator('select[name="department"], [data-testid="department-field"]');

    // Step 2
    this.newApplicationRadio = page.locator('input[value="NEW"], [data-testid="new-application"]');
    this.reapplicationRadio = page.locator('input[value="REAPPLICATION"], [data-testid="reapplication"]');
    this.reapplicationReason = page.locator('textarea[name="reapplicationReason"], [data-testid="reapplication-reason"]');

    // Step 3
    this.privilegeCheckboxes = page.locator('[data-testid="privilege-checkbox"], input[type="checkbox"][name*="privilege"]');
    this.selectAllButton = page.locator('button:has-text("Select All"), button:has-text("تحديد الكل")');
    this.deselectAllButton = page.locator('button:has-text("Deselect All"), button:has-text("إلغاء التحديد")');

    // Step 4
    this.fileUploadInput = page.locator('input[type="file"]');
    this.uploadedFilesList = page.locator('[data-testid="uploaded-files"], .uploaded-files');

    // Step 5
    this.reviewSummary = page.locator('[data-testid="review-summary"], .review-summary');
    this.confirmCheckbox = page.locator('input[name="confirm"], [data-testid="confirm-checkbox"]');
  }

  /**
   * Navigate to new request page
   */
  async goto() {
    await this.page.goto(this.getLocalizedUrl('/requests/new'));
    await this.waitForPageLoad();
  }

  /**
   * Get current step number
   */
  async getCurrentStep(): Promise<number> {
    const activeStep = this.wizardSteps.locator('.active, [data-active="true"]');
    const stepText = await activeStep.getAttribute('data-step');
    return parseInt(stepText || '1', 10);
  }

  /**
   * Go to next step
   */
  async goToNextStep() {
    await this.nextButton.click();
    await this.waitForPageLoad();
  }

  /**
   * Go to previous step
   */
  async goToPreviousStep() {
    await this.prevButton.click();
    await this.waitForPageLoad();
  }

  /**
   * Step 1: Verify personal info is pre-filled
   */
  async verifyPersonalInfoPreFilled() {
    // Personal info should be auto-filled from user profile
    const nameValue = await this.nameField.inputValue().catch(() => '');
    expect(nameValue.length).toBeGreaterThan(0);
  }

  /**
   * Step 2: Select application type
   */
  async selectApplicationType(type: 'NEW' | 'REAPPLICATION', reason?: string) {
    if (type === 'NEW') {
      await this.newApplicationRadio.check();
    } else {
      await this.reapplicationRadio.check();
      if (reason) {
        await this.reapplicationReason.fill(reason);
      }
    }
  }

  /**
   * Step 3: Select privileges
   */
  async selectPrivileges(indices: number[]) {
    const checkboxes = await this.privilegeCheckboxes.all();
    for (const index of indices) {
      if (index < checkboxes.length) {
        await checkboxes[index].check();
      }
    }
  }

  /**
   * Step 3: Select all privileges
   */
  async selectAllPrivileges() {
    await this.selectAllButton.click();
  }

  /**
   * Step 4: Upload document
   */
  async uploadDocument(filePath: string) {
    await this.fileUploadInput.setInputFiles(filePath);
    await this.waitForPageLoad();
  }

  /**
   * Step 5: Accept terms and submit
   */
  async acceptAndSubmit() {
    if (await this.confirmCheckbox.isVisible()) {
      await this.confirmCheckbox.check();
    }
    await this.submitButton.click();
  }

  /**
   * Save as draft
   */
  async saveAsDraft() {
    await this.saveAsDraftButton.click();
    await this.waitForPageLoad();
  }

  /**
   * Cancel and go back
   */
  async cancel() {
    await this.cancelButton.click();
  }

  /**
   * Complete full request wizard
   */
  async completeNewRequest(options: {
    type?: 'NEW' | 'REAPPLICATION';
    privilegeIndices?: number[];
    submitImmediately?: boolean;
  } = {}) {
    const { type = 'NEW', privilegeIndices = [0, 1, 2], submitImmediately = true } = options;

    // Step 1: Personal Info (auto-filled, just proceed)
    await this.goToNextStep();

    // Step 2: Application Type
    await this.selectApplicationType(type);
    await this.goToNextStep();

    // Step 3: Select Privileges
    await this.selectPrivileges(privilegeIndices);
    await this.goToNextStep();

    // Step 4: Documents (skip for now)
    await this.goToNextStep();

    // Step 5: Review and Submit
    if (submitImmediately) {
      await this.acceptAndSubmit();
    } else {
      await this.saveAsDraft();
    }
  }

  /**
   * Verify validation error is shown
   */
  async expectValidationError(field: string) {
    const errorMessage = this.page.locator(`[data-testid="${field}-error"], .field-error`);
    await expect(errorMessage).toBeVisible();
  }
}
