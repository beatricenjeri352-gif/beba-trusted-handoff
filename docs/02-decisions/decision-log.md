# BEBA — Product Decision Log

**Version:** 1.0  
**Status:** Working document  
**Purpose:** Record agreed product decisions, prevent conflicting requirements and track outstanding questions.

---

## 1. Accounts and user profiles

| Decision | Agreed direction |
|---|---|
| Account roles | One individual account can act as both sender and carrier. |
| Carrier profile | Optional. Users apply to become carriers when interested. |
| Business accounts | Separate business profiles linked to individual user accounts. |
| Business ownership | One user can own or manage multiple businesses. |
| Business creation | Applications require Beba approval before activation. |
| Business membership | Multiple authorised users can be associated with a business. |

## 2. Carrier verification and trust

- Beba manually reviews carrier identity documents initially.
- The identity document must match the live face of the applicant.
- The person accepting a delivery must match the verified carrier.
- Guarantors are not required at this stage.
- Duplicate identity numbers must be rejected.
- Carrier approval is required before accepting deliveries.
- Private identity documents must never appear in the public carrier directory.

**Important:** Identity and biometric verification require appropriate privacy safeguards, security controls and legal review before real customer data is collected.

## 3. Delivery creation and carrier selection

**Agreed delivery sequence:**

1. Sender creates a delivery request.
2. Beba calculates the delivery price.
3. Sender browses the available approved carrier profiles.
4. Sender chooses which carrier to contact.
5. Sender and carrier discuss and agree on the arrangement.
6. Sender selects their preferred carrier through Beba.
7. Carrier accepts or declines the assignment.
8. If accepted, the delivery becomes active.

Beba should act as a platform connecting senders and carriers. It should not automatically select a carrier or make the decision on behalf of the sender.

Senders make their own carrier choices using the information available on carrier profiles.

## 4. Carrier directory

The directory should provide factual information that helps senders make their own decisions.

Potential profile information:

- Carrier name and profile photograph, where provided.
- Verification status.
- Operating town or service area.
- Delivery methods supported.
- Relevant vehicle information.
- Completed delivery count.
- Ratings, where sufficient feedback exists.
- Contact options.

Beba should not automatically rank or assign carriers.

## 5. Pricing model

**Agreed approach: Hybrid pricing.**

The delivery price should consider:

- Distance.
- Parcel size.
- Parcel weight.
- Delivery method.
- Additional approved service charges where applicable.

The pricing engine should calculate prices using configurable rates rather than fixed values embedded in the application code.

**Price visibility:** Relevant pricing information should be visible to all parties.

**Price adjustments:** Changes require Beba approval and agreement from both sender and carrier. Original and revised prices must be recorded, including the reason for the change.

Actual tariffs and calculation rules remain outstanding.

## 6. Beba commission

The agreed commission is the greater of:

- 10% of the delivery fee; or
- KES 110.

Formula:

`Commission = MAX(10% × delivery fee, KES 110)`

Examples:

| Delivery fee | Beba commission |
|---:|---:|
| KES 500 | KES 110 |
| KES 1,000 | KES 110 |
| KES 1,500 | KES 150 |
| KES 2,000 | KES 200 |
| KES 5,000 | KES 500 |

- Commission is paid by the carrier to Beba's designated Till.
- Commission becomes payable after successful delivery confirmation.
- The carrier must settle outstanding commission before accepting another eligible delivery.
- Failed and cancelled deliveries require separate commission treatment.
- Commission is calculated from the final approved delivery fee, not the parcel value.

## 7. Delivery confirmation

- Pickup confirmation and receiver confirmation are separate events.
- A pickup PIN confirms collection, not successful delivery.
- The receiver should confirm receipt.
- Rating the carrier is optional and separate from confirming receipt.
- If the receiver does not confirm, the delivery should remain unresolved until the appropriate follow-up process is completed.
- Beba should provide an incident-reporting and dispute process.

## 8. Delivery tracking

The initial MVP should use delivery milestones, timestamps and location information.

Proposed delivery statuses:

1. Draft
2. Awaiting carrier
3. Carrier selected
4. Awaiting carrier confirmation
5. Carrier confirmed
6. Goods collected
7. In transit
8. Arrived at handover point
9. Awaiting receiver confirmation
10. Completed

Alternative statuses include cancelled, failed, under review, disputed and returned.

Continuous GPS tracking is not a requirement for the initial MVP.

## 9. Data and technical direction

- Customer and delivery records should be stored in a backend database.
- Identity documents and delivery evidence should be stored in restricted private file storage.
- The backend must enforce permissions and validate important business rules.
- Financial calculations must happen on the backend.
- All important delivery status and financial changes should be recorded.
- Supabase is a candidate backend, subject to final technical evaluation.
- GitHub is the main repository for Beba's code and documentation.

## 10. Decisions still outstanding

These questions must be resolved before the relevant features are implemented.

| Area | Outstanding question |
|---|---|
| Carrier contact | Direct phone, in-app messaging, or both? |
| Pricing | What are the actual distance, parcel and service rates? |
| Parcel limits | What sizes and weights will Beba accept? |
| Quotes | How long should a calculated price remain valid? |
| Inter-town delivery | Which route-based tariffs should apply? |
| Payments | How exactly will senders pay carriers? |
| Failed delivery | What commission rules apply when delivery fails? |
| Verification | Which identity verification provider or process will be used? |
| Launch | Which Kenyan town or city will be the initial pilot location? |
| Compliance | What legal and data protection requirements must be completed before launch? |

---

## 11. How to maintain this document

Whenever a new product decision is made:

1. Record the decision here.
2. Mark it as confirmed or pending.
3. Update the relevant product or technical document.
4. Ensure the prototype and eventual application reflect the approved decision.
5. Record changes rather than silently replacing earlier decisions.

**Golden rule:** A discussion is not automatically an approved requirement. Only decisions explicitly confirmed should be treated as final.
