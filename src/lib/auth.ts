import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { readFile, writeFile } from "fs/promises";
import path from "path";
import type { NextRequest, NextResponse } from "next/server";

const dataDir = path.join(process.cwd(), "data");
const secretPath = path.join(dataDir, "secret");
const authPath = path.join(dataDir, "auth.json");

export const ADMIN_COOKIE = "backstage_key";
export const GUEST_COOKIE = "keepsake_word";

type AuthFile = { passwordHash: string | null };

async function readSecret() {
  try {
    const existing = await readFile(secretPath, "utf8");
    if (existing.trim()) return existing.trim();
  } catch {
    // Create one below.
  }
  const secret = randomBytes(32).toString("hex");
  await writeFile(secretPath, secret, { mode: 0o600 });
  return secret;
}

function sign(secret: string, value: string) {
  return createHmac("sha256", secret).update(value).digest("hex");
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  try {
    const [salt, hash] = stored.split(":");
    if (!salt || !hash) return false;
    const next = scryptSync(password, salt, 64).toString("hex");
    return safeEqual(next, hash);
  } catch {
    return false;
  }
}

export async function readAuth(): Promise<AuthFile> {
  try {
    const raw = await readFile(authPath, "utf8");
    const parsed = JSON.parse(raw) as Partial<AuthFile>;
    return { passwordHash: typeof parsed.passwordHash === "string" ? parsed.passwordHash : null };
  } catch {
    return { passwordHash: null };
  }
}

export async function writeAuth(auth: AuthFile) {
  await writeFile(authPath, JSON.stringify(auth, null, 2), { mode: 0o600 });
}

export async function adminToken(passwordHash: string) {
  return sign(await readSecret(), `admin:${passwordHash}`);
}

export async function guestToken(passphrase: string) {
  return sign(await readSecret(), `guest:${passphrase.trim().toLowerCase()}`);
}

export async function isAdmin(request: NextRequest) {
  const auth = await readAuth();
  if (!auth.passwordHash) return false;
  const cookie = request.cookies.get(ADMIN_COOKIE)?.value;
  if (!cookie) return false;
  return safeEqual(cookie, await adminToken(auth.passwordHash));
}

export async function isGuest(request: NextRequest, passphrase: string) {
  if (!passphrase.trim()) return true;
  const cookie = request.cookies.get(GUEST_COOKIE)?.value;
  if (!cookie) return false;
  return safeEqual(cookie, await guestToken(passphrase));
}

function cookieBase(request: NextRequest, maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: request.nextUrl.protocol === "https:",
    path: "/",
    maxAge,
  };
}

export function setAdminCookie(response: NextResponse, request: NextRequest, token: string) {
  response.cookies.set(ADMIN_COOKIE, token, cookieBase(request, 60 * 60 * 24 * 30));
}

export function clearAdminCookie(response: NextResponse, request: NextRequest) {
  response.cookies.set(ADMIN_COOKIE, "", { ...cookieBase(request, 0), maxAge: 0 });
}

export function setGuestCookie(response: NextResponse, request: NextRequest, token: string) {
  response.cookies.set(GUEST_COOKIE, token, cookieBase(request, 60 * 60 * 24 * 14));
}

export function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}
