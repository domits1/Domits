import {createContext, useState} from 'react';

export const LanguageContext = createContext({});

function LanguageContextProvider({children}) {
    const storedLanguage = localStorage.getItem('language');
    const [language, setLanguage] = useState(storedLanguage||"en");

    const setLanguageAndStore = (language) => {
        setLanguage(language);
        localStorage.setItem("language", language);
    }

    const data = {
        language: language,
        setLanguage: setLanguageAndStore
    }

    return (
        <LanguageContext.Provider value={data}>
            {children}
        </LanguageContext.Provider>
    );
}

export default LanguageContextProvider;