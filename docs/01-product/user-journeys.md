# BEBA — User Journeys and Workflows

**Version:** 1.0  
**Status:** Working draft  
**Related document:** `product-requirements.md`

## 1. Purpose

This document describes how senders, carriers, receivers, business users and administrators interact with Beba.

It translates product requirements into practical workflows that guide interface design, backend development and testing.

---

## 2. Journey A: Individual registration

**User:** Individual

1. User opens Beba.
2. User selects registration.
3. User enters required personal information.
4. User provides a phone number and completes the required verification.
5. User creates login credentials or uses the approved authentication method.
6. Beba creates an individual account.
7. User accesses their account.

**Expected outcome:** The user has an active individual account and can use sender features.

**Important rules:**
- One individual account can support both sender and carrier roles.
- A user does not need to apply as a carrier to send goods.
- Authentication and phone verification must happen securely.

---

## 3. Journey B: Applying to become a carrier

**User:** Existing individual user

1. User opens their profile.
2. User selects "Become a carrier".
3. User completes the carrier application.
4. User provides required service and operating information.
5. User submits identity verification information.
6. Beba records the application as pending.
7. An authorised administrator reviews the application.
8. Administrator approves, rejects or requests additional information.
9. Beba updates the carrier's application status.
10. An approved carrier profile becomes visible in the carrier directory.

**Expected outcome:** An approved carrier can be discovered and selected by senders.

**Important rules:**
- Carrier profiles are optional.
- A carrier cannot accept delivery assignments before approval.
- Private identity documents are not visible in the public directory.
- Verification decisions must be recorded.

---

## 4. Journey C: Creating a delivery request

**User:** Individual or authorised business sender

1. Sender signs in.
2. Sender selects "Create delivery".
3. Sender selects a delivery method:
   - Within town.
   - To a stage or handover point.
   - Inter-town.
4. Sender enters pickup details.
5. Sender enters destination details.
6. Sender provides receiver details.
7. Sender enters parcel description, size and weight.
8. Sender adds special handling instructions if necessary.
9. Beba calculates the delivery price.
10. Sender reviews the delivery details and price.
11. Sender submits the request.
12. Beba generates a unique delivery reference.
13. The request becomes available for the sender to browse relevant approved carriers.

**Expected outcome:** A delivery request exists and is ready for carrier discovery.

**Important rules:**
- A delivery must have a sender.
- Business deliveries must be associated with an authorised business profile.
- Price calculations happen on the backend.
- A request does not become assigned merely because it has been created.

---

## 5. Journey D: Finding and contacting a carrier

**User:** Sender

1. Sender opens their newly created delivery request.
2. Sender views the available approved carrier directory.
3. Beba displays relevant carrier profiles.
4. Sender reviews the available factual information.
5. Sender independently chooses which carrier to contact.
6. Sender initiates contact using the contact options supported by Beba.
7. Beba records the contact request where technically possible.
8. Sender and carrier discuss the delivery arrangement.
9. Sender decides whether to proceed with that carrier.

**Expected outcome:** The sender identifies a preferred carrier.

**Important rules:**
- Beba does not automatically select a carrier.
- Browsing a carrier does not create an assignment.
- Contacting a carrier does not create an assignment.
- Carrier contact options remain to be finalised.
- If contact takes place outside Beba, the system must not falsely claim that a conversation occurred.

---

## 6. Journey E: Selecting a carrier

**Users:** Sender and selected carrier

1. Sender selects the preferred carrier from the directory.
2. Beba creates a pending assignment.
3. The carrier receives the assignment details.
4. Carrier reviews the request.
5. Carrier accepts or declines.
6. If declined, the sender can return to the directory and choose another carrier.
7. If accepted, Beba records the assignment and updates the delivery status.
8. Sender can view the assigned carrier and delivery progress.

**Expected outcome:** One carrier is formally assigned to the delivery after acceptance.

**Important rules:**
- The sender initiates selection.
- Carrier acceptance is required.
- Only one active assignment can exist for a delivery.
- Selection and acceptance must be recorded separately.

---

## 7. Journey F: Carrier collects the parcel

**User:** Carrier

1. Carrier opens the assigned delivery.
2. Carrier reviews pickup instructions.
3. Carrier travels to the pickup location.
4. Carrier and sender coordinate the handover.
5. Carrier collects the parcel.
6. The approved pickup confirmation process is completed.
7. Beba records the collection event and timestamp.
8. Delivery status changes to "Goods collected".
9. Sender can see the update.

**Expected outcome:** The system records that the carrier has collected the parcel.

**Important rules:**
- Pickup confirmation does not mean successful delivery.
- Only authorised users can update the relevant delivery milestone.
- Supporting evidence may be required depending on the delivery method.

---

## 8. Journey G: Delivery progress and handovers

**User:** Carrier

1. Carrier transports the parcel.
2. Carrier updates the delivery progress at relevant milestones.
3. Beba records each status change.
4. Sender can view the latest status.
5. For inter-town deliveries, handover events can be recorded.
6. Relevant vehicle, stage or handover details can be recorded where applicable.
7. Carrier proceeds to the final destination or agreed handover point.

**Expected outcome:** The sender can follow meaningful delivery milestones.

**Important rules:**
- Every important status change must have a timestamp.
- The system must preserve delivery history.
- Continuous GPS tracking is not required in the first MVP.
- Intermediate handovers must be supported where relevant.

---

## 9. Journey H: Receiver confirms delivery

**User:** Receiver

1. Receiver receives a delivery notification or confirmation link.
2. Receiver opens the link.
3. Receiver views relevant delivery information.
4. Receiver confirms whether the goods were received.
5. If received, Beba records the confirmation and timestamp.
6. Delivery status changes to "Completed".
7. Sender and carrier can see the relevant completion update.
8. Receiver may optionally rate the carrier.

**Expected outcome:** Successful receipt is recorded independently from pickup.

**Important rules:**
- Rating is optional.
- Confirmation must be distinct from rating.
- A missing confirmation must not automatically count as successful delivery.
- Secure access must be used for receiver links.

---

## 10. Journey I: Missing receiver confirmation

**User:** Sender, receiver and Beba administrator

1. Delivery reaches the destination.
2. System marks it as awaiting receiver confirmation.
3. Receiver does not confirm within the configured period.
4. Beba sends an appropriate reminder.
5. Sender or carrier may contact the receiver.
6. If confirmation remains unavailable, the issue can be referred to Beba support.
7. Administrator reviews the available information.
8. Administrator records the outcome and next action.

**Expected outcome:** Unconfirmed deliveries are handled deliberately rather than being automatically marked complete.

**Important rules:**
- No assumption that silence means receipt.
- Access to support and incident reporting should remain available.
- Restrictions on new delivery activity, if needed, must not prevent access to essential support.

---

## 11. Journey J: Reporting a delivery incident

**User:** Sender, carrier or receiver

1. User opens the relevant delivery.
2. User selects "Report an issue".
3. User chooses the incident type.
4. User provides a description.
5. User attaches supporting evidence where appropriate.
6. Beba records the incident.
7. An authorised administrator reviews the report.
8. Administrator investigates and records actions.
9. Resolution or next steps are communicated to relevant parties.
10. Incident status is updated.

**Possible incident types:**
- Missing goods.
- Damaged goods.
- Delayed delivery.
- Wrong recipient.
- Other.

**Expected outcome:** Delivery incidents are documented and can be followed up.

---

## 12. Journey K: Carrier commission settlement

**User:** Carrier and Beba finance administrator

1. Delivery is successfully confirmed.
2. Beba calculates the carrier's commission obligation.
3. Carrier receives the amount and payment instructions.
4. Carrier pays Beba's designated Till.
5. Beba verifies the payment through the approved process.
6. Commission record changes to paid.
7. Carrier becomes eligible to accept another delivery, subject to other account requirements.

**Expected outcome:** Commission obligations are accurately calculated and recorded.

**Important rules:**
- Commission uses the final approved delivery fee.
- Commission is the greater of 10% or KES 110.
- Payment screenshots alone are not authoritative where transaction verification is available.
- Failed or cancelled deliveries follow separate rules.

---

## 13. Journey L: Business sender

**User:** Business owner or authorised business member

1. User registers an individual account.
2. User submits a business profile application.
3. Beba reviews the application.
4. Once approved, the business profile becomes active.
5. Business owner invites or adds authorised members through the approved process.
6. Members receive permissions according to their roles.
7. An authorised member creates a delivery under the business profile.
8. The delivery follows the standard sender journey.
9. Beba records both the business and the individual who created the request.

**Expected outcome:** Multiple authorised users can coordinate deliveries for one business.

**Important rules:**
- Business approval is required.
- Membership permissions must be enforced.
- Business ownership and membership changes must be recorded.

---

## 14. Journey M: Beba administrator

**User:** Beba administrator

1. Administrator signs in through a protected administrative account.
2. Administrator views pending applications and operational records.
3. Administrator reviews carrier and business applications.
4. Administrator approves, rejects or requests more information.
5. Administrator reviews pricing configurations and authorised adjustments.
6. Administrator monitors delivery records and incidents.
7. Administrator reviews commission and payment records.
8. Important actions are recorded in the audit log.

**Expected outcome:** Beba can manage platform operations with controlled administrative access.

---

## 15. Shared system rules

Across all journeys:

- Important actions must be recorded.
- Sensitive data must only be visible to authorised users.
- Backend validation must enforce business rules.
- Delivery status changes must follow approved transitions.
- Financial calculations must happen on the backend.
- A delivery request, carrier contact and carrier assignment are three distinct events.
- A carrier is not formally assigned until the sender selects them and the carrier accepts.
- A successful pickup does not equal a successful delivery.
- A successful delivery requires the approved receiver confirmation or reviewed resolution process.

---

## 16. Outstanding workflow decisions

The following details still require confirmation:

1. Carrier contact options.
2. Receiver confirmation method.
3. How long a receiver has to confirm.
4. Reminder frequency and escalation process.
5. Exact inter-town handover workflow.
6. Sender-to-carrier payment arrangement.
7. Failed delivery and cancellation handling.
8. Initial notification channels.

**Document status:** Working draft. Update when the corresponding product decisions are confirmed.
