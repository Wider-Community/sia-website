// Inspired by 21st.dev: aceternity/3d-card-effect + easemize/spotlight-card
// 3D perspective cards with spotlight tracking for value propositions
import { motion } from "framer-motion";
import { Handshake, Shield, Brain } from "lucide-react";
import { SpotlightCard } from "@/components/effects/SpotlightCard";
import { ThreeDCard, ThreeDCardBody, ThreeDCardItem } from "@/components/effects/ThreeDCard";
import { TextReveal } from "@/components/effects/TextReveal";
import { useTranslation } from "react-i18next";

const cards = [
  {
    icon: Handshake,
    color: "rgba(200, 169, 81, 0.15)",
    titleKey: "valueProps.card1title",
    descKey: "valueProps.card1desc",
    statKey: "valueProps.card1stat",
    statLabelKey: "valueProps.card1statLabel",
  },
  {
    icon: Shield,
    color: "rgba(200, 169, 81, 0.12)",
    titleKey: "valueProps.card2title",
    descKey: "valueProps.card2desc",
    statKey: "valueProps.card2stat",
    statLabelKey: "valueProps.card2statLabel",
  },
  {
    icon: Brain,
    color: "rgba(200, 169, 81, 0.10)",
    titleKey: "valueProps.card3title",
    descKey: "valueProps.card3desc",
    statKey: "valueProps.card3stat",
    statLabelKey: "valueProps.card3statLabel",
  },
];

export function ValuePropsSection() {
  const { t } = useTranslation();

  return (
    <section id="services" aria-labelledby="services-heading" className="relative bg-navy py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            className="text-gold text-sm font-semibold uppercase tracking-widest mb-4 font-sans"
          >
            {t("valueProps.label")}
          </motion.p>
          <h2 id="services-heading" className="text-section font-serif text-white mb-6">
            <TextReveal text={t("valueProps.heading")} />
          </h2>
          <p className="text-white/50 text-lg font-sans">
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
            >
              <ThreeDCard>
                <SpotlightCard
                  spotlightColor={card.color}
                  className="h-full"
                >
                  <ThreeDCardBody className="space-y-6">
                    <ThreeDCardItem translateZ={40}>
                      <div className="w-12 h-12 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center">
                        <card.icon className="w-6 h-6 text-gold" />
                      </div>
                    </ThreeDCardItem>

                    <ThreeDCardItem translateZ={30}>
                      <h3 className="text-xl font-serif font-semibold text-white">
                        {t(card.titleKey)}
                      </h3>
                    </ThreeDCardItem>

                    <ThreeDCardItem translateZ={20}>
                      <p className="text-white/50 text-sm leading-relaxed font-sans">
                        {t(card.descKey)}
                      </p>
                    </ThreeDCardItem>

                    <ThreeDCardItem translateZ={50}>
                      <div className="pt-4 border-t border-white/[0.06]">
                        <div className="text-2xl font-serif font-bold text-gradient-gold">
                          {t(card.statKey)}
                        </div>
                        <div className="text-xs text-white/30 font-sans mt-1">
                          {t(card.statLabelKey)}
                        </div>
                      </div>
                    </ThreeDCardItem>
                  </ThreeDCardBody>
                </SpotlightCard>
              </ThreeDCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
