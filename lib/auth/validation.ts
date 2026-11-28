import { normalizePhone } from "../delivery/validation.ts";

export interface SignupDetails {
  fullName: string;
  email: string;
  phone: string;
  username: string;
  password: string;
}

// public.users.phone_number only accepts 2547XXXXXXXX (see 202611180002_phone_auth_normalization.sql).
export function normalizeSignupPhone(value: string): string | null {
  const phone = normalizePhone(value);
  return phone && /^2547\d{8}$/.test(phone) ? phone : null;
}

// Optional. Stored in auth metadata only until a username column and lookup exist.
export function normalizeUsername(value: string): string | null {
  const username = value.trim().toLowerCase();
  return /^[a-z0-9_.]{3,30}$/.test(username) ? username : null;
}

export function validateSignup(details: SignupDetails): string | null {
  if (!details.fullName.trim()) return "Enter your full name.";
  if (!/^\S+@\S+\.\S+$/.test(details.email.trim())) return "Enter a valid email address.";
  if (!normalizeSignupPhone(details.phone)) return "Enter a valid Kenyan mobile number, for example 0712 345 678.";
  if (details.username.trim() && !normalizeUsername(details.username)) {
    return "Usernames use 3 to 30 letters, numbers, dots or underscores.";
  }
  if (details.password.length < 8) return "Use a password of at least 8 characters.";
  return null;
}
