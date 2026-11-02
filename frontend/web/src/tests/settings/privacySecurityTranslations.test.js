import en from "../../content/en.json";
import nl from "../../content/nl.json";
import de from "../../content/de.json";
import es from "../../content/es.json";

const flattenKeys = (value, prefix = "") =>
  Object.entries(value).flatMap(([key, child]) =>
    child && typeof child === "object" ? flattenKeys(child, `${prefix}${key}.`) : [`${prefix}${key}`]
  );

const readPath = (content, path) => path.split(".").reduce((node, key) => node?.[key], content);

const englishKeys = flattenKeys(en.settings.privacySecurity).sort();

describe("settings.privacySecurity translations", () => {
  test.each([
    ["nl", nl],
    ["de", de],
    ["es", es],
  ])("%s has exactly the same keys as en", (_language, content) => {
    expect(flattenKeys(content.settings.privacySecurity).sort()).toEqual(englishKeys);
  });

  test.each([
    ["en", en],
    ["nl", nl],
    ["de", de],
    ["es", es],
  ])("%s has a non-empty text for every key", (_language, content) => {
    const emptyKeys = englishKeys.filter((path) => {
      const text = readPath(content.settings.privacySecurity, path);
      return typeof text !== "string" || text.trim() === "";
    });

    expect(emptyKeys).toEqual([]);
  });
});
