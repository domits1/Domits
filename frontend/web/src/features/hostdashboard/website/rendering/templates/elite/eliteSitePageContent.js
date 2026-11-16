import { POLICY_RULE_CONFIG } from "../../../../hostproperty/constants";
import { placeholderImage } from "../../../../../../utils/accommodationImage";

export const ELITE_LEAD_MAX_LENGTH = 200;
export const ELITE_PARAGRAPH_TARGET_LENGTH = 260;
export const ELITE_VISIBLE_PARAGRAPH_COUNT = 2;
export const TEMPLATE_GALLERY_INTRO = "A more editorial presentation of the property";

const CLOCK_TIME_PATTERN = /^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/;
const SENTENCE_END_PATTERN = /[.!?…]["'”’)\]]*$/u;
const SENTENCE_START_PATTERN = /^["'“‘([]*[\p{Lu}\p{N}]/u;
const NIGHTLY_PRICE_FORMAT = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});
const POLICY_RULE_BY_LABEL = new Map(POLICY_RULE_CONFIG.map(({ rule, label }) => [label.toLowerCase(), rule]));

const cleanText = (value) => {
  const isText = typeof value === "string" || typeof value === "number";
  return isText ? String(value).replaceAll(/\s+/g, " ").trim() : "";
};

const readCount = (value) => {
  const count = Math.trunc(Number(value));
  return Number.isFinite(count) && count > 0 ? count : 0;
};

const listUniqueTexts = (values) => {
  const seen = new Set();
  return (Array.isArray(values) ? values : [])
    .map(cleanText)
    .filter((text) => {
      const key = text.toLowerCase();
      if (!text || seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
};

const isRealImage = (imageUrl) => {
  const url = cleanText(imageUrl);
  return Boolean(url) && url !== placeholderImage;
};

export const formatEliteClockTime = (value) => {
  const text = cleanText(value);
  const match = CLOCK_TIME_PATTERN.exec(text);
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) {
    return text;
  }

  return `${match[1].padStart(2, "0")}:${match[2]}`;
};

export const formatEliteNightlyPrice = (value) => {
  const amount = readCount(value);
  return amount ? NIGHTLY_PRICE_FORMAT.format(amount) : "";
};

const formatNights = (count) => `${count} ${count === 1 ? "night" : "nights"}`;

const buildArrivalFact = (checkIn, checkOut) => {
  if (checkIn && checkOut) {
    return { id: "arrival", label: "Check-in / out", value: `${checkIn} · ${checkOut}` };
  }
  if (checkIn) {
    return { id: "arrival", label: "Check-in", value: checkIn };
  }
  return checkOut ? { id: "arrival", label: "Check-out", value: checkOut } : null;
};

export const buildEliteFacts = (stay = {}) => {
  const guests = readCount(stay?.guests);
  const bedrooms = readCount(stay?.bedrooms);
  const bathrooms = readCount(stay?.bathrooms);
  const minimumStay = readCount(stay?.minimumStay);

  return [
    guests ? { id: "guests", label: "Guests", value: guests === 1 ? "1" : `Up to ${guests}` } : null,
    bedrooms ? { id: "bedrooms", label: "Bedrooms", value: String(bedrooms) } : null,
    bathrooms ? { id: "bathrooms", label: "Bathrooms", value: String(bathrooms) } : null,
    buildArrivalFact(formatEliteClockTime(stay?.checkInLabel), formatEliteClockTime(stay?.checkOutLabel)),
    minimumStay ? { id: "minimum-stay", label: "Minimum stay", value: formatNights(minimumStay) } : null,
  ].filter(Boolean);
};

export const buildElitePrice = (stay = {}) => {
  const minimumStay = readCount(stay?.minimumStay);
  return {
    amount: formatEliteNightlyPrice(stay?.nightlyRate),
    minimumStayNote: minimumStay ? `Minimum stay ${formatNights(minimumStay)}.` : "",
  };
};

const splitSentences = (text) => {
  const words = text.split(" ");
  const sentences = [];
  let currentWords = [];

  words.forEach((word, index) => {
    currentWords.push(word);
    const nextWord = words[index + 1];
    const endsSentence = SENTENCE_END_PATTERN.test(word) && SENTENCE_START_PATTERN.test(nextWord || "");
    if (nextWord === undefined || endsSentence) {
      sentences.push(currentWords.join(" "));
      currentWords = [];
    }
  });

  return sentences;
};

const groupParagraphs = (sentences) => {
  const paragraphs = [];
  sentences.forEach((sentence) => {
    const lastIndex = paragraphs.length - 1;
    const fitsLastParagraph =
      lastIndex >= 0 && paragraphs[lastIndex].length + 1 + sentence.length <= ELITE_PARAGRAPH_TARGET_LENGTH;
    if (fitsLastParagraph) {
      paragraphs[lastIndex] = `${paragraphs[lastIndex]} ${sentence}`;
    } else {
      paragraphs.push(sentence);
    }
  });
  return paragraphs;
};

export const buildEliteDescription = (hero = {}) => {
  const text = hero?.isDescriptionGenerated === true ? "" : cleanText(hero?.description);
  if (!text) {
    return null;
  }

  const sentences = splitSentences(text);
  const lead = sentences[0].length <= ELITE_LEAD_MAX_LENGTH ? sentences[0] : "";
  const paragraphs = groupParagraphs(lead ? sentences.slice(1) : sentences);

  return {
    lead,
    paragraphs: paragraphs.slice(0, ELITE_VISIBLE_PARAGRAPH_COUNT),
    moreParagraphs: paragraphs.slice(ELITE_VISIBLE_PARAGRAPH_COUNT),
  };
};

export const listEliteHighlights = (amenities) =>
  listUniqueTexts((Array.isArray(amenities) ? amenities : []).map((amenity) => amenity?.label));

export const listEliteHouseRules = (policies = {}) => {
  const labels = Array.isArray(policies?.all) ? policies.all : policies?.featured;
  return listUniqueTexts(labels).map((label) => ({
    label,
    rule: POLICY_RULE_BY_LABEL.get(label.toLowerCase()) || "",
  }));
};

export const hasEliteHeaderPhoto = (media = {}) => isRealImage(media?.heroImage);

export const ELITE_RESTYLED_PAGE_KEYS = Object.freeze(["accommodation"]);

export const isEliteRestyledPage = (pageKey) => ELITE_RESTYLED_PAGE_KEYS.includes(pageKey);

export const resolveEliteHeaderTone = (media = {}) => (hasEliteHeaderPhoto(media) ? "photo" : "light");

export const selectEliteAccommodationPhotos = (media = {}) => {
  const heroImage = cleanText(media?.heroImage);
  const residenceImage = cleanText(media?.residenceImage);
  const galleryImages = (Array.isArray(media?.galleryImages) ? media.galleryImages : []).map(cleanText);
  const hasResidencePhoto = isRealImage(residenceImage) && residenceImage !== heroImage;
  const usedImages = new Set([heroImage, hasResidencePhoto ? residenceImage : ""]);
  const galleryIndex = galleryImages.findIndex((imageUrl) => isRealImage(imageUrl) && !usedImages.has(imageUrl));

  return [
    hasResidencePhoto ? { kind: "residence" } : null,
    galleryIndex >= 0 ? { kind: "gallery", index: galleryIndex, sectionId: "gallery" } : null,
  ].filter(Boolean);
};

export const selectEliteGallerySlots = (gallerySlots, media = {}) =>
  (Array.isArray(gallerySlots) ? gallerySlots : []).filter(
    (gallerySlot) => gallerySlot?.slot?.kind !== "hero" || isRealImage(media?.heroImage)
  );

export const resolveEliteGalleryLayout = (photoCount) => {
  if (photoCount >= 4) {
    return "mosaic";
  }
  return ["", "single", "pair", "trio"][Math.max(0, photoCount)] || "";
};

export const resolveEliteGalleryIntro = (gallerySection = {}) => {
  const intro = cleanText(gallerySection?.description);
  return intro === TEMPLATE_GALLERY_INTRO ? "" : intro;
};

export const resolveEliteLocation = (model = {}) =>
  cleanText(model?.site?.locationLabel) || cleanText(model?.location?.label);
