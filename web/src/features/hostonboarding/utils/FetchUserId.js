import React, { useEffect } from "react";
import { Auth } from "aws-amplify";
import useFormStore from "../stores/formStore";

const FetchUserId = () => {
  const setOwnerId = useFormStore((state) => state.setOwnerId);
  const ownerId = useFormStore((state) => state.accommodationDetails.ownerId);

  useEffect(() => {
    const asyncUserId = async () => {
      if (!ownerId) {
        try {
          const userInfo = await Auth.currentAuthenticatedUser();
          const userId = userInfo.attributes.sub;
          setOwnerId(userId);
        } catch (error) {
          console.error("Error fetching user ID:", error);
        }
      }
    };

    asyncUserId();
  }, [ownerId, setOwnerId]);

  return null;
};

export default FetchUserId;