import {PROFILE_UPLOAD_URL_ENDPOINT} from "../constants";

export const getProfileUploadUrl = async (fileType) => {
    const response = await fetch(PROFILE_UPLOAD_URL_ENDPOINT, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ fileType }),
    });

    if (!response.ok) {
        throw new Error("Failed to get upload URL");
    }

    return await response.json();
};
