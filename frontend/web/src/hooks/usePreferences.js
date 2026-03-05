import {useContext, useState} from "react";
import {LanguageContext} from "../context/LanguageContext";
import {languageOptions, dateFormatOptions, priceFormatOptions} from "../components/settings/constants";

export default function usePreferences() {
    const {language, setLanguage} = useContext(LanguageContext);
    const [dateFormat, setDateFormat] = useState(localStorage.getItem("dateFormat") || "en");
    const [priceFormat, setPriceFormat] = useState(localStorage.getItem("priceFormat") || "usd");

    const handleLanguageChange = (e) => {
        setLanguage(e.target.value);
    };

    const handleDateFormatChange = (e) => {
        const value = e.target.value;
        setDateFormat(value);
        localStorage.setItem("dateFormat", value);
    };

    const handlePriceFormatChange = (e) => {
        const value = e.target.value;
        setPriceFormat(value);
        localStorage.setItem("priceFormat", value);
    };

    return {
        language,
        dateFormat,
        priceFormat,
        languageOptions,
        dateFormatOptions,
        priceFormatOptions,
        onLanguageChange: handleLanguageChange,
        onDateFormatChange: handleDateFormatChange,
        onPriceFormatChange: handlePriceFormatChange,
    };
}
