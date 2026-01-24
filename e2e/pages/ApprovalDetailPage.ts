import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Approval Detail Page Object for processing approvals
 */
export class ApprovalDetailPage extends BasePage {
  readonly applicantInfo: Locator;
  readonly privilegesList: Locator;
  readonly privilegeCheckboxes: Locator;
  readonly approveButton: Locator;
  readonly rejectButton: Locator;
  readonly returnButton: Locator;
  readonly approveAllButton: Locator;
  readonly rejectAllButton: Locator;
  readonly commentsInput: Locator;
  readonly signatureCanvas: Locator;
  readonly submitDecisionButton: Locator;
  readonly attachmentsList: Locator;
  readonly approvalHistory: Locator;
  readonly confirmDialog: Locator;
  readonly confirmYesButton: Locator;
  readonly confirmNoButton: Locator;

  constructor(page: Page, locale: 'en' | 'ar' = 'en') {
    super(page, locale);
    this.applicantInfo = page.locator('[data-testid="applicant-info"], .applicant-section');
    this.privilegesList = page.locator('[data-testid="privileges-list"], .privileges-section');
    this.privilegeCheckboxes = page.locator('[data-testid="privilege-decision"], input[name*="privilege"]');
    this.approveButton = page.locator('button:has-text("Approve"), button:has-text("موافقة")');
    this.rejectButton = page.locator('button:has-text("Reject"), button:has-text("رفض")');
    this.returnButton = page.locator('button:has-text("Return"), button:has-text("Request Modifications"), button:has-text("إرجاع")');
    this.approveAllButton = page.locator('button:has-text("Approve All"), button:has-text("موافقة الكل")');
    this.rejectAllButton = page.locator('button:has-text("Reject All"), button:has-text("رفض الكل")');
    this.commentsInput = page.locator('textarea[name="comments"], [data-testid="comments-input"]');
    this.signatureCanvas = page.locator('canvas[data-testid="signature"], .signature-pad');
    this.submitDecisionButton = page.locator('button[type="submit"], button:has-text("Submit Decision")');
    this.attachmentsList = page.locator('[data-testid="attachments"], .attachments-section');
    this.approvalHistory = page.locator('[data-testid="approval-history"], .history-section');
    this.confirmDialog = page.locator('[data-testid="confirm-dialog"], [role="dialog"]');
    this.confirmYesButton = page.locator('button:has-text("Yes"), button:has-text("نعم"), button:has-text("Confirm")');
    this.confirmNoButton = page.locator('button:has-text("No"), button:has-text("لا"), button:has-text("Cancel")');
  }

  /**
   * Navigate to specific approval
   */
  async goto(approvalId: string) {
    await this.page.goto(this.getLocalizedUrl(`/approvals/${approvalId}`));
    await this.waitForPageLoad();
  }

  /**
   * Verify approval detail page is displayed
   */
  async expectApprovalDetailPage() {
    await expect(this.applicantInfo).toBeVisible();
    await expect(this.privilegesList).toBeVisible();
  }

  /**
   * Get applicant name
   */
  async getApplicantName(): Promise<string> {
    const nameElement = this.applicantInfo.locator('h2, .applicant-name').first();
    return await nameElement.textContent() || '';
  }

  /**
   * Get number of privileges to review
   */
  async getPrivilegesCount(): Promise<number> {
    return await this.privilegeCheckboxes.count();
  }

  /**
   * Approve specific privileges by index
   */
  async approvePrivileges(indices: number[]) {
    const checkboxes = await this.privilegeCheckboxes.all();
    for (const index of indices) {
      if (index < checkboxes.length) {
        await checkboxes[index].check();
      }
    }
  }

  /**
   * Approve all privileges
   */
  async approveAllPrivileges() {
    await this.approveAllButton.click();
  }

  /**
   * Reject all privileges
   */
  async rejectAllPrivileges() {
    await this.rejectAllButton.click();
  }

  /**
   * Add comments
   */
  async addComments(comments: string) {
    await this.commentsInput.fill(comments);
  }

  /**
   * Approve the request
   */
  async approve(comments?: string) {
    if (comments) {
      await this.addComments(comments);
    }
    await this.approveButton.click();

    // Handle confirmation dialog if present
    if (await this.confirmDialog.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.confirmYesButton.click();
    }

    await this.waitForPageLoad();
  }

  /**
   * Reject the request
   */
  async reject(comments: string) {
    await this.addComments(comments);
    await this.rejectButton.click();

    // Handle confirmation dialog if present
    if (await this.confirmDialog.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.confirmYesButton.click();
    }

    await this.waitForPageLoad();
  }

  /**
   * Return request for modifications
   */
  async returnForModifications(comments: string) {
    await this.addComments(comments);
    await this.returnButton.click();

    // Handle confirmation dialog if present
    if (await this.confirmDialog.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.confirmYesButton.click();
    }

    await this.waitForPageLoad();
  }

  /**
   * View attached documents
   */
  async viewAttachment(index: number) {
    const attachments = this.attachmentsList.locator('a, button');
    await attachments.nth(index).click();
  }

  /**
   * Check if signature is required
   */
  async isSignatureRequired(): Promise<boolean> {
    return await this.signatureCanvas.isVisible();
  }

  /**
   * Verify success message after decision
   */
  async expectDecisionSuccess() {
    await this.expectSuccessMessage();
    // Should redirect back to approvals list or show success
    const onListPage = await this.page.url().includes('/approvals') && !this.page.url().match(/\/approvals\/[^/]+$/);
    const hasSuccessMessage = await this.successToast.isVisible().catch(() => false);
    expect(onListPage || hasSuccessMessage).toBe(true);
  }
}
