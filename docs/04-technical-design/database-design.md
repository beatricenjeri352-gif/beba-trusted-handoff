# BEBA — Backend Database Design Specification

**Version:** 1.1  
**Status:** Working draft — for technical review  
**Proposed database:** PostgreSQL (Supabase under evaluation)

## 1. Purpose

This document defines the proposed database structure for Beba.

It describes the information the platform needs to store, the relationships between records and the business rules the backend must enforce.

This is a design specification, not an executed database migration. SQL, constraints, security policies and implementation details must be reviewed and tested before production use.

## 2. Database design principles

- Use unique identifiers for records.
- Store dates and timestamps consistently.
- Separate individual accounts from business profiles.
- Keep private identity documents out of public profile data.
- Record important delivery and financial changes.
- Enforce permissions in the backend.
- Preserve historical records where appropriate.
- Do not trust prices, commission calculations or payment statuses supplied by the frontend.
- Use transactions for operations that must succeed or fail together.

## 3. Main database groups

The initial database is organised into these logical groups:

1. User accounts and roles.
2. Carrier profiles.
3. Identity verification.
4. Business profiles and memberships.
5. Delivery requests and stops.
6. Carrier contacts and assignments.
7. Delivery events and evidence.
8. Pricing and quotes.
9. Commissions and payments.
10. Disputes, ratings and notifications.
11. Administrative audit logs.

## 4. User accounts and roles

### 4.1 `users`

Stores the individual account associated with a person.

Proposed fields:

| Field | Type | Purpose |
|---|---|---|
| id | UUID | Unique user ID |
| auth_user_id | UUID | Link to authentication provider |
| full_name | TEXT | User's name |
| phone_number | TEXT | Normalised phone number |
| email | TEXT | Email, if provided |
| account_status | TEXT | Account state |
| created_at | TIMESTAMPTZ | Creation time |
| updated_at | TIMESTAMPTZ | Last update |

The authentication provider should manage credentials. Passwords must never be stored as ordinary plaintext fields.

### 4.2 `user_roles`

Stores approved capabilities associated with an individual.

Proposed fields:

- id
- user_id
- role
- status
- approved_by
- approved_at
- created_at

Initial role values may include sender, carrier and administrator.

An individual can have both sender and carrier roles.

### 4.3 `carrier_profiles`

Stores information needed to display and manage carrier services.

Proposed fields:

- id
- user_id
- carrier_type
- operating_towns
- delivery_methods
- vehicle_type
- vehicle_registration, where applicable
- profile_description
- profile_photo_path, where provided
- approval_status
- active_status
- created_at
- updated_at

One individual account should have no more than one active carrier profile.

Carrier approval is required before the profile becomes eligible for selection.

## 5. Identity verification

### `identity_verifications`

Stores the status and administrative record of carrier verification.

Proposed fields:

- id
- user_id
- verification_method
- identity_reference, where appropriate
- document_storage_path
- verification_status
- submitted_at
- reviewed_by
- reviewed_at
- review_notes
- created_at

Possible verification statuses:

- pending
- approved
- rejected
- needs_more_information
- expired

Important controls:

- Identity documents must be stored privately.
- Public carrier profiles must not expose identity documents.
- Access must be limited to authorised verification personnel.
- Duplicate identity numbers must be checked securely.
- Verification actions must be logged.
- Retention and deletion rules must be defined.
- Biometric processing requires appropriate legal and security assessment.

A verification status is not, by itself, proof that an identity document is authentic.

## 6. Business profiles

### 6.1 `business_profiles`

Stores business information independently of individual accounts.

Proposed fields:

- id
- business_name
- registration_number, where applicable
- business_phone
- business_email
- business_address
- business_type
- application_status
- approved_by
- approved_at
- created_at
- updated_at

Business applications require Beba approval.

### 6.2 `business_members`

Connects individuals to business profiles.

Proposed fields:

- id
- business_id
- user_id
- member_role
- membership_status
- invited_by
- joined_at
- created_at
- updated_at

One individual may belong to multiple businesses.

One business may have multiple authorised members.

The implementation must define ownership rules, including how ownership is transferred and how membership is revoked. Membership history should be preserved rather than silently deleting records.

## 7. Delivery requests

### 7.1 `delivery_requests`

The main record for a delivery.

Proposed fields:

- id
- tracking_number
- sender_user_id
- business_id, nullable
- delivery_method
- parcel_description
- parcel_size
- weight_kg
- current_status
- accepted_quote_id
- created_at
- updated_at

The sender must always be recorded, even when a delivery is created on behalf of a business.

Possible delivery methods:

- within_town
- to_stage
- intertown

Possible delivery statuses:

- draft
- awaiting_carrier
- carrier_selected
- awaiting_carrier_confirmation
- carrier_confirmed
- goods_collected
- in_transit
- at_handover_point
- awaiting_receiver_confirmation
- completed
- cancelled
- failed
- under_review
- disputed
- returned

### 7.2 `delivery_stops`

Stores pickup, destination and intermediate handover points.

Proposed fields:

- id
- delivery_request_id
- stop_type
- sequence_number
- location_name
- address
- town
- latitude
- longitude
- contact_name
- contact_phone
- instructions
- created_at

A delivery can have multiple stops.

Possible stop types:

- pickup
- handover
- destination

Coordinates should only be collected and retained where necessary for the delivery service.

## 8. Carrier contact and assignment

### 8.1 `carrier_contact_requests`

Records when a sender initiates contact with a carrier about a delivery.

Proposed fields:

- id
- delivery_request_id
- sender_user_id
- carrier_user_id
- contact_method
- contact_status
- initiated_at
- last_updated_at

Possible contact methods:

- phone
- in_app
- other_approved_method

Possible contact statuses:

- initiated
- contacted
- responded
- closed

A contact record is not proof that an actual conversation occurred, particularly when the sender uses an ordinary phone call outside Beba.

### 8.2 `delivery_assignments`

Records the sender's carrier selection and the carrier's response.

Proposed fields:

- id
- delivery_request_id
- carrier_user_id
- selected_by_user_id
- assignment_status
- selected_at
- responded_at
- accepted_at
- completed_at
- created_at

Possible statuses:

- pending_carrier_confirmation
- accepted
- declined
- cancelled
- completed

Only one active carrier assignment may exist per delivery.

The backend must enforce this rule transactionally to prevent simultaneous conflicting selections.

A new carrier may be selected after the previous assignment is declined or properly cancelled.

## 9. Delivery events

### `delivery_events`

Stores the history of important delivery milestones.

Proposed fields:

- id
- delivery_request_id
- actor_user_id
- event_type
- previous_status
- new_status
- notes
- created_at

Events should be append-only for ordinary users.

Corrections should be recorded as additional events rather than silently rewriting history.

The system should distinguish operational events from analytics events such as ordinary profile views.

## 10. Delivery evidence

### `delivery_evidence`

Stores references to evidence associated with delivery events.

Proposed fields:

- id
- delivery_request_id
- assignment_id
- submitted_by
- evidence_type
- storage_path
- description
- created_at

Possible evidence types:

- pickup_photo
- pickup_pin
- delivery_photo
- receipt_confirmation
- handover_receipt

Evidence files must be stored in private storage with access controls.

Pickup confirmation and receiver confirmation must remain distinct.

## 11. Pricing and quotes

### 11.1 `pricing_rules`

Stores configurable pricing parameters.

Proposed fields:

- id
- delivery_method
- base_fee
- distance_rate
- parcel_size_rate
- parcel_weight_rate
- service_charge
- effective_from
- effective_until
- status
- created_by
- created_at

The exact fields may change when the pricing formula is finalised.

Pricing rules must be configurable without changing frontend code.

### 11.2 `delivery_quotes`

Stores price calculations for individual delivery requests.

Proposed fields:

- id
- delivery_request_id
- pricing_rule_id
- base_fee
- distance_charge
- parcel_charge
- service_charge
- total_amount
- currency
- quote_status
- valid_until
- created_at

Quotes must distinguish estimated prices from confirmed prices.

### 11.3 `price_adjustments`

Records requested and approved changes to a delivery price.

Proposed fields:

- id
- delivery_request_id
- original_amount
- proposed_amount
- reason
- requested_by
- approved_by
- sender_agreed_at
- carrier_agreed_at
- adjustment_status
- created_at
- updated_at

Price adjustments require Beba approval and agreement from both sender and carrier.

Original prices must remain available for audit purposes.

## 12. Commission and payments

### 12.1 `commission_records`

Stores commission obligations associated with completed deliveries.

Proposed fields:

- id
- delivery_request_id
- carrier_user_id
- delivery_fee
- commission_rate
- minimum_commission
- commission_amount
- commission_status
- calculated_at
- created_at

The agreed formula is:

`Commission = MAX(10% × final approved delivery fee, KES 110)`

The backend must calculate the amount.

### 12.2 `commission_payments`

Records payments made by carriers to Beba.

Proposed fields:

- id
- commission_record_id
- carrier_user_id
- payment_method
- payment_reference
- amount
- payment_status
- paid_at
- verified_at
- verified_by
- created_at

Possible statuses:

- pending
- submitted
- verified
- rejected
- reversed

Payment verification must use a trusted integration where available.

M-Pesa PINs must never be stored.

Failed and cancelled deliveries require separate commission treatment.

## 13. Disputes and incidents

### `disputes`

Stores reports of delivery-related incidents.

Proposed fields:

- id
- delivery_request_id
- reported_by
- dispute_type
- description
- dispute_status
- assigned_admin_id
- resolution_notes
- created_at
- resolved_at

Possible incident types:

- missing
- damaged
- delayed
- wrong_recipient
- other

Possible statuses:

- open
- investigating
- resolved
- closed

Resolution history should be preserved.

## 14. Ratings

### `ratings`

Stores optional feedback from users after deliveries.

Proposed fields:

- id
- delivery_request_id
- rated_by
- carrier_user_id
- rating_value
- comment
- created_at

Ratings must be separate from receiver confirmation.

The system should prevent duplicate ratings where the product rules require one rating per eligible user and delivery.

## 15. Notifications

### `notifications`

Stores notification records and delivery status.

Proposed fields:

- id
- user_id
- delivery_request_id
- notification_type
- channel
- content_reference
- delivery_status
- sent_at
- read_at
- created_at

Notification content must not expose unnecessary sensitive information.

## 16. Administrative audit logs

### `audit_logs`

Records important administrative and financial actions.

Proposed fields:

- id
- actor_user_id
- action_type
- entity_type
- entity_id
- previous_values
- new_values
- created_at

Audit logs must be protected from unauthorised modification.

## 17. Main relationships

- One individual account can have multiple roles.
- One individual account can have one carrier profile.
- One individual can own or manage multiple business profiles.
- One business can have multiple authorised members.
- One sender can create multiple delivery requests.
- One delivery request can have multiple stops.
- One delivery request can have multiple carrier contact records.
- One delivery request can have multiple historical assignments.
- One delivery request can have multiple delivery events.
- One delivery request can have multiple evidence records.
- One delivery request can have multiple quote versions and price adjustments.
- One completed delivery can have a commission record.
- One commission record can have payment attempts or payment records.
- One delivery request can have multiple incident reports.

## 18. Required backend business rules

1. Only authenticated users can create delivery requests.
2. Business delivery requests require valid business membership permissions.
3. Carrier profiles require approval before becoming discoverable as eligible carriers.
4. Only approved carriers can be selected.
5. Carrier contact does not equal assignment.
6. Sender selection does not equal carrier acceptance.
7. Only one active assignment can exist per delivery.
8. Delivery status transitions must be validated.
9. Price calculations must happen on the backend.
10. Price adjustments require approval and agreement.
11. Commission calculations must happen on the backend.
12. Commission payments must be verified.
13. Pickup confirmation and receiver confirmation must be separate.
14. Sensitive files must be private.
15. Important actions must be recorded.
16. Ordinary users must not be able to rewrite delivery history or audit logs.

## 19. Access control and database security

The database must enforce access controls using backend authorisation and appropriately configured row-level security policies.

Examples:

- Users can access their own individual account information.
- Business members can access only the business records permitted by their role.
- Senders can access their own delivery requests.
- Carriers can access delivery details for assignments they are authorised to handle.
- Receivers can access only the information exposed through valid tracking or confirmation links.
- Administrators can access records according to their assigned permissions.
- Identity documents must be accessible only to authorised verification personnel.
- Commission and financial records must have restricted access.

RLS policies must be reviewed and tested for every table. Frontend visibility alone is not a security control.

## 20. Recommended implementation order

1. Authentication and individual users.
2. User roles and carrier profiles.
3. Business profiles and membership.
4. Identity verification workflow.
5. Delivery requests and stops.
6. Carrier contact records and assignments.
7. Delivery events and evidence.
8. Pricing rules, quotes and adjustments.
9. Commission records and payments.
10. Disputes, ratings and notifications.
11. Administrative audit logs.
12. RLS policies, automated tests and security review.

## 21. Developer deliverables

The implementation team should provide:

- Reviewed database entity relationship diagram.
- SQL migrations.
- Foreign key constraints.
- Unique constraints and indexes.
- Validated status definitions and transitions.
- Row-level security policies.
- Backend validation logic.
- Test cases for permissions and business rules.
- Backup and recovery plan.
- Documentation of deployment and environment configuration.

## 22. Open technical decisions

The following remain subject to further design:

- Final backend and hosting selection.
- Carrier contact method.
- Exact pricing fields and tariff model.
- Receiver confirmation mechanism.
- Payment integration.
- Identity verification provider.
- Data retention periods.
- Final administrative role structure.

**Document status:** Working technical specification. Not yet implemented or deployed. All SQL and security policies must be reviewed, tested and approved before production use.
