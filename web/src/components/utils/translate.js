export async function fetchTranslation(text, sourceLang, targetLang) {
    console.log("Text:", text);
    console.log("Source language:", sourceLang);
    console.log("Target language:", targetLang);

    try {
        const response = await fetch("https://u9buihslm0.execute-api.eu-north-1.amazonaws.com/default/General-Production-Update-Translating", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, sourceLang, targetLang }),
        });

        const data = await response.json();

        if (typeof data === 'object') {
            const result = data;
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
