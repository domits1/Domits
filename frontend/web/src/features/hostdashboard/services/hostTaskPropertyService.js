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
    const seen = new Set();

    return (Array.isArray(listings) ? listings : []).reduce((acc, listing) => {
        const propertyId = String(listing?.property?.id || "").trim();
        if (!propertyId || seen.has(propertyId)) {
            return acc;
        }

        const label = buildPropertyLabel(listing);
        if (label) {
            seen.add(propertyId);
            acc.push({ id: propertyId, label });
        }

        return acc;
    }, []);
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
