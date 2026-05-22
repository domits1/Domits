import { useEffect, useRef } from "react";
import motionStyles from "./WebsiteTemplateMotion.module.scss";

export const useWebsiteScrollReveal = ({ enabled = false, deps = [] } = {}) => {
  const previewCanvasRef = useRef(null);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const previewCanvas = previewCanvasRef.current;
    if (!previewCanvas) {
      return undefined;
    }

    const revealTargets = Array.from(previewCanvas.querySelectorAll("[data-scroll-reveal]"));
    if (revealTargets.length < 1) {
      return undefined;
    }

    const revealClassName = motionStyles.scrollRevealVisible;
    revealTargets.forEach((target) => {
      target.classList.remove(revealClassName);
    });

    const prefersReducedMotion =
      typeof globalThis.matchMedia === "function" &&
      globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (typeof IntersectionObserver === "undefined" || prefersReducedMotion) {
      revealTargets.forEach((target) => {
        target.classList.add(revealClassName);
      });
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          entry.target.classList.add(revealClassName);
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.14,
        rootMargin: "0px 0px -10% 0px",
      }
    );

    revealTargets.forEach((target) => {
      observer.observe(target);
    });

    return () => {
      observer.disconnect();
    };
  }, [enabled, ...deps]);

  return previewCanvasRef;
};
