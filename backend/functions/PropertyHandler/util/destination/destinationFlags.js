const COMPOSITE_PATTERN = /[,/]|\s-\s/;
const SHORT_CITY_LENGTH = 3;

export const flagDestinationCity = ({ slug, countrySlug, variants }) => {
  const spellings = (Array.isArray(variants) ? variants : []).map((variant) => String(variant?.raw ?? ""));
  const flags = [];
  if (spellings.length > 1) {
    flags.push("several_spellings");
  }
  if (spellings.length > 0 && spellings.every((raw) => raw === raw.toLowerCase())) {
    flags.push("lower_case_only");
  }
  if (slug && slug === countrySlug) {
    flags.push("same_as_country");
  }
  if (spellings.some((raw) => COMPOSITE_PATTERN.test(raw))) {
    flags.push("composite");
  }
  if (String(slug ?? "").replace(/-/g, "").length < SHORT_CITY_LENGTH) {
    flags.push("short");
  }
  return flags;
};
