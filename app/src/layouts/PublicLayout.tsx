import { Outlet } from "react-router-dom";
import { Navbar } from "@/components/navigation/Navbar";
import { Footer } from "@/sections";

export function PublicLayout() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg)" }}>
      <header>
        <Navbar />
      </header>
      <main>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
