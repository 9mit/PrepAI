/**
 * Client-side password hashing for localStorage auth.
 * Uses PBKDF2-SHA-256 with per-user salt (Web Crypto).
 * Not a substitute for server auth — prevents plaintext credential storage.
 */

const HASH_PREFIX = "pbkdf2:";
const LEGACY_SHA_PREFIX = "sha256:";
const ITERATIONS = 120_000;
const SALT_BYTES = 16;

function bytesToHex(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

async function sha256Hex(password: string): Promise<string> {
  const data = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return bytesToHex(digest);
}

async function pbkdf2Hex(password: string, salt: Uint8Array): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );
  return bytesToHex(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const derived = await pbkdf2Hex(password, salt);
  return `${HASH_PREFIX}${bytesToHex(salt)}:${derived}`;
}

export function isHashedPassword(value: string | undefined): boolean {
  return (
    typeof value === "string" &&
    (value.startsWith(HASH_PREFIX) || value.startsWith(LEGACY_SHA_PREFIX))
  );
}

export async function passwordsMatch(
  inputPassword: string,
  storedPassword: string | undefined
): Promise<boolean> {
  if (!storedPassword) return false;

  if (storedPassword.startsWith(HASH_PREFIX)) {
    const parts = storedPassword.slice(HASH_PREFIX.length).split(":");
    if (parts.length !== 2) return false;
    const [saltHex, hashHex] = parts;
    const derived = await pbkdf2Hex(inputPassword, hexToBytes(saltHex));
    return derived === hashHex;
  }

  if (storedPassword.startsWith(LEGACY_SHA_PREFIX)) {
    const hashed = await sha256Hex(inputPassword);
    return `${LEGACY_SHA_PREFIX}${hashed}` === storedPassword || hashed === storedPassword.slice(LEGACY_SHA_PREFIX.length);
  }

  // Legacy plaintext — compare then caller should re-hash
  return inputPassword === storedPassword;
}

export function needsRehash(storedPassword: string | undefined): boolean {
  return !!storedPassword && !storedPassword.startsWith(HASH_PREFIX);
}

/** Strip password from a user object before persisting to current_user session. */
export function stripPassword<T extends { password?: string }>(user: T): Omit<T, "password"> {
  const { password: _pw, ...rest } = user;
  return rest;
}
