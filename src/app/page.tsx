import CityCanvas from "@/components/city/CityCanvas";
import SiteHeader from "@/components/SiteHeader";
import { SITE } from "@/content/site";

export default function Home() {
  return (
    <div className="shell">
      <SiteHeader />
      <main className="shell__stage">
        <h1 className="sr-only">{SITE.name}</h1>
        <CityCanvas />
      </main>
    </div>
  );
}
