import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Experience } from "@/components/keepsake/experience";
import { GUEST_COOKIE, guestAllowed } from "@/lib/auth";
import { readContent, toPublic } from "@/lib/store";
import type { KeepsakeResponse } from "@/lib/types";

export async function generateMetadata(): Promise<Metadata> {
  const content = await readContent();
  return { title: { absolute: `For ${content.settings.herName}` } };
}

export default async function Home() {
  const content = await readContent();
  const jar = await cookies();
  const allowed = await guestAllowed(jar.get(GUEST_COOKIE)?.value, content.settings.passphrase);
  const initial: KeepsakeResponse = allowed
    ? toPublic(content)
    : { locked: true, herName: content.settings.herName };
  return <Experience initial={initial} />;
}
