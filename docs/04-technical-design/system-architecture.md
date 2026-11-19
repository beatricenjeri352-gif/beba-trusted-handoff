# BEBA — System Architecture

**Version:** 1.0  
**Status:** Proposed architecture — subject to technical review  
**Purpose:** Describe how Beba's application, backend, database and external services will work together.

---

## 1. Overview

Beba will use a client-server architecture.

The frontend will provide the interface used by senders, carriers, receivers and administrators.

The backend will process requests, enforce business rules, calculate prices, manage assignments, control permissions and communicate with external services.

The database will store application records, while private file storage will hold documents and delivery evidence.

The architecture must ensure that important business decisions and financial calculations are controlled by the backend rather than trusted to the user's browser.

## 2. Proposed architecture

The proposed system consists of these layers:

1. Frontend application.
2. Backend API and business logic.
3. Authentication and authorisation.
4. Relational database.
5. Private file storage.
6. External service integrations.
7. Monitoring, logging and backups.

### Architecture flow

```text
                  BEBA USERS
                       |
        +--------------+--------------+
        |              |              |
      Sender         Carrier       Receiver
        |              |              |
        +--------------+--------------+
                       |
                BEBA FRONTEND
                 Web Application
                       |
                    HTTPS
                       |
                BACKEND / API
                       |
       +---------------+----------------+
       |               |                |
 Authentication   Business Logic   Notifications
       |               |
       |        +------+-------+
       |        |      |       |
       |      Pricing Delivery Commission
       |        |   Management   |
       |        |      |         |
       +--------+------+---------+
                       |
               POSTGRESQL DATABASE
                       |
             PRIVATE FILE STORAGE
                       |
       +---------------+----------------+
       |               |                |
    M-Pesa       Maps/Distance      SMS/Email
   Integration     Provider         Provider
```

This is a conceptual diagram. The exact services and deployment arrangement remain subject to technical evaluation.

## 3. Frontend application

The frontend is the part users see and interact with.

It should be mobile-friendly because many Beba users will access the platform through their phones.

### Main interfaces

**Sender interface**
- Registration and login.
- Personal profile.
- Business profile selection.
- Delivery creation.
- Price review.
- Carrier directory.
- Carrier contact and selection.
- Delivery tracking.
- Incident reporting.

**Carrier interface**
- Carrier application.
- Carrier profile management.
- Verification status.
- Delivery assignment requests.
- Accepting or declining assignments.
- Delivery milestones.
- Commission records.
- Payment instructions.

**Receiver interface**
- Secure tracking link.
- Delivery progress.
- Delivery confirmation.
- Optional rating.
- Incident reporting where authorised.

**Administrator interface**
- Carrier application review.
- Business application review.
- User and account management.
- Pricing configuration.
- Delivery oversight.
- Incident and dispute management.
- Commission and payment oversight.
- Audit records.

### Frontend responsibilities

The frontend should:
- Display relevant information.
- Collect user input.
- Send requests to the backend.
- Display backend responses.
- Show validation errors.
- Provide clear delivery progress information.

The frontend must not be trusted to independently determine:
- Whether a carrier is approved.
- Whether a user has permission.
- Whether a delivery is completed.
- Whether a price is valid.
- How much commission is payable.
- Whether a payment has been received.

These decisions must be validated by the backend.

## 4. Backend and API

The backend is the central control layer of Beba.

It receives requests from the frontend, checks permissions, applies business rules and communicates with the database and external services.

### Main backend modules

**4.1 Account management**

Responsible for:
- User registration.
- Login and session management.
- User roles.
- Account status.
- Profile management.

**4.2 Carrier management**

Responsible for:
- Carrier applications.
- Carrier profiles.
- Identity verification workflow.
- Carrier approval.
- Carrier availability and service information.

**4.3 Business management**

Responsible for:
- Business applications.
- Business approval.
- Business ownership.
- Business membership.
- Business permissions.

**4.4 Delivery management**

Responsible for:
- Creating delivery requests.
- Managing pickup and destination information.
- Recording intermediate stops.
- Displaying relevant carrier profiles.
- Recording sender-initiated carrier contact.
- Creating assignments after sender selection.
- Recording carrier acceptance or rejection.

**4.5 Pricing engine**

Responsible for:
- Reading approved pricing rules.
- Calculating delivery estimates.
- Producing confirmed quotes.
- Handling authorised price adjustments.
- Maintaining historical pricing information.

**4.6 Commission management**

Responsible for:
- Calculating commission.
- Creating commission obligations.
- Recording payments.
- Verifying payment status.
- Checking carrier eligibility for subsequent deliveries.

**4.7 Tracking and delivery events**

Responsible for:
- Recording pickup.
- Recording transit milestones.
- Recording handovers.
- Recording destination arrival.
- Managing receiver confirmation.
- Maintaining delivery history.

**4.8 Dispute management**

Responsible for:
- Receiving incident reports.
- Storing incident descriptions and evidence references.
- Assigning administrative reviews.
- Recording outcomes.

## 5. Authentication and authorisation

Beba must distinguish between authentication and authorisation.

Authentication answers: Who is accessing the system?

Authorisation answers: What is that person allowed to do?

The proposed system should support:
- Individual accounts.
- Sender and carrier roles.
- Business membership permissions.
- Administrator permissions.
- Restricted receiver access through secure links.

A user with both sender and carrier capabilities should be able to use the same individual account.

Business permissions must be checked whenever a user performs an action on behalf of a business.

Administrative access must be restricted and logged.

## 6. Database

PostgreSQL is the proposed database technology, with Supabase under evaluation.

The database will store:
- Individual accounts.
- User roles.
- Carrier profiles.
- Identity verification records.
- Business profiles and memberships.
- Delivery requests.
- Delivery stops.
- Carrier contact records.
- Delivery assignments.
- Delivery events.
- Pricing rules and quotes.
- Commission records.
- Payment records.
- Disputes.
- Ratings.
- Notifications.
- Audit logs.

The database must maintain relationships between these records using primary keys and foreign keys.

Important business operations must use database transactions where appropriate.

## 7. File storage

Beba needs file storage separate from ordinary database records.

Potential files include:
- Identity documents.
- Carrier profile photographs.
- Business documents.
- Pickup evidence.
- Delivery evidence.
- Handover receipts.

The database should store secure file references and relevant metadata, not necessarily the actual file contents.

### Security requirements

- Private storage for sensitive files.
- Restricted access.
- Short-lived signed links where appropriate.
- File type and size validation.
- Access logging for sensitive documents.
- Defined retention and deletion rules.
- Encryption in transit and at rest.

Public carrier profiles must never expose private identity documents.

## 8. External service integrations

Beba may need external services for the following functions.

### 8.1 Payment integration

Potential provider: M-Pesa.

Purpose:
- Receive carrier commission payments.
- Verify transaction references.
- Record payment status.
- Support future delivery payment workflows.

The backend must verify payment events. Screenshots or frontend claims must not independently mark payments as verified.

### 8.2 Maps and distance services

Leaflet and OpenStreetMap are used for location search and map pin selection. The server-side Google Maps Routes API is used for actual road-distance calculations. The API key must never be exposed to browser code.

The pricing engine must use an approved distance method.

For inter-town deliveries, route-specific tariffs may be more appropriate than ordinary road-distance calculations.

### 8.3 SMS and email services

Potential uses:
- Account verification.
- Delivery notifications.
- Carrier assignment notifications.
- Receiver confirmation links.
- Commission payment reminders.
- Security notifications.

The provider and notification channels are not yet final.

### 8.4 Identity verification services

Beba may use a specialist provider to support identity checks.

The system must not assume that a submitted document is authentic merely because a file was uploaded.

The verification process requires appropriate legal, security and privacy assessment before production use.

## 9. Main system workflows

### 9.1 Creating a delivery

1. Sender submits delivery details.
2. Backend authenticates the sender.
3. Backend validates the sender's permissions.
4. Backend validates pickup, destination and parcel information.
5. Pricing engine calculates the delivery price.
6. Backend creates the delivery request and quote.
7. Database stores the records.
8. Backend returns the delivery reference.
9. Frontend displays the new request.

### 9.2 Finding and contacting a carrier

1. Sender opens the delivery request.
2. Frontend requests the relevant carrier directory.
3. Backend retrieves approved and active carriers matching the delivery requirements.
4. Backend returns permitted public profile information.
5. Sender reviews the profiles.
6. Sender chooses a carrier to contact.
7. Backend records the contact initiation where supported.

Browsing and contacting a carrier must not automatically create an assignment.

### 9.3 Selecting a carrier

1. Sender selects a carrier.
2. Backend verifies the sender's authority over the delivery.
3. Backend verifies the carrier's approval and eligibility.
4. Backend checks that no conflicting active assignment exists.
5. Backend creates a pending assignment.
6. Carrier receives a notification.
7. Carrier accepts or declines.
8. Backend validates the response and updates the assignment.
9. Delivery history is recorded.

### 9.4 Completing a delivery

1. Carrier confirms collection.
2. Backend records pickup confirmation.
3. Carrier records delivery milestones.
4. Backend records each event.
5. Receiver accesses the confirmation method.
6. Receiver confirms receipt.
7. Backend records confirmation.
8. Delivery becomes completed.
9. Commission obligation is calculated.
10. Carrier receives payment instructions.

The exact commission settlement timing and handling of exceptional cases must follow the approved business rules.

## 10. Security architecture

Security must be considered across every layer.

Required controls include:

- HTTPS for all application traffic.
- Secure authentication.
- Role-based authorisation.
- Database row-level security where applicable.
- Backend validation.
- Private file storage.
- Protected administrative accounts.
- Audit logging.
- Rate limiting for sensitive endpoints.
- Secure handling of receiver tracking links.
- Backup and recovery procedures.
- Monitoring for suspicious activity.

Sensitive identity and biometric information requires additional safeguards and a formal data protection assessment.

## 11. Reliability and recovery

The production architecture should include:

- Automated database backups.
- Documented recovery procedures.
- Error monitoring.
- Application logs.
- Database performance monitoring.
- External integration failure handling.
- Notification retry mechanisms.
- Protection against duplicate payment callbacks and duplicate assignments.

A failed external service should not silently create inconsistent delivery or financial records.

## 12. Proposed technology stack

The following are candidates, not final selections.

| Layer | Candidate | Purpose |
|---|---|---|
| Frontend | HTML/CSS/JavaScript initially; framework to be evaluated | User interface |
| Backend/database | Supabase and PostgreSQL | Data and backend services |
| Authentication | Supabase Auth or another reviewed provider | User authentication |
| File storage | Private Supabase Storage or equivalent | Documents and evidence |
| Hosting | Vercel or equivalent | Frontend hosting |
| Version control | GitHub | Code and documentation |
| Payments | M-Pesa integration | Commission payments |
| Map search and pinning | Leaflet and OpenStreetMap | Location search and pin selection |
| Road routing | Google Maps Routes API (server-side) | Actual road distance |
| Notifications | SMS/email provider to be selected | User communication |

The final stack should be selected based on security, cost, maintainability, integration needs and team capability.

## 13. Deployment environments

Beba should eventually use separate environments.

**Development**
- Used while building and experimenting.
- Uses test data.
- No real customer identity documents or payments.

**Testing/staging**
- Used to test complete workflows.
- Uses controlled test accounts.
- Used for acceptance testing before releases.

**Production**
- Used by real customers.
- Requires approved security, privacy and operational controls.
- Uses production credentials and restricted access.

Development and production secrets must never be mixed.

## 14. Monitoring and auditability

The system should monitor:
- Application errors.
- Failed authentication attempts.
- Database errors.
- Payment integration failures.
- Notification failures.
- Delivery status inconsistencies.
- Administrative actions.
- Unusual account activity.

Logs must avoid unnecessarily storing passwords, authentication tokens, full identity documents or other sensitive information.

## 15. Architecture implementation phases

### Phase 1: Foundation
- Select the technology stack.
- Configure GitHub development workflow.
- Set up development environment.
- Establish backend project.
- Configure authentication.

### Phase 2: Core data
- Implement users and roles.
- Implement carrier profiles.
- Implement business profiles.
- Implement delivery request records.
- Configure permissions.

### Phase 3: Delivery workflow
- Implement delivery creation.
- Implement carrier directory.
- Implement carrier contact records.
- Implement carrier selection and acceptance.
- Implement delivery events.

### Phase 4: Business operations
- Implement pricing engine.
- Implement commission records.
- Implement payment verification.
- Implement receiver confirmation.
- Implement incident management.

### Phase 5: External integrations
- Mapping provider.
- M-Pesa.
- Notifications.
- Identity verification provider, if approved.

### Phase 6: Testing and deployment
- Security testing.
- Permission testing.
- Workflow testing.
- Performance checks.
- Staging deployment.
- Controlled production pilot.

## 16. Outstanding architecture decisions

- Final frontend framework.
- Final backend and hosting provider.
- Database deployment and region.
- Identity verification provider.
- Maps and routing provider.
- M-Pesa integration approach.
- SMS and email provider.
- In-app messaging scope.
- Monitoring provider.
- Data retention and backup requirements.

## 17. Final architecture principle

Beba's frontend should make the product easy to use, but the backend must remain responsible for enforcing trust, permissions, delivery workflows, pricing and financial rules.

No critical business decision should depend solely on what a user can change in their browser.

**Document status:** Proposed architecture. It must be reviewed against the final product requirements and security requirements before implementation.
