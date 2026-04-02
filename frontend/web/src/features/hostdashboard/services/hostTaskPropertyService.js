import { getAccessToken, getCognitoUserId } from "../../../services/getAccessToken";
import { PROPERTY_API_BASE } from "../hostproperty/constants";
import { placeholderImage, resolveAccommodationImageUrls } from "../../../utils/accommodationImage";

const buildFallbackListingsUrl = (hostId) => {
    const fallbackUrl = new URL(`${PROPERTY_API_BASE}/bookingEngine/byHostId`);
    fallbackUrl.searchParams.set("hostId", hostId);
    return fallbackUrl.toString();
};

const buildPropertyTitle = (listing) => String(listing?.property?.title || "Untitled listing").trim();

const buildPropertyDescription = (listing) =>
    String(listing?.property?.description || "").replaceAll(/\s+/g, " ").trim();

const buildPropertyLocation = (listing) => {
    const city = String(listing?.propertyLocation?.city || listing?.location?.city || "").trim();
    const country = String(listing?.propertyLocation?.country || listing?.location?.country || "").trim();
    return [city, country].filter(Boolean).join(", ");
};

const buildPropertyLabel = (listing) => {
    const title = buildPropertyTitle(listing);
    const locationSuffix = buildPropertyLocation(listing);
    return locationSuffix ? `${title} - ${locationSuffix}` : title;
};

const getPropertyStatus = (listing) => String(listing?.property?.status || "INACTIVE").trim().toUpperCase();

const getGalleryImages = (listing) => {
    const galleryImages = resolveAccommodationImageUrls(listing?.images, "web");
    return galleryImages.length > 0 ? galleryImages : [placeholderImage];
};

const getPreviewImages = (galleryImages) => galleryImages.slice(0, 3);

const normalizePropertySelectOptions = (listings) => {
    const propertyOptionsById = new Map();

    (Array.isArray(listings) ? listings : []).forEach((listing) => {
        const propertyId = String(listing?.property?.id || "").trim();
        if (!propertyId || propertyOptionsById.has(propertyId)) {
            return;
        }

        const galleryImages = getGalleryImages(listing);

        propertyOptionsById.set(propertyId, {
            value: propertyId,
            title: buildPropertyTitle(listing),
            description: buildPropertyDescription(listing),
            location: buildPropertyLocation(listing),
            label: buildPropertyLabel(listing),
            status: getPropertyStatus(listing),
            galleryImages,
            previewImages: getPreviewImages(galleryImages),
            imageCount: Array.isArray(listing?.images) ? listing.images.length : 0,
        });
    });

    return [...propertyOptionsById.values()].sort((leftOption, rightOption) =>
        leftOption.label.localeCompare(rightOption.label)
    );
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
        return null;
    }

    const response = await fetch(buildFallbackListingsUrl(hostId), {
        method: "GET",
        headers: {
            Authorization: token,
        },
    });

    if (!response.ok) {
        return null;
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
};

const fetchHostOwnedListings = async () => {
    const token = getAccessToken();
    if (!token) {
        throw new Error("You must be signed in to load your listings.");
    }

    const hostId = getCognitoUserId();
    const primaryResult = await fetchListingsFromHostDashboard(token);
    if (primaryResult.listings !== null) {
        return primaryResult.listings;
    }

    const fallbackListings = await fetchListingsByHostId({ hostId, token });
    if (fallbackListings !== null) {
        return fallbackListings;
    }

    throw new Error("Failed to load your properties.");
};

export const fetchHostPropertySelectOptions = async () => {
    const listings = await fetchHostOwnedListings();
    return normalizePropertySelectOptions(listings);
};

export const fetchHostTaskPropertyOptions = async () => {
    try {
        const propertyOptions = await fetchHostPropertySelectOptions();
        return propertyOptions.map(({ value, label }) => ({ id: value, label }));
    } catch {
        return [];
    }
};
