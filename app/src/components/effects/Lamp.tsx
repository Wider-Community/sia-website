// Inspired by 21st.dev: aceternity/lamp
// Gold lamp/spotlight glow effect — fixed layout (no translate overlap)
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface LampProps {
  children: ReactNode;
  className?: string;
}

export function Lamp({ children, className }: LampProps) {
  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center overflow-hidden w-full py-24 lg:py-32",
        className
      )}
    >
      {/* Lamp glow effect — decorative, positioned above the content */}
      <div className="relative w-full flex items-center justify-center h-40 mb-8">
        {/* Left beam */}
        <motion.div
          initial={{ opacity: 0.3, width: "10rem" }}
          whileInView={{ opacity: 1, width: "24rem" }}
          transition={{ delay: 0.3, duration: 0.8, ease: "easeInOut" }}
          style={{
            backgroundImage:
              "conic-gradient(from 70deg at center top, #C8A951, transparent, transparent)",
          }}
          className="absolute right-1/2 h-40 overflow-visible"
        >
          <div className="absolute w-full left-0 h-24 bottom-0 bg-[#151516] [mask-image:linear-gradient(to_top,white,transparent)]" />
          <div className="absolute w-32 h-full left-0 bottom-0 bg-[#151516] [mask-image:linear-gradient(to_right,white,transparent)]" />
        </motion.div>

        {/* Right beam */}
        <motion.div
          initial={{ opacity: 0.3, width: "10rem" }}
          whileInView={{ opacity: 1, width: "24rem" }}
          transition={{ delay: 0.3, duration: 0.8, ease: "easeInOut" }}
          style={{
            backgroundImage:
              "conic-gradient(from 290deg at center top, transparent, transparent, #C8A951)",
          }}
          className="absolute left-1/2 h-40 overflow-visible"
        >
          <div className="absolute w-32 h-full right-0 bottom-0 bg-[#151516] [mask-image:linear-gradient(to_left,white,transparent)]" />
          <div className="absolute w-full right-0 h-24 bottom-0 bg-[#151516] [mask-image:linear-gradient(to_top,white,transparent)]" />
        </motion.div>

        {/* Gold line */}
        <motion.div
          initial={{ width: "10rem" }}
          whileInView={{ width: "24rem" }}
          transition={{ delay: 0.3, duration: 0.8, ease: "easeInOut" }}
          className="absolute bottom-0 h-px bg-gold z-10"
        />

        {/* Glow blob */}
        <div className="absolute bottom-0 w-[20rem] h-24 rounded-full bg-gold/20 opacity-50 blur-3xl z-0" />
      </div>

      {/* Content — normal flow, no translate */}
      <div className="relative z-10 w-full px-6">
        {children}
      </div>
    </div>
  );
}
