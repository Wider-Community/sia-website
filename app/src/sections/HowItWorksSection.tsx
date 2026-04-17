// Inspired by 21st.dev: anubra266/timeline-animation
// Scroll-triggered deal lifecycle with animated connecting lines
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Search, FileCheck, Puzzle, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";

const steps = [
  { icon: Search, step: "01", titleKey: "howItWorks.step1title", descKey: "howItWorks.step1desc", durationKey: "howItWorks.step1duration" },
  { icon: FileCheck, step: "02", titleKey: "howItWorks.step2title", descKey: "howItWorks.step2desc", durationKey: "howItWorks.step2duration" },
  { icon: Puzzle, step: "03", titleKey: "howItWorks.step3title", descKey: "howItWorks.step3desc", durationKey: "howItWorks.step3duration" },
  { icon: CheckCircle2, step: "04", titleKey: "howItWorks.step4title", descKey: "howItWorks.step4desc", durationKey: "howItWorks.step4duration" },
];

export function HowItWorksSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const { t } = useTranslation();

  return (
    <section id="platform" className="relative bg-[#151516] py-24 lg:py-32" ref={ref}>
      {/* Subtle grid */}
      <div className="absolute inset-0 spotlight-grid opacity-50" />

      <div className="relative z-10 max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-20 max-w-2xl mx-auto">
          <p className="text-gold text-sm font-semibold uppercase tracking-widest mb-4 font-sans">
            {t("howItWorks.label")}
          </p>
          <h2 className="text-section font-serif text-white mb-6">
            {t("howItWorks.heading")}
          </h2>
          <p className="text-white/50 text-lg font-sans">
            {t("howItWorks.subtitle")}
          </p>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[39px] top-0 bottom-0 w-px bg-gradient-to-b from-gold/40 via-gold/20 to-transparent hidden md:block" />
          {/* Mobile vertical line (centered on 56px icon = 28px) */}
          <div className="absolute left-[27px] top-0 bottom-0 w-px bg-gradient-to-b from-gold/30 via-gold/10 to-transparent md:hidden" />

          <div className="space-y-12">
            {steps.map((step, i) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, x: -20 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: i * 0.2, duration: 0.6 }}
                className="flex gap-4 md:gap-8 items-start"
              >
                {/* Step indicator */}
                <div className="relative flex-shrink-0">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={isInView ? { scale: 1 } : {}}
                    transition={{ delay: i * 0.2 + 0.3, type: "spring" }}
                    className="w-14 h-14 md:w-20 md:h-20 rounded-xl md:rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center relative z-10"
                  >
                    <step.icon className="w-6 h-6 md:w-8 md:h-8 text-gold" />
                  </motion.div>
                  {/* Pulse ring */}
                  <motion.div
                    animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
                    transition={{ duration: 3, repeat: Infinity, delay: i * 0.5 }}
                    className="absolute inset-0 rounded-2xl border border-gold/20"
                  />
                </div>

                {/* Content */}
                <div className="flex-1 pb-8">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-gold/40 text-sm font-mono">{step.step}</span>
                    <span className="text-[10px] font-sans text-white/30 uppercase tracking-wider px-2 py-0.5 rounded-full border border-white/10">
                      {t(step.durationKey)}
                    </span>
                  </div>
                  <h3 className="text-xl font-serif font-semibold text-white mb-3">
                    {t(step.titleKey)}
                  </h3>
                  <p className="text-white/45 text-sm leading-relaxed max-w-lg font-sans">
                    {t(step.descKey)}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
