// Inspired by 21st.dev: aceternity/lamp effect
// Dramatic CTA section with lamp glow and border beam
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";
import { Lamp } from "@/components/effects/Lamp";
import { BorderBeam } from "@/components/effects/BorderBeam";

export function CTASection() {
  const { t } = useTranslation();
  return (
    <section id="contact" aria-labelledby="cta-heading" className="relative bg-[#151516] overflow-hidden">
      <Lamp>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="text-center max-w-2xl mx-auto"
        >
          <h2 id="cta-heading" className="text-section font-serif text-white mb-6">
            {t("cta.heading")}
          </h2>
          <p className="text-white/50 text-lg mb-10 font-sans">
            {t("cta.subtitle")}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:hello@sia.agency"
              className="group relative inline-flex items-center justify-center gap-2 px-10 py-4 bg-gold text-charcoal font-semibold rounded-xl hover:bg-gold-light transition-all hover:shadow-gold-glow-lg overflow-hidden"
            >
              <BorderBeam size={100} duration={10} />
              {t("cta.primary")}
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </a>
            <a
              href="#insights"
              className="inline-flex items-center justify-center gap-2 px-10 py-4 text-white/60 font-medium rounded-xl border border-white/10 hover:border-gold/30 hover:text-white transition-all"
            >
              {t("cta.secondary")}
            </a>
          </div>

          {/* Trust micro-copy */}
          <p className="text-white/20 text-xs mt-8 font-sans">
            {t("cta.trust")}
          </p>
        </motion.div>
      </Lamp>
    </section>
  );
}
