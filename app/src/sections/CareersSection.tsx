import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { MapPin, Clock, Smartphone, ArrowRight } from "lucide-react";

const roles = [
  {
    titleKey: "careers.role1title",
    typeKey: "careers.role1type",
    locationKey: "careers.role1location",
    descKey: "careers.role1desc",
    tagsKeys: ["careers.role1tag1", "careers.role1tag2", "careers.role1tag3"],
    applyHref: "mailto:careers@sia.agency?subject=Mobile Applications Developer",
  },
];

export function CareersSection() {
  const { t } = useTranslation();

  return (
    <section id="careers" className="relative bg-navy py-24 lg:py-32">
      <div className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-gold text-sm font-semibold uppercase tracking-widest mb-4 font-sans">
            {t("careers.label")}
          </p>
          <h2 className="text-section font-serif text-white mb-4">
            {t("careers.heading")}
          </h2>
          <p className="text-white/45 text-lg max-w-xl mx-auto font-sans">
            {t("careers.subtitle")}
          </p>
        </div>

        {/* Role cards */}
        <div className="space-y-6">
          {roles.map((role, i) => (
            <motion.div
              key={role.titleKey}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="group p-6 md:p-8 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:border-gold/20 transition-all duration-300"
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex-1 space-y-3">
                  {/* Title + icon */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gold/[0.08] border border-gold/[0.15] flex items-center justify-center shrink-0">
                      <Smartphone className="w-5 h-5 text-gold/70" />
                    </div>
                    <h3 className="text-lg font-serif font-semibold text-white/90 group-hover:text-white transition-colors">
                      {t(role.titleKey)}
                    </h3>
                  </div>

                  {/* Meta */}
                  <div className="flex flex-wrap gap-4 text-sm text-white/40 font-sans">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {t(role.typeKey)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      {t(role.locationKey)}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-white/40 text-sm leading-relaxed font-sans">
                    {t(role.descKey)}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {role.tagsKeys.map((tagKey) => (
                      <span
                        key={tagKey}
                        className="px-3 py-1 text-xs rounded-full bg-gold/[0.06] text-gold/60 border border-gold/[0.1] font-sans"
                      >
                        {t(tagKey)}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Apply button */}
                <a
                  href={role.applyHref}
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-charcoal bg-gold rounded-xl hover:bg-gold-light transition-all hover:shadow-gold-glow shrink-0 self-start md:self-center"
                >
                  {t("careers.apply")}
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
