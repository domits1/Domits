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
