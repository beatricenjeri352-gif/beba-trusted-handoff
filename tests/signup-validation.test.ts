import assert from "node:assert/strict";
import test from "node:test";

import { normalizeSignupPhone, normalizeUsername, validateSignup } from "../lib/auth/validation.ts";

const valid = { fullName: "Jane Wanjiku", email: "jane@example.com", phone: "0712 345 678", username: "", password: "secret123" };

test("sign-up accepts valid details with no username", () => {
  assert.equal(validateSignup(valid), null);
});

test("phone must be a Kenyan 07 mobile the users table accepts", () => {
  assert.equal(normalizeSignupPhone("0712345678"), "254712345678");
  assert.equal(normalizeSignupPhone("+254 712 345 678"), "254712345678");
  assert.equal(normalizeSignupPhone("712345678"), "254712345678");
  assert.equal(normalizeSignupPhone("0112345678"), null);
  assert.equal(normalizeSignupPhone("12345"), null);
  assert.match(validateSignup({ ...valid, phone: "" })!, /mobile number/);
});

test("username is optional but must be well formed when given", () => {
  assert.equal(normalizeUsername("  Jane_K.1 "), "jane_k.1");
  assert.equal(normalizeUsername("ab"), null);
  assert.equal(normalizeUsername("has space"), null);
  assert.equal(validateSignup({ ...valid, username: "jane_k" }), null);
  assert.match(validateSignup({ ...valid, username: "x" })!, /Usernames/);
});

test("sign-up requires name, email and an 8-character password", () => {
  assert.match(validateSignup({ ...valid, fullName: " " })!, /full name/);
  assert.match(validateSignup({ ...valid, email: "nope" })!, /email/);
  assert.match(validateSignup({ ...valid, password: "short" })!, /8 characters/);
});
