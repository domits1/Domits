import { getAccessToken } from "../../../services/getAccessToken";

const token = await getAccessToken();
const API = "https://hamuly8izh.execute-api.eu-north-1.amazonaws.com/development/payments";

export default async function getStripeAccountDetails() {
    const response = await fetch(API, {
        method: "GET",
        headers: { Authorization: token },
    });

    if (response.status === 404) {
        return null;
    }

    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    return data.details;
}

export async function createStripeAccount() {
    const response = await fetch(API, {
        method: "POST",
        headers: { Authorization: token },
    });

    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    return data.details;
}