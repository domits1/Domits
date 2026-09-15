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
        throw new Error("Failed to upload photo");
    }

    return await response.json();
};
