import { GlowCursor } from "@/components/glow-cursor"
import { AnimatedDotsBackground } from "@/components/animated-dots-background"
import { Navbar } from "@/components/navbar"
import { HeroSection } from "@/components/hero-section"
import { HowItWorks } from "@/components/how-it-works"
import { FeaturesGrid } from "@/components/features-grid"
import { ArchitectureSection } from "@/components/architecture-section"
import { Footer } from "@/components/footer"

export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#fafaf9]">
      <AnimatedDotsBackground />
      <GlowCursor />
      <Navbar />
      <HeroSection />
      <HowItWorks />
      <FeaturesGrid />
      <ArchitectureSection />
      <Footer />
    </main>
  )
}
