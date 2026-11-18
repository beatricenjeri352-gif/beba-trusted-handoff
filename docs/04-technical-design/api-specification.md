# Beba – API Specification

**Version:** 1.0  
**Status:** Proposed – Not yet implemented  
**Purpose:** Define how Beba's frontend, backend and external services will communicate.

## 1. Overview

Beba will use an API (Application Programming Interface) to allow the frontend application to communicate securely with the backend.

The API will handle:
- User accounts and authentication.
- Sender and carrier profiles.
- Business accounts.
- Delivery requests.
- Carrier discovery and contact.
- Carrier selection and acceptance.
- Delivery tracking and confirmation.
- Pricing and commission calculations.
- Payments and transaction records.
- Evidence, disputes and notifications.

The backend will be responsible for validating requests, applying business rules and controlling access to information.

## 2. API Design Principles

The API should follow these principles:

1. **Security:** Users must only access information and actions they are authorised to use.
2. **Validation:** The backend must validate information before saving it.
3. **Consistency:** Similar operations should follow consistent naming and response formats.
4. **Privacy:** Personal information and identity documents must only be accessible to authorised users.
5. **Reliability:** Important operations must not be accidentally duplicated.
6. **Scalability:** The API should support additional towns, users and delivery volumes as Beba grows.

## 3. User Authentication and Profiles

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/v1/auth/register` | Register a new user |
| POST | `/api/v1/auth/login` | Authenticate a user |
| POST | `/api/v1/auth/logout` | End a user session |
| GET | `/api/v1/users/me` | Retrieve the logged-in user's profile |
| PATCH | `/api/v1/users/me` | Update permitted profile information |
| GET | `/api/v1/users/me/roles` | Retrieve the user's account roles |

The system must support users who have more than one role, such as a person who sends deliveries and also operates as a carrier.

## 4. Carrier Management

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1/carriers` | Browse approved carrier profiles |
| GET | `/api/v1/carriers/{carrierId}` | View an individual carrier profile |
| POST | `/api/v1/carriers/profile` | Create a carrier profile |
| PATCH | `/api/v1/carriers/profile` | Update permitted carrier details |
| POST | `/api/v1/carriers/verification` | Submit identity information for verification |

Only approved carriers should appear in the directory as eligible for delivery requests.

Carrier profiles should display relevant information such as:
- Carrier name and profile information.
- Verification status.
- Service areas.
- Delivery methods supported.
- Relevant delivery history and ratings, where available.
- Contact options supported by Beba.

Sensitive identity documents must not be publicly accessible.

## 5. Delivery Request Management

The sender creates the delivery request before contacting a carrier.

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/v1/delivery-requests` | Create a delivery request |
| GET | `/api/v1/delivery-requests` | List deliveries accessible to the logged-in user |
| GET | `/api/v1/delivery-requests/{deliveryId}` | View delivery details |
| PATCH | `/api/v1/delivery-requests/{deliveryId}` | Update permitted delivery details |
| POST | `/api/v1/delivery-requests/{deliveryId}/cancel` | Request cancellation |

A delivery request should capture:
- Sender details.
- Pickup location.
- Destination location.
- Delivery type.
- Parcel description, size and weight where required.
- Recipient details.
- Pricing information.
- Delivery instructions.
- Current delivery status.

The backend must validate required fields and permissions before creating or updating a request.

## 6. Carrier Discovery and Contact

After creating a delivery request, the sender can browse suitable approved carriers and decide whom to contact.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1/delivery-requests/{deliveryId}/carriers` | Retrieve eligible carrier profiles |
| POST | `/api/v1/delivery-requests/{deliveryId}/contact-carrier` | Record a sender's request to contact a carrier |

Beba must not automatically assign a carrier or distribute the delivery to competing carriers.

The sender remains responsible for reviewing carrier information and deciding whom to contact.

The contact method (direct phone, in-app messaging or both) remains subject to a final product decision.

## 7. Carrier Selection and Assignment

Once the sender and carrier agree on the delivery arrangement, the sender selects the carrier on Beba.

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/v1/delivery-requests/{deliveryId}/select-carrier` | Sender selects a carrier |
| POST | `/api/v1/assignments/{assignmentId}/accept` | Carrier accepts the proposed assignment |
| POST | `/api/v1/assignments/{assignmentId}/decline` | Carrier declines the proposed assignment |
| GET | `/api/v1/assignments/{assignmentId}` | Retrieve assignment details |

Business rules:
- Only the sender or an authorised business member can select a carrier.
- Only the selected carrier can accept or decline the assignment.
- An assignment must not become active until the carrier accepts.
- The backend must prevent multiple active assignments for the same delivery.
- A carrier's contact with a sender does not automatically mean the carrier has been assigned.
- Assignment changes must be recorded in the audit log.

## 8. Delivery Tracking and Confirmation

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1/delivery-requests/{deliveryId}/events` | Retrieve delivery events |
| POST | `/api/v1/delivery-requests/{deliveryId}/events` | Record an authorised delivery milestone |
| POST | `/api/v1/delivery-requests/{deliveryId}/confirm-receipt` | Receiver confirms receipt |
| POST | `/api/v1/delivery-requests/{deliveryId}/evidence` | Submit delivery evidence |

Delivery milestones may include:
- Delivery request created.
- Carrier selected.
- Carrier accepted.
- Goods collected.
- In transit.
- Arrived at destination or stage.
- Awaiting receiver confirmation.
- Completed.
- Cancelled, failed or under review.

Each event should record the event type, date and time, responsible user and relevant delivery reference.

A delivery should not automatically be marked completed just because the carrier says it was delivered. Receiver confirmation or an authorised review process is required.

## 9. Pricing and Commission

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/v1/pricing/quotes` | Calculate a delivery price |
| GET | `/api/v1/delivery-requests/{deliveryId}/price` | Retrieve the delivery price |
| POST | `/api/v1/delivery-requests/{deliveryId}/price-adjustments` | Request a price adjustment |
| GET | `/api/v1/delivery-requests/{deliveryId}/commission` | Retrieve applicable commission information |

Pricing and commission calculations must take place on the backend.

Current commission rule:

**Beba commission = greater of 10% of the final approved delivery fee or KES 110.**

The backend must:
- Calculate commission using the final approved delivery fee.
- Prevent users from manually changing commission amounts.
- Record the original and revised price when an adjustment is approved.
- Require the necessary approval and agreement for price adjustments.
- Record commission payment status.
- Prevent another eligible delivery from being accepted where the carrier has an outstanding commission requirement under the agreed business rules.

The detailed pricing formula and payment arrangements will be defined in the Pricing and Payment Specification.

## 10. Payments

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/v1/payments/initiate` | Initiate a supported payment |
| GET | `/api/v1/payments/{paymentId}` | Retrieve payment details |
| POST | `/api/v1/payments/callback` | Receive payment provider confirmation |
| GET | `/api/v1/commission-payments` | Retrieve carrier commission payments |

The system should support future M-Pesa integration.

Payment confirmation must come from a trusted payment provider response or verified reconciliation process, not merely from a user-uploaded screenshot.

Payment records should include:
- Transaction reference.
- Related delivery or commission record.
- Amount.
- Payment method.
- Payment status.
- Transaction date.
- Provider reference.

The system must never request or store a user's M-Pesa PIN.

## 11. Disputes and Incidents

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/v1/delivery-requests/{deliveryId}/disputes` | Report a delivery issue |
| GET | `/api/v1/disputes/{disputeId}` | Retrieve dispute details |
| POST | `/api/v1/disputes/{disputeId}/evidence` | Submit supporting evidence |
| PATCH | `/api/v1/disputes/{disputeId}` | Update an authorised dispute record |

Users should be able to report:
- Missing parcels.
- Damaged parcels.
- Non-delivery.
- Incorrect delivery confirmation.
- Suspected fraud.
- Other delivery-related concerns.

Only authorised personnel should investigate and update internal dispute records.

## 12. Notifications

The backend should trigger notifications for important events, including:
- Delivery request created.
- Carrier selected.
- Carrier accepts or declines.
- Goods collected.
- Delivery status updated.
- Receiver confirmation requested.
- Delivery completed.
- Commission payment required.
- Dispute or incident updates.

Notification channels may include in-app notifications, SMS and email. The final providers will be selected during technical planning.

## 13. Standard API Responses

Successful requests should return a consistent response structure.

Example:

```json
{
  "success": true,
  "message": "Delivery request created successfully",
  "data": {
    "delivery_id": "DEL-0001",
    "status": "awaiting_carrier"
  }
}
```

Failed requests should return a clear error.

Example:

```json
{
  "success": false,
  "message": "You are not authorised to perform this action",
  "error_code": "FORBIDDEN"
}
```

The API should use appropriate HTTP status codes, including:
- `200` – Successful request.
- `201` – Resource created.
- `400` – Invalid request.
- `401` – Authentication required.
- `403` – Permission denied.
- `404` – Resource not found.
- `409` – Conflict with existing data or status.
- `422` – Validation error.
- `500` – Unexpected server error.

## 14. Security and Access Control

Every protected endpoint must verify the user's identity and permissions.

The backend must:
- Enforce role-based access.
- Validate ownership of delivery records.
- Protect identity documents and private evidence.
- Validate all incoming information.
- Use secure authentication and encrypted communication.
- Maintain audit logs for important actions.
- Prevent unauthorised price, commission and delivery-status changes.

The frontend must never be treated as the authority for security or business rules.

## 15. Reliability and Duplicate Requests

Important operations must be protected against accidental duplication.

This is especially important for:
- Carrier assignment.
- Payment initiation.
- Payment provider callbacks.
- Delivery confirmation.
- Commission recording.

The implementation should use idempotency controls where appropriate, so repeating a request does not create duplicate transactions or assignments.

## 16. API Versioning

The initial API version will use:

`/api/v1/`

Future changes that introduce incompatible behaviour should use a new API version rather than unexpectedly breaking existing application features.

## 17. Implementation Status

This document defines the proposed API structure. None of the endpoints listed here should be considered implemented until they have been developed, tested and deployed.

Before implementation, the development team must finalise:
- The technology stack.
- Authentication approach.
- Contact method between senders and carriers.
- Final pricing rules.
- Payment provider integration.
- Request and response validation details.

## 18. Related Documentation

- `docs/01-product/user-journeys.md`
- `docs/02-decisions/decision-log.md`
- `docs/04-technical-design/database-design.md`
- `docs/04-technical-design/system-architecture.md`
- `docs/documentation-roadmap.md`

**End of document.**
