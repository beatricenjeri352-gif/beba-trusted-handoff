# Beba – Security and Privacy Requirements

**Version:** 1.0  
**Status:** Proposed – Not yet implemented  
**Purpose:** Define how Beba will protect user accounts, personal information, identity documents and delivery records.

## 1. Introduction

Security and privacy must be considered from the beginning of Beba's development.

Beba will collect and process information from senders, carriers, receivers and businesses. Some of this information is sensitive and must be protected against unauthorised access, misuse, alteration or disclosure.

These requirements will guide the development of Beba's authentication, database, file storage, verification and administrative systems.

## 2. Information Beba May Collect

The platform may collect the following categories of information.

### 2.1 Account Information
- Full name.
- Phone number.
- Email address, where provided.
- Account roles.
- Login and account activity records.

### 2.2 Identity Verification Information
- National identity document details.
- Identity document images, where required.
- Verification status.
- Verification date.
- Name of the authorised reviewer.
- Verification outcome and relevant review notes.

Identity documents must only be accessible to authorised personnel.

### 2.3 Delivery Information
- Sender and receiver details.
- Pickup and destination addresses or coordinates.
- Parcel description.
- Delivery instructions.
- Carrier details.
- Delivery status and timestamps.
- Delivery confirmation records.

### 2.4 Payment Information
- Delivery fees.
- Commission amounts.
- Payment references.
- Payment dates.
- Payment status.
- Relevant payment provider transaction identifiers.

Beba must never collect or store M-Pesa PINs or banking passwords.

### 2.5 Evidence and Incident Information
- Delivery photographs, where applicable.
- Collection and delivery confirmation records.
- Incident reports.
- Dispute information.
- Relevant communication and investigation records.

## 3. Authentication and Account Security

Beba must provide secure account access.

Requirements:

1. Users must authenticate before accessing protected account information.
2. Passwords must never be stored in plain text.
3. Passwords must be securely hashed using an appropriate password-hashing method if password-based authentication is implemented.
4. Users must be able to recover access through a secure process.
5. Sessions must expire according to defined security policies.
6. Suspicious login activity should be monitored.
7. Additional verification may be required when a user logs in from a new or suspicious device.
8. Users must be able to securely log out.

Authentication technology will be selected during technical implementation.

## 4. User Roles and Access Permissions

Beba must enforce access permissions according to user roles and ownership.

| User role | Permitted access |
|---|---|
| Sender | Own delivery requests, selected carrier details and delivery updates |
| Carrier | Assigned deliveries, relevant sender and receiver information, own carrier profile |
| Receiver | Relevant delivery information and delivery confirmation |
| Business member | Business deliveries according to assigned permissions |
| Beba administrator | Restricted administrative access according to assigned responsibilities |

Additional rules:

- Users must not access another user's private records without authorisation.
- Carriers must only access delivery information relevant to their assignments.
- Receivers must not access unrelated deliveries.
- Business members must only access information permitted by their business roles.
- Administrative access must be restricted and recorded.
- Identity documents must not be visible to ordinary users.

## 5. Identity Verification and Carrier Approval

Beba intends to manually verify carrier identities during the initial stage.

The verification process should include:

1. Collection of required identity information through a secure process.
2. Review of the identity document by an authorised Beba representative.
3. Comparison of the registered person's identity with their live appearance.
4. Recording of the verification decision.
5. Approval or rejection of the carrier profile.

The system should prevent duplicate identity document numbers from being registered where applicable.

Only approved carriers should be eligible to receive delivery assignments.

### Additional safeguards

- Identity verification must not automatically be treated as proof that an identity document is authentic.
- Failed or uncertain verification results must be escalated for human review.
- Re-verification may be required following suspicious account changes.
- Verification decisions must be recorded with reviewer identity and timestamps.
- Identity information must not be used for unrelated purposes.

### Biometric information

If Beba introduces facial recognition or automated biometric matching, it must first assess the legal, technical and privacy requirements.

Beba should not build or retain its own facial recognition database without an appropriate legal basis, safeguards and specialist assessment.

## 6. Data Storage and Protection

Beba will use a backend database to store structured information and private file storage for documents and evidence.

Requirements:

- Sensitive information must be stored securely.
- Communication between the application and backend must use HTTPS.
- Private files must not be publicly accessible.
- Database access must be restricted.
- Production credentials must not be exposed in frontend code or public repositories.
- Backups must be maintained securely.
- Data must be protected against unauthorised alteration or deletion.
- Development and testing environments must not use real identity documents or unnecessary real personal information.

The final database and storage technology will be selected during technical planning.

## 7. Data Privacy and User Rights

Beba must explain clearly what information it collects and why.

Users should be informed about:

- Information collected.
- Purpose of collection.
- How information is used.
- Who may access or receive the information.
- How long information is retained.
- How users can exercise their data rights.
- How to contact Beba about privacy concerns.

Beba must establish appropriate procedures for handling requests concerning access, correction, deletion and other applicable data protection rights.

Consent must be obtained where legally required. Consent should not be treated as a substitute for identifying the correct lawful basis for every processing activity.

## 8. Data Retention and Deletion

Beba must establish a retention schedule for each category of information.

Examples:

| Information | Retention consideration |
|---|---|
| User account information | While the account is active and for any legally required period |
| Identity documents | Only as long as necessary for the verification purpose and applicable obligations |
| Delivery records | According to operational and legal requirements |
| Payment records | According to applicable financial and tax requirements |
| Delivery evidence | According to dispute, operational and legal requirements |
| Audit logs | According to security and compliance requirements |

Deletion procedures must ensure that information is removed or securely anonymised when no longer required, subject to applicable legal retention obligations.

## 9. Location and Delivery Privacy

Delivery locations may expose users' homes, workplaces or other sensitive information.

Requirements:

- Pickup and destination details must only be visible to authorised participants.
- Exact location information must not be publicly displayed in carrier directories.
- Carriers should receive the location information needed to perform an assigned delivery.
- Unauthorised users must not access delivery coordinates.
- Location information must not be used for unrelated tracking.
- Continuous GPS tracking should not be introduced without a clear purpose, appropriate safeguards and user information.

## 10. Payment Security

Payment operations must be handled securely.

Requirements:

- Payment calculations must be performed by the backend.
- Payment confirmations must be verified through trusted payment provider responses or reconciliation.
- Payment records must be linked to the relevant delivery or commission record.
- Duplicate payment callbacks must not create duplicate transactions.
- Users must not be able to alter confirmed payment records.
- M-Pesa PINs must never be requested or stored.

## 11. Audit Logs and Administrative Monitoring

Beba must maintain records of important system actions.

Audit logs should capture:
- User account creation and important changes.
- Carrier verification decisions.
- Delivery creation and status changes.
- Carrier selection and acceptance.
- Price adjustments and approvals.
- Commission and payment status changes.
- Dispute updates.
- Administrative access to sensitive records.

Each relevant record should include:
- Action performed.
- User or administrator responsible.
- Date and time.
- Related record reference.
- Relevant outcome.

Audit logs should be protected against unauthorised modification.

## 12. Security Incident and Data Breach Response

Beba must establish a response procedure for suspected security incidents.

Examples include:
- Unauthorised access to user accounts.
- Exposure of identity documents.
- Loss of personal information.
- Compromised administrator accounts.
- Unauthorised database access.
- Payment-related fraud.

The response process should include:

1. Detect and report the incident.
2. Restrict further unauthorised access.
3. Preserve relevant evidence.
4. Assess the type and extent of information affected.
5. Identify the people and systems affected.
6. Take corrective action.
7. Notify affected parties and relevant authorities where legally required.
8. Document the incident and lessons learned.

## 13. Legal and Regulatory Considerations

Beba's initial operations are intended for Kenya.

The platform must be assessed against applicable requirements, including:

- Kenya Data Protection Act, 2019.
- Relevant Office of the Data Protection Commissioner (ODPC) regulations and guidance.
- Applicable requirements relating to sensitive personal data and biometric information.
- Consumer protection and electronic transactions requirements where applicable.

Because development and operations may involve processing from Germany or other European jurisdictions, GDPR applicability must also be assessed.

Before collecting real identity documents or biometric information, Beba should obtain appropriate legal and data protection advice. It should also assess whether registration with the relevant data protection authority and a Data Protection Impact Assessment are required.

## 14. Implementation Priorities

### Required before a real-user pilot
- Secure authentication.
- Role-based access control.
- Private identity document storage.
- Restricted administrator access.
- HTTPS communication.
- Secure backend validation.
- Privacy notice and appropriate legal documentation.
- Data retention and deletion procedures.
- Audit logging for important actions.
- Incident reporting and response procedures.

### Additional safeguards to assess
- Multi-factor authentication for administrators.
- Suspicious login detection.
- Automated security monitoring.
- Specialist identity verification provider.
- Security testing and vulnerability assessments.

## 15. Outstanding Decisions

The following decisions must be finalised before production implementation:

- Authentication provider.
- Identity verification process and provider, if any.
- Identity document retention period.
- Data hosting location.
- Backup and recovery arrangements.
- Administrator permission levels.
- Privacy request handling process.
- Applicable data protection registration and assessment requirements.

## 16. Related Documentation

- `docs/01-product/product-requirements.md`
- `docs/01-product/user-journeys.md`
- `docs/02-product/decision-log.md`
- `docs/03-technical-design/database-design.md`
- `docs/03-technical-design/system-architecture.md`
- `docs/03-technical-design/api-specification.md`
- `docs/documentation-roadmap.md`

**End of document.**
