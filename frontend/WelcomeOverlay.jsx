import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { motion, AnimatePresence } from "framer-motion";

/**
 * GYMDECK • PRODUCTION-GRADE CINEMATIC GREETING
 * Refined Typographic Reveal & Editorial Composition
 */

const WelcomeOverlay = ({ name = "Admin", onComplete }) => {
  const [isExiting, setIsExiting] = useState(false);
  const [phase, setPhase] = useState("welcome"); // welcome -> split -> ready

  useEffect(() => {
    // Sequence Timings - Tightened for "Instant" feel
    const timers = [
      setTimeout(() => setPhase("split"), 950),    // WELCOME shifts, BACK reveals
      setTimeout(() => handleExit(), 2450),         // Automatic exit after animation
    ];

    const handleKeyDown = (e) => {
      if (e.key === "Enter" || e.key === "Escape") handleExit();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      timers.forEach(clearTimeout);
    };
  }, []);

  const handleExit = () => {
    if (isExiting) return;
    setIsExiting(true);
    setTimeout(onComplete, 450);
  };

  // Easing Constants
  const cinematicEase = [0.22, 1, 0.36, 1]; // Long, smooth deceleration
  const splitEase = [0.76, 0, 0.24, 1];      // Stronger curve for the split

  // Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.5 } },
    exit: { 
      opacity: 0, 
      filter: "blur(30px)",
      scale: 1.03,
      transition: { duration: 0.5, ease: cinematicEase }
    }
  };

  const headlineContainerVariants = {
    initial: { x: 0 },
    split: { 
      x: 0, // Keep centered
      transition: { duration: 0.8, ease: splitEase } 
    }
  };

  const welcomeVariants = {
    hidden: { 
      opacity: 0, 
      filter: "blur(15px)", 
      scale: 0.96,
      y: 8
    },
    visible: { 
      opacity: 1, 
      filter: "blur(0px)", 
      scale: 1,
      y: 0,
      transition: { duration: 0.7, ease: cinematicEase }
    }
  };

  const backVariants = {
    hidden: { 
      opacity: 0, 
      width: 0,
      x: 30,
      filter: "blur(10px)",
      scale: 0.92
    },
    visible: { 
      opacity: 1, 
      width: "auto",
      x: 0,
      filter: "blur(0px)",
      scale: 1,
      transition: { 
        duration: 0.8, 
        ease: cinematicEase,
        opacity: { duration: 0.5 },
        width: { duration: 0.7, ease: splitEase }
      }
    }
  };

  const typographyBase = {
    fontFamily: "'Ethnocentric', sans-serif",
    textTransform: "uppercase",
    color: "#0B1020",
    letterSpacing: "0.02em",
    fontWeight: "normal",
    lineHeight: 1.1
  };

  return (
    <AnimatePresence>
      {!isExiting && (
        <motion.div
          className="fixed inset-0 z-[100000] flex flex-col items-center justify-center overflow-hidden bg-[#FAFBFD] select-none cursor-default"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          style={{
            background: `
              radial-gradient(circle at 20% 20%, rgba(79,124,255,0.05), transparent 40%),
              radial-gradient(circle at 80% 80%, rgba(99,102,241,0.04), transparent 40%),
              linear-gradient(180deg, #FAFBFD 0%, #F3F6FA 100%)
            `
          }}
        >
          {/* Subtle Atmospheric Movement */}
          <motion.div 
            className="absolute inset-0 pointer-events-none opacity-[0.03]"
            animate={{ 
              backgroundPosition: ["0% 0%", "100% 100%"],
            }}
            transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
            style={{ 
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.6' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
              backgroundSize: '200px 200px'
            }}
          />
          
          {/* Faint Grid Texture */}
          <div className="absolute inset-0 opacity-[0.012] pointer-events-none" 
               style={{ backgroundImage: `radial-gradient(#0B1020 1px, transparent 1px)`, backgroundSize: '60px 80px' }} />

          {/* MAIN TYPOGRAPHY EXPERIENCE */}
          <div className="relative flex flex-col items-center">
            
            {/* Headline Composition */}
            <motion.div 
              className="flex items-baseline justify-center"
              variants={headlineContainerVariants}
              animate={phase === "split" ? "split" : "initial"}
            >
              <AnimatePresence>
                {(phase === "welcome" || phase === "split") && (
                  <motion.div
                    className="relative"
                    variants={welcomeVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    {/* BRAND LABEL: Left-aligned, extremely tight 20px visible gap */}
                    <motion.div
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 1, delay: 1 }}
                      className="absolute top-[14px] sm:top-[16px] md:top-[22px] lg:top-[24px] xl:top-[32px] left-0"
                      style={{
                        fontFamily: "'Ethnocentric', sans-serif",
                        fontSize: "clamp(7px, 1vw, 11px)",
                        letterSpacing: "0.4em",
                        color: "#0B1020",
                        textTransform: "uppercase",
                        whiteSpace: "nowrap",
                        lineHeight: 1
                      }}
                    >
                      GYMDECK
                    </motion.div>

                    <h1
                      style={typographyBase}
                      className="text-[32px] sm:text-[48px] md:text-[64px] lg:text-[80px] xl:text-[100px] whitespace-nowrap"
                    >
                      WELCOME
                    </h1>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {phase === "split" && (
                  <motion.h1
                    style={{
                      ...typographyBase,
                      color: "rgba(11, 16, 32, 0.25)" // Lighter, professional muted tone
                    }}
                    className="text-[32px] sm:text-[48px] md:text-[64px] lg:text-[80px] xl:text-[100px] whitespace-nowrap overflow-hidden"
                    variants={backVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    <span className="ml-[0.25em]">BACK</span>
                  </motion.h1>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ─────────────────────────────────────────
// MOUNT UTILITY
// ─────────────────────────────────────────
export function mountWelcomeOverlay(name, onComplete) {
  if (document.getElementById("welcome-overlay-root")) return;

  const rootElement = document.createElement("div");
  rootElement.id = "welcome-overlay-root";
  document.body.appendChild(rootElement);

  const root = createRoot(rootElement);
  
  const handleComplete = () => {
    root.unmount();
    rootElement.remove();
    if (onComplete) onComplete();
  };

  root.render(<WelcomeOverlay name={name} onComplete={handleComplete} />);
}

export default WelcomeOverlay;
