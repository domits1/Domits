import { useEffect } from "react";

const OWNER_ATTRIBUTE = "data-seo-owner";

export const CANONICAL_OWNER = "marketplace-canonical";

const findOwnedHeadTag = (owner) =>
  globalThis.document?.head?.querySelector(`[${OWNER_ATTRIBUTE}="${owner}"]`) || null;

const removeOwnedHeadTag = (owner) => {
  findOwnedHeadTag(owner)?.remove();
};

const upsertOwnedHeadTag = (owner, tagName, attributes) => {
  const head = globalThis.document?.head;
  if (!head) {
    return;
  }

  let element = findOwnedHeadTag(owner);
  if (!element || element.tagName.toLowerCase() !== tagName) {
    element?.remove();
    element = globalThis.document.createElement(tagName);
    element.setAttribute(OWNER_ATTRIBUTE, owner);
    head.append(element);
  }

  Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, value));
};

export const useCanonicalLink = (href) => {
  useEffect(() => {
    if (!href) {
      removeOwnedHeadTag(CANONICAL_OWNER);
      return undefined;
    }

    upsertOwnedHeadTag(CANONICAL_OWNER, "link", { rel: "canonical", href });
    return () => removeOwnedHeadTag(CANONICAL_OWNER);
  }, [href]);
};

export const useNoindexMeta = (isActive, owner) => {
  useEffect(() => {
    if (!isActive || !owner) {
      if (owner) {
        removeOwnedHeadTag(owner);
      }
      return undefined;
    }

    upsertOwnedHeadTag(owner, "meta", { name: "robots", content: "noindex" });
    return () => removeOwnedHeadTag(owner);
  }, [isActive, owner]);
};
