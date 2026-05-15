import { Backdrop } from "@/components/Backdrop";
import { Hero } from "@/components/Hero";
import { Gallery } from "@/components/Gallery";
import { FindUs } from "@/components/FindUs";
import { Footer } from "@/components/Footer";

export default function HomePage() {
  return (
    <main>
      <Backdrop />
      <Hero />
      <Gallery />
      <FindUs />
      <Footer />
    </main>
  );
}
