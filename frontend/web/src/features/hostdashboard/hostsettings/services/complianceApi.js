import { getAccessToken } from "../../../../services/getAccessToken";
import { PROPERTY_API_BASE } from "../../hostproperty/constants";
import { fetchListingsFromHostDashboard } from "../../services/hostTaskPropertyService";
import { isRegistrationNumberMissing } from "../utils/registrationNumber";

const SELECTABLE_STATUSES = new Set(["ACTIVE", "INACTIVE"]);
const HTTP_NOT_FOUND = 404;
const HTTP_UNAUTHORIZED = 401;
const HTTP_INTERNAL_SERVER_ERROR = 500;

export class ComplianceApiError extends Error {
    constructor(status) {
        super(`Compliance request failed with status ${status}`);
        this.name = "ComplianceApiError";
        this.status = status;
    }
}

const requireToken = () => {
    const token = getAccessToken();
    if (!token) {
        throw new ComplianceApiError(HTTP_UNAUTHORIZED);
    }
    return token;
};

const toCompliancePropertyOption = (listing) => {
    const registrationNumber = listing?.property?.registrationNumber;
    return {
        id: String(listing?.property?.id || "").trim(),
        title: String(listing?.property?.title || "").trim(),
        city: String(listing?.propertyLocation?.city || listing?.location?.city || "").trim(),
        status: String(listing?.property?.status || "").trim().toUpperCase(),
        registrationNumber,
        registrationNumberAvailable: !isRegistrationNumberMissing(registrationNumber),
    };
};

const warnAboutMissingRegistrationNumbers = (options) => {
    options
        .filter((option) => !option.registrationNumberAvailable)
        .forEach((option) => {
            console.warn(`Compliance: registrationNumber is missing or not a string for listing ${option.id}.`);
        });
};

export const fetchCompliancePropertyOptions = async () => {
    const { listings, status } = await fetchListingsFromHostDashboard(requireToken());

    // The backend answers 404 ("No property found.") for a host without listings; that is an empty list, not a failure.
    if (status === HTTP_NOT_FOUND) {
        return [];
    }
    if (listings === null) {
        throw new ComplianceApiError(status);
    }

    const options = listings
        .map(toCompliancePropertyOption)
        .filter((option) => option.id && SELECTABLE_STATUSES.has(option.status))
        .sort((left, right) => left.title.localeCompare(right.title));

    warnAboutMissingRegistrationNumbers(options);
    return options;
};

export const saveRegistrationNumber = async (propertyId, registrationNumber) => {
    const response = await fetch(`${PROPERTY_API_BASE}/registration`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            Authorization: requireToken(),
        },
        body: JSON.stringify({ propertyId, registrationNumber }),
    });

    if (!response.ok) {
        throw new ComplianceApiError(response.status);
    }

    const saved = await response.json();
    // Without the stored value the page has no valid baseline, so a body without it counts as a failed save.
    if (isRegistrationNumberMissing(saved?.registrationNumber)) {
        throw new ComplianceApiError(HTTP_INTERNAL_SERVER_ERROR);
    }

    return saved;
};
