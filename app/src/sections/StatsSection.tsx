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
    <section
      aria-label="Key statistics"
      className="relative py-20 lg:py-24"
      style={{ background: "var(--bg)" }}
    >
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.labelKey}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ delay: i * 0.1, duration: 0.6 }}
              className="glass-card p-6 text-center"
            >
              <div className="text-stat font-bold text-gradient-gold mb-2">
                <AnimatedCounter
                  value={stat.value}
                  prefix={stat.prefix}
                  suffix={stat.suffix}
                  duration={2}
                />
              </div>
              <div
                className="text-sm font-semibold uppercase tracking-wider font-sans mb-1"
                style={{ color: "var(--text-secondary)" }}
              >
                {t(stat.labelKey)}
              </div>
              <div
                className="text-xs font-sans"
                style={{ color: "var(--text-tertiary)" }}
              >
                {t(stat.descKey)}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
