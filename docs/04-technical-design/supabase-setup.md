# Supabase Setup

## 1. Local environment

Copy `.env.example` to `.env.local` and set the public project values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-publishable-or-anon-key
```

The publishable/anon key is safe for browser use. Never put the service-role or secret key in Next.js client code or commit it to Git.

## 2. Apply the initial migration locally

Docker Desktop must be running.

```bash
npm run db:start
npm run db:reset
npm run db:types
```

The migration creates:

- Public user profiles linked to Supabase Auth
- Sender, carrier, and administrator roles
- Carrier profiles
- Private identity-verification records
- Business profiles and memberships
- Initial Row Level Security policies

## 3. Apply to the hosted project

Authenticate with the Supabase CLI:

```bash
npx supabase login
npx supabase link --project-ref fausrtntaxmbtftinwhn
npm run db:push
npm run db:types
```

For generated hosted types, replace the local type command with:

```bash
npx supabase gen types typescript --project-id fausrtntaxmbtftinwhn --schema public > lib/supabase/database.types.ts
```

## 4. Authentication settings

For the temporary email-first journey:

1. Open Supabase **Authentication → Sign In / Providers → Email**.
2. Enable Email provider sign-in.
3. Configure the Site URL for local and production hosts.
4. Add `http://localhost:3000/**` to redirect URLs during development.
5. For this temporary test flow, disable **Confirm email** and save. This change must be made in the target Supabase project; changing the UI does not change the hosted setting.
6. Configure a sender and password-reset template separately. Supabase's default email service has restrictions; configure custom SMTP before wider use.

The mobile-style welcome screen links to email/password signup and sign-in. New users choose sender or carrier as their starting journey; both share one account and carrier applicants must still be approved. When email confirmation is disabled, successful signup provides a session and opens the chosen journey. If no session is returned, the UI reports that signup could not complete directly. Previously unconfirmed accounts may need separate administrator attention.

**Testing only:** disabling confirmation means email ownership is not verified, even if Supabase marks the address confirmed. Attackers can register addresses they do not own. Restore a verified signup flow before production use. Face and ID verification are a preview only; the app does not collect identity documents or biometric data. The app does not verify a phone number via email.

Google sign-in requires a Google web OAuth client, the Supabase Google provider, and allowed app redirect URLs for `/auth/callback` and `/auth/callback?role=carrier`; follow the [Supabase Google sign-in guide](https://supabase.com/docs/guides/auth/social-login/auth-google). Do not commit OAuth secrets. Google sign-in is not ready until that configuration is completed and tested. Phone OTP and phone/username sign-in are deferred.

## 5. Security rules

The initial migration enables RLS on every created table. The publishable key does not grant unrestricted database access. Additional delivery, payment, evidence, dispute, and audit tables must receive RLS policies before use.

Private identity documents must be stored in private Supabase Storage buckets with signed or server-managed access. Do not expose identity-document paths publicly.
