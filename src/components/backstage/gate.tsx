"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { readJson } from "@/lib/http";
import type { BackstageResponse } from "@/lib/types";

export function Gate({
  needsSetup,
  onEnter,
}: {
  needsSetup: boolean;
  onEnter: (data: BackstageResponse) => void;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (needsSetup && password !== confirm) {
      setError("Those keys do not match.");
      return;
    }
    setPending(true);
    setError("");
    try {
      const data = await readJson<BackstageResponse>(
        await fetch("/api/backstage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: needsSetup ? "setup" : "login", password }),
        }),
      );
      onEnter(data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The key did not work.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="night">
      <div className="vignette" />
      <div className="grain" />
      <div className="relative z-10 grid min-h-dvh place-items-center px-5 py-16">
        <form onSubmit={(event) => void submit(event)} className="w-full max-w-md rounded-3xl border border-gold/20 bg-card/90 p-7 sm:p-9">
          <p className="font-sans text-[0.72rem] tracking-[0.32em] text-gold/80 uppercase">Backstage</p>
          <h1 className="mt-4 font-display text-5xl leading-none font-light italic">
            {needsSetup ? "Choose your key." : "Welcome back."}
          </h1>
          <p className="mt-4 text-sm leading-6 text-paper/70">
            {needsSetup
              ? "This side is yours alone. She only sees the public page. Pick a key you will remember in the morning."
              : "The public page is already waiting for her. Your key opens the photographs, films, and the letter."}
          </p>
          <div className="mt-8 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="key">{needsSetup ? "New key" : "Your key"}</Label>
              <Input
                id="key"
                type="password"
                autoComplete={needsSetup ? "new-password" : "current-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-11"
                required
                minLength={4}
              />
            </div>
            {needsSetup ? (
              <div className="space-y-2">
                <Label htmlFor="confirm">Type it again</Label>
                <Input
                  id="confirm"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                  className="h-11"
                  required
                  minLength={4}
                />
              </div>
            ) : null}
          </div>
          {error ? <p className="mt-4 text-sm text-[#f0b7be]">{error}</p> : null}
          <Button type="submit" className="mt-6 h-11 w-full" disabled={pending}>
            {pending ? "Opening" : needsSetup ? "Create the key" : "Open backstage"}
          </Button>
          <Link href="/" className="mt-5 block text-center text-sm text-paper/60 underline-offset-4 hover:underline">
            Preview her page
          </Link>
        </form>
      </div>
    </div>
  );
}
