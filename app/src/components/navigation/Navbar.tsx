// Full-width sticky navbar with centered content
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export function Navbar() {
  const { t, i18n } = useTranslation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const navLinks = [
    { label: t("nav.about"), href: "#about" },
    {
      label: t("nav.services"),
      href: "#services",
      children: [
        { label: t("nav.dealFacilitation"), href: "#services" },
        { label: t("nav.marketEntry"), href: "#services" },
        { label: t("nav.regulatoryNav"), href: "#services" },
      ],
    },
    { label: t("nav.platform"), href: "#platform" },
    { label: t("nav.sectors"), href: "#sectors" },
    { label: t("nav.insights"), href: "#insights" },
  ];

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === "en" ? "ar" : "en");
  };

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <header
        className={cn(
          "fixed top-0 inset-x-0 z-50 w-full transition-all duration-300",
          scrolled
            ? "bg-charcoal/90 backdrop-blur-xl border-b border-white/[0.06] shadow-lg"
            : "bg-transparent"
        )}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 lg:px-8 py-4">
          {/* Logo */}
          <a href="#" className="flex items-center gap-3 shrink-0">
            <img
              src="/images/sia-logo.png"
              alt="SIA — Strategic Integration Agency"
              width="52"
              height="52"
              className="h-[52px] w-auto"
            />
          </a>

          {/* Desktop Nav — centered */}
          <nav aria-label="Main navigation" className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <div
                key={link.label}
                className="relative"
                onMouseEnter={() =>
                  link.children && setActiveDropdown(link.label)
                }
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <a
                  href={link.href}
                  className="px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1 text-white/70 hover:text-white hover:bg-white/5"
                >
                  {link.label}
                  {link.children && (
                    <ChevronDown className="w-3 h-3 rtl:rotate-0" />
                  )}
                </a>

                <AnimatePresence>
                  {link.children && activeDropdown === link.label && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full start-0 mt-2 w-56 rounded-xl bg-charcoal/95 backdrop-blur-xl border border-white/[0.08] p-2 shadow-xl"
                    >
                      {link.children.map((child) => (
                        <a
                          key={child.label}
                          href={child.href}
                          className="block px-4 py-2.5 text-sm text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-start"
                        >
                          {child.label}
                        </a>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </nav>

          {/* Right side — CTA + Language */}
          <div className="hidden lg:flex items-center gap-3 shrink-0">
            <button
              onClick={toggleLanguage}
              className="px-3 py-1.5 text-xs font-medium text-white/50 hover:text-white transition-colors border border-white/10 rounded-lg"
            >
              {t("nav.langToggle")}
            </button>
            <a
              href="#contact"
              className="px-5 py-2 text-sm font-semibold bg-gold text-charcoal rounded-lg hover:bg-gold-light transition-all hover:shadow-gold-glow"
            >
              {t("nav.schedule")}
            </a>
          </div>

          {/* Mobile Toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2 text-white/70 hover:text-white"
          >
            {mobileOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-charcoal/98 backdrop-blur-xl"
          >
            <nav aria-label="Mobile navigation" className="flex flex-col items-center justify-center h-full gap-6">
              {navLinks.map((link, i) => (
                <motion.a
                  key={link.label}
                  href={link.href}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  onClick={() => setMobileOpen(false)}
                  className="text-2xl font-serif text-white/80 hover:text-gold transition-colors"
                >
                  {link.label}
                </motion.a>
              ))}
              <motion.button
                onClick={toggleLanguage}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="text-lg font-medium text-white/50 hover:text-white transition-colors border border-white/10 rounded-lg px-4 py-2"
              >
                {t("nav.langToggle")}
              </motion.button>
              <motion.a
                href="#contact"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                onClick={() => setMobileOpen(false)}
                className="mt-4 px-8 py-3 bg-gold text-charcoal rounded-lg font-semibold"
              >
                {t("nav.schedule")}
              </motion.a>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
