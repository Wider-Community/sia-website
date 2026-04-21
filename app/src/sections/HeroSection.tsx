// Full-width cinematic hero with building skyline background (restored original design)
// Globe moved to WorldMap section for performance
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { FlipWords } from "@/components/effects/FlipWords";
import { useTranslation } from "react-i18next";

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.3,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
    },
  },
};

export function HeroSection() {
  const { t } = useTranslation();

  const flipWords = t("hero.flipWords", { returnObjects: true }) as string[];

  const stats = [
    { value: t("hero.stat1value"), label: t("hero.stat1label") },
    { value: t("hero.stat2value"), label: t("hero.stat2label") },
    { value: t("hero.stat3value"), label: t("hero.stat3label") },
  ];

  return (
    <section aria-labelledby="hero-heading" className="relative min-h-screen flex flex-col overflow-hidden">
      {/* Background Image */}
      <div
        role="img"
        aria-label="Skyline cityscape representing international business and investment"
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url(/images/hero_nyc_skyline.jpg)" }}
      />

      {/* Gradient Overlay — dark charcoal/gold tint */}
      <div className="absolute inset-0 bg-gradient-to-br from-charcoal/80 via-navy/70 to-charcoal/60" />

      {/* Subtle gold accent — gradient instead of blur for performance */}
      <div className="absolute bottom-0 left-0 right-0 h-[200px] bg-gradient-to-t from-gold/[0.04] to-transparent pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 flex-grow flex items-center">
        <div className="w-full max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-32">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="max-w-2xl rtl:max-w-3xl"
          >
            {/* Badge */}
            <motion.div
              variants={itemVariants}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/15 bg-white/5 backdrop-blur-sm mb-8"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
              <span className="text-xs font-medium text-white/70 font-sans">
                {t("hero.badge")}
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              id="hero-heading"
              variants={itemVariants}
              className="text-5xl sm:text-6xl lg:text-7xl font-serif font-medium text-white leading-[1.1] mb-6"
            >
              {t("hero.heading1")}{" "}
              <FlipWords words={flipWords} duration={3000} />
              <br />
              <span className="text-gradient-gold">{t("hero.heading2")}</span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              variants={itemVariants}
              className="text-lg sm:text-xl text-white/70 mb-10 max-w-lg leading-relaxed font-sans"
            >
              {t("hero.subtitle")}
            </motion.p>

            {/* CTAs */}
            <motion.div
              variants={itemVariants}
              className="flex flex-col sm:flex-row gap-4 mb-12"
            >
              <a
                href="#contact"
                className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-gold text-charcoal font-semibold rounded-xl hover:bg-gold-light transition-all hover:shadow-gold-glow text-sm"
              >
                {t("hero.cta")}
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
              </a>
              <a
                href="#about"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 text-white/80 font-medium rounded-xl border border-white/15 hover:border-white/30 hover:bg-white/5 backdrop-blur-sm transition-all text-sm"
              >
                {t("hero.learnMore")}
              </a>
            </motion.div>

            {/* Anchor stats */}
            <motion.div
              variants={itemVariants}
              className="flex items-center gap-6 sm:gap-10"
            >
              {stats.map((stat, i) => (
                <div key={stat.label} className="flex items-center gap-6 sm:gap-10">
                  {i > 0 && <div className="w-px h-10 bg-white/15" />}
                  <div>
                    <div className="text-2xl sm:text-3xl font-serif font-bold text-white">
                      {stat.value}
                    </div>
                    <div className="text-xs text-white/40 font-sans mt-1">
                      {stat.label}
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Bottom gradient fade into next section */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-navy to-transparent pointer-events-none" />
    </section>
  );
}
