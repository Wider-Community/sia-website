// Corridor section — KSA-Malaysia connection with 2D map and flags
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";

// Simplified Middle East + Southeast Asia coastline path (lightweight)
const mapPath =
  "M 30,85 L 45,78 55,80 62,72 70,70 75,65 80,68 88,62 95,65 100,60 108,58 112,62 118,58 125,60 130,55 138,52 142,56 148,50 155,48 160,52 168,55 172,50 178,48 185,52 190,48 195,52 200,55 208,52 215,58 220,62 228,60 235,65 240,62 248,68 255,65 260,70 268,72 275,68 280,75 288,72 295,78 300,75 308,80 315,78 320,82 328,85 335,82 340,88 348,85 355,90 360,88 365,92 370,95";

// Saudi Arabia flag — green field with white Shahada text and sword
function SaudiFlag({ x, y, size = 36 }: { x: number; y: number; size?: number }) {
  const w = size;
  const h = size * 0.667;
  return (
    <g transform={`translate(${x - w / 2}, ${y - h - 4})`}>
      <rect x="1" y="1" width={w} height={h} rx="2" fill="black" opacity="0.2" />
      <rect width={w} height={h} rx="2" fill="#006C35" />
      {/* Shahada — Arabic calligraphy rendered as SVG text */}
      <text
        x={w / 2}
        y={h * 0.42}
        textAnchor="middle"
        fill="white"
        fontSize={h * 0.28}
        fontFamily="'Noto Sans Arabic', 'Arial', sans-serif"
        fontWeight="700"
        direction="rtl"
      >
        لا إله إلا الله
      </text>
      {/* Sword — curved blade pointing left with guard */}
      <line x1={w * 0.12} y1={h * 0.72} x2={w * 0.88} y2={h * 0.72} stroke="white" strokeWidth="1.2" strokeLinecap="round" />
      <path d={`M ${w * 0.88} ${h * 0.65} L ${w * 0.88} ${h * 0.79}`} stroke="white" strokeWidth="1" strokeLinecap="round" />
      <circle cx={w * 0.12} cy={h * 0.72} r="1" fill="white" />
      <rect width={w} height={h} rx="2" fill="none" stroke="white" strokeWidth="0.5" opacity="0.2" />
    </g>
  );
}

// Malaysia flag — 14 red/white stripes, blue canton with crescent and star
function MalaysiaFlag({ x, y, size = 36 }: { x: number; y: number; size?: number }) {
  const w = size;
  const h = size * 0.667;
  const stripeH = h / 14;
  return (
    <g transform={`translate(${x - w / 2}, ${y - h - 4})`}>
      {/* Shadow */}
      <rect x="1" y="1" width={w} height={h} rx="2" fill="black" opacity="0.2" />
      {/* White base */}
      <rect width={w} height={h} rx="2" fill="white" />
      {/* 7 red stripes */}
      {Array.from({ length: 7 }).map((_, i) => (
        <rect key={i} y={i * stripeH * 2} width={w} height={stripeH} fill="#CC0001" rx={i === 0 ? 2 : 0} />
      ))}
      {/* Blue canton */}
      <rect width={w * 0.45} height={h * 0.57} fill="#010066" rx="2" />
      {/* Crescent */}
      <circle cx={w * 0.18} cy={h * 0.28} r={h * 0.17} fill="#FFCC00" />
      <circle cx={w * 0.21} cy={h * 0.26} r={h * 0.13} fill="#010066" />
      {/* Star — simplified as small yellow shape */}
      <polygon
        points={`${w * 0.3},${h * 0.18} ${w * 0.32},${h * 0.25} ${w * 0.38},${h * 0.25} ${w * 0.33},${h * 0.3} ${w * 0.35},${h * 0.37} ${w * 0.3},${h * 0.33} ${w * 0.25},${h * 0.37} ${w * 0.27},${h * 0.3} ${w * 0.22},${h * 0.25} ${w * 0.28},${h * 0.25}`}
        fill="#FFCC00"
      />
      {/* Border */}
      <rect width={w} height={h} rx="2" fill="none" stroke="white" strokeWidth="0.5" opacity="0.2" />
    </g>
  );
}

export function GlobeSection() {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  const facts = [
    { label: t("globe.fact1"), detail: t("globe.fact1detail") },
    { label: t("globe.fact2"), detail: t("globe.fact2detail") },
    { label: t("globe.fact3"), detail: t("globe.fact3detail") },
    { label: t("globe.fact4"), detail: t("globe.fact4detail") },
  ];

  return (
    <section
      ref={ref}
      className="relative bg-[#151516] py-20 lg:py-28 overflow-hidden"
    >
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />

      <div className="max-w-6xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left: Map Visual */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.6 }}
            className="order-2 lg:order-1"
          >
            <div className="relative p-6 sm:p-8 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
              <svg viewBox="0 0 400 240" className="w-full h-auto" fill="none">
                {/* Grid lines */}
                {Array.from({ length: 11 }).map((_, i) => (
                  <line key={`h${i}`} x1="0" y1={i * 24} x2="400" y2={i * 24} stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
                ))}
                {Array.from({ length: 17 }).map((_, i) => (
                  <line key={`v${i}`} x1={i * 25} y1="0" x2={i * 25} y2="240" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
                ))}

                {/* Simplified coastline */}
                <path
                  d={mapPath}
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth="1"
                  fill="none"
                />

                {/* $18B+ label — well above the arc */}
                <text x="200" y="22" textAnchor="middle" fill="#C8A951" fontSize="16" fontFamily="Playfair Display, serif" fontWeight="600">
                  $18B+
                </text>
                <text x="200" y="38" textAnchor="middle" fill="white" fontSize="9" fontFamily="Inter, sans-serif" opacity="0.4">
                  bilateral trade corridor
                </text>

                {/* Connection arc — lower, away from text */}
                <motion.path
                  d="M 90 120 Q 200 60 320 140"
                  stroke="#C8A951"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray="6 4"
                  fill="none"
                  initial={{ pathLength: 0 }}
                  animate={isInView ? { pathLength: 1 } : {}}
                  transition={{ duration: 1.5, delay: 0.3, ease: "easeInOut" }}
                />
                <motion.path
                  d="M 90 120 Q 200 60 320 140"
                  stroke="#C8A951"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeOpacity="0.06"
                  fill="none"
                  initial={{ pathLength: 0 }}
                  animate={isInView ? { pathLength: 1 } : {}}
                  transition={{ duration: 1.5, delay: 0.3, ease: "easeInOut" }}
                />

                {/* KSA — flag + marker */}
                <SaudiFlag x={90} y={100} size={28} />
                <motion.circle cx="90" cy="120" r="5" fill="#C8A951" opacity="0.15"
                  animate={isInView ? { r: [5, 12, 5], opacity: [0.15, 0, 0.15] } : {}}
                  transition={{ duration: 2.5, repeat: Infinity }}
                />
                <circle cx="90" cy="120" r="4" fill="#C8A951" />
                <circle cx="90" cy="120" r="1.5" fill="white" opacity="0.9" />
                <text x="90" y="140" textAnchor="middle" fill="white" fontSize="10" fontFamily="Inter, sans-serif" fontWeight="600" opacity="0.7">
                  Saudi Arabia
                </text>
                <text x="90" y="152" textAnchor="middle" fill="white" fontSize="7" fontFamily="Inter, sans-serif" opacity="0.35">
                  Riyadh
                </text>

                {/* Malaysia — flag + marker */}
                <MalaysiaFlag x={320} y={120} size={28} />
                <motion.circle cx="320" cy="140" r="5" fill="#C8A951" opacity="0.15"
                  animate={isInView ? { r: [5, 12, 5], opacity: [0.15, 0, 0.15] } : {}}
                  transition={{ duration: 2.5, repeat: Infinity, delay: 0.8 }}
                />
                <circle cx="320" cy="140" r="4" fill="#C8A951" />
                <circle cx="320" cy="140" r="1.5" fill="white" opacity="0.9" />
                <text x="320" y="160" textAnchor="middle" fill="white" fontSize="10" fontFamily="Inter, sans-serif" fontWeight="600" opacity="0.7">
                  Malaysia
                </text>
                <text x="320" y="172" textAnchor="middle" fill="white" fontSize="7" fontFamily="Inter, sans-serif" opacity="0.35">
                  Kuala Lumpur
                </text>

                {/* Midpoint indicator */}
                <circle cx="200" cy="78" r="2" fill="#C8A951" opacity="0.4" />
              </svg>
            </div>
          </motion.div>

          {/* Right: Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-6 order-1 lg:order-2"
          >
            <p className="text-gold text-sm font-semibold uppercase tracking-widest font-sans">
              {t("globe.label")}
            </p>
            <h2 className="text-section font-serif text-white">
              {t("globe.heading")}{" "}
              <span className="text-gradient-gold">{t("globe.saudi")}</span>
              {" " + t("globe.and") + " "}
              <span className="text-gradient-gold">{t("globe.malaysia")}</span>
            </h2>
            <div className="space-y-4 text-white/50 text-base leading-relaxed font-sans">
              <p>{t("globe.p1")}</p>
              <p>{t("globe.p2")}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              {facts.map((fact) => (
                <div
                  key={fact.label}
                  className="p-3 rounded-lg border border-white/[0.06] bg-white/[0.02]"
                >
                  <div className="text-sm font-semibold text-white/80 font-sans">
                    {fact.label}
                  </div>
                  <div className="text-xs text-white/35 mt-1 font-sans">
                    {fact.detail}
                  </div>
                </div>
              ))}
            </div>

            <a href="#services" className="inline-flex items-center gap-2 text-gold text-sm font-medium hover:gap-3 transition-all">
              {t("hero.learnMore")}
              <ArrowRight className="w-4 h-4" />
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
