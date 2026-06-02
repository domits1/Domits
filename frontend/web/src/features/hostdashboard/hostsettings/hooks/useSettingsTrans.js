import { useContext } from "react";
import { LanguageContext } from "../../../../context/LanguageContext";
import en from "../../../../content/en.json";
import nl from "../../../../content/nl.json";
import de from "../../../../content/de.json";
import es from "../../../../content/es.json";

const contentByLanguage = { en, nl, de, es };

const useSettingsTrans = (section) => {
    const { language } = useContext(LanguageContext);
    return {
        t:   contentByLanguage[language]?.settings?.[section] ?? contentByLanguage.en.settings[section],
        hub: contentByLanguage[language]?.settings?.hub       ?? contentByLanguage.en.settings.hub,
    };
};

export default useSettingsTrans;
