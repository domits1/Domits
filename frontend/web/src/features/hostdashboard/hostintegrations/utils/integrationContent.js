import en from "../../../../content/en.json";
import nl from "../../../../content/nl.json";
import de from "../../../../content/de.json";
import es from "../../../../content/es.json";

const contentByLanguage = { en, nl, de, es };
const DEFAULT_LANGUAGE = "en";

export const resolveIntegrationContent = (language) => {
  const activeLanguage = contentByLanguage[language]?.hostIntegrations ? language : DEFAULT_LANGUAGE;
  return contentByLanguage[activeLanguage].hostIntegrations;
};
