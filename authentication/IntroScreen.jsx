import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import LoadingScreen from "./LoadingScreen";

/**
 * GymDeck IntroScreen (Production Entry Point)
 * Orchestrates the premium loading sequence for the authentication portal.
 */

const IntroScreen = ({ onComplete }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Total sequence duration to match high-end animations
    const totalDuration = 3000;
    const exitDuration = 300;

    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => {
        if (onComplete) onComplete();
      }, exitDuration);
    }, totalDuration - exitDuration);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return <LoadingScreen isExiting={isExiting} />;
};

/**
 * MOUNT LOGIC
 * Injected into authentication scripts to bootstrap the sequence.
 */
export function mountIntroScreen(onComplete) {
  const rootElement = document.createElement("div");
  rootElement.id = "intro-screen-root";
  document.body.appendChild(rootElement);

  // Safety fallback: If React fails or takes too long, force complete
  const safetyTimeout = setTimeout(() => {
    console.warn("GymDeck: IntroScreen safety timeout triggered.");
    handleComplete();
  }, 5000);

  const handleComplete = () => {
    clearTimeout(safetyTimeout);
    if (rootElement.parentNode) {
      try {
        root.unmount();
      } catch (e) {}
      rootElement.remove();
    }
    if (onComplete) {
      onComplete();
      onComplete = null; // Prevent double call
    }
  };

  let root;
  try {
    root = createRoot(rootElement);
    root.render(<IntroScreen onComplete={handleComplete} />);
  } catch (error) {
    console.error("GymDeck: Failed to mount IntroScreen:", error);
    handleComplete();
  }
}

export default IntroScreen;
