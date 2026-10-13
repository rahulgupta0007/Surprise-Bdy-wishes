import { connection } from "next/server";
import { isGuest } from "@/lib/auth";
import { readContent, toPublic } from "@/lib/store";
import { json, fail } from "@/lib/respond";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  await connection();
  try {
    const content = await readContent();
    if (!(await isGuest(request, content.settings.passphrase))) {
      return json({ locked: true, herName: content.settings.herName });
    }
    return json(toPublic(content));
  } catch {
    return fail("The page could not be opened.", 500);
  }
}
