import React, { useEffect } from "react";
import { Auth } from "aws-amplify"; // Assuming you're using AWS Amplify Auth
import useFormStore from "../stores/formStore"; // Update with your store path

const FetchUserId = () => {
  const setOwnerId = useFormStore((state) => state.setOwnerId);

  useEffect(() => {
    const asyncUserId = async () => {
      try {
        const userInfo = await Auth.currentAuthenticatedUser();
        const userId = userInfo.attributes.sub;
        setOwnerId(userId); // Set the userId in the form store
      } catch (error) {
        console.error("Error fetching user ID:", error);
      }
    };

    asyncUserId();
  }, [setOwnerId]);

  return null; // This component doesn't render anything visible
};

export default FetchUserId;