import { getAccessToken, getCognitoUserId } from "../../../services/getAccessToken";
import { PROPERTY_API_BASE } from "../hostproperty/constants";

const buildFallbackListingsUrl = (hostId) => {
    const fallbackUrl = new URL(`${PROPERTY_API_BASE}/bookingEngine/byHostId`);
    fallbackUrl.searchParams.set("hostId", hostId);
    return fallbackUrl.toString();
};

const buildPropertyLabel = (listing) => {
    const title = String(listing?.property?.title || "Untitled listing").trim();
    const city = String(listing?.propertyLocation?.city || listing?.location?.city || "").trim();
    const country = String(listing?.propertyLocation?.country || listing?.location?.country || "").trim();
    const locationSuffix = [city, country].filter(Boolean).join(", ");
    return locationSuffix ? `${title} - ${locationSuffix}` : title;
};

const normalizePropertyOptions = (listings) => {
    const uniqueLabels = new Set();

    (Array.isArray(listings) ? listings : []).forEach((listing) => {
        const propertyId = String(listing?.property?.id || "").trim();
        if (!propertyId) {
            return;
        }

        const label = buildPropertyLabel(listing);
        if (label) {
            uniqueLabels.add(label);
        }
    });

    return [...uniqueLabels];
};

const fetchListingsFromHostDashboard = async (token) => {
    const response = await fetch(`${PROPERTY_API_BASE}/hostDashboard/all`, {
        method: "GET",
        headers: {
            Authorization: token,
        },
    });

    if (!response.ok) {
        return {
            listings: null,
            status: response.status,
        };
    }

    const data = await response.json();
    return {
        listings: Array.isArray(data) ? data : [],
        status: response.status,
    };
};

const fetchListingsByHostId = async ({ hostId, token }) => {
    if (!hostId) {
        return [];
    }

    const response = await fetch(buildFallbackListingsUrl(hostId), {
        method: "GET",
        headers: {
            Authorization: token,
        },
    });

    if (!response.ok) {
        return [];
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
};

export const fetchHostTaskPropertyOptions = async () => {
    const token = getAccessToken();
    if (!token) {
        return [];
    }

    try {
        const hostId = getCognitoUserId();
        const primaryResult = await fetchListingsFromHostDashboard(token);
        const listings = primaryResult.listings ?? (await fetchListingsByHostId({ hostId, token }));

        return normalizePropertyOptions(listings);
    } catch {
        return [];
    }
};
