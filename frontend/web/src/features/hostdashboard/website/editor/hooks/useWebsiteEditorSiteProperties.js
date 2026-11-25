import { useEffect, useState } from "react";
import { fetchHostPropertySelectOptions } from "../../../services/hostTaskPropertyService";
import { WEBSITE_ENTITLEMENT_MULTI_PROPERTY } from "../../services/websitePlanService";
import {
  MAX_SITE_PROPERTIES,
  cleanSitePropertySlug,
  describeSitePropertySlugProblem,
  explainSitePropertiesSaveError,
  findSitePropertiesProblem,
  readSiteProperties,
  suggestSitePropertySlug,
} from "../websiteEditorSiteProperties";

export const SITE_PROPERTIES_LISTINGS_STATUS = Object.freeze({ LOADING: "loading", READY: "ready", FAILED: "failed" });

const LISTINGS_LOADING = Object.freeze({ status: SITE_PROPERTIES_LISTINGS_STATUS.LOADING, listings: [] });
const LISTINGS_FAILED = Object.freeze({ status: SITE_PROPERTIES_LISTINGS_STATUS.FAILED, listings: [] });

const toListingsRead = (options, mainPropertyId) => {
  const listings = (Array.isArray(options) ? options : []).map((option) => ({
    propertyId: String(option?.value || ""),
    title: String(option?.title || "").trim() || "Untitled listing",
    isActive: option?.status === "ACTIVE",
  }));
  const hasMainProperty = listings.some((listing) => listing.propertyId === mainPropertyId);
  return hasMainProperty ? { status: SITE_PROPERTIES_LISTINGS_STATUS.READY, listings } : LISTINGS_FAILED;
};

const withEntry = (entries, listing) => {
  const isListed = entries.some((entry) => entry.propertyId === listing?.propertyId);
  if (!listing || isListed || entries.length >= MAX_SITE_PROPERTIES) {
    return entries;
  }
  const entry = {
    propertyId: listing.propertyId,
    slug: suggestSitePropertySlug(
      listing.title,
      entries.map((e) => e.slug)
    ),
  };
  return [...entries, entry];
};

const withMainFirst = (entries, mainPropertyId) => [
  ...entries.filter((entry) => entry.propertyId === mainPropertyId),
  ...entries.filter((entry) => entry.propertyId !== mainPropertyId),
];

const moveEntry = (entries, propertyId, offset) => {
  const nextEntries = [...entries];
  const fromIndex = nextEntries.findIndex((entry) => entry.propertyId === propertyId);
  nextEntries.splice(fromIndex + offset, 0, ...nextEntries.splice(fromIndex, 1));
  return nextEntries;
};

export const useWebsiteEditorSiteProperties = ({
  draftTemplateKey,
  hasEntitlement,
  mainPropertyId,
  workingOverrides,
}) => {
  const canEditSiteProperties =
    draftTemplateKey === "panorama-landing" && hasEntitlement(WEBSITE_ENTITLEMENT_MULTI_PROPERTY);
  const [listingsRead, setListingsRead] = useState(LISTINGS_LOADING);
  const [editedEntries, setEditedEntries] = useState(null);

  useEffect(() => {
    if (!canEditSiteProperties) {
      return undefined;
    }
    let isCurrent = true;
    setListingsRead(LISTINGS_LOADING);
    fetchHostPropertySelectOptions().then(
      (options) => isCurrent && setListingsRead(toListingsRead(options, mainPropertyId)),
      () => isCurrent && setListingsRead(LISTINGS_FAILED)
    );
    return () => {
      isCurrent = false;
    };
  }, [canEditSiteProperties, mainPropertyId]);

  const isReady = canEditSiteProperties && listingsRead.status === SITE_PROPERTIES_LISTINGS_STATUS.READY;
  const listingsById = new Map(listingsRead.listings.map((listing) => [listing.propertyId, listing]));
  const storedEntries = withMainFirst(
    withEntry(readSiteProperties(workingOverrides), listingsById.get(mainPropertyId)),
    mainPropertyId
  );
  const baseEntries = editedEntries || storedEntries;
  const entries = baseEntries.map((entry) => {
    const listing = listingsById.get(entry.propertyId);
    const isMainProperty = entry.propertyId === mainPropertyId;
    const otherSlugs = baseEntries.filter((other) => other !== entry).map((other) => cleanSitePropertySlug(other.slug));
    return {
      ...entry,
      isMainProperty,
      title: listing?.title || "A listing that is no longer yours",
      isListed: isMainProperty || Boolean(listing),
      isActive: Boolean(listing?.isActive),
      slugProblem: describeSitePropertySlugProblem(entry.slug, otherSlugs),
    };
  });

  const editEntries = (change) => isReady && setEditedEntries((current) => change(current || storedEntries));

  return {
    canEditSiteProperties,
    listingsStatus: listingsRead.status,
    entries,
    addableListings: listingsRead.listings.filter(
      (listing) => !entries.some((e) => e.propertyId === listing.propertyId)
    ),
    canAddSiteProperty: isReady && entries.length < MAX_SITE_PROPERTIES,
    addSiteProperty: (propertyId) => editEntries((current) => withEntry(current, listingsById.get(propertyId))),
    removeSiteProperty: (propertyId) =>
      editEntries((current) => current.filter((e) => e.propertyId !== propertyId || propertyId === mainPropertyId)),
    moveSiteProperty: (propertyId, offset) => editEntries((current) => moveEntry(current, propertyId, offset)),
    setSitePropertySlug: (propertyId, slug) =>
      editEntries((current) =>
        current.map((e) => (e.propertyId === propertyId ? { ...e, slug: slug.toLowerCase() } : e))
      ),
    sitePropertiesEdit: editedEntries,
    resetSitePropertiesEdit: () => setEditedEntries(null),
    findSitePropertiesProblem: ({ forPublish }) => (isReady ? findSitePropertiesProblem(entries, { forPublish }) : ""),
    explainSitePropertiesSaveError: (error) => (canEditSiteProperties ? explainSitePropertiesSaveError(error) : error),
  };
};
