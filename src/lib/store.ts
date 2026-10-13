import { randomUUID } from "crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "fs/promises";
import path from "path";
import { LIMITS } from "./limits";
import { SEED } from "./seed";
import type { Content, Media, Note, PublicKeepsake, Settings } from "./types";

const dataDir = path.join(process.cwd(), "data");
const contentPath = path.join(dataDir, "content.json");
const uploadRoot = path.join(dataDir, "uploads");

let queue: Promise<unknown> = Promise.resolve();

export function withLock<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function ensure() {
  await mkdir(path.join(uploadRoot, "photos"), { recursive: true });
  await mkdir(path.join(uploadRoot, "videos"), { recursive: true });
}

function isNote(value: unknown): value is Note {
  if (!value || typeof value !== "object") return false;
  const note = value as Note;
  return typeof note.id === "string" && typeof note.title === "string" && typeof note.body === "string";
}

function isMedia(value: unknown): value is Media {
  if (!value || typeof value !== "object") return false;
  const media = value as Media;
  return (
    typeof media.id === "string" &&
    typeof media.src === "string" &&
    media.src.startsWith("/media/") &&
    typeof media.caption === "string" &&
    typeof media.fileName === "string"
  );
}

function normalize(raw: unknown): Content {
  const data = raw && typeof raw === "object" ? (raw as Partial<Content>) : {};
  const settings = data.settings && typeof data.settings === "object" ? data.settings : {};
  return {
    settings: { ...SEED.settings, ...settings },
    notes: Array.isArray(data.notes) ? data.notes.filter(isNote) : SEED.notes,
    photos: Array.isArray(data.photos) ? data.photos.filter(isMedia) : [],
    videos: Array.isArray(data.videos) ? data.videos.filter(isMedia) : [],
  };
}

export async function readContent() {
  await ensure();
  try {
    const raw = await readFile(contentPath, "utf8");
    return structuredClone(normalize(JSON.parse(raw)));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    await writeContent(SEED);
    return structuredClone(SEED);
  }
}

async function writeContent(content: Content) {
  await ensure();
  const tmp = `${contentPath}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(content, null, 2));
  await rename(tmp, contentPath);
}

function clip(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function validBirthday(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function sanitizeSettings(input: Partial<Settings>): Settings {
  const herName = clip(input.herName, LIMITS.herName);
  const hisName = clip(input.hisName, LIMITS.hisName);
  const birthday = clip(input.birthday, 10);
  if (!herName) throw new Error("She needs a name.");
  if (!hisName) throw new Error("Add your name, so the letter can be signed.");
  if (!validBirthday(birthday)) throw new Error("Choose her birthday.");
  return {
    herName,
    hisName,
    eyebrow: clip(input.eyebrow, LIMITS.eyebrow),
    openingLine: clip(input.openingLine, LIMITS.openingLine),
    letterLead: clip(input.letterLead, LIMITS.letterLead),
    finaleLine: clip(input.finaleLine, LIMITS.finaleLine),
    birthday,
    passphrase: clip(input.passphrase, LIMITS.passphrase),
  };
}

function moveItem<T extends { id: string }>(items: T[], id: string, direction: -1 | 1) {
  const index = items.findIndex((item) => item.id === id);
  const next = index + direction;
  if (index < 0 || next < 0 || next >= items.length) return items;
  const copy = items.slice();
  const [item] = copy.splice(index, 1);
  copy.splice(next, 0, item);
  return copy;
}

export async function saveSettings(settings: Settings) {
  return withLock(async () => {
    const content = await readContent();
    content.settings = settings;
    await writeContent(content);
    return content;
  });
}

export async function addNote() {
  return withLock(async () => {
    const content = await readContent();
    const note: Note = { id: randomUUID(), title: "", body: "", seed: false };
    content.notes.push(note);
    await writeContent(content);
    return content;
  });
}

export async function updateNote(id: string, title: string, body: string) {
  return withLock(async () => {
    const content = await readContent();
    const note = content.notes.find((item) => item.id === id);
    if (!note) throw new Error("That note is gone.");
    note.title = clip(title, LIMITS.noteTitle);
    note.body = clip(body, LIMITS.noteBody);
    note.seed = false;
    await writeContent(content);
    return content;
  });
}

export async function deleteNote(id: string) {
  return withLock(async () => {
    const content = await readContent();
    content.notes = content.notes.filter((item) => item.id !== id);
    await writeContent(content);
    return content;
  });
}

export async function moveNote(id: string, direction: -1 | 1) {
  return withLock(async () => {
    const content = await readContent();
    content.notes = moveItem(content.notes, id, direction);
    await writeContent(content);
    return content;
  });
}

export function uploadPath(kind: "photo" | "video", fileName: string) {
  return path.join(uploadRoot, kind === "photo" ? "photos" : "videos", fileName);
}

export async function addMedia(kind: "photo" | "video", media: Media) {
  return withLock(async () => {
    const content = await readContent();
    const list = kind === "photo" ? content.photos : content.videos;
    const cap = kind === "photo" ? LIMITS.photos : LIMITS.videos;
    if (list.length >= cap) {
      throw new Error(kind === "photo" ? "80 photographs is the limit." : "20 films is the limit.");
    }
    list.push(media);
    await writeContent(content);
    return content;
  });
}

export async function updateMedia(kind: "photo" | "video", id: string, caption: string) {
  return withLock(async () => {
    const content = await readContent();
    const list = kind === "photo" ? content.photos : content.videos;
    const item = list.find((media) => media.id === id);
    if (!item) throw new Error("That file is gone.");
    item.caption = clip(caption, LIMITS.caption);
    await writeContent(content);
    return content;
  });
}

export async function deleteMedia(kind: "photo" | "video", id: string) {
  return withLock(async () => {
    const content = await readContent();
    const list = kind === "photo" ? content.photos : content.videos;
    const item = list.find((media) => media.id === id);
    if (!item) return content;
    const file = mediaFile(item.src);
    content[kind === "photo" ? "photos" : "videos"] = list.filter((media) => media.id !== id);
    await writeContent(content);
    if (file) await unlink(file).catch(() => undefined);
    return content;
  });
}

export async function moveMedia(kind: "photo" | "video", id: string, direction: -1 | 1) {
  return withLock(async () => {
    const content = await readContent();
    if (kind === "photo") content.photos = moveItem(content.photos, id, direction);
    else content.videos = moveItem(content.videos, id, direction);
    await writeContent(content);
    return content;
  });
}

export function mediaFile(src: string) {
  const match = /^\/media\/(photos|videos)\/([A-Za-z0-9-]+\.[A-Za-z0-9]+)$/.exec(src);
  if (!match) return null;
  const full = path.resolve(uploadRoot, match[1], match[2]);
  const root = path.resolve(uploadRoot);
  const relative = path.relative(root, full);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return null;
  return full;
}

export function toPublic(content: Content): PublicKeepsake {
  return {
    locked: false,
    herName: content.settings.herName,
    hisName: content.settings.hisName,
    eyebrow: content.settings.eyebrow,
    openingLine: content.settings.openingLine,
    letterLead: content.settings.letterLead,
    finaleLine: content.settings.finaleLine,
    birthday: content.settings.birthday,
    notes: content.notes
      .filter((note) => note.body.trim())
      .map(({ id, title, body }) => ({ id, title, body })),
    photos: content.photos.map(({ id, src, caption }) => ({ id, src, caption })),
    videos: content.videos.map(({ id, src, caption }) => ({ id, src, caption })),
  };
}
