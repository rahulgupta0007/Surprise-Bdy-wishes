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
import { Candle } from "./candle";
import { Flower, Petals } from "./petals";

const OPEN_KEY = "keepsake-candle";
const WHISPERS = ["ours", "this day", "stay", "you", "kept", "soft"];

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
    <div className="garden">
      <Petals />
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
        <p className="font-sans text-[0.72rem] tracking-[0.32em] text-rose uppercase">A word between us</p>
        <h1 className="mt-6 font-display text-[clamp(3.2rem,10vw,5.4rem)] leading-none italic text-balance text-inkrose">
          {herName}
        </h1>
        <p className="mx-auto mt-6 max-w-xs text-inkrose/75">There is a word only the two of you would say.</p>
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

  function blowCandle() {
    if (leaving || isOpen) return;
    playWishTone();
    setLeaving(true);
    window.setTimeout(() => {
      window.sessionStorage.setItem(OPEN_KEY, "1");
      setOpened(true);
      window.scrollTo({ top: 0 });
    }, reduce ? 0 : 1100);
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
            <div className="w-full max-w-3xl text-center text-inkrose">
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 font-sans text-[0.68rem] tracking-[0.16em] text-rose uppercase sm:tracking-[0.28em]">
                <span>Only for you</span>
                <span>
                  {formatBirthday(keepsake.birthday)} {formatBirthdayYear(keepsake.birthday)}
                </span>
              </div>
              <p className="mt-8 font-sans text-[0.74rem] tracking-[0.28em] text-rose uppercase sm:mt-12">
                {keepsake.eyebrow || "A little birthday, kept soft"}
              </p>
              <h1 className="mt-4 font-display text-[clamp(3.15rem,14vw,8.4rem)] leading-[0.9] font-light italic text-balance">
                {keepsake.herName}
              </h1>
              <p className="mx-auto mt-4 max-w-sm font-letter text-lg text-inkrose/80">
                {phase === "today"
                  ? "The morning is yours. Make a wish."
                  : "I lit this before your morning. The day is almost here."}
              </p>
              <button type="button" className="candle-button mt-6" onClick={blowCandle} aria-label="Blow the candle and open your birthday">
                <Candle blown={leaving} className="mx-auto h-56 w-36 sm:h-64 sm:w-40" />
              </button>
              <p className="font-sans text-[0.72rem] tracking-[0.28em] text-rose uppercase">
                {phase === "today" ? "Make a wish" : "Blow the candle"}
              </p>
              {phase === "before" && parts ? <Countdown parts={parts} label="Until your day" /> : null}
              {phase === "today" ? <p className="mt-8 font-letter text-xl text-rose">Today is yours, my love.</p> : null}
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
              <p className="mb-6 flex items-center justify-center gap-3 text-center font-sans text-[0.72rem] tracking-[0.32em] text-rose uppercase">
                <Flower className="h-5 w-5" />
                A letter for you
                <Flower className="h-5 w-5" />
              </p>
              <article className="paper">
                <Flower className="mx-auto -mt-2 mb-6 h-12 w-12" />
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
              <div className="mx-auto mb-8 max-w-3xl px-6 text-inkrose">
                <p className="font-sans text-[0.72rem] tracking-[0.32em] text-rose uppercase">Pressed like flowers</p>
                <h2 className="mt-3 font-display text-5xl leading-none font-light italic sm:text-6xl">The days I kept</h2>
                <p className="mt-4 max-w-md font-letter text-lg text-inkrose/75">
                  They open one after another, soft as petals. Tap any one when you want to stay with it.
                </p>
              </div>
              <Bouquet photos={keepsake.photos} reduce={reduce} />
            </section>
          ) : null}

          {keepsake.videos.length ? (
            <section id="films" className="chapter mx-auto w-full max-w-3xl px-4 pt-24 text-inkrose sm:px-6 sm:pt-32">
              <p className="font-sans text-[0.72rem] tracking-[0.32em] text-rose uppercase">Little films</p>
              <h2 className="mt-3 font-display text-5xl leading-none font-light italic sm:text-6xl">The ones that move</h2>
              <p className="mt-4 max-w-md font-letter text-lg text-inkrose/75">Moving memories, kept just as carefully.</p>
              <div className="mt-10 space-y-12">
                {keepsake.videos.map((video, index) => (
                  <figure key={video.id} className="rounded-[1.8rem] bg-white p-3 shadow-[0_22px_50px_rgba(200,90,130,0.16)]">
                    <video className="aspect-video w-full rounded-[1.2rem] bg-[#3a1c28]" controls playsInline preload="metadata" src={video.src} />
                    <figcaption className="flex items-start gap-3 px-3 py-4">
                      <Flower className="mt-1 h-5 w-5 shrink-0" />
                      <span className="font-letter text-lg">{video.caption || `Film ${pad(index + 1)}`}</span>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </section>
          ) : null}

          <section id="day" className="chapter stage text-center text-inkrose">
            <div className="mx-auto w-full max-w-2xl">
              <div className="mb-4 flex justify-center gap-3">
                <Flower className="h-8 w-8" />
                <Flower className="h-10 w-10" />
                <Flower className="h-8 w-8" />
              </div>
              <p className="font-sans text-[0.72rem] tracking-[0.32em] text-rose uppercase">
                {formatBirthday(keepsake.birthday)} {formatBirthdayYear(keepsake.birthday)}
              </p>
              <h2 className="mt-6 font-display text-[clamp(3.4rem,9vw,6.5rem)] leading-[0.9] font-light italic text-balance">
                Happy birthday,
                <span className="block">{keepsake.herName}</span>
              </h2>
              {keepsake.finaleLine ? (
                <p className="mx-auto mt-8 max-w-md font-letter text-xl text-inkrose/85">{keepsake.finaleLine}</p>
              ) : (
                <p className="mx-auto mt-8 max-w-md font-letter text-xl text-inkrose/85">
                  You are my favourite kind of soft, and today the flowers know your name.
                </p>
              )}
              <p className="mt-6 font-letter text-rose">— {keepsake.hisName}</p>
              <Candle className="mx-auto mt-8 h-40 w-24" />
              {phase === "today" ? <p className="mt-4 font-letter text-xl text-rose">Today is yours, completely.</p> : null}
              {phase === "before" && parts ? <Countdown parts={parts} label="Still a little while" /> : null}
              {phase === "after" ? <p className="mt-8 font-letter text-inkrose/70">The flowers stay, whenever you come back.</p> : null}
            </div>
          </section>
        </motion.div>
      ) : null}

      {isOpen && chapters.length > 1 ? (
        <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-[max(0.8rem,env(safe-area-inset-bottom))]">
          <div className="flex max-w-full gap-1 overflow-x-auto rounded-full border border-petal bg-white/80 p-1.5 shadow-[0_10px_30px_rgba(200,90,130,0.16)] backdrop-blur-md">
            {chapters.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`rounded-full px-3 py-2 font-sans text-[0.68rem] tracking-[0.16em] uppercase transition-colors ${
                  chapter === item.id ? "bg-rose text-white" : "text-inkrose/80 hover:text-inkrose"
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

function Countdown({
  parts,
  label,
}: {
  parts: { days: number; hours: number; minutes: number; seconds: number };
  label: string;
}) {
  return (
    <div className="mx-auto mt-8 max-w-lg">
      <p className="font-sans text-[0.68rem] tracking-[0.28em] text-rose uppercase">{label}</p>
      <div className="mt-4 grid grid-cols-4 gap-2 sm:gap-3">
        {[
          ["Days", parts.days],
          ["Hours", parts.hours],
          ["Minutes", parts.minutes],
          ["Seconds", parts.seconds],
        ].map(([name, value]) => (
          <div key={String(name)} className="rounded-2xl bg-white/80 px-1 py-4 shadow-[0_10px_24px_rgba(200,90,130,0.12)]">
            <div className="font-display text-3xl text-rose italic sm:text-4xl">{pad(Number(value))}</div>
            <div className="mt-2 font-sans text-[0.6rem] tracking-[0.16em] text-inkrose/60 uppercase sm:text-[0.65rem]">{name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Bouquet({ photos, reduce }: { photos: PublicMedia[]; reduce: boolean }) {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const touch = useRef(0);
  const photo = photos[index];

  useEffect(() => {
    if (reduce || paused || photos.length < 2) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % photos.length), 4600);
    return () => window.clearInterval(timer);
  }, [photos.length, paused, reduce]);

  if (!photo) return null;

  return (
    <div>
      <div
        className="mx-auto max-w-3xl px-4"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={(event) => {
          touch.current = event.changedTouches[0]?.clientX ?? 0;
        }}
        onTouchEnd={(event) => {
          const delta = (event.changedTouches[0]?.clientX ?? 0) - touch.current;
          if (delta > 48) setIndex((index - 1 + photos.length) % photos.length);
          if (delta < -48) setIndex((index + 1) % photos.length);
        }}
      >
        <button type="button" className="memory-stage" onClick={() => setOpen(index)} aria-label={photo.caption || "Open this photograph"}>
          <AnimatePresence mode="wait">
            <motion.div
              key={photo.id}
              className="overflow-hidden rounded-[1.2rem]"
              initial={reduce ? false : { opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduce ? undefined : { opacity: 0 }}
              transition={{ duration: reduce ? 0.01 : 0.85, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="memory-photo" src={photo.src} alt={photo.caption || `Photograph ${index + 1}`} />
            </motion.div>
          </AnimatePresence>
          <span className="memory-caption">{photo.caption || "A day I kept for you"}</span>
        </button>
        {photos.length > 1 ? (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {photos.map((item, itemIndex) => (
              <button
                key={item.id}
                type="button"
                className={itemIndex === index ? "blossom-dot on" : "blossom-dot"}
                onClick={() => setIndex(itemIndex)}
                aria-label={`Show photograph ${itemIndex + 1}`}
              />
            ))}
          </div>
        ) : null}
      </div>
      <div className="mx-auto mt-12 grid max-w-5xl grid-cols-2 gap-x-4 gap-y-8 px-4 sm:grid-cols-3 sm:gap-x-6">
        {photos.map((item, itemIndex) => (
          <motion.button
            key={item.id}
            type="button"
            className="polaroid"
            style={{ rotate: `${[-2.5, 2, -1, 2.5, -1.5, 1.2][itemIndex % 6]}deg` }}
            initial={reduce ? false : { opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-30px" }}
            transition={{ duration: reduce ? 0.01 : 0.55, delay: reduce ? 0 : (itemIndex % 3) * 0.08 }}
            onClick={() => setOpen(itemIndex)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.src} alt={item.caption || `Photograph ${itemIndex + 1}`} />
            <span>{item.caption || WHISPERS[itemIndex % WHISPERS.length]}</span>
          </motion.button>
        ))}
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
      className="fixed inset-0 z-50 grid grid-rows-[auto_1fr_auto] bg-[#fff7fa]/95 text-inkrose"
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
        <span className="font-sans text-[0.72rem] tracking-[0.22em] text-rose uppercase">
          {pad(index + 1)} / {pad(photos.length)}
        </span>
        <button ref={closeRef} type="button" className="font-sans text-sm tracking-[0.18em] text-rose uppercase" onClick={onClose}>
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
      <p className="px-6 py-6 text-center font-letter text-lg text-inkrose/85">{photo.caption}</p>
    </div>,
    document.body,
  );
}

function playWishTone() {
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
