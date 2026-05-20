import { getSite } from "@/lib/site/getSite";
import { MetaSection } from "./sections/MetaSection";
import { HoursSection } from "./sections/HoursSection";
import { ExceptionsSection } from "./sections/ExceptionsSection";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const site = await getSite();
  return (
    <>
      <MetaSection site={site} />
      <HoursSection site={site} />
      <ExceptionsSection site={site} />
    </>
  );
}
