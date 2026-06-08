import { scrypt, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

/**
 * Password hashing with Node's built-in scrypt — no native deps,
 * works on Vercel's serverless runtime. Format: `salt:derivedKey` (hex).
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, key] = stored.split(":");
  if (!salt || !key) return false;
  const keyBuffer = Buffer.from(key, "hex");
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  if (keyBuffer.length !== derived.length) return false;
  return timingSafeEqual(keyBuffer, derived);
}
