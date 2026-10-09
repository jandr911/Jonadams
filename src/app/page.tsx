import CityCanvas from "@/components/city/CityCanvas";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";

export default function Home() {
  return (
    <div className="shell">
      <SiteHeader />
      <main className="shell__stage">
        <CityCanvas />
      </main>
      <SiteFooter />
    </div>
  );
}
