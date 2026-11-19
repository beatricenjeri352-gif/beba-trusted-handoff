<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Beba Agent Handoff

This file summarizes the approved project direction and the current implementation state. Future agents must follow it together with repository documentation and the active branch. This is a handoff record, not a replacement for Supabase migration review or user approval.

## Project Context

Beba is a Next.js + Supabase delivery coordination platform for senders, carriers, receivers, businesses, and administrators.

Active implementation flow:

- Next.js App Router
- Supabase PostgreSQL, Auth, RLS, and server actions
- TypeScript and Tailwind CSS
- Leaflet and OpenStreetMap for map pinning/search
- Google Maps Routes API for server-side actual road-distance routing
- Carrier application, discovery, selection, and assignment
- Delivery creation with pickup/destination pins and landmarks
- Configurable server-side delivery pricing and commission

## Approved Pricing Rules

The following rules are authoritative:

- Base delivery fee: KES 50.
- Minimum billable distance: 5 km.
- Billable distance: maximum of actual route distance and 5 km.
- Walking rate: KES 10 per billable km.
- Bicycle rate: KES 20 per billable km.
- Motorbike/motorcycle rate: KES 20 per billable km.
- Car rate: KES 20 per billable km.
- Distinguish walking, bicycle, motorbike, and car in the database and application.
- No automatic weight, parcel-size, traffic, waiting-time, or special-handling charge.
- Additional charges require a reason, carrier proposal, sender agreement, and Beba administrator approval.
- Private negotiations are excluded from Beba commission.
- In-app approved additions are included in the final Beba price.
- Commission: 10% of the final approved Beba delivery price.
- No minimum commission.
- Commission becomes payable after successful receiver confirmation or an authorised review completion.
- Commission and prices must be calculated server-side with integer cents and integer metres.

Formula:

```text
Billable distance = max(actual route distance metres, 5000)
Distance charge = billable distance km × transport rate
Delivery price = 50 + distance charge
Commission = final agreed Beba price × 10%
```

Do not add KES 110, KES minimum commission, parcel surcharges, or traffic surcharges.

## Current Implementation State

- Core delivery creation, profile, map pinning, and location search are implemented.
- Carrier application, carrier discovery, carrier selection, and assignment accept/decline are implemented.
- Carrier assignment read access and atomic selection are prepared in `202611190006_delivery_assignment_permissions.sql`; it has not been applied.
- The pure pricing engine and 21 acceptance tests are implemented.
- Administrator pricing controls and negotiated-charge approval UI are implemented locally; the approved 5 km minimum and 10% commission are fixed.
- The 202611190003 pricing migration has been reviewed and updated locally; it has not been deployed.
- Server-side Google Maps Routes API integration is implemented locally; live API access has not been tested.
- No migration should be deployed without explicit user authorization.

## Database and Migration Rules

- Use numeric cents for money and integer metres for distance.
- Preserve existing quotes and pricing configurations.
- Never use floating-point calculations for financial decisions.
- Create only additive, versioned migrations.
- Do not reset or drop hosted production data.
- Keep RLS enabled for pricing, quotes, negotiated charges, and commission records.
- Only administrators may change pricing configurations.
- Normal users cannot directly modify prices or commission amounts.
- The create-quote RPC must be server-only with a service role.
- Commission must be created only after successful delivery confirmation.

## Routing State

Google Maps Routes API integration must remain server-only.

Required server environment variables:

```text
GOOGLE_MAPS_API_KEY
SUPABASE_SERVICE_ROLE_KEY
```

Do not add either secret to browser code or `NEXT_PUBLIC_*` variables.

Before treating routing as production-ready, verify Google Maps Routes API access in the target environment.

On provider or configuration failure:

- Do not create a quote.
- Return a clear routing/configuration error.
- Do not fall back to straight-line distance.

## Active Branches

- Pricing story: `BE_PRICING_delivery_quotes`
- Carrier epic: `feature/carrier-workflow`
- Completed carrier story: `BE_CARRIER_profile_application`

Never edit `main` directly. Story work must stay on a short-lived story branch cut from the appropriate epic or approved parent branch.

## Required Workflow

Before implementation:

1. Read this file and the relevant approved product/specification documents.
2. Audit existing code and migration state.
3. Identify conflicts between prompts and documentation.
4. Ask for a decision before changing disputed behavior.
5. Keep work in small reviewable story slices.
6. Do not apply hosted migrations without explicit approval.

Before completion:

1. Run `npm test`.
2. Run `npm run typecheck`.
3. Run `npm run lint`.
4. Run `npm run build`.
5. Review SQL migrations and RLS policies.
6. Check the staged diff for unrelated changes.
7. Report unresolved routing, payment, and hosting blockers.

## Discrepancies Already Identified

Older documentation conflicts with the approved prompt:

- Older KES 110 minimum commission text is superseded by 10% with no minimum.
- Older parcel-size, weight, traffic, and service-charge pricing is superseded by no automatic surcharges.
- Older hybrid formula text is superseded by the approved base-fee plus billable-distance formula.
- The 202611190003 quote migration was a preliminary draft and has now been reviewed locally; hosted deployment still requires explicit user authorization.

## Outstanding Blockers

- Supabase migration deployment requires renewed CLI authentication.
- Google Maps Routes API access and billing have not been verified in the target environment.
- Failed/cancelled/disputed delivery commission policy timing needs later confirmation.
- M-Pesa reconciliation is intentionally excluded until pricing and successful-delivery commission are complete.

