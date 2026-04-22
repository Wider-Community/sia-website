import { motion } from "framer-motion";
import { Search, FileCheck, Puzzle, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";

const steps = [
  { icon: Search, step: "01", titleKey: "howItWorks.step1title", descKey: "howItWorks.step1desc", durationKey: "howItWorks.step1duration" },
  { icon: FileCheck, step: "02", titleKey: "howItWorks.step2title", descKey: "howItWorks.step2desc", durationKey: "howItWorks.step2duration" },
  { icon: Puzzle, step: "03", titleKey: "howItWorks.step3title", descKey: "howItWorks.step3desc", durationKey: "howItWorks.step3duration" },
  { icon: CheckCircle2, step: "04", titleKey: "howItWorks.step4title", descKey: "howItWorks.step4desc", durationKey: "howItWorks.step4duration" },
];

export function HowItWorksSection() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";

  return (
    <section
      id="platform"
      aria-labelledby="process-heading"
      className="relative py-20 lg:py-24"
      style={{ background: "var(--bg)" }}
    >
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-20 max-w-2xl mx-auto">
          <div className="section-label">
            {t("howItWorks.label")}
          </div>
          <h2
            id="process-heading"
            className="text-section font-serif mb-6"
            style={{ color: "var(--text)" }}
          >
            {t("howItWorks.heading")}
          </h2>
          <p className="text-lg font-sans" style={{ color: "var(--text-secondary)" }}>
            {t("howItWorks.subtitle")}
          </p>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical gold line — centered on desktop */}
          <div
            className="absolute top-0 bottom-0 hidden md:block"
            style={{
              width: "2px",
              background: "var(--accent)",
              left: "50%",
              transform: "translateX(-50%)",
            }}
          />
          {/* Mobile vertical line — left side */}
          <div
            className="absolute top-0 bottom-0 md:hidden"
            style={{
              width: "2px",
              background: "var(--accent)",
              insetInlineStart: "19px",
            }}
          />

          <div className="space-y-12 md:space-y-16">
            {steps.map((step, i) => {
              const isLeft = i % 2 === 0;

              return (
                <motion.div
                  key={step.step}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ delay: i * 0.15, duration: 0.6 }}
                  className={`relative flex items-start gap-4 md:items-center ${
                    isLeft ? "md:flex-row" : "md:flex-row-reverse"
                  }`}
                >
                  {/* Mobile layout: icon + content in a row */}
                  {/* Desktop layout: card — circle — card, alternating sides */}

                  {/* Card content */}
                  <div className="flex-1 md:hidden">
                    <div className="glass-card p-6 ms-2">
                      <div className="flex items-center gap-2 mb-2">
                        <step.icon className="w-5 h-5" style={{ color: "var(--accent)" }} />
                        <span
                          className="text-[10px] font-sans uppercase tracking-wider px-2 py-0.5 rounded-full"
                          style={{ color: "var(--text-tertiary)", border: "1px solid var(--border)" }}
                        >
                          {t(step.durationKey)}
                        </span>
                      </div>
                      <h3 className="text-lg font-serif font-semibold mb-2" style={{ color: "var(--text)" }}>
                        {t(step.titleKey)}
                      </h3>
                      <p className="text-sm leading-relaxed font-sans" style={{ color: "var(--text-secondary)" }}>
                        {t(step.descKey)}
                      </p>
                    </div>
                  </div>

                  {/* Desktop card — left or right side */}
                  <div className="hidden md:block flex-1">
                    <div className={`glass-card p-6 ${isLeft ? "me-8" : "ms-8"}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <step.icon className="w-5 h-5" style={{ color: "var(--accent)" }} />
                        <span
                          className="text-[10px] font-sans uppercase tracking-wider px-2 py-0.5 rounded-full"
                          style={{ color: "var(--text-tertiary)", border: "1px solid var(--border)" }}
                        >
                          {t(step.durationKey)}
                        </span>
                      </div>
                      <h3 className="text-xl font-serif font-semibold mb-3" style={{ color: "var(--text)" }}>
                        {t(step.titleKey)}
                      </h3>
                      <p className="text-sm leading-relaxed font-sans" style={{ color: "var(--text-secondary)" }}>
                        {t(step.descKey)}
                      </p>
                    </div>
                  </div>

                  {/* Step circle — centered on the timeline */}
                  <div className="flex-shrink-0 relative z-10">
                    <motion.div
                      initial={{ scale: 0 }}
                      whileInView={{ scale: 1 }}
                      viewport={{ once: true, margin: "-100px" }}
                      transition={{ delay: i * 0.15 + 0.2, type: "spring" }}
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                      style={{ background: "var(--accent)", color: "#fff" }}
                    >
                      {step.step}
                    </motion.div>
                  </div>

                  {/* Empty spacer for the opposite side on desktop */}
                  <div className="hidden md:block flex-1" />
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
