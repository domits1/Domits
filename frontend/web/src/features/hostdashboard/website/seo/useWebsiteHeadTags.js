import { useCallback, useEffect, useRef } from "react";
import { registerWebsitePublicSitePage } from "./websiteHeadTagsRegistry";

const OWNED_MARKER_ATTRIBUTE = "data-website-head-tag";

const resolveDocument = () => globalThis.document || null;

const findMetaElement = (documentRef, attributeName, attributeValue) =>
  documentRef.head.querySelector(`meta[${attributeName}="${attributeValue}"]`);

const applyMetaEntries = (documentRef, attributeName, entries, appliedEntries) => {
  for (const [attributeValue, content] of Object.entries(entries || {})) {
    const existingElement = findMetaElement(documentRef, attributeName, attributeValue);
    const element = existingElement || documentRef.createElement("meta");

    if (!existingElement) {
      element.setAttribute(attributeName, attributeValue);
      element.setAttribute(OWNED_MARKER_ATTRIBUTE, "true");
      documentRef.head.append(element);
    }

    appliedEntries.push({
      element,
      wasCreated: !existingElement,
      previousContent: existingElement ? existingElement.getAttribute("content") : null,
    });

    element.setAttribute("content", content);
  }
};

const restoreAppliedEntries = (appliedEntries) => {
  for (const appliedEntry of [...appliedEntries].reverse()) {
    if (appliedEntry.wasCreated) {
      appliedEntry.element.remove();
      continue;
    }

    if (appliedEntry.previousContent === null) {
      appliedEntry.element.removeAttribute("content");
      continue;
    }

    appliedEntry.element.setAttribute("content", appliedEntry.previousContent);
  }
};

export const useWebsiteHeadTags = ({ key = "", tags = null } = {}) => {
  const descriptorRef = useRef({ key, tags });
  const appliedEntriesRef = useRef([]);
  const appliedKeyRef = useRef("");
  const previousTitleRef = useRef(null);

  descriptorRef.current = { key, tags };

  const restoreHead = useCallback(() => {
    restoreAppliedEntries(appliedEntriesRef.current);
    appliedEntriesRef.current = [];

    const documentRef = resolveDocument();
    if (documentRef && previousTitleRef.current !== null) {
      documentRef.title = previousTitleRef.current;
    }

    previousTitleRef.current = null;
    appliedKeyRef.current = "";
  }, []);

  const signature = JSON.stringify({ key, tags });

  useEffect(() => {
    const documentRef = resolveDocument();
    if (!documentRef?.head) {
      return;
    }

    const { key: currentKey, tags: currentTags } = descriptorRef.current;
    const hasAppliedHead = appliedEntriesRef.current.length > 0 || previousTitleRef.current !== null;

    if (!currentTags) {
      if (hasAppliedHead && appliedKeyRef.current !== currentKey) {
        restoreHead();
      }

      return;
    }

    if (hasAppliedHead) {
      restoreHead();
    }

    previousTitleRef.current = documentRef.title;
    if (currentTags.title) {
      documentRef.title = currentTags.title;
    }

    const nextAppliedEntries = [];
    applyMetaEntries(documentRef, "name", currentTags.metaByName, nextAppliedEntries);
    applyMetaEntries(documentRef, "property", currentTags.metaByProperty, nextAppliedEntries);

    appliedEntriesRef.current = nextAppliedEntries;
    appliedKeyRef.current = currentKey;
  }, [signature, restoreHead]);

  useEffect(() => {
    const releaseWebsitePublicSitePage = registerWebsitePublicSitePage();

    return () => {
      releaseWebsitePublicSitePage();
      restoreHead();
    };
  }, [restoreHead]);
};
