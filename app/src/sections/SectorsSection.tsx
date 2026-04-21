// Inspired by 21st.dev: aceternity/3d-card-effect + bento grid
// Sector cards with 3D hover effects
import { motion } from "framer-motion";
import {
  Utensils,
  HeartPulse,
  Building2,
  Cpu,
  Landmark,
  Zap,
  Plane,
  Package,
} from "lucide-react";
import { ThreeDCard } from "@/components/effects/ThreeDCard";
import { useTranslation } from "react-i18next";

const sectors = [
  { icon: Utensils, nameKey: "sectors.halal", descKey: "sectors.halalDesc" },
  { icon: HeartPulse, nameKey: "sectors.healthcare", descKey: "sectors.healthcareDesc" },
  { icon: Building2, nameKey: "sectors.realEstate", descKey: "sectors.realEstateDesc" },
  { icon: Cpu, nameKey: "sectors.tech", descKey: "sectors.techDesc" },
  { icon: Landmark, nameKey: "sectors.finance", descKey: "sectors.financeDesc" },
  { icon: Zap, nameKey: "sectors.energy", descKey: "sectors.energyDesc" },
  { icon: Plane, nameKey: "sectors.tourism", descKey: "sectors.tourismDesc" },
  { icon: Package, nameKey: "sectors.logistics", descKey: "sectors.logisticsDesc" },
];

export function SectorsSection() {
  const { t } = useTranslation();

  return (
    <section id="sectors" aria-labelledby="sectors-heading" className="relative bg-navy py-24 lg:py-32">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-gold text-sm font-semibold uppercase tracking-widest mb-4 font-sans">
            {t("sectors.label")}
          </p>
          <h2 id="sectors-heading" className="text-section font-serif text-white mb-4">
            {t("sectors.heading")}
          </h2>
          <p className="text-white/45 text-lg max-w-xl mx-auto font-sans">
            {t("sectors.subtitle")}
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {sectors.map((sector, i) => (
            <motion.div
              key={sector.nameKey}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
            >
              <ThreeDCard>
                <div className="group p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-gold/20 transition-all duration-300 cursor-pointer text-center">
                  <div className="w-12 h-12 rounded-xl bg-gold/[0.08] border border-gold/[0.15] flex items-center justify-center mx-auto mb-4 group-hover:bg-gold/[0.15] transition-colors">
                    <sector.icon className="w-6 h-6 text-gold/70 group-hover:text-gold transition-colors" />
                  </div>
                  <h3 className="font-serif font-semibold text-white/80 group-hover:text-white transition-colors mb-1">
                    {t(sector.nameKey)}
                  </h3>
                  <p className="text-xs text-white/30 font-sans">
                    {t(sector.descKey)}
                  </p>
                </div>
              </ThreeDCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
