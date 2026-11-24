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
- Nominatim place search (Kenya) for pickup/drop-off; Google Maps Routes API for server-side road-distance routing
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
- Administrator pricing controls and negotiated-charge approval UI are implemented locally. The walking bands (see Approved Pricing Rules) are in `lib/pricing/walking-bands.ts`, and the database quote function `create_walking_delivery_quote` uses them (migration `202611190010`, applied). The legacy `create_delivery_quote` remains for existing quotes.
- The 202611190003 pricing migration has been reviewed and updated locally; it has not been deployed.
- Server-side Google Maps Routes API integration is verified for walking routes (live `computeRoutes` WALK request returned 200 with `distanceMeters`). Vehicle travel modes are not yet live-tested.
- Sender quotes use walking distance only (Google Routes `WALK`) through `create_walking_delivery_quote`, with bands from `lib/pricing/walking-bands.ts`. Routes over 3 km return "Too far to walk".
- The sender delivery page shows a walking price preview before any carrier is chosen. It is calculated on page load from the Google walking route and stores nothing. If Google fails, it shows "Estimate unavailable" and no price.
- Migration `202611190010_walking_band_quotes.sql` is applied on the hosted Beba project. The user ran it through the Supabase SQL Editor, and a read-only check confirmed the function, the `pricing_model` column, and the legacy-only 5 km check.
- Migration `202611190011_carrier_bookings.sql` is applied on the hosted Beba project through the SQL Editor. It adds `carrier_bookings`, `delivery_assignments.carrier_booking_id`, and the functions `create_carrier_booking`, `add_delivery_to_carrier_booking`, and `respond_to_carrier_booking`. Carrier accept or decline applies to every delivery in a booking. Sender pages add deliveries to an open booking for the same carrier. The Supabase CLI migration history still needs repair for `0010` and `0011`.
- Carrier distance and reviews (`BE_CARRIER_distance_reviews`): carriers publish live location while online; senders see carrier road distance to pickup (nearest first); carriers see road distance to each pickup; senders rate completed deliveries (1–5 stars, optional comment). Walking uses walking routes; bicycle uses bicycle routes; motorbike, car, and other vehicles use driving. Public ratings omit `sender_user_id`; only the reviewed carrier and administrators can read it. Migration `202611190012_carrier_location_and_reviews.sql` is applied on hosted (SQL Editor). Read-only check: location and review tables exist, review RLS is on, two review policies, public view has no `sender_user_id`. Vehicle rates are deferred. The Supabase CLI migration history still needs repair for `0010`, `0011`, and `0012`.
- App pages use a shared mobile-first shell (`components/page-shell.tsx`): device-width viewport, safe-area padding, stacked actions under `sm`, and 44px tap targets. 
- The sender and carrier workspace headers have an account menu with sender/carrier switching and sign-out. The sender menu contains account details and recent deliveries; profile editing and settings are not yet available. Switching remains unavailable for rejected or suspended carrier profiles.
- The sender landing page greets the user by first name from the profile or auth metadata when available, and opens the delivery wizard on the same page. Returning home keeps the in-progress wizard state during that page session. The home illustration uses a decorative Lucide truck and respects reduced-motion preferences.
- Sender notifications use `202611190013_sender_notifications.sql`. The user reported applying it and verifying the table, RLS, policies, and triggers through the hosted SQL Editor; the signed-in panel loaded, but a hosted unread notification has not yet been tested. New delivery status changes, declined assignments, and proposed additional charges create account-level updates; opening an update marks it read. The panel also shows recent active deliveries. Existing history is not backfilled. The Supabase CLI migration history needs repair for `0013`.
- **Delivery creation workflow:**
  - Sender delivery creation uses one page with expandable sections; validated completed sections show a green tick and can be reopened for edits
  - Step 1: Parcel Details (delivery method, required description, optional size and weight).
  - Step 2: Pickup Location (place search or GPS, optional landmark).
  - Step 3: Drop-off and receiver (place search or GPS, optional landmark, name and phone).
  - Form state persists when navigating between sections; editing a location clears its previously selected coordinates. The client validates each section before advancing or submitting.
  - After drop-off, the sender reviews details before saving and can return to edit them. A server-side walking route preview requests distance and geometry together, and uses the walking bands without storing a quote. If routing fails, no price is guessed; if the map fails, the distance can still be shown.
  - The review displays a signed Google static map with a separate browser-visible, referrer-restricted static-map key and a server-only signing secret. Do not expose the server Routes key. Static map setup, billing and live behavior must be verified before release.
  - The review submits via a server action; the success screen shows the tracking number and links to the carrier section of the new delivery. It is not an edit screen.
  - The tracking ID can be copied or downloaded as a text file. The delivery page shows carrier selection first, including names, pickup road distance, reviews, completed-delivery counts and expandable profiles where available. It shows the journey's stops and current status, not live tracking. Quote and additional-charge actions remain after carrier selection.
  - Pickup and drop-off use typed place suggestions (Nominatim) and GPS. The review map uses the walking route, not a straight-line approximation.
  - Vehicle rates are still deferred.
- **Authentication workflow (`BE_AUTH_role_selection`, tested and verified):** 
  - Welcome screen shows "Sign up" or "Sign in" buttons; both lead to the auth form.
  - Sign up mode shows "Register as Sender" or "Register as Carrier" buttons; selection stores the role in Supabase user metadata (`registration_role`).
  - After signup, role is passed to OAuth callback via query param (e.g., `/auth/callback?role=carrier`) to route carriers to `/jobs` and senders to `/deliveries`.
  - Face and ID verification are preview-only warnings; they do not collect documents or biometric data.
  - Email/password signup signs users in directly when Supabase "Confirm email" is disabled; this is testing-only and does not verify email ownership. For production, re-enable "Confirm email" and configure SMTP with proper email templates.
  - Hosted environment: "Confirm email" toggle has been disabled in the Supabase dashboard (authenticated via email, saved, but network prevented verification of persistence).
  - Tests, typecheck, lint, and build all passed. Full end-to-end signup/login testing with both roles is pending (requires local dev server restart and browser testing).
  - Google sign-in requires OAuth provider and redirect setup. Phone verification and phone/username login remain unavailable until implemented. See `docs/04-technical-design/supabase-setup.md`.
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
The optional static-map integration requires a separate `GOOGLE_MAPS_STATIC_BROWSER_KEY`
restricted to the app's domains and Maps Static API, plus a server-only
`GOOGLE_MAPS_STATIC_SIGNING_SECRET`. The signed image URL exposes the static-map
key to browsers, but never the Routes key or signing secret.

Before treating routing as production-ready, verify Google Maps Routes API access in the target environment.

On provider or configuration failure:

- Do not create a quote.
- Return a clear routing/configuration error.
- Do not fall back to straight-line distance.

## Active Branches

- Sender home and delivery UI story: `BE_UI_sender_home` (local uncommitted changes at last check)
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
- The hosted `users` table denied the signed-in sender's profile query (permission error 42501). The sender greeting can use auth metadata, but profile table access needs investigation.
- Google Maps Routes API access and billing have not been verified in the target environment.
- Failed/cancelled/disputed delivery commission policy timing needs later confirmation.
- M-Pesa reconciliation is intentionally excluded until pricing and successful-delivery commission are complete.
- Local dev server must be restarted and both sender and carrier signup/login flows tested end-to-end before the auth story is complete.
- Supabase "Confirm email" toggle persistence in hosted environment must be verified (network issue prevented confirmation during toggle).
- Delivery wizard form submission and success screen display need end-to-end testing (form data must be validated and saved to database).
- Signed-in local browser testing verified place suggestions, the pre-save review, back-to-edit state retention, and a refreshed live walking estimate after changing the pickup. No test delivery was saved; submission and the success screen remain unverified.
- The static map showed "Route map unavailable" during the local test; its separate key, signing secret, restrictions, and live rendering still need verification. Saved delivery editing is not implemented.

