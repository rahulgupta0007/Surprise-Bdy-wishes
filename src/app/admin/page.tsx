import type { Metadata } from "next";
import { Studio } from "@/components/backstage/studio";

export const metadata: Metadata = {
  title: "Backstage",
};

export default function AdminPage() {
  return <Studio />;
}
