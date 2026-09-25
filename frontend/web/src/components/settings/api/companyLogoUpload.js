import { Auth } from "aws-amplify";
import { COMPANY_PROFILE_ENDPOINT } from "../constants";

export const getCompanyLogoUploadUrl = async (fileType) => {
    const session = await Auth.currentSession();
    const token = session.getIdToken().getJwtToken();

    const response = await fetch(`${COMPANY_PROFILE_ENDPOINT}?action=logo-upload-url`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ fileType }),
    });

    if (!response.ok) {
        throw new Error("Failed to get upload URL");
    }

    return await response.json();
};
