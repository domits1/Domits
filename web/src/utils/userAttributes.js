import fetchUserInfo from './GetUserInfo'

let userAttributes = {}

export const initializeUserAttributes = async () => {
  try {
    userAttributes = await fetchUserInfo()
  } catch (error) {
    console.error('Error initializing user attributes:', error)
  }
}

//     Using the import and const's you can access user information that's stored in Cognito.
//     import { getUserAttributes } from './userAttributes';       // adjust the path accordingly
//     const userAttributes = getUserAttributes();
//     const userGroup = userAttributes.group               // here you choose what part of the info you want.

// possible userAttributes as of 28/05/2024:
// sub(cognitoUserId):
// email_verified:
// custom:username:
// custom:group:
// email:

export const getUserAttributes = () => userAttributes
