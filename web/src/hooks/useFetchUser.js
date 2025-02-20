import {useEffect, useState} from 'react'
import {Auth} from 'aws-amplify'

const useFetchUser = () => {
  const [userId, setUserId] = useState(null)

  useEffect(() => {
    const asyncSetUserId = async () => {
      try {
        const userInfo = await Auth.currentUserInfo()
        setUserId(userInfo.attributes.sub)
      } catch (error) {
        console.error('Error setting user id:', error)
      }
    }

    asyncSetUserId()
  }, [])

  return userId
}

export default useFetchUser
