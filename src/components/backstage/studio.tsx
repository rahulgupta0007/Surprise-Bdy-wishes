"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "cn";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WaxSeal } from "@/components/keepsake/wax-seal";
import { EXT_TYPES, LIMITS, formatBytes } from "@/lib/limits";
import { readJson } from "@/lib/http";
import { SEED } from "@/lib/seed";
import type { BackstageResponse, Content, Media, Note, Settings } from "@/lib/types";
import { Gate } from "./gate";
import { MediaDesk, type UploadJob } from "./media-desk";

const emptySettings: Settings = { ...SEED.settings };

function fingerprint(note: Pick<Note, "title" | "body">) {
  return `${note.title}\n${note.body}`;
}

function asContent(data: Partial<Content>): Content {
  if (!data.settings || !data.notes || !data.photos || !data.videos) {
    throw new Error("The save came back incomplete.");
  }
  return { settings: data.settings, notes: data.notes, photos: data.photos, videos: data.videos };
}

export function Studio({ initial }: { initial: BackstageResponse }) {
  const seeded = initial.authed ? initial : null;
  const [phase, setPhase] = useState<"gate" | "ready" | "error">(initial.authed ? "ready" : "gate");
  const [needsSetup, setNeedsSetup] = useState(initial.needsSetup);
  const [loadError, setLoadError] = useState("");
  const [settings, setSettings] = useState<Settings>(seeded?.settings ?? emptySettings);
  const [savedSettings, setSavedSettings] = useState(JSON.stringify(seeded?.settings ?? emptySettings));
  const [notes, setNotes] = useState<Note[]>(seeded?.notes ?? []);
  const [photos, setPhotos] = useState<Media[]>(seeded?.photos ?? []);
  const [videos, setVideos] = useState<Media[]>(seeded?.videos ?? []);
  const [savedNotes, setSavedNotes] = useState<Record<string, string>>(() => {
    const keys: Record<string, string> = {};
    for (const note of seeded?.notes ?? []) keys[note.id] = fingerprint(note);
    return keys;
  });
  const [savedCaptions, setSavedCaptions] = useState<Record<string, string>>(() => {
    const captions: Record<string, string> = {};
    for (const item of [...(seeded?.photos ?? []), ...(seeded?.videos ?? [])]) captions[item.id] = item.caption;
    return captions;
  });
  const [banner, setBanner] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const [focusNote, setFocusNote] = useState<string | null>(null);
  const [keyForm, setKeyForm] = useState({ current: "", next: "" });

  function adopt(content: Content) {
    setSettings(content.settings);
    setSavedSettings(JSON.stringify(content.settings));
    setNotes(content.notes);
    setPhotos(content.photos);
    setVideos(content.videos);
    const noteKeys: Record<string, string> = {};
    for (const note of content.notes) noteKeys[note.id] = fingerprint(note);
    setSavedNotes(noteKeys);
    const captions: Record<string, string> = {};
    for (const item of [...content.photos, ...content.videos]) captions[item.id] = item.caption;
    setSavedCaptions(captions);
  }

  const load = useCallback(async () => {
    setBanner("Opening…");
    try {
      const data = await readJson<BackstageResponse>(await fetch("/api/backstage", { cache: "no-store" }));
      if (!data.authed) {
        setNeedsSetup(data.needsSetup);
        setPhase("gate");
        setBanner("");
        return;
      }
      adopt(data);
      setPhase("ready");
      setBanner("");
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Backstage could not open.");
      setPhase("error");
    }
  }, []);

  const settingsDirty = JSON.stringify(settings) !== savedSettings;
  const notesDirty = notes.some((note) => savedNotes[note.id] !== fingerprint(note));
  const captionsDirty = [...photos, ...videos].some((item) => savedCaptions[item.id] !== item.caption);
  const dirty = settingsDirty || notesDirty || captionsDirty;

  useEffect(() => {
    if (!dirty) return;
    const onBefore = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBefore);
    return () => window.removeEventListener("beforeunload", onBefore);
  }, [dirty]);

  useEffect(() => {
    if (!focusNote) return;
    document.getElementById(`note-${focusNote}`)?.focus();
    const clear = window.setTimeout(() => setFocusNote(null), 0);
    return () => window.clearTimeout(clear);
  }, [focusNote, notes]);

  async function post(body: unknown) {
    return readJson<Content>(
      await fetch("/api/backstage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    );
  }

  async function saveSettings(event?: React.FormEvent) {
    event?.preventDefault();
    setSavingSettings(true);
    setBanner("");
    try {
      const content = asContent(await post({ action: "save-settings", settings }));
      setSettings(content.settings);
      setSavedSettings(JSON.stringify(content.settings));
      setBanner("The night is saved.");
    } catch (error) {
      setBanner(error instanceof Error ? error.message : "Could not save.");
    } finally {
      setSavingSettings(false);
    }
  }

  async function commitNote(note: Note) {
    if (savedNotes[note.id] === fingerprint(note)) return;
    setBanner("Saving the letter…");
    try {
      await post({ action: "update-note", id: note.id, title: note.title, body: note.body });
      setSavedNotes((current) => ({ ...current, [note.id]: fingerprint(note) }));
      setNotes((current) => current.map((item) => (item.id === note.id ? { ...item, seed: false } : item)));
      setBanner("The letter is saved.");
    } catch (error) {
      setBanner(error instanceof Error ? error.message : "Could not save the note.");
    }
  }

  async function addNote() {
    setBanner("");
    try {
      const content = asContent(await post({ action: "add-note" }));
      const known = new Set(notes.map((note) => note.id));
      const added = content.notes.filter((note) => !known.has(note.id));
      setNotes((current) => [...current, ...added]);
      setSavedNotes((current) => {
        const next = { ...current };
        for (const note of added) next[note.id] = fingerprint(note);
        return next;
      });
      if (added[0]) setFocusNote(added[0].id);
    } catch (error) {
      setBanner(error instanceof Error ? error.message : "Could not add a note.");
    }
  }

  async function removeNote(id: string) {
    const previous = notes;
    setNotes((current) => current.filter((note) => note.id !== id));
    try {
      await post({ action: "delete-note", id });
    } catch (error) {
      setNotes(previous);
      setBanner(error instanceof Error ? error.message : "Could not remove the note.");
    }
  }

  async function moveNote(id: string, direction: -1 | 1) {
    const previous = notes;
    setNotes((current) => reorder(current, id, direction));
    try {
      await post({ action: "move-note", id, direction });
    } catch (error) {
      setNotes(previous);
      setBanner(error instanceof Error ? error.message : "Could not reorder.");
    }
  }

  function patchMedia(kind: "photo" | "video", id: string, caption: string) {
    const update = (items: Media[]) => items.map((item) => (item.id === id ? { ...item, caption } : item));
    if (kind === "photo") setPhotos(update);
    else setVideos(update);
  }

  async function commitCaption(kind: "photo" | "video", id: string) {
    const item = (kind === "photo" ? photos : videos).find((media) => media.id === id);
    if (!item || savedCaptions[id] === item.caption) return;
    try {
      await post({ action: "update-media", kind, id, caption: item.caption });
      setSavedCaptions((current) => ({ ...current, [id]: item.caption }));
    } catch (error) {
      setBanner(error instanceof Error ? error.message : "Could not save the caption.");
    }
  }

  async function moveMedia(kind: "photo" | "video", id: string, direction: -1 | 1) {
    const previousPhotos = photos;
    const previousVideos = videos;
    if (kind === "photo") setPhotos((current) => reorder(current, id, direction));
    else setVideos((current) => reorder(current, id, direction));
    try {
      await post({ action: "move-media", kind, id, direction });
    } catch (error) {
      setPhotos(previousPhotos);
      setVideos(previousVideos);
      setBanner(error instanceof Error ? error.message : "Could not reorder.");
    }
  }

  async function removeMedia(kind: "photo" | "video", id: string) {
    const previousPhotos = photos;
    const previousVideos = videos;
    if (kind === "photo") setPhotos((current) => current.filter((item) => item.id !== id));
    else setVideos((current) => current.filter((item) => item.id !== id));
    try {
      await post({ action: "delete-media", kind, id });
    } catch (error) {
      setPhotos(previousPhotos);
      setVideos(previousVideos);
      setBanner(error instanceof Error ? error.message : "Could not remove it.");
    }
  }

  async function upload(kind: "photo" | "video", files: File[]) {
    const limit = kind === "photo" ? LIMITS.photoBytes : LIMITS.videoBytes;
    for (const file of files) {
      const id = `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`;
      const ext = EXT_TYPES[`.${file.name.split(".").pop()?.toLowerCase() ?? ""}`];
      const typeOk = kind === "photo" ? file.type.startsWith("image/") || ext?.kind === "photo" : file.type.startsWith("video/") || ext?.kind === "video";
      if (!typeOk || (ext && ext.kind !== kind && file.type && !file.type.startsWith(kind === "photo" ? "image/" : "video/"))) {
        setJobs((current) => [
          ...current,
          {
            id,
            kind,
            name: file.name,
            progress: 1,
            error: kind === "photo" ? "Save that one as a jpg, png, or webp." : "Use an mp4 so her phone can play it.",
          },
        ]);
        continue;
      }
      if (file.size > limit) {
        setJobs((current) => [
          ...current,
          { id, kind, name: file.name, progress: 1, error: `Too large. Keep it under ${formatBytes(limit)}.` },
        ]);
        continue;
      }
      setJobs((current) => [...current, { id, kind, name: file.name, progress: 0 }]);
      try {
        const item = await uploadFile(file, kind, (progress) => {
          setJobs((current) => current.map((job) => (job.id === id ? { ...job, progress } : job)));
        });
        if (kind === "photo") setPhotos((current) => [...current, item]);
        else setVideos((current) => [...current, item]);
        setSavedCaptions((current) => ({ ...current, [item.id]: "" }));
        setJobs((current) => current.filter((job) => job.id !== id));
      } catch (error) {
        setJobs((current) =>
          current.map((job) =>
            job.id === id ? { ...job, progress: 1, error: error instanceof Error ? error.message : "Upload failed." } : job,
          ),
        );
      }
    }
  }

  async function changeKey(event: React.FormEvent) {
    event.preventDefault();
    setBanner("");
    try {
      await readJson(
        await fetch("/api/backstage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "change-key", current: keyForm.current, next: keyForm.next }),
        }),
      );
      setKeyForm({ current: "", next: "" });
      setBanner("The key is changed.");
    } catch (error) {
      setBanner(error instanceof Error ? error.message : "Could not change the key.");
    }
  }

  async function logout() {
    await fetch("/api/backstage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    setPhase("gate");
    setNeedsSetup(false);
  }

  const checks = useMemo(
    () => [
      { label: "Her real name", done: settings.herName.trim() !== "" && settings.herName.trim().toLowerCase() !== "my love" },
      { label: "Your name", done: settings.hisName.trim() !== "" && settings.hisName.trim().toLowerCase() !== "yours" },
      {
        label: "Your words",
        done: notes.some((note) => note.body.trim() && !note.seed) || settings.letterLead !== SEED.settings.letterLead,
      },
      { label: "Photographs", done: photos.length > 0 },
    ],
    [notes, photos.length, settings.herName, settings.hisName, settings.letterLead],
  );

  if (phase === "error") {
    return (
      <div className="night grid min-h-dvh place-items-center px-6 text-center">
        <div>
          <p className="font-display text-4xl italic">{loadError}</p>
          <Button type="button" className="mt-6 h-11 px-5" onClick={() => void load()}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  if (phase === "gate") return <Gate needsSetup={needsSetup} onEnter={(data) => {
    if (data.authed) {
      adopt(data);
      setPhase("ready");
    }
  }} />;

  return (
    <div className="night">
      <div className="grain" />
      <div className="relative z-10 mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <header className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="font-sans text-[0.72rem] tracking-[0.32em] text-gold/80 uppercase">Backstage</p>
            <h1 className="mt-3 font-display text-5xl leading-none font-light italic sm:text-6xl">Write the night.</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-paper/70">
              She never sees this page. Add her name, your words, the photographs, and the films. Then send her the public link.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/"
              target="_blank"
              className={cn(buttonVariants({ variant: "outline" }), "h-11 border-gold/40 px-4 text-paper")}
            >
              Open her page
            </Link>
            <Button type="button" variant="ghost" className="h-11" onClick={() => void logout()}>
              Lock
            </Button>
          </div>
        </header>

        <ul className="mt-8 flex flex-wrap gap-2">
          {checks.map((check) => (
            <li
              key={check.label}
              className={`rounded-full border px-3 py-1.5 font-sans text-[0.68rem] tracking-[0.14em] uppercase ${
                check.done ? "border-gold bg-gold text-ink" : "border-white/15 text-paper/60"
              }`}
            >
              {check.done ? "Ready · " : "Still · "}
              {check.label}
            </li>
          ))}
        </ul>

        <nav className="mt-6 flex gap-4 overflow-x-auto font-sans text-[0.72rem] tracking-[0.18em] text-paper/70 uppercase">
          <a href="#names" className="hover:text-paper">Names</a>
          <a href="#letter" className="hover:text-paper">Letter</a>
          <a href="#photographs" className="hover:text-paper">Photographs</a>
          <a href="#films" className="hover:text-paper">Films</a>
        </nav>

        {banner ? <p className="mt-6 text-sm text-gold">{banner}</p> : null}

        <form id="names" onSubmit={(event) => void saveSettings(event)} className="desk-card mt-8">
          <div className="grid items-center gap-8 md:grid-cols-[9rem_1fr]">
            <WaxSeal letter={settings.herName} className="mx-auto h-32 w-32" />
            <div>
              <h2 className="font-display text-4xl font-light italic">Names and the day</h2>
              <p className="mt-2 text-sm leading-6 text-paper/70">
                The seal reads My Ishika. The date decides whether she sees a countdown or the morning itself.
              </p>
            </div>
          </div>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <Field label="Her name" id="herName">
              <Input id="herName" value={settings.herName} className="h-11" onChange={(event) => setSettings({ ...settings, herName: event.target.value })} />
            </Field>
            <Field label="Your name" id="hisName">
              <Input id="hisName" value={settings.hisName} className="h-11" onChange={(event) => setSettings({ ...settings, hisName: event.target.value })} />
            </Field>
            <Field label="Her birthday" id="birthday">
              <Input id="birthday" type="date" value={settings.birthday} className="h-11" onChange={(event) => setSettings({ ...settings, birthday: event.target.value })} />
            </Field>
            <Field label="Small line above her name" id="eyebrow">
              <Input id="eyebrow" value={settings.eyebrow} className="h-11" onChange={(event) => setSettings({ ...settings, eyebrow: event.target.value })} />
            </Field>
            <Field label="Line under the seal" id="openingLine" className="md:col-span-2">
              <Input id="openingLine" value={settings.openingLine} className="h-11" onChange={(event) => setSettings({ ...settings, openingLine: event.target.value })} />
            </Field>
            <Field label="Last line, on the final page" id="finaleLine" className="md:col-span-2">
              <Textarea id="finaleLine" value={settings.finaleLine} onChange={(event) => setSettings({ ...settings, finaleLine: event.target.value })} />
            </Field>
            <Field label="A secret word, optional" id="passphrase" className="md:col-span-2">
              <Input
                id="passphrase"
                value={settings.passphrase}
                className="h-11"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="Leave blank and the page opens straight away"
                onChange={(event) => setSettings({ ...settings, passphrase: event.target.value })}
              />
              <p className="text-xs leading-5 text-paper/55">
                If you set one, she cannot see anything until she types it. Tell her the word yourself, in a separate message.
              </p>
            </Field>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button type="submit" className="h-11 px-5" disabled={savingSettings}>
              {savingSettings ? "Saving" : settingsDirty ? "Save the night" : "Saved"}
            </Button>
            {settingsDirty ? <span className="text-sm text-paper/60">Unsaved changes</span> : null}
          </div>
        </form>

        <section id="letter" className="desk-card mt-6">
          <h2 className="font-display text-4xl font-light italic">The letter</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-paper/70">
            The opening sits at the top of the page. Each note becomes another passage. Leave a note and it saves.
          </p>
          {notes.some((note) => note.seed) ? (
            <p className="mt-4 rounded-2xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm leading-6 text-paper/80">
              The passages already here are only a start. Rewrite them so they sound like you, then leave the field. They save on their own.
            </p>
          ) : null}
          <div className="mt-6 space-y-2">
            <Label htmlFor="letterLead">Opening of the letter</Label>
            <Textarea
              id="letterLead"
              value={settings.letterLead}
              className="min-h-28"
              onChange={(event) => setSettings({ ...settings, letterLead: event.target.value })}
            />
            {settingsDirty ? (
              <Button type="button" className="mt-3 h-11 px-5" onClick={() => void saveSettings()}>
                Save the night
              </Button>
            ) : null}
          </div>
          <div className="mt-6 space-y-4">
            {notes.map((note, index) => (
              <article key={note.id} className="rounded-2xl border border-white/10 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="font-sans text-[0.68rem] tracking-[0.18em] text-gold/80 uppercase">
                    Passage {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="text-xs text-paper/50">
                    {savedNotes[note.id] === fingerprint(note) ? "Saved" : "Unsaved"}
                  </span>
                </div>
                <div className="space-y-3">
                  <Input
                    value={note.title}
                    placeholder="A small heading, if you want one"
                    className="h-10"
                    aria-label={`Heading for passage ${index + 1}`}
                    onChange={(event) => updateNoteLocal(note.id, { title: event.target.value })}
                    onBlur={() => void commitNote(noteFrom(notes, note.id))}
                  />
                  <Textarea
                    id={`note-${note.id}`}
                    value={note.body}
                    placeholder="What you want her to read"
                    className="min-h-32"
                    aria-label={`Passage ${index + 1}`}
                    onChange={(event) => updateNoteLocal(note.id, { body: event.target.value })}
                    onBlur={() => void commitNote(noteFrom(notes, note.id))}
                  />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button type="button" variant="ghost" size="sm" disabled={index === 0} onClick={() => void moveNote(note.id, -1)}>
                    Earlier
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={index === notes.length - 1}
                    onClick={() => void moveNote(note.id, 1)}
                  >
                    Later
                  </Button>
                  <Button type="button" size="sm" onClick={() => void commitNote(note)}>
                    Save passage
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => void removeNote(note.id)}>
                    Remove
                  </Button>
                </div>
              </article>
            ))}
          </div>
          <Button type="button" variant="outline" className="mt-5 h-11 border-gold/40 px-5 text-paper" onClick={() => void addNote()}>
            Add a passage
          </Button>
        </section>

        <div className="mt-6">
          <MediaDesk
            kind="photo"
            title="Photographs"
            lede="Add as many as you want. The first one is the first frame she slides to. Empty means this part stays hidden."
            hint={`Jpg, png, webp, or gif. Up to ${formatBytes(LIMITS.photoBytes)} each.`}
            accept="image/*"
            items={photos}
            jobs={jobs.filter((job) => job.kind === "photo")}
            savedCaptions={savedCaptions}
            onFiles={(files) => void upload("photo", files)}
            onCaption={(id, caption) => patchMedia("photo", id, caption)}
            onCommitCaption={(id) => void commitCaption("photo", id)}
            onMove={(id, direction) => void moveMedia("photo", id, direction)}
            onDelete={(id) => void removeMedia("photo", id)}
          />
        </div>
        <div className="mt-6">
          <MediaDesk
            kind="video"
            title="Films"
            lede="Short clips are kinder on a phone. Mp4 is the format that plays everywhere. Leave this empty and she will not see a gap."
            hint={`Mp4 or webm. Up to ${formatBytes(LIMITS.videoBytes)} each.`}
            accept="video/mp4,video/webm,video/quicktime,video/*"
            items={videos}
            jobs={jobs.filter((job) => job.kind === "video")}
            savedCaptions={savedCaptions}
            onFiles={(files) => void upload("video", files)}
            onCaption={(id, caption) => patchMedia("video", id, caption)}
            onCommitCaption={(id) => void commitCaption("video", id)}
            onMove={(id, direction) => void moveMedia("video", id, direction)}
            onDelete={(id) => void removeMedia("video", id)}
          />
        </div>

        <form onSubmit={(event) => void changeKey(event)} className="desk-card mt-6">
          <h2 className="font-display text-3xl font-light italic">Change the key</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field label="Current key" id="currentKey">
              <Input id="currentKey" type="password" autoComplete="current-password" className="h-11" value={keyForm.current} onChange={(event) => setKeyForm({ ...keyForm, current: event.target.value })} />
            </Field>
            <Field label="New key" id="nextKey">
              <Input id="nextKey" type="password" autoComplete="new-password" className="h-11" value={keyForm.next} onChange={(event) => setKeyForm({ ...keyForm, next: event.target.value })} />
            </Field>
          </div>
          <Button type="submit" variant="outline" className="mt-5 h-11 border-gold/40 px-5 text-paper">
            Change key
          </Button>
        </form>
      </div>
    </div>
  );

  function updateNoteLocal(id: string, patch: Partial<Note>) {
    setNotes((current) => current.map((note) => (note.id === id ? { ...note, ...patch } : note)));
  }
}

function noteFrom(notes: Note[], id: string) {
  return notes.find((note) => note.id === id) ?? { id, title: "", body: "" };
}

function reorder<T extends { id: string }>(items: T[], id: string, direction: -1 | 1) {
  const index = items.findIndex((item) => item.id === id);
  const next = index + direction;
  if (index < 0 || next < 0 || next >= items.length) return items;
  const copy = items.slice();
  const [item] = copy.splice(index, 1);
  copy.splice(next, 0, item);
  return copy;
}

function Field({
  label,
  id,
  className,
  children,
}: {
  label: string;
  id: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function uploadFile(file: File, kind: "photo" | "video", onProgress: (progress: number) => void) {
  return new Promise<Media>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/backstage/upload");
    xhr.withCredentials = true;
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText) as { item?: Media; error?: string };
        if (xhr.status >= 200 && xhr.status < 300 && data.item) resolve(data.item);
        else reject(new Error(data.error || "The upload did not save."));
      } catch {
        reject(new Error("The upload did not save."));
      }
    };
    xhr.onerror = () => reject(new Error("The upload did not save."));
    const body = new FormData();
    body.set("kind", kind);
    body.set("file", file);
    xhr.send(body);
  });
}
