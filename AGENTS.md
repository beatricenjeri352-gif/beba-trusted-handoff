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

The current walking pricing (approved by the user, replacing the earlier formula) is authoritative:

- Beba is not a delivery app. It connects the sender with the carrier. The carrier is paid the Beba-calculated amount, subject to agreement by both parties.
- Distance: walking route distance from Google Maps Routes API (`computeRoutes`, `travelMode: WALK`), `distanceMeters` between the pickup pin and drop-off pin. Never straight-line distance and never an AI estimate.
- Price table in `lib/pricing/walking-bands.ts` (the single config; do not hard-code in screens):
  - up to and including 0.5 km: KES 60
  - over 0.5 km, up to and including 1.2 km: KES 100
  - over 1.2 km, up to and including 2.0 km: KES 150
  - over 2.0 km, up to and including 3.0 km: KES 200
  - over 3.0 km: "Too far to walk. Choose a car, tuktuk, or boda instead." No walking fee is offered.
- Commission: 10% of the final approved delivery fee, rounded to the nearest whole shilling. No minimum.
- Carrier earnings = fee minus commission.
- If Google Maps fails, show the price as "Estimate" and recalculate when the route loads. Never use a guess or straight-line distance silently.
- Money is stored as integer cents (whole shillings are multiples of 100). Distance is integer metres.
- Prices and commission are calculated server-side only.
- Vehicle pricing (car, tuktuk, boda, bicycle, motorbike) is not approved yet and is deferred.
- Additional charges require a reason, carrier proposal, sender agreement, and Beba administrator approval.
- Commission becomes payable after successful receiver confirmation or an authorised review completion.

Earlier formula (superseded by the walking bands above, still in the database until a migration is approved): base KES 50, 5 km minimum billable distance, KES 10 walking / KES 20 vehicle per billable km, 10% commission.

Do not add KES 110, KES minimum commission, parcel surcharges, or traffic surcharges.

## Current Implementation State

- Core delivery creation, profile, map pinning, and location search are implemented.
- Carrier application, carrier discovery, carrier selection, and assignment accept/decline are implemented.
- Carrier assignment read access and atomic selection are prepared in `202611190006_delivery_assignment_permissions.sql`; it has not been applied.
- The pure pricing engine and 21 acceptance tests are implemented.
- Administrator pricing controls and negotiated-charge approval UI are implemented locally. The walking bands (see Approved Pricing Rules) are in `lib/pricing/walking-bands.ts`; the database quote function still uses the earlier formula until a new migration is approved.
- The 202611190003 pricing migration has been reviewed and updated locally; it has not been deployed.
- Server-side Google Maps Routes API integration is implemented locally; live API access has not been tested.
- Sender quotes use walking distance only (Google Routes `WALK`) through `create_walking_delivery_quote`, with bands from `lib/pricing/walking-bands.ts`. Routes over 3 km return "Too far to walk".
- Migration `202611190010_walking_band_quotes.sql` was run on the hosted Beba project by the user through the Supabase SQL Editor (reported "Success. No rows returned"). Not yet verified from the database side; the CLI migration history does not record it.
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

