import React from "react";
import { motion } from "framer-motion";
import Lottie from "lottie-react";
import animationData from "./loading-animation.json";

/**
 * GymDeck Hero Loading Screen
 * A ultra-minimalist entry focused exclusively on the hand animation.
 */
const LoadingScreen = ({ isExiting }) => {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: isExiting ? 0 : 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#F5F7FA] overflow-hidden"
    >
      {/* Subtle Ambient Background Depth */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.8)_0%,transparent_100%)] pointer-events-none" />
      
      <div className="relative z-10 flex items-center justify-center w-[600px] h-[600px]">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ 
            duration: 0.4, 
            ease: [0.22, 1, 0.36, 1] 
          }}
          className="w-full h-full"
        >
          <Lottie
            animationData={animationData}
            loop={true}
            autoplay={true}
          />
        </motion.div>
        
        <div className="absolute bottom-44 left-0 right-0 translate-x-[4px] flex flex-col items-center justify-center select-none pointer-events-none">
          {/* Horizon Reveal Container */}
          <div className="relative overflow-hidden py-2 px-12">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: { staggerChildren: 0.06, delayChildren: 0.8 }
                }
              }}
              className="flex items-center justify-center"
            >
              {"GYMDECK".split("").map((char, index) => (
                <motion.span
                  key={index}
                  variants={{
                    hidden: { opacity: 0, y: 40 },
                    visible: { 
                      opacity: 1, 
                      y: 0,
                      transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
                    }
                  }}
                  className="text-2xl font-normal tracking-wider text-slate-900 mx-[0.1em]"
                  style={{ fontFamily: "'Ethnocentric', sans-serif" }}
                >
                  {char}
                </motion.span>
              ))}
            </motion.div>
          </div>

          {/* Architectural Horizon Line */}
          <motion.div 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: "240px", opacity: 0.3 }}
            transition={{ delay: 0.4, duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="h-[1px] bg-slate-400 mt-1"
          />
          
          <motion.div 
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ delay: 2.5, duration: 1 }}
            className="absolute bottom-0 w-full h-full pointer-events-none"
          />
        </div>
      </div>
    </motion.div>
  );
};

export default LoadingScreen;
