import { useEffect, useRef } from "react";
import motionStyles from "./WebsiteTemplateMotion.module.scss";

const WEBSITE_SCROLL_REVEAL_THRESHOLD = 0.08;
const WEBSITE_SCROLL_REVEAL_ROOT_MARGIN = "0px 0px 6% 0px";

// A revealed section keeps its transform, filter and will-change until the
// transition ends, then settles into a plain block. Leaving those hints on
// keeps every section on its own compositing layer for the life of the page,
// which is what makes Safari's hit-testing go stale after a smooth scroll.
const settleAfterTransition = (target, settledClassName) => {
  const handleTransitionEnd = (event) => {
    if (event.target !== target) {
      return;
    }
    target.classList.add(settledClassName);
    target.removeEventListener("transitionend", handleTransitionEnd);
  };

  target.addEventListener("transitionend", handleTransitionEnd);
  return () => target.removeEventListener("transitionend", handleTransitionEnd);
};

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
    const settledClassName = motionStyles.scrollRevealSettled;
    revealTargets.forEach((target) => {
      target.classList.remove(revealClassName, settledClassName);
    });

    const prefersReducedMotion =
      typeof globalThis.matchMedia === "function" &&
      globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (typeof IntersectionObserver === "undefined" || prefersReducedMotion) {
      // Nothing animates on this path, so no transitionend will ever arrive.
      revealTargets.forEach((target) => {
        target.classList.add(revealClassName, settledClassName);
      });
      return undefined;
    }

    const stopSettling = [];
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          stopSettling.push(settleAfterTransition(entry.target, settledClassName));
          entry.target.classList.add(revealClassName);
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: WEBSITE_SCROLL_REVEAL_THRESHOLD,
        rootMargin: WEBSITE_SCROLL_REVEAL_ROOT_MARGIN,
      }
    );

    revealTargets.forEach((target) => {
      observer.observe(target);
    });

    return () => {
      observer.disconnect();
      stopSettling.forEach((stop) => stop());
    };
  }, [enabled, ...deps]);

  return previewCanvasRef;
};
