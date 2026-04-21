// Inspired by 21st.dev: sean0205/3d-testimonials + Efferd/testimonials-columns
// Testimonial cards with marquee scrolling — fully localized
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Marquee } from "@/components/effects/Marquee";
import { Quote } from "lucide-react";

const testimonialKeys = [
  { quoteKey: "testimonials.t1quote", nameKey: "testimonials.t1name", roleKey: "testimonials.t1role" },
  { quoteKey: "testimonials.t2quote", nameKey: "testimonials.t2name", roleKey: "testimonials.t2role" },
  { quoteKey: "testimonials.t3quote", nameKey: "testimonials.t3name", roleKey: "testimonials.t3role" },
  { quoteKey: "testimonials.t4quote", nameKey: "testimonials.t4name", roleKey: "testimonials.t4role" },
  { quoteKey: "testimonials.t5quote", nameKey: "testimonials.t5name", roleKey: "testimonials.t5role" },
  { quoteKey: "testimonials.t6quote", nameKey: "testimonials.t6name", roleKey: "testimonials.t6role" },
];

function TestimonialCard({ quoteKey, nameKey, roleKey }: { quoteKey: string; nameKey: string; roleKey: string }) {
  const { t } = useTranslation();
  const name = t(nameKey);
  return (
    <div className="w-[350px] shrink-0 p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:border-gold/15 transition-all duration-300 group">
      <Quote className="w-5 h-5 text-gold/30 mb-4" />
      <p className="text-white/50 text-sm leading-relaxed mb-6 font-sans">
        "{t(quoteKey)}"
      </p>
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center">
          <span className="text-gold text-xs font-bold font-sans">
            {name.charAt(0)}
          </span>
        </div>
        <div>
          <div className="text-sm font-medium text-white/80 font-sans">{name}</div>
          <div className="text-xs text-white/30 font-sans">{t(roleKey)}</div>
        </div>
      </div>
    </div>
  );
}

export function TestimonialsSection() {
  const { t } = useTranslation();

  return (
    <section aria-labelledby="testimonials-heading" className="relative bg-navy py-24 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 mb-12">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          className="text-center"
        >
          <p className="text-gold text-sm font-semibold uppercase tracking-widest mb-4 font-sans">
            {t("testimonials.label")}
          </p>
          <h2 id="testimonials-heading" className="text-section font-serif text-white">
            {t("testimonials.heading")}
          </h2>
        </motion.div>
      </div>

      {/* Marquee Row 1 */}
      <div className="mb-4">
        <Marquee speed={50}>
          {testimonialKeys.slice(0, 3).map((tk, i) => (
            <TestimonialCard key={i} {...tk} />
          ))}
        </Marquee>
      </div>

      {/* Marquee Row 2 (reverse) */}
      <Marquee speed={45} reverse>
        {testimonialKeys.slice(3).map((tk, i) => (
          <TestimonialCard key={i} {...tk} />
        ))}
      </Marquee>

      {/* Side fades */}
      <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-navy to-transparent pointer-events-none z-10" />
      <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-navy to-transparent pointer-events-none z-10" />
    </section>
  );
}
