import {
  adminToken,
  clearAdminCookie,
  hashPassword,
  isAdmin,
  readAuth,
  sameOrigin,
  setAdminCookie,
  verifyPassword,
  writeAuth,
} from "@/lib/auth";
import { fail, json } from "@/lib/respond";
import {
  addNote,
  deleteMedia,
  deleteNote,
  moveMedia,
  moveNote,
  readContent,
  sanitizeSettings,
  saveSettings,
  updateMedia,
  updateNote,
} from "@/lib/store";
import type { NextRequest } from "next/server";

async function snapshot() {
  const auth = await readAuth();
  if (!auth.passwordHash) return json({ needsSetup: true, authed: false });
  return null;
}

export async function GET(request: NextRequest) {
  const setup = await snapshot();
  if (setup) return setup;
  if (!(await isAdmin(request))) return json({ needsSetup: false, authed: false });
  const content = await readContent();
  return json({ needsSetup: false, authed: true, ...content });
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return fail("Open this page from the site itself.", 403);
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body.action !== "string") return fail("Missing request.");

  try {
    if (body.action === "setup") {
      const auth = await readAuth();
      if (auth.passwordHash) return fail("Backstage already has a key.", 409);
      const password = typeof body.password === "string" ? body.password : "";
      if (password.length < 4) return fail("Use at least 4 characters.");
      const passwordHash = hashPassword(password);
      await writeAuth({ passwordHash });
      const response = json({ needsSetup: false, authed: true, ...(await readContent()) });
      setAdminCookie(response, request, await adminToken(passwordHash));
      return response;
    }

    if (body.action === "login") {
      const auth = await readAuth();
      if (!auth.passwordHash) return fail("Choose a key first.", 409);
      const password = typeof body.password === "string" ? body.password : "";
      if (!verifyPassword(password, auth.passwordHash)) return fail("That key does not open it.", 401);
      const response = json({ needsSetup: false, authed: true, ...(await readContent()) });
      setAdminCookie(response, request, await adminToken(auth.passwordHash));
      return response;
    }

    if (body.action === "logout") {
      const response = json({ needsSetup: false, authed: false });
      clearAdminCookie(response, request);
      return response;
    }

    if (!(await isAdmin(request))) return fail("Sign in first.", 401);

    if (body.action === "change-key") {
      const auth = await readAuth();
      const current = typeof body.current === "string" ? body.current : "";
      const next = typeof body.next === "string" ? body.next : "";
      if (!auth.passwordHash || !verifyPassword(current, auth.passwordHash)) {
        return fail("The current key is wrong.", 401);
      }
      if (next.length < 4) return fail("Use at least 4 characters.");
      const passwordHash = hashPassword(next);
      await writeAuth({ passwordHash });
      const response = json({ ok: true });
      setAdminCookie(response, request, await adminToken(passwordHash));
      return response;
    }

    if (body.action === "save-settings") {
      const settings = sanitizeSettings((body.settings ?? {}) as Record<string, string>);
      const content = await saveSettings(settings);
      return json({ needsSetup: false, authed: true, ...content });
    }

    if (body.action === "add-note") return json(await addNote());
    if (body.action === "update-note") {
      const id = typeof body.id === "string" ? body.id : "";
      return json(await updateNote(id, String(body.title ?? ""), String(body.body ?? "")));
    }
    if (body.action === "delete-note") {
      return json(await deleteNote(typeof body.id === "string" ? body.id : ""));
    }
    if (body.action === "move-note") {
      return json(await moveNote(stringId(body), direction(body)));
    }
    if (body.action === "update-media") {
      return json(await updateMedia(kind(body), stringId(body), String(body.caption ?? "")));
    }
    if (body.action === "delete-media") {
      return json(await deleteMedia(kind(body), stringId(body)));
    }
    if (body.action === "move-media") {
      return json(await moveMedia(kind(body), stringId(body), direction(body)));
    }

    return fail("Unknown request.");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save that.";
    return fail(message);
  }
}

function stringId(body: Record<string, unknown>) {
  return typeof body.id === "string" ? body.id : "";
}

function direction(body: Record<string, unknown>): -1 | 1 {
  return body.direction === -1 ? -1 : 1;
}

function kind(body: Record<string, unknown>): "photo" | "video" {
  if (body.kind !== "photo" && body.kind !== "video") throw new Error("Choose photographs or films.");
  return body.kind;
}
