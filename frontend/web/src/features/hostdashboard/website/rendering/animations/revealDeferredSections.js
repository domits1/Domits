// Sections below the fold render with content-visibility: auto and a placeholder
// intrinsic size. Measuring an anchor while those placeholders are in effect
// gives a stale scroll target, and the sections then re-lay-out at their real
// height while the smooth scroll is in flight — Safari's hit-testing goes stale
// until the next real scroll. Once a guest navigates, deferral has done its job,
// so every deferred section is switched to normal rendering before measuring.
export const revealDeferredSections = (rootNode, deferredClassName, revealedClassName) => {
  if (!rootNode?.querySelectorAll || !deferredClassName || !revealedClassName) {
    return 0;
  }

  const deferredSections = Array.from(rootNode.querySelectorAll(`.${deferredClassName}`));
  deferredSections.forEach((section) => {
    section.classList.add(revealedClassName);
  });
  return deferredSections.length;
};
