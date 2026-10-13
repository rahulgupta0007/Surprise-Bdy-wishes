import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Studio } from "@/components/backstage/studio";
import { ADMIN_COOKIE, adminAllowed, readAuth } from "@/lib/auth";
import { readContent } from "@/lib/store";
import type { BackstageResponse } from "@/lib/types";

export const metadata: Metadata = {
  title: "Backstage",
};

export default async function AdminPage() {
  const auth = await readAuth();
  const jar = await cookies();
  const needsSetup = !auth.passwordHash;
  const authed = needsSetup ? false : await adminAllowed(jar.get(ADMIN_COOKIE)?.value);
  const initial: BackstageResponse =
    needsSetup
      ? { needsSetup: true, authed: false }
      : authed
        ? { needsSetup: false, authed: true, ...(await readContent()) }
        : { needsSetup: false, authed: false };
  return <Studio initial={initial} />;
}
