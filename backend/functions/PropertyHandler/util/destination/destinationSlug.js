const SPECIAL_LETTERS = Object.freeze({
  ß: "ss",
  æ: "ae",
  œ: "oe",
  ø: "o",
  đ: "d",
  ł: "l",
  þ: "th",
  ð: "d",
});

export const normalizeDestinationName = (value) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim();

export const toDestinationSlug = (value) =>
  normalizeDestinationName(value)
    .toLowerCase()
    .replace(/[ßæœøđłþð]/g, (letter) => SPECIAL_LETTERS[letter])
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const isDestinationSlug = (value) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(value || ""));

export const buildDestinationPath = (...slugs) => `/destinations/${slugs.filter(Boolean).join("/")}`;
