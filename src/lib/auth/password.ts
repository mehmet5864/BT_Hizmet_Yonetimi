import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string | null | undefined) {
  if (!stored || !stored.includes(":")) return false;
  const [salt, hash] = stored.split(":");
  const next = scryptSync(password, salt, 32);
  const prev = Buffer.from(hash, "hex");
  if (next.length !== prev.length) return false;
  return timingSafeEqual(next, prev);
}

export const DEMO_PASSWORD = "Kurum123!";
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;

export function passwordPolicyMessage(password: string) {
  if (password.length < MIN_PASSWORD_LENGTH) return `Parola en az ${MIN_PASSWORD_LENGTH} karakter olmalı.`;
  if (password.length > MAX_PASSWORD_LENGTH) return "Parola çok uzun.";
  return null;
}
