import { Auth } from "aws-amplify";
import { COMPANY_PROFILE_ENDPOINT } from "../constants";

export { COMPANY_PROFILE_ENDPOINT };

const getIdToken = async () => {
    const session = await Auth.currentSession();
    const token = session.getIdToken().getJwtToken();

    if (!token) {
        throw new Error("Authentication is required.");
    }

    return token;
};

const requestCompanyProfile = async ({ method, body, errorMessage } = {}) => {
    const token = await getIdToken();
    const response = await fetch(COMPANY_PROFILE_ENDPOINT, {
        method,
        cache: "no-store",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
        throw new Error(errorMessage);
    }

    return payload;
};

export const fetchCompanyProfile = () =>
    requestCompanyProfile({
        method: "GET",
        errorMessage: "We could not load your company information. Please try again.",
    });

export const saveCompanyProfile = (profile) =>
    requestCompanyProfile({
        method: "PUT",
        body: profile,
        errorMessage: "We could not save your company information. Please try again.",
    });
