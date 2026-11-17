# Beba – Testing and Acceptance Criteria

**Version:** 1.0  
**Status:** Proposed – Not yet implemented  
**Purpose:** Define how Beba's features will be tested and the conditions that must be satisfied before they are approved for release.

## 1. Introduction

Testing is necessary to confirm that Beba works as intended, protects user information and supports the agreed delivery process.

This document defines the testing approach and acceptance criteria for the initial Minimum Viable Product (MVP).

A feature should not be considered complete simply because it appears to work in the frontend. It must also be tested against backend rules, user permissions, data accuracy and failure scenarios.

## 2. Testing Objectives

Beba's testing process should confirm that:

- Users can register and access their accounts.
- User roles and permissions work correctly.
- Senders can create delivery requests.
- Senders can browse and contact approved carriers.
- Senders can select carriers.
- Carriers can accept or decline assignments.
- Delivery milestones are recorded correctly.
- Receivers can confirm receipt.
- Pricing and commission calculations are accurate.
- Payments are recorded and verified correctly.
- Incidents can be reported and investigated.
- Unauthorised users cannot access restricted information.

## 3. Types of Testing

### 3.1 Functional Testing

Confirms that individual features perform their intended functions.

### 3.2 Integration Testing

Confirms that connected components communicate correctly, such as:
- Frontend and backend.
- Backend and database.
- Backend and payment provider.
- Backend and notification provider.
- Backend and mapping service.

### 3.3 Security Testing

Checks authentication, permissions, private records, identity documents and other security controls.

### 3.4 Usability Testing

Checks whether users can understand and complete tasks without unnecessary difficulty.

### 3.5 Performance Testing

Checks whether the system remains responsive under expected user activity.

### 3.6 Regression Testing

Confirms that changes to one feature have not broken previously working features.

## 4. User Account Testing

| Test ID | Scenario | Expected result |
|---|---|---|
| ACC-001 | Register with valid information | Account is created |
| ACC-002 | Register with missing required information | Validation error appears |
| ACC-003 | Register with an existing phone number where uniqueness is required | Duplicate account is prevented |
| ACC-004 | Log in with valid credentials | User gains access |
| ACC-005 | Log in with incorrect credentials | Access is denied |
| ACC-006 | Attempt to access another user's private profile | Access is denied |
| ACC-007 | Log out | Protected session ends |

## 5. Identity Verification Testing

| Test ID | Scenario | Expected result |
|---|---|---|
| IDV-001 | Carrier submits required identity information | Submission is recorded |
| IDV-002 | Authorised administrator approves a carrier | Carrier becomes approved |
| IDV-003 | Administrator rejects a carrier | Carrier remains unapproved |
| IDV-004 | Unapproved carrier attempts to accept a delivery | Action is blocked |
| IDV-005 | Duplicate identity number is submitted | Duplicate is flagged or rejected according to policy |
| IDV-006 | Unauthorised user attempts to view identity documents | Access is denied |

Manual verification must be tested using controlled test data. Real identity documents should not be used in development or testing without an approved lawful process and safeguards.

## 6. Sender Delivery Creation Testing

| Test ID | Scenario | Expected result |
|---|---|---|
| DEL-001 | Sender creates a delivery with valid information | Delivery request is created |
| DEL-002 | Sender submits incomplete delivery information | Required fields are identified |
| DEL-003 | Sender selects pickup and destination locations | Locations are saved correctly |
| DEL-004 | Sender submits parcel details | Parcel information is recorded |
| DEL-005 | Sender views their delivery request | Correct delivery details are displayed |
| DEL-006 | Unauthorised user attempts to edit the request | Access is denied |

## 7. Carrier Discovery and Selection Testing

| Test ID | Scenario | Expected result |
|---|---|---|
| CAR-001 | Sender views available carriers | Approved eligible carriers are displayed |
| CAR-002 | Sender views an unapproved carrier | Carrier is not presented as eligible |
| CAR-003 | Sender opens a carrier profile | Permitted profile information is displayed |
| CAR-004 | Sender contacts a carrier | Contact action is recorded where applicable |
| CAR-005 | Sender selects a carrier | Pending assignment is created |
| CAR-006 | Selected carrier accepts | Assignment becomes active |
| CAR-007 | Selected carrier declines | Assignment is not activated |
| CAR-008 | Unselected carrier attempts to accept | Action is denied |

The platform must not automatically assign or distribute delivery requests to competing carriers.

## 8. Delivery Tracking Testing

| Test ID | Scenario | Expected result |
|---|---|---|
| TRK-001 | Carrier records collection | Collection event is recorded |
| TRK-002 | Carrier updates delivery progress | Correct status is displayed |
| TRK-003 | Carrier records arrival at destination or stage | Arrival event is recorded |
| TRK-004 | Carrier reports delivery | Delivery awaits receiver confirmation or authorised review |
| TRK-005 | Receiver confirms receipt | Delivery is marked completed |
| TRK-006 | Receiver does not confirm receipt | Delivery remains unresolved |
| TRK-007 | Unauthorised user attempts to change delivery status | Action is denied |

## 9. Pricing and Commission Testing

The commission formula is:

**Commission = greater of 10% of the final approved delivery fee or KES 110.**

| Test ID | Delivery fee | Expected commission |
|---|---:|---:|
| PAY-001 | KES 300 | KES 110 |
| PAY-002 | KES 500 | KES 110 |
| PAY-003 | KES 1,000 | KES 110 |
| PAY-004 | KES 1,100 | KES 110 |
| PAY-005 | KES 1,500 | KES 150 |
| PAY-006 | KES 2,000 | KES 200 |
| PAY-007 | KES 5,000 | KES 500 |

Additional tests:

| Test ID | Scenario | Expected result |
|---|---|---|
| PAY-008 | User attempts to alter commission through frontend input | Backend rejects the unauthorised change |
| PAY-009 | Price adjustment is requested | Approval process is triggered |
| PAY-010 | Approved adjustment is made | Original and revised prices are retained |
| PAY-011 | Delivery is cancelled | Commission follows the approved cancellation policy |
| PAY-012 | Delivery is disputed | Commission outcome is placed under the appropriate review process |

## 10. Payment Testing

| Test ID | Scenario | Expected result |
|---|---|---|
| PMT-001 | Valid payment confirmation is received | Payment is recorded |
| PMT-002 | Invalid payment reference is submitted | Payment is not marked as verified |
| PMT-003 | Duplicate payment callback is received | Duplicate transaction is prevented |
| PMT-004 | Payment amount does not match the expected amount | Transaction is flagged |
| PMT-005 | Commission is paid and verified | Carrier's commission status is updated |
| PMT-006 | Commission remains unpaid | Applicable carrier eligibility restriction is enforced |

Payment tests should use a provider sandbox or controlled test environment.

## 11. Receiver Confirmation Testing

Tests must verify that:

- The correct receiver can access the relevant delivery information.
- Unauthorised people cannot confirm receipt.
- Confirmation is linked to the correct delivery.
- Confirmation date and time are recorded.
- A confirmation cannot accidentally be duplicated.
- A disputed confirmation can be referred for review.
- Ratings remain optional and separate from receipt confirmation.

## 12. Incident and Dispute Testing

| Test ID | Scenario | Expected result |
|---|---|---|
| INC-001 | Sender reports a missing parcel | Incident is created |
| INC-002 | Receiver reports damaged goods | Incident is recorded |
| INC-003 | User disputes delivery confirmation | Delivery is flagged for review |
| INC-004 | User submits supporting evidence | Evidence is linked to the incident |
| INC-005 | Administrator updates an incident | Update is recorded |
| INC-006 | Unauthorised user attempts to close an incident | Action is denied |

## 13. Security and Privacy Testing

The system must be tested for:
- Unauthorised account access.
- Incorrect role permissions.
- Exposure of private identity documents.
- Exposure of delivery locations.
- Weak session handling.
- Insecure API endpoints.
- Improper input validation.
- Unauthorised changes to payment or delivery records.
- Accidental exposure of secrets or credentials.
- Insecure file uploads.

Security testing should be performed before any real-user pilot.

## 14. Usability Testing

Representative users should test the application.

Participants should include:
- Senders.
- Carriers.
- Receivers.
- Business users, where included in the pilot.

They should be asked to complete realistic tasks such as:
- Creating a delivery request.
- Finding and reviewing a carrier.
- Contacting and selecting a carrier.
- Accepting a delivery.
- Updating delivery progress.
- Confirming receipt.
- Reporting a problem.

Feedback should be recorded and used to improve the interface.

## 15. Acceptance Criteria

A feature may be approved when:

1. Its intended functionality works.
2. Required information is saved correctly.
3. Relevant permissions are enforced.
4. Validation errors are handled properly.
5. Important actions are recorded.
6. Relevant failure scenarios have been tested.
7. No unresolved critical or high-severity defects remain without an approved mitigation.
8. The feature meets the requirements in the PRD and related specifications.

## 16. Defect Classification

| Severity | Description |
|---|---|
| Critical | Major security exposure, data loss or fundamental system failure |
| High | Important functionality unavailable or serious incorrect behaviour |
| Medium | Feature works incorrectly in certain situations |
| Low | Minor interface or usability issue |

Critical and high-severity issues must be addressed or formally mitigated before release.

## 17. Test Environments

Beba should use separate environments:

- Development: For active development and initial testing.
- Staging: For final testing before release.
- Production: For the live application.

Real user data must not be copied into development or staging without an approved, protected process.

## 18. Test Evidence and Reporting

Each test should record:
- Test ID.
- Feature tested.
- Test scenario.
- Test data used.
- Expected result.
- Actual result.
- Pass or fail status.
- Defect reference, where applicable.
- Date tested.
- Person responsible.

## 19. Release Approval

A release should only proceed when:
- Required MVP features pass their acceptance tests.
- Critical security issues have been addressed.
- User permissions work correctly.
- Payment and commission rules have been tested.
- Delivery confirmation and incident processes work.
- Backup and recovery arrangements have been checked.
- Outstanding defects have been documented and assessed.

## 20. Related Documentation

- `docs/01-product/product-requirements.md`
- `docs/01-product/user-journeys.md`
- `docs/02-product/pricing-and-payment-specification.md`
- `docs/03-technical-design/api-specification.md`
- `docs/03-technical-design/database-design.md`
- `docs/04-security/security-and-privacy-requirements.md`
- `docs/04-security/risk-and-incident-management.md`
- `docs/documentation-roadmap.md`

**End of document.**
