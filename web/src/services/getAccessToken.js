// Service to get accesstoken of loggedin user from localstorage
export function getAccessToken() {
    const keys = Object.keys(localStorage).filter(
        (key) =>
            key.includes("CognitoIdentityServiceProvider") &&
            key.endsWith(".accessToken")
    );

    if (keys.length > 1) {
        console.error("multiple user logins, please refresh cache.");
        return null;
    }

    // Check if token is retrieved
    if (!keys) {
        console.error("User not logged in. Authtoken not found in expected place.");
        return;
    }

    return keys.length === 1 ? localStorage.getItem(keys[0]) : null;
};