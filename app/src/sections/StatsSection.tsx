// Inspired by 21st.dev: reuno-ui/animated-number
// Animated statistics with spring-physics counters
import { motion } from "framer-motion";
import { AnimatedCounter } from "@/components/effects/AnimatedCounter";
import { useTranslation } from "react-i18next";

const stats = [
  { value: 18, prefix: "$", suffix: "B+", labelKey: "stats.stat1label", descKey: "stats.stat1desc" },
  { value: 6, suffix: " Mo", labelKey: "stats.stat2label", descKey: "stats.stat2desc" },
  { value: 92, suffix: "%", labelKey: "stats.stat3label", descKey: "stats.stat3desc" },
  { value: 8, suffix: "", labelKey: "stats.stat4label", descKey: "stats.stat4desc" },
];

export function StatsSection() {
  const { t } = useTranslation();

  return (
    <section aria-label="Key statistics" className="relative bg-navy py-24">
      {/* Gold accent line */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />

      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.labelKey}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ delay: i * 0.1, duration: 0.6 }}
              className="text-center"
            >
              <div className="text-stat font-serif font-bold text-white mb-2">
                <AnimatedCounter
                  value={stat.value}
                  prefix={stat.prefix}
                  suffix={stat.suffix}
                  duration={2}
                />
              </div>
              <div className="text-sm font-semibold text-white/70 mb-1 font-sans">
                {t(stat.labelKey)}
              </div>
              <div className="text-xs text-white/30 font-sans">
                {t(stat.descKey)}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
