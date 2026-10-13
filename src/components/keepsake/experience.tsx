"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { birthdayPhase, countdownParts, formatBirthday, formatBirthdayYear, pad } from "@/lib/format";
import { readJson } from "@/lib/http";
import type { KeepsakeResponse, PublicKeepsake, PublicMedia } from "@/lib/types";
import { WaxSeal } from "./wax-seal";

const OPEN_KEY = "keepsake-open";

function subscribeOpen() {
  return () => undefined;
}

function readOpened() {
  return window.sessionStorage.getItem(OPEN_KEY) === "1";
}

export function Experience({ initial }: { initial: KeepsakeResponse }) {
  const [keepsake, setKeepsake] = useState<PublicKeepsake | null>(initial.locked ? null : initial);
  const [lockedName, setLockedName] = useState(initial.herName);
  const reduce = useReducedMotion();

  return (
    <div className="night">
      <div className="vignette" />
      <div className="grain" />
      <div className="relative z-10">
        {keepsake ? (
          <Story keepsake={keepsake} reduce={Boolean(reduce)} />
        ) : (
          <WordGate
            herName={lockedName}
            onOpen={(data) => {
              setLockedName(data.herName);
              setKeepsake(data);
              document.title = `For ${data.herName}`;
            }}
          />
        )}
      </div>
    </div>
  );
}

function WordGate({ herName, onOpen }: { herName: string; onOpen: (data: PublicKeepsake) => void }) {
  const [word, setWord] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const data = await readJson<PublicKeepsake>(
        await fetch("/api/keepsake/unlock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ word }),
        }),
      );
      onOpen(data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Not that one.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="stage">
      <form onSubmit={(event) => void submit(event)} className="w-full max-w-md text-center">
        <p className="font-sans text-[0.72rem] tracking-[0.32em] text-gold/80 uppercase">Before the seal</p>
        <h1 className="mt-6 font-display text-[clamp(3.2rem,10vw,5.4rem)] leading-none italic text-balance">
          {herName}
        </h1>
        <p className="mx-auto mt-6 max-w-xs text-paper/75">There is a word only the two of you would say.</p>
        <Label htmlFor="word" className="sr-only">
          The word
        </Label>
        <Input
          id="word"
          value={word}
          onChange={(event) => setWord(event.target.value)}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="mt-8 h-12 text-center font-display text-2xl"
          placeholder="The word"
        />
        {error ? <p className="mt-3 text-sm text-[#f0b7be]">{error}</p> : null}
        <Button type="submit" className="mt-6 h-11 px-6" disabled={pending || !word.trim()}>
          {pending ? "Opening" : "Enter"}
        </Button>
      </form>
    </div>
  );
}

function Story({ keepsake, reduce }: { keepsake: PublicKeepsake; reduce: boolean }) {
  const storedOpen = useSyncExternalStore(subscribeOpen, readOpened, () => false);
  const [opened, setOpened] = useState<boolean | null>(null);
  const isOpen = opened ?? storedOpen;
  const [leaving, setLeaving] = useState(false);
  const [chapter, setChapter] = useState("letter");
  const [now, setNow] = useState<number | null>(null);

  const notes = keepsake.notes.filter((note) => note.body.trim());
  const letterVisible = Boolean(keepsake.letterLead.trim() || notes.length);
  const chapters = useMemo(() => {
    const items: { id: string; label: string }[] = [];
    if (letterVisible) items.push({ id: "letter", label: "Letter" });
    if (keepsake.photos.length) items.push({ id: "pictures", label: "Pictures" });
    if (keepsake.videos.length) items.push({ id: "films", label: "Films" });
    items.push({ id: "day", label: "The day" });
    return items;
  }, [keepsake.photos.length, keepsake.videos.length, letterVisible]);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0);
    const timer = window.setInterval(tick, 1000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, []);

  const chapterKey = chapters.map((item) => item.id).join(",");
  useEffect(() => {
    if (!isOpen) return;
    const nodes = chapterKey
      .split(",")
      .map((id) => document.getElementById(id))
      .filter((node): node is HTMLElement => Boolean(node));
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setChapter(visible.target.id);
      },
      { rootMargin: "-35% 0px -45% 0px", threshold: [0.15, 0.4] },
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [isOpen, chapterKey]);

  function openSeal() {
    if (leaving || isOpen) return;
    playSealTone();
    setLeaving(true);
    window.setTimeout(() => {
      window.sessionStorage.setItem(OPEN_KEY, "1");
      setOpened(true);
      window.scrollTo({ top: 0 });
    }, reduce ? 0 : 780);
  }

  const phase = now === null ? null : birthdayPhase(keepsake.birthday, new Date(now));
  const parts = now === null ? null : countdownParts(keepsake.birthday, new Date(now));

  return (
    <>
      <AnimatePresence>
        {!isOpen ? (
          <motion.section
            key="seal"
            className="stage"
            initial={false}
            animate={leaving ? { opacity: 0, y: reduce ? 0 : -28 } : { opacity: 1, y: 0 }}
            transition={{ duration: reduce ? 0.01 : 0.75, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="w-full max-w-3xl text-center">
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 font-sans text-[0.68rem] tracking-[0.16em] text-gold/75 uppercase sm:tracking-[0.28em]">
                <span>Only for you</span>
                <span>
                  {formatBirthday(keepsake.birthday)} {formatBirthdayYear(keepsake.birthday)}
                </span>
              </div>
              <p className="mt-10 font-sans text-[0.74rem] tracking-[0.28em] text-gold/80 uppercase sm:mt-16 sm:tracking-[0.34em]">
                {keepsake.eyebrow || "A birthday, kept quiet"}
              </p>
              <h1 className="mt-5 font-display text-[clamp(3.15rem,14vw,8.4rem)] leading-[0.9] font-light italic text-balance">
                {keepsake.herName}
              </h1>
              <button type="button" className="seal-button mt-12" onClick={openSeal} aria-label="Break the seal">
                <WaxSeal letter={keepsake.herName} className="seal-idle h-40 w-40 sm:h-48 sm:w-48" />
              </button>
              <p className="mt-6 font-sans text-[0.72rem] tracking-[0.28em] text-paper/70 uppercase">Press the seal</p>
              {keepsake.openingLine ? (
                <p className="mx-auto mt-8 max-w-sm font-letter text-lg text-paper/80">{keepsake.openingLine}</p>
              ) : null}
            </div>
          </motion.section>
        ) : null}
      </AnimatePresence>

      {isOpen ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: reduce ? 0.01 : 0.7 }}
          className="pb-28"
        >
          <h1 className="sr-only">A birthday for {keepsake.herName}</h1>
          {letterVisible ? (
            <section id="letter" className="chapter mx-auto w-full max-w-3xl px-4 pt-16 sm:px-6 sm:pt-24">
              <p className="mb-6 text-center font-sans text-[0.72rem] tracking-[0.32em] text-gold/80 uppercase">
                The letter
              </p>
              <article className="paper">
                <WaxSeal letter={keepsake.herName} className="mx-auto -mt-4 mb-8 h-28 w-28" />
                <div className="letter-copy">
                  {keepsake.letterLead.trim() ? <p className="lead">{keepsake.letterLead}</p> : null}
                  {notes.map((note, index) => (
                    <div className="note" key={note.id}>
                      {index > 0 || keepsake.letterLead.trim() ? <div className="ornament" aria-hidden /> : null}
                      {note.title.trim() ? <p className="note-title">{note.title}</p> : null}
                      <p className={!keepsake.letterLead.trim() && index === 0 ? "drop" : undefined}>{note.body}</p>
                    </div>
                  ))}
                  <p className="signature">— {keepsake.hisName}</p>
                </div>
              </article>
            </section>
          ) : null}

          {keepsake.photos.length ? (
            <section id="pictures" className="chapter pt-24 sm:pt-32">
              <div className="mx-auto mb-8 max-w-3xl px-6">
                <p className="font-sans text-[0.72rem] tracking-[0.32em] text-gold/80 uppercase">The photographs</p>
                <h2 className="mt-3 font-display text-5xl leading-none font-light italic sm:text-6xl">Held up to the light</h2>
                <p className="mt-4 max-w-md text-paper/70">Slide across. Tap a frame when you want to look longer.</p>
              </div>
              <Filmstrip photos={keepsake.photos} />
            </section>
          ) : null}

          {keepsake.videos.length ? (
            <section id="films" className="chapter mx-auto w-full max-w-3xl px-4 pt-24 sm:px-6 sm:pt-32">
              <p className="font-sans text-[0.72rem] tracking-[0.32em] text-gold/80 uppercase">The films</p>
              <h2 className="mt-3 font-display text-5xl leading-none font-light italic sm:text-6xl">A private screening</h2>
              <div className="mt-10 space-y-12">
                {keepsake.videos.map((video, index) => (
                  <figure key={video.id}>
                    <div className="frame">
                      <video className="aspect-video w-full bg-black" controls playsInline preload="metadata" src={video.src} />
                    </div>
                    <figcaption className="mt-4 flex gap-4 text-paper/75">
                      <span className="font-sans text-[0.68rem] tracking-[0.22em] text-gold uppercase">
                        {pad(index + 1)}
                      </span>
                      <span className="font-letter">{video.caption}</span>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </section>
          ) : null}

          <section id="day" className="chapter stage text-center">
            <div className="mx-auto w-full max-w-2xl">
              <p className="font-sans text-[0.72rem] tracking-[0.32em] text-gold/80 uppercase">
                {formatBirthday(keepsake.birthday)} {formatBirthdayYear(keepsake.birthday)}
              </p>
              <h2 className="mt-6 font-display text-[clamp(3.4rem,9vw,6.5rem)] leading-[0.9] font-light italic text-balance">
                Happy birthday,
                <span className="block">{keepsake.herName}</span>
              </h2>
              {keepsake.finaleLine ? (
                <p className="mx-auto mt-8 max-w-md font-letter text-xl text-paper/85">{keepsake.finaleLine}</p>
              ) : null}
              <p className="mt-6 font-letter text-paper/60">— {keepsake.hisName}</p>
              {phase === "today" ? <p className="mt-10 font-letter text-xl text-gold">Today is yours.</p> : null}
              {phase === "before" && parts ? (
                <div className="mx-auto mt-12 max-w-lg">
                  <p className="font-sans text-[0.68rem] tracking-[0.28em] text-gold/80 uppercase">Until the day begins</p>
                  <div className="mt-4 grid grid-cols-4 gap-2 sm:gap-3">
                    {[
                      ["Days", parts.days],
                      ["Hours", parts.hours],
                      ["Minutes", parts.minutes],
                      ["Seconds", parts.seconds],
                    ].map(([label, value]) => (
                      <div key={String(label)} className="border border-gold/25 px-1 py-4">
                        <div className="font-display text-3xl italic sm:text-4xl">{pad(Number(value))}</div>
                        <div className="mt-2 font-sans text-[0.6rem] tracking-[0.16em] text-gold/75 uppercase sm:text-[0.65rem]">
                          {label}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {phase === "after" ? <p className="mt-10 text-paper/60">Still yours, whenever you open this.</p> : null}
            </div>
          </section>
        </motion.div>
      ) : null}

      {isOpen && chapters.length > 1 ? (
        <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-[max(0.8rem,env(safe-area-inset-bottom))]">
          <div className="flex max-w-full gap-1 overflow-x-auto rounded-full border border-gold/20 bg-black/50 p-1.5 backdrop-blur-md">
            {chapters.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`rounded-full px-3 py-2 font-sans text-[0.68rem] tracking-[0.16em] uppercase transition-colors ${
                  chapter === item.id ? "bg-gold text-ink" : "text-paper/80 hover:text-paper"
                }`}
                onClick={() => document.getElementById(item.id)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth" })}
              >
                {item.label}
              </button>
            ))}
          </div>
        </nav>
      ) : null}
    </>
  );
}

function Filmstrip({ photos }: { photos: PublicMedia[] }) {
  const scroller = useRef<HTMLDivElement>(null);
  const drag = useRef({ active: false, moved: false, x: 0, left: 0 });
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState<number | null>(null);

  function measure() {
    const el = scroller.current;
    if (!el) return;
    const center = el.getBoundingClientRect().left + el.clientWidth / 2;
    const frames = [...el.querySelectorAll<HTMLElement>("[data-frame]")];
    let best = 0;
    let bestDist = Number.POSITIVE_INFINITY;
    frames.forEach((frame, index) => {
      const rect = frame.getBoundingClientRect();
      const dist = Math.abs(rect.left + rect.width / 2 - center);
      if (dist < bestDist) {
        best = index;
        bestDist = dist;
      }
    });
    setActive(best);
  }

  function scrollByFrame(direction: -1 | 1) {
    const el = scroller.current;
    const frame = el?.querySelector<HTMLElement>("[data-frame]");
    if (!el || !frame) return;
    el.scrollBy({ left: direction * (frame.offsetWidth + 16), behavior: "smooth" });
  }

  const photo = photos[active];

  return (
    <div>
      <div className="relative">
        <div
          ref={scroller}
          className="film"
          onScroll={measure}
          onPointerDown={(event) => {
            if (event.pointerType === "touch" || !scroller.current) return;
            drag.current = { active: true, moved: false, x: event.clientX, left: scroller.current.scrollLeft };
            scroller.current.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (!drag.current.active || !scroller.current) return;
            const delta = event.clientX - drag.current.x;
            if (Math.abs(delta) > 4) drag.current.moved = true;
            scroller.current.scrollLeft = drag.current.left - delta;
          }}
          onPointerUp={() => {
            drag.current.active = false;
          }}
        >
          {photos.map((item, index) => (
            <figure key={item.id} data-frame className="film-frame">
              <button
                type="button"
                className="block w-full"
                onClick={() => {
                  if (drag.current.moved) {
                    drag.current.moved = false;
                    return;
                  }
                  setOpen(index);
                }}
                aria-label={item.caption || `Open photograph ${index + 1}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.src} alt={item.caption || `Photograph ${index + 1}`} draggable={false} />
              </button>
            </figure>
          ))}
        </div>
        {photos.length > 1 ? (
          <>
            <button type="button" className="film-nav left-3" onClick={() => scrollByFrame(-1)} aria-label="Previous photograph">
              ‹
            </button>
            <button type="button" className="film-nav right-3" onClick={() => scrollByFrame(1)} aria-label="Next photograph">
              ›
            </button>
          </>
        ) : null}
      </div>
      <div className="mx-auto mt-6 flex max-w-3xl items-baseline gap-4 px-6">
        <span className="font-sans text-[0.72rem] tracking-[0.22em] text-gold uppercase">
          {pad(active + 1)} / {pad(photos.length)}
        </span>
        <AnimatePresence mode="wait">
          <motion.p
            key={photo?.id ?? "empty"}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            className="font-letter text-lg text-paper/85"
          >
            {photo?.caption || " "}
          </motion.p>
        </AnimatePresence>
      </div>
      <div className="mx-auto mt-5 h-px max-w-3xl bg-white/10">
        <div
          className="h-px bg-gold transition-[width] duration-300"
          style={{ width: `${photos.length <= 1 ? 100 : (active / (photos.length - 1)) * 100}%` }}
        />
      </div>
      {open !== null ? <Lightbox photos={photos} index={open} onIndex={setOpen} onClose={() => setOpen(null)} /> : null}
    </div>
  );
}

function Lightbox({
  photos,
  index,
  onIndex,
  onClose,
}: {
  photos: PublicMedia[];
  index: number;
  onIndex: (index: number) => void;
  onClose: () => void;
}) {
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const touch = useRef(0);
  const closeRef = useRef<HTMLButtonElement>(null);
  const photo = photos[index];

  useEffect(() => {
    closeRef.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") onIndex((index + 1) % photos.length);
      if (event.key === "ArrowLeft") onIndex((index - 1 + photos.length) % photos.length);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [index, onClose, onIndex, photos.length]);

  if (!mounted || !photo) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 grid grid-rows-[auto_1fr_auto] bg-black/92 text-paper"
      role="dialog"
      aria-modal="true"
      aria-label={photo.caption || "Photograph"}
      onTouchStart={(event) => {
        touch.current = event.changedTouches[0]?.clientX ?? 0;
      }}
      onTouchEnd={(event) => {
        const delta = (event.changedTouches[0]?.clientX ?? 0) - touch.current;
        if (delta > 48) onIndex((index - 1 + photos.length) % photos.length);
        if (delta < -48) onIndex((index + 1) % photos.length);
      }}
    >
      <div className="flex items-center justify-between px-4 py-4 sm:px-6">
        <span className="font-sans text-[0.72rem] tracking-[0.22em] text-gold uppercase">
          {pad(index + 1)} / {pad(photos.length)}
        </span>
        <button ref={closeRef} type="button" className="font-sans text-sm tracking-[0.18em] uppercase" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="relative grid place-items-center px-4">
        {photos.length > 1 ? (
          <button
            type="button"
            className="absolute left-2 hidden h-full px-3 font-display text-5xl sm:block"
            onClick={() => onIndex((index - 1 + photos.length) % photos.length)}
            aria-label="Previous photograph"
          >
            ‹
          </button>
        ) : null}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.src}
          alt={photo.caption || `Photograph ${index + 1}`}
          className="max-h-[72dvh] max-w-full object-contain"
        />
        {photos.length > 1 ? (
          <button
            type="button"
            className="absolute right-2 hidden h-full px-3 font-display text-5xl sm:block"
            onClick={() => onIndex((index + 1) % photos.length)}
            aria-label="Next photograph"
          >
            ›
          </button>
        ) : null}
      </div>
      <p className="px-6 py-6 text-center font-letter text-lg text-paper/85">{photo.caption}</p>
    </div>,
    document.body,
  );
}

function playSealTone() {
  const Context = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Context) return;
  const ctx = new Context();
  const master = ctx.createGain();
  master.gain.value = 0.8;
  master.connect(ctx.destination);
  [196, 246.94, 311.13, 392].forEach((freq, index) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = index === 0 ? "triangle" : "sine";
    osc.frequency.value = freq;
    const start = ctx.currentTime + index * 0.05;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.03, start + 0.09);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 2.6);
    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + 2.8);
  });
  window.setTimeout(() => void ctx.close(), 3400);
}
