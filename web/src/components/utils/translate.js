export async function fetchTranslation(text, sourceLang, targetLang) {
    console.log("Text:", text);
    console.log("Source language:", sourceLang);
    console.log("Target language:", targetLang);

    try {
        const response = await fetch("https://naegitzsyk.execute-api.eu-north-1.amazonaws.com/default/TranslateWebPageContent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, sourceLang, targetLang }),
        });

        const data = await response.json();

        if (data.statusCode === 200) {
            const result = JSON.parse(data.body);
            console.log("Translation response:", result.translatedText);
            // Ensure translated text is not empty, otherwise, fallback to original text
            return result.translatedText || text;
        } else {
            console.error("Translation API error:", data);
            return text; // Fallback to original text if translation fails
        }
    } catch (error) {
        console.error("Error fetching translation:", error);
        return text; // Fallback to original text in case of an error
    }
}

export async function translatePage() {
    const elements = document.querySelectorAll(".translatable");
    const sourceLang = "en";
    const targetLang = "nl";

    for (let element of elements) {
        const originalText = element.innerText;
        const translatedText = await fetchTranslation(originalText, sourceLang, targetLang);
        element.innerText = translatedText;
    }
}
