import { randomUUID } from "crypto";
import { unlink, writeFile } from "fs/promises";
import path from "path";
import type { NextRequest } from "next/server";
import { isAdmin, sameOrigin } from "@/lib/auth";
import { EXT_TYPES, LIMITS, PHOTO_TYPES, VIDEO_TYPES } from "@/lib/limits";
import { fail, json } from "@/lib/respond";
import { addMedia, uploadPath } from "@/lib/store";

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return fail("Open this page from the site itself.", 403);
  if (!(await isAdmin(request))) return fail("Sign in first.", 401);

  const form = await request.formData().catch(() => null);
  if (!form) return fail("That upload did not arrive.");
  const kind = form.get("kind");
  const file = form.get("file");
  if (kind !== "photo" && kind !== "video") return fail("Choose photographs or films.");
  if (!(file instanceof File)) return fail("Choose a file.");
  if (file.size <= 0) return fail("That file is empty.");

  const limit = kind === "photo" ? LIMITS.photoBytes : LIMITS.videoBytes;
  if (file.size > limit) {
    return fail(kind === "photo" ? "Each photograph needs to be under 20 MB." : "Each film needs to be under 120 MB.");
  }

  const ext = extensionFor(file, kind);
  if (!ext) {
    return fail(
      kind === "photo"
        ? "Use a jpg, png, webp, or gif. Some phone formats need to be saved as jpg first."
        : "Use an mp4 or webm. Mp4 plays on every phone.",
    );
  }

  const id = randomUUID();
  const storedName = `${id}${ext}`;
  const destination = uploadPath(kind, storedName);
  const folder = kind === "photo" ? "photos" : "videos";

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    await writeFile(destination, bytes);
    await addMedia(kind, {
      id,
      src: `/media/${folder}/${storedName}`,
      caption: "",
      fileName: cleanName(file.name),
    });
    return json({
      item: { id, src: `/media/${folder}/${storedName}`, caption: "", fileName: cleanName(file.name) },
    });
  } catch (error) {
    await unlink(destination).catch(() => undefined);
    const message = error instanceof Error ? error.message : "The upload did not save.";
    return fail(message, 500);
  }
}

function extensionFor(file: File, kind: "photo" | "video") {
  const fromMime = kind === "photo" ? PHOTO_TYPES[file.type] : VIDEO_TYPES[file.type];
  if (fromMime) return fromMime;
  const fromName = EXT_TYPES[path.extname(file.name).toLowerCase()];
  if (!fromName || fromName.kind !== kind) return null;
  return fromName.ext;
}

function cleanName(name: string) {
  const base = path.basename(name).replace(/[^\w.\- ()[\]]+/g, "").trim();
  return (base || "file").slice(0, 80);
}
