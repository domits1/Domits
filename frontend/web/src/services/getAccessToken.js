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

    }

    export function getCognitoUserId() {
        const all = Object.keys(localStorage);
      
        const idTokenKeys = all.filter(
          (k) => k.includes("CognitoIdentityServiceProvider") && k.endsWith(".idToken")
        );
      
        const accessTokenKeys = all.filter(
          (k) =>
            k.includes("CognitoIdentityServiceProvider") && k.endsWith(".accessToken")
        );
      
        const pick = (keys) => {
          if (keys.length > 1) {
            console.error("multiple user logins, please refresh cache.");
            return null;
          }
          if (keys.length === 0) return null;
      
          const parts = keys[0].split(".");
          if (parts.length < 4) return null;
      
          return parts[2] || null;
        };
      
        return pick(idTokenKeys) || pick(accessTokenKeys);
      };