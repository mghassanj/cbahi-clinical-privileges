/**
 * Test Data and Fixtures for E2E Tests
 */

export const TEST_USERS = {
  employee: {
    email: 'employee@test.cbahi.sa',
    password: 'test',
    name: 'Test Employee',
    role: 'EMPLOYEE',
  },
  headOfSection: {
    email: 'hos@test.cbahi.sa',
    password: 'test',
    name: 'Head of Section',
    role: 'HEAD_OF_SECTION',
  },
  headOfDept: {
    email: 'hod@test.cbahi.sa',
    password: 'test',
    name: 'Head of Department',
    role: 'HEAD_OF_DEPT',
  },
  committee: {
    email: 'committee@test.cbahi.sa',
    password: 'test',
    name: 'Committee Member',
    role: 'COMMITTEE_MEMBER',
  },
  medicalDirector: {
    email: 'director@test.cbahi.sa',
    password: 'test',
    name: 'Medical Director',
    role: 'MEDICAL_DIRECTOR',
  },
  admin: {
    email: 'admin@test.cbahi.sa',
    password: 'test',
    name: 'System Admin',
    role: 'ADMIN',
  },
  inactive: {
    email: 'inactive@test.cbahi.sa',
    password: 'test',
    name: 'Inactive User',
    role: 'EMPLOYEE',
  },
  nonExistent: {
    email: 'nonexistent@test.cbahi.sa',
    password: 'test',
  },
};

export const TEST_PRIVILEGES = [
  {
    code: 'CORE-001',
    nameEn: 'General Dental Examination',
    category: 'CORE',
  },
  {
    code: 'CORE-002',
    nameEn: 'Dental Prophylaxis',
    category: 'CORE',
  },
  {
    code: 'REST-001',
    nameEn: 'Direct Restorations',
    category: 'RESTORATIVE',
  },
  {
    code: 'ENDO-001',
    nameEn: 'Root Canal Treatment',
    category: 'ENDODONTIC',
  },
];

export const TEST_DEPARTMENTS = [
  {
    nameEn: 'Dental Department',
    nameAr: 'قسم الأسنان',
  },
  {
    nameEn: 'Oral Surgery',
    nameAr: 'جراحة الفم',
  },
];

export const VALIDATION_MESSAGES = {
  en: {
    emailRequired: 'Email is required',
    invalidEmail: 'Invalid email',
    privilegesRequired: 'Select at least one privilege',
    commentsRequired: 'Comments are required',
  },
  ar: {
    emailRequired: 'البريد الإلكتروني مطلوب',
    invalidEmail: 'بريد إلكتروني غير صالح',
    privilegesRequired: 'اختر صلاحية واحدة على الأقل',
    commentsRequired: 'التعليقات مطلوبة',
  },
};

export const REQUEST_STATUSES = {
  DRAFT: 'Draft',
  PENDING: 'Pending',
  IN_REVIEW: 'In Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
};

export const APPROVAL_ACTIONS = {
  APPROVE: 'approve',
  REJECT: 'reject',
  RETURN: 'request_modifications',
};

/**
 * Generate unique test data
 */
export function generateUniqueEmail(): string {
  return `test-${Date.now()}@test.cbahi.sa`;
}

/**
 * Wait helper for async operations
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
