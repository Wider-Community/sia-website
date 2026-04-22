import { motion } from "framer-motion";
import { Handshake, Shield, Brain } from "lucide-react";
import { useTranslation } from "react-i18next";

const cards = [
  {
    icon: Handshake,
    titleKey: "valueProps.card1title",
    descKey: "valueProps.card1desc",
    statKey: "valueProps.card1stat",
    statLabelKey: "valueProps.card1statLabel",
  },
  {
    icon: Shield,
    titleKey: "valueProps.card2title",
    descKey: "valueProps.card2desc",
    statKey: "valueProps.card2stat",
    statLabelKey: "valueProps.card2statLabel",
  },
  {
    icon: Brain,
    titleKey: "valueProps.card3title",
    descKey: "valueProps.card3desc",
    statKey: "valueProps.card3stat",
    statLabelKey: "valueProps.card3statLabel",
  },
];

export function ValuePropsSection() {
  const { t } = useTranslation();

  return (
    <section
      id="services"
      aria-labelledby="services-heading"
      className="relative py-20 lg:py-24"
      style={{ background: "var(--bg)" }}
    >
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            className="section-label"
          >
            {t("valueProps.label")}
          </motion.div>
          <h2
            id="services-heading"
            className="text-section font-serif mb-6"
            style={{ color: "var(--text)" }}
          >
            {t("valueProps.heading")}
          </h2>
          <p className="text-lg font-sans" style={{ color: "var(--text-secondary)" }}>
            {t("valueProps.subtitle")}
          </p>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {cards.map((card, i) => (
            <motion.div
              key={card.titleKey}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ delay: i * 0.15, duration: 0.6 }}
              className="glass-card glass-card-accent p-6"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-6"
                style={{ background: "color-mix(in srgb, var(--accent) 10%, transparent)" }}
              >
                <card.icon className="w-6 h-6" style={{ color: "var(--accent)" }} />
              </div>

              <h3
                className="text-xl font-serif font-semibold mb-3"
                style={{ color: "var(--text)" }}
              >
                {t(card.titleKey)}
              </h3>

              <p
                className="text-sm leading-relaxed font-sans mb-6"
                style={{ color: "var(--text-secondary)" }}
              >
                {t(card.descKey)}
              </p>

              <div
                className="pt-4"
                style={{ borderTop: "1px solid var(--border)" }}
              >
                <div className="text-2xl font-serif font-bold text-gradient-gold">
                  {t(card.statKey)}
                </div>
                <div
                  className="text-xs font-sans mt-1"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {t(card.statLabelKey)}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
