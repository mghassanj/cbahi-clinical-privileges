# 🧪 CBAHI Clinical Privileges - Comprehensive Testing Plan

**App URL:** https://cbahi-web-production.up.railway.app/  
**Purpose:** Clinical Privileges Management System  
**Created:** 2026-01-28

---

## 📋 Executive Summary

This plan covers all testing scenarios for the CBAHI Clinical Privileges Management System, ensuring:
- All user journeys work correctly
- Multi-level approval workflows function properly
- Role-based access control is enforced
- The app is accessible and performant

---

## 🎭 User Roles & Permissions

| Role | Can Create Requests | Can Approve | Admin Access |
|------|---------------------|-------------|--------------|
| EMPLOYEE | ✅ | ❌ | ❌ |
| HEAD_OF_SECTION | ✅ | Level 1 | ❌ |
| HEAD_OF_DEPT | ✅ | Level 2 | ❌ |
| COMMITTEE_MEMBER | ❌ | Level 3 | ❌ |
| MEDICAL_DIRECTOR | ❌ | Level 4 (Final) | ❌ |
| ADMIN | ✅ | All | ✅ |

---

## 🔥 Test Categories

### 1. Smoke Tests (Quick Sanity - 2 min)
- [ ] App loads without errors
- [ ] Login page displays correctly
- [ ] Arabic/English toggle works
- [ ] API health endpoint responds

### 2. Authentication Tests (12 tests)
- [ ] Login form displays correctly
- [ ] Email validation (empty, invalid format)
- [ ] Magic link request flow
- [ ] Test credentials login (if TESTING_MODE)
- [ ] Role-based redirect after login
- [ ] Logout flow
- [ ] Session expiry handling
- [ ] Protected route redirect
- [ ] Language persistence
- [ ] Error page for invalid users
- [ ] Error page for inactive users
- [ ] Password reset flow

### 3. Request Workflow Tests (20 tests)

#### 3.1 Request List
- [ ] Requests page loads
- [ ] Empty state displays correctly
- [ ] Request count shows correctly
- [ ] Filter by status (DRAFT, PENDING, APPROVED, etc.)
- [ ] Search functionality
- [ ] Pagination works

#### 3.2 Create New Request (Wizard)
- [ ] Wizard displays with correct steps
- [ ] Personal info pre-filled from profile
- [ ] Privilege selection works
- [ ] Document upload (single/multiple)
- [ ] Document type selection
- [ ] Save as draft
- [ ] Submit request
- [ ] Validation errors display
- [ ] Navigation between steps
- [ ] Cancel/discard flow

#### 3.3 Request Details
- [ ] View request details
- [ ] See approval chain timeline
- [ ] Download uploaded documents
- [ ] Edit draft request
- [ ] Cancel pending request

### 4. Approval Workflow Tests (25 tests)

#### 4.1 Approvals List
- [ ] Approvals page loads (for approvers only)
- [ ] Table view displays correctly
- [ ] Kanban view displays correctly
- [ ] View toggle works
- [ ] Filter by status
- [ ] Escalation indicators show
- [ ] Count badges accurate

#### 4.2 Approval Actions
- [ ] View approval details
- [ ] Approve request (with comments)
- [ ] Reject request (requires reason)
- [ ] Return request (request changes)
- [ ] Delegate approval
- [ ] Bulk approval (if applicable)

#### 4.3 Multi-Level Workflow
- [ ] Level 1 → Level 2 progression
- [ ] Level 2 → Level 3 progression
- [ ] Level 3 → Level 4 progression
- [ ] Final approval generates certificate
- [ ] Rejection at any level notifies applicant
- [ ] Return at any level notifies applicant

#### 4.4 Escalation
- [ ] Level 1 escalation after 3 days
- [ ] Level 2 escalation after 5 days
- [ ] Level 3 escalation after 7 days
- [ ] Escalation banner displays
- [ ] Escalation notifications sent

### 5. Admin Tests (16 tests)

#### 5.1 Admin Dashboard
- [ ] Admin page accessible (admin only)
- [ ] Dashboard statistics display
- [ ] Quick actions work

#### 5.2 User Management
- [ ] Users list displays
- [ ] Search users
- [ ] View user details
- [ ] Update user status (active/inactive)
- [ ] Assign user role
- [ ] Sync users from Jisr

#### 5.3 Privileges Management
- [ ] Privileges list displays
- [ ] Create new privilege
- [ ] Edit privilege
- [ ] Deactivate privilege
- [ ] Category management

#### 5.4 Settings
- [ ] View settings
- [ ] Update email settings
- [ ] Update escalation thresholds
- [ ] Test email configuration

### 6. Access Control Tests (10 tests)
- [ ] Employee cannot access /admin
- [ ] Employee cannot access /approvals
- [ ] Approver can access own level approvals only
- [ ] Committee cannot create requests
- [ ] Admin has full access
- [ ] API endpoints enforce roles
- [ ] Cannot approve own request
- [ ] Cannot edit submitted request
- [ ] Cannot delete approved request
- [ ] Cross-tenant isolation

### 7. Accessibility Tests (WCAG 2.1 AA)
- [ ] Keyboard navigation
- [ ] Screen reader compatibility
- [ ] Color contrast ratios
- [ ] Focus indicators
- [ ] Form labels
- [ ] Error announcements
- [ ] Skip navigation link
- [ ] Responsive design

### 8. Performance Tests
- [ ] Page load < 3 seconds
- [ ] Time to Interactive < 5 seconds
- [ ] API response < 500ms
- [ ] Image optimization
- [ ] Bundle size check
- [ ] Database query performance

### 9. Localization Tests (Arabic/English)
- [ ] All text translates correctly
- [ ] RTL layout for Arabic
- [ ] Date format localization
- [ ] Number format localization
- [ ] Form validation messages
- [ ] Error messages

### 10. API Tests
- [ ] GET /api/health
- [ ] POST /api/auth (login)
- [ ] GET /api/requests
- [ ] POST /api/requests
- [ ] GET /api/requests/:id
- [ ] POST /api/requests/:id/submit
- [ ] GET /api/approvals
- [ ] POST /api/approvals/:id (approve/reject)
- [ ] GET /api/admin/users
- [ ] POST /api/sync

---

## 🚀 Test Execution Order

### Phase 1: Smoke Tests (First)
Quick validation that the app is deployable and running.

### Phase 2: Critical Path Tests
1. Login as Employee → Create Request → Submit
2. Login as HOS → View Approval → Approve
3. Login as Admin → Manage Users

### Phase 3: Full Regression
All tests in all categories.

### Phase 4: Edge Cases & Negative Tests
Error handling, boundary conditions, security.

---

## 📊 Success Criteria

| Metric | Target |
|--------|--------|
| Smoke Tests | 100% pass |
| Critical Path | 100% pass |
| Authentication | 100% pass |
| Request Workflow | 95%+ pass |
| Approval Workflow | 95%+ pass |
| Accessibility Score | 90%+ |
| Performance (LCP) | < 2.5s |

---

## 🛠️ Test Infrastructure

```
tests/
├── smoke/              # Quick sanity tests
├── auth/               # Authentication tests
├── requests/           # Request workflow tests
├── approvals/          # Approval workflow tests
├── admin/              # Admin functionality tests
├── accessibility/      # WCAG compliance tests
├── performance/        # Load and performance tests
├── api/                # API endpoint tests
└── fixtures/           # Test data and utilities
```

---

## 📅 Recommended Schedule

| Day | Focus | Tests |
|-----|-------|-------|
| Day 1 | Smoke + Auth | 15 tests |
| Day 2 | Requests | 20 tests |
| Day 3 | Approvals | 25 tests |
| Day 4 | Admin + Access | 26 tests |
| Day 5 | A11y + Perf + API | 20 tests |

**Total: ~106 tests**

---

## 🔧 Running Tests

```bash
# Smoke tests (quick)
npm run test:smoke

# Full E2E suite
npm run test:e2e

# Specific category
npm run test:e2e -- --grep "Authentication"

# With UI
npx playwright test --ui

# Generate report
npx playwright show-report
```
