// Inspired by 21st.dev: Efferd/footer-section
import { useTranslation } from "react-i18next";
import { MapPin, ArrowUpRight } from "lucide-react";

export function Footer() {
  const { t } = useTranslation();

  const footerLinks = {
    [t("footer.services")]: [
      { label: t("nav.dealFacilitation"), href: "#services" },
      { label: t("nav.marketEntry"), href: "#services" },
      { label: t("nav.regulatoryNav"), href: "#services" },
      { label: "Due Diligence", href: "#services" },
    ],
    [t("footer.sectors")]: [
      { label: t("sectors.halal"), href: "#sectors" },
      { label: t("sectors.healthcare"), href: "#sectors" },
      { label: t("sectors.realEstate"), href: "#sectors" },
      { label: t("sectors.finance"), href: "#sectors" },
    ],
    [t("footer.company")]: [
      { label: t("footer.about"), href: "#about" },
      { label: t("footer.team"), href: "#about" },
      { label: t("nav.insights"), href: "#insights" },
      { label: t("footer.contact"), href: "#contact" },
    ],
    [t("footer.legal")]: [
      { label: t("footer.privacyPolicy"), href: "#" },
      { label: t("footer.terms"), href: "#" },
      { label: t("footer.compliance"), href: "#" },
    ],
  };

  return (
    <footer className="relative bg-charcoal border-t border-white/[0.04]">
      {/* Newsletter strip */}
      <div className="border-b border-white/[0.04]">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-serif font-semibold text-white">
              {t("footer.newsletter")}
            </h3>
            <p className="text-sm text-white/40 font-sans">
              {t("footer.newsletterDesc")}
            </p>
          </div>
          <form className="flex gap-2 w-full md:w-auto" onSubmit={(e) => e.preventDefault()}>
            <input
              type="email"
              placeholder="your@email.com"
              className="flex-1 md:w-64 px-4 py-2.5 bg-white/[0.05] border border-white/[0.08] rounded-lg text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-gold/30 font-sans"
            />
            <button className="px-6 py-2.5 bg-gold text-charcoal text-sm font-semibold rounded-lg hover:bg-gold-light transition-colors whitespace-nowrap">
              {t("footer.subscribe")}
            </button>
          </form>
        </div>
      </div>

      {/* Main footer */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8">
          <div className="col-span-2">
            <img src="/images/sia-logo.png" alt="SIA — Strategic Integration Agency" width="40" height="40" loading="lazy" className="h-10 w-auto mb-4" />
            <p className="text-sm text-white/35 leading-relaxed mb-6 max-w-xs font-sans">
              {t("footer.tagline")}
            </p>
            <div className="text-xs text-gold/60 font-serif italic">{t("footer.motto")}</div>
          </div>
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-4 font-sans">
                {category}
              </h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <a href={link.href} className="text-sm text-white/30 hover:text-white/70 transition-colors font-sans">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        {/* Offices */}
        <div className="mt-16 pt-8 border-t border-white/[0.04] grid md:grid-cols-2 gap-6">
          <div className="flex items-start gap-3">
            <MapPin className="w-4 h-4 text-gold/50 mt-0.5 shrink-0" />
            <div>
              <div className="text-sm font-medium text-white/60 font-sans">{t("footer.riyadh")}</div>
              <div className="text-xs text-white/25 font-sans">{t("footer.riyadhDistrict")}</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <MapPin className="w-4 h-4 text-gold/50 mt-0.5 shrink-0" />
            <div>
              <div className="text-sm font-medium text-white/60 font-sans">{t("footer.kl")}</div>
              <div className="text-xs text-white/25 font-sans">{t("footer.klDistrict")}</div>
            </div>
          </div>
        </div>
      </div>
      {/* Bottom bar */}
      <div className="border-t border-white/[0.04]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="text-xs text-white/20 font-sans">
            &copy; {new Date().getFullYear()} {t("footer.copyright")}
          </div>
          <div className="flex items-center gap-4">
            {["LinkedIn", "X"].map((s) => (
              <a key={s} href="#" className="text-xs text-white/20 hover:text-white/50 transition-colors flex items-center gap-1 font-sans">
                {s} <ArrowUpRight className="w-3 h-3" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
