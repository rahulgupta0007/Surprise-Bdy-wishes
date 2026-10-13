"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Media } from "@/lib/types";

export type UploadJob = {
  id: string;
  kind: "photo" | "video";
  name: string;
  progress: number;
  error?: string;
};

export function MediaDesk({
  kind,
  title,
  lede,
  hint,
  accept,
  items,
  jobs,
  savedCaptions,
  onFiles,
  onCaption,
  onCommitCaption,
  onMove,
  onDelete,
}: {
  kind: "photo" | "video";
  title: string;
  lede: string;
  hint: string;
  accept: string;
  items: Media[];
  jobs: UploadJob[];
  savedCaptions: Record<string, string>;
  onFiles: (files: File[]) => void;
  onCaption: (id: string, caption: string) => void;
  onCommitCaption: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  onDelete: (id: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  function take(list: FileList | null) {
    const files = [...(list ?? [])];
    if (files.length) onFiles(files);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <section id={kind === "photo" ? "photographs" : "films"} className="desk-card">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-4xl font-light italic">{title}</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-paper/70">{lede}</p>
        </div>
        <span className="font-sans text-[0.68rem] tracking-[0.2em] text-gold/80 uppercase">{items.length} added</span>
      </div>

      <div
        className={`mt-6 rounded-2xl border border-dashed px-4 py-8 text-center transition-colors ${
          over ? "border-gold bg-gold/10" : "border-gold/35 bg-gold/5"
        }`}
        onDragOver={(event) => {
          event.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setOver(false);
          take(event.dataTransfer.files);
        }}
      >
        <p className="font-letter text-lg">Drop them here, or choose several at once.</p>
        <p className="mt-2 text-sm text-paper/60">{hint}</p>
        <Button type="button" variant="outline" className="mt-5 h-11 border-gold/40 px-5 text-paper" onClick={() => inputRef.current?.click()}>
          {kind === "photo" ? "Choose photographs" : "Choose films"}
        </Button>
        <input
          ref={inputRef}
          className="sr-only"
          type="file"
          accept={accept}
          multiple
          onChange={(event) => take(event.target.files)}
        />
      </div>

      {jobs.length ? (
        <ul className="mt-4 space-y-2">
          {jobs.map((job) => (
            <li key={job.id} className="rounded-xl border border-white/10 px-3 py-2 text-sm">
              <div className="flex justify-between gap-3">
                <span className="truncate">{job.name}</span>
                <span className="text-paper/60">{job.error ? "Failed" : `${Math.round(job.progress * 100)}%`}</span>
              </div>
              <div className="mt-2 h-px bg-white/10">
                <div className="h-px bg-gold" style={{ width: `${job.progress * 100}%` }} />
              </div>
              {job.error ? <p className="mt-2 text-[#f0b7be]">{job.error}</p> : null}
            </li>
          ))}
        </ul>
      ) : null}

      {items.length === 0 ? (
        <p className="mt-6 text-sm text-paper/60">Nothing here yet. What you add is what she will find.</p>
      ) : (
        <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item, index) => (
            <li key={item.id} className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
              {kind === "photo" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.src} alt="" className="aspect-[4/5] w-full object-cover" />
              ) : (
                <video src={item.src} muted playsInline preload="metadata" className="aspect-video w-full bg-black object-cover" />
              )}
              <div className="space-y-3 p-3">
                <div className="flex items-center justify-between gap-2 text-[0.68rem] tracking-[0.16em] text-gold/80 uppercase">
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <span className="truncate normal-case tracking-normal text-paper/50">{item.fileName}</span>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`caption-${item.id}`}>Caption</Label>
                  <Input
                    id={`caption-${item.id}`}
                    value={item.caption}
                    placeholder="A line she will read under it"
                    className="h-10"
                    onChange={(event) => onCaption(item.id, event.target.value)}
                    onBlur={() => onCommitCaption(item.id)}
                  />
                  <p className="text-xs text-paper/45">
                    {savedCaptions[item.id] === item.caption ? "Saved" : "Unsaved — leave the field to keep it"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="ghost" size="sm" disabled={index === 0} onClick={() => onMove(item.id, -1)}>
                    Earlier
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={index === items.length - 1}
                    onClick={() => onMove(item.id, 1)}
                  >
                    Later
                  </Button>
                  {pendingDelete === item.id ? (
                    <>
                      <Button type="button" variant="destructive" size="sm" onClick={() => onDelete(item.id)}>
                        Yes, remove
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setPendingDelete(null)}>
                        Keep
                      </Button>
                    </>
                  ) : (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setPendingDelete(item.id)}>
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
