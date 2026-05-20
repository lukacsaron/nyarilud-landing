import { Backdrop } from "@/components/Backdrop";
import { Hero } from "@/components/Hero";
import { Gallery } from "@/components/Gallery";
import { FindUs } from "@/components/FindUs";
import { Footer } from "@/components/Footer";
import { getSite } from "@/lib/site/getSite";

export default async function HomePage() {
  const site = await getSite();
  return (
    <main>
      <Backdrop />
      <Hero slogan={site.meta.slogan} site={site} />
      <Gallery photos={site.gallery} />
      <FindUs site={site} />
      <Footer />
    </main>
  );
}
