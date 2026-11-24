# BEBA — Product Requirements Document (PRD)

**Version:** 1.0  
**Status:** Working draft — pending final decisions  
**Product:** Beba  
**Document purpose:** Define the product requirements and guide design, development and testing.

---

## 1. Product overview

Beba is a delivery coordination platform designed to connect people and businesses who need to send goods with independent carriers who can transport them.

The platform allows senders to create delivery requests, view approved carrier profiles, contact carriers directly, agree on arrangements and coordinate deliveries.

Beba provides the digital infrastructure for discovery, pricing, coordination, tracking, delivery confirmation and trust-related processes.

Beba does not automatically choose a carrier on behalf of a sender.

## 2. Problem statement

Sending parcels and goods often involves informal arrangements, limited visibility into carrier reliability, inconsistent pricing and difficulty following up on deliveries.

Senders may struggle to identify available carriers, compare their profiles, agree on a price and obtain reliable delivery updates.

Carriers may struggle to find delivery opportunities and manage their delivery activities.

Beba aims to provide a more organised and transparent way for these parties to connect and coordinate.

## 3. Product vision

To make moving goods between people and businesses easier through a trusted, accessible and transparent delivery coordination platform.

## 4. Product objectives

The initial product should:

1. Allow individuals and businesses to create delivery requests.
2. Allow approved carriers to create profiles and present their services.
3. Give senders control over which carriers they contact and select.
4. Provide a consistent method of calculating delivery prices.
5. Record delivery arrangements and important milestones.
6. Enable senders and receivers to follow delivery progress.
7. Support delivery confirmation and incident reporting.
8. Manage Beba's commission records.
9. Maintain secure records of accounts, deliveries and transactions.

## 5. Target users

### 5.1 Individual senders

People who need to send parcels or goods to another person or location.

### 5.2 Business senders

Businesses that need to coordinate deliveries for customers, branches, suppliers or other business partners.

### 5.3 Carriers

Independent individuals or businesses that provide delivery and transportation services.

### 5.4 Receivers

People receiving goods. They may need to access delivery updates and confirm receipt without necessarily creating a full Beba account.

### 5.5 Beba administrators

Authorised team members responsible for approving carrier and business applications, reviewing disputes, managing pricing rules and overseeing platform activity.

## 6. Account and profile requirements

### 6.1 Individual accounts

- A person creates one individual account.
- The account can be used as a sender.
- A person can apply to become a carrier without creating another individual account.
- Users can have both sender and carrier capabilities.
- Account permissions must reflect the user's approved roles.

The current sender and carrier workspaces provide an account menu for switching
workspaces and signing out. The sender menu also shows account details and recent
deliveries. Profile editing and Settings are not yet available.
The sender notification panel shows recent active deliveries and account-level
delivery updates once the sender notifications migration is applied.
The sender home welcomes the user and opens the delivery creation wizard on the
same page.
After creating a request, the tracking ID can be copied or downloaded as a
text file. The delivery page puts carrier selection first and shows available
profile details, road distance to pickup, reviews, and completed-delivery
counts when those data can be loaded. The journey shows pickup, drop-off, and
the current status; it is not live map tracking. Quote confirmation and
additional-charge actions remain available after carrier selection.

### 6.2 Carrier profiles

- Carrier registration is optional.
- Users apply to become carriers.
- Beba reviews and approves carrier applications.
- Only approved and active carriers can be selected for deliveries.
- Carrier profiles contain relevant service and operating information.
- Private identity documents must never be displayed publicly.

### 6.3 Business profiles

- Business profiles are separate from individual user profiles.
- One user may own or manage multiple businesses.
- Multiple authorised users may belong to one business.
- Business creation requires Beba approval.
- Business members must have appropriate permissions.
- Business delivery requests must record the business and the individual who created them.

## 7. Carrier verification and trust

Beba must support an initial manual carrier verification process.

Requirements:

- Carrier applicants submit the required identity information.
- Beba administrators review identity documents.
- The submitted identity must correspond to the applicant's live identity.
- The person accepting a delivery must match the approved carrier.
- Duplicate identity numbers must be rejected.
- Verification outcomes and administrative actions must be recorded.
- Failed or unclear checks must be referred for human review.
- Carrier approval must happen before delivery participation.

The initial version should not require guarantors.

Identity verification must be implemented with appropriate privacy, security, retention and data protection safeguards. Any biometric verification method requires legal and technical assessment before real customer data is collected.

## 8. Delivery request management

### 8.1 Creating a delivery

A sender should be able to:

- Create a delivery request.
- Select a delivery method.
- Enter parcel information.
- Enter pickup and destination details.
- Provide receiver information.
- Add handling instructions.
- Review the calculated delivery price.
- Publish the request.

The current sender form groups parcel, pickup, and drop-off/receiver details in
expandable sections. Pickup and drop-off landmarks are optional. Before saving,
the sender can review and edit details and see a walking route and price estimate
when available. Once the request is saved, the sender can open its carrier
selection section.

### 8.2 Delivery methods

The initial product should support:

1. Within-town deliveries.
2. Deliveries to a designated stage or handover point.
3. Inter-town deliveries.

The system must support additional handover stops where required.

### 8.3 Delivery information

A delivery request should record:

- Unique delivery reference.
- Sender account.
- Associated business, if applicable.
- Delivery method.
- Parcel description.
- Parcel size and weight.
- Pickup location.
- Destination location.
- Intermediate handover locations, where applicable.
- Receiver name and contact details.
- Calculated delivery price.
- Current delivery status.
- Creation and update timestamps.

## 9. Carrier discovery and selection

The sender must create a delivery request before browsing and contacting carriers for that request.

The agreed sequence is:

1. Sender creates the delivery request.
2. Beba calculates and displays the delivery price.
3. Beba displays relevant approved and active carrier profiles.
4. Sender reviews carrier information.
5. Sender independently chooses which carrier to contact.
6. Sender and carrier discuss the arrangement.
7. Sender selects a carrier through Beba.
8. Carrier accepts or declines the assignment.
9. If accepted, the delivery becomes active.

Beba must not automatically assign a carrier or make the selection decision for the sender.

The carrier directory should display factual information, such as:

- Carrier name and profile image, where available.
- Verification status.
- Operating area.
- Supported delivery methods.
- Relevant vehicle information.
- Completed delivery count.
- Ratings where sufficient feedback exists.
- Available contact options.

Beba must not expose private identity documents or sensitive verification information.

The exact contact method — direct phone, in-app messaging or both — remains to be confirmed.

## 10. Delivery pricing

Beba's approved initial pricing model is distance-based.

The initial rules are:

- Base fee: KES 50.
- Minimum billable distance: 5 km.
- Walking: KES 10 per billable kilometre.
- Bicycle: KES 20 per billable kilometre.
- Motorbike: KES 20 per billable kilometre.
- Car: KES 20 per billable kilometre.

**Billable distance = maximum of actual route distance and 5 km.**

**Delivery price = KES 50 + (Billable distance × transport rate).**

Requirements:

- Administrators may version the base fee and transport rates; the 5 km minimum is fixed.
- The backend must calculate the price.
- The frontend must not be allowed to alter confirmed prices directly.
- Pricing information must be visible to relevant parties.
- Estimates and confirmed prices must be distinguishable.
- No automatic parcel-size, weight, traffic, waiting-time or special-handling surcharge is added.
- Additional charges require a reason, carrier proposal, sender agreement and Beba administrator approval.
- Private negotiated extras are excluded from Beba commission; approved in-app additions are included in the final Beba price.
- Original and revised prices, reasons and approvals must be recorded.

Actual road distance is obtained server-side from Google Maps Routes API; straight-line distance must not be used as a fallback. Quote validity and future inter-town tariffs remain outstanding.

## 11. Commission and revenue model

Beba earns a commission from the carrier.

The approved calculation is:

**Commission = 10% of the final approved Beba delivery price.**

Examples:

| Delivery fee | Commission |
|---:|---:|
| KES 50 | KES 5 |
| KES 100 | KES 10 |
| KES 150 | KES 15 |
| KES 250 | KES 25 |
| KES 500 | KES 50 |
| KES 1,000 | KES 100 |

There is no minimum commission.

Requirements:

- Commission is calculated using the final approved delivery fee.
- Commission is payable by the carrier to Beba's designated Till.
- Commission becomes payable after successful delivery confirmation.
- Carriers must settle outstanding commission before accepting another eligible delivery.
- Failed and cancelled deliveries require a separate commission review process.
- Commission calculations and payments must be recorded.
- Payment verification should use a trusted payment integration where available.

## 12. Delivery assignment

A carrier assignment must only be created after the sender selects a carrier.

Requirements:

- The sender's selection creates a pending assignment.
- The selected carrier receives the assignment details.
- The carrier may accept or decline.
- The delivery becomes active only after acceptance.
- Only one active carrier assignment may exist for a delivery at a time.
- Assignment decisions must be recorded with timestamps.
- A declined or cancelled assignment must not erase the delivery history.

## 13. Delivery tracking and status management

Beba must provide meaningful delivery progress updates.

Proposed delivery statuses:

1. Draft.
2. Awaiting carrier.
3. Carrier selected.
4. Awaiting carrier confirmation.
5. Carrier confirmed.
6. Goods collected.
7. In transit.
8. Arrived at handover point.
9. Awaiting receiver confirmation.
10. Completed.

Alternative statuses:

- Cancelled.
- Failed.
- Under review.
- Disputed.
- Returned.

Each important status change should record:

- Delivery reference.
- Previous status.
- New status.
- Person or system responsible.
- Timestamp.
- Relevant notes or evidence.

Continuous GPS tracking is not required for the initial MVP.

## 14. Pickup confirmation

The system must distinguish pickup confirmation from successful delivery.

Requirements:

- Pickup confirmation must be recorded.
- A pickup PIN or other approved confirmation method may be used.
- The pickup event must have a timestamp.
- Supporting evidence may be submitted where appropriate.
- Pickup confirmation must not automatically mark the delivery as completed.

## 15. Receiver experience and delivery confirmation

The receiver should be able to confirm that the goods have arrived.

Requirements:

- Receiver receives a confirmation link or another approved method.
- Receiver can confirm receipt.
- Confirmation is recorded with a timestamp.
- Rating the carrier is optional and separate from confirmation.
- The system records deliveries awaiting confirmation.
- Reminders and support follow-up should be available.
- Lack of confirmation must not automatically be treated as successful delivery.

Where confirmation is missing, the delivery should remain unresolved until the appropriate follow-up process is completed.

The exact confirmation method remains to be finalised.

## 16. Disputes and incidents

The system should allow authorised users to report:

- Missing goods.
- Damaged goods.
- Delayed deliveries.
- Delivery to the wrong recipient.
- Other delivery-related incidents.

Requirements:

- Incident reports must be associated with a delivery.
- Reports must include a description and reporting user.
- Supporting evidence may be submitted.
- Administrators must be able to review incidents.
- Investigation and resolution statuses must be recorded.
- Resolution notes must be retained.

Beba's precise legal responsibilities and liability limitations must be reviewed by a qualified Kenyan legal professional. A disclaimer alone does not automatically remove legal obligations.

## 17. Client tracking link

A sender should be able to share a tracking link with a receiver or another authorised person.

The link should provide relevant delivery information, such as:

- Delivery reference.
- Delivery status.
- Relevant milestones.
- Estimated or confirmed delivery information where available.
- Confirmation option, where applicable.

Tracking links must use secure, non-guessable tokens and must not expose private account information, identity documents or unnecessary personal data.

## 18. Payments and financial records

The system must maintain records of:

- Delivery fee.
- Confirmed delivery price.
- Carrier payment arrangement.
- Beba commission.
- Commission payment reference.
- Payment amount.
- Payment date.
- Payment status.
- Refunds or adjustments where applicable.

M-Pesa is a potential payment channel.

The system must not store M-Pesa PINs. Payment screenshots alone should not be treated as authoritative proof where transaction verification is available.

The exact sender-to-carrier payment workflow remains outstanding.

## 19. Notifications and communication

The platform should support notifications for:

- Delivery request creation.
- Carrier selection.
- Carrier acceptance or decline.
- Pickup confirmation.
- Delivery progress.
- Arrival at destination or handover point.
- Receiver confirmation.
- Dispute updates.
- Commission payment reminders.

The initial notification channels and in-app communication scope remain to be confirmed.

## 20. Administrator dashboard

Beba administrators should be able to:

- Review carrier applications.
- Approve or reject carrier applications.
- Review business applications.
- Manage pricing rules.
- View delivery requests and assignments.
- Review delivery status history.
- Review disputes and incidents.
- View commission records and payment status.
- Manage relevant user restrictions.
- Review audit logs.

Administrative actions must be permission-controlled and recorded.

## 21. Data management and security

The system must:

- Use secure authentication.
- Enforce role-based access.
- Validate important operations on the backend.
- Store delivery and account records in a database.
- Store identity documents and evidence in restricted private storage.
- Protect sensitive information in transit and at rest.
- Maintain audit logs for important administrative and financial actions.
- Support appropriate backups and recovery.
- Apply defined retention and deletion rules.
- Restrict access to sensitive verification information.

The architecture and data protection arrangements must be reviewed before launch. Kenyan data protection requirements and any applicable GDPR obligations must be assessed.

## 22. Non-functional requirements

The product should be designed for:

- Mobile-friendly use.
- Clear and accessible interfaces.
- Reliable delivery record keeping.
- Secure access to personal information.
- Scalable database design.
- Maintainable backend services.
- Clear error handling.
- Consistent timestamps and transaction records.
- Reasonable performance on common mobile connections.

## 23. Initial technical direction

The current prototype is a single-file HTML demonstration.

The proposed production architecture is:

- Frontend: web application, with mobile-friendly design.
- Backend: API and business logic.
- Database: relational database, with Supabase under evaluation.
- File storage: private storage for verification and delivery evidence.
- Version control: GitHub.
- Hosting: to be selected after technical evaluation.

The prototype's sample data, illustrative map, browser-generated PINs and placeholder verification screens must not be treated as production functionality.

## 24. MVP acceptance criteria

The initial MVP should not be considered complete until:

1. A user can register and access an individual account.
2. A user can apply to become a carrier.
3. An administrator can review and approve carrier applications.
4. A business application can be submitted and reviewed.
5. A sender can create a delivery request.
6. The system calculates a delivery price using approved pricing rules.
7. The sender can browse approved carrier profiles.
8. The sender can contact and select a carrier.
9. The carrier can accept or decline the assignment.
10. Delivery milestones can be recorded.
11. Pickup confirmation is distinct from receiver confirmation.
12. A receiver can confirm delivery through the approved method.
13. Commission can be calculated and recorded.
14. Delivery incidents can be reported and reviewed.
15. Users can access only information they are authorised to see.
16. Important actions are recorded in an audit trail.

## 25. Success metrics

Initial measures should include:

- Number of registered senders.
- Number of approved carriers.
- Number of delivery requests created.
- Percentage of requests receiving a carrier selection.
- Percentage of accepted assignments.
- Percentage of completed deliveries.
- Average time from request creation to carrier acceptance.
- Receiver confirmation rate.
- Dispute and incident rate.
- Commission collected.
- Repeat sender and carrier activity.

Metrics should be interpreted carefully and should not encourage unsafe delivery practices or inappropriate pressure on users.

## 26. Development phases

### Phase 1 — Product definition

Complete the requirements, user journeys and product decisions.

### Phase 2 — Technical planning

Finalise database design, architecture, API requirements, security and business logic.

### Phase 3 — MVP development

Build accounts, profiles, delivery requests, carrier discovery, assignments and core tracking.

### Phase 4 — Payments and trust workflows

Implement commission records, payment verification, confirmation and incident management.

### Phase 5 — Testing

Test security, permissions, user journeys, calculations and failure scenarios.

### Phase 6 — Pilot

Launch with a controlled group of users and carriers in the selected pilot location.

### Phase 7 — Improvement

Use pilot feedback and operational data to prioritise improvements.

## 27. Key risks

| Risk | Mitigation |
|---|---|
| False or incomplete carrier identity information | Manual review and appropriate verification |
| Unclear delivery responsibility | Clear agreements, milestones and incident handling |
| Commission avoidance | Server-side price and commission records |
| Incorrect pricing | Configurable rules and controlled adjustments |
| Missing delivery confirmation | Reminders and escalation process |
| Exposure of personal data | Access controls, private storage and security review |
| Unauthorised business activity | Approval and membership permissions |
| Poor carrier or sender experience | Pilot testing and user feedback |

## 28. Outstanding decisions

The following are not yet final:

- Initial pilot city or town.
- Carrier contact method.
- Parcel size and weight limits.
- Quote validity period.
- Inter-town tariff model.
- Sender-to-carrier payment workflow.
- Failed delivery commission rules.
- Receiver confirmation method.
- Verification provider and process.
- Initial notification channels.
- Final technology stack.
- Legal and data protection review.

These must be resolved before the relevant features are treated as ready for production.

---

## 29. Product direction

Beba is a platform that helps senders and carriers connect and coordinate deliveries.

The sender remains responsible for choosing the carrier. Beba provides the tools, information, pricing framework, records and coordination infrastructure needed to support that process.

The MVP should prioritise a reliable delivery workflow, transparent pricing, controlled carrier onboarding and clear delivery records before adding more advanced features.

**Document status:** Working draft. Confirmed decisions are also recorded in `docs/02-decisions/decision-log.md`

# Beba Repository Guide

Beba is a delivery coordination platform with an early browser prototype and a set of product, technical, security, testing, and launch documents.

## Repository layout

- `prototype/index.html` — runnable browser-only product demonstration
- `docs/01-product/` — product journeys
- `docs/02-decisions/` — decision log
- `docs/03-product-specifications/` — pricing and payment specifications
- `docs/04-technical-design/` — architecture, API, and database design
- `docs/05-security/` — security, privacy, and incident management
- `docs/06-testing/` — testing and acceptance criteria
- `docs/07-launch/` — pilot launch plan
- `.agents/skills/` — reusable repository-specific agent instructions

## View the prototype

Open `prototype/index.html` directly in a browser. No build step or backend is currently required.

The prototype uses browser memory and demonstration data. It does not provide real authentication, payments, tracking, storage, or production security.

## Development workflow

- The Next.js app's mobile-style welcome and email authentication are described in [Supabase setup](docs/04-technical-design/supabase-setup.md). This web app is separate from the static prototype and is not yet a Play Store app.
- The app already uses TypeScript and Tailwind CSS. Its reusable animated authentication component is in `components/ui/`; the shadcn CLI is not initialized. To add shadcn components later, run `npx shadcn@latest init` and review the generated configuration before applying it.
- Create work on a feature branch rather than `main`.
- Keep documentation in the numbered `docs/` structure.
- Update relative links when files or directories move.
- Do not commit secrets or private identity documents.
- Before committing, run:

```bash
git diff --check
git status --short --branch
```
