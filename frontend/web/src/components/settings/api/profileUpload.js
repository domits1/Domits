import {PROFILE_UPLOAD_URL_ENDPOINT} from "../constants";

export const uploadProfilePhoto = async (accessToken, imageDataUrl) => {
    if (!PROFILE_UPLOAD_URL_ENDPOINT) {
        throw new Error("Profile photo upload endpoint is not configured.");
    }

    const response = await fetch(PROFILE_UPLOAD_URL_ENDPOINT, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": accessToken,
        },
        body: JSON.stringify({ image: imageDataUrl }),
    });

    if (!response.ok) {
        let message = "Failed to upload photo";
        try {
            const errorBody = await response.json();
            if (errorBody?.message) {
                message = errorBody.message;
            }
        } catch {
            // response body wasn't JSON; keep the generic message
        }
        throw new Error(message);
    }

    return await response.json();
};
