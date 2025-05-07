import React, { useEffect } from "react";
import { Auth } from "aws-amplify";
import useFormStoreHostOnboarding from "../stores/formStoreHostOnboarding";

const FetchUserId = () => {
  // --- ADD THIS LOG ---
  console.log("[FetchUserId] Component function executed.");
  // --------------------

  const setOwnerId = useFormStoreHostOnboarding((state) => state.setOwnerId);

  useEffect(() => {
    console.log("[FetchUserId] useEffect triggered.");

    const asyncUserId = async () => {
      console.log("[FetchUserId] Attempting to fetch authenticated user...");
      try {
        const userInfo = await Auth.currentAuthenticatedUser();
        console.log("[FetchUserId] Auth.currentAuthenticatedUser SUCCESS:", userInfo);

        if (userInfo && userInfo.attributes && userInfo.attributes.sub) {
          const userId = userInfo.attributes.sub;
          console.log("[FetchUserId] Extracted userId (sub):", userId);
          console.log("[FetchUserId] Calling setOwnerId...");
          setOwnerId(userId);
          console.log("[FetchUserId] setOwnerId called.");
        } else {
          console.error("[FetchUserId] Error: userInfo object missing attributes.sub:", userInfo);
        }

      } catch (error) {
        console.error("[FetchUserId] Error fetching user ID:", error);
        if (error === 'The user is not authenticated') {
          console.error("[FetchUserId] Critical: User is not authenticated when reaching summary page!");
        }
      }
    };

    asyncUserId();
  }, [setOwnerId]);

  return null; // Component renders nothing
};

export default FetchUserId;