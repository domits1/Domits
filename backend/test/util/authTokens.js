import { isTestMode } from "../../util/isTestMode.js";


// Deterministic test tokens
export const TEST_HOST_TOKEN = "dummy-host-token";
export const TEST_GUEST_TOKEN = "dummy-guest-token";

/**
 * Get a deterministic auth token for testing purposes.
 * In TEST mode, returns a dummy token based on the user type.
 * @param {string} userType - Either "host" or "guest"
 * @returns {string} The auth token
 */
export function getTestAuthToken(userType) {
    if (userType === "host") {
        return TEST_HOST_TOKEN;
    }
    return TEST_GUEST_TOKEN;
}

/**
 * Get the host auth token - used for testing.
 * @returns {Promise<string>} The host auth token
 * @throws {Error} If not in TEST mode
 */
export async function getHostAuthToken() {
    // In test mode, avoid real AWS calls and return a dummy token.
    if (isTestMode()) {
        return TEST_HOST_TOKEN;
    }

    throw new Error(
        "Authentication helpers are only available in TEST mode. " +
        "Set process.env.TEST='true' to use test tokens."
    );
}


/**
 * Get the guest auth token - used for testing.
 * @returns {Promise<string>} The guest auth token
 * @throws {Error} If not in TEST mode
 */
export async function getGuestAuthToken() {
    // In test mode, avoid real AWS calls and return a dummy token.
    if (isTestMode()) {
        return TEST_GUEST_TOKEN;
    }

    throw new Error(
        "Authentication helpers are only available in TEST mode. " +
        "Set process.env.TEST='true' to use test tokens."
    );
}
