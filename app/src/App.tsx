import { Navbar } from '@/components/navigation/Navbar';
import {
  HeroSection,
  GlobeSection,
  TrustBar,
  ValuePropsSection,
  StatsSection,
  HowItWorksSection,
  SectorsSection,
  TestimonialsSection,
  // CareersSection,
  CTASection,
  Footer,
} from '@/sections';

function App() {
  return (
    <div className="min-h-screen bg-navy">
      <header>
        <Navbar />
      </header>
      <main>
        <HeroSection />
        <GlobeSection />
        <TrustBar />
        <ValuePropsSection />
        <StatsSection />
        <HowItWorksSection />
        <SectorsSection />
        <TestimonialsSection />
        {/* <CareersSection /> — moved to dedicated careers page later */}
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}

export default App;
