import React, { useEffect } from "react"
import { Auth } from "aws-amplify"
import useFormStoreHostOnboarding from "../stores/formStoreHostOnboarding"

// Todo: Old, renew
const FetchUserId = () => {
  const setOwnerId = useFormStoreHostOnboarding((state) => state.setOwnerId)

  useEffect(() => {
    const asyncUserId = async () => {
      try {
        const userInfo = await Auth.currentAuthenticatedUser()
        const userId = userInfo.attributes.sub
        setOwnerId(userId) // Sets the userId in the form store
      } catch (error) {
        console.error("Error fetching user ID:", error)
      }
    }

    asyncUserId()
  }, [setOwnerId])
}

export default FetchUserId
