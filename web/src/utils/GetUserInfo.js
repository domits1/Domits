import {Auth} from 'aws-amplify'

const fetchUserInfo = async () => {
  try {
    const userInfo = await Auth.currentUserInfo()
    return userInfo.attributes
  } catch (error) {
    console.error('Error fetching user info:', error)
    throw error
  }
}

export default fetchUserInfo
