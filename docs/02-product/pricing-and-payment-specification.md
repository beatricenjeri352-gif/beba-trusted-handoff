# Beba – Pricing and Payment Specification

**Version:** 1.0  
**Status:** Proposed – Pending final pricing decisions  
**Purpose:** Define how delivery prices, carrier payments and Beba commissions will work.

## 1. Overview

Beba will provide a platform connecting senders with approved carriers.

The platform will calculate delivery prices using configurable pricing rules. Senders and carriers will be able to see the applicable price before proceeding with a delivery arrangement.

Beba earns revenue through a commission charged to carriers for successfully completed deliveries.

The pricing and payment system must be transparent, consistent and protected against unauthorised changes.

## 2. Pricing Model

Beba will use a hybrid pricing model.

The delivery price will consider:

1. Distance between pickup and destination.
2. Parcel size and weight.
3. Delivery type.
4. Additional service requirements, where applicable.

The pricing engine should use configurable rates rather than fixed amounts hardcoded into the application.

### 2.1 Proposed pricing formula

**Delivery price = Base fee + Distance charge + Parcel charge + Applicable service charges**

The exact rates will be configured after market research and pricing validation.

### 2.2 Distance calculation

For local deliveries, Beba should calculate the actual road distance between pickup and destination using a mapping service.

For inter-town deliveries, Beba may use route-specific tariffs where these better reflect actual transport costs.

Straight-line distance should not be treated as the final delivery distance when road distance is required.

### 2.3 Parcel pricing

The pricing engine should support:
- Parcel size.
- Parcel weight.
- Delivery type.
- Special handling requirements, where applicable.

The final parcel measurement rules and pricing bands remain to be confirmed.

## 3. Price Visibility

Delivery pricing should be transparent.

Relevant price information should be visible to:
- Sender.
- Selected carrier.
- Receiver, where relevant to the delivery arrangement.

The sender and carrier should see the applicable delivery price before confirming their arrangement.

The receiver may see relevant delivery information but is not automatically responsible for payment.

The system should distinguish between:
- Estimated price.
- Confirmed delivery price.
- Approved revised price.

## 4. Price Adjustments

Price adjustments must not happen informally or without a recorded approval process.

A revised price requires:
1. A valid reason for the change.
2. Approval through Beba's defined process.
3. Agreement from both sender and carrier.
4. A recorded adjustment in the delivery record.

The system must retain:
- Original price.
- Revised price.
- Reason for adjustment.
- Person requesting the change.
- Approval details.
- Date and time of approval.

The original price must never be overwritten without preserving its history.

## 5. Sender-to-Carrier Payments

The sender pays the carrier directly.

The payment may take place before or after delivery, depending on the agreed arrangement between sender and carrier.

Beba's role is to record the agreed payment arrangement and relevant payment information.

The platform should not imply that Beba guarantees a carrier's payment or delivery performance unless a separate service is introduced.

The final payment methods and any in-app payment functionality remain subject to technical and business decisions.

## 6. Beba Commission Model

Beba earns commission from carriers for successfully completed deliveries.

The agreed commission rule is:

**Beba commission = the greater of 10% of the final approved delivery fee or KES 110.**

The commission is calculated using the final approved delivery fee, not the value of the parcel.

### 6.1 Commission examples

| Delivery fee | 10% calculation | Beba commission |
|---:|---:|---:|
| KES 300 | KES 30 | KES 110 |
| KES 500 | KES 50 | KES 110 |
| KES 1,000 | KES 100 | KES 110 |
| KES 1,100 | KES 110 | KES 110 |
| KES 1,500 | KES 150 | KES 150 |
| KES 2,000 | KES 200 | KES 200 |
| KES 5,000 | KES 500 | KES 500 |

The backend must calculate the commission automatically.

Users must not be able to manually edit the calculated commission.

## 7. Commission Payment Process

The agreed commission process is:

1. Sender creates a delivery request.
2. Beba calculates the delivery price.
3. Sender contacts and selects a carrier.
4. Carrier accepts the assignment.
5. Carrier completes the delivery.
6. Receiver confirms receipt, or the delivery is completed through an authorised review process.
7. Beba calculates the carrier's commission.
8. Carrier pays Beba through the designated Till.
9. Beba records and verifies the payment.
10. Carrier becomes eligible to accept another delivery, subject to any other applicable account restrictions.

A carrier with an outstanding commission requirement must not accept another eligible delivery until the payment has been verified.

The commission is separate from the payment the sender makes to the carrier.

## 8. Commission Payment Verification

Beba intends to use its designated M-Pesa Till for commission collection.

The system should eventually support automated payment verification through a suitable M-Pesa integration.

Until integration is implemented, a controlled manual reconciliation process may be used.

Each commission payment record should include:
- Carrier account.
- Delivery reference.
- Commission amount.
- Amount paid.
- M-Pesa transaction reference.
- Payment date and time.
- Verification status.
- Verification method.

Screenshots alone should not be treated as reliable proof of payment.

The platform must never request or store the carrier's M-Pesa PIN.

## 9. Failed and Cancelled Deliveries

Commission must not automatically be charged as though every delivery were successful.

The system should distinguish between:
- Successfully completed deliveries.
- Cancelled deliveries.
- Failed deliveries.
- Disputed deliveries.
- Deliveries awaiting investigation.

For failed or cancelled deliveries, the commission outcome must be determined according to the documented reason and Beba's approved policy.

Where an incident is reported, the relevant commission record should be placed under review until an authorised decision is made.

## 10. Payment and Transaction Records

Beba must maintain reliable records of financial activity.

The system should record:
- Delivery fee.
- Original and revised prices.
- Commission amount.
- Commission payment status.
- Sender-to-carrier payment arrangement.
- Relevant transaction references.
- Payment timestamps.
- Reconciliation and verification results.

Financial records must be protected against unauthorised alteration.

## 11. Preventing Commission Avoidance

Beba's pricing and commission model should reduce opportunities for users to bypass the platform's commission.

Controls should include:
- Calculating the delivery price through Beba's backend.
- Displaying the confirmed price to relevant parties.
- Recording the final approved price.
- Linking commission records to delivery references.
- Keeping an audit trail of price changes.
- Requiring the commission to be settled before the carrier accepts another eligible delivery.

The platform should not rely solely on users voluntarily reporting the final delivery price.

## 12. Pricing Administration

Beba administrators should be able to manage pricing rules through controlled administrative functions.

Requirements:
- Only authorised administrators can change pricing rules.
- Every pricing change must be recorded.
- Pricing changes should apply according to a defined effective date.
- Existing confirmed delivery prices must not change automatically when new pricing rules are introduced.
- Commission calculations must use the final approved delivery fee.

Pricing configuration should support future expansion to additional routes and delivery categories.

## 13. Outstanding Pricing Decisions

The following details must be finalised before production implementation:

1. Exact base delivery fees.
2. Distance pricing rates.
3. Parcel size and weight categories.
4. Pricing differences between local and inter-town deliveries.
5. Quote validity period.
6. Additional service charges.
7. Payment timing options.
8. Commission treatment for specific failed or cancelled delivery scenarios.
9. M-Pesa integration and reconciliation approach.

These decisions should be validated through research and pilot testing rather than invented.

## 14. Implementation Requirements

The backend must:
- Calculate prices and commissions.
- Store the pricing rules used for each quote.
- Preserve confirmed prices.
- Record approved adjustments.
- Verify commission payment status.
- Prevent duplicate payment records.
- Maintain transaction history.
- Apply carrier eligibility rules.

The frontend should display pricing information clearly but must never be the authority for calculating or approving financial transactions.

## 15. Related Documentation

- `docs/01-product/product-requirements.md`
- `docs/01-product/user-journeys.md`
- `docs/02-product/decision-log.md`
- `docs/03-technical-design/database-design.md`
- `docs/03-technical-design/api-specification.md`
- `docs/03-technical-design/system-architecture.md`
- `docs/documentation-roadmap.md`

**End of document.**
