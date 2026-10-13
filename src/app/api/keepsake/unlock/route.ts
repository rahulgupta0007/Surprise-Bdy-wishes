import { guestToken, isGuest, sameOrigin, setGuestCookie } from "@/lib/auth";
import { fail, json } from "@/lib/respond";
import { readContent, toPublic } from "@/lib/store";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return fail("Open this page from the site itself.", 403);
  const body = (await request.json().catch(() => null)) as { word?: unknown } | null;
  const word = typeof body?.word === "string" ? body.word.trim() : "";
  const content = await readContent();
  if (!content.settings.passphrase.trim()) return json(toPublic(content));
  if (word.toLowerCase() !== content.settings.passphrase.trim().toLowerCase()) {
    return fail("Not that one.", 401);
  }
  if (await isGuest(request, content.settings.passphrase)) return json(toPublic(content));
  const response = json(toPublic(content));
  setGuestCookie(response, request, await guestToken(content.settings.passphrase));
  return response;
}
