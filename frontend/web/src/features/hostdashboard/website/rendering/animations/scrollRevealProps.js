export const getScrollRevealProps = (delayMs = 0) => ({
  "data-scroll-reveal": "true",
  style: {
    "--scroll-reveal-delay": `${delayMs}ms`,
  },
});
